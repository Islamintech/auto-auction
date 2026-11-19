import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findLotCode, parseImportRequest, parsePrice } from '../src/bot/parse';
import { buildCaption, tashkentTime } from '../src/bot/caption';
import { englishName } from '../src/catalogue/model-names';
import { telegramPhotoUrl } from '../src/bot/bot.service';

test('lot code from a CKAuto link, or bare', () => {
  assert.equal(findLotCode('https://ckauto.co.kr/auction?v=261119G020'), '261119G020');
  assert.equal(findLotCode('look: https://ckauto.co.kr/auction?x=1&v=261119g020#top'), '261119G020');
  assert.equal(findLotCode('261113E010'), '261113E010');
  assert.equal(findLotCode('https://ckauto.co.kr/'), undefined);
});

test('price formats admins type', () => {
  assert.deepEqual(parsePrice('30000-38000'), { min: 30000, max: 38000 });
  assert.deepEqual(parsePrice('30 000 – 38 000'), { min: 30000, max: 38000 });
  assert.deepEqual(parsePrice('$30,000~$38,000 USD'), { min: 30000, max: 38000 });
  assert.deepEqual(parsePrice('38000-30000'), { min: 30000, max: 38000 });
  assert.deepEqual(parsePrice('25000'), { min: 25000 });
  assert.deepEqual(parsePrice('25000$'), { min: 25000 });
  assert.equal(parsePrice('qora'), undefined);
  assert.equal(parsePrice('kumush'), undefined);
  assert.equal(parsePrice('30000-'), undefined);
  // Looser forms admins type
  assert.deepEqual(parsePrice('3000 4500'), { min: 3000, max: 4500 }); // not 30,004,500
  assert.deepEqual(parsePrice('30 000'), { min: 30000 });
  assert.deepEqual(parsePrice('3k-4.5k'), { min: 3000, max: 4500 });
  assert.deepEqual(parsePrice('narx: 3000-4500'), { min: 3000, max: 4500 });
  assert.deepEqual(parsePrice('3000-4500 dollar'), { min: 3000, max: 4500 });
  assert.deepEqual(parsePrice('3.000 - 4.500 $'), { min: 3000, max: 4500 });
  assert.equal(parsePrice('3000-4500-5000'), undefined);
});

test('a full request: link, price, optional colour', () => {
  assert.deepEqual(parseImportRequest('https://ckauto.co.kr/auction?v=261119G020\n30000-38000\nqora'), {
    code: '261119G020', price: { min: 30000, max: 38000 }, colour: 'qora',
  });
  assert.deepEqual(parseImportRequest('https://ckauto.co.kr/auction?v=261119G020 30000-38000'), {
    code: '261119G020', price: { min: 30000, max: 38000 },
  });
  assert.deepEqual(parseImportRequest('30000\n261119G020'), { code: '261119G020', price: { min: 30000 } });
  assert.deepEqual(parseImportRequest('30000-38000'), { error: 'no-code' });
  // Link without a price: the bot keeps the code (and colour) and asks for the price.
  assert.deepEqual(parseImportRequest('https://ckauto.co.kr/auction?v=261119G020\nqora'), {
    error: 'no-price', code: '261119G020', colour: 'qora',
  });
  assert.deepEqual(parseImportRequest('https://ckauto.co.kr/auction?v=261119G020'), { error: 'no-price', code: '261119G020' });
});

test('English names from Korean CKAuto data', () => {
  assert.deepEqual(englishName('HYUNDAI', '아반떼', '1.6 가솔린'), { name: 'Hyundai Avante 1.6 Gasoline', complete: true });
  assert.deepEqual(englishName('MERCEDES', 'E클래스', 'E220d 디젤 세단'), { name: 'Mercedes-Benz E-Class E220d Diesel Sedan', complete: true });
  assert.deepEqual(englishName('BMW', '5시리즈', '520i 가솔린 세단'), { name: 'BMW 5 Series 520i Gasoline Sedan', complete: true });
  assert.deepEqual(englishName('AUDI', 'A6', '3.0 TFSI 콰트로 가솔린 세단'), { name: 'Audi A6 3.0 TFSI quattro Gasoline Sedan', complete: true });
  assert.deepEqual(englishName('VOLKSWAGEN', '티구안', '티구안 2.0 TDI (08-현재)'), { name: 'Volkswagen Tiguan 2.0 TDI', complete: true });
  assert.deepEqual(englishName('TESLA', '모델 Y', '롱 레인지 AWD'), { name: 'Tesla Model Y Long Range AWD', complete: true });
  // Unknown Korean is dropped, never shown, and flagged.
  const unknown = englishName('KIA', '신차종', '1.6 가솔린');
  assert.equal(unknown.name, 'Kia 1.6 Gasoline');
  assert.equal(unknown.complete, false);
  assert.equal(englishName('KIA', '모닝', null as any).name, 'Kia Morning');
});

test('auction end in Tashkent time (KST - 4h)', () => {
  // CKAuto "2026-11-19 10:00" KST
  assert.equal(tashkentTime(new Date('2026-11-19T10:00:00+09:00')), '2026.11.19 06:00');
  assert.equal(tashkentTime(new Date('2026-11-20T02:30:00+09:00')), '2026.11.19 22:30');
});

test('channel caption', () => {
  const v = {
    year: 2026, month: 2, mileageKm: 9000, displacementCc: 2995, fuelType: 'PETROL', transmission: 'AUTO',
    auctionEndsAt: new Date('2026-11-19T10:00:00+09:00'),
  };
  const c = buildCaption(v, {
    title: 'Audi A6 55 TFSI <quattro>', price: { min: 30000, max: 38000 }, colour: 'qora',
    siteUrl: 'https://site/products/abc', contact: '@auctionuz_info',
  });
  assert.match(c, /^🚗 <b>Audi A6 55 TFSI &lt;quattro&gt;<\/b>/);
  assert.match(c, /Yili:<\/b> 2026\/02/);
  assert.match(c, /Probeg:<\/b> 9,000 km/);
  assert.match(c, /Dvigatel:<\/b> 3\.0L Benzin/);
  assert.match(c, /Uzatmalar qutisi:<\/b> Avtomat/);
  assert.match(c, /Rangi:<\/b> qora/);
  assert.match(c, /Taxminiy narx:<\/b> 30,000–38,000 USD/);
  assert.match(c, /Auksion tugashi:<\/b> 2026\.11\.19 06:00/);
  assert.match(c, /<a href="https:\/\/site\/products\/abc">Saytda ko'rish<\/a>/);
  assert.ok(c.length < 1024, 'Telegram caption limit');

  // No colour, no link yet (admin preview), electric: no litres.
  const p = buildCaption({ ...v, fuelType: 'ELECTRIC' }, { title: 'X', price: { min: 1 }, contact: '@c' });
  assert.doesNotMatch(p, /Rangi/);
  assert.doesNotMatch(p, /<a /);
  assert.match(p, /Dvigatel:<\/b> Elektr\n/);
});

test('Telegram gets a resized Cloudinary photo', () => {
  assert.equal(
    telegramPhotoUrl('https://res.cloudinary.com/x/image/upload/v1/ckauto/A/A_1.jpg'),
    'https://res.cloudinary.com/x/image/upload/c_limit,w_1600,q_auto,f_jpg/v1/ckauto/A/A_1.jpg',
  );
});
