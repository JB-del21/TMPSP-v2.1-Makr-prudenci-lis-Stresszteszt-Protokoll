/**
 * TMPSP v2.1 Küszöb-Kalibráció és Visszatesztelés Munkatér
 * Megfelel a 'Threshold_Calibration' specifikációnak.
 * Számítja az AUC és False Positive Rate (FPR) mutatókat a 2023Q1–2024Q4 bázison.
 */

import React, { useState } from 'react';
import {
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { CalibrationItem, ThresholdStatus } from '../engine/types';

interface CalibrationViewProps {
  calibrationData: CalibrationItem[];
  onRerunBacktest: () => void;
}

export const CalibrationView: React.FC<CalibrationViewProps> = ({
  calibrationData,
  onRerunBacktest,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredData = calibrationData.filter((item) => {
    const matchesStatus = filterStatus === 'ALL' || item.statusz === filterStatus;
    const matchesSearch =
      item.sorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nev.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.foid.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const validatedCount = calibrationData.filter((c) => c.statusz === 'STATISZTIKAILAG_VALIDÁLT').length;
  const candidateCount = calibrationData.filter((c) => c.statusz === 'JELÖLT').length;

  return (
    <div className="space-y-6">
      {/* Fejléc és Statisztikai Összefoglaló */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                Threshold Governance
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">Bázisidőszak: 2023Q1–2024Q4 (8 Negyedév)</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              Küszöb-Kalibrációs Regiszter & Empirikus Visszatesztelés
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              A TMPSP v2.1 szabályai szerint a küszöbök nem válhatnak észrevétlenül tényekké. Éles riasztást kizárólag a 2023Q1–2024Q4 bázison visszatesztelt, igazolt AUC (&ge; 0,75) és alacsony téves riasztási ráta (FPR &le; 15%) mellett engedélyez az állapotgép.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRerunBacktest}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Visszateszt Újrafuttatása</span>
            </button>
          </div>
        </div>

        {/* Mutató kártyák */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Összes Küszöb</span>
              <span className="text-lg font-bold text-white font-mono">{calibrationData.length}</span>
            </div>
            <SlidersHorizontal className="w-5 h-5 text-slate-600" />
          </div>

          <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-900/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-emerald-400 uppercase tracking-wider block">Statisztikailag Validált</span>
              <span className="text-lg font-bold text-emerald-300 font-mono">{validatedCount}</span>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>

          <div className="p-3 bg-amber-950/30 rounded-lg border border-amber-900/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-amber-400 uppercase tracking-wider block">Jelölt (Nem Validált)</span>
              <span className="text-lg font-bold text-amber-300 font-mono">{candidateCount}</span>
            </div>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Szűrők és Kereső */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded border border-slate-700 flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Keresés indikátor azonosító vagy megnevezés alapján..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Státusz szűrő:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-white rounded px-2.5 py-1 font-mono cursor-pointer"
          >
            <option value="ALL">Összes mutató ({calibrationData.length})</option>
            <option value="STATISZTIKAILAG_VALIDÁLT">Csak Validált ({validatedCount})</option>
            <option value="JELÖLT">Csak Jelölt ({candidateCount})</option>
          </select>
        </div>
      </div>

      {/* Kalibrációs Táblázat */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="py-2.5 px-3 font-mono">Sor_ID</th>
                <th className="py-2.5 px-3 font-mono">Fő_ID</th>
                <th className="py-2.5 px-4">Indikátor Megnevezése</th>
                <th className="py-2.5 px-3 font-mono">Jelölt Küszöb</th>
                <th className="py-2.5 px-3 font-mono text-right">AUC (ROC)</th>
                <th className="py-2.5 px-3 font-mono text-right">Téves Riasztás (FPR)</th>
                <th className="py-2.5 px-3 font-mono">DRL Szint</th>
                <th className="py-2.5 px-3 font-mono">Kalibrációs Státusz</th>
                <th className="py-2.5 px-4">Visszatesztelési Indoklás</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredData.map((item) => {
                const isValidated = item.statusz === 'STATISZTIKAILAG_VALIDÁLT';
                return (
                  <tr key={item.sorId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-blue-400 font-bold">{item.sorId}</td>
                    <td className="py-3 px-3 text-slate-400">{item.foid}</td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-200">
                      {item.nev}
                    </td>
                    <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                      {item.jeloltKuszob}
                    </td>
                    <td className="py-3 px-3 text-right font-bold tabular-nums">
                      <span
                        className={
                          item.auc === null
                            ? 'text-slate-500'
                            : item.auc >= 0.75
                            ? 'text-emerald-400'
                            : item.auc >= 0.65
                            ? 'text-blue-400'
                            : 'text-amber-400'
                        }
                      >
                        {item.auc !== null ? item.auc.toFixed(2) : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold tabular-nums">
                      <span className={item.fpr <= 15 ? 'text-emerald-400' : 'text-red-400'}>
                        {item.fpr.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          item.drl === 'IGAZOLT'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : item.drl === 'PROXY'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {item.drl}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          isValidated
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {item.statusz}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-400 text-xs">
                      {item.indoklas}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Módszertani Megjegyzés */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-2">
        <h4 className="text-white font-semibold flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
          A Statisztikai Validáció Szigorú Feltételrendszere
        </h4>
        <p className="leading-relaxed">
          Egy indikátor jelölt küszöbe akkor és csakis akkor léptethető át <strong className="text-emerald-300">STATISZTIKAILAG_VALIDÁLT</strong> státuszba, ha:
        </p>
        <ul className="list-disc list-inside space-y-1 text-slate-300 ml-2">
          <li>A 2023Q1–2024Q4 bázison számított AUC (Receiver Operating Characteristic görbe alatti terület) eléri a legalább <strong>0,75</strong> értéket.</li>
          <li>A nem stresszes negyedévekben fellépő Téves Riasztási Ráta (False Positive Rate) nem haladja meg a <strong>15,0%</strong>-ot.</li>
          <li>Az adatminőség eléri a legalább <strong>PROXY</strong> szintet (a HOZZÁFÉRÉS_KÉRDÉSES vagy NEM_ELÉRHETŐ adatok még magas AUC esetén is JELÖLT státuszban maradnak).</li>
        </ul>
      </div>
    </div>
  );
};
