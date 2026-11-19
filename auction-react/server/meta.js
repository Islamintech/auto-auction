'use strict';
/**
 * Builds the <head> SEO tags for each page. Pure functions, no I/O, so they can
 * be unit-tested (server/meta.test.js).
 *
 * Static page texts come from src/seo/pages.json, which the React app also
 * reads (src/seo/useSeo.ts), so a page's title never differs between what the
 * server sends and what the browser shows after navigation.
 */
const SEO = require('../src/seo/pages.json');

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const clip = (s, n) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t;
};

const num = (n) => Number(n).toLocaleString('en-US');

/** "4000000-6670000" / "4000000" / 4000000 -> [4000000, 6670000] */
const priceAmounts = (p) =>
  (String(p ?? '').match(/\d[\d,]*/g) || [])
    .map((x) => Number(x.replace(/,/g, '')))
    .filter((x) => Number.isFinite(x) && x > 0)
    .slice(0, 2);

const FUEL = { PETROL: 'Petrol', DIESEL: 'Diesel', HYBRID: 'Hybrid', ELECTRIC: 'Electric', LPG: 'LPG', OTHER: '' };
const TRANS = { AUTO: 'Automatic', MANUAL: 'Manual', CVT: 'CVT', DCT: 'DCT' };

const absolute = (site, url) => (!url ? '' : /^https?:\/\//.test(url) ? url : site + (url.startsWith('/') ? '' : '/') + url);

/**
 * Cloudinary photos go out as a 1200x630 crop, the size link previews
 * (Telegram, Facebook, X) display best. Other URLs are left alone.
 */
const ogImage = (url) =>
  /res\.cloudinary\.com\/.+\/image\/upload\//.test(url || '')
    ? url.replace('/image/upload/', '/image/upload/c_fill,w_1200,h_630,q_auto,f_jpg/')
    : url;

function staticMeta(pathname, site) {
  const key = pathname === '/' ? '/' : '/' + pathname.split('/').filter(Boolean)[0];
  const page = SEO.pages[key] || SEO.pages['/'];
  return {
    title: page.title,
    description: page.description,
    canonical: site + (key === '/' ? '/' : key),
    image: absolute(site, SEO.defaultImage),
    type: 'website',
    noindex: !!page.noindex,
  };
}

/** A car from GET /car/:id (auction/src/libs/utils/carTransformer.ts). */
function carMeta(car, site) {
  const name = [car.title, car.year && !String(car.title || '').includes(String(car.year)) ? car.year : '']
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const amounts = priceAmounts(car.price);
  const priceText = amounts.length ? '₩' + amounts.map(num).join('–') : '';
  const km = /^\d[\d,]*$/.test(String(car.km ?? '')) ? `${num(String(car.km).replace(/,/g, ''))} km` : '';
  const facts = [car.year, km, FUEL[car.fuel], TRANS[car.trans], car.color && String(car.color).toLowerCase()]
    .filter(Boolean)
    .join(' · ');
  const description = clip(
    [`${name} from Korea.`, facts && `${facts}.`, priceText && `Price ${priceText}.`, 'Inspected, insured, delivered door-to-door.']
      .filter(Boolean)
      .join(' '),
    160,
  );
  const url = `${site}/products/${car.id}`;
  const image = ogImage(car.image) || absolute(site, SEO.defaultImage);
  const sold = car.status && car.status !== 'ONSALE';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Product', 'Car'],
    name,
    url,
    image: (car.images || []).slice(0, 6),
    description,
    brand: car.brand ? { '@type': 'Brand', name: car.brand } : undefined,
    model: car.model || undefined,
    vehicleModelDate: car.year || undefined,
    mileageFromOdometer: km
      ? { '@type': 'QuantitativeValue', value: Number(String(car.km).replace(/,/g, '')), unitCode: 'KMT' }
      : undefined,
    fuelType: FUEL[car.fuel] || undefined,
    vehicleTransmission: TRANS[car.trans] || undefined,
    color: car.color || undefined,
    vehicleIdentificationNumber: car.vin || undefined,
    offers: amounts.length
      ? {
          '@type': amounts.length > 1 ? 'AggregateOffer' : 'Offer',
          priceCurrency: 'KRW',
          ...(amounts.length > 1 ? { lowPrice: amounts[0], highPrice: amounts[1] } : { price: amounts[0] }),
          availability: sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
          url,
        }
      : undefined,
  };

  return {
    title: `${name} — ${priceText ? priceText + ' | ' : ''}${SEO.siteName}`,
    description,
    canonical: url,
    image,
    type: 'product',
    noindex: false,
    jsonLd,
  };
}

/** A post from GET /post/:id. */
function postMeta(post, site) {
  const body = String(post.postBody || '').replace(/<[^>]*>/g, ' ');
  const url = `${site}/news/${post._id}`;
  return {
    title: `${clip(post.postTitle, 70)} | ${SEO.siteName}`,
    description: clip(body || post.postTitle, 160),
    canonical: url,
    image: ogImage(absolute(site, post.postImage)) || absolute(site, SEO.defaultImage),
    type: 'article',
    noindex: false,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: clip(post.postTitle, 110),
      image: post.postImage ? [absolute(site, post.postImage)] : undefined,
      datePublished: post.createdAt,
      dateModified: post.updatedAt,
      url,
    },
  };
}

function notFoundMeta(site) {
  return {
    title: `Page not found | ${SEO.siteName}`,
    description: SEO.pages['/'].description,
    canonical: '',
    image: absolute(site, SEO.defaultImage),
    type: 'website',
    noindex: true,
  };
}

/** The tags, each marked data-seo so applyHead can swap them and useSeo can find them. */
function renderHead(m) {
  const tags = [
    `<title data-seo>${esc(m.title)}</title>`,
    `<meta data-seo name="description" content="${esc(m.description)}">`,
    m.noindex ? `<meta data-seo name="robots" content="noindex, nofollow">` : '',
    m.canonical ? `<link data-seo rel="canonical" href="${esc(m.canonical)}">` : '',
    `<meta data-seo property="og:site_name" content="${esc(SEO.siteName)}">`,
    `<meta data-seo property="og:type" content="${esc(m.type)}">`,
    `<meta data-seo property="og:title" content="${esc(m.title)}">`,
    `<meta data-seo property="og:description" content="${esc(m.description)}">`,
    m.canonical ? `<meta data-seo property="og:url" content="${esc(m.canonical)}">` : '',
    m.image ? `<meta data-seo property="og:image" content="${esc(m.image)}">` : '',
    `<meta data-seo name="twitter:card" content="${m.image ? 'summary_large_image' : 'summary'}">`,
    `<meta data-seo name="twitter:title" content="${esc(m.title)}">`,
    `<meta data-seo name="twitter:description" content="${esc(m.description)}">`,
    m.image ? `<meta data-seo name="twitter:image" content="${esc(m.image)}">` : '',
    // JSON in a script tag: only "<" can break out of it.
    m.jsonLd
      ? `<script data-seo type="application/ld+json">${JSON.stringify(m.jsonLd).replace(/</g, '\\u003c')}</script>`
      : '',
  ];
  return tags.filter(Boolean).join('');
}

/** Replaces the build's default SEO tags (and <title>) with the page's own. */
function applyHead(template, headHtml) {
  return template
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<script[^>]*\bdata-seo\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<(meta|link)\b[^>]*\bdata-seo\b[^>]*\/?>/gi, '')
    .replace('</head>', headHtml + '</head>');
}

module.exports = { staticMeta, carMeta, postMeta, notFoundMeta, renderHead, applyHead, priceAmounts, esc };
