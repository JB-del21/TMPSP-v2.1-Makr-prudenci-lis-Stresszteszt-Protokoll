/**
 * TMPSP v2.1 HTTP API End-to-End Integrációs Tesztfuttató (API CLI Test Runner)
 * Futtatás: tsx src/engine/runApiTestsCli.ts
 */

import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Szigorúan elszeparált, ideiglenes teszt könyvtár létrehozása (Fix #4: az éles/dev data/ mappa védelme)
const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmpsp-api-test-'));
process.env.TMPSP_DATA_DIR = tmpDataDir;

// Test környezeti beállítás
process.env.NODE_ENV = 'test';
process.env.TMPSP_OPERATOR_KEY = 'tmpsp-operator-token-2026';
process.env.TMPSP_ADMIN_KEY = 'tmpsp-admin-recovery-2026';
process.env.TMPSP_HMAC_KEY = 'tmpsp-secret-hmac-key-2026';

import {
  app,
  startupIntegrityCheck,
  initializeFreshLedgerAndAnchor,
  getDATA_DIR,
} from '../../server.ts';

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
      { Authorization: 'Bearer tmpsp-operator-token-2026' },
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
      { 'X-TMPSP-Admin-Key': 'tmpsp-admin-recovery-2026' }
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
      { Authorization: 'Bearer tmpsp-operator-token-2026' },
      { negyedev: '2025Q2', esemenyTipus: 'BLOKKOLT_ÍRÁS', kepletVerzio: 'v2.1', felelős: 'MNB' }
    );
    apiResults.push({
      id: 'API-005',
      nev: '423 Locked Hozzáfűzés Zárolás Karantén Módosulásnál (TRUST_ANCHOR_MISSING)',
      sikeres: resPostLocked.status === 423 && resPostLocked.body?.errorCode === 'TRUST_ANCHOR_MISSING',
      vart: 'HTTP 423 Locked, errorCode = TRUST_ANCHOR_MISSING',
      kapott: `HTTP ${resPostLocked.status}, errorCode = ${resPostLocked.body?.errorCode}`,
    });

    // 6. API-006: DoS-Biztos Rate Limiting hibás próbálkozásoknál
    // Simulating attacker IP 192.168.1.100 sending 3 bad admin keys
    const attackerHeaders = { 'X-Forwarded-For': '192.168.1.100', 'X-TMPSP-Admin-Key': 'BAD-KEY' };
    for (let i = 0; i < 3; i++) {
      await makeRequest('POST', '/api/audit/recovery', attackerHeaders);
    }
    const resRateLimited = await makeRequest('POST', '/api/audit/recovery', attackerHeaders);
    apiResults.push({
      id: 'API-006',
      nev: 'DoS-Biztos Hibás-Kísérlet Rate Limiter (429 Too Many Requests)',
      sikeres: resRateLimited.status === 429,
      vart: 'HTTP 429 Too Many Requests',
      kapott: `HTTP ${resRateLimited.status} (${resRateLimited.body?.error})`,
    });

    // 7. API-007: Sikeres Adminisztratív Recovery Karantén Állapotból Valódi Admintól (HTTP 200 OK)
    // Valid admin IP 10.0.0.1 sending correct admin key is NOT blocked by attacker IP!
    const resRecoverySuccess = await makeRequest(
      'POST',
      '/api/audit/recovery',
      { 'X-Forwarded-For': '10.0.0.1', 'X-TMPSP-Admin-Key': 'tmpsp-admin-recovery-2026' }
    );
    apiResults.push({
      id: 'API-007',
      nev: 'Sikeres Adminisztratív Helyreállítás Karantén Állapotból (HTTP 200 OK)',
      sikeres: resRecoverySuccess.status === 200 && resRecoverySuccess.body?.serverIntegrityState === 'OPERATIONAL',
      vart: 'HTTP 200 OK, serverIntegrityState = OPERATIONAL',
      kapott: `HTTP ${resRecoverySuccess.status}, state = ${resRecoverySuccess.body?.serverIntegrityState}`,
    });

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
