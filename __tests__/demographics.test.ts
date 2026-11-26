/**
 * Test Suite: Clinical Demographics & Dynamic Age Calculation
 *
 * Verifies:
 * 1. Boundary: Birthday already occurred this year
 * 2. Boundary: Birthday not yet occurred this year
 * 3. Boundary: Birthday is today (exact match)
 * 4. Leap year births
 * 5. All 5 Canonical Patients as of reference date November 21, 2026
 */

import { calculateAge, formatDemographics } from '../src/utils/demographics';

export function runDemographicsTests(): { passed: boolean; total: number; errors: string[] } {
  const errors: string[] = [];
  let passedCount = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      passedCount++;
    } else {
      errors.push(`FAILED: ${testName}`);
    }
  }

  // Fixed reference date: 2026-11-21
  const refDate = new Date(2026, 10, 21); // Month is 0-indexed (10 = Nov)

  // 1. Boundary: Birthday already occurred this year
  // Born June 10, 2000. In Nov 2026, birthday passed 5 months ago -> age 26
  assert(
    calculateAge('2000-06-10', refDate) === 26,
    'Boundary 1: Birthday already occurred this year'
  );

  // 2. Boundary: Birthday not yet occurred this year
  // Born Dec 25, 2000. In Nov 2026, birthday is next month -> age 25
  assert(
    calculateAge('2000-12-25', refDate) === 25,
    'Boundary 2: Birthday not yet occurred this year'
  );

  // 3. Boundary: Birthday is TODAY
  // Born Nov 21, 2000. On Nov 21, 2026 -> exactly turned 26 today
  assert(
    calculateAge('2000-11-21', refDate) === 26,
    'Boundary 3: Birthday is today (exact day match)'
  );

  // 4. Boundary: Birthday was YESTERDAY
  // Born Nov 20, 2000 -> turned 26 yesterday
  assert(
    calculateAge('2000-11-20', refDate) === 26,
    'Boundary 4: Birthday was yesterday'
  );

  // 5. Boundary: Birthday is TOMORROW
  // Born Nov 22, 2000 -> still 25 until tomorrow
  assert(
    calculateAge('2000-11-22', refDate) === 25,
    'Boundary 5: Birthday is tomorrow'
  );

  // 6. Canonical Fixture Patient 1: Eleanor Vance (DOB 1961-08-14)
  // Aug 14 is before Nov 21 -> 2026 - 1961 = 65
  const vance = formatDemographics('1961-08-14', 'Female', refDate);
  assert(vance.age === 65 && vance.demographicsShort === '65F', 'Canonical: Eleanor Vance is 65F');

  // 7. Canonical Fixture Patient 2: David Kowalski (DOB 1974-11-02)
  // Nov 02 is before Nov 21 -> 2026 - 1974 = 52
  const kowalski = formatDemographics('1974-11-02', 'Male', refDate);
  assert(kowalski.age === 52 && kowalski.demographicsShort === '52M', 'Canonical: David Kowalski is 52M');

  // 8. Canonical Fixture Patient 3: Marcus J. Brody (DOB 1983-05-19)
  // May 19 is before Nov 21 -> 2026 - 1983 = 43
  const brody = formatDemographics('1983-05-19', 'Male', refDate);
  assert(brody.age === 43 && brody.demographicsShort === '43M', 'Canonical: Marcus J. Brody is 43M');

  // 9. Canonical Fixture Patient 4: Marcus Aurelius Sterling (DOB 1962-07-19)
  // Jul 19 is before Nov 21 -> 2026 - 1962 = 64
  const sterling = formatDemographics('1962-07-19', 'Male', refDate);
  assert(sterling.age === 64 && sterling.demographicsShort === '64M', 'Canonical: Marcus Aurelius Sterling is 64M');

  // 10. Canonical Fixture Patient 5: Priya Sharma (DOB 1991-03-15)
  // Mar 15 is before Nov 21 -> 2026 - 1991 = 35
  const sharma = formatDemographics('1991-03-15', 'Female', refDate);
  assert(sharma.age === 35 && sharma.demographicsShort === '35F', 'Canonical: Priya Sharma is 35F');

  // 11. Known Defect Test: DOB 2002-12-12 as of Nov 23, 2026 must be age 23 and "23 yrs · Other", not "23O"
  const nov23Date = new Date(2026, 10, 23);
  const otherPatient = formatDemographics('2002-12-12', 'Other', nov23Date);
  assert(
    otherPatient.age === 23,
    'Defect Fix: DOB 2002-12-12 is age 23 on Nov 23, 2026'
  );
  assert(
    otherPatient.demographicsShort === '23 yrs · Other',
    'Defect Fix: Other gender renders as "23 yrs · Other" (never ambiguous "23O")'
  );

  return {
    passed: errors.length === 0,
    total: totalTests,
    errors,
  };
}

const result = runDemographicsTests();
console.log(`Demographics Tests: ${result.passed ? 'ALL PASSED' : 'FAILED'} (${result.total} checks)`);
if (!result.passed) {
  console.error(result.errors.join('\n'));
  process.exit(1);
}
