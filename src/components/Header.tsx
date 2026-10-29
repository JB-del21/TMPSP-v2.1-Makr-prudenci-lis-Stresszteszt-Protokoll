/**
 * TMPSP v2.1 Header Komponens
 * Megfelel a Top Bar Contract szabályainak:
 * 1. Zóna: Egysoros márkanév (TMPSP v2.1)
 * 2. Zóna: Breadcrumb és Negyedév-választó
 * 3. Zóna: Rendszerállapot jelző és Export gomb
 */

import React from 'react';
import { Download, FileSpreadsheet, ShieldAlert, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { ALL_QUARTERS } from '../data/tmpspData';
import { StateMachineStatus } from '../engine/types';

interface HeaderProps {
  currentQuarter: string;
  onQuarterChange: (q: string) => void;
  globalStatus: StateMachineStatus;
  adatminosegiAllapot?: 'TELJES' | 'HIÁNYOS';
  isSynthetic: boolean;
  isProjection?: boolean;
  onExportXlsx: () => void;
  onExportCsv: () => void;
  activeViewTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentQuarter,
  onQuarterChange,
  globalStatus,
  adatminosegiAllapot = 'TELJES',
  isSynthetic,
  isProjection = false,
  onExportXlsx,
  onExportCsv,
  activeViewTitle,
}) => {
  const getStatusBadge = () => {
    switch (globalStatus) {
      case 'PIROS':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-950/80 border border-red-700 text-red-300 rounded text-xs font-semibold uppercase tracking-wider">
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
            <span>PIROS – Formális Felülvizsgálat</span>
          </div>
        );
      case 'SÁRGA - ELŐZETES':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-950/80 border border-amber-600 text-amber-200 rounded text-xs font-semibold uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>SÁRGA – Előzetes Okfeltárás</span>
          </div>
        );
      case 'KORRIGÁLT ZÖLD':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-950/80 border border-emerald-600 text-emerald-300 rounded text-xs font-semibold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>KORRIGÁLT ZÖLD (Adathiba kiszűrve)</span>
          </div>
        );
      case 'NEM_ELLENŐRIZHETŐ (ADATHIÁNY)':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-600 text-slate-300 rounded text-xs font-semibold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            <span>ADATHIÁNY – Nem Ellenőrizhető</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded text-xs font-semibold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>ZÖLD – Prudens Monitoring</span>
          </div>
        );
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between gap-6 shrink-0 sticky top-0 z-30">
      {/* 1. ZÓNA: Márkanév és nézetnév */}
      <div className="flex items-center gap-4">
        <span className="text-lg font-bold text-white tracking-tight whitespace-nowrap">
          TMPSP <span className="text-blue-500 font-mono text-sm font-semibold">v2.1</span>
        </span>
        <div className="h-4 w-px bg-slate-700 hidden sm:block" />
        <span className="text-xs text-slate-400 hidden sm:inline whitespace-nowrap font-medium">
          {activeViewTitle}
        </span>
      </div>

      {/* 2. ZÓNA: Negyedév-választó és Pilot jelzés */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded">
          <span className="text-xs text-slate-400 whitespace-nowrap">Időszak:</span>
          <select
            value={currentQuarter}
            onChange={(e) => onQuarterChange(e.target.value)}
            className="bg-transparent text-xs font-mono font-semibold text-white focus:outline-none cursor-pointer"
          >
            {ALL_QUARTERS.map((q) => (
              <option key={q} value={q} className="bg-slate-900 text-white">
                {q} {q === '2024Q1' ? '(Pilot Teszt)' : q.startsWith('2025') || q.startsWith('2026') ? '(Projekció)' : '(Bázis)'}
              </option>
            ))}
          </select>
        </div>

        {isSynthetic && (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 hidden md:inline">
            SZINTETIKUS PILOT
          </span>
        )}

        {isProjection && (
          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600 shadow-sm animate-pulse">
            PROJEKCIÓ – nem megfigyelés
          </span>
        )}
      </div>

      {/* 3. ZÓNA: Állapotjelző és Export Akciók */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-2">
          {getStatusBadge()}
          <span
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold uppercase tracking-wider border ${
              adatminosegiAllapot === 'TELJES'
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                : 'bg-amber-950/80 border-amber-600 text-amber-300'
            }`}
            title={
              adatminosegiAllapot === 'TELJES'
                ? 'Minden mérési sorhoz rendelkezésre áll igazolt vagy proxy adat'
                : 'Legalább egy mérési sornál adathiány vagy kérdéses hozzáférés áll fenn'
            }
          >
            Adatminőség: {adatminosegiAllapot}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportXlsx}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors whitespace-nowrap shadow-sm cursor-pointer"
            title="7 Munkalapos Excel (XLSX) Munkafüzet letöltése"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel Export</span>
          </button>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded transition-colors whitespace-nowrap border border-slate-700 cursor-pointer"
            title="CSV Adatfolyam letöltése"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
};
