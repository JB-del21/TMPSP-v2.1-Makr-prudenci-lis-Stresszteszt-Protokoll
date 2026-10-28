/**
 * TMPSP v2.1 Küszöb-Kalibrációs és Visszatesztelési Motor
 * Kiszámítja az AUC/ROC és False Positive Rate (FPR) mutatókat a 2023Q1–2024Q4 idősoron.
 * 
 * CAL-001 Szakmai és Módszertani Garanciák:
 * 1. Forrásdokumentált történelmi stresszesemények (MNB Pénzügyi Stabilitási és Lakáspiaci Jelentések).
 * 2. Matematikai algoritmus (Wilcoxon-Mann-Whitney ROC-AUC) és gazdasági validitás explicit szétválasztása.
 * 3. Degenerált osztályeloszlások (osztás-nullával) és zéró variancia védelme.
 * 4. Szintetikus adatilleszkedés felülvizsgálati figyelmeztetése.
 */

import { CalibrationItem, IndicatorMeta, QuarterDataRow } from './types';
import { calculateIndicatorValue } from './calculator';

export interface StressQuarterDetail {
  isStress: boolean;
  leiras: string;
  forras: string;
}

/**
 * Történelmi stressz/sérülékenységi események empirikus forrásdokumentációja (CAL-001)
 */
export const HISTORICAL_STRESS_DOCUMENTATION: Record<string, StressQuarterDetail> = {
  '2023Q1': {
    isStress: false,
    leiras: 'Kamatemelkedés kezdete, de a korábban lekötött hitelek folyósítása még tompította a sokkot.',
    forras: 'MNB Pénzügyi Stabilitási Jelentés (2023. május)',
  },
  '2023Q2': {
    isStress: true,
    leiras: 'Hitelkínálati és keresleti sokk: alapkamat 13%, új lakáshitel kihelyezés -67% zuhanás YoY, JTM szigorítás.',
    forras: 'MNB Pénzügyi Stabilitási Jelentés (2023. június, 2. fejezet)',
  },
  '2023Q3': {
    isStress: true,
    leiras: 'Likviditási és forgalmi mélypont: negyedéves lakástranzakciók mélypontja (22 ezer db), DOM kinyílás, építőipari megrendelés-visszaesés.',
    forras: 'MNB Lakáspiaci Jelentés (2023. november, 1. és 3. fejezet)',
  },
  '2023Q4': {
    isStress: false,
    leiras: 'Kamatcsökkentési ciklus indulása (10,75%-ra), piaci forgalom stabilizálódása.',
    forras: 'MNB Pénzügyi Stabilitási Jelentés (2023. december)',
  },
  '2024Q1': {
    isStress: false,
    leiras: 'Szintetikus pilot tesztidőszak: piaci élénkülés, CSOK Plusz indulása, de szezonális DOM torzulások.',
    forras: 'TMPSP v2.1 Módszertani Referenciafutás',
  },
  '2024Q2': {
    isStress: false,
    leiras: 'Hitelkamatok 7% alatti konszolidációja, forgalom normalizálódása.',
    forras: 'MNB Lakáspiaci Jelentés (2024. május)',
  },
  '2024Q3': {
    isStress: false,
    leiras: 'Stabil makrogazdasági környezet, alacsony csődráták.',
    forras: 'MNB Pénzügyi Stabilitási Jelentés (2024. június)',
  },
  '2024Q4': {
    isStress: false,
    leiras: 'Bázisidőszak zárása: 8 negyedéves visszatesztelési horizont vége.',
    forras: 'MNB Statisztikai Közlemény (2024. december)',
  },
};

export const HISTORICAL_STRESS_EVENTS: Record<string, boolean> = Object.fromEntries(
  Object.entries(HISTORICAL_STRESS_DOCUMENTATION).map(([q, d]) => [q, d.isStress])
);

export interface BacktestResult {
  auc: number | null;
  fpr: number;
  indoklas: string;
  isDegenerate?: boolean;
  isZeroVariance?: boolean;
  szintetikusFigyelmeztetes?: boolean;
  matematikaiHelyesseg: boolean;
  gazdasagiStatusz: 'STATISZTIKAILAG_VALIDÁLT' | 'JELÖLT' | 'NEM_KALIBRÁLHATÓ';
}

/**
 * AUC és FPR számítása egy adott indikátorra a bázison, választható stressz-térképpel
 */
export function runThresholdBacktest(
  meta: IndicatorMeta,
  historyRows: QuarterDataRow[],
  stressEventMap: Record<string, boolean> = HISTORICAL_STRESS_EVENTS
): BacktestResult {
  const rows = historyRows.filter((r) => r.sorId === meta.sorId);
  if (rows.length < 4) {
    return {
      auc: null,
      fpr: 0,
      indoklas: 'Nem áll rendelkezésre elegendő bázisadat a megbízható visszateszteléshez (legalább 4 negyedév szükséges).',
      isDegenerate: true,
      matematikaiHelyesseg: false,
      gazdasagiStatusz: 'NEM_KALIBRÁLHATÓ',
    };
  }

  // Számítsuk ki az értékeket minden negyedévre
  const observations: { val: number; actualStress: boolean }[] = [];
  rows.forEach((r) => {
    const calc = calculateIndicatorValue(r, meta, historyRows);
    if (calc.szamitottErtek !== null && Number.isFinite(calc.szamitottErtek)) {
      observations.push({
        val: calc.szamitottErtek,
        actualStress: stressEventMap[r.negyedev] ?? false,
      });
    }
  });

  if (observations.length === 0) {
    return {
      auc: null,
      fpr: 0,
      indoklas: 'Hiányzó numerikus értékek a bázisidőszakban (nincs érvényes megfigyelés).',
      isDegenerate: true,
      matematikaiHelyesseg: false,
      gazdasagiStatusz: 'NEM_KALIBRÁLHATÓ',
    };
  }

  const positiveValues = observations.filter((o) => o.actualStress).map((o) => o.val);
  const negativeValues = observations.filter((o) => !o.actualStress).map((o) => o.val);

  // DEGENERÁLT ESET 1: Hiányzik az egyik osztály (csak pozitívak vagy csak negatívak)
  if (positiveValues.length === 0 || negativeValues.length === 0) {
    const missingClass = positiveValues.length === 0 ? 'pozitív (stressz)' : 'negatív (normál)';
    return {
      auc: null,
      fpr: 0,
      indoklas: `Degenerált osztályeloszlás: a mintából hiányzik a ${missingClass} referenciaesemény. A ROC-AUC matematikailag nem definiált.`,
      isDegenerate: true,
      matematikaiHelyesseg: true, // a guard védelem helyesen lefutott
      gazdasagiStatusz: 'NEM_KALIBRÁLHATÓ',
    };
  }

  // DEGENERÁLT ESET 2: Zéró variancia az indikátorértékekben
  const allValues = observations.map((o) => o.val);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const isZeroVariance = Math.abs(maxVal - minVal) < 1e-9;

  // FPR számítása a jelölt küszöbön:
  let fpCount = 0;
  let tnCount = 0;
  let tpCount = 0;
  let fnCount = 0;

  observations.forEach((obs) => {
    const predictedAlarm = meta.kuszobTipus === '>' ? obs.val > meta.kuszobErtek : obs.val < meta.kuszobErtek;
    if (!obs.actualStress) {
      if (predictedAlarm) fpCount++;
      else tnCount++;
    } else {
      if (predictedAlarm) tpCount++;
      else fnCount++;
    }
  });

  const totalNegatives = fpCount + tnCount;
  const fpr = totalNegatives > 0 ? (fpCount / totalNegatives) * 100 : 0;

  // Wilcoxon-Mann-Whitney AUC statisztika
  let auc = 0.5;
  if (isZeroVariance) {
    auc = 0.5;
  } else {
    let concordantPairs = 0;
    let tiedPairs = 0;

    positiveValues.forEach((posVal) => {
      negativeValues.forEach((negVal) => {
        if (meta.kuszobTipus === '>') {
          if (posVal > negVal) concordantPairs += 1;
          else if (Math.abs(posVal - negVal) < 1e-9) tiedPairs += 0.5;
        } else {
          if (posVal < negVal) concordantPairs += 1;
          else if (Math.abs(posVal - negVal) < 1e-9) tiedPairs += 0.5;
        }
      });
    });

    auc = (concordantPairs + tiedPairs) / (positiveValues.length * negativeValues.length);
  }

  const boundedAuc = Math.max(0.0, Math.min(1.0, auc));

  let indoklas = '';
  let gazdasagiStatusz: 'STATISZTIKAILAG_VALIDÁLT' | 'JELÖLT' | 'NEM_KALIBRÁLHATÓ' = 'JELÖLT';

  if (isZeroVariance) {
    indoklas = 'Zéró variancia: az indikátor értékei konstansok a mintában, nincs diszkriminációs erő (AUC = 0.50).';
    gazdasagiStatusz = 'JELÖLT';
  } else if (boundedAuc >= 0.75 && fpr <= 15) {
    indoklas = `Magas diszkriminációs erő (AUC: ${boundedAuc.toFixed(2)}), alacsony téves riasztási arány (${fpr.toFixed(1)}%). A küszöb statisztikailag validálható.`;
    gazdasagiStatusz = 'STATISZTIKAILAG_VALIDÁLT';
  } else if (boundedAuc < 0.75) {
    indoklas = `Mérsékelt vagy alacsony AUC (${boundedAuc.toFixed(2)} < 0.75). A jelölt küszöb még nem validálható, jelölt státuszban marad.`;
    gazdasagiStatusz = 'JELÖLT';
  } else {
    indoklas = `Magas téves riasztási ráta (${fpr.toFixed(1)}% > 15%). További szűrés vagy perzisztencia-feltétel szükséges.`;
    gazdasagiStatusz = 'JELÖLT';
  }

  const isSynthetic = meta.alapertelmezettDRL === 'HOZZÁFÉRÉS_KÉRDÉSES' || meta.alapertelmezettDRL === 'NEM_ELÉRHETŐ';
  if (isSynthetic) {
    indoklas += ' (Figyelem: Az adatok minősége bizonytalan vagy becsült, éles felügyeleti döntéshez független adatforrás szükséges.)';
  }

  return {
    auc: Math.round(boundedAuc * 100) / 100,
    fpr: Math.round(fpr * 10) / 10,
    indoklas,
    isZeroVariance,
    szintetikusFigyelmeztetes: isSynthetic,
    matematikaiHelyesseg: true,
    gazdasagiStatusz,
  };
}

/**
 * Létrehozza a teljes Threshold_Calibration nyilvántartást
 */
export function generateThresholdCalibrationRegister(
  allMeta: IndicatorMeta[],
  historyRows: QuarterDataRow[]
): CalibrationItem[] {
  return allMeta.map((meta) => {
    const backtest = runThresholdBacktest(meta, historyRows);

    let finalStatus = meta.kuszobStatusz;
    if (backtest.isDegenerate || backtest.auc === null) {
      finalStatus = 'NEM_KALIBRÁLHATÓ';
    } else if (meta.alapertelmezettDRL !== 'HOZZÁFÉRÉS_KÉRDÉSES' && meta.alapertelmezettDRL !== 'NEM_ELÉRHETŐ') {
      finalStatus = backtest.gazdasagiStatusz;
    } else {
      finalStatus = 'JELÖLT';
    }

    return {
      sorId: meta.sorId,
      foid: meta.foid,
      nev: meta.nev,
      jeloltKuszob: meta.jeloltKuszob,
      kuszobErtek: meta.kuszobErtek,
      kuszobTipus: meta.kuszobTipus,
      bazisIdoszak: '2023Q1–2024Q4',
      auc: backtest.auc !== null ? Math.round(backtest.auc * 100) / 100 : null,
      fpr: backtest.fpr,
      drl: meta.alapertelmezettDRL,
      statusz: finalStatus,
      indoklas: backtest.indoklas,
      utolsoFrissites: '2026-10-28',
    };
  });
}
