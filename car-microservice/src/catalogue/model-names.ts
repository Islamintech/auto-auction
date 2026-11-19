/**
 * English car names from CKAuto's Korean ones, e.g. 현대 / 아반떼 / "1.6 가솔린"
 * -> "Hyundai Avante 1.6 Gasoline".
 *
 * Best effort by design: the admin sees the name in the Telegram preview and can
 * replace it. Anything still in Hangul after translation is dropped and the
 * result is flagged incomplete, so a Korean word never reaches the site or the
 * channel by accident.
 *
 * MODELS was seeded from the makes/models of the first real CKAuto run
 * (2026-11-18); add to it as new models show up.
 */

/** Catalogue brand code (see BRAND_ALIASES in catalogue.service) -> display name. */
const BRAND_DISPLAY: Record<string, string> = {
  HYUNDAI: 'Hyundai', KIA: 'Kia', GENESIS: 'Genesis', SAMSUNG: 'Renault', CHEVROLET: 'Chevrolet',
  SSANGYONG: 'KGM', MERCEDES: 'Mercedes-Benz', BMW: 'BMW', AUDI: 'Audi', TOYOTA: 'Toyota',
  HONDA: 'Honda', TESLA: 'Tesla', LEXUS: 'Lexus', VOLKSWAGEN: 'Volkswagen', VOLVO: 'Volvo',
  FORD: 'Ford', JEEP: 'Jeep', MINI: 'MINI', PORSCHE: 'Porsche', NISSAN: 'Nissan',
  INFINITI: 'Infiniti', 'LAND ROVER': 'Land Rover', JAGUAR: 'Jaguar', PEUGEOT: 'Peugeot',
  CITROEN: 'Citroën', CADILLAC: 'Cadillac', LINCOLN: 'Lincoln', CHRYSLER: 'Chrysler',
  MASERATI: 'Maserati', MAZDA: 'Mazda', MITSUBISHI: 'Mitsubishi', POLESTAR: 'Polestar', GMC: 'GMC',
};

/** Whole CKAuto `model` values. Checked before the word-level rules below. */
const MODELS: Record<string, string> = {
  // Hyundai
  아반떼: 'Avante', 쏘나타: 'Sonata', 그랜저: 'Grandeur', 싼타페: 'Santa Fe', 투싼: 'Tucson',
  포터: 'Porter', 스타렉스: 'Starex', 스타리아: 'Staria', 제네시스: 'Genesis', 코나: 'Kona',
  팰리세이드: 'Palisade', 캐스퍼: 'Casper', 마이티: 'Mighty', 엑센트: 'Accent', 넥쏘: 'Nexo',
  에쿠스: 'Equus', 아슬란: 'Aslan', 아이오닉: 'Ioniq', 베르나: 'Verna', 벨로스터: 'Veloster',
  i30: 'i30', i40: 'i40', 아이오닉5: 'Ioniq 5', 아이오닉6: 'Ioniq 6', 베뉴: 'Venue', 맥스크루즈: 'Maxcruz',
  // Kia
  모닝: 'Morning', 봉고: 'Bongo', 카니발: 'Carnival', 쏘렌토: 'Sorento', 스포티지: 'Sportage',
  프라이드: 'Pride', 레이: 'Ray', 포르테: 'Forte', 오피러스: 'Opirus', 셀토스: 'Seltos',
  모하비: 'Mohave', 니로: 'Niro', 스팅어: 'Stinger', 로체: 'Lotze', 스토닉: 'Stonic', 쏘울: 'Soul',
  K3: 'K3', K5: 'K5', K7: 'K7', K8: 'K8', K9: 'K9', EV3: 'EV3', EV4: 'EV4', EV6: 'EV6', EV9: 'EV9',
  // Chevrolet / GM Daewoo
  스파크: 'Spark', 올란도: 'Orlando', 말리부: 'Malibu', 마티즈: 'Matiz', 크루즈: 'Cruze',
  캡티바: 'Captiva', 트랙스: 'Trax', 라세티: 'Lacetti', 트레일블레이저: 'Trailblazer', 임팔라: 'Impala',
  다마스: 'Damas', 알페온: 'Alpheon', 젠트라: 'Gentra', 콜로라도: 'Colorado', 볼트: 'Bolt',
  // Renault Samsung
  SM3: 'SM3', SM5: 'SM5', SM6: 'SM6', SM7: 'SM7', QM3: 'QM3', QM5: 'QM5', QM6: 'QM6',
  '그랑 콜레오스': 'Grand Koleos', 세닉: 'Scenic', 클리오: 'Clio', 'XM3': 'XM3', 아르카나: 'Arkana',
  // KGM / SsangYong
  티볼리: 'Tivoli', '티볼리 에어': 'Tivoli Air', 코란도: 'Korando', '코란도 스포츠': 'Korando Sports',
  '코란도 투리스모': 'Korando Turismo', '렉스턴 스포츠': 'Rexton Sports', 렉스턴: 'Rexton', 토레스: 'Torres',
  // Imports
  '모델 Y': 'Model Y', '모델 3': 'Model 3', '모델 S': 'Model S', '모델 X': 'Model X',
  파나메라: 'Panamera', 카이엔: 'Cayenne', 마칸: 'Macan', 타이칸: 'Taycan',
  티구안: 'Tiguan', 티록: 'T-Roc', 파사트: 'Passat', 골프: 'Golf', 투아렉: 'Touareg', 아테온: 'Arteon',
  어코드: 'Accord', 시빅: 'Civic', 캠리: 'Camry', 아발론: 'Avalon', '프리우스 V': 'Prius V', 프리우스: 'Prius',
  기블리: 'Ghibli', 콰트로포르테: 'Quattroporte', 그레칼레: 'Grecale', 르반떼: 'Levante',
  머스탱: 'Mustang', 익스플로러: 'Explorer', 시에라: 'Sierra', 캐시카이: 'Qashqai',
  체로키: 'Cherokee', '그랜드 체로키': 'Grand Cherokee', '그랜드 체로키 L': 'Grand Cherokee L',
  레니게이드: 'Renegade', 랭글러: 'Wrangler',
  '디스커버리 스포츠': 'Discovery Sport', 디스커버리: 'Discovery', 디펜더: 'Defender',
  '레인지로버': 'Range Rover', '레인지로버 스포츠': 'Range Rover Sport', '레인지로버 이보크': 'Range Rover Evoque',
  'F-페이스': 'F-Pace', 'E-페이스': 'E-Pace',
  '미니 클럽맨': 'Clubman', '미니 해치 5도어': 'Hatch 5-door', '미니 해치 3도어': 'Hatch 3-door',
  '미니 컨트리맨': 'Countryman',
};

/** Word-level translations for trims and model names not in MODELS. Longest first matters. */
const WORDS: [RegExp, string][] = [
  [/(\S+?)클래스/g, '$1-Class'],
  [/(\d)시리즈/g, '$1 Series'],
  [/롱\s*레인지/g, 'Long Range'],
  [/(\d)\s*도어/g, '$1-door'],
  [/(\d+)\s*인승/g, '$1-seater'],
  [/하이브리드/g, 'Hybrid'],
  [/가솔린|휘발유/g, 'Gasoline'],
  [/디젤|경유/g, 'Diesel'],
  [/전기/g, 'Electric'],
  [/터보/g, 'Turbo'],
  [/콰트로/g, 'quattro'],
  [/세단/g, 'Sedan'],
  [/해치백/g, 'Hatchback'],
  [/왜건/g, 'Wagon'],
  [/쿠페/g, 'Coupe'],
  [/스포트백/g, 'Sportback'],
  [/카브리올레|컨버터블/g, 'Cabriolet'],
  [/클럽맨/g, 'Clubman'],
  [/쿠퍼/g, 'Cooper'],
  [/에코부스트/g, 'EcoBoost'],
  [/일반캡/g, 'Standard Cab'],
  [/더블캡/g, 'Double Cab'],
  [/슈퍼캡/g, 'Super Cab'],
  [/초장축/g, 'Super Long'],
  [/장축/g, 'Long'],
  [/카고/g, 'Cargo'],
  [/밴/g, 'Van'],
  [/리무진/g, 'Limousine'],
  [/프리미엄/g, 'Premium'],
  [/익스클루시브/g, 'Exclusive'],
  [/럭셔리/g, 'Luxury'],
  [/프레스티지/g, 'Prestige'],
  [/노블레스/g, 'Noblesse'],
  [/시그니처/g, 'Signature'],
  [/인스퍼레이션/g, 'Inspiration'],
  [/캘리그래피/g, 'Calligraphy'],
  [/스페셜/g, 'Special'],
  [/스탠다드/g, 'Standard'],
  [/퍼포먼스/g, 'Performance'],
  [/모던/g, 'Modern'],
  [/스마트/g, 'Smart'],
  [/모델/g, 'Model'],
  [/사륜|4륜/g, 'AWD'],
  [/2륜/g, '2WD'],
  [/파나메라/g, 'Panamera'],
  [/카이맨/g, 'Cayman'],
  [/박스터/g, 'Boxster'],
  [/티구안/g, 'Tiguan'],
  [/파사트/g, 'Passat'],
];

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;

const translateWords = (s: string): string => WORDS.reduce((acc, [re, to]) => acc.replace(re, to), s);

/** Drops "(08-현재)"-style generation ranges, then any word still in Hangul. */
const clean = (s: string): { text: string; dropped: boolean } => {
  let dropped = false;
  const words = s
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .filter((w) => {
      if (!w) return false;
      if (HANGUL.test(w)) {
        dropped = true;
        return false;
      }
      return true;
    });
  return { text: words.join(' '), dropped };
};

export interface EnglishName {
  name: string;
  /** False when some Korean could not be translated and was left out. */
  complete: boolean;
}

/**
 * @param brandCode catalogue brand code, e.g. "HYUNDAI" (already resolved from the Korean make)
 */
export function englishName(brandCode: string, model?: string, trim?: string): EnglishName {
  const brand = BRAND_DISPLAY[brandCode] ?? (brandCode ? brandCode.charAt(0) + brandCode.slice(1).toLowerCase() : '');

  const m = (model ?? '').trim();
  const modelEn = clean(MODELS[m] ?? translateWords(m));
  const trimEn = clean(translateWords((trim ?? '').trim()));

  // Avoid "Volkswagen Tiguan Tiguan 2.0 TDI" when the trim repeats the model.
  let trimText = trimEn.text;
  if (modelEn.text && trimText.toLowerCase().startsWith(modelEn.text.toLowerCase() + ' ')) {
    trimText = trimText.slice(modelEn.text.length + 1);
  }

  const name = [brand, modelEn.text, trimText].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return { name, complete: !modelEn.dropped && !trimEn.dropped && !!modelEn.text };
}
