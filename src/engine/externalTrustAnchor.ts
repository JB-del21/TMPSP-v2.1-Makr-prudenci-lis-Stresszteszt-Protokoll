/**
 * TMPSP v2.1 External Trust Anchor Interface & Adapter
 * AUD-008: Telepítési állapot külső bizalmi rögzítése
 * 
 * Feladata: A telepítés inicializálási állapotának olyan, az audit-adattártól
 * elkülönített bizalmi tartományban való rögzítése, amelyet a helyi auditfájlok törlése
 * önmagában nem töröl.
 */

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
 * Fejlesztői / Tesztelhető Adapter környezeti változó vagy elkülönített külső fájl alapján
 */
export class EnvOrFileExternalTrustAnchorAdapter implements IExternalTrustAnchorRegistry {
  private registryFilePath: string | null;

  constructor(registryFilePath?: string) {
    this.registryFilePath = registryFilePath || process.env.TMPSP_EXTERNAL_REGISTRY_FILE || null;
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
        const data = JSON.parse(content);
        if (data && data.systemId === systemId && data.status === 'INITIALIZED') {
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

    if (this.registryFilePath) {
      try {
        const fs = await import('fs');
        fs.writeFileSync(this.registryFilePath, JSON.stringify(record, null, 2), 'utf8');
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: false, error: 'Külső regisztrációs szolgáltatás nem elérhető.' };
  }
}
