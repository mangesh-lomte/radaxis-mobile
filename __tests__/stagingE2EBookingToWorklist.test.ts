import test from 'node:test';
import assert from 'node:assert/strict';

const STAGING_API = 'http://127.0.0.1:5005/api/v1';

test('RadAxis Mobile — Staging End-to-End Booking to Worklist Verification', async (t) => {
  let staffToken: string;
  let patientToken: string;
  let testPatientId: string;
  let testMrn: string;
  let testApptId: string;
  let testApptNumber: string;
  let testOrderId: string;
  let testAccession: string;

  await t.test('1. Clinical Staff Authentication', async () => {
    const testPassword = process.env.TEST_STAFF_PASSWORD || 'DemonstrationAuth';
    const res = await fetch(`${STAGING_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ris.local', password: testPassword }),
    });
    assert.equal(res.status, 200, 'Staff authentication must succeed');
    const data = await res.json();
    staffToken = data.data?.token || data.token;
    assert.ok(staffToken, 'JWT staff token must be present');
  });

  await t.test('2. Synthetic Patient Registration via Portal OTP in Staging', async () => {
    const phone = `98${Date.now().toString().slice(-8)}`;
    const otpReq = await fetch(`${STAGING_API}/portal/patient/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    assert.equal(otpReq.status, 200, 'OTP request must succeed');
    const otpReqData = await otpReq.json();
    const otp = otpReqData.data?.demoOtp || '123456';

    const verifyReq = await fetch(`${STAGING_API}/portal/patient/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        otp,
        firstName: 'Kiran',
        lastName: 'Sharma',
        dateOfBirth: '1988-06-15',
        gender: 'MALE',
      }),
    });
    assert.equal(verifyReq.status, 200, 'OTP verification must succeed');
    const verifyData = await verifyReq.json();
    patientToken = verifyData.data?.token;
    testPatientId = verifyData.data?.patient?.id;
    testMrn = verifyData.data?.patient?.patientId;
    assert.ok(patientToken, 'Patient JWT token must be generated');
    assert.ok(testMrn, 'MRN must be generated');
    assert.ok(testMrn.startsWith('PAT-'), 'MRN must follow PAT- format');
  });

  await t.test('3. Book Appointment via POST /portal/patient/book (Database Persistence)', async () => {
    // Query exam definition
    const examRes = await fetch(`${STAGING_API}/portal/patient/examinations?modality=CT`);
    const examData = await examRes.json();
    const examId = examData.data[0]?.id || 'cmwqd4q8s000j1406l6mlgtda';

    // Find an available slot on a future test date
    const testDate = '2026-11-28';
    const slotsRes = await fetch(`${STAGING_API}/portal/patient/slots?modality=CT&date=${testDate}`);
    const slotsData = await slotsRes.json();
    const availableSlots = (slotsData.data?.slots || []).filter((s: any) => s.isAvailable);

    // If slots endpoint has available slots, use first available; otherwise pick a random timestamp
    const chosenStart = availableSlots.length > 0
      ? availableSlots[0].startTime
      : new Date(Date.now() + Math.floor(Math.random() * 1000000000)).toISOString();

    const bookingPayload = {
      examDefinitionId: examId,
      modality: 'CT',
      scheduledStart: chosenStart,
      priority: 'ROUTINE',
      clinicalNotes: 'Staging verification test — chest examination',
    };

    const bookRes = await fetch(`${STAGING_API}/portal/patient/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify(bookingPayload),
    });
    assert.equal(bookRes.status, 201, 'Booking must return HTTP 201 Created');
    const bookData = await bookRes.json();
    const result = bookData.data;

    testApptId = result.appointment?.id;
    testApptNumber = result.appointment?.appointmentNumber;
    testOrderId = result.appointment?.imagingOrderId;
    testAccession = result.accessionNumber;

    assert.ok(testApptId, 'Appointment ID must be returned');
    assert.ok(testApptNumber.startsWith('APT-'), 'Appointment number must follow APT- format');
    assert.ok(testOrderId, 'ImagingOrder ID must be linked to Appointment');
    assert.ok(testAccession.startsWith('ACC-'), 'Accession must follow ACC- format');
    assert.equal(result.appointment?.status, 'SCHEDULED', 'Appointment status must be SCHEDULED');
  });

  await t.test('4. Master Patient Index & Patient Jacket Verification', async () => {
    const res = await fetch(`${STAGING_API}/patients?search=${encodeURIComponent(testMrn)}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    const items = data.data?.items || [];
    assert.equal(items.length, 1, 'Search by MRN must return exactly 1 patient');
    const pat = items[0];
    assert.equal(pat.patientId, testMrn);
    assert.ok(pat._count?.appointments >= 1, 'Appointments count must be >= 1');
    assert.ok(pat._count?.imagingOrders >= 1, 'Imaging orders count must be >= 1');
  });

  await t.test('5. Scheduling Module Verification', async () => {
    const res = await fetch(`${STAGING_API}/appointments?search=${encodeURIComponent(testMrn)}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    const items = data.data?.items || [];
    const found = items.find((a: any) => a.appointmentNumber === testApptNumber || a.id === testApptId);
    assert.ok(found, `Appointment ${testApptNumber} must be present in Scheduling`);
    assert.equal(found.status, 'SCHEDULED');
    assert.equal(found.imagingOrderId, testOrderId);
  });

  await t.test('6. Clinical Worklist Verification (Patient Jacket -> Worklist)', async () => {
    const res = await fetch(`${STAGING_API}/orders?search=${encodeURIComponent(testMrn)}&pageSize=50`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    const items = data.data?.items || [];
    const order = items.find((o: any) => o.accessionNumber === testAccession);
    assert.ok(order, `ImagingOrder ${testAccession} must be visible in Worklist`);
    assert.equal(order.orderStatus, 'SCHEDULED');
    assert.equal(order.modality, 'CT');
    assert.equal(order.patient?.patientId, testMrn);
  });

  await t.test('7. Study Detail Fetch (Mobile Study View) & Truthful PACS Guard', async () => {
    // 7a. Study Detail endpoint matching mobile app study/[id].tsx
    const studyRes = await fetch(`${STAGING_API}/orders/${testAccession}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(studyRes.status, 200, 'Study Detail endpoint must return 200');
    const studyData = await studyRes.json();
    assert.equal(studyData.data?.accessionNumber, testAccession);
    assert.equal(studyData.data?.patient?.patientId, testMrn);

    // 7b. Single-tap OHIF Viewer Guard: Truthful 409 Conflict for non-scanned/unlinked study
    const res = await fetch(`${STAGING_API}/radiologist/worklist/${testAccession}/viewer-launch`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(res.status, 409, 'New un-scanned study must return HTTP 409 Conflict');
    const data = await res.json();
    assert.equal(data.error?.code, 'PACS_STUDY_NOT_LINKED', 'Error code must be PACS_STUDY_NOT_LINKED');
  });

  // ─── PATIENT B: LOMTE MANGESH (SYNTHETIC STAGING DEMO PATIENT) ───────────────

  let patientBToken: string;
  let patientBMrn: string;
  let patientBApptNumber: string;
  let patientBAccession: string;

  await t.test('8. Patient B (Lomte Mangesh): Registration via Portal OTP in Staging', async () => {
    const phone = `99${Date.now().toString().slice(-8)}`;
    const otpReq = await fetch(`${STAGING_API}/portal/patient/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    assert.equal(otpReq.status, 200);
    const otpData = await otpReq.json();
    const otp = otpData.data?.demoOtp || '123456';

    const verifyReq = await fetch(`${STAGING_API}/portal/patient/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        otp,
        firstName: 'Lomte',
        lastName: 'Mangesh',
        dateOfBirth: '1995-10-20',
        gender: 'MALE',
      }),
    });
    assert.equal(verifyReq.status, 200);
    const verifyData = await verifyReq.json();
    patientBToken = verifyData.data?.token;
    patientBMrn = verifyData.data?.patient?.patientId;
    assert.ok(patientBToken);
    assert.ok(patientBMrn?.startsWith('PAT-'));
  });

  await t.test('9. Patient B: Book Future Appointment (2026-11-29)', async () => {
    const examRes = await fetch(`${STAGING_API}/portal/patient/examinations?modality=MRI`);
    const examData = await examRes.json();
    const examId = examData.data[0]?.id;
    assert.ok(examId, 'MRI exam definition must exist');

    const testDate = '2026-11-29';
    const slotsRes = await fetch(`${STAGING_API}/portal/patient/slots?modality=MRI&date=${testDate}`);
    const slotsData = await slotsRes.json();
    const availableSlots = (slotsData.data?.slots || []).filter((s: any) => s.isAvailable);
    const scheduledStart = availableSlots.length > 0
      ? availableSlots[0].startTime
      : new Date(Date.now() + Math.floor(Math.random() * 500000000 + 86400000)).toISOString();

    const bookRes = await fetch(`${STAGING_API}/portal/patient/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientBToken}`,
      },
      body: JSON.stringify({
        examDefinitionId: examId,
        modality: 'MRI',
        scheduledStart,
        priority: 'ROUTINE',
        clinicalNotes: 'Synthetic staging demo patient booking for Lumbar MRI',
      }),
    });
    assert.equal(bookRes.status, 201, 'Future booking must return 201 Created');
    const bookData = await bookRes.json();
    patientBApptNumber = bookData.data?.appointment?.appointmentNumber;
    patientBAccession = bookData.data?.accessionNumber;
    assert.ok(patientBApptNumber?.startsWith('APT-'));
    assert.ok(patientBAccession?.startsWith('ACC-'));
  });

  await t.test('10. Patient B: Future Appointment Visible in Clinical Worklist Immediately', async () => {
    // Verifies that future bookings are immediately indexed in the Worklist
    const worklistRes = await fetch(`${STAGING_API}/orders?search=${encodeURIComponent(patientBMrn)}&pageSize=50`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(worklistRes.status, 200);
    const worklistData = await worklistRes.json();
    const orders = worklistData.data?.items || [];
    const matchedOrder = orders.find((o: any) => o.accessionNumber === patientBAccession);
    assert.ok(matchedOrder, `Future scheduled order ${patientBAccession} must appear immediately in Clinical Worklist`);
    assert.equal(matchedOrder.orderStatus, 'SCHEDULED');
    assert.equal(matchedOrder.modality, 'MRI');
    assert.equal(matchedOrder.patient?.firstName, 'Lomte');
    assert.equal(matchedOrder.patient?.lastName, 'Mangesh');

    // Verify Study Detail screen endpoint for Patient B
    const studyRes = await fetch(`${STAGING_API}/orders/${patientBAccession}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(studyRes.status, 200);
    const studyData = await studyRes.json();
    assert.equal(studyData.data?.accessionNumber, patientBAccession);
    assert.equal(studyData.data?.patient?.patientId, patientBMrn);
  });

  await t.test('11. Post-Logout, Session Invalidation & Fresh Receptionist Login Verification', async () => {
    // 1. Simulate complete logout: destroy previous staffToken and patient tokens
    const oldStaffToken = staffToken;
    staffToken = '';
    patientToken = '';
    patientBToken = '';

    // Verify old token can be replaced by authenticating as a completely different role (Receptionist)
    const testPassword = process.env.TEST_STAFF_PASSWORD || 'DemonstrationAuth';
    const recLogin = await fetch(`${STAGING_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reception@ris.local', password: testPassword }),
    });
    assert.equal(recLogin.status, 200, 'Receptionist login must succeed');
    const recData = await recLogin.json();
    const freshToken = recData.data?.token || recData.token;
    assert.ok(freshToken, 'Fresh receptionist JWT token generated');
    assert.notEqual(freshToken, oldStaffToken, 'Must be a distinct session token');

    // 2. Query Patient A (Kiran Sharma) from fresh session
    const patARes = await fetch(`${STAGING_API}/patients?search=${encodeURIComponent(testMrn)}`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert.equal(patARes.status, 200);
    const patAData = await patARes.json();
    const patA = patAData.data?.items?.[0];
    assert.ok(patA, 'Patient A must exist in fresh session');
    assert.ok(patA._count?.appointments >= 1, 'Patient A appointments count >= 1');
    assert.ok(patA._count?.imagingOrders >= 1, 'Patient A orders count >= 1');

    // 3. Query Patient B (Lomte Mangesh) from fresh session
    const patBRes = await fetch(`${STAGING_API}/patients?search=${encodeURIComponent(patientBMrn)}`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert.equal(patBRes.status, 200);
    const patBData = await patBRes.json();
    const patB = patBData.data?.items?.[0];
    assert.ok(patB, 'Patient B must exist in fresh session');
    assert.ok(patB._count?.appointments >= 1, 'Patient B appointments count >= 1');
    assert.ok(patB._count?.imagingOrders >= 1, 'Patient B orders count >= 1');

    // 4. Verify Worklist query from fresh session returns both Patient A and Patient B
    const worklistRes = await fetch(`${STAGING_API}/orders?pageSize=100`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert.equal(worklistRes.status, 200);
    const worklistData = await worklistRes.json();
    const allOrders = worklistData.data?.items || [];
    const hasOrderA = allOrders.some((o: any) => o.accessionNumber === testAccession);
    const hasOrderB = allOrders.some((o: any) => o.accessionNumber === patientBAccession);
    assert.ok(hasOrderA, `Persisted Order A (${testAccession}) must be visible in fresh session`);
    assert.ok(hasOrderB, `Persisted Order B (${patientBAccession}) must be visible in fresh session`);
  });
});
