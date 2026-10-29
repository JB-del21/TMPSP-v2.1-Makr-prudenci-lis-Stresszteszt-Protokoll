/**
 * TMPSP v2.1 Sokk-Teszt Szimulátor Munkatér
 * Alappálya, Kedvezőtlen és Szélső sokkok szimulációja dinamikus tőkepuffer- és garanciahatással.
 */

import React, { useState } from 'react';
import { Activity, AlertTriangle, ShieldAlert, Sparkles, RotateCcw } from 'lucide-react';
import { calculateScenarioEffects, SCENARIO_UNCALIBRATED_NOTICE } from '../engine/scenarioModel';

export const ScenarioView: React.FC = () => {
  const [incomeShock, setIncomeShock] = useState<number>(-15);
  const [domShock, setDomShock] = useState<number>(40);
  const [priceShock, setPriceShock] = useState<number>(-10);
  const [bankruptcyShock, setBankruptcyShock] = useState<number>(50);

  const setPreset = (type: 'baseline' | 'adverse' | 'severe') => {
    if (type === 'baseline') {
      setIncomeShock(0);
      setDomShock(0);
      setPriceShock(3.5);
      setBankruptcyShock(0);
    } else if (type === 'adverse') {
      setIncomeShock(-15);
      setDomShock(40);
      setPriceShock(-10);
      setBankruptcyShock(50);
    } else {
      setIncomeShock(-25);
      setDomShock(90);
      setPriceShock(-20);
      setBankruptcyShock(100);
    }
  };

  // Dinamikus számított hatások a közös modellfüggvényből
  const { capitalBufferLoss, guaranteeDrawRate, expectedState } = calculateScenarioEffects({
    incomeShock,
    domShock,
    priceShock,
    bankruptcyShock,
  });

  return (
    <div className="space-y-6">
      {/* Fejléc */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                Stress Testing Protocol
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">Nem Előrejelzés, hanem Sokk-Tűrési Teszt</span>
              <span className="text-slate-600">·</span>
              <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-950/80 text-amber-300 border border-amber-800/80 rounded-md">
                {SCENARIO_UNCALIBRATED_NOTICE}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-1">
              Makroprudenciális Sokk-Teszt Szimulátor
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              A TMPSP v2.1 a bankrendszer és a költségvetés ellenállóképességét teszteli kombinált reálgazdasági és ingatlanpiaci sokkok esetén. ({SCENARIO_UNCALIBRATED_NOTICE})
            </p>
          </div>

          {/* Gyors Sablonok */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreset('baseline')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition-colors cursor-pointer"
            >
              Alappálya
            </button>
            <button
              onClick={() => setPreset('adverse')}
              className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 text-xs rounded border border-amber-800 transition-colors cursor-pointer"
            >
              Kedvezőtlen (-15%)
            </button>
            <button
              onClick={() => setPreset('severe')}
              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-300 text-xs rounded border border-red-800 transition-colors cursor-pointer"
            >
              Szélső Sokk (-25%)
            </button>
          </div>
        </div>
      </div>

      {/* Szimulációs Vezérlők és Dinamikus Hatások */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bal 2 oszlop: Szimulációs Csúszkák */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Makrogazdasági és Piaci Sokkparaméterek
          </h3>

          <div className="space-y-4">
            {/* 1. Reáljövedelem sokk */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Reáljövedelem Sokk (Felső és Közép decilisek):</span>
                <span className="font-mono font-bold text-white tabular-nums">{incomeShock}%</span>
              </div>
              <input
                type="range"
                min="-35"
                max="5"
                step="1"
                value={incomeShock}
                onChange={(e) => setIncomeShock(parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Közvetlen hatás a JTM elutasítási rátára (1.3) és a lakhatási terhelésre (3.1a).
              </span>
            </div>

            {/* 2. DOM Megnyúlás */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Középkategóriás Értékesítési Idő (DOM) Növekedés:</span>
                <span className="font-mono font-bold text-white tabular-nums">+{domShock} nap</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="5"
                value={domShock}
                onChange={(e) => setDomShock(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                A DOM-arány (2.1) ollójának szétnyílása és a lassan forgó fedezeti állomány (2.3) növekedése.
              </span>
            </div>

            {/* 3. Ingatlanár sokk */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Ingatlanár Sokk (NAV tranzakciós ár):</span>
                <span className="font-mono font-bold text-white tabular-nums">{priceShock > 0 ? `+${priceShock}` : priceShock}%</span>
              </div>
              <input
                type="range"
                min="-30"
                max="10"
                step="1"
                value={priceShock}
                onChange={(e) => setPriceShock(parseInt(e.target.value, 10))}
                className="w-full accent-red-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Közvetlen LTV-puffer erózió és kényszerértékesítési LGD-shift (2.4).
              </span>
            </div>

            {/* 4. Építőipari csődsokk */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Építőipari KKV Csődrátájának Megugrása:</span>
                <span className="font-mono font-bold text-white tabular-nums">+{bankruptcyShock}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                step="10"
                value={bankruptcyShock}
                onChange={(e) => setBankruptcyShock(parseInt(e.target.value, 10))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Kínálati lánc elakadása és lakásépítési átadások csökkenése (3.3).
              </span>
            </div>
          </div>
        </div>

        {/* Jobb 1 oszlop: Számított Rendszerhatások */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Szimulált Tőke- és Garanciahatás
            </h3>

            <div className="space-y-4">
              {/* Tőkepuffer veszteség */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">
                  Várható Banki Tőkepuffer-Erózió
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-white tabular-nums">
                    {capitalBufferLoss.toFixed(1)}%
                  </span>
                  <span className={`text-xs font-semibold ${capitalBufferLoss > 50 ? 'text-red-400' : 'text-amber-400'}`}>
                    {capitalBufferLoss > 50 ? 'Kritikus veszteség' : 'Kezelhető'}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full ${capitalBufferLoss > 50 ? 'bg-red-500' : 'bg-amber-500'}`}
                    style={{ width: `${capitalBufferLoss}%` }}
                  />
                </div>
              </div>

              {/* Állami garancialehívás */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">
                  Szimulált Állami Garancia / GDP
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-white tabular-nums">
                    {guaranteeDrawRate.toFixed(2)}%
                  </span>
                  <span className="text-xs text-slate-400">
                    Küszöb: &gt; 2,5%
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Fiskális kitettség az ÁKK és Garantiqa portfólióban.
                </span>
              </div>

              {/* Rendszerszintű besorolás a sokk alatt */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">
                  Szimulált Állapotgép Besorolás
                </span>
                <span className="text-xs font-bold font-mono text-amber-300 block">
                  {expectedState}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            A szimulátor nem prognózis. A stresszteszt célja annak igazolása, hogy a tőkepuffer 25%-át meghaladó romlás esetén a döntéshozónak azonnali adategyeztetési eljárást kell indítania.
          </div>
        </div>
      </div>
    </div>
  );
};
