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
      case '3.2': // Vándorlási egyenleg (ezrelék: számláló = fő, nevező = ezer fő, így számláló/nevező közvetlenül ezreléket ad)
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

  // Küszöbátlépés vizsgálata
  let atlepte = false;
  if (val !== null && !isMissing) {
    if (meta.kuszobTipus === '>') {
      atlepte = val > meta.kuszobErtek;
    } else {
      atlepte = val < meta.kuszobErtek;
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

  // Részletes állapot leírás
  let reszletesStatusz = 'Normál';
  if (isMissing) {
    reszletesStatusz = 'Adathiány / Nem elérhető';
  } else if (atlepte) {
    if (meta.sorId === '1.2a') {
      if (yoyEllenorizheto) {
        if (yoyDelta !== null && yoyDelta <= -10) {
          reszletesStatusz = 'Küszöb ÉS YoY -10pp romlás igazolva';
        } else {
          reszletesStatusz = 'Küszöb átlépve, de YoY -10pp romlás NEM igazolt';
        }
      } else {
        reszletesStatusz = 'Küszöb átlépve, de YoY bázisadat hiányzik (Nem ellenőrizhető)';
      }
    } else if (meta.sorId === '1.3') {
      if (perzisztenciaMegfelelo) {
        reszletesStatusz = 'Küszöb átlépve és 2 negyedéves perzisztencia igazolt';
      } else {
        reszletesStatusz = 'Küszöb átlépve (1Q), de 2Q perzisztencia még nem teljesült';
      }
    } else {
      reszletesStatusz = `Küszöbérték átlépve (${formazottErtek} ${meta.kuszobTipus} ${meta.kuszobErtek})`;
    }
  }

  return {
    sorId: meta.sorId,
    foid: meta.foid,
    negyedev: row.negyedev,
    szamitottErtek: isMissing ? null : val,
    formazottErtek,
    kuszobErtek: meta.kuszobErtek,
    kuszobTipus: meta.kuszobTipus,
    atlepte,
    kuszobStatusz: meta.kuszobStatusz,
    drl: row.drl,
    yoyDelta,
    yoyEllenorizheto,
    perzisztenciaMegfelelo,
    adathiany: isMissing,
    reszletesStatusz,
  };
}
