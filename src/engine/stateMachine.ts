/**
 * TMPSP v2.1 Konzervatív Véges Állapotgép (Finite State Machine)
 * Szigorú perzisztencia-, adatminőségi és likviditási bypass szabályokkal.
 */

import {
  IndicatorCalculationResult,
  IntegratedStateResult,
  ModuleEvaluationResult,
  ModuleId,
  StateMachineStatus,
} from './types';

export function evaluateModule1(
  calcs: Record<string, IndicatorCalculationResult>
): ModuleEvaluationResult {
  const c11 = calcs['1.1'];
  const c12a = calcs['1.2a'];
  const c12b = calcs['1.2b'];
  const c13 = calcs['1.3'];
  const c14 = calcs['1.4'];

  const kivaltoIndikatorok: string[] = [];
  let adatminosegiFigyelmeztetes = false;

  // 1.1 vizsgálat
  if (c11 && c11.atlepte) {
    kivaltoIndikatorok.push('1.1 HHI koncentráció');
  }

  // 1.2a vizsgálat: <45% ÉS YoY -10pp
  if (c12a && c12a.atlepte) {
    if (!c12a.yoyEllenorizheto) {
      kivaltoIndikatorok.push('1.2a Hozzáférési ráta (<45%, de YoY bázis hiányzik)');
    } else if (c12a.yoyDelta !== null && c12a.yoyDelta !== undefined && c12a.yoyDelta <= -10) {
      kivaltoIndikatorok.push('1.2a Hozzáférési ráta (<45% ÉS YoY -10pp romlás igazolt)');
    } else {
      kivaltoIndikatorok.push('1.2a Hozzáférési ráta (<45%, de éves romlás <10pp)');
    }
  }

  // 1.2b vizsgálat
  if (c12b && c12b.atlepte) {
    kivaltoIndikatorok.push('1.2b Volumenarány megvágás (<70%)');
  }

  // 1.3 vizsgálat: JTM kiszorulás (>50% és 2Q perzisztens)
  if (c13 && c13.atlepte) {
    if (c13.drl === 'HOZZÁFÉRÉS_KÉRDÉSES') {
      adatminosegiFigyelmeztetes = true;
      kivaltoIndikatorok.push('1.3 JTM kiszorulás (>50%, de DRL: HOZZÁFÉRÉS_KÉRDÉSES)');
    } else if (!c13.perzisztenciaMegfelelo) {
      kivaltoIndikatorok.push('1.3 JTM kiszorulás (>50%, 1Q jelzés - 2Q perzisztencia függőben)');
    } else {
      kivaltoIndikatorok.push('1.3 JTM kiszorulás (>50%, 2Q perzisztens)');
    }
  }

  // 1.4 vizsgálat
  if (c14 && c14.atlepte) {
    kivaltoIndikatorok.push('1.4 Magas JTM (>40%) volumensúly');
  }

  let statusz: StateMachineStatus = 'ZÖLD';
  let indoklas = 'A hitelkoncentrációs és hozzáférési mutatók a prudens sávban mozognak.';
  let akcioterv = 'Rutin negyedéves MNB HITREG adatmonitorozás.';

  if (kivaltoIndikatorok.length > 0) {
    statusz = 'SÁRGA - ELŐZETES';
    indoklas = `Modul 1 feszültség: ${kivaltoIndikatorok.join('; ')}. Az éves változás, a perzisztencia és a banki elutasítási kódok konzisztenciája még nincs igazolva.`;
    akcioterv = 'Kötelező 15 napos adategyeztetés a KHR-rel és a vezető bankokkal az elutasítási kódok harmonizációjára.';
  }

  return {
    modulId: 'M1',
    modulNev: 'Hitelkoncentráció és JTM',
    statusz,
    kivaltoIndikatorok,
    indoklas,
    akcioterv,
    adatminosegiFigyelmeztetes,
    likviditasiBypassAktiv: false,
    likviditasiBypassEllenorizheto: true,
  };
}

export function evaluateModule2(
  calcs: Record<string, IndicatorCalculationResult>
): ModuleEvaluationResult {
  const c21 = calcs['2.1'];
  const c22 = calcs['2.2'];
  const c23 = calcs['2.3'];
  const c24 = calcs['2.4'];

  const kivaltoIndikatorok: string[] = [];
  let adatminosegiFigyelmeztetes = false;
  let likviditasiBypassAktiv = false;
  let likviditasiBypassEllenorizheto = true;

  if (c21 && c21.atlepte) {
    kivaltoIndikatorok.push('2.1 DOM-arány (közép/prémium olló > 2,0)');
  }

  if (c22 && c22.atlepte) {
    kivaltoIndikatorok.push('2.2 Alku-rés (>12%)');
  }

  if (c23 && c23.atlepte) {
    kivaltoIndikatorok.push('2.3 LTV-puffer erózió (<20%)');
  }

  // 2.4 LGD-shift ellenőrzése
  if (!c24 || c24.adathiany || c24.drl === 'NEM_ELÉRHETŐ' || c24.drl === 'HOZZÁFÉRÉS_KÉRDÉSES') {
    adatminosegiFigyelmeztetes = true;
    likviditasiBypassEllenorizheto = false;
    kivaltoIndikatorok.push('2.4 LGD-shift hiányzik / hozzáférés kérdéses');
  } else if (c24.atlepte) {
    likviditasiBypassAktiv = true;
    kivaltoIndikatorok.push('2.4 LGD-shift kényszerértékesítéskor (>20pp)');
  }

  let statusz: StateMachineStatus = 'ZÖLD';
  let indoklas = 'A lakáspiaci likviditás és fedezetértékelés stabil.';
  let akcioterv = 'Rutin ingatlanpiaci és fedezetértékelési monitoring.';

  if (likviditasiBypassAktiv) {
    statusz = 'PIROS';
    indoklas = 'Kritikus likviditási bypass: az LGD-shift túllépte a szélső sokk-küszöböt (+20pp), azonnali fedezeti kockázat.';
    akcioterv = 'Azonnali makroprudenciális előterjesztés, banki fedezeti céltartalékok felülvizsgálata.';
  } else if (kivaltoIndikatorok.length > 0) {
    statusz = 'SÁRGA - ELŐZETES';
    indoklas = `Modul 2 feszültség: ${kivaltoIndikatorok.join('; ')}. A DOM-olló kinyílt, a középkategória likviditása lassul, miközben a kényszerértékesítési LGD adathiányos.`;
    akcioterv = 'Célzott adatbekérés a banki követeléskezelési területről a realizált kényszerértékesítési árakra.';
  }

  return {
    modulId: 'M2',
    modulNev: 'Fedezeti Likviditás és Piacmegoszlás',
    statusz,
    kivaltoIndikatorok,
    indoklas,
    akcioterv,
    adatminosegiFigyelmeztetes,
    likviditasiBypassAktiv,
    likviditasiBypassEllenorizheto,
  };
}

export function evaluateModule3(
  calcs: Record<string, IndicatorCalculationResult>
): ModuleEvaluationResult {
  const c31a = calcs['3.1a'];
  const c31b = calcs['3.1b'];
  const c32 = calcs['3.2'];
  const c33 = calcs['3.3'];

  const kivaltoIndikatorok: string[] = [];
  let adatminosegiFigyelmeztetes = false;

  if (c31a && c31a.atlepte) kivaltoIndikatorok.push('3.1a HCOR túlterheltség (>30%)');
  if (c31b && c31b.atlepte) kivaltoIndikatorok.push('3.1b MTR medián teher (>35%)');
  if (c32 && c32.atlepte) kivaltoIndikatorok.push('3.2 Fiatalok elvándorlása (<-3‰)');
  if (c33 && c33.atlepte) kivaltoIndikatorok.push('3.3 Építőipari csődráta (>5%)');

  let statusz: StateMachineStatus = 'ZÖLD';
  let indoklas = 'A reálgazdasági és demográfiai visszacsatolási mutatók a jelölt küszöbértékek alatt maradtak.';
  let akcioterv = 'KSH SILC és népmozgalmi adatok rendszeres frissítése.';

  if (kivaltoIndikatorok.length > 0) {
    statusz = 'SÁRGA - ELŐZETES';
    indoklas = `Modul 3 feszültség: ${kivaltoIndikatorok.join('; ')}.`;
    akcioterv = 'Részletes KSH jövedelmi mikroszimuláció az alsó jövedelmi decilisek sérülékenységére.';
  }

  return {
    modulId: 'M3',
    modulNev: 'Reálgazdasági és Demográfiai Lánc',
    statusz,
    kivaltoIndikatorok,
    indoklas,
    akcioterv,
    adatminosegiFigyelmeztetes,
    likviditasiBypassAktiv: false,
    likviditasiBypassEllenorizheto: true,
  };
}

export function evaluateModule4(
  calcs: Record<string, IndicatorCalculationResult>
): ModuleEvaluationResult {
  const c41 = calcs['4.1'];
  const c42 = calcs['4.2'];

  const kivaltoIndikatorok: string[] = [];
  let adatminosegiFigyelmeztetes = false;

  if (c41 && c41.atlepte) kivaltoIndikatorok.push('4.1 Állami garanciaállomány/GDP (>2,5%)');
  if (c42 && c42.atlepte) kivaltoIndikatorok.push('4.2 Lakástámogatási megtérülés (<0,5)');

  let statusz: StateMachineStatus = 'ZÖLD';
  let indoklas = 'A költségvetési garanciális kitettség és támogatási hatékonyság a fenntartható sávban van.';
  let akcioterv = 'ÁKK és Garantiqa garanciaállomány-követés.';

  if (kivaltoIndikatorok.length > 0) {
    statusz = 'SÁRGA - ELŐZETES';
    indoklas = `Modul 4 feszültség: ${kivaltoIndikatorok.join('; ')}.`;
    akcioterv = 'Pénzügyminisztériumi garanciális kockázatelemzés kezdeményezése.';
  }

  return {
    modulId: 'M4',
    modulNev: 'Költségvetési és Garanciális Kockázat',
    statusz,
    kivaltoIndikatorok,
    indoklas,
    akcioterv,
    adatminosegiFigyelmeztetes,
    likviditasiBypassAktiv: false,
    likviditasiBypassEllenorizheto: true,
  };
}

/**
 * Integrált állapotgép döntési lefutása
 */
export function evaluateIntegratedStateMachine(
  negyedev: string,
  calcs: Record<string, IndicatorCalculationResult>,
  isSyntheticPilot: boolean = false
): IntegratedStateResult {
  const m1 = evaluateModule1(calcs);
  const m2 = evaluateModule2(calcs);
  const m3 = evaluateModule3(calcs);
  const m4 = evaluateModule4(calcs);

  const modulok = { M1: m1, M2: m2, M3: m3, M4: m4 };
  const figyelmeztetesek: string[] = [];

  // Szintetikus megjelölés
  if (isSyntheticPilot) {
    figyelmeztetesek.push('SZINTETIKUS_PILOT: Az adatsor szimulált tesztadat, nem tekinthető valós hatósági megfigyelésnek.');
  }

  // DRL hiányok
  Object.values(calcs).forEach((c) => {
    if (c.drl === 'HOZZÁFÉRÉS_KÉRDÉSES') {
      figyelmeztetesek.push(`Adatminőségi blokkoló: ${c.sorId} státusza HOZZÁFÉRÉS_KÉRDÉSES.`);
    } else if (c.drl === 'NEM_ELÉRHETŐ') {
      figyelmeztetesek.push(`Adathiány: ${c.sorId} mutató nem érhető el.`);
    }
  });

  // Globális státuszmeghatározás
  let globalisStatusz: StateMachineStatus = 'ZÖLD';
  let szukKeresztmetszet = 'Nincs azonosított rendszerszintű szűk keresztmetszet.';
  let prioritasosAkcio = 'Rutin makroprudenciális monitoring folytatása.';

  // 1. Azonnali likviditási bypass
  if (m2.likviditasiBypassAktiv) {
    globalisStatusz = 'PIROS';
    szukKeresztmetszet = 'Azonnali kényszerértékesítési fedezetvesztés és likviditási sokk (Modul 2).';
    prioritasosAkcio = 'Pénzügyi Stabilitási Tanács azonnali rendkívüli ülése, banki fedezeti haircutok emelése.';
  }
  // 2. Két független modulban igazolt párhuzamos romlás
  else {
    const sargaModulok = [m1, m2, m3, m4].filter((m) => m.statusz === 'SÁRGA - ELŐZETES');
    const pirosModulok = [m1, m2, m3, m4].filter((m) => m.statusz === 'PIROS');

    if (pirosModulok.length >= 2) {
      globalisStatusz = 'PIROS';
      szukKeresztmetszet = 'Több modulban igazolt rendszerszintű sérülékenység.';
      prioritasosAkcio = 'Formális makroprudenciális felülvizsgálat és ellenintézkedési csomag.';
    } else if (sargaModulok.length > 0 || pirosModulok.length > 0) {
      globalisStatusz = 'SÁRGA - ELŐZETES';
      szukKeresztmetszet = 'Hitelhozzáférési szűkülés és fedezeti likviditási lassulás feltételezhető.';
      prioritasosAkcio = 'Adategyeztetés és okfeltárás az adatgazdákkal. Politikai beavatkozás NEM indokolt, amíg a perzisztencia nincs igazolva.';
    } else {
      globalisStatusz = 'ZÖLD';
    }
  }

  return {
    negyedev,
    globalisStatusz,
    modulok,
    figyelmeztetesek,
    szukKeresztmetszet,
    prioritasosAkcio,
    szintetikusFigyelmeztetes: isSyntheticPilot,
  };
}
