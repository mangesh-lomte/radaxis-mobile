/**
 * RadAxis RIS Mobile — Clinical Demographics & Age Utility
 *
 * Dynamically calculates exact chronological age from ISO date of birth (YYYY-MM-DD or ISO 8601 string).
 * Guarantees displayed age and demographic labels cannot drift from date of birth.
 */

export function calculateAge(dateOfBirth?: string | null, referenceDate: Date = new Date()): number {
  if (!dateOfBirth) return 0;
  const cleanDob = dateOfBirth.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDob)) {
    return 0;
  }

  const [yearStr, monthStr, dayStr] = cleanDob.split('-');
  const birthYear = parseInt(yearStr, 10);
  const birthMonth = parseInt(monthStr, 10) - 1; // 0-indexed in JS Date
  const birthDay = parseInt(dayStr, 10);

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  let age = refYear - birthYear;

  // Check if birthday has already occurred in the reference year
  const hasBirthdayOccurred =
    refMonth > birthMonth || (refMonth === birthMonth && refDay >= birthDay);

  if (!hasBirthdayOccurred) {
    age--;
  }

  return Math.max(0, age);
}

export function formatDemographics(
  dateOfBirth?: string | null,
  gender?: string | null,
  referenceDate?: Date
): { age: number; demographicsShort: string } {
  if (!dateOfBirth) {
    const g = (gender || '').toUpperCase();
    const label = g.startsWith('F') ? 'Female' : g.startsWith('M') ? 'Male' : gender ? 'Other' : '';
    return { age: 0, demographicsShort: label };
  }
  const age = calculateAge(dateOfBirth, referenceDate);
  const g = (gender || '').toUpperCase();
  let sexCode = '';
  if (g.startsWith('F')) {
    sexCode = 'F';
  } else if (g.startsWith('M')) {
    sexCode = 'M';
  } else if (g) {
    sexCode = ' yrs · Other';
  }
  return {
    age,
    demographicsShort: `${age}${sexCode}`,
  };
}
