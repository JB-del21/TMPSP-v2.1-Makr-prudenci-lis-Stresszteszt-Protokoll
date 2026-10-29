/**
 * TMPSP v2.1 Indikátorspecifikus Képletmotor
 * Tiszta, felülettől független matematikai kalkulációs réteg.
 */

import { IndicatorCalculationResult, IndicatorMeta, QuarterDataRow } from './types';

/**
 * Negyedév számtani azonosítójának léptetése (pl. 2024Q1 -> 1 évvel korábbi: 2023Q1)
 */
export function getPreviousYearQuarter(q: string): string {
  const match = q.match(/^(\d{4})Q([1-4])$/);
  if (!match) return '';
  const year = parseInt(match[1], 10) - 1;
  const quarter = match[2];
  return `${year}Q${quarter}`;
}

export function getPreviousQuarter(q: string): string {
  const match = q.match(/^(\d{4})Q([1-4])$/);
  if (!match) return '';
  let year = parseInt(match[1], 10);
  let quarter = parseInt(match[2], 10) - 1;
  if (quarter < 1) {
    quarter = 4;
    year -= 1;
  }
  return `${year}Q${quarter}`;
}

/**
 * Számítási motor az összes mérési sorra
 */
export function calculateIndicatorValue(
  row: QuarterDataRow,
  meta: IndicatorMeta,
  allRows: QuarterDataRow[]
): IndicatorCalculationResult {
  let val: number | null = null;
  let isMissing = false;

  // Ha az adatminőség NEM_ELÉRHETŐ vagy a számláló/nevező hiányzik
  if (row.drl === 'NEM_ELÉRHETŐ') {
    isMissing = true;
  } else if (row.szamitottErtek !== undefined && row.szamitottErtek !== null) {
    val = row.szamitottErtek;
  } else if (row.szamlaloErtek !== undefined && row.nevezoErtek !== undefined && row.nevezoErtek !== 0) {
    // Indikátorspecifikus matematikai logika
    switch (row.sorId) {
      case '1.1': // HHI
        val = row.szamlaloErtek;
        break;
      case '2.1': // DOM arány (Közép / Prémium)
        val = row.szamlaloErtek / row.nevezoErtek;
        break;
      case '2.4': // LGD shift (százalékpont delta)
        val = row.szamlaloErtek - row.nevezoErtek;
        break;
      case '3.2': // Vándorlási egyenleg (ezrelék: számláló = fő, nevező = ezer fő)
        val = row.szamlaloErtek / row.nevezoErtek;
        break;
      case '4.2': // Megtérülés (arány)
        val = row.szamlaloErtek / row.nevezoErtek;
        break;
      default:
        // Százalékos mutatók (1.2a, 1.2b, 1.3, 1.4, 2.2, 2.3, 3.1a, 3.1b, 3.3, 4.1)
        val = (row.szamlaloErtek / row.nevezoErtek) * 100;
        break;
    }
  } else {
    isMissing = true;
  }

  // Küszöb-összehasonlítás előtt kerekítés 6 tizedesre (Math.round(v * 1e6) / 1e6)
  // hogy a lebegőpontos pontatlanság (pl. 0.1+0.2 határeset) ne vigye rossz oldalra a döntést
  let atlepte = false;
  let roundedVal: number | null = null;
  if (val !== null && !isMissing) {
    roundedVal = Math.round(val * 1e6) / 1e6;
    const roundedThreshold = Math.round(meta.kuszobErtek * 1e6) / 1e6;
    if (meta.kuszobTipus === '>') {
      atlepte = roundedVal > roundedThreshold;
    } else {
      atlepte = roundedVal < roundedThreshold;
    }
  }

  // YoY vizsgálat (különösen 1.2a: <45% ÉS YoY -10pp)
  let yoyDelta: number | null = null;
  let yoyEllenorizheto = false;
  const prevYQuarter = getPreviousYearQuarter(row.negyedev);
  if (prevYQuarter) {
    const prevYearRow = allRows.find(
      (r) => r.negyedev === prevYQuarter && r.sorId === row.sorId
    );
    if (prevYearRow) {
      const prevCalc = calculateIndicatorValue(prevYearRow, meta, []);
      if (prevCalc.szamitottErtek !== null && val !== null) {
        yoyDelta = val - prevCalc.szamitottErtek;
        yoyEllenorizheto = true;
      }
    }
  }

  // Perzisztencia vizsgálat (pl. 1.3: 2 egymást követő negyedév)
  let perzisztenciaMegfelelo = false;
  const prevQ = getPreviousQuarter(row.negyedev);
  if (prevQ) {
    const prevRow = allRows.find(
      (r) => r.negyedev === prevQ && r.sorId === row.sorId
    );
    if (prevRow) {
      const prevCalc = calculateIndicatorValue(prevRow, meta, []);
      if (prevCalc.atlepte && atlepte) {
        perzisztenciaMegfelelo = true;
      }
    }
  }

  // Segédfüggvény korábbi negyedév számított értékének lebegőpontos lekéréséhez
  const getPrevCalcVal = (targetQ: string): number | null => {
    const r = allRows.find((item) => item.negyedev === targetQ && item.sorId === row.sorId);
    if (!r) return null;
    const c = calculateIndicatorValue(r, meta, []);
    return c.szamitottErtek !== null ? Math.round(c.szamitottErtek * 1e6) / 1e6 : null;
  };

  // Formázott érték készítése
  let formazottErtek = 'ADATHIÁNY';
  if (val !== null && !isMissing) {
    if (meta.egyseg === '%') {
      formazottErtek = `${val.toFixed(2)}%`;
    } else if (meta.egyseg === '‰') {
      formazottErtek = `${val.toFixed(2)}‰`;
    } else if (meta.egyseg === 'arány' || meta.egyseg === '0-1 skála') {
      formazottErtek = val.toFixed(3);
    } else if (meta.egyseg === 'százalékpont') {
      formazottErtek = `${val.toFixed(1)} pp`;
    } else {
      formazottErtek = val.toFixed(2);
    }
  }

  // Teljes feltétel (kiegészítő feltételekkel) és magyarázat meghatározása sorId szerint
  let teljesFeltetel: boolean | null = false;
  let feltetelMagyarazat = '';

  switch (row.sorId) {
    case '1.2a': {
      // 1.2a: atlepte ÉS yoyEllenorizheto ÉS yoyDelta <= -10 (ha a YoY nem ellenőrizhető: null)
      if (isMissing || val === null) {
        teljesFeltetel = null;
        feltetelMagyarazat = 'Adathiány miatt nem értékelhető';
      } else if (!yoyEllenorizheto || yoyDelta === null) {
        teljesFeltetel = null;
        feltetelMagyarazat = 'YoY bázis hiányzik, összetett feltétel nem ellenőrizhető';
      } else {
        const roundedYoy = Math.round(yoyDelta * 1e6) / 1e6;
        if (atlepte && roundedYoy <= -10) {
          teljesFeltetel = true;
          feltetelMagyarazat = 'Elsődleges küszöb (<45%) ÉS YoY -10pp romlás igazolva';
        } else if (atlepte) {
          teljesFeltetel = false;
          feltetelMagyarazat = `Elsődleges küszöb (<45%) átlépve, de az éves romlás nem éri el a -10pp-t (${roundedYoy.toFixed(2)}pp)`;
        } else {
          teljesFeltetel = false;
          feltetelMagyarazat = 'Küszöbérték alatt (nincs hozzáférési szűkülés)';
        }
      }
      break;
    }

    case '1.3': {
      // 1.3: atlepte ÉS perzisztenciaMegfelelo (2 egymást követő negyedév)
      if (isMissing || val === null) {
        teljesFeltetel = null;
        feltetelMagyarazat = 'Adathiány miatt nem értékelhető';
      } else if (atlepte && perzisztenciaMegfelelo) {
        teljesFeltetel = true;
        feltetelMagyarazat = 'JTM kiszorulás (>50%) és 2Q perzisztencia igazolva';
      } else if (atlepte) {
        teljesFeltetel = false;
        feltetelMagyarazat = '1Q izolált jelzés, 2Q perzisztencia még nem teljesült';
      } else {
        teljesFeltetel = false;
        feltetelMagyarazat = 'Küszöbérték alatt (<=50%)';
      }
      break;
    }

    case '1.1': {
      // 1.1: atlepte ÉS az érték nagyobb, mint az előző negyedévé (emelkedő trend; ha nincs előző: null)
      if (isMissing || val === null) {
        teljesFeltetel = null;
        feltetelMagyarazat = 'Adathiány miatt nem értékelhető';
      } else {
        const prevQ1 = getPreviousQuarter(row.negyedev);
        const prevVal = prevQ1 ? getPrevCalcVal(prevQ1) : null;
        if (prevVal === null) {
          teljesFeltetel = null;
          feltetelMagyarazat = 'Előző negyedéves bázisadat hiányzik a trendvizsgálathoz';
        } else if (atlepte && roundedVal! > prevVal) {
          teljesFeltetel = true;
          feltetelMagyarazat = 'HHI küszöbátlépés és emelkedő trend igazolva';
        } else if (atlepte) {
          teljesFeltetel = false;
          feltetelMagyarazat = 'HHI küszöbátlépés, de az érték nem nagyobb az előző negyedévinél';
        } else {
          teljesFeltetel = false;
          feltetelMagyarazat = 'HHI küszöbérték alatt';
        }
      }
      break;
    }

    case '1.4': {
      // 1.4: atlepte ÉS az érték 3 egymást követő negyedéven át nőtt (ha kevesebb adat van: null)
      if (isMissing || val === null) {
        teljesFeltetel = null;
        feltetelMagyarazat = 'Adathiány miatt nem értékelhető';
      } else {
        const q1 = getPreviousQuarter(row.negyedev);
        const q2 = q1 ? getPreviousQuarter(q1) : '';
        const q3 = q2 ? getPreviousQuarter(q2) : '';
        const v1 = q1 ? getPrevCalcVal(q1) : null;
        const v2 = q2 ? getPrevCalcVal(q2) : null;
        const v3 = q3 ? getPrevCalcVal(q3) : null;
        if (v1 === null || v2 === null || v3 === null) {
          teljesFeltetel = null;
          feltetelMagyarazat = 'Kevesebb mint 3 egymást követő negyedév áll rendelkezésre a trendvizsgálathoz';
        } else if (atlepte && roundedVal! > v1 && v1 > v2 && v2 > v3) {
          teljesFeltetel = true;
          feltetelMagyarazat = 'Küszöbátlépés (>35%) és 3 negyedéves folyamatos növekedés igazolva';
        } else if (atlepte) {
          teljesFeltetel = false;
          feltetelMagyarazat = 'Küszöbátlépés (>35%), de a 3 negyedéves folyamatos növekedési trend nem teljesült';
        } else {
          teljesFeltetel = false;
          feltetelMagyarazat = 'Küszöbérték alatt (<=35%)';
        }
      }
      break;
    }

    case '2.2': {
      // 2.2: atlepte ÉS az érték 2 egymást követő negyedéven át nőtt (ha nincs adat: null)
      if (isMissing || val === null) {
        teljesFeltetel = null;
        feltetelMagyarazat = 'Adathiány miatt nem értékelhető';
      } else {
        const q1 = getPreviousQuarter(row.negyedev);
        const q2 = q1 ? getPreviousQuarter(q1) : '';
        const v1 = q1 ? getPrevCalcVal(q1) : null;
        const v2 = q2 ? getPrevCalcVal(q2) : null;
        if (v1 === null || v2 === null) {
          teljesFeltetel = null;
          feltetelMagyarazat = 'Két egymást követő negyedéves trendvizsgálathoz nincs elegendő bázisadat';
        } else if (atlepte && roundedVal! > v1 && v1 > v2) {
          teljesFeltetel = true;
          feltetelMagyarazat = 'Alku-rés (>12%) és 2 egymást követő negyedéves növekedés igazolva';
        } else if (atlepte) {
          teljesFeltetel = false;
          feltetelMagyarazat = 'Alku-rés (>12%) átlépve, de a 2 negyedéves növekedési trend nem igazolt';
        } else {
          teljesFeltetel = false;
          feltetelMagyarazat = 'Alku-rés küszöbérték alatt (<=12%)';
        }
      }
      break;
    }

    case '2.3': {
      // 2.3: kiegészítő feltételhez nincs adat a modellben: teljesFeltetel = null
      if (isMissing || val === null) {
        teljesFeltetel = null;
        feltetelMagyarazat = 'Adathiány miatt nem értékelhető';
      } else {
        teljesFeltetel = null;
        feltetelMagyarazat = 'kiegészítő feltétel nem ellenőrizhető (hiányzó segédadat)';
      }
      break;
    }

    case '3.2': {
      // 3.2: kiegészítő feltételhez nincs adat a modellben: teljesFeltetel = null
      if (isMissing || val === null) {
        teljesFeltetel = null;
        feltetelMagyarazat = 'Adathiány miatt nem értékelhető';
      } else {
        teljesFeltetel = null;
        feltetelMagyarazat = 'kiegészítő feltétel nem ellenőrizhető (hiányzó segédadat)';
      }
      break;
    }

    case '2.4': {
      // 2.4: likviditási bypass: atlepte ÉS DRL nem HOZZÁFÉRÉS_KÉRDÉSES/NEM_ELÉRHETŐ ÉS esetszam >= 30
      if (isMissing || val === null) {
        teljesFeltetel = null;
        feltetelMagyarazat = 'Adathiány: LGD-shift adat nem áll rendelkezésre';
      } else if (!atlepte) {
        teljesFeltetel = false;
        feltetelMagyarazat = 'LGD-shift küszöb alatt (<=20pp)';
      } else if (row.esetszam === undefined || row.esetszam === null) {
        teljesFeltetel = null;
        feltetelMagyarazat = 'esetszám nem ellenőrizhető';
      } else if (row.esetszam < 30) {
        teljesFeltetel = false;
        feltetelMagyarazat = `esetszám elégtelen (${row.esetszam} < 30)`;
      } else if (row.drl === 'HOZZÁFÉRÉS_KÉRDÉSES' || row.drl === 'NEM_ELÉRHETŐ') {
        teljesFeltetel = false;
        feltetelMagyarazat = `Adatminőségi korlát (DRL: ${row.drl})`;
      } else {
        teljesFeltetel = true;
        feltetelMagyarazat = `Kritikus LGD-shift (>20pp) igazolva (${row.esetszam} esetszám mellett)`;
      }
      break;
    }

    default: {
      // Minden más sor: teljesFeltetel = atlepte
      if (isMissing || val === null) {
        teljesFeltetel = null;
        feltetelMagyarazat = 'Adathiány miatt nem értékelhető';
      } else {
        teljesFeltetel = atlepte;
        feltetelMagyarazat = atlepte
          ? `Küszöbérték átlépve (${formazottErtek} ${meta.kuszobTipus} ${meta.kuszobErtek})`
          : `Küszöbérték a normál sávban (${formazottErtek})`;
      }
      break;
    }
  }


  return {
    sorId: meta.sorId,
    foid: meta.foid,
    negyedev: row.negyedev,
    szamitottErtek: isMissing ? null : roundedVal,
    formazottErtek,
    kuszobErtek: meta.kuszobErtek,
    kuszobTipus: meta.kuszobTipus,
    atlepte,
    teljesFeltetel,
    feltetelMagyarazat,
    kuszobStatusz: meta.kuszobStatusz,
    drl: row.drl,
    yoyDelta,
    yoyEllenorizheto,
    perzisztenciaMegfelelo,
    adathiany: isMissing,
    reszletesStatusz: feltetelMagyarazat,
  };
}
