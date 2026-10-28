/**
 * TMPSP v2.1 Motor Tesztközpont Munkatér
 * Élőben futtatja a képletmotor és a véges állapotgép automatizált tesztcsomagját.
 * Parancssorból is futtatható: npm test
 */

import React, { useState } from 'react';
import {
  TerminalSquare,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  FileCode2,
  Filter
} from 'lucide-react';
import { runAllEngineTests, TestResult } from '../engine/testSuite';

export const TestCenterView: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>(() => runAllEngineTests());
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const handleRerun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setTestResults(runAllEngineTests());
      setIsRunning(false);
    }, 150);
  };

  const categories = ['ALL', ...Array.from(new Set(testResults.map((t) => t.kategoria)))];
  const filteredTests = selectedCategory === 'ALL'
    ? testResults
    : testResults.filter((t) => t.kategoria === selectedCategory);

  const passedCount = testResults.filter((t) => t.sikeres).length;
  const allPassed = passedCount === testResults.length;

  return (
    <div className="space-y-6">
      {/* Fejléc */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                Quality Assurance & Automated Verification
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">Specifikáció-első (TDD) Tesztfuttató</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              Képletmotor és Állapotgép Tesztközpont
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Az alábbi tesztcsomag közvetlenül a felülettől függetlenített matematikai motort és állapotgép-logikát ellenőrzi. Garanciát nyújt arra, hogy az adathiány nem válik zölddé, a bázishiány nem generál hamis riasztást, és a szintetikus pilot eredménye szigorúan Sárga - Előzetes marad.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRerun}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>Tesztek Újrafuttatása</span>
            </button>
          </div>
        </div>

        {/* Eredmény Összegző Kártya */}
        <div className="mt-5 p-4 bg-slate-950 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {allPassed ? (
              <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-950/80 border border-red-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
            )}
            <div>
              <span className="text-sm font-bold text-white block">
                {allPassed ? 'Minden motorteszt sikeresen lefutott (100% PASS)' : 'Hiba a motortesztek lefutásakor!'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Sikeres: <strong className="text-emerald-400">{passedCount}</strong> / {testResults.length} teszteset
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right font-mono text-xs">
            <span className="text-[11px] text-slate-500 block uppercase tracking-wider">
              CLI Parancs
            </span>
            <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-blue-300 font-bold inline-block mt-0.5">
              npm test
            </span>
          </div>
        </div>

        {/* Kategória Szűrő fülek */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-slate-500" /> Szűrés:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {cat === 'ALL' ? 'ÖSSZES (10)' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tesztesetek Részletes Listája */}
      <div className="space-y-4">
        {filteredTests.map((test) => {
          return (
            <div
              key={test.id}
              className={`p-5 rounded-xl border transition-colors shadow-sm ${
                test.sikeres
                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'bg-red-950/20 border-red-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {test.sikeres ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="font-mono font-bold text-xs text-blue-400">
                    {test.id}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {test.kategoria}
                  </span>
                  <span className="text-slate-600">·</span>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {test.nev}
                  </h3>
                </div>

                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                    test.sikeres
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {test.sikeres ? 'SIKERES (PASS)' : 'SIKERTELEN (FAIL)'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                {test.leiras}
              </p>

              {/* Várt vs Kapott összehasonlító blokk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block mb-0.5">Elvárt Kimenet:</span>
                  <span className="text-slate-300 font-medium">{test.vart}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Ténylegesen Kapott:</span>
                  <span className={test.sikeres ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {test.kapott}
                  </span>
                </div>
              </div>

              {test.reszletek && (
                <div className="mt-2 text-[11px] text-slate-400">
                  <span className="text-slate-500 font-mono">Részletek:</span> {test.reszletek}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
