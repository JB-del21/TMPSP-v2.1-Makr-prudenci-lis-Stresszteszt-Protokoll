/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { ModuleView } from './views/ModuleView';
import { CalibrationView } from './views/CalibrationView';
import { ScenarioView } from './views/ScenarioView';
import { AuditView } from './views/AuditView';
import { TestCenterView } from './views/TestCenterView';
import { ExecutiveReportView } from './views/ExecutiveReportView';
import {
  ALL_QUARTERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_QUARTERLY_DATA,
  MAIN_INDICATORS,
  MEASUREMENT_SERIES_META
} from './data/tmpspData';
import { calculateIndicatorValue } from './engine/calculator';
import { evaluateIntegratedStateMachine } from './engine/stateMachine';
import { generateThresholdCalibrationRegister } from './engine/calibration';
import { runAllEngineTests } from './engine/testSuite';
import { exportCsvStream, exportTmpspToExcel } from './utils/exportXlsx';
import { IndicatorCalculationResult, QuarterDataRow, ModuleId, DataOrigin } from './engine/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentQuarter, setCurrentQuarter] = useState<string>('2024Q1');
  const [quarterlyData, setQuarterlyData] = useState<QuarterDataRow[]>(INITIAL_QUARTERLY_DATA);
  const [metadata, setMetadata] = useState(MEASUREMENT_SERIES_META);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  // Operátori kulcs szigorúan csak memóriában (nem menthető localStorage/sessionStorage/URL/console-ba)
  const [operatorKey, setOperatorKey] = useState<string>('');

  // Automata tesztek állapota
  const testResults = useMemo(() => runAllEngineTests(), []);
  const testPassedCount = testResults.filter((t) => t.sikeres).length;

  // Számítási motor futtatása az aktuális negyedévre
  const indicatorCalcs: Record<string, IndicatorCalculationResult> = useMemo(() => {
    const calcs: Record<string, IndicatorCalculationResult> = {};
    metadata.forEach((meta) => {
      const row = quarterlyData.find(
        (r) => r.negyedev === currentQuarter && r.sorId === meta.sorId
      );
      if (row) {
        calcs[meta.sorId] = calculateIndicatorValue(row, meta, quarterlyData);
      }
    });
    return calcs;
  }, [currentQuarter, quarterlyData, metadata]);

  // Negyedév adat-eredetének meghatározása a sorok eredet mezőjéből
  const currentQuarterOrigin: DataOrigin = useMemo(() => {
    const row = quarterlyData.find((r) => r.negyedev === currentQuarter);
    if (row && row.eredet) {
      return row.eredet;
    }
    if (currentQuarter === '2024Q1') return 'SZINTETIKUS_PILOT_2024Q1';
    if (currentQuarter.startsWith('2025') || currentQuarter.startsWith('2026')) {
      return 'PROJEKCIÓ_2025_2026';
    }
    return 'HISTÓRIKUS_BÁZIS_2023_2024';
  }, [currentQuarter, quarterlyData]);

  const isSynthetic = currentQuarterOrigin === 'SZINTETIKUS_PILOT_2024Q1';
  const isProjection = currentQuarterOrigin === 'PROJEKCIÓ_2025_2026';

  // Véges állapotgép döntési lefutása az eredet alapján
  const integratedState = useMemo(() => {
    return evaluateIntegratedStateMachine(currentQuarter, indicatorCalcs, currentQuarterOrigin);
  }, [currentQuarter, indicatorCalcs, currentQuarterOrigin]);

  // Küszöb-kalibrációs nyilvántartás (2023Q1–2024Q4 bázison)
  const calibrationData = useMemo(() => {
    return generateThresholdCalibrationRegister(metadata, quarterlyData);
  }, [metadata, quarterlyData]);

  // Sor adat módosítása SZIGORÚAN csak sikeres POST /api/audit után
  const handleUpdateRow = async (
    updatedRow: QuarterDataRow,
    oldRow: QuarterDataRow,
    newCalculatedValue: number | null
  ): Promise<{ success: boolean; error?: string }> => {
    if (!operatorKey || !operatorKey.trim()) {
      return {
        success: false,
        error: 'HIÁNYZÓ_KULCS: Adatmódosítás csak érvényes operátori kulccsal (Bearer hitelesítés) naplózható.',
      };
    }

    const bemenetiPayload = {
      negyedev: updatedRow.negyedev,
      sorId: updatedRow.sorId,
      regi: {
        szamlalo: oldRow.szamlaloErtek ?? null,
        nevezo: oldRow.nevezoErtek ?? null,
        szamitott: oldRow.szamitottErtek ?? null,
      },
      uj: {
        szamlalo: updatedRow.szamlaloErtek ?? null,
        nevezo: updatedRow.nevezoErtek ?? null,
        szamitott: newCalculatedValue,
      },
    };

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorKey.trim()}`,
        },
        body: JSON.stringify({
          negyedev: updatedRow.negyedev,
          esemenyTipus: 'KORREKCIÓ',
          kepletVerzio: 'v2.1-correction',
          elozetesHipotezis: `Adatmódosítás és korrekció rögzítése a(z) ${updatedRow.sorId} mérési sorban (${updatedRow.negyedev}).`,
          nullhipotezis: 'Nincs mérési eltérés a korábbi értékekhez képest.',
          mertEltérés: `Számláló: ${oldRow.szamlaloErtek ?? 'n.a.'} -> ${updatedRow.szamlaloErtek ?? 'n.a.'}, Nevező: ${oldRow.nevezoErtek ?? 'n.a.'} -> ${updatedRow.nevezoErtek ?? 'n.a.'}`,
          döntésiEredmény: `Auditált korrekció jóváhagyva. Új számított érték: ${newCalculatedValue ?? 'n.a.'}`,
          felelős: 'Operátori Adatmódosítás',
          bemenetiPayload,
        }),
      });

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errorMsg = `HTTP ${res.status}: ${errData.error}`;
          }
        } catch {
          const rawText = await res.text();
          if (rawText) errorMsg = `HTTP ${res.status}: ${rawText}`;
        }
        return { success: false, error: errorMsg };
      }

      const resData = await res.json();
      if (resData.record) {
        setAuditLogs((prev) => [...prev, resData.record]);
      }

      // CSAK sikeres válasz esetén frissítjük a state-et:
      setQuarterlyData((prev) =>
        prev.map((r) =>
          r.negyedev === updatedRow.negyedev && r.sorId === updatedRow.sorId
            ? { ...updatedRow, szamitottErtek: newCalculatedValue !== null ? newCalculatedValue : updatedRow.szamitottErtek }
            : r
        )
      );

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: `Hálózati hiba: ${err?.message || 'Nem sikerült elérni az audit szervert.'}`,
      };
    }
  };

  // Pilot adatok visszaállítása
  const handleResetPilotData = () => {
    setQuarterlyData(INITIAL_QUARTERLY_DATA);
  };

  // Kalibráció újrafuttatása
  const handleRerunBacktest = () => {
    // Frissíti a kalibrációs bázist
    setMetadata([...MEASUREMENT_SERIES_META]);
  };

  // Export műveletek
  const handleExportXlsx = () => {
    exportTmpspToExcel(metadata, quarterlyData, calibrationData, auditLogs);
  };

  const handleExportCsv = () => {
    exportCsvStream(quarterlyData);
  };

  // Aktív nézet címének feloldása
  const getActiveViewTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Vezérlőpult & Véges Állapotgép (FSM)';
      case 'm1':
        return 'Modul 1: Hitelkoncentráció és JTM';
      case 'm2':
        return 'Modul 2: Fedezeti Likviditás és Piacmegoszlás';
      case 'm3':
        return 'Modul 3: Reálgazdasági és Demográfiai Lánc';
      case 'm4':
        return 'Modul 4: Költségvetési és Garanciális Kockázat';
      case 'calibration':
        return 'Küszöb-Kalibrációs Regiszter (AUC / ROC)';
      case 'scenarios':
        return 'Makroprudenciális Sokk-Teszt Szimulátor';
      case 'audit':
        return 'Megmásíthatatlan WORM Auditnapló (SHA-256)';
      case 'tests':
        return 'Képletmotor és Állapotgép Tesztközpont';
      case 'report':
        return 'MNB Pénzügyi Stabilitási Tanács Vezetői Riport';
      default:
        return 'TMPSP v2.1 Elemzői Rendszer';
    }
  };

  // Modul szűrő segédfüggvény
  const renderModuleView = (modId: ModuleId) => {
    const moduleTitles: Record<ModuleId, { id: ModuleId; nev: string; leiras: string }> = {
      M1: {
        id: 'M1',
        nev: '1. Modul – Hitelkoncentráció és JTM-Kiszorulás',
        leiras:
          'A jövedelmi decilisek szerinti koncentráció (HHI), az 550k–800k sáv hozzáférési és volumenaránya, a JTM miatti dokumentált elutasítások és a 40% feletti adósságfék terheltség mérése.',
      },
      M2: {
        id: 'M2',
        nev: '2. Modul – Fedezeti Likviditás és Piaci Kettészakadás',
        leiras:
          'A használt középkategória és új prémium forgási sebességének ollója (DOM), az alku-rés (hirdetési vs. NAV ár), az LTV-puffer eróziója és a kényszerértékesítési LGD-shift likviditási bypass.',
      },
      M3: {
        id: 'M3',
        nev: '3. Modul – Reálgazdasági és Demográfiai Visszacsatolás',
        leiras:
          'A lakhatási költségtúlterheltség (HCOR >40% ráta), a medián terhelési ráta (MTR), a 18–41 éves korosztály belső vándorlási egyenlege és az építőipari KKV csődráta.',
      },
      M4: {
        id: 'M4',
        nev: '4. Modul – Költségvetési és Garanciális Kockázat',
        leiras:
          'Az állami kezességvállalási állomány és várható lehívás GDP-arányosan (ÁKK / Garantiqa), valamint a lakástámogatási kiadások adómegtérülési hatékonysága.',
      },
    };

    const modIndicators = metadata.filter((m) => m.modulId === modId);
    return (
      <ModuleView
        moduleId={modId}
        moduleMeta={moduleTitles[modId]}
        moduleEval={integratedState.modulok[modId]}
        indicators={modIndicators}
        currentQuarter={currentQuarter}
        quarterlyData={quarterlyData}
        indicatorCalcs={indicatorCalcs}
        operatorKey={operatorKey}
        onOperatorKeyChange={setOperatorKey}
        onUpdateRow={handleUpdateRow}
        onResetPilotData={handleResetPilotData}
      />
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 260px Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        testPassedCount={testPassedCount}
        totalTests={testResults.length}
      />

      {/* Fő Munkafelület Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Bar Contract szerinti Header */}
        <Header
          currentQuarter={currentQuarter}
          onQuarterChange={setCurrentQuarter}
          globalStatus={integratedState.globalisStatusz}
          isSynthetic={isSynthetic}
          isProjection={isProjection}
          onExportXlsx={handleExportXlsx}
          onExportCsv={handleExportCsv}
          activeViewTitle={getActiveViewTitle()}
        />

        {/* Görgethető Fő Tartalom */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                currentQuarter={currentQuarter}
                integratedState={integratedState}
                indicatorCalcs={indicatorCalcs}
                mainIndicators={MAIN_INDICATORS}
                onSelectQuarter={setCurrentQuarter}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'm1' && renderModuleView('M1')}
            {activeTab === 'm2' && renderModuleView('M2')}
            {activeTab === 'm3' && renderModuleView('M3')}
            {activeTab === 'm4' && renderModuleView('M4')}

            {activeTab === 'calibration' && (
              <CalibrationView
                calibrationData={calibrationData}
                onRerunBacktest={handleRerunBacktest}
              />
            )}

            {activeTab === 'scenarios' && <ScenarioView />}

            {activeTab === 'audit' && (
              <AuditView
                initialLogs={auditLogs}
                currentQuarter={currentQuarter}
                operatorKey={operatorKey}
                onOperatorKeyChange={setOperatorKey}
              />
            )}

            {activeTab === 'tests' && <TestCenterView />}

            {activeTab === 'report' && (
              <ExecutiveReportView
                currentQuarter={currentQuarter}
                integratedState={integratedState}
                indicatorCalcs={indicatorCalcs}
                mainIndicators={MAIN_INDICATORS}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
