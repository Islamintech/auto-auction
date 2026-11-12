import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { CatalogueService } from '../src/catalogue/catalogue.service';
import { ImageService } from '../src/images/image.service';
import { TelegramService } from '../src/notify/telegram.service';
import { validateEnv } from '../src/config/env.validation';

const catalogue = new CatalogueService(new ConfigService({}));

const vehicle = (o: object = {}): any => ({
  sourceId: 'CK1', make: 'KGM(쌍용)', model: '코란도', trim: '2.2 디젤', year: 2017, mileageKm: 37914,
  priceKrw: 6900000, fuelType: 'DIESEL', transmission: 'AUTO',
  images: [
    { sourceId: 'CK1', sourceUrl: 'u2', order: 1, secureUrl: 'https://c/2.jpg' },
    { sourceId: 'CK1', sourceUrl: 'u0', order: 0, secureUrl: 'https://c/0.jpg' },
    { sourceId: 'CK1', sourceUrl: 'u3', order: 2 }, // never uploaded
    { sourceId: 'OTHER', sourceUrl: 'u4', order: 3, secureUrl: 'https://c/x.jpg' }, // wrong car
  ],
  ...o,
});

test('catalogue payload from a CKAuto vehicle', () => {
  const p = catalogue.toCatalogueInput(vehicle());
  assert.equal(p.importSource, 'ckauto');
  assert.equal(p.importId, 'CK1');
  assert.equal(p.carBrand, 'SSANGYONG');
  assert.equal(p.carTitle, '2017 SSANGYONG 코란도 2.2 디젤');
  assert.equal(p.carCondition, 'DAMAGED');
  assert.equal(p.carFuel, 'DIESEL');
  assert.equal(p.carTransmission, 'AUTO');
  assert.equal(p.carPrice, '6900000');
  // Only this car's uploaded photos, in source order.
  assert.deepEqual(p.carImages, ['https://c/0.jpg', 'https://c/2.jpg']);
  assert.deepEqual(catalogue.missingFields(p), []);
});

test('brand aliases', () => {
  const brand = (make: string) => catalogue.toCatalogueInput(vehicle({ make })).carBrand;
  assert.equal(brand('르노(삼성)'), 'SAMSUNG');
  assert.equal(brand('쉐보레(GM대우)'), 'CHEVROLET');
  assert.equal(brand('제네시스'), 'GENESIS');
  assert.equal(brand('현대'), 'HYUNDAI');
  assert.equal(brand('벤츠'), 'MERCEDES');
  assert.equal(brand('SSANGYONG'), 'SSANGYONG');
});

test('admin overrides win; VIN only when it is one', () => {
  const p = catalogue.toCatalogueInput(vehicle({ plateOrVin: '12가3456' }), { carTitle: ' Korando C ', carType: 'SUV', carCondition: 'INTACT' });
  assert.equal(p.carTitle, 'Korando C');
  assert.equal(p.carType, 'SUV');
  assert.equal(p.carCondition, 'INTACT');
  assert.equal(p.carVin, undefined);
  assert.equal(catalogue.toCatalogueInput(vehicle({ plateOrVin: 'knagt41bbn5123456' })).carVin, 'KNAGT41BBN5123456');
});

test('missing price and photos block approval', () => {
  const p = catalogue.toCatalogueInput(vehicle({ priceKrw: undefined, images: [] }));
  assert.deepEqual(catalogue.missingFields(p), ['priceKrw', 'images (none uploaded to Cloudinary)']);
});

test('Cloudinary names come from the photo URL, not its position', () => {
  const a = ImageService.publicIdFor('CK1', 'https://ckauto.co.kr/a/1.jpg');
  assert.equal(a, ImageService.publicIdFor('CK1', 'https://ckauto.co.kr/a/1.jpg'));
  assert.notEqual(a, ImageService.publicIdFor('CK1', 'https://ckauto.co.kr/a/0-new.jpg'));
  assert.notEqual(a, ImageService.publicIdFor('CK2', 'https://ckauto.co.kr/a/1.jpg'));
  assert.match(a, /^CK1_[0-9a-f]{16}$/);
});

test('telegram escaping', () => {
  assert.equal(TelegramService.escape('<b>"A&B"</b>'), '&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;');
});

test('startup config check lists every missing setting', () => {
  assert.throws(() => validateEnv({}, { service: true }), (e: Error) =>
    ['MONGODB_URI', 'SOURCE_USERNAME', 'CLOUDINARY_API_SECRET', 'REDIS_URL'].every((k) => e.message.includes(k)));
  const ok = {
    MONGODB_URI: 'mongodb://x', SOURCE_USERNAME: 'u', SOURCE_PASSWORD: 'p',
    CLOUDINARY_CLOUD_NAME: 'c', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's',
  };
  assert.doesNotThrow(() => validateEnv(ok, { service: false }));
  assert.throws(() => validateEnv(ok, { service: true }), /REDIS_URL/);
  assert.throws(() => validateEnv({ ...ok, SOURCE_BASE_URL: 'ckauto.co.kr' }, { service: false }), /SOURCE_BASE_URL/);
});
