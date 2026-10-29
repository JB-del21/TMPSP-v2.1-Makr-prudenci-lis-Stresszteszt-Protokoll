/**
 * TMPSP v2.1 External Trust Anchor Interface & Adapter
 * AUD-008: Telepítési állapot külső bizalmi rögzítése
 * 
 * Feladata: A telepítés inicializálási állapotának olyan, az audit-adattártól
 * elkülönített bizalmi tartományban való rögzítése, amelyet a helyi auditfájlok törlése
 * önmagában nem töröl.
 */

import crypto from 'crypto';

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

  public async verifyExternalInitialization(systemId: string): Promise<ExternalVerificationResult> {
    if (!this.isConfigured()) {
      return {
        isConfigured: false,
        isInitialized: false,
        error: 'BLOCKED_EXTERNAL_TRUST_ANCHOR: Nincs beállítva külső bizalmi horgony (TMPSP_EXTERNAL_ANCHOR_URL / TMPSP_EXTERNAL_REGISTRY_FILE hiányzik).',
      };
    }

    if (this.registryFilePath) {
      try {
        const fs = await import('fs');
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
      error: 'Külső horgony-szolgáltatás elérése nem konfigurált.',
    };
  }

  public async registerExternalInitialization(record: ExternalInitRecord): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'BLOCKED_EXTERNAL_TRUST_ANCHOR: Külső bizalmi infrastruktúra nem érhető el a regisztrációhoz.',
      };
    }

    // Digitális aláírás csatolása
    const signature = computeExternalInitSignature(this.hmacSecret, record.systemId, record.initializedAt);
    const signedRecord: ExternalInitRecord = {
      ...record,
      signature,
    };

    if (this.registryFilePath) {
      try {
        const fs = await import('fs');
        fs.writeFileSync(this.registryFilePath, JSON.stringify(signedRecord, null, 2), 'utf8');
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: false, error: 'Külső regisztrációs szolgáltatás nem elérhető.' };
  }
}
