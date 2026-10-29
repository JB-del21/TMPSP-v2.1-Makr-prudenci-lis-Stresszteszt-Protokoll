/**
 * TMPSP v2.1 Sokk-Teszt Szimulációs Modell
 * A paraméterek nem kalibráltak! Modellszimuláció.
 */

export const SCENARIO_UNCALIBRATED_NOTICE = 'Modellszimuláció, a paraméterek nem kalibráltak';

export interface ScenarioSimulationInput {
  incomeShock: number;
  domShock: number;
  priceShock: number;
  bankruptcyShock: number;
}

export interface ScenarioSimulationResult {
  capitalBufferLoss: number;
  guaranteeDrawRate: number;
  expectedState: string;
}

export function calculateScenarioEffects(input: ScenarioSimulationInput): ScenarioSimulationResult {
  const { incomeShock, domShock, priceShock, bankruptcyShock } = input;
  const capitalBufferLoss = Math.min(
    100,
    Math.max(5, Math.abs(incomeShock) * 1.8 + domShock * 0.35 + Math.abs(priceShock) * 1.2)
  );
  const guaranteeDrawRate = Math.min(
    6.5,
    Math.max(1.8, 1.96 + Math.abs(incomeShock) * 0.05 + bankruptcyShock * 0.012)
  );
  const expectedState =
    capitalBufferLoss > 60
      ? 'PIROS – Formális Felülvizsgálat'
      : capitalBufferLoss > 25
      ? 'SÁRGA – Előzetes Okfeltárás'
      : 'ZÖLD – Prudens';

  return {
    capitalBufferLoss,
    guaranteeDrawRate,
    expectedState,
  };
}

export interface PresetScenario {
  name: string;
  input: ScenarioSimulationInput;
  incomeText: string;
  domText: string;
  priceText: string;
  bankruptcyText: string;
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    name: 'Alappálya (Baseline)',
    input: { incomeShock: 0, domShock: 0, priceShock: 3.5, bankruptcyShock: 0 },
    incomeText: '0%',
    domText: '0 nap',
    priceText: '+3.5%',
    bankruptcyText: 'Normál trend',
  },
  {
    name: 'Kedvezőtlen sokk (Adverse)',
    input: { incomeShock: -15, domShock: 40, priceShock: -10, bankruptcyShock: 50 },
    incomeText: '-15%',
    domText: '+40 nap',
    priceText: '-10.0%',
    bankruptcyText: '+50% csődráta',
  },
  {
    name: 'Szélső sokk (Severe)',
    input: { incomeShock: -25, domShock: 90, priceShock: -20, bankruptcyShock: 100 },
    incomeText: '-25%',
    domText: '+90 nap',
    priceText: '-20.0%',
    bankruptcyText: '+100% csődráta',
  },
];
