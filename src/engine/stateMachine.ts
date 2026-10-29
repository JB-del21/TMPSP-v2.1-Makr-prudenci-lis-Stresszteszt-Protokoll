/**
 * TMPSP v2.1 Konzervatív Véges Állapotgép (Finite State Machine)
 * Szigorú perzisztencia-, adatminőségi és likviditási bypass szabályokkal.
 */

import {
  DataOrigin,
  IndicatorCalculationResult,
  IntegratedStateResult,
  ModuleEvaluationResult,
  ModuleId,
  StateMachineStatus,
} from './types';

/**
 * Szabályozói eszkalációs konstans:
 * Legalább ennyi modulban igazolt (DRL nem hiányos, teljesFeltetel === true)
 * párhuzamos romlás esetén vált a rendszer globális PIROS állapotba.
 */
export const ESZKALACIOS_MODUL_SZAM = 2;

const MODULE_INDICATOR_KEYS: Record<ModuleId, string[]> = {
  M1: ['1.1', '1.2a', '1.2b', '1.3', '1.4'],
  M2: ['2.1', '2.2', '2.3', '2.4'],
  M3: ['3.1a', '3.1b', '3.2', '3.3'],
  M4: ['4.1', '4.2'],
};

export function evaluateModule1(
  calcs: Record<string, IndicatorCalculationResult>
): ModuleEvaluationResult {
  const c11 = calcs['1.1'];
  const c12a = calcs['1.2a'];
  const c12b = calcs['1.2b'];
  const c13 = calcs['1.3'];
  const c14 = calcs['1.4'];

  const kivaltoIndikatorok: string[] = [];
  const figyelojelzesek: string[] = [];
  let adatminosegiFigyelmeztetes = false;

  // Adatminőségi vizsgálat: az adathiány nem emel SÁRGÁRA, csak figyelmeztetést ad
  [c11, c12a, c12b, c13, c14].forEach((c) => {
    if (c && (c.adathiany || c.drl === 'NEM_ELÉRHETŐ' || c.drl === 'HOZZÁFÉRÉS_KÉRDÉSES')) {
      adatminosegiFigyelmeztetes = true;
    }
  });

  // 1.1 vizsgálat: küszöb felett ÉS emelkedő trend
  if (c11) {
    if (c11.teljesFeltetel === true) {
      kivaltoIndikatorok.push('1.1 HHI koncentráció növekvő trenddel');
    } else if (c11.atlepte) {
      figyelojelzesek.push(`1.1 HHI: ${c11.feltetelMagyarazat}`);
    }
  }

  // 1.2a vizsgálat: <45% ÉS YoY <= -10pp
  if (c12a) {
    if (c12a.teljesFeltetel === true) {
      kivaltoIndikatorok.push('1.2a Hozzáférési ráta (<45% ÉS YoY -10pp romlás igazolt)');
    } else if (c12a.atlepte) {
      figyelojelzesek.push(`1.2a Hozzáférési ráta: ${c12a.feltetelMagyarazat}`);
    }
  }

  // 1.2b vizsgálat: <70%
  if (c12b) {
    if (c12b.teljesFeltetel === true) {
      kivaltoIndikatorok.push('1.2b Volumenarány megvágás (<70%)');
    } else if (c12b.atlepte) {
      figyelojelzesek.push(`1.2b Volumenarány: ${c12b.feltetelMagyarazat}`);
    }
  }

  // 1.3 vizsgálat: JTM kiszorulás (>50% és 2Q perzisztens)
  if (c13) {
    if (c13.teljesFeltetel === true) {
      kivaltoIndikatorok.push('1.3 JTM kiszorulás (>50%, 2Q perzisztens)');
    } else if (c13.atlepte) {
      figyelojelzesek.push(`1.3 JTM kiszorulás: ${c13.feltetelMagyarazat}`);
    }
  }

  // 1.4 vizsgálat: Magas JTM (>35% javítva a tényleges küszöbre)
  if (c14) {
    if (c14.teljesFeltetel === true) {
      kivaltoIndikatorok.push('1.4 Magas JTM (>35%) volumensúly folyamatos növekedéssel');
    } else if (c14.atlepte) {
      figyelojelzesek.push(`1.4 Magas JTM (>35%): ${c14.feltetelMagyarazat}`);
    }
  }

  let statusz: StateMachineStatus = 'ZÖLD';
  let indoklas = 'A hitelkoncentrációs és hozzáférési mutatók a prudens sávban mozognak.';
  let akcioterv = 'Rutin negyedéves MNB HITREG adatmonitorozás.';

  if (kivaltoIndikatorok.length > 0) {
    statusz = 'SÁRGA - ELŐZETES';
    indoklas = `Modul 1 feszültség: ${kivaltoIndikatorok.join('; ')}.`;
    akcioterv = 'Kötelező 15 napos adategyeztetés a KHR-rel és a vezető bankokkal az elutasítási kódok harmonizációjára.';
  }

  return {
    modulId: 'M1',
    modulNev: 'Hitelkoncentráció és JTM',
    statusz,
    kivaltoIndikatorok,
    figyelojelzesek,
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
  const figyelojelzesek: string[] = [];
  let adatminosegiFigyelmeztetes = false;
  let likviditasiBypassAktiv = false;
  let likviditasiBypassEllenorizheto = true;

  // 2.1 vizsgálat: DOM arány > 2.0
  if (c21) {
    if (c21.teljesFeltetel === true) {
      kivaltoIndikatorok.push('2.1 DOM-arány (közép/prémium olló > 2,0)');
    } else if (c21.atlepte) {
      figyelojelzesek.push(`2.1 DOM-arány: ${c21.feltetelMagyarazat}`);
    }
  }

  // 2.2 vizsgálat: Alku-rés > 12% és 2Q növekedés
  if (c22) {
    if (c22.teljesFeltetel === true) {
      kivaltoIndikatorok.push('2.2 Alku-rés (>12% és 2Q növekedés)');
    } else if (c22.atlepte) {
      figyelojelzesek.push(`2.2 Alku-rés (>12%): ${c22.feltetelMagyarazat}`);
    }
  }

  // 2.3 vizsgálat: LTV-puffer erózió (<20%) - kiegészítő feltételhez nincs adat, így figyelőjelzés
  if (c23) {
    if (c23.teljesFeltetel === true) {
      kivaltoIndikatorok.push('2.3 LTV-puffer erózió (<20%)');
    } else if (c23.atlepte) {
      figyelojelzesek.push(`2.3 LTV-puffer erózió (<20%): ${c23.feltetelMagyarazat}`);
    }
  }

  // 2.4 LGD-shift ellenőrzése
  // Adathiány (NEM_ELÉRHETŐ / HOZZÁFÉRÉS_KÉRDÉSES): NEM emeli sárgára a modult!
  if (!c24 || c24.adathiany || c24.drl === 'NEM_ELÉRHETŐ' || c24.drl === 'HOZZÁFÉRÉS_KÉRDÉSES') {
    adatminosegiFigyelmeztetes = true;
    likviditasiBypassEllenorizheto = false;
  } else if (c24.atlepte) {
    // Likviditási bypass: atlepte ÉS DRL igazolt ÉS esetszam >= 30
    if (c24.teljesFeltetel === true) {
      likviditasiBypassAktiv = true;
      kivaltoIndikatorok.push('2.4 LGD-shift kényszerértékesítéskor (>20pp, min. 30 esetszám felett)');
    } else if (c24.teljesFeltetel === null) {
      figyelojelzesek.push('2.4 LGD-shift: esetszám nem ellenőrizhető');
    } else {
      figyelojelzesek.push(`2.4 LGD-shift: ${c24.feltetelMagyarazat}`);
    }
  }

  let statusz: StateMachineStatus = 'ZÖLD';
  let indoklas = 'A lakáspiaci likviditás és fedezetértékelés stabil.';
  let akcioterv = 'Rutin ingatlanpiaci és fedezetértékelési monitoring.';

  if (likviditasiBypassAktiv) {
    statusz = 'PIROS';
    indoklas = 'Kritikus likviditási bypass: az LGD-shift túllépte a szélső sokk-küszöböt (+20pp) igazolt esetszám mellett, azonnali fedezeti kockázat.';
    akcioterv = 'Azonnali makroprudenciális előterjesztés, banki fedezeti céltartalékok felülvizsgálata.';
  } else if (kivaltoIndikatorok.length > 0) {
    statusz = 'SÁRGA - ELŐZETES';
    indoklas = `Modul 2 feszültség: ${kivaltoIndikatorok.join('; ')}. A likviditási olló tágulása igazolt.`;
    akcioterv = 'Célzott adatbekérés a banki követeléskezelési területről a realizált kényszerértékesítési árakra.';
  }

  return {
    modulId: 'M2',
    modulNev: 'Fedezeti Likviditás és Piacmegoszlás',
    statusz,
    kivaltoIndikatorok,
    figyelojelzesek,
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
  const figyelojelzesek: string[] = [];
  let adatminosegiFigyelmeztetes = false;

  [c31a, c31b, c32, c33].forEach((c) => {
    if (c && (c.adathiany || c.drl === 'NEM_ELÉRHETŐ' || c.drl === 'HOZZÁFÉRÉS_KÉRDÉSES')) {
      adatminosegiFigyelmeztetes = true;
    }
  });

  if (c31a) {
    if (c31a.teljesFeltetel === true) {
      kivaltoIndikatorok.push('3.1a HCOR túlterheltség (>30%)');
    } else if (c31a.atlepte) {
      figyelojelzesek.push(`3.1a HCOR: ${c31a.feltetelMagyarazat}`);
    }
  }

  if (c31b) {
    if (c31b.teljesFeltetel === true) {
      kivaltoIndikatorok.push('3.1b MTR medián teher (>35%)');
    } else if (c31b.atlepte) {
      figyelojelzesek.push(`3.1b MTR: ${c31b.feltetelMagyarazat}`);
    }
  }

  // 3.2: kiegészítő feltétel (legalább 2 régió) nem ellenőrizhető -> figyelőjelzés
  if (c32) {
    if (c32.teljesFeltetel === true) {
      kivaltoIndikatorok.push('3.2 Fiatalok elvándorlása (<-3‰)');
    } else if (c32.atlepte) {
      figyelojelzesek.push(`3.2 Fiatalok elvándorlása (<-3‰): ${c32.feltetelMagyarazat}`);
    }
  }

  if (c33) {
    if (c33.teljesFeltetel === true) {
      kivaltoIndikatorok.push('3.3 Építőipari csődráta (>5%)');
    } else if (c33.atlepte) {
      figyelojelzesek.push(`3.3 Építőipari csődráta: ${c33.feltetelMagyarazat}`);
    }
  }

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
    figyelojelzesek,
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
  const figyelojelzesek: string[] = [];
  let adatminosegiFigyelmeztetes = false;

  [c41, c42].forEach((c) => {
    if (c && (c.adathiany || c.drl === 'NEM_ELÉRHETŐ' || c.drl === 'HOZZÁFÉRÉS_KÉRDÉSES')) {
      adatminosegiFigyelmeztetes = true;
    }
  });

  if (c41) {
    if (c41.teljesFeltetel === true) {
      kivaltoIndikatorok.push('4.1 Állami garanciaállomány/GDP (>2,5%)');
    } else if (c41.atlepte) {
      figyelojelzesek.push(`4.1 Állami garanciaállomány: ${c41.feltetelMagyarazat}`);
    }
  }

  if (c42) {
    if (c42.teljesFeltetel === true) {
      kivaltoIndikatorok.push('4.2 Lakástámogatási megtérülés (<0,5)');
    } else if (c42.atlepte) {
      figyelojelzesek.push(`4.2 Lakástámogatási megtérülés: ${c42.feltetelMagyarazat}`);
    }
  }

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
    figyelojelzesek,
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
  originOrIsSynthetic: DataOrigin | boolean = false,
  originArg?: DataOrigin
): IntegratedStateResult {
  const m1 = evaluateModule1(calcs);
  const m2 = evaluateModule2(calcs);
  const m3 = evaluateModule3(calcs);
  const m4 = evaluateModule4(calcs);

  const modulok = { M1: m1, M2: m2, M3: m3, M4: m4 };
  const figyelmeztetesek: string[] = [];

  let isSynthetic = false;
  let isProjection = false;

  if (typeof originOrIsSynthetic === 'boolean') {
    isSynthetic = originOrIsSynthetic;
    if (originArg === 'PROJEKCIÓ_2025_2026') isProjection = true;
    if (originArg === 'SZINTETIKUS_PILOT_2024Q1') isSynthetic = true;
  } else if (typeof originOrIsSynthetic === 'string') {
    if (originOrIsSynthetic === 'SZINTETIKUS_PILOT_2024Q1') isSynthetic = true;
    if (originOrIsSynthetic === 'PROJEKCIÓ_2025_2026') isProjection = true;
  }

  // Szintetikus megjelölés
  if (isSynthetic) {
    figyelmeztetesek.push('SZINTETIKUS_PILOT: Az adatsor szimulált tesztadat, nem tekinthető valós hatósági megfigyelésnek.');
  }

  // Projekció megjelölés
  if (isProjection) {
    figyelmeztetesek.push('PROJEKCIÓ: ez nem megfigyelés, hanem előrebecslés');
  }

  // DRL hiányok és adatminőségi állapot meghatározása
  let vanAdathiany = false;
  Object.values(calcs).forEach((c) => {
    if (c.drl === 'HOZZÁFÉRÉS_KÉRDÉSES') {
      vanAdathiany = true;
      figyelmeztetesek.push(`Adatminőségi blokkoló: ${c.sorId} státusza HOZZÁFÉRÉS_KÉRDÉSES.`);
    } else if (c.drl === 'NEM_ELÉRHETŐ' || c.adathiany) {
      vanAdathiany = true;
      figyelmeztetesek.push(`Adathiány: ${c.sorId} mutató nem érhető el.`);
    }
  });

  const adatminosegiAllapot: 'TELJES' | 'HIÁNYOS' = vanAdathiany ? 'HIÁNYOS' : 'TELJES';

  // Megszámoljuk azokat a modulokat, ahol van legalább egy igazolt kiváltó indikátor
  // (DRL nem HOZZÁFÉRÉS_KÉRDÉSES/NEM_ELÉRHETŐ ÉS teljesFeltetel === true)
  const hasVerifiedTrigger = (modId: ModuleId): boolean => {
    const sors = MODULE_INDICATOR_KEYS[modId] || [];
    return sors.some((sorId) => {
      const c = calcs[sorId];
      return (
        c &&
        c.teljesFeltetel === true &&
        c.drl !== 'HOZZÁFÉRÉS_KÉRDÉSES' &&
        c.drl !== 'NEM_ELÉRHETŐ'
      );
    });
  };

  const igazoltRomloModulokSzama = (['M1', 'M2', 'M3', 'M4'] as ModuleId[]).filter((modId) =>
    hasVerifiedTrigger(modId)
  ).length;

  // Globális státuszmeghatározás
  let globalisStatusz: StateMachineStatus = 'ZÖLD';
  let szukKeresztmetszet = 'Nincs azonosított rendszerszintű szűk keresztmetszet.';
  let prioritasosAkcio = 'Rutin makroprudenciális monitoring folytatása.';

  // 1. Azonnali likviditási bypass (2.4 LGD-shift igazolt esetszám mellett)
  if (m2.likviditasiBypassAktiv) {
    globalisStatusz = 'PIROS';
    szukKeresztmetszet = 'Azonnali kényszerértékesítési fedezetvesztés és likviditási sokk (Modul 2).';
    prioritasosAkcio = 'Pénzügyi Stabilitási Tanács azonnali rendkívüli ülése, banki fedezeti haircutok emelése.';
  }
  // 2. Eszkaláció: legalább ESZKALACIOS_MODUL_SZAM igazolt modul esetén PIROS
  else if (igazoltRomloModulokSzama >= ESZKALACIOS_MODUL_SZAM) {
    globalisStatusz = 'PIROS';
    szukKeresztmetszet = 'Több modulban igazolt, adatban ellenőrzött romlás.';
    prioritasosAkcio = 'Formális makroprudenciális felülvizsgálat és ellenintézkedési csomag.';
  }
  // 3. Egy modulban kiváltó indikátor vagy előzetes feszültség esetén SÁRGA
  else {
    const sargaModulok = [m1, m2, m3, m4].filter((m) => m.statusz === 'SÁRGA - ELŐZETES');
    const pirosModulok = [m1, m2, m3, m4].filter((m) => m.statusz === 'PIROS');

    if (igazoltRomloModulokSzama > 0 || sargaModulok.length > 0 || pirosModulok.length > 0) {
      globalisStatusz = 'SÁRGA - ELŐZETES';
      szukKeresztmetszet = 'Hitelhozzáférési szűkülés vagy likviditási lassulás feltételezhető.';
      prioritasosAkcio = 'Adategyeztetés és okfeltárás az adatgazdákkal. Politikai beavatkozás NEM indokolt, amíg a perzisztencia nincs igazolva.';
    } else {
      globalisStatusz = 'ZÖLD';
    }
  }

  return {
    negyedev,
    globalisStatusz,
    adatminosegiAllapot,
    modulok,
    figyelmeztetesek,
    szukKeresztmetszet,
    prioritasosAkcio,
    szintetikusFigyelmeztetes: isSynthetic,
    projekcioFigyelmeztetes: isProjection,
  };
}
