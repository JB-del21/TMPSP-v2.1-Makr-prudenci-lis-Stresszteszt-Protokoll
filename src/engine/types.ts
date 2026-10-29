/**
 * TMPSP v2.1 (Tematikus Makroprudenciális Stresszteszt-Protokoll)
 * Matematikai és Relációs Típusdefiníciók
 */

export type DataReadinessLevel = 'IGAZOLT' | 'PROXY' | 'HOZZÁFÉRÉS_KÉRDÉSES' | 'NEM_ELÉRHETŐ';

export type ThresholdStatus = 'JELÖLT' | 'STATISZTIKAILAG_VALIDÁLT' | 'ELAVULT' | 'NEM_KALIBRÁLHATÓ';

export type StateMachineStatus = 
  | 'ZÖLD' 
  | 'SÁRGA - ELŐZETES' 
  | 'PIROS' 
  // A 'KORRIGÁLT ZÖLD' és 'NEM_ELLENŐRIZHETŐ (ADATHIÁNY)' állapotok megőrzésre kerültek
  // a történeti audit naplók és külső felületek típuskompatibilitása érdekében.
  // A TMPSP v2.1 döntési modellben az adathiány nem modul-státusz, hanem a független
  // 'adatminosegiAllapot' ('TELJES' | 'HIÁNYOS') dimenzióként jelenik meg.
  | 'KORRIGÁLT ZÖLD' 
  | 'NEM_ELLENŐRIZHETŐ (ADATHIÁNY)';

export type DataOrigin = 
  | 'HISTÓRIKUS_BÁZIS_2023_2024' 
  | 'SZINTETIKUS_PILOT_2024Q1' 
  | 'PROJEKCIÓ_2025_2026';

export type ModuleId = 'M1' | 'M2' | 'M3' | 'M4';

export interface MainIndicatorMeta {
  foid: string;            // pl. "1.1", "1.2", "2.1"
  modulId: ModuleId;
  nev: string;
  fokusz: string;
  meresiSorIds: string[];  // pl. ["1.2a", "1.2b"]
}

export interface IndicatorMeta {
  sorId: string;           // Mérési sor ID, pl. "1.2a"
  foid: string;            // Főindikátor ID, pl. "1.2"
  modulId: ModuleId;
  nev: string;
  kepletLeiras: string;
  szamlaloNev: string;
  nevezoNev: string;
  egyseg: string;
  alapertelmezettDRL: DataReadinessLevel;
  adatgazda: string;
  frissitesiGyakorisag: string;
  jeloltKuszob: string;
  kuszobTipus: '>' | '<';
  kuszobErtek: number;
  kuszobStatusz: ThresholdStatus;
  perzisztenciaFeltetel?: string; // pl. "2Q perzisztens" vagy "YoY -10pp"
  cafolatiFeltetel: string;
  felelos: string;
}

export interface QuarterDataRow {
  negyedev: string;        // pl. "2024Q1"
  sorId: string;           // Mérési sor ID
  foid: string;            // Főindikátor ID
  eredet: DataOrigin;
  szamlaloErtek?: number;  // nyers számláló (ha van)
  nevezoErtek?: number;    // nyers nevező (ha van)
  szamitottErtek?: number; // számított indikátorérték
  esetszam?: number;       // mintaszám / megfigyelési darabszám (pl. 2.4 likviditási bypasshoz min. 30)
  drl: DataReadinessLevel;
  megjegyzes?: string;
}

export interface IndicatorCalculationResult {
  sorId: string;
  foid: string;
  negyedev: string;
  szamitottErtek: number | null;
  formazottErtek: string;
  kuszobErtek: number;
  kuszobTipus: '>' | '<';
  atlepte: boolean;
  teljesFeltetel: boolean | null; // null = kiegészítő feltétel nem ellenőrizhető (pl. hiányzó segédadat)
  feltetelMagyarazat: string;     // feltétel teljesülésének vagy elmaradásának indoklása
  kuszobStatusz: ThresholdStatus;
  drl: DataReadinessLevel;
  yoyDelta?: number | null;
  yoyEllenorizheto: boolean;
  perzisztenciaMegfelelo: boolean;
  adathiany: boolean;
  reszletesStatusz: string;
}

export interface ModuleEvaluationResult {
  modulId: ModuleId;
  modulNev: string;
  statusz: StateMachineStatus;
  kivaltoIndikatorok: string[]; // csak teljesFeltetel === true esetén
  figyelojelzesek: string[];    // atlepte === true, de teljesFeltetel hamis vagy null (nem emeli sárgára a modult)
  indoklas: string;
  akcioterv: string;
  adatminosegiFigyelmeztetes: boolean;
  likviditasiBypassAktiv: boolean;
  likviditasiBypassEllenorizheto: boolean;
}

export interface IntegratedStateResult {
  negyedev: string;
  globalisStatusz: StateMachineStatus;
  adatminosegiAllapot: 'TELJES' | 'HIÁNYOS'; // HIÁNYOS, ha bármely sor DRL-je HOZZÁFÉRÉS_KÉRDÉSES vagy NEM_ELÉRHETŐ
  modulok: Record<ModuleId, ModuleEvaluationResult>;
  figyelmeztetesek: string[];
  szukKeresztmetszet: string;
  prioritasosAkcio: string;
  auditHash?: string;
  szintetikusFigyelmeztetes?: boolean;
  projekcioFigyelmeztetes?: boolean;
}

export interface CalibrationItem {
  sorId: string;
  foid: string;
  nev: string;
  jeloltKuszob: string;
  kuszobErtek: number;
  kuszobTipus: '>' | '<';
  bazisIdoszak: string;   // "2023Q1–2024Q4"
  auc: number | null;      // Egzakt Area Under ROC Curve (vagy null, ha degenerált)
  fpr: number;             // False Positive Rate %
  drl: DataReadinessLevel;
  statusz: ThresholdStatus;
  indoklas: string;
  utolsoFrissites: string;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  prevHash: string;
  hash: string;
  negyedev: string;
  esemenyTipus: 'SZINTETIKUS_PILOT' | 'ADAT_FELTÖLTÉS' | 'KÜSZÖB_MÓDOSÍTÁS' | 'RIASZTÁS_KIADÁS' | 'KORREKCIÓ';
  kepletVerzio: string;
  elozetesHipotezis: string;
  nullhipotezis: string;
  mertEltérés: string;
  döntésiEredmény: string;
  felelős: string;
  bemenetiHash: string;
}
