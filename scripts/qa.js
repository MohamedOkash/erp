const { spawnSync } = require('child_process');
const path = require('path');

const QA_GATES = [
  {
    name: '1. Deterministic i18n Checker & Runtime Simulator',
    script: 'scripts/check-i18n.js',
  },
  {
    name: '2. Translation Quality & Language Parity Audit',
    script: 'scripts/audit-translations.js',
  },
  {
    name: '3. JSX Hardcoded Strings Scanner',
    script: 'scripts/scan-hardcoded.js',
  },
  {
    name: '4. API Limit Contract Scanner (limit <= 100)',
    script: 'scripts/scan-limits.js',
  },
  {
    name: '5. RTL/LTR Direction-Safe CSS & Style Auditor',
    script: 'scripts/check-rtl-css.js',
  },
  {
    name: '6. Locale-Aware Units & Numerics Formatter Check',
    script: 'scripts/check-units.js',
  },
  {
    name: '7. Multilingual Reference Data Database Integrity',
    script: 'scripts/check-locale-data.js',
  },
  {
    name: '8. Original Engineering Standards Compliance Verification',
    script: 'scripts/compare-standards.js',
  },
];

function runQaGate() {
  console.log('===============================================================');
  console.log('🛡️  SACODECO UNIFIED QA GATE — RUNTIME & REPOSITORIES VERIFIER');
  console.log('===============================================================\n');

  const startTime = Date.now();
  let passedCount = 0;

  for (const gate of QA_GATES) {
    console.log(`\n▶ [STARTING GATE] ${gate.name}...`);
    const scriptPath = path.resolve(__dirname, '..', gate.script);
    const result = spawnSync(process.execPath, [scriptPath], {
      stdio: 'inherit',
      env: process.env,
    });

    if (result.status !== 0) {
      console.error(`\n❌ [GATE FAILED] ${gate.name} failed with exit code ${result.status}.`);
      console.error('🚫 QA GATE REJECTED: All violations must be resolved before proceeding.');
      process.exit(result.status || 1);
    }

    console.log(`✔ [GATE PASSED] ${gate.name}`);
    passedCount++;
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n===============================================================');
  console.log(`🎉 ALL ${passedCount} / ${QA_GATES.length} QA GATES PASSED CLEANLY in ${durationSec}s!`);
  console.log('===============================================================');
  process.exit(0);
}

runQaGate();
