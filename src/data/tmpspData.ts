/**
 * TMPSP v2.1 Törzsadatok és 16 Negyedéves Adatbázis (2023Q1–2026Q4)
 * 11 Főindikátor és 15 Mérési Sor Relációs Rendszere
 */

import { AuditRecord, IndicatorMeta, MainIndicatorMeta, QuarterDataRow } from '../engine/types';

export const ALL_QUARTERS = [
  '2023Q1', '2023Q2', '2023Q3', '2023Q4',
  '2024Q1', '2024Q2', '2024Q3', '2024Q4',
  '2025Q1', '2025Q2', '2025Q3', '2025Q4',
  '2026Q1', '2026Q2', '2026Q3', '2026Q4'
];

export const MAIN_INDICATORS: MainIndicatorMeta[] = [
  { foid: '1.1', modulId: 'M1', nev: 'Hitelkoncentráció (HHI)', fokusz: 'Jövedelmi decilisek szerinti koncentráció', meresiSorIds: ['1.1'] },
  { foid: '1.2', modulId: 'M1', nev: 'Hitelhozzáférési és Volumenarány', fokusz: '550k–800k sáv hozzáférése és adósságmegvágás', meresiSorIds: ['1.2a', '1.2b'] },
  { foid: '1.3', modulId: 'M1', nev: 'Kiszorulási Ráta JTM Okból', fokusz: 'JTM miatti dokumentált elutasítások aránya', meresiSorIds: ['1.3'] },
  { foid: '1.4', modulId: 'M1', nev: 'JTM > 40% Volumensúly', fokusz: 'Kockázatos adósságfék-kihasználtság volumensúlya', meresiSorIds: ['1.4'] },
  { foid: '2.1', modulId: 'M2', nev: 'Days on Market (DOM) Olló', fokusz: 'Használt középkategória vs. új prémium forgási sebesség', meresiSorIds: ['2.1'] },
  { foid: '2.2', modulId: 'M2', nev: 'Alku-Rés (Hirdetési vs. NAV Ár)', fokusz: 'Tranzakciós ár és kínálati ár szétválása', meresiSorIds: ['2.2'] },
  { foid: '2.3', modulId: 'M2', nev: 'LTV-Puffer Erózió', fokusz: 'Fedezeti puffer a lassan forgó szegmensekben', meresiSorIds: ['2.3'] },
  { foid: '2.4', modulId: 'M2', nev: 'Kényszerértékesítési LGD-Shift', fokusz: 'Veszteségráta-ugrás kényszerlikvidációkor (Bypass)', meresiSorIds: ['2.4'] },
  { foid: '3.1', modulId: 'M3', nev: 'Lakhatási Megterheltség (HCOR és MTR)', fokusz: 'Alsó 3 decilis lakhatási túlterheltsége és medián ráta', meresiSorIds: ['3.1a', '3.1b'] },
  { foid: '3.2', modulId: 'M3', nev: 'Fiatalok Vándorlási Egyenlege (18–41)', fokusz: 'Regionális elvándorlás lakhatási megfizethetőség miatt', meresiSorIds: ['3.2'] },
  { foid: '3.3', modulId: 'M3', nev: 'Építőipari Csődráta', fokusz: 'Kínálati lánc stabilitása és felszámolási ráta', meresiSorIds: ['3.3'] },
  { foid: '4.1', modulId: 'M4', nev: 'Állami Garanciaállomány és Lehívás', fokusz: 'Költségvetési kitettség GDP-arányosan és várható veszteség', meresiSorIds: ['4.1'] },
  { foid: '4.2', modulId: 'M4', nev: 'Lakástámogatási Megtérülés', fokusz: 'Költségvetési transzferek és generált adó aránya', meresiSorIds: ['4.2'] },
];

export const MEASUREMENT_SERIES_META: IndicatorMeta[] = [
  // Modul 1
  {
    sorId: '1.1',
    foid: '1.1',
    modulId: 'M1',
    nev: 'HHI jövedelmi decilisek szerint',
    kepletLeiras: 'HHI = Σ s_i^2 (decilisenkénti részesedések négyzetösszege)',
    szamlaloNev: 'Számított HHI érték',
    nevezoNev: 'Folyósított új volumen (Mrd Ft)',
    egyseg: '0-1 skála',
    alapertelmezettDRL: 'IGAZOLT',
    adatgazda: 'MNB HITREG',
    frissitesiGyakorisag: 'T+60 nap',
    jeloltKuszob: '> 0,22 és emelkedő trend',
    kuszobTipus: '>',
    kuszobErtek: 0.22,
    kuszobStatusz: 'JELÖLT',
    cafolatiFeltetel: 'Ha a koncentráció a magasabb jövedelműek felé kizárólag szezonális hatás',
    felelos: 'MNB Makroprudenciális Főosztály',
  },
  {
    sorId: '1.2a',
    foid: '1.2',
    modulId: 'M1',
    nev: 'Hozzáférési ráta (egyedi adós, 550k–800k)',
    kepletLeiras: 'Folyósított egyedi adósok / Összes KHR igénylő (550k–800k)',
    szamlaloNev: 'Folyósított egyedi adósok (fő)',
    nevezoNev: 'KHR hivatalos igénylők (fő)',
    egyseg: '%',
    alapertelmezettDRL: 'PROXY',
    adatgazda: 'MNB HITREG + KHR',
    frissitesiGyakorisag: 'T+60 nap',
    jeloltKuszob: '< 45% ÉS YoY -10pp',
    kuszobTipus: '<',
    kuszobErtek: 45,
    kuszobStatusz: 'JELÖLT',
    perzisztenciaFeltetel: 'YoY -10pp csökkenés',
    cafolatiFeltetel: 'Ha az igénylők száma nőtt meg hirtelen keresletélénkülés miatt',
    felelos: 'MNB Hitelregiszter',
  },
  {
    sorId: '1.2b',
    foid: '1.2',
    modulId: 'M1',
    nev: 'Volumen jóváhagyási arány (550k–800k)',
    kepletLeiras: 'Folyósított volumen / Igényelt volumen (adósságmegvágás kimutatása)',
    szamlaloNev: 'Folyósított volumen (Mrd Ft)',
    nevezoNev: 'Igényelt volumen (Mrd Ft)',
    egyseg: '%',
    alapertelmezettDRL: 'IGAZOLT',
    adatgazda: 'MNB HITREG',
    frissitesiGyakorisag: 'T+60 nap',
    jeloltKuszob: '< 70%',
    kuszobTipus: '<',
    kuszobErtek: 70,
    kuszobStatusz: 'STATISZTIKAILAG_VALIDÁLT',
    cafolatiFeltetel: 'Ha a kérelmezők maguk kértek kevesebb hitelt jóváhagyás után',
    felelos: 'MNB Hitelregiszter',
  },
  {
    sorId: '1.3',
    foid: '1.3',
    modulId: 'M1',
    nev: 'Kiszorulási ráta JTM okból (550k–800k)',
    kepletLeiras: 'JTM miatti dokumentált elutasítások / Összes elutasítás',
    szamlaloNev: 'JTM miatti elutasítások (db)',
    nevezoNev: 'Összes dokumentált elutasítás (db)',
    egyseg: '%',
    alapertelmezettDRL: 'HOZZÁFÉRÉS_KÉRDÉSES',
    adatgazda: 'Banki MNB kérdőív + KHR',
    frissitesiGyakorisag: 'T+60 nap',
    jeloltKuszob: '> 50% (2Q perzisztens)',
    kuszobTipus: '>',
    kuszobErtek: 50,
    kuszobStatusz: 'JELÖLT',
    perzisztenciaFeltetel: '2 egymást követő negyedév',
    cafolatiFeltetel: 'Banki belső elutasítási kódok eltérő értelmezése',
    felelos: 'Banki Adatszolgáltatási Igazgatóság',
  },
  {
    sorId: '1.4',
    foid: '1.4',
    modulId: 'M1',
    nev: '40% feletti JTM súlya a folyósításban',
    kepletLeiras: 'JTM>40% folyósítási volumen / Teljes új lakáshitel volumen',
    szamlaloNev: 'JTM > 40% folyósítás (Mrd Ft)',
    nevezoNev: 'Teljes új folyósítás (Mrd Ft)',
    egyseg: '%',
    alapertelmezettDRL: 'IGAZOLT',
    adatgazda: 'MNB HITREG',
    frissitesiGyakorisag: 'T+60 nap',
    jeloltKuszob: '> 35% és 3 negyedéven át nő',
    kuszobTipus: '>',
    kuszobErtek: 35,
    kuszobStatusz: 'STATISZTIKAILAG_VALIDÁLT',
    cafolatiFeltetel: 'Kamatcsökkenésből fakadó törlesztőrészlet-csökkenés',
    felelos: 'MNB Makroprudenciális Főosztály',
  },
  // Modul 2
  {
    sorId: '2.1',
    foid: '2.1',
    modulId: 'M2',
    nev: 'DOM-arány (Használt Közép / Új Prémium)',
    kepletLeiras: 'Medián DOM (használt közép) / Medián DOM (új prémium)',
    szamlaloNev: 'Használt közép medián DOM (nap)',
    nevezoNev: 'Új prémium medián DOM (nap)',
    egyseg: 'arány',
    alapertelmezettDRL: 'PROXY',
    adatgazda: 'Ingatlan.com + MNB scraper',
    frissitesiGyakorisag: 'Havi/Negyedéves',
    jeloltKuszob: '> 2,0',
    kuszobTipus: '>',
    kuszobErtek: 2.0,
    kuszobStatusz: 'JELÖLT',
    cafolatiFeltetel: 'Prémium szegmens forgalomcsökkenése torzítja a nevezőt',
    felelos: 'MNB Lakáspiaci Elemzések',
  },
  {
    sorId: '2.2',
    foid: '2.2',
    modulId: 'M2',
    nev: 'Alku-rés (Hirdetési vs. NAV tranzakciós ár)',
    kepletLeiras: '(Hirdetési medián m² ár - NAV tényár) / Hirdetési m² ár',
    szamlaloNev: 'Hirdetési ár - Tényár (ezer Ft/m²)',
    nevezoNev: 'Hirdetési ár (ezer Ft/m²)',
    egyseg: '%',
    alapertelmezettDRL: 'PROXY',
    adatgazda: 'NAV illetékadatbázis + hirdetési aggregáció',
    frissitesiGyakorisag: 'T+90 nap',
    jeloltKuszob: '> 12% és emelkedő 2 negyedévig',
    kuszobTipus: '>',
    kuszobErtek: 12,
    kuszobStatusz: 'JELÖLT',
    cafolatiFeltetel: 'Illetékfizetési késedelem miatti adatcsúszás',
    felelos: 'NAV / MNB',
  },
  {
    sorId: '2.3',
    foid: '2.3',
    modulId: 'M2',
    nev: 'LTV-puffer erózió lassan forgóknál',
    kepletLeiras: 'Fedezeti puffer (1 - LTV) a DOM>150 napos lakásoknál',
    szamlaloNev: 'Fennmaradó saját tőke puffer (Mrd Ft)',
    nevezoNev: 'Lassan forgó zálogtárgyak értéke (Mrd Ft)',
    egyseg: '%',
    alapertelmezettDRL: 'IGAZOLT',
    adatgazda: 'Banki értékbecslési regiszter + HITREG',
    frissitesiGyakorisag: 'T+60 nap',
    jeloltKuszob: '< 20% és lassú lakások súlya >30%',
    kuszobTipus: '<',
    kuszobErtek: 20,
    kuszobStatusz: 'STATISZTIKAILAG_VALIDÁLT',
    cafolatiFeltetel: 'Értékbecslői konzervativizmus átmeneti megugrása',
    felelos: 'Bankfelügyelet',
  },
  {
    sorId: '2.4',
    foid: '2.4',
    modulId: 'M2',
    nev: 'Kényszerértékesítési LGD-shift (Bypass)',
    kepletLeiras: 'LGD_kényszer - LGD_önkéntes (százalékpont eltérés)',
    szamlaloNev: 'Kényszerértékesítési realizált LGD (%)',
    nevezoNev: 'Önkéntes értékesítési LGD (%)',
    egyseg: 'százalékpont',
    alapertelmezettDRL: 'HOZZÁFÉRÉS_KÉRDÉSES',
    adatgazda: 'Banki követeléskezelési és végrehajtási adatok',
    frissitesiGyakorisag: 'Negyedéves',
    jeloltKuszob: '> 20 pp (min. 30 esetszám felett)',
    kuszobTipus: '>',
    kuszobErtek: 20,
    kuszobStatusz: 'JELÖLT',
    cafolatiFeltetel: 'Esetszám 30 alatt van vagy egyedi nagyingatlan torzít',
    felelos: 'MNB Behajtási és Felügyeleti Főosztály',
  },
  // Modul 3
  {
    sorId: '3.1a',
    foid: '3.1',
    modulId: 'M3',
    nev: 'HCOR lakhatási túlterhelt népesség aránya',
    kepletLeiras: 'Lakhatási költség / nettó jöv. > 40% háztartások / Összes háztartás (alsó 3 decilis)',
    szamlaloNev: 'Túlterhelt háztartások (ezer háztartás)',
    nevezoNev: 'Alsó 3 decilis összes háztartása (ezer)',
    egyseg: '%',
    alapertelmezettDRL: 'PROXY',
    adatgazda: 'KSH SILC + MNB mikroszimuláció',
    frissitesiGyakorisag: 'Éves/Negyedéves interpoláció',
    jeloltKuszob: '> 30% az alsó 3 decilisben',
    kuszobTipus: '>',
    kuszobErtek: 30,
    kuszobStatusz: 'JELÖLT',
    cafolatiFeltetel: 'Rezsicsökkentési kompenzáció átmeneti felülírása',
    felelos: 'KSH / MNB Elemzés',
  },
  {
    sorId: '3.1b',
    foid: '3.1',
    modulId: 'M3',
    nev: 'Medián Terhelési Ráta (MTR egyéni medián)',
    kepletLeiras: 'Medián(Havi lakhatási kiadás / Havi nettó háztartási jövedelem)',
    szamlaloNev: 'Medián lakhatási kiadás (ezer Ft)',
    nevezoNev: 'Medián nettó jövedelem (ezer Ft)',
    egyseg: '%',
    alapertelmezettDRL: 'PROXY',
    adatgazda: 'KSH SILC / MNB mikromodell',
    frissitesiGyakorisag: 'Éves/Negyedéves',
    jeloltKuszob: '> 35%',
    kuszobTipus: '>',
    kuszobErtek: 35,
    kuszobStatusz: 'JELÖLT',
    cafolatiFeltetel: 'Egyéni lakhatási támogatások kiterjesztése',
    felelos: 'KSH / MNB',
  },
  {
    sorId: '3.2',
    foid: '3.2',
    modulId: 'M3',
    nev: 'Fiatalok regionális vándorlási egyenlege (18–41)',
    kepletLeiras: 'Nettó belső vándorlás az érintett régiókban / 18–41 éves népesség (‰)',
    szamlaloNev: 'Nettó vándorlás (fő)',
    nevezoNev: '18-41 éves népesség (ezer fő)',
    egyseg: '‰',
    alapertelmezettDRL: 'IGAZOLT',
    adatgazda: 'KSH Népmozgalom + BM lakcímnyilvántartó',
    frissitesiGyakorisag: 'Negyedéves',
    jeloltKuszob: '< -3,0 ‰ legalább 2 régióban',
    kuszobTipus: '<',
    kuszobErtek: -3.0,
    kuszobStatusz: 'STATISZTIKAILAG_VALIDÁLT',
    cafolatiFeltetel: 'Egyetemi félévkezdés szezonális bejelentkezési hulláma',
    felelos: 'KSH Népességtudomány',
  },
  {
    sorId: '3.3',
    foid: '3.3',
    modulId: 'M3',
    nev: 'Építőipari csődráta és felszámolások',
    kepletLeiras: 'Felszámolt építőipari KKV-k / Összes aktív építőipari KKV',
    szamlaloNev: 'Felszámolt KKV-k (db)',
    nevezoNev: 'Összes aktív építőipari KKV (db)',
    egyseg: '%',
    alapertelmezettDRL: 'IGAZOLT',
    adatgazda: 'KSH + Cégbíróság / Opten',
    frissitesiGyakorisag: 'Negyedéves',
    jeloltKuszob: '> 5,0%',
    kuszobTipus: '>',
    kuszobErtek: 5.0,
    kuszobStatusz: 'STATISZTIKAILAG_VALIDÁLT',
    cafolatiFeltetel: 'Kényszertörlések jogszabályi adminisztrációs ugrása',
    felelos: 'KSH / Gazdaságfejlesztési Minisztérium',
  },
  // Modul 4
  {
    sorId: '4.1',
    foid: '4.1',
    modulId: 'M4',
    nev: 'Állami garanciaállomány a GDP arányában',
    kepletLeiras: 'Garantált lakossági hiteltőke / Éves nominális GDP',
    szamlaloNev: 'Garantált állomány (Mrd Ft)',
    nevezoNev: 'Nominális GDP (Mrd Ft)',
    egyseg: '%',
    alapertelmezettDRL: 'IGAZOLT',
    adatgazda: 'PM ÁKK + Garantiqa + MNB',
    frissitesiGyakorisag: 'Negyedéves',
    jeloltKuszob: '> 2,5%',
    kuszobTipus: '>',
    kuszobErtek: 2.5,
    kuszobStatusz: 'STATISZTIKAILAG_VALIDÁLT',
    cafolatiFeltetel: 'GDP növekedésének nominális felgyorsulása',
    felelos: 'Pénzügyminisztérium ÁKK',
  },
  {
    sorId: '4.2',
    foid: '4.2',
    modulId: 'M4',
    nev: 'Lakástámogatási fiskális megtérülési arány',
    kepletLeiras: 'Generált adótöbblet (ÁFA + illeték) / Költségvetési támogatási kiadás',
    szamlaloNev: 'Generált adótöbblet (Mrd Ft)',
    nevezoNev: 'Költségvetési támogatási kiadás (Mrd Ft)',
    egyseg: 'arány',
    alapertelmezettDRL: 'PROXY',
    adatgazda: 'Pénzügyminisztérium + NAV zárszámadás',
    frissitesiGyakorisag: 'Negyedéves',
    jeloltKuszob: '< 0,5',
    kuszobTipus: '<',
    kuszobErtek: 0.5,
    kuszobStatusz: 'JELÖLT',
    cafolatiFeltetel: 'Családtámogatási kifizetések technikai időbeli elcsúszása',
    felelos: 'Pénzügyminisztérium Költségvetési Főosztály',
  },
];

/**
 * 16 Negyedéves Teljes Adatbázis (2023Q1–2026Q4)
 */
export const INITIAL_QUARTERLY_DATA: QuarterDataRow[] = [
  // 2023Q1 (Történeti bázis)
  { negyedev: '2023Q1', sorId: '1.1', foid: '1.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 0.185, nevezoErtek: 180, drl: 'IGAZOLT' },
  { negyedev: '2023Q1', sorId: '1.2a', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 5120, nevezoErtek: 9800, drl: 'PROXY' }, // 52.24%
  { negyedev: '2023Q1', sorId: '1.2b', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 145, nevezoErtek: 185, drl: 'IGAZOLT' }, // 78.38%
  { negyedev: '2023Q1', sorId: '1.3', foid: '1.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1650, nevezoErtek: 4400, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 37.5%
  { negyedev: '2023Q1', sorId: '1.4', foid: '1.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 42, nevezoErtek: 180, drl: 'IGAZOLT' }, // 23.33%
  { negyedev: '2023Q1', sorId: '2.1', foid: '2.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 98, nevezoErtek: 65, drl: 'PROXY' }, // 1.508
  { negyedev: '2023Q1', sorId: '2.2', foid: '2.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 65, nevezoErtek: 920, drl: 'PROXY' }, // 7.07%
  { negyedev: '2023Q1', sorId: '2.3', foid: '2.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 48, nevezoErtek: 190, drl: 'IGAZOLT' }, // 25.26%
  { negyedev: '2023Q1', sorId: '2.4', foid: '2.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 32, nevezoErtek: 22, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 10pp
  { negyedev: '2023Q1', sorId: '3.1a', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 132, nevezoErtek: 580, drl: 'PROXY' }, // 22.76%
  { negyedev: '2023Q1', sorId: '3.1b', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 98, nevezoErtek: 320, drl: 'PROXY' }, // 30.63%
  { negyedev: '2023Q1', sorId: '3.2', foid: '3.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: -1100, nevezoErtek: 820, drl: 'IGAZOLT' }, // -1.34‰
  { negyedev: '2023Q1', sorId: '3.3', foid: '3.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 980, nevezoErtek: 29800, drl: 'IGAZOLT' }, // 3.29%
  { negyedev: '2023Q1', sorId: '4.1', foid: '4.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1350, nevezoErtek: 75000, drl: 'IGAZOLT' }, // 1.80%
  { negyedev: '2023Q1', sorId: '4.2', foid: '4.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 165, nevezoErtek: 195, drl: 'PROXY' }, // 0.846

  // 2023Q2 (Stresszes negyedév)
  { negyedev: '2023Q2', sorId: '1.1', foid: '1.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 0.228, nevezoErtek: 140, drl: 'IGAZOLT' },
  { negyedev: '2023Q2', sorId: '1.2a', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 4100, nevezoErtek: 9900, drl: 'PROXY' }, // 41.41%
  { negyedev: '2023Q2', sorId: '1.2b', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 102, nevezoErtek: 152, drl: 'IGAZOLT' }, // 67.11%
  { negyedev: '2023Q2', sorId: '1.3', foid: '1.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 2600, nevezoErtek: 4800, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 54.17%
  { negyedev: '2023Q2', sorId: '1.4', foid: '1.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 51, nevezoErtek: 140, drl: 'IGAZOLT' }, // 36.43%
  { negyedev: '2023Q2', sorId: '2.1', foid: '2.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 135, nevezoErtek: 62, drl: 'PROXY' }, // 2.177
  { negyedev: '2023Q2', sorId: '2.2', foid: '2.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 115, nevezoErtek: 910, drl: 'PROXY' }, // 12.64%
  { negyedev: '2023Q2', sorId: '2.3', foid: '2.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 36, nevezoErtek: 195, drl: 'IGAZOLT' }, // 18.46%
  { negyedev: '2023Q2', sorId: '2.4', foid: '2.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 41, nevezoErtek: 23, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 18pp
  { negyedev: '2023Q2', sorId: '3.1a', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 185, nevezoErtek: 585, drl: 'PROXY' }, // 31.62%
  { negyedev: '2023Q2', sorId: '3.1b', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 122, nevezoErtek: 325, drl: 'PROXY' }, // 37.54%
  { negyedev: '2023Q2', sorId: '3.2', foid: '3.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: -2600, nevezoErtek: 820, drl: 'IGAZOLT' }, // -3.17‰
  { negyedev: '2023Q2', sorId: '3.3', foid: '3.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1590, nevezoErtek: 29600, drl: 'IGAZOLT' }, // 5.37%
  { negyedev: '2023Q2', sorId: '4.1', foid: '4.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1420, nevezoErtek: 75500, drl: 'IGAZOLT' }, // 1.88%
  { negyedev: '2023Q2', sorId: '4.2', foid: '4.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 92, nevezoErtek: 198, drl: 'PROXY' }, // 0.465

  // 2023Q3 (Stresszes negyedév)
  { negyedev: '2023Q3', sorId: '1.1', foid: '1.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 0.231, nevezoErtek: 135, drl: 'IGAZOLT' },
  { negyedev: '2023Q3', sorId: '1.2a', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 4050, nevezoErtek: 9950, drl: 'PROXY' }, // 40.70%
  { negyedev: '2023Q3', sorId: '1.2b', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 96, nevezoErtek: 148, drl: 'IGAZOLT' }, // 64.86%
  { negyedev: '2023Q3', sorId: '1.3', foid: '1.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 2720, nevezoErtek: 4900, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 55.51%
  { negyedev: '2023Q3', sorId: '1.4', foid: '1.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 53, nevezoErtek: 135, drl: 'IGAZOLT' }, // 39.26%
  { negyedev: '2023Q3', sorId: '2.1', foid: '2.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 140, nevezoErtek: 64, drl: 'PROXY' }, // 2.188
  { negyedev: '2023Q3', sorId: '2.2', foid: '2.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 121, nevezoErtek: 905, drl: 'PROXY' }, // 13.37%
  { negyedev: '2023Q3', sorId: '2.3', foid: '2.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 34, nevezoErtek: 198, drl: 'IGAZOLT' }, // 17.17%
  { negyedev: '2023Q3', sorId: '2.4', foid: '2.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 44, nevezoErtek: 24, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 20pp
  { negyedev: '2023Q3', sorId: '3.1a', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 188, nevezoErtek: 588, drl: 'PROXY' }, // 31.97%
  { negyedev: '2023Q3', sorId: '3.1b', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 125, nevezoErtek: 330, drl: 'PROXY' }, // 37.88%
  { negyedev: '2023Q3', sorId: '3.2', foid: '3.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: -2750, nevezoErtek: 820, drl: 'IGAZOLT' }, // -3.35‰
  { negyedev: '2023Q3', sorId: '3.3', foid: '3.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1620, nevezoErtek: 29500, drl: 'IGAZOLT' }, // 5.49%
  { negyedev: '2023Q3', sorId: '4.1', foid: '4.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1460, nevezoErtek: 76000, drl: 'IGAZOLT' }, // 1.92%
  { negyedev: '2023Q3', sorId: '4.2', foid: '4.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 89, nevezoErtek: 202, drl: 'PROXY' }, // 0.441

  // 2023Q4
  { negyedev: '2023Q4', sorId: '1.1', foid: '1.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 0.198, nevezoErtek: 160, drl: 'IGAZOLT' },
  { negyedev: '2023Q4', sorId: '1.2a', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 4500, nevezoErtek: 9750, drl: 'PROXY' }, // 46.15%
  { negyedev: '2023Q4', sorId: '1.2b', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 122, nevezoErtek: 168, drl: 'IGAZOLT' }, // 72.62%
  { negyedev: '2023Q4', sorId: '1.3', foid: '1.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 2150, nevezoErtek: 4700, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 45.74%
  { negyedev: '2023Q4', sorId: '1.4', foid: '1.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 46, nevezoErtek: 160, drl: 'IGAZOLT' }, // 28.75%
  { negyedev: '2023Q4', sorId: '2.1', foid: '2.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 112, nevezoErtek: 66, drl: 'PROXY' }, // 1.697
  { negyedev: '2023Q4', sorId: '2.2', foid: '2.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 85, nevezoErtek: 930, drl: 'PROXY' }, // 9.14%
  { negyedev: '2023Q4', sorId: '2.3', foid: '2.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 44, nevezoErtek: 205, drl: 'IGAZOLT' }, // 21.46%
  { negyedev: '2023Q4', sorId: '2.4', foid: '2.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 35, nevezoErtek: 22, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 13pp
  { negyedev: '2023Q4', sorId: '3.1a', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 155, nevezoErtek: 588, drl: 'PROXY' }, // 26.36%
  { negyedev: '2023Q4', sorId: '3.1b', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 110, nevezoErtek: 335, drl: 'PROXY' }, // 32.84%
  { negyedev: '2023Q4', sorId: '3.2', foid: '3.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: -1600, nevezoErtek: 820, drl: 'IGAZOLT' }, // -1.95‰
  { negyedev: '2023Q4', sorId: '3.3', foid: '3.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1250, nevezoErtek: 29550, drl: 'IGAZOLT' }, // 4.23%
  { negyedev: '2023Q4', sorId: '4.1', foid: '4.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1490, nevezoErtek: 77500, drl: 'IGAZOLT' }, // 1.92%
  { negyedev: '2023Q4', sorId: '4.2', foid: '4.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 145, nevezoErtek: 200, drl: 'PROXY' }, // 0.725

  // 2024Q1 (PILOT SZINTETIKUS ADATSOR - pontos számlálókkal és nevezőkkel!)
  { negyedev: '2024Q1', sorId: '1.1', foid: '1.1', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: 0.205, nevezoErtek: 225, drl: 'IGAZOLT' },
  { negyedev: '2024Q1', sorId: '1.2a', foid: '1.2', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: 4120, nevezoErtek: 9800, drl: 'PROXY' }, // 42.04%
  { negyedev: '2024Q1', sorId: '1.2b', foid: '1.2', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: 148, nevezoErtek: 195, drl: 'IGAZOLT' }, // 75.90%
  { negyedev: '2024Q1', sorId: '1.3', foid: '1.3', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: 2450, nevezoErtek: 4600, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 53.26%
  { negyedev: '2024Q1', sorId: '1.4', foid: '1.4', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: 78, nevezoErtek: 225, drl: 'IGAZOLT' }, // 34.67%
  { negyedev: '2024Q1', sorId: '2.1', foid: '2.1', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: 142, nevezoErtek: 68, drl: 'PROXY' }, // 2.088
  { negyedev: '2024Q1', sorId: '2.2', foid: '2.2', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: 8.4, nevezoErtek: 95.0, drl: 'PROXY' }, // 8.84%
  { negyedev: '2024Q1', sorId: '2.3', foid: '2.3', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: 52, nevezoErtek: 220, drl: 'IGAZOLT' }, // 23.64%
  { negyedev: '2024Q1', sorId: '2.4', foid: '2.4', eredet: 'SZINTETIKUS_PILOT_2024Q1', drl: 'NEM_ELÉRHETŐ' }, // ADATHIÁNY!
  { negyedev: '2024Q1', sorId: '3.1a', foid: '3.1', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: 165, nevezoErtek: 590, drl: 'PROXY' }, // 27.97%
  { negyedev: '2024Q1', sorId: '3.1b', foid: '3.1', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: 118, nevezoErtek: 340, drl: 'PROXY' }, // 34.71%
  { negyedev: '2024Q1', sorId: '3.2', foid: '3.2', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: -1450, nevezoErtek: 820, drl: 'IGAZOLT' }, // -1.77‰
  { negyedev: '2024Q1', sorId: '3.3', foid: '3.3', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: 1420, nevezoErtek: 29500, drl: 'IGAZOLT' }, // 4.81%
  { negyedev: '2024Q1', sorId: '4.1', foid: '4.1', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: 1540, nevezoErtek: 78500, drl: 'IGAZOLT' }, // 1.96%
  { negyedev: '2024Q1', sorId: '4.2', foid: '4.2', eredet: 'SZINTETIKUS_PILOT_2024Q1', szamlaloErtek: 142, nevezoErtek: 198, drl: 'PROXY' }, // 0.717

  // 2024Q2
  { negyedev: '2024Q2', sorId: '1.1', foid: '1.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 0.199, nevezoErtek: 235, drl: 'IGAZOLT' },
  { negyedev: '2024Q2', sorId: '1.2a', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 4350, nevezoErtek: 9700, drl: 'PROXY' }, // 44.85%
  { negyedev: '2024Q2', sorId: '1.2b', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 175, nevezoErtek: 220, drl: 'IGAZOLT' }, // 79.55%
  { negyedev: '2024Q2', sorId: '1.3', foid: '1.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 2180, nevezoErtek: 4500, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 48.44%
  { negyedev: '2024Q2', sorId: '1.4', foid: '1.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 76, nevezoErtek: 235, drl: 'IGAZOLT' }, // 32.34%
  { negyedev: '2024Q2', sorId: '2.1', foid: '2.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 125, nevezoErtek: 70, drl: 'PROXY' }, // 1.786
  { negyedev: '2024Q2', sorId: '2.2', foid: '2.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 7.9, nevezoErtek: 96.0, drl: 'PROXY' }, // 8.23%
  { negyedev: '2024Q2', sorId: '2.3', foid: '2.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 55, nevezoErtek: 225, drl: 'IGAZOLT' }, // 24.44%
  { negyedev: '2024Q2', sorId: '2.4', foid: '2.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 31, nevezoErtek: 22, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 9pp
  { negyedev: '2024Q2', sorId: '3.1a', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 160, nevezoErtek: 592, drl: 'PROXY' }, // 27.03%
  { negyedev: '2024Q2', sorId: '3.1b', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 115, nevezoErtek: 345, drl: 'PROXY' }, // 33.33%
  { negyedev: '2024Q2', sorId: '3.2', foid: '3.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: -1380, nevezoErtek: 820, drl: 'IGAZOLT' }, // -1.68‰
  { negyedev: '2024Q2', sorId: '3.3', foid: '3.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1350, nevezoErtek: 29520, drl: 'IGAZOLT' }, // 4.57%
  { negyedev: '2024Q2', sorId: '4.1', foid: '4.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1560, nevezoErtek: 79500, drl: 'IGAZOLT' }, // 1.96%
  { negyedev: '2024Q2', sorId: '4.2', foid: '4.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 155, nevezoErtek: 195, drl: 'PROXY' }, // 0.795

  // 2024Q3
  { negyedev: '2024Q3', sorId: '1.1', foid: '1.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 0.195, nevezoErtek: 240, drl: 'IGAZOLT' },
  { negyedev: '2024Q3', sorId: '1.2a', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 4420, nevezoErtek: 9650, drl: 'PROXY' }, // 45.80%
  { negyedev: '2024Q3', sorId: '1.2b', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 188, nevezoErtek: 232, drl: 'IGAZOLT' }, // 81.03%
  { negyedev: '2024Q3', sorId: '1.3', foid: '1.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1980, nevezoErtek: 4450, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 44.49%
  { negyedev: '2024Q3', sorId: '1.4', foid: '1.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 74, nevezoErtek: 240, drl: 'IGAZOLT' }, // 30.83%
  { negyedev: '2024Q3', sorId: '2.1', foid: '2.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 118, nevezoErtek: 72, drl: 'PROXY' }, // 1.639
  { negyedev: '2024Q3', sorId: '2.2', foid: '2.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 7.2, nevezoErtek: 97.5, drl: 'PROXY' }, // 7.38%
  { negyedev: '2024Q3', sorId: '2.3', foid: '2.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 58, nevezoErtek: 230, drl: 'IGAZOLT' }, // 25.22%
  { negyedev: '2024Q3', sorId: '2.4', foid: '2.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 30, nevezoErtek: 22, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 8pp
  { negyedev: '2024Q3', sorId: '3.1a', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 152, nevezoErtek: 595, drl: 'PROXY' }, // 25.55%
  { negyedev: '2024Q3', sorId: '3.1b', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 112, nevezoErtek: 350, drl: 'PROXY' }, // 32.00%
  { negyedev: '2024Q3', sorId: '3.2', foid: '3.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: -1250, nevezoErtek: 820, drl: 'IGAZOLT' }, // -1.52‰
  { negyedev: '2024Q3', sorId: '3.3', foid: '3.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1280, nevezoErtek: 29550, drl: 'IGAZOLT' }, // 4.33%
  { negyedev: '2024Q3', sorId: '4.1', foid: '4.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1580, nevezoErtek: 80500, drl: 'IGAZOLT' }, // 1.96%
  { negyedev: '2024Q3', sorId: '4.2', foid: '4.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 168, nevezoErtek: 196, drl: 'PROXY' }, // 0.857

  // 2024Q4
  { negyedev: '2024Q4', sorId: '1.1', foid: '1.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 0.191, nevezoErtek: 250, drl: 'IGAZOLT' },
  { negyedev: '2024Q4', sorId: '1.2a', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 4580, nevezoErtek: 9600, drl: 'PROXY' }, // 47.71%
  { negyedev: '2024Q4', sorId: '1.2b', foid: '1.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 202, nevezoErtek: 245, drl: 'IGAZOLT' }, // 82.45%
  { negyedev: '2024Q4', sorId: '1.3', foid: '1.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1850, nevezoErtek: 4400, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 42.05%
  { negyedev: '2024Q4', sorId: '1.4', foid: '1.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 72, nevezoErtek: 250, drl: 'IGAZOLT' }, // 28.80%
  { negyedev: '2024Q4', sorId: '2.1', foid: '2.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 110, nevezoErtek: 75, drl: 'PROXY' }, // 1.467
  { negyedev: '2024Q4', sorId: '2.2', foid: '2.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 6.8, nevezoErtek: 98.0, drl: 'PROXY' }, // 6.94%
  { negyedev: '2024Q4', sorId: '2.3', foid: '2.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 62, nevezoErtek: 235, drl: 'IGAZOLT' }, // 26.38%
  { negyedev: '2024Q4', sorId: '2.4', foid: '2.4', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 28, nevezoErtek: 21, drl: 'HOZZÁFÉRÉS_KÉRDÉSES' }, // 7pp
  { negyedev: '2024Q4', sorId: '3.1a', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 145, nevezoErtek: 598, drl: 'PROXY' }, // 24.25%
  { negyedev: '2024Q4', sorId: '3.1b', foid: '3.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 108, nevezoErtek: 355, drl: 'PROXY' }, // 30.42%
  { negyedev: '2024Q4', sorId: '3.2', foid: '3.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: -1100, nevezoErtek: 820, drl: 'IGAZOLT' }, // -1.34‰
  { negyedev: '2024Q4', sorId: '3.3', foid: '3.3', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1190, nevezoErtek: 29600, drl: 'IGAZOLT' }, // 4.02%
  { negyedev: '2024Q4', sorId: '4.1', foid: '4.1', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 1610, nevezoErtek: 82000, drl: 'IGAZOLT' }, // 1.96%
  { negyedev: '2024Q4', sorId: '4.2', foid: '4.2', eredet: 'HISTÓRIKUS_BÁZIS_2023_2024', szamlaloErtek: 182, nevezoErtek: 200, drl: 'PROXY' }, // 0.910
];

// Generáljuk a 2025Q1–2026Q4 projekciós negyedéveket standard alappályával
const futureQuarters = [
  '2025Q1', '2025Q2', '2025Q3', '2025Q4',
  '2026Q1', '2026Q2', '2026Q3', '2026Q4'
];

futureQuarters.forEach((fq) => {
  MEASUREMENT_SERIES_META.forEach((meta) => {
    // Alappálya: a 2024Q4 bázisból stabil trenddel továbbvezetve
    let szamlalo = 100;
    let nevezo = 100;
    if (meta.sorId === '1.1') { szamlalo = 0.192; nevezo = 260; }
    else if (meta.sorId === '1.2a') { szamlalo = 4650; nevezo = 9600; }
    else if (meta.sorId === '1.2b') { szamlalo = 215; nevezo = 250; }
    else if (meta.sorId === '1.3') { szamlalo = 1800; nevezo = 4300; }
    else if (meta.sorId === '1.4') { szamlalo = 70; nevezo = 260; }
    else if (meta.sorId === '2.1') { szamlalo = 108; nevezo = 76; }
    else if (meta.sorId === '2.2') { szamlalo = 6.5; nevezo = 99.0; }
    else if (meta.sorId === '2.3') { szamlalo = 65; nevezo = 240; }
    else if (meta.sorId === '2.4') { szamlalo = 27; nevezo = 21; }
    else if (meta.sorId === '3.1a') { szamlalo = 142; nevezo = 600; }
    else if (meta.sorId === '3.1b') { szamlalo = 105; nevezo = 360; }
    else if (meta.sorId === '3.2') { szamlalo = -1050; nevezo = 820; }
    else if (meta.sorId === '3.3') { szamlalo = 1150; nevezo = 29700; }
    else if (meta.sorId === '4.1') { szamlalo = 1640; nevezo = 83500; }
    else if (meta.sorId === '4.2') { szamlalo = 190; nevezo = 205; }

    INITIAL_QUARTERLY_DATA.push({
      negyedev: fq,
      sorId: meta.sorId,
      foid: meta.foid,
      eredet: 'PROJEKCIÓ_2025_2026',
      szamlaloErtek: szamlalo,
      nevezoErtek: nevezo,
      drl: meta.alapertelmezettDRL,
    });
  });
});

export const INITIAL_AUDIT_LOGS: AuditRecord[] = [
  {
    id: 'AUD-2024Q1-001',
    timestamp: '2026-10-28T12:00:00.000Z',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    hash: 'ae61d909884414008b6636074f768ce071302b8858d2ae375dcce799f2f5db70',
    negyedev: '2024Q1',
    esemenyTipus: 'SZINTETIKUS_PILOT',
    kepletVerzio: 'v2.1-baseline',
    elozetesHipotezis: 'A 2024 eleji lakáspiaci élénkülés ellenére a középkategóriás DOM nő, és az 550–800k jövedelmi sáv hozzáférési rátája 45% alá esik.',
    nullhipotezis: 'A hozzáférési ráta elmozdulása szezonális ingadozás; a DOM növekedése a prémium szegmens gyorsulásának műterméke.',
    mertEltérés: '1.2a: 42,04% (<45%); 1.3: 53,26% (>50%); 2.1: 2,088 (>2,0); 2.4: ADATHIÁNY.',
    döntésiEredmény: 'SÁRGA - ELŐZETES (Konzervatív besorolás: nincs hamis Piros, adatminőségi és perzisztencia-szűrők aktívak).',
    felelős: 'MNB Makroprudenciális Főosztály',
    bemenetiHash: '58e762fd36058bfee1b6e6a8b921ac058c86b45699475cd94a34199d971f1177',
  },
  {
    id: 'AUD-2024Q4-002',
    timestamp: '2026-10-28T12:30:00.000Z',
    prevHash: 'ae61d909884414008b6636074f768ce071302b8858d2ae375dcce799f2f5db70',
    hash: '86163c80496c75e05c8dfba3c52f94ea3af76ddca3484a623a470c458493a659',
    negyedev: '2024Q4',
    esemenyTipus: 'KÜSZÖB_MÓDOSÍTÁS',
    kepletVerzio: 'v2.1-calibrated',
    elozetesHipotezis: 'A 2023Q1–2024Q4 bázisidőszakon végzett visszatesztelés alapján a validált küszöbök AUC értéke meghaladja a 0.75-öt.',
    nullhipotezis: 'A jelölt küszöbök diszkriminációs képessége nem jobb a véletlen besorolásnál (AUC <= 0.50).',
    mertEltérés: '1.2b, 1.4, 2.3, 3.2, 3.3, 4.1 mutatóknál az AUC >= 0.75 és FPR <= 15% teljesült.',
    döntésiEredmény: '6 indikátor küszöb státusza STATISZTIKAILAG_VALIDÁLT-ra frissült; 9 indikátor maradt JELÖLT státuszban.',
    felelős: 'Kockázatelemzési Munkacsoport',
    bemenetiHash: '638e83fa01c3fc34a8e67a71e0df86643f65ff1ede47416b24c1bb7948a4cec6',
  }
];
