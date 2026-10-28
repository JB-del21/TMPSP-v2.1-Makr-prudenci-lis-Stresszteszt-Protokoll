process.env.NODE_ENV = 'test';

import { runAllEngineTests, TestResult } from './testSuite.ts';

console.log('================================================================');
console.log('TMPSP v2.1 – AUTOMATIZÁLT MOTOR- ÉS INTEGRITÁSTESZT FUTTATÓ');
console.log('MNB Pénzügyi Stabilitási Tanács Mérési Specifikáció');
console.log('================================================================\n');

const startTime = Date.now();
const results: TestResult[] = runAllEngineTests();
const duration = Date.now() - startTime;

let passed = 0;
let failed = 0;

const categories = Array.from(new Set(results.map((r) => r.kategoria)));

categories.forEach((cat) => {
  console.log(`\n--- KATEGÓRIA: ${cat} ---`);
  const catTests = results.filter((r) => r.kategoria === cat);
  catTests.forEach((t) => {
    if (t.sikeres) {
      passed++;
      console.log(`  [ PASS ] ${t.id}: ${t.nev}`);
      console.log(`           Eredmény: ${t.kapott}`);
    } else {
      failed++;
      console.log(`  [ FAIL ] ${t.id}: ${t.nev}`);
      console.log(`           Elvárt: ${t.vart}`);
      console.log(`           Kapott: ${t.kapott}`);
      if (t.reszletek) console.log(`           Részletek: ${t.reszletek}`);
    }
  });
});

console.log('\n================================================================');
console.log(`ÖSSZEGZÉS: ${passed + failed} teszt lefutva ${duration} ms alatt.`);
console.log(`SIKERES: ${passed} | SIKERTELEN: ${failed}`);
console.log('================================================================\n');

if (failed > 0) {
  console.error(`HIBA: ${failed} teszt megbukott a specifikációs ellenőrzésen!`);
  process.exit(1);
} else {
  console.log('SIKER: Minden numerikus, állapotgép, kalibrációs és WORM teszt hibátlanul átment.');
  process.exit(0);
}
