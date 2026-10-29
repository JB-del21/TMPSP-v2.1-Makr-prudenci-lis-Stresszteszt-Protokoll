/**
 * TMPSP v2.1 External Trust Anchor Interface & Adapter
 * AUD-008: Telepítési állapot külső bizalmi rögzítése
 * 
 * Feladata: A telepítés inicializálási állapotának olyan, az audit-adattártól
 * elkülönített bizalmi tartományban való rögzítése, amelyet a helyi auditfájlok törlése
 * önmagában nem töröl.
 */

import crypto from 'crypto';
import fs from 'fs';

export interface ExternalInitRecord {
  systemId: string;
  initializedAt: string;
  environment: string;
  status: 'INITIALIZED' | 'REVOKED';
  signature: string;
}

export interface ExternalVerificationResult {
  isConfigured: boolean;
  isInitialized: boolean;
  record?: ExternalInitRecord;
  error?: string;
}

export interface IExternalTrustAnchorRegistry {
  isConfigured(): boolean;
  verifyExternalInitialization(systemId: string): Promise<ExternalVerificationResult>;
  registerExternalInitialization(record: ExternalInitRecord): Promise<{ success: boolean; error?: string }>;
}

/**
 * Számítja a külső inicializálási rekord HMAC-SHA256 aláírását
 */
export function computeExternalInitSignature(secretKey: string, systemId: string, initializedAt: string): string {
  const data = `${systemId}|${initializedAt}|TMPSP_EXTERNAL_ANCHOR_V1`;
  return crypto.createHmac('sha256', secretKey).update(data, 'utf8').digest('hex');
}

/**
 * Fejlesztői / Tesztelhető Adapter környezeti változó vagy elkülönített külső fájl alapján
 */
export class EnvOrFileExternalTrustAnchorAdapter implements IExternalTrustAnchorRegistry {
  private registryFilePath: string | null;
  private hmacSecret: string;

  constructor(registryFilePath?: string, hmacSecret?: string) {
    this.registryFilePath = registryFilePath || process.env.TMPSP_EXTERNAL_REGISTRY_FILE || null;
    this.hmacSecret = hmacSecret || process.env.TMPSP_HMAC_KEY || 'tmpsp-default-external-hmac-key';
  }

  public isConfigured(): boolean {
    return Boolean(process.env.TMPSP_EXTERNAL_ANCHOR_URL || process.env.TMPSP_EXTERNAL_ANCHOR_KEY || this.registryFilePath);
  }

  public verifyExternalInitializationSync(systemId: string): ExternalVerificationResult {
    if (!this.isConfigured()) {
      return {
        isConfigured: false,
        isInitialized: false,
        error: 'BLOCKED_EXTERNAL_TRUST_ANCHOR: Nincs beállítva külső bizalmi horgony (TMPSP_EXTERNAL_ANCHOR_URL / TMPSP_EXTERNAL_REGISTRY_FILE hiányzik).',
      };
    }

    if (this.registryFilePath) {
      try {
        if (!fs.existsSync(this.registryFilePath)) {
          return { isConfigured: true, isInitialized: false };
        }
        const content = fs.readFileSync(this.registryFilePath, 'utf8');
        const data: ExternalInitRecord = JSON.parse(content);

        if (data && data.systemId === systemId && data.status === 'INITIALIZED') {
          // Digitális aláírás ellenőrzése
          const expectedSignature = computeExternalInitSignature(this.hmacSecret, data.systemId, data.initializedAt);
          if (data.signature !== expectedSignature) {
            return {
              isConfigured: true,
              isInitialized: false,
              error: 'EXTERNAL_TRUST_ANCHOR_SIGNATURE_INVALID: A külső horgony digitális aláírása érvénytelen vagy hamisított!',
            };
          }

          return { isConfigured: true, isInitialized: true, record: data };
        }

        return { isConfigured: true, isInitialized: false };
      } catch (err: any) {
        return { isConfigured: true, isInitialized: false, error: err.message };
      }
    }

    return {
      isConfigured: true,
      isInitialized: false,
      error: 'Külső horgony-szolgáltatás elérése hálózaton keresztül csak aszinkron módon érhető el.',
    };
  }

  public async verifyExternalInitialization(systemId: string): Promise<ExternalVerificationResult> {
    if (!this.isConfigured()) {
      return {
        isConfigured: false,
        isInitialized: false,
        error: 'BLOCKED_EXTERNAL_TRUST_ANCHOR: Nincs beállítva külső bizalmi horgony (TMPSP_EXTERNAL_ANCHOR_URL / TMPSP_EXTERNAL_REGISTRY_FILE hiányzik).',
      };
    }

    const anchorUrl = process.env.TMPSP_EXTERNAL_ANCHOR_URL;
    if (anchorUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${anchorUrl}/verify?systemId=${encodeURIComponent(systemId)}`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          return {
            isConfigured: true,
            isInitialized: false,
            error: `EXTERNAL_TRUST_ANCHOR_HTTP_ERROR: HTTP ${res.status} hiba a külső bizalmi horgonynál (${res.statusText}).`,
          };
        }

        const data: ExternalInitRecord = await res.json();
        if (data && data.systemId === systemId && data.status === 'INITIALIZED') {
          const expectedSignature = computeExternalInitSignature(this.hmacSecret, data.systemId, data.initializedAt);
          if (data.signature !== expectedSignature) {
            return {
              isConfigured: true,
              isInitialized: false,
              error: 'EXTERNAL_TRUST_ANCHOR_SIGNATURE_INVALID: A külső horgony digitális aláírása érvénytelen vagy hamisított!',
            };
          }
          return { isConfigured: true, isInitialized: true, record: data };
        }

        return { isConfigured: true, isInitialized: false };
      } catch (err: any) {
        return {
          isConfigured: true,
          isInitialized: false,
          error: `EXTERNAL_TRUST_ANCHOR_NETWORK_FAILURE: Nem sikerült kapcsolódni a külső horgonyhoz (${err.message}).`,
        };
      }
    }

    return this.verifyExternalInitializationSync(systemId);
  }

  public async registerExternalInitialization(record: ExternalInitRecord): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'BLOCKED_EXTERNAL_TRUST_ANCHOR: Külső bizalmi infrastruktúra nem érhető el a regisztrációhoz.',
      };
    }

    const signature = computeExternalInitSignature(this.hmacSecret, record.systemId, record.initializedAt);
    const signedRecord: ExternalInitRecord = {
      ...record,
      signature,
    };

    const anchorUrl = process.env.TMPSP_EXTERNAL_ANCHOR_URL;
    if (anchorUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${anchorUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(signedRecord),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          return { success: false, error: `EXTERNAL_TRUST_ANCHOR_HTTP_ERROR: HTTP ${res.status}` };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: `EXTERNAL_TRUST_ANCHOR_NETWORK_FAILURE: ${err.message}` };
      }
    }

    if (this.registryFilePath) {
      try {
        fs.writeFileSync(this.registryFilePath, JSON.stringify(signedRecord, null, 2), 'utf8');
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: false, error: 'Külső regisztrációs szolgáltatás nem elérhető.' };
  }

  public registerExternalInitializationSync(record: ExternalInitRecord): { success: boolean; error?: string } {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'BLOCKED_EXTERNAL_TRUST_ANCHOR: Külső bizalmi infrastruktúra nem érhető el a regisztrációhoz.',
      };
    }

    const signature = computeExternalInitSignature(this.hmacSecret, record.systemId, record.initializedAt);
    const signedRecord: ExternalInitRecord = {
      ...record,
      signature,
    };

    if (this.registryFilePath) {
      try {
        fs.writeFileSync(this.registryFilePath, JSON.stringify(signedRecord, null, 2), 'utf8');
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: false, error: 'Külső regisztrációs szolgáltatás hálózaton keresztül csak aszinkron módon érhető el.' };
  }
}
