/**
 * TMPSP v2.1 Modul Munkafelület (Modul 1-4)
 * Részletes indikátorkártyák, számláló/nevező szerkesztés és DRL választó.
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  HelpCircle,
  AlertOctagon,
  Lock
} from 'lucide-react';
import {
  DataReadinessLevel,
  IndicatorCalculationResult,
  IndicatorMeta,
  ModuleEvaluationResult,
  ModuleId,
  QuarterDataRow
} from '../engine/types';

interface ModuleViewProps {
  moduleId: ModuleId;
  moduleMeta: { id: ModuleId; nev: string; leiras: string };
  moduleEval: ModuleEvaluationResult;
  indicators: IndicatorMeta[];
  currentQuarter: string;
  quarterlyData: QuarterDataRow[];
  indicatorCalcs: Record<string, IndicatorCalculationResult>;
  operatorKey?: string;
  onOperatorKeyChange?: (k: string) => void;
  onUpdateRow: (
    updatedRow: QuarterDataRow,
    oldRow: QuarterDataRow,
    calculatedValue: number | null
  ) => Promise<{ success: boolean; error?: string }>;
  onResetPilotData: () => void;
}

export const ModuleView: React.FC<ModuleViewProps> = ({
  moduleId,
  moduleMeta,
  moduleEval,
  indicators,
  currentQuarter,
  quarterlyData,
  indicatorCalcs,
  operatorKey = '',
  onOperatorKeyChange,
  onUpdateRow,
  onResetPilotData,
}) => {
  // Lokális szerkesztési állapot
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editNumerator, setEditNumerator] = useState<number>(0);
  const [editDenominator, setEditDenominator] = useState<number>(1);
  const [editDrl, setEditDrl] = useState<DataReadinessLevel>('IGAZOLT');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [isSavingRowId, setIsSavingRowId] = useState<string | null>(null);

  const startEdit = (row: QuarterDataRow) => {
    setEditingRowId(row.sorId);
    setEditNumerator(row.szamlaloErtek ?? 0);
    setEditDenominator(row.nevezoErtek ?? 1);
    setEditDrl(row.drl);
  };

  const saveEdit = async (row: QuarterDataRow, meta: IndicatorMeta) => {
    setIsSavingRowId(row.sorId);
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[row.sorId];
      return next;
    });

    let newCalculated: number | null = null;
    if (meta.sorId === '1.1') {
      newCalculated = editNumerator;
    } else if (editDenominator !== 0) {
      newCalculated = Number(((editNumerator / editDenominator) * 100).toFixed(4));
    }

    const updatedRow: QuarterDataRow = {
      ...row,
      szamlaloErtek: editNumerator,
      nevezoErtek: editDenominator,
      szamitottErtek: newCalculated !== null ? newCalculated : undefined,
      drl: editDrl,
    };

    const result = await onUpdateRow(updatedRow, row, newCalculated);
    setIsSavingRowId(null);

    if (!result.success) {
      setRowErrors((prev) => ({
        ...prev,
        [row.sorId]: result.error || 'A módosítás naplózása sikertelen.',
      }));
      // Nem zárjuk be a szerkesztőt, így nem vész el az érték!
      return;
    }

    setEditingRowId(null);
  };

  return (
    <div className="space-y-6">
      {/* Modul Fejléc Kártya */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                {moduleId} Modul
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">Időszak: {currentQuarter}</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              {moduleMeta.nev}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {moduleMeta.leiras}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Modul Státusz
              </span>
              <span
                className={`text-xs font-bold font-mono ${
                  moduleEval.statusz === 'PIROS'
                    ? 'text-red-400'
                    : moduleEval.statusz === 'SÁRGA - ELŐZETES'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {moduleEval.statusz}
              </span>
            </div>

            {currentQuarter === '2024Q1' && (
              <button
                onClick={onResetPilotData}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition-colors cursor-pointer"
                title="Visszaállítja a 2024Q1 pilot referenciaértékeket"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pilot Bázis</span>
              </button>
            )}
          </div>
        </div>

        {/* Diagnózis és Intézkedés */}
        <div className="mt-4 pt-3.5 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-semibold text-slate-300 block mb-1">Módszertani Értékelés:</span>
            <p className="text-slate-400 leading-relaxed">{moduleEval.indoklas}</p>
          </div>
          <div>
            <span className="font-semibold text-blue-400 block mb-1">Előírt Eljárásrend (Akcióterv):</span>
            <p className="text-slate-300 leading-relaxed">{moduleEval.akcioterv}</p>
          </div>
        </div>
      </div>

      {/* Indikátorkártyák listája */}
      <div className="space-y-4">
        {indicators.map((meta) => {
          const calc = indicatorCalcs[meta.sorId];
          const currentRow = quarterlyData.find(
            (r) => r.negyedev === currentQuarter && r.sorId === meta.sorId
          );
          if (!calc || !currentRow) return null;

          const isEditing = editingRowId === meta.sorId;

          return (
            <div
              key={meta.sorId}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Bal oszlop: Metaadatok és Képlet */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800">
                      {meta.sorId}
                    </span>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {meta.nev}
                    </h3>
                    <span className="text-xs font-mono text-slate-500">
                      (Fő: {meta.foid})
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-mono">
                    Képlet: {meta.kepletLeiras}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    <div>
                      <span className="text-slate-500">Adatgazda:</span>{' '}
                      <span className="text-slate-300">{meta.adatgazda}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Felelős:</span>{' '}
                      <span className="text-slate-300">{meta.felelos}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Küszöb:</span>{' '}
                      <span className="text-slate-200 font-mono font-semibold">
                        {meta.jeloltKuszob}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Jobb oszlop: Érték és Szerkesztési Kontrollok */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                      Számított Érték
                    </span>
                    <span
                      className={`text-xl font-bold font-mono tabular-nums ${
                        calc.adathiany
                          ? 'text-slate-500'
                          : calc.atlepte
                          ? calc.kuszobStatusz === 'JELÖLT'
                            ? 'text-amber-400'
                            : 'text-red-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {calc.formazottErtek}
                    </span>
                  </div>

                  {/* DRL és Küszöb Státusz Badge */}
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                        calc.drl === 'IGAZOLT'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : calc.drl === 'PROXY'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : calc.drl === 'HOZZÁFÉRÉS_KÉRDÉSES'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-red-950 text-red-300 border border-red-800'
                      }`}
                    >
                      DRL: {calc.drl}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {meta.kuszobStatusz}
                    </span>
                  </div>
                </div>
              </div>

              {/* Számláló és Nevező Szerkesztési Szekció */}
              <div className="mt-4 pt-3.5 border-t border-slate-800/80">
                {isEditing ? (
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-700 space-y-3">
                    <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Adatbevitel és Értékszerkesztés</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {meta.sorId} · {currentQuarter}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          {meta.szamlaloNev}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={editNumerator}
                          onChange={(e) => setEditNumerator(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          {meta.nevezoNev}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={editDenominator}
                          onChange={(e) => setEditDenominator(parseFloat(e.target.value) || 1)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          Adatminőség (DRL)
                        </label>
                        <select
                          value={editDrl}
                          onChange={(e) => setEditDrl(e.target.value as DataReadinessLevel)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono cursor-pointer"
                        >
                          <option value="IGAZOLT">IGAZOLT (Hatósági adat)</option>
                          <option value="PROXY">PROXY (Becsült/Aggregált)</option>
                          <option value="HOZZÁFÉRÉS_KÉRDÉSES">HOZZÁFÉRÉS_KÉRDÉSES (Banki belső)</option>
                          <option value="NEM_ELÉRHETŐ">NEM_ELÉRHETŐ (Hiányos)</option>
                        </select>
                      </div>
                    </div>

                    {/* Operátori kulcs beviteli mező, ha még nincs megadva */}
                    {(!operatorKey || operatorKey.trim() === '') && (
                      <div className="bg-slate-900/90 border border-amber-600/60 rounded-lg p-2.5">
                        <label className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          Operátori kulcs (WORM naplózáshoz kötelező):
                        </label>
                        <input
                          type="password"
                          autoComplete="off"
                          value={operatorKey}
                          onChange={(e) => onOperatorKeyChange?.(e.target.value)}
                          placeholder="Adja meg az operátori kulcsot (csak memóriában tárolva)..."
                          className="w-full bg-slate-950 border border-amber-700 rounded px-2.5 py-1 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    )}

                    {/* Hibaüzenet, ha a POST /api/audit sikertelen volt */}
                    {rowErrors[meta.sorId] && (
                      <div className="p-2.5 bg-red-950/90 border border-red-700 rounded text-xs text-red-200 flex items-start gap-2">
                        <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold block text-red-300">
                            Adatmódosítás elutasítva (WORM naplózási hiba):
                          </strong>
                          <span className="font-mono text-[11px] text-red-200">
                            {rowErrors[meta.sorId]}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRowId(null);
                        }}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Mégse
                      </button>
                      <button
                        type="button"
                        disabled={isSavingRowId === meta.sorId}
                        onClick={() => saveEdit(currentRow, meta)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-semibold rounded transition-colors cursor-pointer"
                      >
                        <Save className={`w-3.5 h-3.5 ${isSavingRowId === meta.sorId ? 'animate-spin' : ''}`} />
                        <span>{isSavingRowId === meta.sorId ? 'Auditálás...' : 'Mentés és Újraszámítás'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3 text-slate-400 font-mono">
                      <span>
                        <strong className="text-slate-300 font-normal">Számláló:</strong>{' '}
                        {currentRow.szamlaloErtek !== undefined ? currentRow.szamlaloErtek.toLocaleString('hu-HU') : 'n.a.'}
                      </span>
                      <span>/</span>
                      <span>
                        <strong className="text-slate-300 font-normal">Nevező:</strong>{' '}
                        {currentRow.nevezoErtek !== undefined ? currentRow.nevezoErtek.toLocaleString('hu-HU') : 'n.a.'}
                      </span>
                      <span>·</span>
                      <span className="text-slate-300 font-sans">
                        Diagnózis: <strong className="font-medium text-white">{calc.reszletesStatusz}</strong>
                      </span>
                    </div>

                    <button
                      onClick={() => startEdit(currentRow)}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors cursor-pointer shrink-0"
                    >
                      Számok szerkesztése
                    </button>
                  </div>
                )}
              </div>

              {/* Cáfolati Feltétel Kiegészítés */}
              <div className="mt-3 text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded border border-slate-800/60 flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-300">Cáfolati feltétel:</span>{' '}
                  {meta.cafolatiFeltetel}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
