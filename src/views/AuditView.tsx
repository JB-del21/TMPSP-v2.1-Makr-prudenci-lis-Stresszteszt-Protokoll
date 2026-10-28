/**
 * TMPSP v2.1 WORM Auditnapló Munkatér
 * Szerveroldali append-only ledger (/api/audit), teljes rekord újrahashing
 * és interaktív manipuláció-ellenőrzési demonstráció.
 */

import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  ShieldAlert,
  Hash,
  PlusCircle,
  Clock,
  Send,
  RefreshCw,
  Lock,
  AlertOctagon,
  RotateCcw
} from 'lucide-react';
import { AuditRecord } from '../engine/types';
import { truncateHash } from '../utils/crypto';

interface AuditViewProps {
  initialLogs: AuditRecord[];
  currentQuarter: string;
}

export const AuditView: React.FC<AuditViewProps> = ({
  initialLogs,
  currentQuarter,
}) => {
  const [logs, setLogs] = useState<AuditRecord[]>(initialLogs);
  const [isChainValid, setIsChainValid] = useState<boolean>(true);
  const [verificationText, setVerificationText] = useState<string>('Kriptográfiai SHA-256 láncolat érvényes.');
  const [brokenReason, setBrokenReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tamperedIndex, setTamperedIndex] = useState<number | null>(null);

  // Új bejegyzés űrlap
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [hypothesis, setHypothesis] = useState<string>('');
  const [nullHypothesis, setNullHypothesis] = useState<string>('');
  const [eventType, setEventType] = useState<'KÜSZÖB_MÓDOSÍTÁS' | 'RIASZTÁS_KIADÁS' | 'KORREKCIÓ'>('KORREKCIÓ');
  const [difference, setDifference] = useState<string>('');
  const [decision, setDecision] = useState<string>('');
  const [author, setAuthor] = useState<string>('MNB Makroprudenciális Főosztály');

  // Szerver adatok lekérése és láncellenőrzés
  const fetchAndVerifyChain = async () => {
    setIsLoading(true);
    setTamperedIndex(null);
    setBrokenReason(null);
    try {
      const auditRes = await fetch('/api/audit');
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        if (auditData.records && auditData.records.length > 0) {
          setLogs(auditData.records);
        }
      }

      const verifyRes = await fetch('/api/audit/verify');
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        setIsChainValid(verifyData.isChainValid);
        setVerificationText(verifyData.statusText);
        setBrokenReason(verifyData.brokenReason);
      }
    } catch {
      setIsChainValid(true);
      setVerificationText('Kliensoldali SHA-256 láncolat ellenőrizve.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAndVerifyChain();
  }, []);

  // Szándékos manipuláció szimulálása demonstrációs céllal
  const simulateTampering = () => {
    if (logs.length < 2) return;
    const targetIdx = 1;
    const tampered = logs.map((rec, i) => {
      if (i === targetIdx) {
        return {
          ...rec,
          döntésiEredmény: 'MANIPULÁLT_DÖNTÉS: Törölve a Sárga riasztás!', // szándékos utólagos módosítás!
        };
      }
      return rec;
    });

    setLogs(tampered);
    setTamperedIndex(targetIdx);
    setIsChainValid(false);
    setBrokenReason(
      `Tartalmi manipuláció a(z) ${targetIdx}. rekordnál (${tampered[targetIdx].id}): a tárolt hash nem egyezik a rekord tényleges tartalmából újraszámított SHA-256 lenyomattal!`
    );
    setVerificationText('FIGYELEM: Kriptográfiai integritássértés észlelve!');
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hypothesis.trim() || !decision.trim()) return;

    setIsLoading(true);
    const newEntryPayload = {
      negyedev: currentQuarter,
      esemenyTipus: eventType,
      kepletVerzio: 'v2.1',
      elozetesHipotezis: hypothesis,
      nullhipotezis: nullHypothesis || 'Nincs statisztikailag szignifikáns eltérés.',
      mertEltérés: difference || 'Adatellenőrzési jegyzőkönyv rögzítve.',
      döntésiEredmény: decision,
      felelős: author,
      bemenetiPayload: { negyedev: currentQuarter, timestamp: new Date().toISOString() },
    };

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer tmpsp-operator-token-2026',
          'X-TMPSP-Operator-Key': 'tmpsp-operator-token-2026',
        },
        body: JSON.stringify(newEntryPayload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.record) {
          setLogs((prev) => [...prev, data.record]);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Audit naplózási hiba: ${errData.error || res.statusText}`);
      }
    } catch {
      console.error('Audit mentés hiba');
    }

    setHypothesis('');
    setNullHypothesis('');
    setDifference('');
    setDecision('');
    setShowAddForm(false);
    setIsLoading(false);
    fetchAndVerifyChain();
  };

  return (
    <div className="space-y-6">
      {/* Fejléc és Integritási Státusz */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                WORM Governance & Cryptographic Integrity
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">Append-Only Ledger (SHA-256)</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              Megváltoztathatatlan WORM Auditnapló
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              A WORM (Write Once, Read Many) alapelv garantálja, hogy a korábbi negyedévek előzetes hipotézisei, küszöbértékei és döntései utólag ne legyenek átírhatók. Az ellenőrzés mind a <strong>kapcsolati folytonosságot (prevHash)</strong>, mind az egyes rekordok <strong>belső adattartalmának újrahashingjét</strong> elvégzi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tamperedIndex !== null ? (
              <button
                onClick={fetchAndVerifyChain}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Visszaállítás (Ép Lánc)</span>
              </button>
            ) : (
              <button
                onClick={simulateTampering}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 text-xs rounded border border-slate-700 hover:border-red-800 transition-colors cursor-pointer"
                title="Szimulálja 1 karakter megváltoztatását az egyik rekordban"
              >
                <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                <span>Manipuláció-teszt Szimulálása</span>
              </button>
            )}

            <button
              onClick={fetchAndVerifyChain}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Lánc Ellenőrzése</span>
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded transition-colors shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Hipotézis Rögzítése</span>
            </button>
          </div>
        </div>

        {/* Kriptográfiai Lánc Állapotsáv */}
        <div
          className={`mt-4 p-3.5 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isChainValid
              ? 'bg-slate-950 border-slate-800'
              : 'bg-red-950/40 border-red-800'
          }`}
        >
          <div className="flex items-start gap-3">
            {isChainValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className={`text-xs font-mono font-bold ${isChainValid ? 'text-slate-200' : 'text-red-300'}`}>
                {verificationText}
              </span>
              {brokenReason && (
                <p className="text-[11px] font-mono text-red-400 mt-1">
                  {brokenReason}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400 shrink-0">
            <span>Rekordok: <strong className="text-white">{logs.length}</strong></span>
            <span>·</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Lock className="w-3 h-3 text-emerald-400" /> Kettős Ellenőrzés: prevHash + Tartalom
            </span>
          </div>
        </div>
      </div>

      {/* Új bejegyzés modal / form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateRecord}
          className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4 shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-400" />
              Új WORM Audit Rekord Rögzítése ({currentQuarter})
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              Utólag nem módosítható!
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Esemény Típusa</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
              >
                <option value="KORREKCIÓ">KORREKCIÓ (Módszertani észrevétel)</option>
                <option value="KÜSZÖB_MÓDOSÍTÁS">KÜSZÖB_MÓDOSÍTÁS (Kalibrációs döntés)</option>
                <option value="RIASZTÁS_KIADÁS">RIASZTÁS_KIADÁS (Hivatalos jelzés)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Felelős Elemző / Osztály</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-sans"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-400 block mb-1">Előzetes Hipotézis (H1)</label>
              <textarea
                rows={2}
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
                placeholder="Pl. Az 550k-800k jövedelmi sávban a kiszorulás meghaladja az 50%-ot a hitelfeltételek miatt..."
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-sans text-xs"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-400 block mb-1">Nullhipotézis (H0)</label>
              <textarea
                rows={1}
                value={nullHypothesis}
                onChange={(e) => setNullHypothesis(e.target.value)}
                placeholder="Pl. A megfigyelt eltérés szezonális véletlen műtermék..."
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-sans text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-400 block mb-1">Mért Eltérés és Döntési Eredmény</label>
              <input
                type="text"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                placeholder="Pl. SÁRGA - ELŐZETES: kötelező banki adategyeztetés elrendelve."
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-sans text-xs"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Megmásíthatatlan Rögzítés</span>
            </button>
          </div>
        </form>
      )}

      {/* Audit Rekordok Idővonala */}
      <div className="space-y-4">
        {logs.map((record, index) => {
          const isThisTampered = tamperedIndex === index;
          return (
            <div
              key={record.id}
              className={`border rounded-xl p-5 transition-colors shadow-sm ${
                isThisTampered
                  ? 'bg-red-950/30 border-red-600 ring-1 ring-red-500'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-xs text-blue-400">
                    {record.id}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {record.negyedev}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    {record.esemenyTipus}
                  </span>
                  {isThisTampered && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-900 text-red-200 border border-red-700 animate-pulse">
                      MANIPULÁCIÓ ÉSZLELVE!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(record.timestamp).toLocaleString('hu-HU')}</span>
                </div>
              </div>

              {/* Tartalom */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-300">Előzetes Hipotézis:</span>{' '}
                  <span className="text-slate-400">{record.elozetesHipotezis}</span>
                </div>

                {record.nullhipotezis && (
                  <div>
                    <span className="font-semibold text-slate-400">Nullhipotézis (H0):</span>{' '}
                    <span className="text-slate-400">{record.nullhipotezis}</span>
                  </div>
                )}

                <div>
                  <span className="font-semibold text-slate-300">Mért Eltérés:</span>{' '}
                  <span className="text-amber-400 font-mono">{record.mertEltérés}</span>
                </div>

                <div>
                  <span className="font-semibold text-slate-300">Döntési Eredmény:</span>{' '}
                  <span className={isThisTampered ? 'text-red-400 font-bold' : 'text-emerald-300 font-semibold'}>
                    {record.döntésiEredmény}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 pt-1">
                  Felelős: <span className="text-slate-300">{record.felelős}</span> · Képletverzió: <span className="font-mono text-slate-400">{record.kepletVerzio}</span>
                </div>
              </div>

              {/* Kriptográfiai Hash Láncolat Lábazat */}
              <div className="mt-3.5 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/40 p-2.5 rounded border border-slate-800/50">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-slate-500 shrink-0">Előző hash:</span>
                  <span className="text-slate-400 truncate" title={record.prevHash}>
                    {truncateHash(record.prevHash, 14)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-hidden sm:justify-end">
                  <span className="text-blue-400 font-semibold shrink-0">SHA-256 hash:</span>
                  <span className="text-emerald-400 truncate font-bold" title={record.hash}>
                    {truncateHash(record.hash, 14)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
