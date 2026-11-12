import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commaInt, commission, kst, normalise, sanitise, yearMonth } from '../src/ingestion/normalizer';

const ORIGIN = 'https://ckauto.co.kr';

/** The sample record from docs/ckauto-api.md §4. */
const sample = () => ({
  code: '261113E010', insurer: '히어로손해사정', manufacturer: 'KGM(쌍용)', model: '코란도',
  modelName: '뉴 스타일 코란도 C C200 (17-19)', grade: '2.2 디젤', yearMonth: '2017년 10월', yard: '경기도 고양시',
  process: '폐차', progressMethod: '전손', status: '공매진행', transmission: '오토', fuel: '디젤', mileage: '37,914',
  auctionEnd: '2026-11-13 13:00',
  photoFiles: ['/legacy/assets/auction-photos/261113E010-1.jpg', '/legacy/assets/auction-photos/261113E010-2.jpg'],
  engineType: '672950', displacement: '2157', inspectionDate: '2025-11-19', currentMileage: '1,111,111',
  commission: '5%', cost: '', memo: '연식:2018/최초등록일:2017.10.16', currentBid: '', highestBidder: '',
  lastBidAt: '', documentFeeType: '', documentFee: '', createdAt: '2026-11-12 11:19', isMyBid: false,
});

test('parsers', () => {
  assert.equal(commaInt('37,914'), 37914);
  assert.equal(commaInt(''), undefined);
  assert.equal(commaInt('0'), undefined);
  assert.equal(commaInt(1250000), 1250000);
  assert.equal(commission('5%'), 0.05);
  assert.equal(commission('0.05'), 0.05);
  assert.equal(commission(''), undefined);
  assert.deepEqual(yearMonth('2017년 10월'), { year: 2017, month: 10 });
  assert.deepEqual(yearMonth('n? 2n26'), {});
  assert.deepEqual(yearMonth('2017년 13월'), {});
});

test('KST timestamps carry the +09:00 offset', () => {
  assert.equal(kst('2026-11-13 13:00')!.toISOString(), '2026-11-13T04:00:00.000Z');
  assert.equal(kst('2026-11- -0?'), undefined);
  assert.equal(kst(''), undefined);
});

test('sample record maps fully', () => {
  const v = normalise(sample(), ORIGIN);
  assert.equal(v.sourceId, '261113E010');
  assert.equal(v.sourceStatus, 'LIVE');
  assert.equal(v.make, 'KGM(쌍용)');
  assert.equal(v.trim, '2.2 디젤');
  assert.equal(v.year, 2017);
  assert.equal(v.month, 10);
  assert.equal(v.fuelType, 'DIESEL');
  assert.equal(v.transmission, 'AUTO');
  assert.equal(v.disposalType, 'SCRAP');
  assert.equal(v.damageType, 'TOTAL_LOSS');
  assert.equal(v.displacementCc, 2157);
  assert.equal(v.commissionRate, 0.05);
  assert.equal(v.auctionEndsAt!.toISOString(), '2026-11-13T04:00:00.000Z');
  assert.equal(v.inspectionDate!.toISOString(), '2025-11-18T15:00:00.000Z');
  assert.deepEqual(v.needsReview, []);
  assert.deepEqual(v.unmapped, {});
});

test('mileage prefers `mileage` and ignores placeholder odometers', () => {
  assert.equal(normalise(sample(), ORIGIN).mileageKm, 37914);
  const junk = normalise({ ...sample(), mileage: '1,111,111', currentMileage: '' }, ORIGIN);
  assert.equal(junk.mileageKm, undefined);
  assert.match(junk.needsReview.join(), /mileage: implausible/);
  assert.equal(normalise({ ...sample(), mileage: '', currentMileage: '52,000' }, ORIGIN).mileageKm, 52000);
});

test('synonyms collapse', () => {
  const s = (o: object) => normalise({ ...sample(), ...o }, ORIGIN);
  assert.equal(s({ transmission: '자동' }).transmission, 'AUTO');
  assert.equal(s({ transmission: '매뉴얼' }).transmission, 'MANUAL');
  assert.equal(s({ transmission: '수동' }).transmission, 'MANUAL');
  assert.equal(s({ fuel: 'EV' }).fuelType, 'ELECTRIC');
  assert.equal(s({ fuel: '전기' }).fuelType, 'ELECTRIC');
});

test('column-shifted junk is flagged, never thrown', () => {
  const v = normalise({ ...sample(), process: 'n? 2n26_11-( ', progressMethod: '2026-11- -0?' }, ORIGIN);
  assert.equal(v.disposalType, 'UNKNOWN');
  assert.equal(v.damageType, 'UNKNOWN');
  assert.equal(v.needsReview.length, 2);
});

test('a record without a code is refused', () => {
  assert.throws(() => normalise({ ...sample(), code: '' }, ORIGIN), /no code/);
});

test('photos: absolute, de-duplicated, stamped with the vehicle id, in order', () => {
  const v = normalise({ ...sample(), photoFiles: ['/a/1.jpg', '/a/2-1794376699220.jpg', '/a/1.jpg', ''] }, ORIGIN);
  assert.deepEqual(
    v.images.map((i) => [i.order, i.sourceUrl, i.sourceId]),
    [
      [0, 'https://ckauto.co.kr/a/1.jpg', '261113E010'],
      [1, 'https://ckauto.co.kr/a/2-1794376699220.jpg', '261113E010'],
    ],
  );
  assert.deepEqual(normalise({ ...sample(), photoFiles: [] }, ORIGIN).images, []);
});

test('member names never survive sanitising, and do not affect the hash', () => {
  const withBidder = { ...sample(), highestBidder: '홍길동', isMyBid: true };
  assert.equal('highestBidder' in sanitise(withBidder), false);
  assert.equal('isMyBid' in sanitise(withBidder), false);
  assert.equal(normalise(withBidder, ORIGIN).payloadHash, normalise(sample(), ORIGIN).payloadHash);
});

test('fields CKAuto adds later are kept for review', () => {
  assert.deepEqual(normalise({ ...sample(), newField: 'x' }, ORIGIN).unmapped, { newField: 'x' });
});
