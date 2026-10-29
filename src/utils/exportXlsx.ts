/**
 * TMPSP v2.1 Multi-Sheet Excel (XLSX) Exportáló Motor
 * 7 Munkalap: README, Indicator_Register, Quarterly_Data, Stress_Scenarios,
 * Threshold_Calibration, Alert_State, Audit_Log.
 */

import * as XLSX from 'xlsx';
import { AuditRecord, CalibrationItem, IndicatorCalculationResult, IndicatorMeta, QuarterDataRow } from '../engine/types';
import { calculateIndicatorValue } from '../engine/calculator';
import { evaluateIntegratedStateMachine } from '../engine/stateMachine';
import { MEASUREMENT_SERIES_META, INITIAL_QUARTERLY_DATA } from '../data/tmpspData';
import { PRESET_SCENARIOS, calculateScenarioEffects, SCENARIO_UNCALIBRATED_NOTICE } from '../engine/scenarioModel';

export interface AlertStateExportRow {
  negyedev: string;
  eredet: string;
  globalisStatusz: string;
  adatminosegiAllapot: string;
  modul1: string;
  modul2: string;
  modul3: string;
  modul4: string;
  kivaltoJelzesek: string;
  figyeloJelzesek: string;
  szukKeresztmetszet: string;
  prioritasosAkcio: string;
}

/**
 * Dinamikus Alert_State sor-generáló segédfüggvény (egységtesztelhető)
 */
export function generateAlertStateExportRows(
  dataRows: QuarterDataRow[] = INITIAL_QUARTERLY_DATA
): AlertStateExportRow[] {
  const quarters = Array.from(new Set(dataRows.map((r) => r.negyedev)));

  return quarters.map((q) => {
    const qRows = dataRows.filter((r) => r.negyedev === q);
    const origin = qRows[0]?.eredet || 'HISTÓRIKUS_BÁZIS_2023_2024';

    const calcs: Record<string, IndicatorCalculationResult> = {};
    MEASUREMENT_SERIES_META.forEach((meta) => {
      const row = qRows.find((r) => r.sorId === meta.sorId);
      if (row) {
        calcs[meta.sorId] = calculateIndicatorValue(row, meta, dataRows);
      } else {
        calcs[meta.sorId] = calculateIndicatorValue(
          {
            negyedev: q,
            sorId: meta.sorId,
            foid: meta.foid,
            eredet: origin,
            drl: meta.alapertelmezettDRL,
          },
          meta,
          dataRows
        );
      }
    });

    const integratedState = evaluateIntegratedStateMachine(q, calcs, origin);

    const m1 = integratedState.modulok.M1;
    const m2 = integratedState.modulok.M2;
    const m3 = integratedState.modulok.M3;
    const m4 = integratedState.modulok.M4;

    const kivaltok = [m1, m2, m3, m4].flatMap((m) => m.kivaltoIndikatorok);
    const figyelok = [m1, m2, m3, m4].flatMap((m) => m.figyelojelzesek);

    return {
      negyedev: q,
      eredet: origin,
      globalisStatusz: integratedState.globalisStatusz,
      adatminosegiAllapot: integratedState.adatminosegiAllapot,
      modul1: m1.statusz,
      modul2: m2.statusz,
      modul3: m3.statusz,
      modul4: m4.statusz,
      kivaltoJelzesek: kivaltok.length > 0 ? kivaltok.join('; ') : 'Nincs',
      figyeloJelzesek: figyelok.length > 0 ? figyelok.join('; ') : 'Nincs',
      szukKeresztmetszet: integratedState.szukKeresztmetszet,
      prioritasosAkcio: integratedState.prioritasosAkcio,
    };
  });
}

export function exportTmpspToExcel(
  metadata: IndicatorMeta[],
  quarterlyData: QuarterDataRow[],
  calibrationData: CalibrationItem[],
  auditLogs: AuditRecord[]
): void {
  const wb = XLSX.utils.book_new();

  // 1. Lap: README
  const readmeData = [
    ['TMPSP v2.1 – TEMATIKUS MAKROPRUDENCIÁLIS STRESSZTESZT-PROTOKOLL'],
    ['Készült: MNB Pénzügyi Stabilitási Tanács módszertani specifikációja alapján'],
    ['Verzió: 2.1 (Validációs és Adatgyűjtési Munkafüzet)'],
    ['Dátum: 2026-10-28'],
    [''],
    ['SZIGORÚ MÓDSZERTANI ÉS ADATMINŐSÉGI SZABÁLYOK:'],
    ['1. A SZINTETIKUS ADAT NEM TÉNYADAT: A 2024Q1 pilot adatok szimulációs célt szolgálnak, nem minősülnek valós hatósági megfigyelésnek.'],
    ['2. AZ ADATHIÁNY NEM ZÖLD JELZÉS: Bázishiány (pl. YoY -10pp), elégtelen perzisztencia vagy HOZZÁFÉRÉS_KÉRDÉSES DRL mellett az állapot legfeljebb SÁRGA - ELŐZETES lehet.'],
    ['3. A HASH NEM EGYENLŐ A WORM TÁROLÁSSAL: A SHA-256 az integritás ellenőrzését szolgálja, a tárolást szerveroldali append-only napló védi.'],
    ['4. 11 FŐINDIKÁTOR / 15 MÉRÉSI SOR: A szétválasztott részmutatók (1.2a/b és 3.1a/b) megakadályozzák a kérelmi halmozódást és a torzításokat.'],
    [''],
    ['MUNKALAPOK ÁTTEKINTÉSE:'],
    ['Indicator_Register: A 15 mérési sor képlete, adatgazdája, DRL-je és jelölt küszöbe.'],
    ['Quarterly_Data: 2023Q1–2026Q4 negyedéves tény-, pilot- és projekciós adatok.'],
    ['Stress_Scenarios: Alappálya, Kedvezőtlen és Szélső sokk tesztparaméterei.'],
    ['Threshold_Calibration: Visszatesztelt AUC, FPR mutatók és küszöbstátuszok.'],
    ['Alert_State: Állapotgép lefutások és negyedéves intézkedések.'],
    ['Audit_Log: WORM naplóidőbélyegek, hipotézisek és SHA-256 lenyomatok.'],
  ];
  const wsReadme = XLSX.utils.aoa_to_sheet(readmeData);
  XLSX.utils.book_append_sheet(wb, wsReadme, 'README');

  // 2. Lap: Indicator_Register
  const indicatorHeaders = [
    'Mérési_sor_ID', 'Főindikátor_ID', 'Modul', 'Indikátor_Neve', 'Képlet_Leírása',
    'Számláló_Neve', 'Nevező_Neve', 'Mértékegység', 'Alapértelmezett_DRL', 'Adatgazda',
    'Jelölt_Küszöb', 'Küszöb_Típus', 'Küszöb_Érték', 'Küszöb_Státusz', 'Felelős_Osztály'
  ];
  const indicatorRows = metadata.map((m) => [
    m.sorId, m.foid, m.modulId, m.nev, m.kepletLeiras,
    m.szamlaloNev, m.nevezoNev, m.egyseg, m.alapertelmezettDRL, m.adatgazda,
    m.jeloltKuszob, m.kuszobTipus, m.kuszobErtek, m.kuszobStatusz, m.felelos
  ]);
  const wsIndicators = XLSX.utils.aoa_to_sheet([indicatorHeaders, ...indicatorRows]);
  XLSX.utils.book_append_sheet(wb, wsIndicators, 'Indicator_Register');

  // 3. Lap: Quarterly_Data
  const qDataHeaders = [
    'Negyedév', 'Mérési_sor_ID', 'Főindikátor_ID', 'Adat_Eredete',
    'Számláló_Érték', 'Nevező_Érték', 'Számított_Érték', 'Adatminőség_DRL'
  ];
  const qDataRows = quarterlyData.map((r) => [
    r.negyedev, r.sorId, r.foid, r.eredet,
    r.szamlaloErtek ?? '', r.nevezoErtek ?? '', r.szamitottErtek ?? '', r.drl
  ]);
  const wsQData = XLSX.utils.aoa_to_sheet([qDataHeaders, ...qDataRows]);
  XLSX.utils.book_append_sheet(wb, wsQData, 'Quarterly_Data');

  // 4. Lap: Stress_Scenarios
  const scenarioHeaders = [
    'Forgatókönyv',
    'Reáljövedelem_Sokk',
    'DOM_Megnyúlás',
    'Ingatlanár_Eltérés',
    'Építőipari_Csődsokk',
    'Várható_Tőkeveszteség',
    'Garancialehívás_GDP',
    'Szimulált_Állapot',
    'Megjegyzés',
  ];
  const scenarioRows = PRESET_SCENARIOS.map((s) => {
    const res = calculateScenarioEffects(s.input);
    return [
      s.name,
      s.incomeText,
      s.domText,
      s.priceText,
      s.bankruptcyText,
      `${res.capitalBufferLoss.toFixed(1)}%`,
      `${res.guaranteeDrawRate.toFixed(2)}%`,
      res.expectedState,
      SCENARIO_UNCALIBRATED_NOTICE,
    ];
  });
  const wsScenario = XLSX.utils.aoa_to_sheet([
    [`TMPSP v2.1 Stressz-Forgatókönyvek – ${SCENARIO_UNCALIBRATED_NOTICE}`],
    [],
    scenarioHeaders,
    ...scenarioRows,
  ]);
  XLSX.utils.book_append_sheet(wb, wsScenario, 'Stress_Scenarios');

  // 5. Lap: Threshold_Calibration
  const calibHeaders = ['Mérési_sor_ID', 'Főindikátor_ID', 'Indikátor_Név', 'Jelölt_Küszöb', 'Bázisidőszak', 'AUC_ROC', 'Téves_Riasztás_FPR', 'DRL', 'Státusz', 'Indoklás'];
  const calibRows = calibrationData.map((c) => [
    c.sorId, c.foid, c.nev, c.jeloltKuszob, c.bazisIdoszak, c.auc !== null ? c.auc : 'N/A', `${c.fpr}%`, c.drl, c.statusz, c.indoklas
  ]);
  const wsCalib = XLSX.utils.aoa_to_sheet([calibHeaders, ...calibRows]);
  XLSX.utils.book_append_sheet(wb, wsCalib, 'Threshold_Calibration');

  // 6. Lap: Alert_State
  const alertHeaders = [
    'Negyedév',
    'Adat_Eredete',
    'Globális_Állapot',
    'Adatminőség_Állapot',
    'Modul_1',
    'Modul_2',
    'Modul_3',
    'Modul_4',
    'Kiváltó_Jelzések',
    'Figyelő_Jelzések',
    'Szűk_Keresztmetszet',
    'Prioritásos_Intézkedés',
  ];
  const alertExportRows = generateAlertStateExportRows(quarterlyData);
  const alertRows = alertExportRows.map((r) => [
    r.negyedev,
    r.eredet,
    r.globalisStatusz,
    r.adatminosegiAllapot,
    r.modul1,
    r.modul2,
    r.modul3,
    r.modul4,
    r.kivaltoJelzesek,
    r.figyeloJelzesek,
    r.szukKeresztmetszet,
    r.prioritasosAkcio,
  ]);
  const wsAlert = XLSX.utils.aoa_to_sheet([alertHeaders, ...alertRows]);
  XLSX.utils.book_append_sheet(wb, wsAlert, 'Alert_State');

  // 7. Lap: Audit_Log
  const auditHeaders = ['Azonosító', 'Időbélyeg_UTC', 'Előző_Hash', 'SHA256_Hash', 'Negyedév', 'Esemény', 'Képletverzió', 'Előzetes_Hipotézis', 'Döntési_Eredmény', 'Felelős'];
  const auditRows = auditLogs.map((a) => [
    a.id, a.timestamp, a.prevHash, a.hash, a.negyedev, a.esemenyTipus, a.kepletVerzio, a.elozetesHipotezis, a.döntésiEredmény, a.felelős
  ]);
  const wsAudit = XLSX.utils.aoa_to_sheet([auditHeaders, ...auditRows]);
  XLSX.utils.book_append_sheet(wb, wsAudit, 'Audit_Log');

  // Mentés fájlba
  XLSX.writeFile(wb, `TMPSP_v2.1_Validacios_Munkafuzet_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportCsvStream(quarterlyData: QuarterDataRow[]): void {
  const headers = ['Negyedev,SorId,FoId,Eredet,Szamlalo,Nevezo,SzamitottErtek,DRL'];
  const rows = quarterlyData.map((r) =>
    `"${r.negyedev}","${r.sorId}","${r.foid}","${r.eredet}",${r.szamlaloErtek ?? ''},${r.nevezoErtek ?? ''},${r.szamitottErtek ?? ''},"${r.drl}"`
  );
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `TMPSP_v2.1_Adatfolyam_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
