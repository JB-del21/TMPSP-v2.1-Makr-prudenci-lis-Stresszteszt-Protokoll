/**
 * TMPSP v2.1 Backend Szerver (Express + Vite)
 * Szigorú append-only audit ledger tárolás, külső bizalmi horgony (Trust Anchor),
 * és forenzikus integritásvédelmi karantén (INTEGRITY_FAILURE).
 * 
 * AUD-001 & API-001 Szabályozói Követelmények:
 * 1. Meglévő napló hibája esetén az eredeti fájl FELÜLÍRÁSA SZIGORÚAN TILOS (bizonyítékmegőrzés).
 * 2. Hibás lánc esetén a szerver INTEGRITY_FAILURE (karantén) módba lép, minden írás zárolva (HTTP 423 Locked).
 * 3. Külső bizalmi horgony (Trust Anchor) ellenőrzi a teljes lánc-újragenerálási támadások kizárását.
 * 4. Az audit bejegyzések rögzítéséhez operátori hitelesítés kötelező (Bearer token / API kulcs).
 * 5. Helyreállítás kizárólag adminisztratív jogosultsággal, archiválás után lehetséges (/api/audit/recovery).
 */

import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  computeCanonicalRecordHash,
  computeHmacSha256,
  verifyAuditChain,
  CanonicalAuditRecord,
  TrustAnchor,
  GENESIS_PREV_HASH,
} from './src/engine/cryptoNode.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

export function parseTrustProxy(raw: string | undefined): number | string | false {
  if (!raw) return false;
  const v = raw.trim();
  if (/^\d+$/.test(v)) return Number(v);            // csak tisztán számjegyekből álló érték = ugrások száma
  const lower = v.toLowerCase();
  if (lower === 'false') return false;
  if (['true', 'all', '*'].includes(lower)) {
    throw new Error("TMPSP_TRUST_PROXY: a 'true' / 'all' érték tiltott; adja meg az ugrások számát vagy CIDR listát.");
  }
  return v;                                          // IP / CIDR / loopback / vesszős lista: változtatás nélkül az Expressnek
}

try {
  app.set('trust proxy', parseTrustProxy(process.env.TMPSP_TRUST_PROXY));
} catch (e: any) {
  console.error(`CRITICAL CONFIGURATION ERROR: ${e.message}`);
  process.exit(1);
}

if (process.env.TMPSP_ALLOW_DEV_KEYS === '1' && process.env.NODE_ENV === 'production') {
  console.error('CRITICAL CONFIGURATION ERROR: TMPSP_ALLOW_DEV_KEYS=1 nem engedélyezett NODE_ENV=production mellett (nyilvános fejlesztői kulcsok).');
  process.exit(1);
}

const allowDevKeys = process.env.TMPSP_ALLOW_DEV_KEYS === '1';

const missingSecrets: string[] = [];
if (!process.env.TMPSP_OPERATOR_KEY) missingSecrets.push('TMPSP_OPERATOR_KEY');
if (!process.env.TMPSP_ADMIN_KEY) missingSecrets.push('TMPSP_ADMIN_KEY');
if (!process.env.TMPSP_HMAC_KEY) missingSecrets.push('TMPSP_HMAC_KEY');

if (!allowDevKeys && missingSecrets.length > 0) {
  console.error(`CRITICAL CONFIGURATION ERROR: Hiányzó kötelező titkok: ${missingSecrets.join(', ')}. Állítsa be a környezeti változókat, vagy helyi fejlesztéshez TMPSP_ALLOW_DEV_KEYS=1.`);
  process.exit(1);
}

// Hitelesítési kulcsok és titkos HMAC kulcsok
const OPERATOR_TOKEN = process.env.TMPSP_OPERATOR_KEY || (allowDevKeys ? 'tmpsp-operator-token-2026' : '');
const ADMIN_RECOVERY_KEY = process.env.TMPSP_ADMIN_KEY || (allowDevKeys ? 'tmpsp-admin-recovery-2026' : '');
const HMAC_SECRET = process.env.TMPSP_HMAC_KEY || (allowDevKeys ? 'tmpsp-secret-hmac-key-2026' : '');

app.use(express.json());

// Adattárolási könyvtár és dinamikus fájlútvonalak (TMPSP_DATA_DIR felülbírálással)
const getDATA_DIR = () => process.env.TMPSP_DATA_DIR ? path.resolve(process.env.TMPSP_DATA_DIR) : path.resolve(__dirname, 'data');
const getAUDIT_LEDGER_FILE = () => path.resolve(getDATA_DIR(), 'audit-ledger.jsonl');
const getTRUST_ANCHOR_FILE = () => path.resolve(getDATA_DIR(), 'trust-anchor.json');
const getQUARANTINE_INCIDENT_FILE = () => path.resolve(getDATA_DIR(), 'quarantine-incident.json');

function ensureDataDirExists(): void {
  const dir = getDATA_DIR();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Szerver integritási állapota: 'OPERATIONAL' | 'INTEGRITY_FAILURE'
let serverIntegrityState: 'OPERATIONAL' | 'INTEGRITY_FAILURE' = 'OPERATIONAL';
let lastIntegrityError: string | null = null;
let lastIntegrityErrorCode: string | null = null;

// IP-alapú hibás kísérletek nyilvántartása (DoS-biztos rate limiter)
const failedRecoveryAttemptsMap = new Map<string, number[]>();

/**
 * Constant-time időbélyeg-biztos string összehasonlítás
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Incidens naplózása a quarantine-incident.json fájlba
 */
function recordQuarantineIncident(errorCode: string, brokenIndex: number | null, reason: string): void {
  ensureDataDirExists();
  const incidentData = {
    incidentTimestamp: new Date().toISOString(),
    errorCode,
    brokenIndex,
    reason,
    ledgerPath: getAUDIT_LEDGER_FILE(),
    action: 'QUARANTINE_MODE_ACTIVE - Minden naplóírás zárolva, bizonyíték változatlanul megőrizve.',
  };
  fs.writeFileSync(getQUARANTINE_INCIDENT_FILE(), JSON.stringify(incidentData, null, 2), 'utf8');
}

/**
 * Audit rekordok beolvasása az append-only fájlból.
 * Szigorú feldolgozás: Sérült vagy csonkolt sor esetén kivételt dob (nincs csendes eldobás)!
 */
function readAuditLedger(): CanonicalAuditRecord[] {
  const file = getAUDIT_LEDGER_FILE();
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf8');
  if (!content.trim()) return [];
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((l, idx) => {
    try {
      return JSON.parse(l);
    } catch (e: any) {
      throw new Error(`Sorkorrupció a(z) ${idx + 1}. sornál az audit naplóban: ${e.message}`);
    }
  });
}

/**
 * Külső bizalmi horgony (Trust Anchor) beolvasása
 */
function readTrustAnchor(): TrustAnchor | null {
  const file = getTRUST_ANCHOR_FILE();
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Kezdeti auditnapló és bizalmi horgony kiépítése (KIZÁRÓLAG ÚJ RENDSZER INDULÁSAKOR)
 */
function initializeFreshLedgerAndAnchor(): void {
  ensureDataDirExists();
  console.log('[TMPSP AUDIT] Új audit napló és bizalmi horgony inicializálása (DEMO_FIXTURE / SZINTETIKUS_SEED)...');

  const seed0Id = 'AUD-2024Q1-001';
  const seed0Payload = {
    negyedev: '2024Q1',
    esemenyTipus: 'SZINTETIKUS_SEED',
    kepletVerzio: 'v2.1-synthetic-seed',
    elozetesHipotezis: 'DEMO_FIXTURE / SZINTETIKUS_SEED: A 2024 eleji lakáspiaci élénkülés ellenére a középkategóriás DOM nő, és az 550–800k jövedelmi sáv hozzáférési rátája 45% alá esik.',
    nullhipotezis: 'DEMO_FIXTURE / SZINTETIKUS_SEED: Szezonális ingadozás feltételezése.',
    mertEltérés: '1.2a: 42,04% (<45%); 1.3: 53,26% (>50%); 2.1: 2,088 (>2,0); 2.4: ADATHIÁNY.',
    döntésiEredmény: 'DEMO_FIXTURE / SZINTETIKUS_SEED: SÁRGA - ELŐZETES (Kezdeti szimulált beállítás, nem minősül hivatalos jegybanki hitelesítésnek).',
    felelős: 'MNB Makroprudenciális Főosztály',
    bemenetiHash: crypto.createHash('sha256').update(JSON.stringify({ dataset: '2024Q1_synthetic_pilot_v2.1' })).digest('hex'),
  };

  const seed0Timestamp = '2026-10-28T12:00:00.000Z';
  const seed0PrevHash = GENESIS_PREV_HASH;
  const seed0PayloadWithId = { id: seed0Id, ...seed0Payload };
  const seed0Hash = computeCanonicalRecordHash(seed0PrevHash, seed0Timestamp, seed0PayloadWithId);

  const seedRecord0: CanonicalAuditRecord = {
    id: seed0Id,
    timestamp: seed0Timestamp,
    prevHash: seed0PrevHash,
    hash: seed0Hash,
    ...seed0Payload,
  };

  const seed1Id = 'AUD-2024Q4-002';
  const seed1Payload = {
    negyedev: '2024Q4',
    esemenyTipus: 'SZINTETIKUS_SEED',
    kepletVerzio: 'v2.1-synthetic-seed',
    elozetesHipotezis: 'DEMO_FIXTURE / SZINTETIKUS_SEED: Kezdeti szimulált bázisidőszaki visszatesztelés.',
    nullhipotezis: 'DEMO_FIXTURE / SZINTETIKUS_SEED: Véletlen diszkrimináció nullhipotézise.',
    mertEltérés: '1.2b, 1.4, 2.3, 3.2, 3.3, 4.1 mutatók tesztértéke.',
    döntésiEredmény: 'DEMO_FIXTURE / SZINTETIKUS_SEED: Indikátorküszöbök szimulált állapota (DEMO FIXTURE).',
    felelős: 'Kockázatelemzési Munkacsoport',
    bemenetiHash: crypto.createHash('sha256').update(JSON.stringify({ backtest_period: '2023Q1-2024Q4' })).digest('hex'),
  };

  const seed1Timestamp = '2026-10-28T12:30:00.000Z';
  const seed1PrevHash = seed0Hash;
  const seed1PayloadWithId = { id: seed1Id, ...seed1Payload };
  const seed1Hash = computeCanonicalRecordHash(seed1PrevHash, seed1Timestamp, seed1PayloadWithId);

  const seedRecord1: CanonicalAuditRecord = {
    id: seed1Id,
    timestamp: seed1Timestamp,
    prevHash: seed1PrevHash,
    hash: seed1Hash,
    ...seed1Payload,
  };

  const content = [JSON.stringify(seedRecord0), JSON.stringify(seedRecord1)].join('\n') + '\n';
  fs.writeFileSync(getAUDIT_LEDGER_FILE(), content, 'utf8');

  // Külső bizalmi horgony (Trust Anchor) elmentése titkos HMAC-SHA256 aláírással
  const authoritativeDigest = computeHmacSha256(HMAC_SECRET, `${seed1Hash}|${seed1Timestamp}|MNB_PST_AUTHORITY`);
  const trustAnchor: TrustAnchor = {
    checkpointIndex: 1,
    checkpointHash: seed1Hash,
    checkpointTimestamp: seed1Timestamp,
    authoritativeDigest,
    description: 'DEMO_FIXTURE / SZINTETIKUS_SEED: Kezdeti szimulált bizalmi horgony tesztkörnyezethez (HMAC védett).',
  };
  fs.writeFileSync(getTRUST_ANCHOR_FILE(), JSON.stringify(trustAnchor, null, 2), 'utf8');

  serverIntegrityState = 'OPERATIONAL';
  lastIntegrityError = null;
  lastIntegrityErrorCode = null;
}

/**
 * Rendszerindulási integritás-ellenőrzés (AUD-001 KÖVETELMÉNY)
 * Ha a fájl létezik, de sérült vagy hiányzik a bizalmi horgony, vagy ha a napló hiányzik de a horgony megvan,
 * a szerver SOHA NEM generál új seedet, hanem azonnal karanténba lép!
 */
function startupIntegrityCheck(): void {
  ensureDataDirExists();
  const ledgerExists = fs.existsSync(getAUDIT_LEDGER_FILE());
  const anchorExists = fs.existsSync(getTRUST_ANCHOR_FILE());
  const quarantineExists = fs.existsSync(getQUARANTINE_INCIDENT_FILE());

  // AUD-001: Ha az audit napló hiányzik, de a bizalmi horgony vagy karantén feljegyzés létezik:
  // AZONNAL KARANTÉN (LEDGER_FILE_MISSING)! Tilos az újragenerálás, mert az eltakarja a napló törlését/csonkítását.
  if (!ledgerExists && (anchorExists || quarantineExists)) {
    serverIntegrityState = 'INTEGRITY_FAILURE';
    lastIntegrityErrorCode = 'LEDGER_FILE_MISSING';
    lastIntegrityError = 'Az audit-ledger.jsonl naplófájl hiányzik, miközben a bizalmi horgony (trust-anchor.json) létezik! Lehetséges naplótörlési vagy csonkítási támadás.';
    recordQuarantineIncident('LEDGER_FILE_MISSING', null, lastIntegrityError);
    console.error('CRITICAL ALARM: AUDIT LEDGER MISSING WHILE TRUST ANCHOR EXISTS!');
    return;
  }

  // Kizárólag szűz, még nem inicializált telepítés esetén hozható létre kezdeti seed
  if (!ledgerExists && !anchorExists) {
    initializeFreshLedgerAndAnchor();
    return;
  }

  try {
    const existing = readAuditLedger();
    const anchor = readTrustAnchor();

    if (!anchor && existing.length > 0) {
      serverIntegrityState = 'INTEGRITY_FAILURE';
      lastIntegrityErrorCode = 'TRUST_ANCHOR_MISSING';
      lastIntegrityError = 'A bizalmi horgony (trust-anchor.json) hiányzik a meglévő audit napló mellől! Lehetséges lánccserélési támadás.';
      recordQuarantineIncident('TRUST_ANCHOR_MISSING', existing.length - 1, lastIntegrityError);
      console.error('CRITICAL ALARM: TRUST ANCHOR MISSING WHILE LEDGER EXISTS!');
      return;
    }

    const verification = verifyAuditChain(existing, anchor, HMAC_SECRET);

    if (!verification.isValid) {
      serverIntegrityState = 'INTEGRITY_FAILURE';
      lastIntegrityError = verification.brokenReason;
      lastIntegrityErrorCode = verification.errorCode;
      recordQuarantineIncident(verification.errorCode || 'INTEGRITY_ERROR', verification.brokenIndex, verification.brokenReason || 'Ismeretlen hiba');

      console.error('================================================================');
      console.error('CRITICAL ALARM: AUDIT INTEGRITY FAILURE DETECTED ON STARTUP!');
      console.error(`Error Code: ${verification.errorCode}`);
      console.error(`Reason: ${verification.brokenReason}`);
      console.error('A naplófájl automatikus felülírása LETILTVA a bizonyíték megőrzése érdekében.');
      console.error('A rendszer karantén módba lépett (INTEGRITY_FAILURE).');
      console.error('================================================================');
    } else {
      serverIntegrityState = 'OPERATIONAL';
      lastIntegrityError = null;
      lastIntegrityErrorCode = null;
      console.log(`[TMPSP AUDIT] Kriptográfiai integritás igazolva (${verification.verifiedRecords} rekord, Trust Anchor aktív).`);
    }
  } catch (err: any) {
    serverIntegrityState = 'INTEGRITY_FAILURE';
    lastIntegrityErrorCode = 'CORRUPTED_LEDGER_LINE';
    lastIntegrityError = err.message;
    recordQuarantineIncident('CORRUPTED_LEDGER_LINE', -1, err.message);
    console.error(`CRITICAL ALARM: LEDGER CORRUPTION DETECTED! ${err.message}`);
  }
}

startupIntegrityCheck();

// Middleware: Operátori jogosultság ellenőrzése írási műveletekhez (API-001) timing-safe módon
function requireOperatorAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const operatorKey = req.headers['x-tmpsp-operator-key'];

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (typeof operatorKey === 'string') {
    token = operatorKey;
  }

  if (!token || !timingSafeCompare(token, OPERATOR_TOKEN)) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED: Az audit naplóhoz való hozzáfűzés operátori hitelesítést igényel (Bearer token vagy X-TMPSP-Operator-Key header hiányzik vagy érvénytelen).',
    });
  }

  next();
}

// API: Audit napló lekérdezése
app.get('/api/audit', (req, res) => {
  try {
    const records = readAuditLedger();
    const anchor = readTrustAnchor();
    res.json({
      success: true,
      integrityState: serverIntegrityState,
      totalRecords: records.length,
      ledgerPath: 'data/audit-ledger.jsonl',
      trustAnchor: anchor ? { checkpointIndex: anchor.checkpointIndex, checkpointHash: anchor.checkpointHash } : null,
      records,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      integrityState: 'INTEGRITY_FAILURE',
      error: err.message,
      records: [],
    });
  }
});

// API: Új audit bejegyzés hozzáfűzése (WORM elv + Karantén védelem + Előzetes láncellenőrzés + Trust Anchor frissítés)
app.post('/api/audit', requireOperatorAuth, (req, res) => {
  try {
    // 1. Karantén védelem: kompromittált naplóra tilos további rekordot fűzni
    if (serverIntegrityState === 'INTEGRITY_FAILURE') {
      return res.status(423).json({
        success: false,
        error: 'INTEGRITY_FAILURE: Az audit napló integritása sérült! További hozzáfűzés zárolva az incidens kivizsgálásáig.',
        incidentReason: lastIntegrityError,
        errorCode: lastIntegrityErrorCode,
      });
    }

    // 2. Napló beolvasása és korrupció ellenőrzése
    let existingRecords: CanonicalAuditRecord[];
    try {
      existingRecords = readAuditLedger();
    } catch (err: any) {
      serverIntegrityState = 'INTEGRITY_FAILURE';
      lastIntegrityErrorCode = 'CORRUPTED_LEDGER_LINE';
      lastIntegrityError = err.message;
      recordQuarantineIncident('CORRUPTED_LEDGER_LINE', null, err.message);
      return res.status(423).json({
        success: false,
        error: 'INTEGRITY_FAILURE: Az audit napló sérült (korrupt JSON sor).',
        errorCode: 'CORRUPTED_LEDGER_LINE',
        incidentReason: err.message,
      });
    }

    // 3. Bizalmi horgony és láncolat pre-flight ellenőrzése
    const anchor = readTrustAnchor();
    if (!anchor && existingRecords.length > 0) {
      serverIntegrityState = 'INTEGRITY_FAILURE';
      lastIntegrityErrorCode = 'TRUST_ANCHOR_MISSING';
      lastIntegrityError = 'A bizalmi horgony (trust-anchor.json) hiányzik a meglévő audit napló mellől!';
      recordQuarantineIncident('TRUST_ANCHOR_MISSING', existingRecords.length - 1, lastIntegrityError);
      return res.status(423).json({
        success: false,
        error: 'TRUST_ANCHOR_MISSING: A bizalmi horgony hiányzik a meglévő audit napló mellől.',
        errorCode: 'TRUST_ANCHOR_MISSING',
        brokenReason: lastIntegrityError,
      });
    }

    const preFlight = verifyAuditChain(existingRecords, anchor, HMAC_SECRET);
    if (!preFlight.isValid) {
      serverIntegrityState = 'INTEGRITY_FAILURE';
      lastIntegrityError = preFlight.brokenReason;
      lastIntegrityErrorCode = preFlight.errorCode;
      recordQuarantineIncident(preFlight.errorCode || 'PRE_FLIGHT_ERROR', preFlight.brokenIndex, preFlight.brokenReason || '');
      return res.status(423).json({
        success: false,
        error: 'PRE_FLIGHT_INTEGRITY_ERROR: A lemezen lévő auditlánc érvénytelen, az új rekord írása elutasítva.',
        errorCode: preFlight.errorCode,
        brokenReason: preFlight.brokenReason,
      });
    }

    const { negyedev, esemenyTipus, kepletVerzio, elozetesHipotezis, nullhipotezis, mertEltérés, döntésiEredmény, felelős, bemenetiPayload } = req.body;

    if (!negyedev || !esemenyTipus || !kepletVerzio || !felelős) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR: A negyedev, esemenyTipus, kepletVerzio és felelős mezők megadása kötelező.',
      });
    }

    const lastRecord = existingRecords[existingRecords.length - 1];
    const prevHash = lastRecord ? lastRecord.hash : GENESIS_PREV_HASH;

    const timestamp = new Date().toISOString();
    // Időbélyeg-monotonitás ellenőrzése az előző rekordhoz képest
    if (lastRecord) {
      const currentTime = Date.parse(timestamp);
      const prevTime = Date.parse(lastRecord.timestamp);
      if (currentTime < prevTime) {
        return res.status(400).json({
          success: false,
          error: 'TIMESTAMP_REGRESSION: A generált időbélyeg megelőzi a megelőző rekord idejét.',
        });
      }
    }

    const bemenetiHash = crypto.createHash('sha256').update(JSON.stringify(bemenetiPayload || {})).digest('hex');

    const payload = {
      negyedev: String(negyedev),
      esemenyTipus: String(esemenyTipus),
      kepletVerzio: String(kepletVerzio),
      elozetesHipotezis: String(elozetesHipotezis || ''),
      nullhipotezis: String(nullhipotezis || ''),
      mertEltérés: String(mertEltérés || ''),
      döntésiEredmény: String(döntésiEredmény || ''),
      felelős: String(felelős),
      bemenetiHash,
    };

    const newRecordId = `AUD-${payload.negyedev}-${String(existingRecords.length + 1).padStart(3, '0')}`;
    const recordForHash = { id: newRecordId, ...payload };
    const hash = computeCanonicalRecordHash(prevHash, timestamp, recordForHash);

    const newRecord: CanonicalAuditRecord = {
      id: newRecordId,
      timestamp,
      prevHash,
      hash,
      ...payload,
    };

    // Szigorú append-only hozzáfűzés a lemezre
    fs.appendFileSync(getAUDIT_LEDGER_FILE(), JSON.stringify(newRecord) + '\n', 'utf8');

    // Bizalmi horgony frissítése a legújabb fejrekordra titkos HMAC aláírással
    const updatedAnchorIndex = existingRecords.length;
    const updatedAuthoritativeDigest = computeHmacSha256(HMAC_SECRET, `${hash}|${timestamp}|MNB_PST_AUTHORITY`);
    const updatedTrustAnchor: TrustAnchor = {
      checkpointIndex: updatedAnchorIndex,
      checkpointHash: hash,
      checkpointTimestamp: timestamp,
      authoritativeDigest: updatedAuthoritativeDigest,
      description: `Hitelesített jegybanki ellenőrzőpont (${newRecordId}).`,
    };
    fs.writeFileSync(getTRUST_ANCHOR_FILE(), JSON.stringify(updatedTrustAnchor, null, 2), 'utf8');

    res.json({
      success: true,
      message: 'Audit rekord RFC 8785 determinisztikus hash-eléssel rögzítve az append-only naplóban.',
      record: newRecord,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Teljes hash láncolat és bizalmi horgony kriptográfiai érvényességének ellenőrzése
app.get('/api/audit/verify', (req, res) => {
  try {
    const records = readAuditLedger();
    const anchor = readTrustAnchor();
    const verification = verifyAuditChain(records, anchor, HMAC_SECRET);

    res.json({
      success: true,
      serverIntegrityState,
      isChainValid: verification.isValid,
      errorCode: verification.errorCode,
      brokenIndex: verification.brokenIndex,
      brokenReason: verification.brokenReason,
      verifiedRecords: verification.verifiedRecords,
      trustAnchorVerified: verification.isValid && anchor !== null,
      statusText: verification.isValid
        ? 'A kriptográfiai SHA-256 hash-láncolat, az RFC 8785 kánonikus adattartalom és a külső bizalmi horgony sértetlen.'
        : `Integritási hiba [${verification.errorCode}]: ${verification.brokenReason}`,
      chainSummary: records.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        hash: r.hash,
        prevHash: r.prevHash,
      })),
    });
  } catch (err: any) {
    res.json({
      success: true,
      serverIntegrityState: 'INTEGRITY_FAILURE',
      isChainValid: false,
      errorCode: 'CORRUPTED_LEDGER_LINE',
      brokenIndex: -1,
      brokenReason: err.message,
      verifiedRecords: 0,
      trustAnchorVerified: false,
      statusText: `Integritási hiba [CORRUPTED_LEDGER_LINE]: ${err.message}`,
      chainSummary: [],
    });
  }
});

// API: Adminisztratív helyreállítási protokoll (AUD-001 KÖVETELMÉNY)
// Szigorúan védett timing-safe módon, SIKERTELEN KÍSÉRLET ALAPÚ IP RATE LIMIT-tel, KIZÁRÓLAG INTEGRITY_FAILURE MÓDBAN!
app.post('/api/audit/recovery', (req, res) => {
  // 1. Szigorú üzemi állapot szűrő: rendes üzemi állapotban tilos a napló törlése/újraindítása!
  if (serverIntegrityState !== 'INTEGRITY_FAILURE') {
    return res.status(409).json({
      success: false,
      error: 'CONFLICT: Az audit helyreállítási eljárás kizárólag INTEGRITY_FAILURE (karantén) állapotban hajtható végre. Üzemi (OPERATIONAL) állapotban a napló újraindítása elutasítva.',
    });
  }

  // 2. IP-alapú Rate Limiter kizárólag a SIKERTELEN próbálkozásokra (DoS védelem)
  // req.ip-t használunk, amelyet az Express a megbízható proxyláncból számít ki
  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown-client';

  const now = Date.now();
  if (failedRecoveryAttemptsMap.size > 10000) {
    for (const [ip, ts] of failedRecoveryAttemptsMap) {
      if (ts.every((t) => now - t >= 15 * 60 * 1000)) failedRecoveryAttemptsMap.delete(ip);
    }
  }

  const rawFailures = failedRecoveryAttemptsMap.get(clientIp) || [];
  const clientFailures = rawFailures.filter((t) => now - t < 15 * 60 * 1000);

  if (clientFailures.length === 0) {
    failedRecoveryAttemptsMap.delete(clientIp);
  } else if (clientFailures.length !== rawFailures.length) {
    failedRecoveryAttemptsMap.set(clientIp, clientFailures);
  }

  if (clientFailures.length >= 3) {
    return res.status(429).json({
      success: false,
      error: 'TOO_MANY_REQUESTS: Túl sok hibás helyreállítási kísérlet ebből az IP címből. Maximum 3 hibás próbálkozás engedélyezett 15 percen belül.',
    });
  }

  const adminKey = req.headers['x-tmpsp-admin-key'] || req.body?.adminKey;

  if (typeof adminKey !== 'string' || !timingSafeCompare(adminKey, ADMIN_RECOVERY_KEY)) {
    // SIKERTELEN kísérlet regisztrálása ehhez az IP-hez
    clientFailures.push(now);
    failedRecoveryAttemptsMap.set(clientIp, clientFailures);
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN: Az audit helyreállítási eljárás szigorúan védett adminisztratív jogosultságot igényel.',
    });
  }

  // Sikeres hitelesítés törli az IP hibaszámlálóját
  failedRecoveryAttemptsMap.delete(clientIp);

  try {
    // 1. A meglévő (esetleg sérült) fájl forenzikus archiválása időbélyeggel
    const archiveTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.resolve(getDATA_DIR(), `archived-corrupted-ledger-${archiveTimestamp}.jsonl`);

    if (fs.existsSync(getAUDIT_LEDGER_FILE())) {
      fs.copyFileSync(getAUDIT_LEDGER_FILE(), archivePath);
      console.log(`[TMPSP AUDIT RECOVERY] Korábbi napló archiválva forenzikus vizsgálatra: ${archivePath}`);
    }

    // 2. Új tiszta állapot és bizalmi horgony felépítése
    initializeFreshLedgerAndAnchor();

    res.json({
      success: true,
      message: 'Audit napló helyreállítása sikeres. A sérült állomány változatlanul archiválásra került.',
      archivedFile: path.basename(archivePath),
      serverIntegrityState: 'OPERATIONAL',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vite middleware és Frontend kiszolgálás
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TMPSP v2.1 szerver fut a http://0.0.0.0:${PORT} címen (Integritási állapot: ${serverIntegrityState}).`);
  });
}

export { app, startupIntegrityCheck, initializeFreshLedgerAndAnchor, readAuditLedger, readTrustAnchor, getDATA_DIR };

const isMainModule = process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));
if (isMainModule && process.env.NODE_ENV !== 'test') {
  startServer();
}
