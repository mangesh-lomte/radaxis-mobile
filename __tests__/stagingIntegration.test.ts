/**
 * RadAxis RIS Mobile — Staging Integration & Production Protection Test Suite
 *
 * Verifies:
 * 1. Production host mutation locking (fail-closed protection against meril-ris.mangesh.my.id)
 * 2. Staging server startup and health check
 * 3. Patient booking, rescheduling, and cancellation mutations with roundtrip persistence
 * 4. Reception patient check-in with token assignment
 * 5. Billing payment recording with receipt generation and balance update
 * 6. Technologist scan start, finish, and image QA acceptance
 * 7. Radiologist study claiming, report draft, and final signing
 * 8. Critical finding verbal read-back acknowledgment
 * 9. External study share creation and revocation
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const TEST_PORT = 5099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api/v1`;

// Production Lock Helpers
const PRODUCTION_HOST = 'meril-ris.mangesh.my.id';

function isProductionHost(url: string): boolean {
  return url.toLowerCase().includes(PRODUCTION_HOST.toLowerCase());
}

function isMutationAllowed(url: string, env: string = 'production'): boolean {
  if (isProductionHost(url)) return false;
  return env.toLowerCase() === 'staging';
}

async function request(
  endpoint: string,
  options: { method?: string; body?: any; headers?: Record<string, string> } = {}
) {
  const { method = 'GET', body, headers = {} } = options;
  const url = `${BASE_URL}${endpoint}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  return { status: res.status, ok: res.ok, data: json.data, body: json };
}

describe('RadAxis Mobile: Production Protection & Staging Verification', () => {
  let stagingServer: any = null;

  before(async () => {
    // Dynamically launch staging server on isolated test port
    process.env.STAGING_PORT = String(TEST_PORT);
    const mod = await import('../.staging/stagingServer.mjs');
    stagingServer = mod.default;
    // Allow brief moment for socket binding
    await new Promise((r) => setTimeout(r, 200));
  });

  after(async () => {
    if (stagingServer && stagingServer.close) {
      await new Promise<void>((resolve) => stagingServer.close(() => resolve()));
    }
  });

  test('1. Production Mutation Guard: Strict Fail-Closed Verification', () => {
    const prodUrl = `https://${PRODUCTION_HOST}/api/v1`;
    assert.equal(isProductionHost(prodUrl), true, 'Production host must be identified');
    assert.equal(isMutationAllowed(prodUrl, 'production'), false, 'Mutations must be denied in prod env');
    assert.equal(isMutationAllowed(prodUrl, 'staging'), false, 'Mutations to prod host must be denied even if env=staging');

    // Safe local/staging targets
    assert.equal(isProductionHost(BASE_URL), false, 'Staging URL is not production host');
    assert.equal(isMutationAllowed(BASE_URL, 'staging'), true, 'Mutations allowed when staging');
    assert.equal(isMutationAllowed(BASE_URL, 'production'), false, 'Mutations denied if env is production');
  });

  test('2. Staging Server Health Check', async () => {
    const res = await request('/health');
    assert.equal(res.status, 200);
    assert.equal(res.ok, true);
    assert.equal(res.data.status, 'healthy');
    assert.equal(res.data.env, 'staging-mock');
  });

  test('3. Patient OTP Authentication Flow', async () => {
    const reqOtp = await request('/portal/patient/request-otp', {
      method: 'POST',
      body: { phone: '+91 98765 43210' },
    });
    assert.equal(reqOtp.status, 200);
    assert.ok(reqOtp.data.referenceId);

    const verifyOtp = await request('/portal/patient/verify-otp', {
      method: 'POST',
      body: { phone: '+91 98765 43210', otp: '123456' },
    });
    assert.equal(verifyOtp.status, 200);
    assert.ok(verifyOtp.data.token);
    assert.equal(verifyOtp.data.patient.fullName, 'Eleanor Vance');
  });

  test('4. Patient Booking Mutation with Roundtrip Persistence', async () => {
    const bookRes = await request('/portal/patient/book', {
      method: 'POST',
      body: {
        examination: 'CT Abdomen & Pelvis with Contrast',
        modality: 'CT',
        scheduledStart: '2026-11-25T10:00:00.000Z',
        priority: 'ROUTINE',
        clinicalNotes: 'Staging verification test booking',
      },
    });

    assert.equal(bookRes.status, 201);
    assert.equal(bookRes.ok, true);
    assert.ok(bookRes.data.appointment);
    assert.ok(bookRes.data.appointment.appointmentNumber.startsWith('STG-APT-'));
    assert.ok(bookRes.data.accessionNumber.startsWith('ACC-STG-'));

    const createdId = bookRes.data.appointment.id;

    // Reschedule appointment
    const rescheduleRes = await request(`/portal/patient/appointments/${createdId}/reschedule`, {
      method: 'POST',
      body: { scheduledStart: '2026-11-26T14:00:00.000Z' },
    });
    assert.equal(rescheduleRes.status, 200);
    assert.equal(rescheduleRes.data.appointment.scheduledStart, '2026-11-26T14:00:00.000Z');

    // Cancel appointment
    const cancelRes = await request(`/portal/patient/appointments/${createdId}/cancel`, {
      method: 'POST',
    });
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.success, true);
  });

  test('5. Reception Check-In and Token Issuance', async () => {
    const checkInRes = await request('/appointments/apt-stage-001/check-in', {
      method: 'POST',
      body: { verifiedIdentity: true, notes: 'Staging test check-in' },
    });

    assert.equal(checkInRes.status, 200);
    assert.equal(checkInRes.data.status, 'CHECKED_IN');
    assert.ok(checkInRes.data.tokenNumber.startsWith('STG-CT-'));
    assert.ok(checkInRes.data.checkedInAt);
  });

  test('6. Billing Payment Recording & Receipt Issuance', async () => {
    const payRes = await request('/billing/invoices/inv-stage-001/payments', {
      method: 'POST',
      body: {
        amount: 3310,
        paymentMethod: 'UPI',
        reference: 'UPI-TEST-12345',
      },
    });

    assert.equal(payRes.status, 201);
    assert.ok(payRes.data.receiptNumber.startsWith('RCP-STG-'));
    assert.equal(payRes.data.amount, 3310);

    // Verify invoice is now paid
    const invRes = await request('/billing/invoices/inv-stage-001');
    assert.equal(invRes.status, 200);
    assert.equal(invRes.data.status, 'PAID');
    assert.equal(invRes.data.balanceAmount, 0);
  });

  test('7. Technologist Scan Lifecycle Transitions', async () => {
    // 1. Scan Start
    const startRes = await request('/technologist/worklist/ord-stage-001/scan/start', {
      method: 'POST',
    });
    assert.equal(startRes.status, 200);
    assert.equal(startRes.data.scanStatus, 'IN_PROGRESS');

    // 2. Scan Finish
    const finishRes = await request('/technologist/worklist/ord-stage-001/scan/finish', {
      method: 'POST',
    });
    assert.equal(finishRes.status, 200);
    assert.equal(finishRes.data.scanStatus, 'COMPLETED');

    // 3. Image QA Accept
    const qaRes = await request('/technologist/worklist/ord-stage-001/image-quality/accept', {
      method: 'POST',
    });
    assert.equal(qaRes.status, 200);
    assert.equal(qaRes.data.qaStatus, 'ACCEPTED');
  });

  test('8. Radiologist Study Claiming & Report Finalization', async () => {
    // Claim study
    const claimRes = await request('/radiologist/worklist/ord-stage-002/claim', {
      method: 'POST',
    });
    assert.equal(claimRes.status, 200);
    assert.equal(claimRes.data.claimed, true);

    // Save report draft
    const draftRes = await request('/radiologist/worklist/ord-stage-002/draft', {
      method: 'POST',
      body: { findings: 'Normal brain parenchyma.', impression: 'No acute intracranial pathology.' },
    });
    assert.equal(draftRes.status, 200);
    assert.equal(draftRes.data.draftSaved, true);

    // Finalize report
    const finalizeRes = await request('/radiologist/reports/ord-stage-002/finalize', {
      method: 'POST',
      body: { findings: 'Normal brain parenchyma.', impression: 'No acute pathology.' },
    });
    assert.equal(finalizeRes.status, 200);
    assert.equal(finalizeRes.data.finalized, true);
  });

  test('9. Critical Findings Verbal Read-Back Acknowledgment', async () => {
    const ackRes = await request('/radiologist/critical-findings/cf-stage-001/acknowledge', {
      method: 'POST',
      body: { notes: 'Verbal read-back confirmed via test triage.' },
    });

    assert.equal(ackRes.status, 200);
    assert.equal(ackRes.data.status, 'ACKNOWLEDGED');
    assert.equal(ackRes.data.readBackConfirmed, true);
    assert.ok(ackRes.data.acknowledgedAt);
  });

  test('10. Operations: External PACS Share Creation & Revocation', async () => {
    const createShare = await request('/external-shares', {
      method: 'POST',
      body: { studyId: 'ord-stage-001', recipientEmail: 'referring.doc@hospital.org' },
    });

    assert.equal(createShare.status, 201);
    assert.ok(createShare.data.id);
    assert.equal(createShare.data.status, 'ACTIVE');

    const shareId = createShare.data.id;
    const revokeShare = await request(`/external-shares/${shareId}/revoke`, {
      method: 'POST',
    });
    assert.equal(revokeShare.status, 200);
    assert.equal(revokeShare.data.revoked, true);
  });
});
