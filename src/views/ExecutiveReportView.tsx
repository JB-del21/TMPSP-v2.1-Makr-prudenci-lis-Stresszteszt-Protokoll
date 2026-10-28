/**
 * TMPSP v2.1 Vezetői Jelentés (Executive Report)
 * Nyomtatható és PDF-be menthető jegybanki előterjesztési sablon
 * MNB Pénzügyi Stabilitási Tanács formátumban.
 */

import React from 'react';
import { Printer, Download, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { IndicatorCalculationResult, IntegratedStateResult, MainIndicatorMeta } from '../engine/types';

interface ExecutiveReportViewProps {
  currentQuarter: string;
  integratedState: IntegratedStateResult;
  indicatorCalcs: Record<string, IndicatorCalculationResult>;
  mainIndicators: MainIndicatorMeta[];
}

export const ExecutiveReportView: React.FC<ExecutiveReportViewProps> = ({
  currentQuarter,
  integratedState,
  indicatorCalcs,
  mainIndicators,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Műveleti Sáv (Nyomtatáskor elrejtve) */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">
            MNB Vezetői Jelentés Előnézet ({currentQuarter})
          </h2>
          <p className="text-xs text-slate-400">
            A Pénzügyi Stabilitási Tanács elé terjeszthető formális kockázati jelentés sablon.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded transition-colors shadow-sm cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Nyomtatás / Mentés PDF-ként</span>
        </button>
      </div>

      {/* Nyomtatható Jegybanki Dokumentum */}
      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-md border border-slate-200 max-w-4xl mx-auto font-sans">
        {/* Intézményi Fejléc */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-slate-500 block">
              Szigorúan Bizalmas · Döntéshozatalt Előkészítő Elemzés
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
              MAGYAR NEMZETI BANK · PÉNZÜGYI STABILITÁSI TANÁCS
            </h1>
            <p className="text-sm font-semibold text-slate-700">
              Tematikus Makroprudenciális Stresszteszt-Protokoll (TMPSP v2.1)
            </p>
          </div>

          <div className="text-right text-xs font-mono text-slate-600 shrink-0">
            <div>Dokumentum: <strong className="text-slate-900 font-bold">MNB-PST-{currentQuarter}-MEMO</strong></div>
            <div>Dátum: <strong>2026. október 28.</strong></div>
            <div>Időszak: <strong className="text-slate-900">{currentQuarter}</strong></div>
          </div>
        </div>

        {/* 1. Vezetői Összefoglaló és Besorolás */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2.5">
            1. Vezetői Összefoglaló és Rendszerszintű Kockázati Besorolás
          </h2>
          <div className="p-3.5 bg-slate-50 border border-slate-300 rounded mb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-600 block uppercase">
                Megállapított TMPSP Rendszerállapot ({currentQuarter})
              </span>
              <span className="text-base font-bold font-mono text-slate-900">
                {integratedState.globalisStatusz}
              </span>
            </div>
            <div className="text-right text-xs text-slate-600">
              <span>Előírt Intézkedési Kötelezettség:</span>
              <strong className="block text-slate-900 font-semibold">{integratedState.prioritasosAkcio}</strong>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed text-justify">
            A TMPSP v2.1 mérési protokoll alapján a hazai lakhatási és lakáshitel-piac {currentQuarter}-es adatai a megfigyelt sávban feszültséget mutatnak a hitelhozzáférési rátában (1.2a) és a forgalmi sebességben (2.1 DOM olló). Ugyanakkor a perzisztencia-feltételek nem teljesülése, a hiányzó éves bázisadatok, valamint az adatminőségi korlátok (HOZZÁFÉRÉS_KÉRDÉSES a banki elutasítási kódoknál) miatt <strong>formális jogszabályi/makroprudenciális beavatkozás nem indokolt</strong>. A rendszer helyesen, konzervatív módon kizárta a téves piros riasztást, és 15 napos célzott banki és KHR adategyeztetést rendel el.
          </p>
        </section>

        {/* 2. Négy Modul Kockázati Mátrixa */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2.5">
            2. A 4 Modul Kockázati Értékelése
          </h2>
          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
              <tr>
                <th className="py-2 px-2.5 border-r border-slate-300">Modul</th>
                <th className="py-2 px-2.5 border-r border-slate-300">Státusz</th>
                <th className="py-2 px-3 border-r border-slate-300">Kulcsmutatók & Küszöbátlépések</th>
                <th className="py-2 px-3">Elrendelt Intézkedés</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {(['M1', 'M2', 'M3', 'M4'] as const).map((mId) => {
                const mod = integratedState.modulok[mId];
                return (
                  <tr key={mId}>
                    <td className="py-2 px-2.5 font-bold font-mono border-r border-slate-300 align-top">
                      {mId}
                    </td>
                    <td className="py-2 px-2.5 font-bold font-mono border-r border-slate-300 align-top">
                      <span className={mod.statusz === 'PIROS' ? 'text-red-700' : mod.statusz === 'SÁRGA - ELŐZETES' ? 'text-amber-700' : 'text-emerald-700'}>
                        {mod.statusz}
                      </span>
                    </td>
                    <td className="py-2 px-3 border-r border-slate-300 text-slate-700 align-top">
                      {mod.kivaltoIndikatorok.length > 0 ? (
                        <ul className="list-disc list-inside space-y-0.5">
                          {mod.kivaltoIndikatorok.map((ind, i) => (
                            <li key={i}>{ind}</li>
                          ))}
                        </ul>
                      ) : (
                        <span>Minden indikátor a prudens sávban.</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-800 font-medium align-top">
                      {mod.akcioterv}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* 3. 11 Főindikátor és 15 Mérési Sor Értékei */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2.5">
            3. Részletes Mérési Adatsorok ({currentQuarter})
          </h2>
          <table className="w-full text-left text-[11px] border border-slate-300">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
              <tr>
                <th className="py-1.5 px-2 border-r border-slate-300 font-mono">Sor_ID</th>
                <th className="py-1.5 px-2 border-r border-slate-300 font-mono">Fő_ID</th>
                <th className="py-1.5 px-3 border-r border-slate-300">Megnevezés</th>
                <th className="py-1.5 px-2 text-right border-r border-slate-300 font-mono">Tény / Számított</th>
                <th className="py-1.5 px-2 border-r border-slate-300 font-mono">Jelölt Küszöb</th>
                <th className="py-1.5 px-2 border-r border-slate-300 font-mono">DRL</th>
                <th className="py-1.5 px-2 font-mono">Státusz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mainIndicators.map((main) =>
                main.meresiSorIds.map((sorId) => {
                  const calc = indicatorCalcs[sorId];
                  if (!calc) return null;
                  return (
                    <tr key={sorId}>
                      <td className="py-1 px-2 font-mono font-bold border-r border-slate-300">{sorId}</td>
                      <td className="py-1 px-2 font-mono text-slate-500 border-r border-slate-300">{main.foid}</td>
                      <td className="py-1 px-3 border-r border-slate-300 text-slate-800">
                        {main.nev} ({sorId})
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold border-r border-slate-300 tabular-nums">
                        {calc.formazottErtek}
                      </td>
                      <td className="py-1 px-2 font-mono text-slate-600 border-r border-slate-300">
                        {calc.kuszobTipus} {calc.kuszobErtek}
                      </td>
                      <td className="py-1 px-2 font-mono text-[10px] border-r border-slate-300">{calc.drl}</td>
                      <td className="py-1 px-2 font-mono text-[10px]">{calc.kuszobStatusz}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        {/* 4. Döntési Javaslat és Aláírás */}
        <section className="border-t border-slate-300 pt-4 mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
            4. Döntési Javaslat a Pénzügyi Stabilitási Tanács Részére
          </h2>
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1 mb-8">
            <li>A Tanács vegye tudomásul a {currentQuarter}-es TMPSP v2.1 monitoring eredményét és az előzetes Sárga besorolást.</li>
            <li>A Tanács rendelje el a Bankfelügyeleti és Hitelregiszter Főosztály részére a banki elutasítási kódok (1.3) felülvizsgálatát 15 munkanapon belül.</li>
            <li>A Tanács hatalmazza fel a Makroprudenciális Főosztályt a kényszerértékesítési LGD-shift (2.4) behajtási adatainak célzott bekérésére.</li>
          </ol>

          <div className="flex justify-between items-end pt-6 border-t border-slate-300 text-xs text-slate-600 font-mono">
            <div>
              <span>Készítette: Makroprudenciális és Pénzügyi Stabilitási Elemzői Munkacsoport</span>
            </div>
            <div className="text-right">
              <span className="block border-t border-slate-400 pt-1 w-48 text-center text-slate-800 font-bold">
                Pénzügyi Stabilitási Igazgató
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
