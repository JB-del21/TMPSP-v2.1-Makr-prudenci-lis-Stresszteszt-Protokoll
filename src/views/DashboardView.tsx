/**
 * TMPSP v2.1 Vezérlőpult & Véges Állapotgép Nézet
 * Megjeleníti a formális állapotgépet, a 4 modul státuszát,
 * és a 11 főindikátort a 15 mérési sor részmérőszámaival.
 */

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  ExternalLink
} from 'lucide-react';
import {
  IndicatorCalculationResult,
  IntegratedStateResult,
  MainIndicatorMeta,
  ModuleId
} from '../engine/types';
import { ActiveTab } from '../components/Sidebar';

interface DashboardViewProps {
  currentQuarter: string;
  integratedState: IntegratedStateResult;
  indicatorCalcs: Record<string, IndicatorCalculationResult>;
  mainIndicators: MainIndicatorMeta[];
  onSelectQuarter: (q: string) => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentQuarter,
  integratedState,
  indicatorCalcs,
  mainIndicators,
  onSelectQuarter,
  onNavigateTab,
}) => {
  const getModuleStatusBadge = (status: string) => {
    switch (status) {
      case 'PIROS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-950 text-red-300 border border-red-700">
            <AlertOctagon className="w-3 h-3 text-red-400" /> PIROS
          </span>
        );
      case 'SÁRGA - ELŐZETES':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-600">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> SÁRGA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ZÖLD
          </span>
        );
    }
  };

  const currentStatus = integratedState.globalisStatusz;

  return (
    <div className="space-y-6">
      {/* Pilot Figyelmeztető Értesítés */}
      {integratedState.szintetikusFigyelmeztetes && (
        <div className="p-3.5 bg-blue-950/40 border border-blue-800 rounded-lg flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-200">
                Szintetikus Pilot Futás Érvényben (2024Q1 Referencia)
              </p>
              <p className="text-[11px] text-blue-300/80 mt-0.5">
                A megjelenített értékek szimulációs tesztadatok. A rendszer konzervatív szabályai kizárják a hamis zöld/piros riasztást: a JTM kiszorulás (1.3) egynegyedéves jelzése és az LGD hiánya (2.4) miatt az állapot előzetes sárga.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('tests')}
            className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0 px-2 py-1 bg-blue-900/50 rounded border border-blue-700 cursor-pointer"
          >
            <span>Motorteszt futtatása</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Állapotgép Vizuális Folyamatábra (Finite State Machine Visualizer) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Véges Állapotgép Döntési Folyamatábra (FSM)
            </h2>
            <p className="text-xs text-slate-400">
              Negyedév: <span className="font-mono text-slate-200">{currentQuarter}</span> · Konzervatív perzisztencia- és adathiány-kezelés
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Aktuális Globális Állapot</span>
            <span className="text-xs font-bold text-white font-mono">{currentStatus}</span>
          </div>
        </div>

        {/* FSM Lépések diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Csomópont 1: ZÖLD */}
          <div
            className={`p-3.5 rounded-lg border transition-all ${
              currentStatus === 'ZÖLD'
                ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500'
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> 1. ZÖLD
              </span>
              <span className="text-[10px] font-mono text-slate-500">Monitoring</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Minden indikátor a prudens sávban. Nincs küszöbátlépés és az adatminőség legalább PROXY.
            </p>
          </div>

          {/* Csomópont 2: SÁRGA (Előzetes) */}
          <div
            className={`p-3.5 rounded-lg border transition-all ${
              currentStatus === 'SÁRGA - ELŐZETES'
                ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500 shadow-md'
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> 2. SÁRGA (Előzetes)
              </span>
              <span className="text-[10px] font-mono text-amber-500/80">Okfeltárás</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Küszöbátlépés VAGY adathiány / kérdéses hozzáférés. Kötelező 15 napos belső adategyeztetés.
            </p>
          </div>

          {/* Csomópont 3: KORRIGÁLT ZÖLD */}
          <div
            className={`p-3.5 rounded-lg border transition-all ${
              currentStatus === 'KORRIGÁLT ZÖLD'
                ? 'bg-teal-950/60 border-teal-500 ring-1 ring-teal-500'
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-teal-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> 3. Korrigált Zöld
              </span>
              <span className="text-[10px] font-mono text-slate-500">Visszavonás</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Az adategyeztetés igazolta, hogy a sárga jelzés adathiba vagy technikai elcsúszás volt.
            </p>
          </div>

          {/* Csomópont 4: PIROS */}
          <div
            className={`p-3.5 rounded-lg border transition-all ${
              currentStatus === 'PIROS'
                ? 'bg-red-950/60 border-red-500 ring-1 ring-red-500'
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-red-400 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5" /> 4. PIROS
              </span>
              <span className="text-[10px] font-mono text-red-500/80">Felülvizsgálat</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              ≥2 modulban perzisztens (≥2Q) romlás VAGY azonnali kényszerértékesítési likviditási bypass (+20pp).
            </p>
          </div>
        </div>

        {/* FSM Döntési diagnózis */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Szűk keresztmetszet:</span>
            <span className="text-slate-400">{integratedState.szukKeresztmetszet}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-blue-400">Előírt akció:</span>
            <span className="text-slate-300">{integratedState.prioritasosAkcio}</span>
          </div>
        </div>
      </div>

      {/* 4 Modul Összefoglaló Kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(['M1', 'M2', 'M3', 'M4'] as ModuleId[]).map((mId) => {
          const mod = integratedState.modulok[mId];
          const tabMap: Record<ModuleId, ActiveTab> = { M1: 'm1', M2: 'm2', M3: 'm3', M4: 'm4' };
          return (
            <div
              key={mId}
              onClick={() => onNavigateTab(tabMap[mId])}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-blue-400 transition-colors">
                    {mId}
                  </span>
                  {getModuleStatusBadge(mod.statusz)}
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                  {mod.modulNev}
                </h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                  {mod.indoklas}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 group-hover:text-slate-300">
                <span>Részletes modul adatlap</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 11 Főindikátor és a 15 Mérési Sor Részletes Mátrixa */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              11 Főindikátor & 15 Mérési Sor Relációs Mátrixa ({currentQuarter})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Kettéválasztott mutatók (1.2a/b és 3.1a/b) egzakt számláló/nevező hányadosai és küszöbállapota
            </p>
          </div>
          <button
            onClick={() => onSelectQuarter('2024Q1')}
            className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 font-mono transition-colors cursor-pointer"
          >
            2024Q1 Pilot betöltése
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="py-2.5 px-3 font-mono">Fő_ID</th>
                <th className="py-2.5 px-3 font-mono">Sor_ID</th>
                <th className="py-2.5 px-4">Indikátor Megnevezés</th>
                <th className="py-2.5 px-3 text-right font-mono">Számított Érték</th>
                <th className="py-2.5 px-3 font-mono">Jelölt Küszöb</th>
                <th className="py-2.5 px-3 font-mono">DRL Státusz</th>
                <th className="py-2.5 px-3 font-mono">Küszöb Státusz</th>
                <th className="py-2.5 px-4">Értékelési Diagnózis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {mainIndicators.map((main) => {
                return main.meresiSorIds.map((sorId, idx) => {
                  const calc = indicatorCalcs[sorId];
                  if (!calc) return null;

                  const isBreached = calc.atlepte;
                  const isCandidate = calc.kuszobStatusz === 'JELÖLT';

                  return (
                    <tr
                      key={sorId}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-slate-400 font-semibold">
                        {idx === 0 ? main.foid : ''}
                      </td>
                      <td className="py-2.5 px-3 text-blue-400 font-bold">
                        {sorId}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-200">
                        {idx === 0 ? (
                          <div>
                            <span className="font-semibold text-white">{main.nev}</span>
                            {main.meresiSorIds.length > 1 && (
                              <span className="text-[11px] text-slate-400 block font-normal">
                                Részmutató: {sorId === '1.2a' ? 'Egyedi adós hozzáférés' : sorId === '1.2b' ? 'Volumen jóváhagyás' : sorId === '3.1a' ? 'Túlterhelt háztartások' : 'MTR egyéni medián'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="pl-3 border-l border-slate-700">
                            <span className="text-slate-300 text-xs">
                              {sorId === '1.2b' ? '1.2b Volumenarány megvágás' : '3.1b Medián Terhelési Ráta (MTR)'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-white tabular-nums">
                        {calc.formazottErtek}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {calc.kuszobTipus} {calc.kuszobErtek}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            calc.drl === 'IGAZOLT'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : calc.drl === 'PROXY'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : calc.drl === 'HOZZÁFÉRÉS_KÉRDÉSES'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}
                        >
                          {calc.drl}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            calc.kuszobStatusz === 'STATISZTIKAILAG_VALIDÁLT'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {calc.kuszobStatusz}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-sans text-xs">
                        {calc.adathiany ? (
                          <span className="text-slate-400 italic">Adathiány (Bypass nem ellenőrizhető)</span>
                        ) : isBreached ? (
                          <span className={isCandidate ? 'text-amber-400' : 'text-red-400 font-semibold'}>
                            {calc.reszletesStatusz}
                          </span>
                        ) : (
                          <span className="text-emerald-400">Sávban (Normál)</span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
