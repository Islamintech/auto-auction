'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { carMeta, postMeta, staticMeta, notFoundMeta, renderHead, applyHead, priceAmounts } = require('./meta');

const SITE = 'https://autoauction.kr';
const car = {
  id: '6afed4418df290707d9283ab',
  title: 'Hyundai Avante 1.6 Hybrid',
  brand: 'HYUNDAI',
  model: '아반떼',
  year: '2026',
  km: '12500',
  fuel: 'HYBRID',
  trans: 'AUTO',
  color: 'WHITE',
  price: '4000000-6670000',
  status: 'ONSALE',
  image: 'https://res.cloudinary.com/x/image/upload/v1/ckauto/A/A_1.jpg',
  images: ['https://res.cloudinary.com/x/image/upload/v1/ckauto/A/A_1.jpg'],
};

test('car page: title, description, preview image, structured data', () => {
  const m = carMeta(car, SITE);
  assert.equal(m.title, 'Hyundai Avante 1.6 Hybrid 2026 — ₩4,000,000–6,670,000 | Auto Auction');
  assert.match(m.description, /^Hyundai Avante 1\.6 Hybrid 2026 from Korea\. 2026 · 12,500 km · Hybrid · Automatic · white\. Price ₩4,000,000–6,670,000\./);
  assert.ok(m.description.length <= 160);
  assert.equal(m.canonical, `${SITE}/products/${car.id}`);
  assert.equal(m.image, 'https://res.cloudinary.com/x/image/upload/c_fill,w_1200,h_630,q_auto,f_jpg/v1/ckauto/A/A_1.jpg');
  assert.equal(m.jsonLd.offers['@type'], 'AggregateOffer');
  assert.equal(m.jsonLd.offers.lowPrice, 4000000);
  assert.equal(m.jsonLd.offers.availability, 'https://schema.org/InStock');
  assert.equal(m.jsonLd.mileageFromOdometer.value, 12500);
});

test('car page: unknown mileage and a sold car', () => {
  const m = carMeta({ ...car, km: '—', price: '5000000', status: 'SOLD' }, SITE);
  assert.doesNotMatch(m.description, /km/);
  assert.equal(m.jsonLd.mileageFromOdometer, undefined);
  assert.equal(m.jsonLd.offers['@type'], 'Offer');
  assert.equal(m.jsonLd.offers.price, 5000000);
  assert.equal(m.jsonLd.offers.availability, 'https://schema.org/SoldOut');
});

test('prices in any stored format', () => {
  assert.deepEqual(priceAmounts('30,000,000-35,000,000'), [30000000, 35000000]);
  assert.deepEqual(priceAmounts(6900000), [6900000]);
  assert.deepEqual(priceAmounts(''), []);
});

test('static pages, noindex and not-found', () => {
  assert.equal(staticMeta('/products', SITE).canonical, `${SITE}/products`);
  assert.equal(staticMeta('/', SITE).canonical, `${SITE}/`);
  assert.equal(staticMeta('/member-page', SITE).noindex, true);
  assert.equal(notFoundMeta(SITE).noindex, true);
  const p = postMeta({ _id: 'p1', postTitle: 'New cars', postBody: '<p>Hello <b>world</b></p>', postImage: 'uploads/x.jpg' }, SITE);
  assert.equal(p.description, 'Hello world');
  assert.equal(p.image, `${SITE}/uploads/x.jpg`);
});

test('head swap removes the defaults and escapes values', () => {
  const template =
    '<html><head><meta charset="utf-8"><title>Auto Auction</title>' +
    '<meta data-seo name="description" content="old"><meta data-seo property="og:title" content="old"/>' +
    '</head><body><div id="root"></div></body></html>';
  const html = applyHead(template, renderHead(carMeta({ ...car, title: 'A "quoted" <car>' }, SITE)));
  assert.equal((html.match(/<title/g) || []).length, 1);
  assert.doesNotMatch(html, /content="old"/);
  assert.match(html, /<title data-seo>A &quot;quoted&quot; &lt;car&gt; 2026/);
  assert.match(html, /<meta charset="utf-8">/);
  assert.match(html, /application\/ld\+json">\{.*\\u003ccar>/);
  assert.match(html, /<link data-seo rel="canonical" href="https:\/\/autoauction\.kr\/products\/6afed/);
});
