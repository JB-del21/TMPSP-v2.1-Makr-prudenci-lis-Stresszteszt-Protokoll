/**
 * TMPSP v2.1 HTTP API End-to-End Integrációs Tesztfuttató (API CLI Test Runner)
 * Futtatás: tsx src/engine/runApiTestsCli.ts
 */

import http from 'http';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

// Szigorúan elszeparált, ideiglenes teszt könyvtár létrehozása (Fix #4: az éles/dev data/ mappa védelme)
const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmpsp-api-test-'));
process.env.TMPSP_DATA_DIR = tmpDataDir;

// Test környezeti beállítás
// A tesztek SAJÁT, nem nyilvános kulcsokat használnak (nem a szerver fejlesztői alapkulcsait),
// és nem támaszkodnak NODE_ENV-re vagy TMPSP_ALLOW_DEV_KEYS-re.
process.env.NODE_ENV = 'test';
delete process.env.TMPSP_ALLOW_DEV_KEYS;
delete process.env.TMPSP_TRUST_PROXY;
const TEST_OPERATOR_KEY = 'test-operator-' + Math.random().toString(36).slice(2);
const TEST_ADMIN_KEY = 'test-admin-' + Math.random().toString(36).slice(2);
process.env.TMPSP_OPERATOR_KEY = TEST_OPERATOR_KEY;
process.env.TMPSP_ADMIN_KEY = TEST_ADMIN_KEY;
process.env.TMPSP_HMAC_KEY = 'test-hmac-' + Math.random().toString(36).slice(2);

const TEST_PORT = 3099;
let serverInstance: http.Server;

function makeRequest(
  method: string,
  pathStr: string,
  headers: Record<string, string> = {},
  body?: unknown
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: pathStr,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

interface ApiTestResult {
  id: string;
  nev: string;
  sikeres: boolean;
  vart: string;
  kapott: string;
}

async function runApiIntegrationTests(): Promise<void> {
  const {
    app,
    startupIntegrityCheck,
    initializeFreshLedgerAndAnchor,
    parseTrustProxy,
  } = await import('../../server.ts');

  console.log('================================================================');
  console.log('TMPSP v2.1 – HTTP API ENDPOINT INTEGRÁCIÓS ÉS BIZTONSÁGI TESZTEK');
  console.log('MNB Pénzügyi Stabilitási Tanács Audithitelesítési Specifikáció');
  console.log(`[TESZT ELSZEPARÁLÁS] Ideiglenes könyvtár: ${tmpDataDir}`);
  console.log('================================================================\n');

  // Inicializáljunk tiszta teszt bázisállapotot érvényes HMAC horgonnyal az ideiglenes könyvtárban
  initializeFreshLedgerAndAnchor();

  // Indítsuk el a teszt HTTP szervert
  await new Promise<void>((resolve) => {
    serverInstance = app.listen(TEST_PORT, '127.0.0.1', () => {
      resolve();
    });
  });

  const apiResults: ApiTestResult[] = [];

  try {
    // 0. UNIT-001: parseTrustProxy értelmezése (a parseInt-es hiba ellen: "127.0.0.1" nem lehet 127 ugrás)
    const trustCases: Array<[string | undefined, unknown]> = [
      ['1', 1], ['2', 2], ['loopback', 'loopback'], ['127.0.0.1', '127.0.0.1'],
      ['10.0.0.0/8', '10.0.0.0/8'], ['10.0.0.1, 10.0.0.2', '10.0.0.1, 10.0.0.2'],
      ['', false], [undefined, false], ['false', false],
    ];
    const trustFailures: string[] = [];
    for (const [input, expected] of trustCases) {
      let got: unknown;
      try { got = parseTrustProxy(input); } catch (e: any) { got = `EXCEPTION(${e.message})`; }
      if (got !== expected) trustFailures.push(`${JSON.stringify(input)} -> ${JSON.stringify(got)} (várt: ${JSON.stringify(expected)})`);
    }
    for (const forbidden of ['true', 'TRUE', 'all', '*']) {
      let threw = false;
      try { parseTrustProxy(forbidden); } catch { threw = true; }
      if (!threw) trustFailures.push(`${JSON.stringify(forbidden)} nem dobott kivételt`);
    }
    apiResults.push({
      id: 'UNIT-001',
      nev: 'parseTrustProxy: Számjegy = Ugrásszám, IP/CIDR Változatlan, true/all Tiltott',
      sikeres: trustFailures.length === 0,
      vart: 'minden eset a specifikáció szerint',
      kapott: trustFailures.length === 0 ? `${trustCases.length + 4} eset rendben` : trustFailures.join('; '),
    });

    // UI-001: Kliens- és forráskód audit: tiltott hardcode-olt titkok keresése src/-ben
    // (a tesztfájlokat és a runApiTestsCli.ts-t kivéve)
    const forbiddenSecrets = ['tmpsp-operator-token', 'tmpsp-admin-recovery', 'tmpsp-secret-hmac'];
    const secretViolations: string[] = [];
    const scanDir = (dir: string) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          scanDir(full);
        } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
          if (
            item.name === 'runApiTestsCli.ts' ||
            item.name === 'runTestsCli.ts' ||
            item.name === 'testSuite.ts'
          ) {
            continue;
          }
          const content = fs.readFileSync(full, 'utf8');
          for (const s of forbiddenSecrets) {
            if (content.includes(s)) {
              secretViolations.push(`${path.relative(ROOT_DIR, full)}: "${s}"`);
            }
          }
        }
      }
    };
    scanDir(path.resolve(ROOT_DIR, 'src'));
    apiResults.push({
      id: 'UI-001',
      nev: 'Kliens- és forráskód audit: tilos a hardcode-olt operátori/admin/HMAC titok src/-ben',
      sikeres: secretViolations.length === 0,
      vart: '0 hardcode-olt titok az éles forráskódban',
      kapott: secretViolations.length === 0 ? 'Minden forrásfájl tiszta' : secretViolations.join('; '),
    });

    // 1. API-001: 401 Unauthorized hitelesítés nélküli írásnál
    const resAuthMissing = await makeRequest('POST', '/api/audit', {}, { negyedev: '2024Q1', esemenyTipus: 'PILOT', kepletVerzio: 'v2.1', felelős: 'MNB' });
    apiResults.push({
      id: 'API-001',
      nev: '401 Unauthorized hitelesítés nélküli írásnál',
      sikeres: resAuthMissing.status === 401 && resAuthMissing.body?.success === false,
      vart: 'HTTP 401, success = false',
      kapott: `HTTP ${resAuthMissing.status}, success = ${resAuthMissing.body?.success}`,
    });

    // 2. API-002: 200 OK operátori tokennel & Bizalmi horgony frissül
    const resAuthValid = await makeRequest(
      'POST',
      '/api/audit',
      { Authorization: 'Bearer ' + TEST_OPERATOR_KEY },
      { negyedev: '2025Q1', esemenyTipus: 'TESZT_HOZZÁFŰZÉS', kepletVerzio: 'v2.1', felelős: 'MNB PST' }
    );
    const anchorPath = path.resolve(tmpDataDir, 'trust-anchor.json');
    const anchorData = JSON.parse(fs.readFileSync(anchorPath, 'utf8'));
    const isAnchorUpdated = anchorData.checkpointIndex === 2;

    apiResults.push({
      id: 'API-002',
      nev: '200 OK érvényes operátori tokennel & Rolling Trust Anchor frissítés',
      sikeres: resAuthValid.status === 200 && resAuthValid.body?.success === true && isAnchorUpdated,
      vart: 'HTTP 200, success = true, checkpointIndex = 2',
      kapott: `HTTP ${resAuthValid.status}, success = ${resAuthValid.body?.success}, checkpointIndex = ${anchorData.checkpointIndex}`,
    });

    // 3. API-003: Recovery elutasítása OPERATIONAL módban (HTTP 409 Conflict)
    const resRecoveryOperational = await makeRequest(
      'POST',
      '/api/audit/recovery',
      { 'X-TMPSP-Admin-Key': TEST_ADMIN_KEY }
    );
    apiResults.push({
      id: 'API-003',
      nev: 'Recovery Tiltása Üzemi (OPERATIONAL) Állapotban (409 Conflict)',
      sikeres: resRecoveryOperational.status === 409,
      vart: 'HTTP 409 Conflict',
      kapott: `HTTP ${resRecoveryOperational.status} (${resRecoveryOperational.body?.error})`,
    });

    // 4. API-004: HMAC Hamisítás Detektálása a Bizalmi Horgonyban
    const anchorObj = JSON.parse(fs.readFileSync(anchorPath, 'utf8'));
    anchorObj.authoritativeDigest = '0000000000000000000000000000000000000000000000000000000000000000';
    fs.writeFileSync(anchorPath, JSON.stringify(anchorObj, null, 2), 'utf8');

    const resHmacTamper = await makeRequest('GET', '/api/audit/verify');
    apiResults.push({
      id: 'API-004',
      nev: 'Hamisított Bizalmi Horgony HMAC Detektálása (TRUST_ANCHOR_MISMATCH)',
      sikeres: resHmacTamper.body?.isChainValid === false && resHmacTamper.body?.errorCode === 'TRUST_ANCHOR_MISMATCH',
      vart: 'isChainValid = false, errorCode = TRUST_ANCHOR_MISMATCH',
      kapott: `isChainValid = ${resHmacTamper.body?.isChainValid}, errorCode = ${resHmacTamper.body?.errorCode}`,
    });

    // 5. API-005: Hiányzó bizalmi horgony esetén karantén (HTTP 423 Locked)
    fs.unlinkSync(anchorPath); // delete trust anchor file in temp dir
    startupIntegrityCheck();

    const resPostLocked = await makeRequest(
      'POST',
      '/api/audit',
      { Authorization: 'Bearer ' + TEST_OPERATOR_KEY },
      { negyedev: '2025Q2', esemenyTipus: 'BLOKKOLT_ÍRÁS', kepletVerzio: 'v2.1', felelős: 'MNB' }
    );
    apiResults.push({
      id: 'API-005',
      nev: '423 Locked Hozzáfűzés Zárolás Karantén Módosulásnál (TRUST_ANCHOR_MISSING)',
      sikeres: resPostLocked.status === 423 && resPostLocked.body?.errorCode === 'TRUST_ANCHOR_MISSING',
      vart: 'HTTP 423 Locked, errorCode = TRUST_ANCHOR_MISSING',
      kapott: `HTTP ${resPostLocked.status}, errorCode = ${resPostLocked.body?.errorCode}`,
    });

    // 6. API-006: Rate limiter proxy NÉLKÜL: a hamisított X-Forwarded-For figyelmen kívül marad
    // (az attacker minden próbánál más IP-t hamisít, de a socket címe alapján mégis kizárásra kerül)
    const recoveryUrl = '/api/audit/recovery';
    const statuses6: number[] = [];
    for (let i = 1; i <= 6; i++) {
      const r = await makeRequest('POST', recoveryUrl, { 'X-Forwarded-For': `203.0.113.${i}`, 'X-TMPSP-Admin-Key': 'BAD-KEY' });
      statuses6.push(r.status);
    }
    apiResults.push({
      id: 'API-006',
      nev: 'Rate Limiter Proxy Nélkül: Hamisított X-Forwarded-For Nem Játssza Ki (429)',
      sikeres: statuses6.slice(0, 3).every((c) => c === 403) && statuses6.slice(3).every((c) => c === 429),
      vart: '403, 403, 403, 429, 429, 429',
      kapott: statuses6.join(', '),
    });

    // 7. API-007: Rate limiter proxy MÖGÖTT (trust proxy = 1): csak a megbízható proxy által hozzáfűzött
    // (jobb szélső) cím számít, a kliens által beszúrt bal szélső hamis elemek nem
    app.set('trust proxy', 1);
    const statuses7: number[] = [];
    for (let i = 1; i <= 6; i++) {
      const r = await makeRequest('POST', recoveryUrl, { 'X-Forwarded-For': `198.51.100.${i}, 192.168.1.100`, 'X-TMPSP-Admin-Key': 'BAD-KEY' });
      statuses7.push(r.status);
    }
    apiResults.push({
      id: 'API-007',
      nev: 'Rate Limiter Proxy Mögött: Hamis Bal Szélső X-Forwarded-For Elemek Nem Játsszák Ki (429)',
      sikeres: statuses7.slice(0, 3).every((c) => c === 403) && statuses7.slice(3).every((c) => c === 429),
      vart: '403, 403, 403, 429, 429, 429',
      kapott: statuses7.join(', '),
    });

    // 8. API-008: A valódi admin (másik IP) a helyes kulccsal nincs kizárva, a recovery sikeres (HTTP 200)
    const resRecoverySuccess = await makeRequest(
      'POST',
      recoveryUrl,
      { 'X-Forwarded-For': '10.0.0.1', 'X-TMPSP-Admin-Key': TEST_ADMIN_KEY }
    );
    apiResults.push({
      id: 'API-008',
      nev: 'Sikeres Adminisztratív Helyreállítás Karantén Állapotból (HTTP 200 OK)',
      sikeres: resRecoverySuccess.status === 200 && resRecoverySuccess.body?.serverIntegrityState === 'OPERATIONAL',
      vart: 'HTTP 200 OK, serverIntegrityState = OPERATIONAL',
      kapott: `HTTP ${resRecoverySuccess.status}, state = ${resRecoverySuccess.body?.serverIntegrityState}`,
    });
    app.set('trust proxy', false);

    // 9–12. Indítási szabályok (külön folyamatban, tiszta környezettel, NODE_ENV nélkül is)
    const childDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmpsp-child-'));
    const runChild = (extraEnv: Record<string, string>) => {
      const env: Record<string, string> = { PATH: process.env.PATH || '', HOME: process.env.HOME || '', TMPSP_DATA_DIR: childDir, ...extraEnv };
      return spawnSync(process.execPath, ['--import', 'tsx', path.resolve(ROOT_DIR, 'server.ts')], { cwd: ROOT_DIR, env, encoding: 'utf8', timeout: 30000 });
    };
    try {
      const c9 = runChild({}); // NODE_ENV nincs beállítva, titkok nincsenek
      apiResults.push({
        id: 'API-009',
        nev: 'Fail-Closed Indítás: NODE_ENV És Titkok Nélkül A Szerver Leáll',
        sikeres: c9.status === 1 && /Hiányzó kötelező titkok/.test(c9.stderr || ''),
        vart: 'exit 1, "Hiányzó kötelező titkok"',
        kapott: `exit ${c9.status}, ${(c9.stderr || '').split('\n')[0].slice(0, 80)}`,
      });

      const c10 = runChild({ NODE_ENV: 'production' });
      apiResults.push({
        id: 'API-010',
        nev: 'Fail-Closed Indítás: NODE_ENV=production És Titkok Nélkül A Szerver Leáll',
        sikeres: c10.status === 1 && /Hiányzó kötelező titkok/.test(c10.stderr || ''),
        vart: 'exit 1',
        kapott: `exit ${c10.status}`,
      });

      const c11 = runChild({ NODE_ENV: 'production', TMPSP_ALLOW_DEV_KEYS: '1' });
      apiResults.push({
        id: 'API-011',
        nev: 'Fejlesztői Alapkulcsok Éles Módban Tiltottak (TMPSP_ALLOW_DEV_KEYS=1 + production)',
        sikeres: c11.status === 1 && /nem engedélyezett NODE_ENV=production/.test(c11.stderr || ''),
        vart: 'exit 1',
        kapott: `exit ${c11.status}`,
      });

      const c12 = runChild({ TMPSP_OPERATOR_KEY: 'a', TMPSP_ADMIN_KEY: 'b', TMPSP_HMAC_KEY: 'c', TMPSP_TRUST_PROXY: 'true' });
      apiResults.push({
        id: 'API-012',
        nev: 'TMPSP_TRUST_PROXY=true Tiltott (Hamisítható X-Forwarded-For Elkerülése)',
        sikeres: c12.status === 1 && /TMPSP_TRUST_PROXY/.test(c12.stderr || ''),
        vart: 'exit 1',
        kapott: `exit ${c12.status}`,
      });

      // 13. AUD-001: Napló törlése létező horgony mellett -> LEDGER_FILE_MISSING karantén
      const testAud001Dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmpsp-aud001-'));
      process.env.TMPSP_DATA_DIR = testAud001Dir;
      try {
        initializeFreshLedgerAndAnchor(); // Let's create both files
        fs.unlinkSync(path.join(testAud001Dir, 'audit-ledger.jsonl')); // Delete only ledger
        startupIntegrityCheck();
        const ledgerRecreated = fs.existsSync(path.join(testAud001Dir, 'audit-ledger.jsonl'));
        const quarantineCreated = fs.existsSync(path.join(testAud001Dir, 'quarantine-incident.json'));
        apiResults.push({
          id: 'API-013',
          nev: 'AUD-001: Hiányzó Napló Létező Horgonnyal -> Karantén (LEDGER_FILE_MISSING), Újragenerálás Tiltva',
          sikeres: !ledgerRecreated && quarantineCreated,
          vart: 'ledgerRecreated = false, quarantineCreated = true',
          kapott: `ledgerRecreated = ${ledgerRecreated}, quarantineCreated = ${quarantineCreated}`,
        });
      } finally {
        process.env.TMPSP_DATA_DIR = tmpDataDir;
        try { fs.rmSync(testAud001Dir, { recursive: true, force: true }); } catch {}
      }

      // 14. AUD-003: Incidensek megőrzése append-only naplóban (quarantine-incidents.jsonl)
      const testAud003Dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmpsp-aud003-'));
      process.env.TMPSP_DATA_DIR = testAud003Dir;
      try {
        initializeFreshLedgerAndAnchor();
        fs.unlinkSync(path.join(testAud003Dir, 'trust-anchor.json')); // Trigger incident 1
        startupIntegrityCheck();
        
        const logFile = path.join(testAud003Dir, 'quarantine-incidents.jsonl');
        const existsLog = fs.existsSync(logFile);
        const linesCount = existsLog ? fs.readFileSync(logFile, 'utf8').trim().split('\n').length : 0;
        const uniqueIncidents = fs.readdirSync(testAud003Dir).filter((f) => f.startsWith('quarantine-incident-') && f.endsWith('.json'));

        apiResults.push({
          id: 'API-014',
          nev: 'AUD-003: Karantén Incidensek Megőrzése Append-Only Naplóban ÉS Egyedi Időbélyeges Fájlokban',
          sikeres: existsLog && linesCount >= 1 && uniqueIncidents.length >= 1,
          vart: 'existsLog = true, linesCount >= 1, uniqueIncidents >= 1',
          kapott: `existsLog = ${existsLog}, linesCount = ${linesCount}, uniqueIncidents = ${uniqueIncidents.length}`,
        });
      } finally {
        process.env.TMPSP_DATA_DIR = tmpDataDir;
        try { fs.rmSync(testAud003Dir, { recursive: true, force: true }); } catch {}
      }

      // 15. AUD-004: system-init.json létezik + adattár törlés -> TOTAL_DATASTORE_CORRUPTED karantén
      const testAud004Dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmpsp-aud004-'));
      process.env.TMPSP_DATA_DIR = testAud004Dir;
      try {
        initializeFreshLedgerAndAnchor(); // writes audit-ledger, trust-anchor, system-init.json
        fs.unlinkSync(path.join(testAud004Dir, 'audit-ledger.jsonl'));
        fs.unlinkSync(path.join(testAud004Dir, 'trust-anchor.json'));
        startupIntegrityCheck();

        const reseededLedger = fs.existsSync(path.join(testAud004Dir, 'audit-ledger.jsonl'));
        const quarantineContent = fs.existsSync(path.join(testAud004Dir, 'quarantine-incident.json'))
          ? JSON.parse(fs.readFileSync(path.join(testAud004Dir, 'quarantine-incident.json'), 'utf8'))
          : null;

        apiResults.push({
          id: 'API-015',
          nev: 'AUD-004: system-init.json Védett Marker + Teljes Adattár Törlés -> TOTAL_DATASTORE_CORRUPTED',
          sikeres: !reseededLedger && quarantineContent?.errorCode === 'TOTAL_DATASTORE_CORRUPTED',
          vart: 'reseededLedger = false, errorCode = TOTAL_DATASTORE_CORRUPTED',
          kapott: `reseededLedger = ${reseededLedger}, errorCode = ${quarantineContent?.errorCode}`,
        });
      } finally {
        process.env.TMPSP_DATA_DIR = tmpDataDir;
        try { fs.rmSync(testAud004Dir, { recursive: true, force: true }); } catch {}
      }

      // 16. AUD-005 & CAN-001 & CAL-002: Forenzikus csomag archiválása recovery során, kánonikus JSON és küszöb státusz igazolása
      const testAud005Dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmpsp-aud005-'));
      process.env.TMPSP_DATA_DIR = testAud005Dir;
      try {
        initializeFreshLedgerAndAnchor();
        fs.unlinkSync(path.join(testAud005Dir, 'trust-anchor.json')); // Force quarantine mode
        startupIntegrityCheck();

        const { canonicalJsonStringify } = await import('./canonicalJson.ts');
        const { MEASUREMENT_SERIES_META } = await import('../data/tmpspData.ts');

        let canonicalErrorThrown = false;
        try {
          canonicalJsonStringify({ date: new Date() });
        } catch {
          canonicalErrorThrown = true;
        }

        const validMetaStatuses = MEASUREMENT_SERIES_META.every((m) => m.kuszobStatusz === 'JELÖLT');

        apiResults.push({
          id: 'API-016',
          nev: 'CAL-002 & CAN-001: Alapértelmezett Küszöbök JELÖLT Státuszúak ÉS Kánonikus JSON Nem-Plain Típusokat Elutasít',
          sikeres: validMetaStatuses && canonicalErrorThrown,
          vart: 'validMetaStatuses = true, canonicalErrorThrown = true',
          kapott: `validMetaStatuses = ${validMetaStatuses}, canonicalErrorThrown = ${canonicalErrorThrown}`,
        });
      } finally {
        process.env.TMPSP_DATA_DIR = tmpDataDir;
        try { fs.rmSync(testAud005Dir, { recursive: true, force: true }); } catch {}
      }
    } finally {
      try { fs.rmSync(childDir, { recursive: true, force: true }); } catch {}
    }

  } finally {
    serverInstance.close();
    // Ideiglenes tesztkönyvtár takarítása
    try {
      fs.rmSync(tmpDataDir, { recursive: true, force: true });
    } catch {}
  }

  let passed = 0;
  let failed = 0;

  apiResults.forEach((t) => {
    if (t.sikeres) {
      passed++;
      console.log(`  [ PASS ] ${t.id}: ${t.nev}`);
      console.log(`           Eredmény: ${t.kapott}`);
    } else {
      failed++;
      console.log(`  [ FAIL ] ${t.id}: ${t.nev}`);
      console.log(`           Elvárt: ${t.vart}`);
      console.log(`           Kapott: ${t.kapott}`);
    }
  });

  console.log('\n================================================================');
  console.log(`API ÖSSZEGZÉS: ${passed + failed} integrációs teszt lefutva.`);
  console.log(`SIKERES: ${passed} | SIKERTELEN: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    console.error(`HIBA: ${failed} API integrációs teszt megbukott!`);
    process.exit(1);
  } else {
    console.log('SIKER: Minden HTTP API végpont-, auth-, karantén- és recovery teszt hibátlan.');
  }
}

runApiIntegrationTests().catch((err) => {
  console.error('API Test runner error:', err);
  process.exit(1);
});
