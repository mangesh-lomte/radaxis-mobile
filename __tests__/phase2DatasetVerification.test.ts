import test from 'node:test';
import assert from 'node:assert/strict';

const STAGING_API = 'http://127.0.0.1:5005/api/v1';

async function apiFetch(endpoint: string, options: { method?: string; body?: any; token?: string } = {}) {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${STAGING_API}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json.data, body: json };
}

test('RadAxis Mobile — Phase 2 Demonstration Dataset & 14-Module Verification', async (t) => {
  let adminToken: string;

  await t.test('0. Staff Authentication', async () => {
    const testPassword = process.env.TEST_STAFF_PASSWORD || 'DemonstrationAuth';
    const login = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email: 'admin@ris.local', password: testPassword },
    });
    assert.equal(login.status, 200, 'Admin login must succeed');
    adminToken = login.data.token;
    assert.ok(adminToken, 'Admin token present');
  });

  await t.test('1. Patient 1 (Jonathan Miller): Protected Reference Study Intact', async () => {
    const orderRes = await apiFetch('/orders/ACC-20261105-CT01', { token: adminToken });
    assert.equal(orderRes.status, 200);
    assert.equal(orderRes.data.patient.patientId, 'PAT-2026-10001');
    assert.equal(orderRes.data.patient.firstName, 'Jonathan');
    assert.equal(orderRes.data.patient.lastName, 'Miller');
    assert.equal(orderRes.data.modality, 'CT');
    assert.equal(orderRes.data.orderStatus, 'SAFETY_CLEARED');
  });

  await t.test('2. Patient 2 (Margaret Chen): Reception Queue & Partial Billing', async () => {
    // Reception Queue
    const qRes = await apiFetch('/reception/queue?date=2026-11-23', { token: adminToken });
    assert.equal(qRes.status, 200);
    const queueItems = qRes.data?.items || qRes.data || [];
    const margaretQ = queueItems.find((q: any) => q.tokenNumber === 'T-01' || q.patient?.patientId === 'PAT-2026-10002');
    assert.ok(margaretQ, 'Margaret Chen must be in Reception Queue today with token T-01');

    // Billing Invoices & Partial Payment
    const invRes = await apiFetch('/billing/invoices?patientId=PAT-2026-10002', { token: adminToken });
    assert.equal(invRes.status, 200);
    const invItems = invRes.data || [];
    assert.ok(invItems.length > 0, 'Must have invoice for Margaret Chen');
    const inv = invItems.find((i: any) => i.invoiceNumber === 'INV-2026-1123-02' || i.patientId === 'PAT-2026-10002');
    assert.ok(inv, 'Invoice INV-2026-1123-02 found');
    assert.equal(inv.total, 700);
    assert.equal(inv.paidAmount, 350);
    assert.equal(inv.balance, 350);
    assert.equal(inv.status, 'PARTIALLY_PAID');
  });

  await t.test('3. Patient 3 (David Kim): Completed Scan & Radiologist Worklist', async () => {
    const radRes = await apiFetch('/radiologist/worklist', { token: adminToken });
    assert.equal(radRes.status, 200);
    const radItems = radRes.data?.items || radRes.data || [];
    const davidStudy = radItems.find((s: any) => s.accessionNumber === 'ACC-20261123-XR03' || s.patient?.patientId === 'PAT-2026-10020');
    assert.ok(davidStudy, 'David Kim (ACC-20261123-XR03) must appear in Radiologist Worklist');
    assert.equal(davidStudy.orderStatus, 'PACS_HANDOFF_COMPLETE');
  });

  await t.test('4. Patient 4 (Priya Desai): Scheduling Calendar Slot', async () => {
    const apptRes = await apiFetch('/appointments?search=PAT-2026-10021', { token: adminToken });
    assert.equal(apptRes.status, 200);
    const appts = apptRes.data?.items || [];
    const priyaAppt = appts.find(
      (a: any) => a.imagingOrder?.accessionNumber === 'ACC-20261123-US04' || a.patient?.patientId === 'PAT-2026-10021'
    );
    assert.ok(priyaAppt, 'Priya Desai must appear in Scheduling appointments');
    assert.equal(priyaAppt.status, 'SCHEDULED');
  });

  await t.test('5. Patient 5 (Marcus Johnson): Technologist Worklist Today', async () => {
    const techRes = await apiFetch('/technologist/worklist?date=2026-11-23', { token: adminToken });
    assert.equal(techRes.status, 200);
    const techItems = techRes.data?.items || [];
    const marcusTech = techItems.find((item: any) => item.order?.accessionNumber === 'ACC-20261123-MR08' || item.patientId === 'PAT-2026-10008');
    assert.ok(marcusTech, 'Marcus Johnson (ACC-20261123-MR08) must appear in Technologist Worklist today');
    assert.equal(marcusTech.order?.orderStatus, 'READY_FOR_TECH');
    assert.equal(marcusTech.appointment?.tokenNumber, 'T-03');
  });

  await t.test('6. Patient 6 (Kiran Sharma): Future Appointment in Clinical Worklist', async () => {
    const ordersRes = await apiFetch('/orders?search=PAT-2026-66625', { token: adminToken });
    assert.equal(ordersRes.status, 200);
    const orders = ordersRes.data?.items || [];
    const kiranOrder = orders.find((o: any) => o.accessionNumber === 'ACC-20261125-CT-KS01');
    assert.ok(kiranOrder, 'Future appointment ACC-20261125-CT-KS01 must appear in Clinical Worklist');
    assert.equal(kiranOrder.orderStatus, 'SCHEDULED');
  });

  await t.test('7. Patient 7 (Arthur Blackwood): Critical Alert PENDING Read-back', async () => {
    const alertsRes = await apiFetch('/radiologist/critical-findings?status=PENDING', { token: adminToken });
    assert.equal(alertsRes.status, 200);
    const alerts = alertsRes.data?.items || [];
    const pendingAlert = alerts.find((a: any) => a.order?.accessionNumber === 'ACC-20261123-CT10' || a.order?.patientId === 'PAT-2026-10010');
    assert.ok(pendingAlert, 'Arthur Blackwood must have a PENDING critical alert');
    assert.equal(pendingAlert.severity, 'CRITICAL');
    assert.equal(pendingAlert.status, 'PENDING');
    assert.ok(pendingAlert.findingText?.includes('[DEMO TRAINING ARTIFACT'), 'Finding must include synthetic training disclaimer');
  });

  await t.test('8. Patient 8 (Carlos Rodriguez): Radiologist Draft in Progress', async () => {
    const orderRes = await apiFetch('/orders/ACC-20261123-CT06', { token: adminToken });
    assert.equal(orderRes.status, 200);
    assert.equal(orderRes.data.patient.patientId, 'PAT-2026-10006');
    assert.equal(orderRes.data.orderStatus, 'IN_PROGRESS');
  });

  await t.test('9. Patient 9 (Emily Watson): Finalized Signed Report & Paid Invoice', async () => {
    const reportRes = await apiFetch('/reports', { token: adminToken });
    assert.equal(reportRes.status, 200);
    const reports = reportRes.data || [];
    const emilyReport = reports.find((r: any) => r.order?.accessionNumber === 'ACC-20261123-MR05' || r.order?.patient?.patientId === 'PAT-2026-10005');
    assert.ok(emilyReport, 'Emily Watson must have a finalized report');
    assert.equal(emilyReport.status, 'FINAL');
    assert.equal(emilyReport.isSigned, true);
    assert.equal(emilyReport.isReadyForReception, true);
    assert.ok(emilyReport.findings?.includes('[DEMO TRAINING REPORT'), 'Findings must include synthetic training disclaimer');
    assert.ok(emilyReport.digitalSignature?.includes('DEMO-SHA256-SYNTHETIC-SIGNATURE'), 'Signature must be explicitly marked synthetic');

    // Fully paid invoice
    const invRes = await apiFetch('/billing/invoices?patientId=PAT-2026-10005', { token: adminToken });
    assert.equal(invRes.status, 200);
    const invItems = invRes.data || [];
    const inv = invItems.find((i: any) => i.invoiceNumber === 'INV-2026-1123-05');
    assert.ok(inv, 'Emily Watson invoice INV-2026-1123-05 found');
    assert.equal(inv.total, 650);
    assert.equal(inv.paidAmount, 650);
    assert.equal(inv.balance, 0);
    assert.equal(inv.status, 'PAID');
  });

  await t.test('10. Patient 10 (Aarav Shah): Acknowledged Critical Alert with Read-back', async () => {
    const alertsRes = await apiFetch('/radiologist/critical-findings?status=ACKNOWLEDGED', { token: adminToken });
    assert.equal(alertsRes.status, 200);
    const alerts = alertsRes.data?.items || [];
    const ackAlert = alerts.find((a: any) => a.order?.accessionNumber === 'ACC-20261123-XR04' || a.order?.patientId === 'PAT-2026-10004');
    assert.ok(ackAlert, 'Aarav Shah must have an ACKNOWLEDGED critical alert');
    assert.equal(ackAlert.status, 'ACKNOWLEDGED');
    assert.ok(ackAlert.findingText?.includes('[DEMO TRAINING ARTIFACT'), 'Alert text must be marked synthetic training artifact');
    assert.ok(ackAlert.acknowledgmentNotes?.includes('[DEMO RECORD]'), 'Verbal read-back note must be marked demo record');
    assert.ok(ackAlert.acknowledgmentNotes?.includes('Training simulation only'), 'Must state training simulation only');
  });
});
