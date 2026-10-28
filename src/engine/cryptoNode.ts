/**
 * TMPSP v2.1 Kánonikus Kriptográfiai Hash és Audit Láncolat Motor
 * Determinisztikus RFC 8785 JSON és FIPS 180-4 SHA-256 lenyomatképzés.
 * 
 * Támadási és hibamodellek ellenőrzése:
 * 1. Genesis integritás (kötelező 64 darab '0' prevHash és belső hash egyezés)
 * 2. Láncolati folytonosság (prevHash egyezés; köztes rekord törlése vagy átrendezés azonnal bukik)
 * 3. Időbélyeg-monotonitás és érvényesség (szigorú ISO-8601 dátum, regresszió elleni védelem)
 * 4. Tartalmi integritás (belső mezők újrahashingje RFC 8785 kánonikus formában)
 * 5. Külső bizalmi horgony (Trust Anchor: teljes lánc-újragenerálási / kicserélési támadás detektálása)
 */

import { sha256Utf8, hmacSha256Utf8, timingSafeEqualStrings } from './sha256.ts';
import { canonicalJsonStringify } from './canonicalJson.ts';

export const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface CanonicalAuditRecordPayload {
  negyedev: string;
  esemenyTipus: string;
  kepletVerzio: string;
  elozetesHipotezis: string;
  nullhipotezis: string;
  mertEltérés: string;
  döntésiEredmény: string;
  felelős: string;
  bemenetiHash: string;
  [key: string]: unknown;
}

export interface CanonicalAuditRecord extends CanonicalAuditRecordPayload {
  id: string;
  timestamp: string;
  prevHash: string;
  hash: string;
}

export interface TrustAnchor {
  checkpointIndex: number;
  checkpointHash: string;
  checkpointTimestamp: string;
  authoritativeDigest: string;
  description: string;
}

const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

/**
 * RFC 8785 szerinti determinisztikus kánonikus JSON sztring előállítása
 */
export function canonicalizePayload(payload: CanonicalAuditRecordPayload): string {
  const cleanPayload: Record<string, unknown> = {};
  const metaKeys = new Set(['timestamp', 'prevHash', 'hash']);

  for (const key of Object.keys(payload)) {
    if (!metaKeys.has(key)) {
      cleanPayload[key] = payload[key];
    }
  }

  return canonicalJsonStringify(cleanPayload);
}

/**
 * SHA-256 lenyomat számítása a prevHash, timestamp és az RFC 8785 kánonikus payload összekapcsolásából
 */
export function computeCanonicalRecordHash(
  prevHash: string,
  timestamp: string,
  payload: CanonicalAuditRecordPayload
): string {
  const canonicalPayload = canonicalizePayload(payload);
  const signatureInput = `${prevHash}|${timestamp}|${canonicalPayload}`;
  return sha256Utf8(signatureInput);
}

export type ChainErrorCode =
  | 'EMPTY_LEDGER'
  | 'GENESIS_TAMPERED'
  | 'CHAIN_BROKEN'
  | 'PAYLOAD_TAMPERED'
  | 'TIMESTAMP_INVALID'
  | 'TIMESTAMP_REGRESSION'
  | 'TRUST_ANCHOR_MISMATCH';

export interface VerificationResult {
  isValid: boolean;
  errorCode: ChainErrorCode | null;
  brokenIndex: number | null;
  brokenReason: string | null;
  verifiedRecords: number;
}

/**
 * HMAC-SHA256 aláírás számítása a bizalmi horgony védelméhez (platformfüggetlen)
 */
export function computeHmacSha256(key: string, data: string): string {
  return hmacSha256Utf8(key, data);
}

/**
 * Szigorú, minden támadási felületet lefedő auditlánc- és bizalmi horgony ellenőrzés
 */
export function verifyAuditChain(
  records: CanonicalAuditRecord[],
  trustAnchor?: TrustAnchor | null,
  hmacKey?: string
): VerificationResult {
  if (!records || records.length === 0) {
    return {
      isValid: false,
      errorCode: 'EMPTY_LEDGER',
      brokenIndex: -1,
      brokenReason: 'Az audit napló üres: nem található rögzített genesis rekord.',
      verifiedRecords: 0,
    };
  }

  for (let i = 0; i < records.length; i++) {
    const current = records[i];

    // Időbélyeg szintaktikai érvényességének vizsgálata szigorú ISO-8601 formátumra
    if (!ISO_8601_REGEX.test(current.timestamp) || isNaN(Date.parse(current.timestamp))) {
      return {
        isValid: false,
        errorCode: 'TIMESTAMP_INVALID',
        brokenIndex: i,
        brokenReason: `Érvénytelen ISO-8601 időbélyeg a(z) ${i}. rekordnál (${current.id}): '${current.timestamp}'.`,
        verifiedRecords: i,
      };
    }
    const currentTime = Date.parse(current.timestamp);

    // 1. Genesis rekord vizsgálata
    if (i === 0) {
      if (current.prevHash !== GENESIS_PREV_HASH) {
        return {
          isValid: false,
          errorCode: 'GENESIS_TAMPERED',
          brokenIndex: 0,
          brokenReason: `Érvénytelen genesis rekord (${current.id}): a prevHash értéke nem a megkövetelt 64 darab zéró ('${GENESIS_PREV_HASH}'), hanem '${current.prevHash}'.`,
          verifiedRecords: 0,
        };
      }
    } else {
      const prev = records[i - 1];

      // 2. Láncolati folytonosság (prevHash == records[i-1].hash)
      if (current.prevHash !== prev.hash) {
        return {
          isValid: false,
          errorCode: 'CHAIN_BROKEN',
          brokenIndex: i,
          brokenReason: `Lánctörés a(z) ${i}. rekordnál (${current.id}): elvárt prevHash '${prev.hash}', kapott '${current.prevHash}' (köztes rekord törlése vagy átrendezés detektálva).`,
          verifiedRecords: i,
        };
      }

      // 3. Időbélyeg-monotonitás vizsgálata (timestamp regression / replay elleni védelem)
      const prevTime = Date.parse(prev.timestamp);
      if (currentTime < prevTime) {
        return {
          isValid: false,
          errorCode: 'TIMESTAMP_REGRESSION',
          brokenIndex: i,
          brokenReason: `Időbélyeg-regresszió a(z) ${i}. rekordnál (${current.id}): a rekord időbélyege (${current.timestamp}) megelőzi az előző rekordét (${prev.timestamp}).`,
          verifiedRecords: i,
        };
      }
    }

    // 4. Tartalmi integritás vizsgálata (a rekord saját adatainak újrahashingje RFC 8785 szerint)
    const expectedHash = computeCanonicalRecordHash(current.prevHash, current.timestamp, current);
    if (current.hash !== expectedHash) {
      return {
        isValid: false,
        errorCode: 'PAYLOAD_TAMPERED',
        brokenIndex: i,
        brokenReason: `Tartalmi manipuláció a(z) ${i}. rekordnál (${current.id}): a tárolt hash '${current.hash}' nem egyezik a tényleges rekordadatokból újraszámított '${expectedHash}' értékkel!`,
        verifiedRecords: i,
      };
    }
  }

  // 5. Külső bizalmi horgony (Trust Anchor) ellenőrzése
  if (trustAnchor) {
    if (records.length <= trustAnchor.checkpointIndex) {
      return {
        isValid: false,
        errorCode: 'TRUST_ANCHOR_MISMATCH',
        brokenIndex: records.length - 1,
        brokenReason: `Külső bizalmi horgony csonkítás: a napló csak ${records.length} rekordot tartalmaz, de a hiteles ellenőrzőpont a(z) ${trustAnchor.checkpointIndex}. indexen volt rögzítve.`,
        verifiedRecords: records.length,
      };
    }

    const checkpointRecord = records[trustAnchor.checkpointIndex];
    if (checkpointRecord.hash !== trustAnchor.checkpointHash) {
      return {
        isValid: false,
        errorCode: 'TRUST_ANCHOR_MISMATCH',
        brokenIndex: trustAnchor.checkpointIndex,
        brokenReason: `Külső bizalmi horgony eltérés: a tárolt rekord hash ('${checkpointRecord.hash}') nem egyezik a védett ellenőrzőponton rögzített hiteles hash-sel ('${trustAnchor.checkpointHash}')! Teljes lánccsere (Replaced Chain Attack) detektálva.`,
        verifiedRecords: trustAnchor.checkpointIndex,
      };
    }

    // HMAC digitális aláírás jelenlétének és érvényességének szigorú ellenőrzése
    if (!trustAnchor.authoritativeDigest || typeof trustAnchor.authoritativeDigest !== 'string') {
      return {
        isValid: false,
        errorCode: 'TRUST_ANCHOR_MISMATCH',
        brokenIndex: trustAnchor.checkpointIndex,
        brokenReason: 'Külső bizalmi horgony hiányzó vagy érvénytelen authoritativeDigest HMAC aláírás (a mező eltávolítását a rendszer detektálta)!',
        verifiedRecords: trustAnchor.checkpointIndex,
      };
    }

    if (hmacKey) {
      const expectedDigest = computeHmacSha256(hmacKey, `${trustAnchor.checkpointHash}|${trustAnchor.checkpointTimestamp}|MNB_PST_AUTHORITY`);
      const isDigestValid = timingSafeEqualStrings(trustAnchor.authoritativeDigest, expectedDigest);

      if (!isDigestValid) {
        return {
          isValid: false,
          errorCode: 'TRUST_ANCHOR_MISMATCH',
          brokenIndex: trustAnchor.checkpointIndex,
          brokenReason: 'Külső bizalmi horgony HMAC hitelesítési hiba: az authoritativeDigest nem egyezik a titkos HMAC kulccsal számított értékkel! A horgony hamisítva lett.',
          verifiedRecords: trustAnchor.checkpointIndex,
        };
      }
    }
  }

  return {
    isValid: true,
    errorCode: null,
    brokenIndex: null,
    brokenReason: null,
    verifiedRecords: records.length,
  };
}

