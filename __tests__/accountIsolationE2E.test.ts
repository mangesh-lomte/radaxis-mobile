/**
 * RadAxis RIS Mobile — Account Isolation & Data Realism Test Suite
 * Verifies strict server-side authorization and client-side account isolation:
 * - Two distinct synthetic patients (Jonathan Miller vs Margaret Chen)
 * - Two distinct staff roles (Receptionist vs Radiologist / Admin)
 * - IDOR prevention: Patient A cannot retrieve Patient B's records
 * - Token isolation: Patient tokens rejected on staff routes, staff tokens rejected on patient routes
 * - Cache & overlay resetting on logout
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

const STAGING_API_BASE = 'http://127.0.0.1:5005/api/v1';

describe('RadAxis Mobile — Account Isolation & Multi-User Verification', () => {
  let patientAToken: string;
  let patientBToken: string;
  let adminStaffToken: string;
  let receptionStaffToken: string;

  test('1. Patient A Authentication: Jonathan Miller (+1-555-019-2831)', async () => {
    // 1. Request OTP
    const reqRes = await fetch(`${STAGING_API_BASE}/portal/patient/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+1-555-019-2831' }),
    });
    const reqJson = await reqRes.json();
    assert.strictEqual(reqRes.status, 200, `Request OTP failed: ${JSON.stringify(reqJson)}`);
    assert.strictEqual(reqJson.success, true);
    assert.strictEqual(reqJson.data.isExistingPatient, true);

    // 2. Verify OTP with secure authorized demo evaluation PIN
    const verifyRes = await fetch(`${STAGING_API_BASE}/portal/patient/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+1-555-019-2831', otp: '839214' }),
    });
    const verifyJson = await verifyRes.json();
    assert.strictEqual(verifyRes.status, 200, `Verify OTP failed: ${JSON.stringify(verifyJson)}`);
    assert.strictEqual(verifyJson.data.patient.patientId, 'PAT-2026-10001');
    assert.strictEqual(verifyJson.data.patient.firstName, 'Jonathan');
    assert.strictEqual(verifyJson.data.patient.lastName, 'Miller');
    patientAToken = verifyJson.data.token;
    assert.ok(patientAToken, 'Patient A token must be issued');
  });

  test('2. Patient B Authentication: Margaret Chen (+1-555-014-9920)', async () => {
    // 1. Request OTP
    const reqRes = await fetch(`${STAGING_API_BASE}/portal/patient/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+1-555-014-9920' }),
    });
    const reqJson = await reqRes.json();
    assert.strictEqual(reqRes.status, 200);
    assert.strictEqual(reqJson.data.isExistingPatient, true);

    // 2. Verify OTP with secure authorized demo evaluation PIN
    const verifyRes = await fetch(`${STAGING_API_BASE}/portal/patient/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+1-555-014-9920', otp: '517409' }),
    });
    const verifyJson = await verifyRes.json();
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyJson.data.patient.patientId, 'PAT-2026-10002');
    assert.strictEqual(verifyJson.data.patient.firstName, 'Margaret');
    assert.strictEqual(verifyJson.data.patient.lastName, 'Chen');
    patientBToken = verifyJson.data.token;
    assert.ok(patientBToken, 'Patient B token must be issued');
    assert.notStrictEqual(patientAToken, patientBToken, 'Patient tokens must be unique');
  });

  test('3. Data Isolation: Patient A sees only Patient A appointments', async () => {
    const apptRes = await fetch(`${STAGING_API_BASE}/portal/patient/appointments`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const apptJson = await apptRes.json();
    assert.strictEqual(apptRes.status, 200);
    const items = apptJson.data;
    assert.ok(Array.isArray(items), 'Appointments must be an array');
    assert.ok(items.length > 0, 'Patient A must have at least one appointment');

    // Confirm every appointment belongs to Patient A and never contains Patient B accessions
    for (const appt of items) {
      assert.ok(appt.accessionNumber.startsWith('ACC-'), 'Must be valid accession');
      assert.notStrictEqual(appt.accessionNumber, 'ACC-20261105-MR02', 'Patient A must NOT see Patient B study');
    }
  });

  test('4. Data Isolation: Patient B sees only Patient B appointments', async () => {
    const apptRes = await fetch(`${STAGING_API_BASE}/portal/patient/appointments`, {
      headers: { Authorization: `Bearer ${patientBToken}` },
    });
    const apptJson = await apptRes.json();
    assert.strictEqual(apptRes.status, 200);
    const items = apptJson.data;
    assert.ok(Array.isArray(items), 'Appointments must be an array');
    assert.ok(items.length > 0, 'Patient B must have at least one appointment');

    // Confirm every appointment belongs to Patient B
    for (const appt of items) {
      assert.ok(appt.accessionNumber === 'ACC-20261105-MR02' || appt.accessionNumber === 'ACC-20261123-MR02');
      assert.strictEqual(appt.modality, 'MRI');
      assert.notStrictEqual(appt.accessionNumber, 'ACC-20261105-CT01', 'Patient B must NOT see Patient A studies');
    }
  });

  test('5. IDOR Protection: Patient A cannot access Patient B studies via API manipulation', async () => {
    // Patient A attempts to access Patient B accession (ACC-20261105-MR02)
    const idorRes = await fetch(`${STAGING_API_BASE}/portal/patient/reports/ACC-20261105-MR02/viewer`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    assert.strictEqual(idorRes.status, 403, `IDOR protection must return HTTP 403 Forbidden, got ${idorRes.status}`);
  });

  test('6. Staff Role 1 Authentication: Admin Staff', async () => {
    const testPassword = process.env.TEST_STAFF_PASSWORD || 'DemonstrationAuth';
    const loginRes = await fetch(`${STAGING_API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ris.local', password: testPassword }),
    });
    const loginJson = await loginRes.json();
    assert.strictEqual(loginRes.status, 200, `Admin login failed: ${JSON.stringify(loginJson)}`);
    assert.strictEqual(loginJson.data.user.role, 'ADMIN');
    adminStaffToken = loginJson.data.token;
    assert.ok(adminStaffToken, 'Admin staff token must be issued');

    // Admin can view hospital-wide orders
    const ordersRes = await fetch(`${STAGING_API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${adminStaffToken}` },
    });
    const ordersJson = await ordersRes.json();
    assert.strictEqual(ordersRes.status, 200);
    assert.ok(ordersJson.data.total >= 4, 'Staff sees all authorized hospital-wide clinical orders');
  });

  test('7. Staff Role 2 Authentication: Receptionist Staff', async () => {
    const testPassword = process.env.TEST_STAFF_PASSWORD || 'DemonstrationAuth';
    const loginRes = await fetch(`${STAGING_API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reception@ris.local', password: testPassword }),
    });
    const loginJson = await loginRes.json();
    assert.strictEqual(loginRes.status, 200, `Reception login failed: ${JSON.stringify(loginJson)}`);
    assert.strictEqual(loginJson.data.user.role, 'RECEPTION');
    receptionStaffToken = loginJson.data.token;
    assert.ok(receptionStaffToken, 'Reception staff token must be issued');

    // Receptionist sees checked-in patients for today
    const queueRes = await fetch(`${STAGING_API_BASE}/reception/queue`, {
      headers: { Authorization: `Bearer ${receptionStaffToken}` },
    });
    const queueJson = await queueRes.json();
    assert.strictEqual(queueRes.status, 200, `Reception queue failed: ${JSON.stringify(queueJson)}`);
    assert.ok(Array.isArray(queueJson.data), 'Reception queue must return an array');
  });

  test('8. Cross-Session Boundary Isolation: Tokens rejected across boundaries', async () => {
    // 1. Patient Token passed to Staff Endpoint (/orders)
    const crossRes1 = await fetch(`${STAGING_API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    assert.ok([401, 403].includes(crossRes1.status), 'Patient token must be rejected on staff routes');

    // 2. Staff Token passed to Patient Portal Endpoint (/portal/patient/appointments)
    const crossRes2 = await fetch(`${STAGING_API_BASE}/portal/patient/appointments`, {
      headers: { Authorization: `Bearer ${adminStaffToken}` },
    });
    assert.ok([401, 403].includes(crossRes2.status), 'Staff token must be rejected on patient portal routes');
  });

  test('9. Client Session & Cache Invalidation Verification', () => {
    const fs = require('fs');
    const path = require('path');
    const root = path.resolve(__dirname, '..');

    // Verify AuthContext invalidates query cache on logout
    const authSrc = fs.readFileSync(path.join(root, 'src/auth/AuthContext.tsx'), 'utf8');
    assert.ok(authSrc.includes('useQueryClient()'), 'AuthContext must hook into useQueryClient');
    assert.ok(authSrc.includes('queryClient.clear()'), 'AuthContext must clear queryClient on logout');

    // Verify PatientAuthContext invalidates query cache and overlays on logout
    const patientAuthSrc = fs.readFileSync(path.join(root, 'src/auth/PatientAuthContext.tsx'), 'utf8');
    assert.ok(patientAuthSrc.includes('useQueryClient()'), 'PatientAuthContext must hook into useQueryClient');
    assert.ok(patientAuthSrc.includes('queryClient.clear()'), 'PatientAuthContext must clear queryClient on logout');
    assert.ok(patientAuthSrc.includes('portalService.resetSessionOverlay()'), 'PatientAuthContext must reset session overlay on logout');

    // Verify portalService scopes overlay to patient
    const portalSrc = fs.readFileSync(path.join(root, 'src/services/portalService.ts'), 'utf8');
    assert.ok(portalSrc.includes('resetSessionOverlay:'), 'portalService must expose resetSessionOverlay');
    assert.ok(!portalSrc.includes("patientId: 'PAT-2026-10001'"), 'portalService must NOT hardcode patientId PAT-2026-10001');

    // Verify billing.tsx has zero hardcoded Jonathan Miller fixtures
    const billingSrc = fs.readFileSync(path.join(root, 'app/(app)/billing.tsx'), 'utf8');
    assert.ok(!billingSrc.includes('DEMO_FIXTURE_INVOICES'), 'billing.tsx must not contain DEMO_FIXTURE_INVOICES');
    assert.ok(!billingSrc.includes('Jonathan Miller'), 'billing.tsx must not contain hardcoded Jonathan Miller');

    // Verify home.tsx has zero canonical studies fallback
    const homeSrc = fs.readFileSync(path.join(root, 'app/(app)/(tabs)/home.tsx'), 'utf8');
    assert.ok(!homeSrc.includes('CANONICAL_STUDIES'), 'home.tsx must not import or render CANONICAL_STUDIES');
    assert.ok(!homeSrc.includes('CANONICAL_OVERVIEW_METRICS'), 'home.tsx must not import or render CANONICAL_OVERVIEW_METRICS');
    assert.ok(!homeSrc.includes('ACC-2026-00203'), 'home.tsx must not hardcode ACC-2026-00203');
  });
});
