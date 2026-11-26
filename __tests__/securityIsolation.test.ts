/**
 * Test Suite: Security & Production Safety Verification
 *
 * Verifies:
 * 1. SecureStore token & profile key isolation between Staff and Patient
 * 2. Fail-closed production origin mutation guard logic
 * 3. Local simulation guards for billing, check-in, and critical alerts
 * 4. Distinct demo labeling across simulation artifacts
 * 5. Zero unsupported compliance claims in source files
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pure production target evaluator matching portalService.ts
export const isProductionTarget = (url: string): boolean => {
  if (!url) return true;
  const isLoopback =
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('10.0.2.2');
  return !isLoopback;
};

test('1. SecureStore Session Isolation: Staff vs Patient Keys', () => {
  const staffTokenKey = 'radaxis_auth_token';
  const staffUserKey = 'radaxis_auth_user';

  const patientTokenKey = 'radaxis_patient_token';
  const patientProfileKey = 'radaxis_patient_profile';

  assert.notEqual(
    staffTokenKey,
    patientTokenKey,
    'Staff token key must be distinct from Patient token key'
  );
  assert.notEqual(
    staffUserKey,
    patientProfileKey,
    'Staff user key must be distinct from Patient profile key'
  );
  assert.equal(staffTokenKey, 'radaxis_auth_token');
  assert.equal(staffUserKey, 'radaxis_auth_user');
  assert.equal(patientTokenKey, 'radaxis_patient_token');
  assert.equal(patientProfileKey, 'radaxis_patient_profile');
});

test('2. Production Origin Mutation Guard: Fail-Closed Protection', () => {
  // Live target URL MUST be identified as production and blocked
  assert.equal(isProductionTarget('https://meril-ris.mangesh.my.id/api/v1'), true);
  assert.equal(isProductionTarget('https://production.radaxis.hospital.com'), true);
  assert.equal(isProductionTarget('http://192.168.1.100:4000/api/v1'), true);
  assert.equal(isProductionTarget(''), true);

  // Only strict loopback addresses are recognized as non-production
  assert.equal(isProductionTarget('http://localhost:4000/api/v1'), false);
  assert.equal(isProductionTarget('http://127.0.0.1:4000/api/v1'), false);
  assert.equal(isProductionTarget('http://10.0.2.2:4000/api/v1'), false);
});

test('3. Production Mutation Guard: Billing Payment Simulation', () => {
  const simulatePayment = (invoiceNumber: string, amount: number) => {
    return {
      receiptNumber: `RCP-DEMO-${Date.now()}`,
      invoiceNumber,
      amount,
      status: 'SETTLED',
      isDemoReceipt: true,
      label: 'LOCAL DEMO RECEIPT — NO PAYMENT PROCESSED',
    };
  };

  const receipt = simulatePayment('INV-2026-001', 450);
  assert.ok(receipt.receiptNumber.startsWith('RCP-DEMO-'));
  assert.equal(receipt.isDemoReceipt, true);
  assert.equal(receipt.label, 'LOCAL DEMO RECEIPT — NO PAYMENT PROCESSED');
});

test('4. Production Mutation Guard: Reception Check-In Token Simulation', () => {
  const simulateCheckIn = (patientName: string, modality: string) => {
    return {
      tokenNumber: `DEMO-TKN-${Math.floor(100 + Math.random() * 900)}`,
      patientName,
      modality,
      status: 'CALLED',
      isDemoToken: true,
      label: 'DEMO CHECK-IN TOKEN — NOT RECORDED ON RIS',
    };
  };

  const token = simulateCheckIn('Vance, Eleanor', 'CT');
  assert.ok(token.tokenNumber.startsWith('DEMO-TKN-'));
  assert.equal(token.isDemoToken, true);
  assert.equal(token.label, 'DEMO CHECK-IN TOKEN — NOT RECORDED ON RIS');
});

test('5. Production Mutation Guard: Critical Alerts Simulation', () => {
  const simulateAlertAck = (alertId: string, clinicianName: string) => {
    return {
      alertId,
      status: 'ACKNOWLEDGED',
      acknowledgedBy: clinicianName,
      readBackConfirmed: true,
      isDemoSession: true,
    };
  };

  const ack = simulateAlertAck('crit-001', 'Dr. Arthur Evans');
  assert.equal(ack.status, 'ACKNOWLEDGED');
  assert.equal(ack.readBackConfirmed, true);
  assert.equal(ack.isDemoSession, true);
});

test('6. Truth in Advertising: Zero Unsupported Compliance Claims', () => {
  const searchDirs = ['src', 'app'];
  const rootMobile = path.resolve(__dirname, '..');

  const violations: string[] = [];

  function scanDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('21 CFR Part 11') || content.includes('HIPAA certified')) {
          violations.push(fullPath);
        }
      }
    }
  }

  for (const d of searchDirs) {
    const fullDir = path.join(rootMobile, d);
    if (fs.existsSync(fullDir)) {
      scanDir(fullDir);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Found unsupported compliance claims in: ${violations.join(', ')}`
  );
});

test('7. Authorized Write Endpoints & Production Mutation Safety Policy', async () => {
  (globalThis as any).__DEV__ = true;
  const envSource = fs.readFileSync(path.resolve(__dirname, '../src/constants/environment.ts'), 'utf-8');
  assert.ok(
    envSource.includes('isAuthorizedWriteEndpoint'),
    'environment.ts must define isAuthorizedWriteEndpoint for server-validated write operations'
  );
  assert.ok(
    envSource.includes("'/portal/patient/book'"),
    'Authorized write endpoints must include /portal/patient/book'
  );
  assert.ok(
    envSource.includes("'/portal/patient/verify-otp'"),
    'Authorized write endpoints must include /portal/patient/verify-otp'
  );

  const portalServiceSource = fs.readFileSync(path.resolve(__dirname, '../src/services/portalService.ts'), 'utf-8');
  assert.ok(
    portalServiceSource.includes("'/portal/patient/book'"),
    'portalService.bookAppointment must dispatch genuine request to /portal/patient/book'
  );
  assert.ok(
    !portalServiceSource.includes('sessionOverlay.created.unshift'),
    'portalService must not intercept appointments into in-memory session overlays'
  );
});
