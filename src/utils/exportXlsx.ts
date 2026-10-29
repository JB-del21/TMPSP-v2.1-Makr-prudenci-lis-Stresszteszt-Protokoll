/**
 * TMPSP v2.1 Multi-Sheet Excel (XLSX) Exportáló Motor
 * 7 Munkalap: README, Indicator_Register, Quarterly_Data, Stress_Scenarios,
 * Threshold_Calibration, Alert_State, Audit_Log.
 */

import * as XLSX from 'xlsx';
import { AuditRecord, CalibrationItem, IndicatorMeta, QuarterDataRow } from '../engine/types';

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
  const scenarioHeaders = ['Forgatókönyv', 'Reáljövedelem_Sokk', 'DOM_Megnyúlás', 'Ingatlanár_Eltérés', 'Építőipari_Csődsokk', 'Várható_Tőkeveszteség', 'Garancialehívás_GDP'];
  const scenarioRows = [
    ['Alappálya (Baseline)', '0%', '0 nap', '+3.5%', 'Normál trend', 'Tőkepuffer < 10%', '1.96%'],
    ['Kedvezőtlen sokk (Adverse)', '-15%', '+40 nap', '-10.0%', '+50% csődráta', 'Tőkepuffer 25-40%', '2.85%'],
    ['Szélső sokk (Severe)', '-25%', '+90 nap', '-20.0%', '+100% csődráta', 'Tőkepuffer > 65%', '3.90%'],
  ];
  const wsScenario = XLSX.utils.aoa_to_sheet([scenarioHeaders, ...scenarioRows]);
  XLSX.utils.book_append_sheet(wb, wsScenario, 'Stress_Scenarios');

  // 5. Lap: Threshold_Calibration
  const calibHeaders = ['Mérési_sor_ID', 'Főindikátor_ID', 'Indikátor_Név', 'Jelölt_Küszöb', 'Bázisidőszak', 'AUC_ROC', 'Téves_Riasztás_FPR', 'DRL', 'Státusz', 'Indoklás'];
  const calibRows = calibrationData.map((c) => [
    c.sorId, c.foid, c.nev, c.jeloltKuszob, c.bazisIdoszak, c.auc !== null ? c.auc : 'N/A', `${c.fpr}%`, c.drl, c.statusz, c.indoklas
  ]);
  const wsCalib = XLSX.utils.aoa_to_sheet([calibHeaders, ...calibRows]);
  XLSX.utils.book_append_sheet(wb, wsCalib, 'Threshold_Calibration');

  // 6. Lap: Alert_State
  const alertHeaders = ['Negyedév', 'Adat_Eredete', 'Globális_Állapot', 'Modul_1', 'Modul_2', 'Modul_3', 'Modul_4', 'Szűk_Keresztmetszet', 'Prioritásos_Intézkedés'];
  const alertRows = [
    ['2023Q1', 'HISTÓRIKUS_BÁZIS_2023_2024', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'Nincs', 'Rutin monitoring'],
    ['2023Q2', 'HISTÓRIKUS_BÁZIS_2023_2024', 'SÁRGA - ELŐZETES', 'SÁRGA', 'SÁRGA', 'SÁRGA', 'ZÖLD', 'Kamatsokk és hozzáférési szűkülés', 'Banki elutasítási vizsgálat'],
    ['2023Q3', 'HISTÓRIKUS_BÁZIS_2023_2024', 'SÁRGA - ELŐZETES', 'SÁRGA', 'SÁRGA', 'SÁRGA', 'ZÖLD', 'Piaci likviditás mélypont', 'Fedezeti puffer felülvizsgálat'],
    ['2023Q4', 'HISTÓRIKUS_BÁZIS_2023_2024', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'Enyhülő nyomás', 'Rutin monitoring'],
    ['2024Q1', 'SZINTETIKUS_PILOT_2024Q1', 'SÁRGA - ELŐZETES', 'SÁRGA', 'SÁRGA', 'ZÖLD', 'ZÖLD', '550k-800k hozzáférés szűkülés, DOM olló', 'Kötelező 15 napos adategyeztetés KHR-rel és bankokkal'],
    ['2024Q2', 'HISTÓRIKUS_BÁZIS_2023_2024', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'Normalizálódó forgalom', 'Rutin monitoring'],
    ['2024Q3', 'HISTÓRIKUS_BÁZIS_2023_2024', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'Stabil hiteldinamika', 'Rutin monitoring'],
    ['2024Q4', 'HISTÓRIKUS_BÁZIS_2023_2024', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'Báziszárás és kalibrációs felülvizsgálat', 'Éves makroprudenciális jelentés'],
    ['2025Q1', 'PROJEKCIÓ_2025_2026', 'SÁRGA - ELŐZETES', 'SÁRGA', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'Előrejelzett JTM szigorodás', 'Modellkockázati monitoring'],
    ['2025Q2', 'PROJEKCIÓ_2025_2026', 'SÁRGA - ELŐZETES', 'SÁRGA', 'SÁRGA', 'ZÖLD', 'ZÖLD', 'Projekciós DOM nyílás', 'Kockázati pályák futtatása'],
    ['2025Q3', 'PROJEKCIÓ_2025_2026', 'SÁRGA - ELŐZETES', 'SÁRGA', 'SÁRGA', 'SÁRGA', 'ZÖLD', 'Kedvezőtlen sokk pálya határán', 'Stresszteszt kalibráció'],
    ['2025Q4', 'PROJEKCIÓ_2025_2026', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'Stabilizálódó előrejelzés', 'Rutin projekciós monitoring'],
    ['2026Q1', 'PROJEKCIÓ_2025_2026', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'Projekciós bázis', 'Rutin monitoring'],
    ['2026Q2', 'PROJEKCIÓ_2025_2026', 'SÁRGA - ELŐZETES', 'SÁRGA', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'Előrejelzett hitelkereslet szűkülés', 'Banki hitelezési felmérés'],
    ['2026Q3', 'PROJEKCIÓ_2025_2026', 'SÁRGA - ELŐZETES', 'SÁRGA', 'SÁRGA', 'ZÖLD', 'ZÖLD', 'Hipotetikus likviditási feszültség', 'Érzékenységi vizsgálat'],
    ['2026Q4', 'PROJEKCIÓ_2025_2026', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'ZÖLD', 'Horizont zárása', 'Hosszú távú felülvizsgálat'],
  ];
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
