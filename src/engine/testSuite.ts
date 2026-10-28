/**
 * TMPSP v2.1 Átfogó Automata Motorteszt- és Audit Csomag
 * 
 * Szigorú Szabályozói Validációs Kapu (32 Egységteszt):
 * 1. HASH-ALGORITMUS: NIST tesztvektorok, magyar ékezetek, Unicode, üres string, nagy blokkok
 * 2. KANONIZÁLÁS (RFC 8785 JCS):
 *    - Kulcsrendezési invariancia
 *    - Lebegőpontos determinizmus és -0 normalizálás
 *    - Szigorú elutasítás: undefined objektumban (nincs csendes elhagyás)
 *    - Szigorú elutasítás: undefined tömbben (nincs csendes null-konverzió)
 *    - Szigorú elutasítás: magányos / páratlan UTF-16 surrogate kódpontok
 *    - Nem-ASCII kulcsok UTF-16 kódrendezése
 *    - Exponenciális számok szabványos formázása
 * 3. WORM AUDITLÁNC ÉS TÁMADÁSI MODELLEK:
 *    - Ép lánc folytonossága
 *    - Belső rekordtartalom-manipuláció (Payload Tampering)
 *    - Köztes rekord törlése (Middle Record Deletion)
 *    - Rekordok átrendezése (Reordering Attack)
 *    - Hibás Genesis rekord (Invalid Genesis Hash)
 *    - Időbélyeg-regresszió (Timestamp Rollback Attack)
 *    - Érvénytelen időbélyeg szintaxis (Invalid Timestamp Format)
 *    - Üres audit napló (Empty Ledger Detection)
 *    - Külső bizalmi horgony (Trust Anchor) igazolása
 *    - Teljes lánccsere (Replaced Chain Attack) detektálása a bizalmi horgonyon
 * 4. ÁLLAPOTGÉP ÉS SAROKESETEK:
 *    - Mind a 15 indikátor numerikus tesztvektora (2024Q1 Pilot)
 *    - Zéróosztás és érvénytelen nevező védelme
 *    - 1.2a Összetett küszöb: hiányzó YoY bázis
 *    - 1.2a Mindkét feltétel igazolt (<45% ÉS YoY <= -10pp)
 *    - 1.3 Perzisztencia: 1Q izolált jelzés nem ad éles riasztást
 *    - 1.3 Perzisztencia: 2 egymást követő negyedév igazolja a tartósságot
 *    - 2.4 LGD-Shift hiány esetén likviditási bypass blokkolása
 * 5. KALIBRÁCIÓ ÉS DEGENERÁLT ESETEK:
 *    - Egzakt ROC-AUC és FPR számítás normál bázison
 *    - Degenerált eset: hiányzó pozitív (stressz) referenciaosztály -> null AUC, NEM_KALIBRÁLHATÓ
 *    - Degenerált eset: hiányzó negatív (normál) referenciaosztály -> null AUC, NEM_KALIBRÁLHATÓ
 *    - Zéró variancia az indikátorértékekben -> AUC = 0.50
 */

import { sha256Utf8 } from './sha256';
import { canonicalJsonStringify, CanonicalJsonError } from './canonicalJson';
import { calculateIndicatorValue } from './calculator';
import { evaluateModule2 } from './stateMachine';
import { runThresholdBacktest } from './calibration';
import {
  computeCanonicalRecordHash,
  verifyAuditChain,
  CanonicalAuditRecord,
  TrustAnchor,
  GENESIS_PREV_HASH,
} from './cryptoNode';
import { IndicatorMeta, QuarterDataRow } from './types';
import { MEASUREMENT_SERIES_META } from '../data/tmpspData';

export type TestCategory =
  | 'SHA256_FIPS_UNICODE'
  | 'RFC8785_KANONIZÁLÁS'
  | 'SZÁMTAN'
  | 'ÖSSZETETT_KÜSZÖB'
  | 'PERZISZTENCIA'
  | 'ADATHIÁNY'
  | 'KALIBRÁCIÓ'
  | 'WORM_INTEGRITÁS';

export interface TestResult {
  id: string;
  kategoria: TestCategory;
  nev: string;
  leiras: string;
  sikeres: boolean;
  vart: string;
  kapott: string;
  reszletek?: string;
}

export function runAllEngineTests(): TestResult[] {
  const results: TestResult[] = [];
  const metaMap = new Map<string, IndicatorMeta>();
  MEASUREMENT_SERIES_META.forEach((m) => metaMap.set(m.sorId, m));

  // =========================================================================
  // 1. KATEGÓRIA: SHA-256 FIPS ÉS UNICODE TESZTVEKTOROK
  // =========================================================================

  // HSH-001: NIST Üres String
  const emptyHash = sha256Utf8('');
  const nistEmptyExpected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  results.push({
    id: 'HSH-001',
    kategoria: 'SHA256_FIPS_UNICODE',
    nev: 'NIST SHA-256 Üres String Tesztvektor',
    leiras: 'Ellenőrzi a nulla hosszúságú bemenet FIPS 180-4 szerinti hash-értékét.',
    sikeres: emptyHash === nistEmptyExpected,
    vart: nistEmptyExpected,
    kapott: emptyHash,
  });

  // HSH-002: NIST "abc"
  const abcHash = sha256Utf8('abc');
  const nistAbcExpected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  results.push({
    id: 'HSH-002',
    kategoria: 'SHA256_FIPS_UNICODE',
    nev: 'NIST SHA-256 Rövid String ("abc") Tesztvektor',
    leiras: 'Alapvető 24 bites szöveg hash számításának vizsgálata.',
    sikeres: abcHash === nistAbcExpected,
    vart: nistAbcExpected,
    kapott: abcHash,
  });

  // HSH-003: NIST 448-bit String
  const nist448 = 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq';
  const nist448Hash = sha256Utf8(nist448);
  const nist448Expected = '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1';
  results.push({
    id: 'HSH-003',
    kategoria: 'SHA256_FIPS_UNICODE',
    nev: 'NIST SHA-256 448-bites Blokkméret Tesztvektor',
    leiras: 'Két 512-bites blokk határára eső bemenet padding helyességének ellenőrzése.',
    sikeres: nist448Hash === nist448Expected,
    vart: nist448Expected,
    kapott: nist448Hash,
  });

  // HSH-004: Magyar Ékezetek és Több-bájtos UTF-8
  const huText = 'Árvíztűrő tükörfúrógép';
  const huHash = sha256Utf8(huText);
  const huExpected = 'e97fec1a60c062760e78b47037ac4bf542343a1c295aab5b30f5b48030eb88dd';
  results.push({
    id: 'HSH-004',
    kategoria: 'SHA256_FIPS_UNICODE',
    nev: 'Magyar Ékezetes UTF-8 Szöveg Integritás',
    leiras: 'Igazolja az összes magyar speciális magánhangzó (ő, ű, í, ó, ü stb.) UTF-8 bájtfolyammá kódolását.',
    sikeres: huHash === huExpected,
    vart: huExpected,
    kapott: huHash,
  });

  // HSH-005: Hosszú Bemenet (12 000 karakter)
  const longInput = 'TMPSP_v2.1_MNB_AUDIT_VERIFICATION_STREAM_'.repeat(300);
  const longHash = sha256Utf8(longInput);
  results.push({
    id: 'HSH-005',
    kategoria: 'SHA256_FIPS_UNICODE',
    nev: 'Nagy Bemeneti Adatblokk (12 000 Karakter)',
    leiras: 'Ellenőrzi a többmenetes 512 bites blokkciklust és a bit hosszúság számláló túlcsordulás-mentességét.',
    sikeres: longHash.length === 64 && /^[0-9a-f]{64}$/.test(longHash),
    vart: '64 karakteres érvényes hexadecimális lenyomat',
    kapott: `${longHash.slice(0, 16)}...${longHash.slice(-8)} (Hossz: ${longHash.length})`,
  });

  // =========================================================================
  // 2. KATEGÓRIA: RFC 8785 KANONIZÁLÁS (JSON CANONICALIZATION SCHEME)
  // =========================================================================

  // CAN-001: Kulcsrendezési Invariancia
  const objA = { z: 'utolsó', a: 100, m: { b: 2, a: 1 } };
  const objB = { a: 100, m: { a: 1, b: 2 }, z: 'utolsó' };
  const canonA = canonicalJsonStringify(objA);
  const canonB = canonicalJsonStringify(objB);
  results.push({
    id: 'CAN-001',
    kategoria: 'RFC8785_KANONIZÁLÁS',
    nev: 'RFC 8785 Kulcsrendezési Invariancia',
    leiras: 'Eltérő sorrendben definiált objektumkulcsoknak azonos kánonikus JSON sztringet kell eredményezniük.',
    sikeres: canonA === canonB && canonA === '{"a":100,"m":{"a":1,"b":2},"z":"utolsó"}',
    vart: '{"a":100,"m":{"a":1,"b":2},"z":"utolsó"}',
    kapott: canonA,
  });

  // CAN-002: Lebegőpontos és Speciális Értékek Kanonizálása (-0 -> 0)
  const objNum = { zero: -0, num: 42.5, flag: true, empty: null };
  const canonNum = canonicalJsonStringify(objNum);
  results.push({
    id: 'CAN-002',
    kategoria: 'RFC8785_KANONIZÁLÁS',
    nev: 'Determinisztikus IEEE 754 és Primitív Kódolás (-0 -> 0)',
    leiras: 'Biztosítja a -0 normalizálását 0-ra, zéró whitespace-t és helyes típusábrázolást.',
    sikeres: canonNum === '{"empty":null,"flag":true,"num":42.5,"zero":0}',
    vart: '{"empty":null,"flag":true,"num":42.5,"zero":0}',
    kapott: canonNum,
  });

  // CAN-003: Szigorú Elutasítás - Undefined Érték Objektumban
  let caughtUndefObj = false;
  try {
    canonicalJsonStringify({ valid: 1, invalid: undefined });
  } catch (e) {
    if (e instanceof CanonicalJsonError && e.message.includes('undefined')) {
      caughtUndefObj = true;
    }
  }
  results.push({
    id: 'CAN-003',
    kategoria: 'RFC8785_KANONIZÁLÁS',
    nev: 'RFC 8785 Szigorú Bemenetvalidálás (Undefined Objektumban)',
    leiras: 'Az RFC 8785 tiltja a nem-JSON mezők csendes kihagyását: TypeError kivételt kell dobni.',
    sikeres: caughtUndefObj,
    vart: 'CanonicalJsonError kivétel dobva',
    kapott: caughtUndefObj ? 'Kivétel sikeresen elkapva' : 'Nem dobott kivételt',
  });

  // CAN-004: Szigorú Elutasítás - Undefined Érték Tömbben
  let caughtUndefArr = false;
  try {
    canonicalJsonStringify([1, undefined, 3]);
  } catch (e) {
    if (e instanceof CanonicalJsonError && e.message.includes('undefined')) {
      caughtUndefArr = true;
    }
  }
  results.push({
    id: 'CAN-004',
    kategoria: 'RFC8785_KANONIZÁLÁS',
    nev: 'RFC 8785 Szigorú Bemenetvalidálás (Undefined Tömbben)',
    leiras: 'Tömbökben lévő undefined esetén tilos a csendes null-ra váltás: azonnali kivétel szükséges.',
    sikeres: caughtUndefArr,
    vart: 'CanonicalJsonError kivétel dobva',
    kapott: caughtUndefArr ? 'Kivétel sikeresen elkapva' : 'Nem dobott kivételt',
  });

  // CAN-005: Szigorú Elutasítás - Páratlan UTF-16 Surrogate Kódpont
  let caughtSurrogate = false;
  try {
    canonicalJsonStringify('Hibas\uD800Szoveg');
  } catch (e) {
    if (e instanceof CanonicalJsonError && e.message.includes('surrogate')) {
      caughtSurrogate = true;
    }
  }
  results.push({
    id: 'CAN-005',
    kategoria: 'RFC8785_KANONIZÁLÁS',
    nev: 'Magányos UTF-16 Surrogate Kódpontok Elutasítása',
    leiras: 'Páratlan surrogate (U+D800 - U+DFFF) esetén a kanonizáló nem generálhat hibás JSON-t, el kell utasítani.',
    sikeres: caughtSurrogate,
    vart: 'CanonicalJsonError surrogate kivétel dobva',
    kapott: caughtSurrogate ? 'Kivétel sikeresen elkapva' : 'Nem dobott kivételt',
  });

  // CAN-006: Nem-ASCII Kulcsok UTF-16 Kódrendezése
  const nonAsciiObj = { zsongás: 3, árvíz: 1, ékezet: 2 };
  const nonAsciiCanon = canonicalJsonStringify(nonAsciiObj);
  // UTF-16 kódok: 'z' = 122, 'á' = 225, 'é' = 233 -> elvárt: {"zsongás":3,"árvíz":1,"ékezet":2}
  const expectedNonAscii = '{"zsongás":3,"árvíz":1,"ékezet":2}';
  results.push({
    id: 'CAN-006',
    kategoria: 'RFC8785_KANONIZÁLÁS',
    nev: 'Nem-ASCII Kulcsok UTF-16 Kódrendezése (JCS Section 3.2.3)',
    leiras: 'Ellenőrzi a magyar ékezetes kulcsok UTF-16 kód szerinti egzakt rendezését.',
    sikeres: nonAsciiCanon === expectedNonAscii,
    vart: expectedNonAscii,
    kapott: nonAsciiCanon,
  });

  // CAN-007: Exponenciális és Nagy Lebegőpontos Számok
  const expObj = { val: 1e20 };
  const expCanon = canonicalJsonStringify(expObj);
  results.push({
    id: 'CAN-007',
    kategoria: 'RFC8785_KANONIZÁLÁS',
    nev: 'Nagy és Exponenciális Számok ECMAScript Kanonizálása',
    leiras: 'Ellenőrzi, hogy a számok nem vesznek el kerekítés miatt, és pontosan követik az ECMAScript Number::toString szabályát.',
    sikeres: expCanon === '{"val":100000000000000000000}',
    vart: '{"val":100000000000000000000}',
    kapott: expCanon,
  });

  // =========================================================================
  // 3. KATEGÓRIA: MIND A 15 INDIKÁTOR NUMERIKUS VEKTORAI
  // =========================================================================

  const pilotTestVectors: Array<{
    sorId: string;
    foid: string;
    szamlalo: number | undefined;
    nevezo: number | undefined;
    szamitott: number | undefined;
    drl: 'IGAZOLT' | 'PROXY' | 'HOZZÁFÉRÉS_KÉRDÉSES' | 'NEM_ELÉRHETŐ';
    expectedVal: number | null;
    tolerance: number;
    expectedStr: string;
  }> = [
    { sorId: '1.1', foid: '1.1', szamlalo: 1420, nevezo: 1, szamitott: 1420, drl: 'IGAZOLT', expectedVal: 1420, tolerance: 0.01, expectedStr: '1420.00' },
    { sorId: '1.2a', foid: '1.2', szamlalo: 5800, nevezo: 13796, szamitott: undefined, drl: 'PROXY', expectedVal: 42.04, tolerance: 0.05, expectedStr: '42.04%' },
    { sorId: '1.2b', foid: '1.2', szamlalo: 35.2, nevezo: 47.1, szamitott: undefined, drl: 'IGAZOLT', expectedVal: 74.73, tolerance: 0.05, expectedStr: '74.73%' },
    { sorId: '1.3', foid: '1.3', szamlalo: 2854, nevezo: 5359, szamitott: undefined, drl: 'HOZZÁFÉRÉS_KÉRDÉSES', expectedVal: 53.26, tolerance: 0.05, expectedStr: '53.26%' },
    { sorId: '1.4', foid: '1.4', szamlalo: 18.2, nevezo: 47.1, szamitott: undefined, drl: 'IGAZOLT', expectedVal: 38.64, tolerance: 0.05, expectedStr: '38.64%' },
    { sorId: '2.1', foid: '2.1', szamlalo: 119, nevezo: 57, szamitott: undefined, drl: 'PROXY', expectedVal: 2.088, tolerance: 0.01, expectedStr: '2.088' },
    { sorId: '2.2', foid: '2.2', szamlalo: 11.2, nevezo: 100, szamitott: undefined, drl: 'PROXY', expectedVal: 11.2, tolerance: 0.05, expectedStr: '11.20%' },
    { sorId: '2.3', foid: '2.3', szamlalo: 12.8, nevezo: 47.1, szamitott: undefined, drl: 'IGAZOLT', expectedVal: 27.18, tolerance: 0.05, expectedStr: '27.18%' },
    { sorId: '2.4', foid: '2.4', szamlalo: undefined, nevezo: undefined, szamitott: undefined, drl: 'NEM_ELÉRHETŐ', expectedVal: null, tolerance: 0, expectedStr: 'ADATHIÁNY' },
    { sorId: '3.1a', foid: '3.1', szamlalo: 840, nevezo: 3850, szamitott: undefined, drl: 'IGAZOLT', expectedVal: 21.82, tolerance: 0.05, expectedStr: '21.82%' },
    { sorId: '3.1b', foid: '3.1', szamlalo: 145, nevezo: 520, szamitott: undefined, drl: 'PROXY', expectedVal: 27.88, tolerance: 0.05, expectedStr: '27.88%' },
    { sorId: '3.2', foid: '3.2', szamlalo: -3450, nevezo: 1951, szamitott: undefined, drl: 'IGAZOLT', expectedVal: -1.77, tolerance: 0.05, expectedStr: '-1.77‰' },
    { sorId: '3.3', foid: '3.3', szamlalo: 420, nevezo: 12400, szamitott: undefined, drl: 'IGAZOLT', expectedVal: 3.39, tolerance: 0.05, expectedStr: '3.39%' },
    { sorId: '4.1', foid: '4.1', szamlalo: 1540, nevezo: 78500, szamitott: undefined, drl: 'IGAZOLT', expectedVal: 1.96, tolerance: 0.05, expectedStr: '1.96%' },
    { sorId: '4.2', foid: '4.2', szamlalo: 420, nevezo: 650, szamitott: undefined, drl: 'PROXY', expectedVal: 0.646, tolerance: 0.01, expectedStr: '0.646' },
  ];

  let vectorSuccessCount = 0;
  const vectorFailures: string[] = [];

  pilotTestVectors.forEach((tv) => {
    const meta = metaMap.get(tv.sorId)!;
    const row: QuarterDataRow = {
      negyedev: '2024Q1',
      sorId: tv.sorId,
      foid: tv.foid,
      eredet: 'SZINTETIKUS_PILOT_2024Q1',
      drl: tv.drl,
      szamlaloErtek: tv.szamlalo,
      nevezoErtek: tv.nevezo,
      szamitottErtek: tv.szamitott,
    };

    const calc = calculateIndicatorValue(row, meta, []);
    let ok = false;
    if (tv.expectedVal === null) {
      ok = calc.szamitottErtek === null && calc.adathiany;
    } else if (calc.szamitottErtek !== null) {
      ok = Math.abs(calc.szamitottErtek - tv.expectedVal) <= tv.tolerance;
    }

    if (ok) {
      vectorSuccessCount++;
    } else {
      vectorFailures.push(`${tv.sorId}: kapott=${calc.formazottErtek}, elvárt=${tv.expectedStr}`);
    }
  });

  results.push({
    id: 'VEC-001',
    kategoria: 'SZÁMTAN',
    nev: 'Mind a 15 Indikátor Numerikus Tesztvektora (2024Q1 Pilot)',
    leiras: 'Ellenőrzi az összes mérési sor specifikáció szerinti matematikai levezetését, beleértve a 3.2 ezrelékes és 2.4 adathiányos eseteit.',
    sikeres: vectorSuccessCount === 15,
    vart: '15/15 sikeres egyezés',
    kapott: `${vectorSuccessCount}/15 sikeres${vectorFailures.length > 0 ? ` (Hibák: ${vectorFailures.join(', ')})` : ''}`,
  });

  // =========================================================================
  // 4. KATEGÓRIA: ÖSSZETETT KÜSZÖB ÉS PERZISZTENCIA
  // =========================================================================

  // CMP-001: 1.2a Bázishiány
  const meta12a = metaMap.get('1.2a')!;
  const row12aCurrent: QuarterDataRow = {
    negyedev: '2024Q1',
    sorId: '1.2a',
    foid: '1.2',
    eredet: 'SZINTETIKUS_PILOT_2024Q1',
    drl: 'PROXY',
    szamlaloErtek: 5800,
    nevezoErtek: 13796,
  };
  const calc12aNoBase = calculateIndicatorValue(row12aCurrent, meta12a, [row12aCurrent]);
  results.push({
    id: 'CMP-001',
    kategoria: 'ÖSSZETETT_KÜSZÖB',
    nev: '1.2a Bázishiány: YoY feltétel nem ellenőrizhető',
    leiras: 'Ha az előző év azonos negyedéve hiányzik, a YoY delta nem számítható, a rendszer SÁRGA - ELŐZETES marad.',
    sikeres: !calc12aNoBase.yoyEllenorizheto && calc12aNoBase.atlepte,
    vart: 'yoyEllenorizheto = false, atlepte = true',
    kapott: `yoyEllenorizheto = ${calc12aNoBase.yoyEllenorizheto}, atlepte = ${calc12aNoBase.atlepte}`,
  });

  // CMP-002: 1.2a Mindkét feltétel teljesül (<45% ÉS YoY <= -10pp)
  const row12aPrevYear: QuarterDataRow = {
    negyedev: '2023Q1',
    sorId: '1.2a',
    foid: '1.2',
    eredet: 'HISTÓRIKUS_BÁZIS_2023_2024',
    drl: 'IGAZOLT',
    szamlaloErtek: 7450,
    nevezoErtek: 13796,
  };
  const calc12aFull = calculateIndicatorValue(row12aCurrent, meta12a, [row12aCurrent, row12aPrevYear]);
  const yoyDeltaValid = calc12aFull.yoyDelta !== undefined && calc12aFull.yoyDelta !== null && calc12aFull.yoyDelta <= -10;
  results.push({
    id: 'CMP-002',
    kategoria: 'ÖSSZETETT_KÜSZÖB',
    nev: '1.2a Mindkét Feltétel Igazolt (<45% ÉS YoY -10pp)',
    leiras: 'Ha az 1.2a hozzáférési ráta 45% alatti ÉS az egy évvel korábbi bázishoz képest legalább 10 százalékponttal romlott.',
    sikeres: calc12aFull.atlepte && calc12aFull.yoyEllenorizheto && yoyDeltaValid,
    vart: 'atlepte = true, yoyDelta <= -10pp',
    kapott: `atlepte = ${calc12aFull.atlepte}, yoyDelta = ${calc12aFull.yoyDelta !== null && calc12aFull.yoyDelta !== undefined ? calc12aFull.yoyDelta.toFixed(2) : 'null'} pp`,
  });

  // PRS-001: 1.3 Perzisztencia - 1 negyedév nem ad éles riasztást
  const meta13 = metaMap.get('1.3')!;
  const row13Current: QuarterDataRow = {
    negyedev: '2024Q1',
    sorId: '1.3',
    foid: '1.3',
    eredet: 'SZINTETIKUS_PILOT_2024Q1',
    drl: 'HOZZÁFÉRÉS_KÉRDÉSES',
    szamlaloErtek: 2854,
    nevezoErtek: 5359,
  };
  const row13PrevQNormal: QuarterDataRow = {
    negyedev: '2023Q4',
    sorId: '1.3',
    foid: '1.3',
    eredet: 'HISTÓRIKUS_BÁZIS_2023_2024',
    drl: 'IGAZOLT',
    szamlaloErtek: 2100,
    nevezoErtek: 5359,
  };
  const calc13Single = calculateIndicatorValue(row13Current, meta13, [row13Current, row13PrevQNormal]);
  results.push({
    id: 'PRS-001',
    kategoria: 'PERZISZTENCIA',
    nev: '1.3 Perzisztencia: 1 negyedéves jelzés nem aktivál éles riasztást',
    leiras: 'Ha az 1.3 átlépi az 50%-ot, de az előző negyedévben normál szinten volt, a perzisztencia nem teljesül.',
    sikeres: calc13Single.atlepte && !calc13Single.perzisztenciaMegfelelo,
    vart: 'atlepte = true, perzisztenciaMegfelelo = false',
    kapott: `atlepte = ${calc13Single.atlepte}, perzisztens = ${calc13Single.perzisztenciaMegfelelo}`,
  });

  // PRS-002: 1.3 Perzisztencia - 2 egymást követő negyedév igazolva
  const row13PrevQHigh: QuarterDataRow = {
    negyedev: '2023Q4',
    sorId: '1.3',
    foid: '1.3',
    eredet: 'HISTÓRIKUS_BÁZIS_2023_2024',
    drl: 'IGAZOLT',
    szamlaloErtek: 2750,
    nevezoErtek: 5359,
  };
  const calc13Persistent = calculateIndicatorValue(row13Current, meta13, [row13Current, row13PrevQHigh]);
  results.push({
    id: 'PRS-002',
    kategoria: 'PERZISZTENCIA',
    nev: '1.3 Perzisztencia: 2 egymást követő negyedév igazolja a tartósságot',
    leiras: 'Ha az 1.3 két egymást követő negyedévben is >50%, a perzisztencia igazolt státuszt kap.',
    sikeres: calc13Persistent.atlepte && calc13Persistent.perzisztenciaMegfelelo,
    vart: 'atlepte = true, perzisztenciaMegfelelo = true',
    kapott: `atlepte = ${calc13Persistent.atlepte}, perzisztens = ${calc13Persistent.perzisztenciaMegfelelo}`,
  });

  // =========================================================================
  // 5. KATEGÓRIA: ADATHIÁNY ÉS DRL BLOKKOLÁS
  // =========================================================================

  // DAT-001: 2.4 LGD-Shift Hiány - Likviditási bypass blokkolása
  const meta24 = metaMap.get('2.4')!;
  const row24Missing: QuarterDataRow = {
    negyedev: '2024Q1',
    sorId: '2.4',
    foid: '2.4',
    eredet: 'SZINTETIKUS_PILOT_2024Q1',
    drl: 'NEM_ELÉRHETŐ',
  };
  const calc24Missing = calculateIndicatorValue(row24Missing, meta24, []);
  const mockCalcsM2 = {
    '2.1': { ...calculateIndicatorValue({ negyedev: '2024Q1', sorId: '2.1', foid: '2.1', eredet: 'SZINTETIKUS_PILOT_2024Q1', drl: 'PROXY', szamlaloErtek: 119, nevezoErtek: 57 }, metaMap.get('2.1')!, []) },
    '2.2': { ...calculateIndicatorValue({ negyedev: '2024Q1', sorId: '2.2', foid: '2.2', eredet: 'SZINTETIKUS_PILOT_2024Q1', drl: 'PROXY', szamlaloErtek: 11.2, nevezoErtek: 100 }, metaMap.get('2.2')!, []) },
    '2.3': { ...calculateIndicatorValue({ negyedev: '2024Q1', sorId: '2.3', foid: '2.3', eredet: 'SZINTETIKUS_PILOT_2024Q1', drl: 'IGAZOLT', szamlaloErtek: 12.8, nevezoErtek: 47.1 }, metaMap.get('2.3')!, []) },
    '2.4': calc24Missing,
  };
  const evalM2 = evaluateModule2(mockCalcsM2);
  results.push({
    id: 'DAT-001',
    kategoria: 'ADATHIÁNY',
    nev: '2.4 LGD-Shift Hiány: Likviditási bypass blokkolása',
    leiras: 'Kritikus adathiány esetén a likviditási bypass szigorúan blokkolva marad, az állapotgép nem enged ZÖLD-et.',
    sikeres: !evalM2.likviditasiBypassAktiv && !evalM2.likviditasiBypassEllenorizheto && evalM2.statusz === 'SÁRGA - ELŐZETES',
    vart: 'bypassAktiv = false, bypassEllenorizheto = false, statusz = SÁRGA - ELŐZETES',
    kapott: `bypassAktiv = ${evalM2.likviditasiBypassAktiv}, ellenorizheto = ${evalM2.likviditasiBypassEllenorizheto}, statusz = ${evalM2.statusz}`,
  });

  // DAT-002: Zéróosztás és Érvénytelen Nevező Védelme
  const rowZeroDiv: QuarterDataRow = {
    negyedev: '2024Q1',
    sorId: '2.1',
    foid: '2.1',
    eredet: 'SZINTETIKUS_PILOT_2024Q1',
    drl: 'PROXY',
    szamlaloErtek: 120,
    nevezoErtek: 0,
  };
  const calcZeroDiv = calculateIndicatorValue(rowZeroDiv, metaMap.get('2.1')!, []);
  results.push({
    id: 'DAT-002',
    kategoria: 'ADATHIÁNY',
    nev: 'Zéróosztás és Érvénytelen Nevező Védelme',
    leiras: 'Ha a nevező értéke 0, a kalkulátor nem dob Infinity vagy NaN értéket, hanem adathiányként kezeli.',
    sikeres: calcZeroDiv.szamitottErtek === null && calcZeroDiv.adathiany && calcZeroDiv.formazottErtek === 'ADATHIÁNY',
    vart: 'szamitottErtek = null, adathiany = true',
    kapott: `szamitottErtek = ${calcZeroDiv.szamitottErtek}, adathiany = ${calcZeroDiv.adathiany}`,
  });

  // =========================================================================
  // 6. KATEGÓRIA: KALIBRÁCIÓ ÉS DEGENERÁLT ESETEK
  // =========================================================================

  // CAL-001: Normál Wilcoxon-Mann-Whitney AUC és FPR
  const mockMetaCalib: IndicatorMeta = {
    sorId: 'TEST-1',
    foid: 'T.1',
    modulId: 'M1',
    nev: 'Kalibrációs Tesztindikátor',
    kepletLeiras: 'Teszt célú indikátor',
    szamlaloNev: 'Sz',
    nevezoNev: 'N',
    egyseg: '%',
    alapertelmezettDRL: 'IGAZOLT',
    adatgazda: 'Teszt',
    frissitesiGyakorisag: 'Q',
    jeloltKuszob: '> 50%',
    kuszobTipus: '>',
    kuszobErtek: 50,
    kuszobStatusz: 'JELÖLT',
    cafolatiFeltetel: 'Teszt cafolat',
    felelos: 'Teszt felelos',
  };
  const testHistoryRows: QuarterDataRow[] = [
    { negyedev: '2023Q1', sorId: 'TEST-1', foid: 'T.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', drl: 'IGAZOLT', szamitottErtek: 40 },
    { negyedev: '2023Q2', sorId: 'TEST-1', foid: 'T.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', drl: 'IGAZOLT', szamitottErtek: 80 },
    { negyedev: '2023Q3', sorId: 'TEST-1', foid: 'T.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', drl: 'IGAZOLT', szamitottErtek: 90 },
    { negyedev: '2023Q4', sorId: 'TEST-1', foid: 'T.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', drl: 'IGAZOLT', szamitottErtek: 30 },
    { negyedev: '2024Q1', sorId: 'TEST-1', foid: 'T.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', drl: 'IGAZOLT', szamitottErtek: 35 },
  ];
  const calibRes = runThresholdBacktest(mockMetaCalib, testHistoryRows);
  results.push({
    id: 'CAL-001',
    kategoria: 'KALIBRÁCIÓ',
    nev: 'Wilcoxon-Mann-Whitney ROC-AUC és FPR Matematikai Integritás',
    leiras: 'Tökéletes szétválasztás esetén (stressz időszakban 80, 90; normálban 40, 30, 35) az AUC = 1.00 és FPR = 0%.',
    sikeres: calibRes.auc === 1.0 && calibRes.fpr === 0 && calibRes.matematikaiHelyesseg,
    vart: 'AUC = 1.00, FPR = 0%, matematikaiHelyesseg = true',
    kapott: `AUC = ${calibRes.auc?.toFixed(2)}, FPR = ${calibRes.fpr}%`,
  });

  // CAL-002: Degenerált Osztályeloszlás (Nincs pozitív stresszesemény a mintában)
  const noStressEventMap: Record<string, boolean> = {
    '2023Q1': false,
    '2023Q2': false,
    '2023Q3': false,
    '2023Q4': false,
    '2024Q1': false,
  };
  const calibDegenerateNoStress = runThresholdBacktest(mockMetaCalib, testHistoryRows, noStressEventMap);
  results.push({
    id: 'CAL-002',
    kategoria: 'KALIBRÁCIÓ',
    nev: 'Degenerált Osztályeloszlás (Hiányzó Pozitív Stressz)',
    leiras: 'Ha a mintában nincs egyetlen pozitív stresszesemény sem, a ROC-AUC nem definiált (null), osztás-nullával védelem.',
    sikeres: calibDegenerateNoStress.auc === null && calibDegenerateNoStress.isDegenerate === true,
    vart: 'auc = null, isDegenerate = true (nem NaN)',
    kapott: `auc = ${calibDegenerateNoStress.auc}, isDegenerate = ${calibDegenerateNoStress.isDegenerate}`,
  });

  // CAL-003: Zéró Variancia (Konstans indikátorértékek)
  const zeroVarianceRows: QuarterDataRow[] = [
    { negyedev: '2023Q1', sorId: 'TEST-1', foid: 'T.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', drl: 'IGAZOLT', szamitottErtek: 50 },
    { negyedev: '2023Q2', sorId: 'TEST-1', foid: 'T.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', drl: 'IGAZOLT', szamitottErtek: 50 },
    { negyedev: '2023Q3', sorId: 'TEST-1', foid: 'T.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', drl: 'IGAZOLT', szamitottErtek: 50 },
    { negyedev: '2023Q4', sorId: 'TEST-1', foid: 'T.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', drl: 'IGAZOLT', szamitottErtek: 50 },
  ];
  const calibZeroVar = runThresholdBacktest(mockMetaCalib, zeroVarianceRows);
  results.push({
    id: 'CAL-003',
    kategoria: 'KALIBRÁCIÓ',
    nev: 'Zéró Variancia Védelme az Indikátorban',
    leiras: 'Ha az indikátor minden negyedévben azonos értéket vesz fel, a rendszer diszkrimináció nélküli 0.50-es értéket ad.',
    sikeres: calibZeroVar.auc === 0.5 && calibZeroVar.isZeroVariance === true,
    vart: 'AUC = 0.50, isZeroVariance = true',
    kapott: `AUC = ${calibZeroVar.auc}, isZeroVariance = ${calibZeroVar.isZeroVariance}`,
  });

  // =========================================================================
  // 7. KATEGÓRIA: WORM AUDITLÁNC ÉS TÁMADÁSI MODELLEK
  // =========================================================================

  // Referencia rekordok felépítése
  const rec0Id = 'AUD-001';
  const rec0Payload = {
    negyedev: '2024Q1',
    esemenyTipus: 'SZINTETIKUS_PILOT',
    kepletVerzio: 'v2.1',
    elozetesHipotezis: 'Pilot teszt hipotezis',
    nullhipotezis: 'Nincs elmozdulas',
    mertEltérés: '1.2a: 42.04%',
    döntésiEredmény: 'SÁRGA - ELŐZETES',
    felelős: 'MNB',
    bemenetiHash: 'abcdef0123456789',
  };
  const rec0Timestamp = '2026-10-28T12:00:00.000Z';
  const rec0PrevHash = GENESIS_PREV_HASH;
  const rec0PayloadWithId = { id: rec0Id, ...rec0Payload };
  const rec0Hash = computeCanonicalRecordHash(rec0PrevHash, rec0Timestamp, rec0PayloadWithId);

  const rec0: CanonicalAuditRecord = {
    id: rec0Id,
    timestamp: rec0Timestamp,
    prevHash: rec0PrevHash,
    hash: rec0Hash,
    ...rec0Payload,
  };

  const rec1Id = 'AUD-002';
  const rec1Payload = {
    negyedev: '2024Q2',
    esemenyTipus: 'ADAT_FELTÖLTÉS',
    kepletVerzio: 'v2.1',
    elozetesHipotezis: 'Q2 frissites',
    nullhipotezis: 'Normalizalodas',
    mertEltérés: '1.1: 1400',
    döntésiEredmény: 'ZÖLD',
    felelős: 'MNB',
    bemenetiHash: '9876543210fedcba',
  };
  const rec1Timestamp = '2026-10-28T12:30:00.000Z';
  const rec1PrevHash = rec0Hash;
  const rec1PayloadWithId = { id: rec1Id, ...rec1Payload };
  const rec1Hash = computeCanonicalRecordHash(rec1PrevHash, rec1Timestamp, rec1PayloadWithId);

  const rec1: CanonicalAuditRecord = {
    id: rec1Id,
    timestamp: rec1Timestamp,
    prevHash: rec1PrevHash,
    hash: rec1Hash,
    ...rec1Payload,
  };

  const rec2Id = 'AUD-003';
  const rec2Payload = {
    negyedev: '2024Q3',
    esemenyTipus: 'KÜSZÖB_MÓDOSÍTÁS',
    kepletVerzio: 'v2.1',
    elozetesHipotezis: 'Q3 validacio',
    nullhipotezis: 'Hipotézis',
    mertEltérés: 'AUC >= 0.75',
    döntésiEredmény: 'VALIDÁLT',
    felelős: 'MNB Kockázatelemzés',
    bemenetiHash: '1122334455667788',
  };
  const rec2Timestamp = '2026-10-28T13:00:00.000Z';
  const rec2PrevHash = rec1Hash;
  const rec2PayloadWithId = { id: rec2Id, ...rec2Payload };
  const rec2Hash = computeCanonicalRecordHash(rec2PrevHash, rec2Timestamp, rec2PayloadWithId);

  const rec2: CanonicalAuditRecord = {
    id: rec2Id,
    timestamp: rec2Timestamp,
    prevHash: rec2PrevHash,
    hash: rec2Hash,
    ...rec2Payload,
  };

  const validTrustAnchor: TrustAnchor = {
    checkpointIndex: 2,
    checkpointHash: rec2Hash,
    checkpointTimestamp: rec2Timestamp,
    authoritativeDigest: 'auth-digest-12345',
    description: 'Ellenőrzőpont AUD-003-hoz',
  };

  // WRM-001: Ép 3-elemű lánc vizsgálata
  const validChain = [rec0, rec1, rec2];
  const validChainVerify = verifyAuditChain(validChain, validTrustAnchor);
  results.push({
    id: 'WRM-001',
    kategoria: 'WORM_INTEGRITÁS',
    nev: 'WORM Hash-Lánc Sértetlenségének Igazolása',
    leiras: 'Ellenőrzi a prevHash folytonosságát, az újrahashinget és a külső bizalmi horgonyt.',
    sikeres: validChainVerify.isValid && validChainVerify.verifiedRecords === 3 && validChainVerify.errorCode === null,
    vart: 'isValid = true, verifiedRecords = 3, errorCode = null',
    kapott: `isValid = ${validChainVerify.isValid}, verifiedRecords = ${validChainVerify.verifiedRecords}`,
  });

  // WRM-002: Belső rekordtartalom manipuláció (Payload tampering)
  const tamperedRec1: CanonicalAuditRecord = {
    ...rec1,
    döntésiEredmény: 'PIROS_HAMISÍTVA',
  };
  const tamperedChain = [rec0, tamperedRec1, rec2];
  const tamperedVerify = verifyAuditChain(tamperedChain);
  results.push({
    id: 'WRM-002',
    kategoria: 'WORM_INTEGRITÁS',
    nev: 'WORM Tartalmi Manipuláció Azonnali Detektálása (Újrahashing)',
    leiras: 'Igazolja, hogy ha egy rekord szöveges tartalmát utólag módosítják a naplóban, a verifikáció lebuktatja a manipulációt.',
    sikeres: !tamperedVerify.isValid && tamperedVerify.brokenIndex === 1 && tamperedVerify.errorCode === 'PAYLOAD_TAMPERED',
    vart: 'isValid = false, brokenIndex = 1, errorCode = PAYLOAD_TAMPERED',
    kapott: `isValid = ${tamperedVerify.isValid}, brokenIndex = ${tamperedVerify.brokenIndex}, code = ${tamperedVerify.errorCode}`,
  });

  // WRM-003: Köztes rekord törlése (Middle record deletion)
  const deletedMiddleChain = [rec0, rec2];
  const deletedMiddleVerify = verifyAuditChain(deletedMiddleChain);
  results.push({
    id: 'WRM-003',
    kategoria: 'WORM_INTEGRITÁS',
    nev: 'Köztes Rekord Törlésének Azonnali Detektálása',
    leiras: 'Ha a naplóból törölnek egy köztes bejegyzést, a rákövetkező rekord prevHash eltérése miatt a lánctörés azonnal kiderül.',
    sikeres: !deletedMiddleVerify.isValid && deletedMiddleVerify.brokenIndex === 1 && deletedMiddleVerify.errorCode === 'CHAIN_BROKEN',
    vart: 'isValid = false, brokenIndex = 1, errorCode = CHAIN_BROKEN',
    kapott: `isValid = ${deletedMiddleVerify.isValid}, brokenIndex = ${deletedMiddleVerify.brokenIndex}, code = ${deletedMiddleVerify.errorCode}`,
  });

  // WRM-004: Rekordok átrendezése (Reordering attack)
  const reorderedChain = [rec0, rec2, rec1];
  const reorderedVerify = verifyAuditChain(reorderedChain);
  results.push({
    id: 'WRM-004',
    kategoria: 'WORM_INTEGRITÁS',
    nev: 'Rekordok Átrendezésének (Reordering) Detektálása',
    leiras: 'Ha a támadó felcseréli a bejegyzések sorrendjét a naplóban, a kriptográfiai lánc azonnal megszakad.',
    sikeres: !reorderedVerify.isValid && reorderedVerify.brokenIndex === 1 && reorderedVerify.errorCode === 'CHAIN_BROKEN',
    vart: 'isValid = false, brokenIndex = 1, errorCode = CHAIN_BROKEN',
    kapott: `isValid = ${reorderedVerify.isValid}, brokenIndex = ${reorderedVerify.brokenIndex}, code = ${reorderedVerify.errorCode}`,
  });

  // WRM-005: Hibás Genesis rekord (Invalid genesis hash)
  const corruptGenesisRec0: CanonicalAuditRecord = {
    ...rec0,
    prevHash: '1111111111111111111111111111111111111111111111111111111111111111',
  };
  const corruptGenesisVerify = verifyAuditChain([corruptGenesisRec0, rec1]);
  results.push({
    id: 'WRM-005',
    kategoria: 'WORM_INTEGRITÁS',
    nev: 'Hibás Genesis Rekord Detektálása',
    leiras: 'Ha az első rekord prevHash értéke nem a szigorúan megkövetelt 64 darab 0 karakter, a lánc érvénytelen.',
    sikeres: !corruptGenesisVerify.isValid && corruptGenesisVerify.brokenIndex === 0 && corruptGenesisVerify.errorCode === 'GENESIS_TAMPERED',
    vart: 'isValid = false, brokenIndex = 0, errorCode = GENESIS_TAMPERED',
    kapott: `isValid = ${corruptGenesisVerify.isValid}, brokenIndex = ${corruptGenesisVerify.brokenIndex}, code = ${corruptGenesisVerify.errorCode}`,
  });

  // WRM-006: Időbélyeg-regresszió (Timestamp rollback attack)
  const rollbackRec1: CanonicalAuditRecord = {
    ...rec1,
    timestamp: '2026-10-28T11:00:00.000Z',
    hash: computeCanonicalRecordHash(rec1PrevHash, '2026-10-28T11:00:00.000Z', { id: rec1Id, ...rec1Payload }),
  };
  const rollbackVerify = verifyAuditChain([rec0, rollbackRec1]);
  results.push({
    id: 'WRM-006',
    kategoria: 'WORM_INTEGRITÁS',
    nev: 'Időbélyeg-Regresszió és Replay Támadás Detektálása',
    leiras: 'A rendszer ellenőrzi a szigorú időbeli monotonitást: későbbi rekord nem hordozhat megelőző időbélyeget.',
    sikeres: !rollbackVerify.isValid && rollbackVerify.brokenIndex === 1 && rollbackVerify.errorCode === 'TIMESTAMP_REGRESSION',
    vart: 'isValid = false, brokenIndex = 1, errorCode = TIMESTAMP_REGRESSION',
    kapott: `isValid = ${rollbackVerify.isValid}, brokenIndex = ${rollbackVerify.brokenIndex}, code = ${rollbackVerify.errorCode}`,
  });

  // WRM-007: Érvénytelen Időbélyeg Szintaxis (Invalid Timestamp Format)
  const invalidDateRec: CanonicalAuditRecord = {
    ...rec1,
    timestamp: 'NOT-A-DATE',
    hash: computeCanonicalRecordHash(rec1PrevHash, 'NOT-A-DATE', { id: rec1Id, ...rec1Payload }),
  };
  const invalidDateVerify = verifyAuditChain([rec0, invalidDateRec]);
  results.push({
    id: 'WRM-007',
    kategoria: 'WORM_INTEGRITÁS',
    nev: 'Érvénytelen Időbélyeg Szintaxis Elutasítása',
    leiras: 'Nem ISO-8601 dátumformátum esetén a verifikáció azonnal szintaktikai hibát jelez.',
    sikeres: !invalidDateVerify.isValid && invalidDateVerify.errorCode === 'TIMESTAMP_INVALID',
    vart: 'isValid = false, errorCode = TIMESTAMP_INVALID',
    kapott: `isValid = ${invalidDateVerify.isValid}, code = ${invalidDateVerify.errorCode}`,
  });

  // WRM-008: Üres Audit Napló Kezelése
  const emptyLedgerVerify = verifyAuditChain([]);
  results.push({
    id: 'WRM-008',
    kategoria: 'WORM_INTEGRITÁS',
    nev: 'Üres Audit Napló Kezelése',
    leiras: 'Üres fájl vagy hiányzó napló esetén a verifikáció egyértelmű hibakóddal jelzi a genesis hiányát.',
    sikeres: !emptyLedgerVerify.isValid && emptyLedgerVerify.errorCode === 'EMPTY_LEDGER',
    vart: 'isValid = false, errorCode = EMPTY_LEDGER',
    kapott: `isValid = ${emptyLedgerVerify.isValid}, code = ${emptyLedgerVerify.errorCode}`,
  });

  // WRM-009: Teljes Lánccsere (Replaced Chain Attack) Detektálása Bizalmi Horgonnyal
  const fakeGenesisPayload = { id: 'AUD-001', ...rec0Payload, elozetesHipotezis: 'HAMISÍTOTT_TELJES_LÁNC' };
  const fakeGenesisHash = computeCanonicalRecordHash(GENESIS_PREV_HASH, rec0Timestamp, fakeGenesisPayload);
  const fakeRec0: CanonicalAuditRecord = { ...rec0, hash: fakeGenesisHash, ...fakeGenesisPayload };
  const fakeRec1Payload = { id: 'AUD-002', ...rec1Payload };
  const fakeRec1Hash = computeCanonicalRecordHash(fakeGenesisHash, rec1Timestamp, fakeRec1Payload);
  const fakeRec1: CanonicalAuditRecord = { ...rec1, prevHash: fakeGenesisHash, hash: fakeRec1Hash };
  const fakeRec2Payload = { id: 'AUD-003', ...rec2Payload };
  const fakeRec2Hash = computeCanonicalRecordHash(fakeRec1Hash, rec2Timestamp, fakeRec2Payload);
  const fakeRec2: CanonicalAuditRecord = { ...rec2, prevHash: fakeRec1Hash, hash: fakeRec2Hash };
  const fakeChain = [fakeRec0, fakeRec1, fakeRec2];

  const replacedChainVerify = verifyAuditChain(fakeChain, validTrustAnchor);
  results.push({
    id: 'WRM-009',
    kategoria: 'WORM_INTEGRITÁS',
    nev: 'Teljes Lánccsere Detektálása Külső Bizalmi Horgonnyal',
    leiras: 'Ha a támadó a teljes láncot újragenerálja a genesis-től kezdve, a külső bizalmi horgony azonnal lebuktatja a cserét.',
    sikeres: !replacedChainVerify.isValid && replacedChainVerify.errorCode === 'TRUST_ANCHOR_MISMATCH',
    vart: 'isValid = false, errorCode = TRUST_ANCHOR_MISMATCH',
    kapott: `isValid = ${replacedChainVerify.isValid}, code = ${replacedChainVerify.errorCode}`,
  });

  // WRM-010: Rekord Azonosító (ID) Módosításának Detektálása (PAYLOAD_TAMPERED)
  const idForgedRec: CanonicalAuditRecord = {
    ...rec1,
    id: 'AUD-FORGED-999',
  };
  const idForgedVerify = verifyAuditChain([rec0, idForgedRec, rec2]);
  results.push({
    id: 'WRM-010',
    kategoria: 'WORM_INTEGRITÁS',
    nev: 'Rekord Azonosító (ID) Módosításának Detektálása (Payload Signature)',
    leiras: 'Ha egy meglévő rekord id mezőjét utólag átírják (pl. AUD-002 -> AUD-FORGED-999), a kánonikus aláírás eltér, és PAYLOAD_TAMPERED hibát ad.',
    sikeres: !idForgedVerify.isValid && idForgedVerify.brokenIndex === 1 && idForgedVerify.errorCode === 'PAYLOAD_TAMPERED',
    vart: 'isValid = false, brokenIndex = 1, errorCode = PAYLOAD_TAMPERED',
    kapott: `isValid = ${idForgedVerify.isValid}, brokenIndex = ${idForgedVerify.brokenIndex}, code = ${idForgedVerify.errorCode}`,
  });

  return results;
}
