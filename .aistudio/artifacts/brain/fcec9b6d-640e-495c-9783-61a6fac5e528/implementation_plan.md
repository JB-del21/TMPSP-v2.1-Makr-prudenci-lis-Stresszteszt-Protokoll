# TMPSP v2.1 – Teszt-Vezérelt Mérnöki Validálás és Tiszta Motor (Végleges Terv)

A TMPSP v2.1 mérnöki megvalósítása a megerősített döntés alapján egy szigorú, teszt-vezérelt (TDD) architektúrával indul: először az automatizált tesztcsomagot és a felülettől teljesen független tiszta számítási/állapotgép-motort építjük meg, garantálva, hogy a makroprudenciális szabályok minden peremfeltétele (adathiány, perzisztencia, likviditási bypass, YoY bázis) matematikailag és logikailag bizonyítottan helyes legyen a felületi megjelenítés előtt.

---

### User Review & Critical Decisions

> [!IMPORTANT] A felhasználó által megerősített döntések és mérnöki garanciák:
- **Megerősített indítási stratégia**: **Először az automatizált tesztcsomag és a tiszta motor megépítése**. A tesztek közvetlenül a számítási és állapotgép-függvényeket vizsgálják, kizárva a felületi interferenciát és a hamis zöld/piros riasztásokat.
- **Három megalkuvást nem tűrő szabály**:
  1. *A szintetikus adat nem tényadat*: Minden pilotrekord forrása (`HISTÓRIKUS_BÁZIS_2023_2024`, `SZINTETIKUS_PILOT_2024Q1`, `PROJEKCIÓ_2025_2026`), képletverziója és adatminősége (DRL) expliciten és elkülönítve szerepel a modellben.
  2. *Az adathiány nem zöld jelzés*: Hiányzó bázisidőszak (1.2a YoY -10pp), elégtelen perzisztencia (1.3 1Q vs 2Q) vagy blokkoló adatminőség (`HOZZÁFÉRÉS_KÉRDÉSES`, `NEM_ELÉRHETŐ`) esetén az állapotgép kimenete kötelezően `SÁRGA - ELŐZETES` vagy `NEM_ELLENŐRIZHETŐ (ADATHIÁNY)`.
  3. *A hash nem egyenlő a WORM tárolással*: Az SHA-256 integritás-ellenőrző lenyomatot a szerveroldali, append-only JSONL naplóhoz kötjük láncolva (`server.ts` `/api/audit`), elválasztva az ellenőrzést a fizikai tárolástól.
- **11 Főindikátor és 15 Mérési Sor Relációs Rendszere**:
  - `Főindikátor_ID` és `Mérési_sor_ID` explicit párosítása a kettébontott mutatóknál (1.2a/b és 3.1a/b).

---

### 1. Háromlépcsős Mérnöki Végrehajtási Terv

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. SZAKASZ: TISZTA MOTOR & AUTOMATIZÁLT TESZTCSOMAG                        │
│ • Indikátorspecifikus kalkulációk: HHI, LGD-shift, MTR, YoY-bázis           │
│ • Állapotgép logikai tesztek: Adathiány, Perzisztencia, Likviditási Bypass  │
│ • Futtatható tesztfuttató (TestSuite runner) vizuális és konzolos kimenettel│
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. SZAKASZ: VISSZATESZTELÉS & KÜSZÖB-VALIDÁLÁS (Threshold_Calibration)      │
│ • 2023Q1–2024Q4 (8 negyedév) bázisadatok betöltése és kezelése             │
│ • Egzakt trapéz-integrációs AUC/ROC és False Positive Rate (FPR) algoritmus │
│ • Validációs felülbírálat: JELÖLT -> STATISZTIKAILAG_VALIDÁLT átmenet       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. SZAKASZ: AUDITINTEGRITÁS (WORM) & TELJES INTERAKTÍV RENDSZER             │
│ • Express szerveroldali append-only audit ledger (/api/audit)               │
│ • SHA-256 hash-láncolt naplózás és kriptográfiai verifikáció               │
│ • React felület: 4 Modul, Vezérlőpult, Sokk-teszt, Riport és XLSX export    │
│ • TypeScript és build fordítási igazolás (compile_applet)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. A Tesztcsomag és a Tiszta Motor Specifikációja (1. Szakasz)

#### A. A Tesztcsomag (`src/engine/testSuite.ts`) Kulcstesztjei:
1. **Teszt 1 (Számtani pontosság)**: A 2024Q1 pilot tesztadataiból újraszámított 15 érték egzakt egyezése a specifikációval (pl. 1.2a = 42.04%, 1.2b = 75.90%, 1.3 = 53.26%, 2.1 = 2.088, 2.2 = 8.84%, stb.).
2. **Teszt 2 (1.2a YoY bázishiány)**: Ha az előző év azonos negyedéve hiányzik, a -10pp feltétel nem válik igazra; a státusz `NEM_ELLENŐRIZHETŐ`, az állapotgép nem adhat zöldet.
3. **Teszt 3 (1.3 Perzisztencia)**: Egyetlen negyedéves 53.3%-os átlépés esetén a 2 negyedéves szabály miatt `SÁRGA (FIGYELMEZTETŐ)` keletkezik, NEM Piros.
4. **Teszt 4 (1.3 Adatminőségi blokkoló)**: `HOZZÁFÉRÉS_KÉRDÉSES` státusz mellett a rendszer adategyeztetési kötelezettséget ír elő, nem kezelheti megbízható tényként.
5. **Teszt 5 (2.4 LGD-shift hiány és Bypass)**: Ha a 2.4 mutató `NEM_ELÉRHETŐ`, a likviditási sokk-bypass nem aktiválódhat, és a modul nem válik Zölddé.
6. **Teszt 6 (Integrált Állapotgép kimenet)**: A 2024Q1 szimulált piloton a rendszer szigorúan és konzervatívan `SÁRGA - ELŐZETES` státuszt ad.

#### B. Képletmotor (`src/engine/calculator.ts`):
- **1.1 HHI**: $\sum_{i=1}^{10} s_i^2$ (decilisenkénti részesedések négyzetösszege).
- **1.2a**: $\frac{\text{Folyósított egyedi adósok}}{\text{Egyedi igénylők}}$ és $\Delta_{\text{YoY}} = R_t - R_{t-4}$.
- **1.2b**: $\frac{\Sigma \text{Folyósított volumen}}{\Sigma \text{Igényelt volumen}}$.
- **1.3**: $\frac{\text{JTM miatti elutasítás}}{\text{Összes dokumentált elutasítás}}$.
- **1.4**: $\frac{\text{Volumen}_{\text{JTM}>40\%}}{\text{Összes folyósítás}}$.
- **2.1**: $\frac{\text{Medián DOM}_{\text{közép}}}{\text{Medián DOM}_{\text{prémium}}}$.
- **2.2**: $\frac{\text{Hirdetési ár} - \text{NAV ár}}{\text{Hirdetési ár}}$.
- **2.3**: $\frac{\text{Fedezeti puffer}_{\text{DOM}>150\text{n}}}{\text{Állomány}}$.
- **2.4**: $LGD_{\text{kényszer}} - LGD_{\text{önkéntes}}$ (százalékpont delta).
- **3.1a**: $\frac{\text{Háztartások száma, ahol lakhatási kiadás} / \text{jövedelem} > 40\%}{\text{Összes háztartás}}$.
- **3.1b**: $\text{Medián}\left(\frac{\text{Egyedi havi lakhatási költség}}{\text{Egyedi havi nettó jövedelem}}\right)$.
- **3.2**: $\frac{\text{Nettó belső vándorlás (18-41 év)}}{\text{Érintett lakónépesség}} \times 1000$.
- **3.3**: $\frac{\text{Felszámolt építőipari KKV-k száma}}{\text{Összes aktív építőipari KKV}}$.
- **4.1**: $\frac{\text{Garantált hitelállomány}}{\text{Kumulált GDP}}$.
- **4.2**: $\frac{\text{Generált adótöbblet}}{\text{Költségvetési támogatási kiadás}}$.

---

### 3. Visszatesztelés és Küszöb-Validálás (2. Szakasz)

- **2023Q1–2024Q4 8 Negyedéves Történeti Bázis**:
  - Valós trendekkel (MNB Lakáspiaci jelentések, HITREG és KSH adatok) feltöltött 8 negyedéves bázis.
- **AUC/ROC Számítás**:
  - Valós hitelezési/piaci feszültség-eseményekhez viszonyított szenzitivitás és specificitás kiszámítása különböző küszöbértékek mellett.
  - Trapéz-integráció: $AUC = \sum_{k} \frac{TPR_k + TPR_{k-1}}{2} \times (FPR_k - FPR_{k-1})$.
- **Validációs Szabály**:
  - Egy küszöb csak akkor kaphat `STATISZTIKAILAG_VALIDÁLT` státuszt, ha az AUC $\ge 0.75$, a Téves Riasztási Ráta (FPR) $\le 15\%$, és az adatok DRL szintje legalább `PROXY`. Ellenkező esetben a küszöb marad `JELÖLT`.

---

### 4. Auditintegritás és WORM Tárolás (3. Szakasz)

- **Szerveroldali Append-Only Ledger (`server.ts`)**:
  - Express backend port 3000-en, Vite middleware-rel.
  - `/api/audit` (POST): Új rekord hozzáadása. A szerver ellenőrzi az előző hash-t (`prev_hash`), kiszámítja a követező SHA-256 hash-t (`sha256(prev_hash + timestamp + payload)`), és hozzáírja (append) a `data/audit-ledger.jsonl` állományhoz. Törlés vagy módosítás végpont nincs.
  - `/api/audit` (GET): A teljes auditnapló lekérdezése.
  - `/api/audit/verify` (GET): A teljes hash-láncolat matematikai érvényességének vizsgálata a szerveren.

---

### 5. Felületi Megjelenés és Exportálás

- **Konzisztens Intézményi Felület**:
  - `Vezérlőpult`: FSM állapotgép-folyamatábra (Zöld -> Sárga -> Piros / Adathiány), 11 főindikátor kártyái, 15 mérési sor állapota.
  - `Modulnézetek`: Képletek, számláló/nevező szerkesztők, DRL státusz-választó.
  - `Kalibrációs Munkatér`: AUC/ROC táblázat, visszatesztelési eredmények, küszöbregiszter.
  - `Tesztközpont`: Beépített vizuális tesztfuttató gomb, valós idejű teszteredmények (Pass/Fail) részletes hibaelemzéssel.
  - `WORM Auditfelület`: Hash-láncolat vizualizáció, szerveroldali állapot, azonnali integritás-ellenőrzés.
  - `Riport és Export`: MNB Pénzügyi Stabilitási Tanács formátumú nyomtatható vezetői jelentés és 7 munkalapos Excel (.xlsx) export.

---

### Implementation Verification Steps

1. **Számítási motor és tesztek futtatása**: A test suite minden tesztesetének sikeres lefutása (6/6 PASS).
2. **Kódellenőrzés & Fordítás**: `compile_applet` és `lint_applet` futtatása, 100% hibamentes TypeScript fordítás.
3. **Szerveroldali WORM működés**: `/api/audit` ellenőrzése új bejegyzések rögzítésével és hash-láncolat igazolásával.
