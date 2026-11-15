import {
  LEAD_SCORE_CATEGORIES,
  LeadScoreCategory,
} from '../constants/index.js';
import {
  LeadScoreBreakdown,
  LeadScoreFactor,
  AttendanceCalculationResult,
} from '../types/index.js';

/**
 * Normalizes email by trimming and converting to lowercase.
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Normalizes phone number into E.164 standard format.
 * Strips whitespace, dashes, parens. Defaults to +91 if 10-digit Indian number without country code.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // If 10 digits without leading +, default to Indian code +91
  if (/^\d{10}$/.test(cleaned)) {
    cleaned = '+91' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.length > 10) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Validates E.164 phone format
 */
export function isValidE164Phone(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/**
 * Fixed Formula: Attendance % = (present + excused) / (held classes - excused) * 100
 *
 * If (held - excused) <= 0, returns 100% (no non-excused classes held yet).
 */
export function calculateAttendancePercentage(
  present: number,
  excused: number,
  held: number
): number {
  const effectiveDenominator = held - excused;
  if (effectiveDenominator <= 0) {
    return 100;
  }
  const rawPercentage = ((present + excused) / effectiveDenominator) * 100;
  // Bound to 0 - 100, round to 1 decimal place
  return Math.round(Math.min(100, Math.max(0, rawPercentage)) * 10) / 10;
}

export interface AttendanceRecordLike {
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
  date: string | Date;
}

/**
 * Computes attendance summary metrics over a collection of records.
 */
export function computeAttendanceMetrics(
  studentId: string,
  records: AttendanceRecordLike[],
  periodDays = 30
): AttendanceCalculationResult {
  const sorted = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let present = 0;
  let excused = 0;
  let absent = 0;
  let late = 0;

  for (const r of sorted) {
    switch (r.status) {
      case 'PRESENT':
        present++;
        break;
      case 'EXCUSED':
        excused++;
        break;
      case 'ABSENT':
        absent++;
        break;
      case 'LATE':
        // LATE counts as present for attendance tracking
        late++;
        present++;
        break;
    }
  }

  const held = sorted.length;
  const attendancePercentage = calculateAttendancePercentage(present, excused, held);

  // Consecutive absences calculation (looking backwards from latest record)
  let consecutiveAbsences = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const status = sorted[i].status;
    if (status === 'ABSENT') {
      consecutiveAbsences++;
    } else if (status === 'EXCUSED') {
      // Excused absences do not break or increment consecutive unexcused absence counter
      continue;
    } else {
      break;
    }
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  return {
    studentId,
    periodDays,
    classesHeld: held,
    classesPresent: present,
    classesExcused: excused,
    classesAbsent: absent,
    classesLate: late,
    attendancePercentage,
    consecutiveAbsences,
    windowStartDate: windowStart.toISOString().split('T')[0],
    windowEndDate: now.toISOString().split('T')[0],
  };
}

/**
 * Lead Scoring Engine
 * Deterministic weighted 0-100 score based on:
 * - course-interest completeness (25 pts)
 * - start-date proximity (25 pts)
 * - response status / consent (20 pts)
 * - counselling availability specified (15 pts)
 * - follow-up status (15 pts)
 * Total: 100 pts.
 * Thresholds: Hot >= 70, Warm 40-69, Cold < 40.
 */
export function calculateLeadScore(params: {
  courseInterest?: string | null;
  preferredStartDate?: string | Date | null;
  hasCommunicationConsent: boolean;
  preferredCounsellingTime?: string | null;
  stage: string;
  hasFollowUpNotes?: boolean;
}): LeadScoreBreakdown {
  const factors: LeadScoreFactor[] = [];
  const reasons: string[] = [];

  // Factor 1: Course Interest Completeness (Max 25)
  let courseScore = 0;
  if (params.courseInterest && params.courseInterest.trim().length > 0) {
    courseScore = 25;
    reasons.push('Specific course interest selected (+25 pts)');
  } else {
    reasons.push('Course interest missing (0/25 pts)');
  }
  factors.push({
    factor: 'Course Interest Completeness',
    weight: 0.25,
    score: courseScore,
    maxScore: 25,
    reason: courseScore === 25 ? 'High intent course indicated' : 'Unspecified target course',
  });

  // Factor 2: Start Date Proximity (Max 25)
  let startDateScore = 0;
  if (params.preferredStartDate) {
    const targetDate = new Date(params.preferredStartDate);
    const now = new Date();
    const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 14) {
      startDateScore = 25;
      reasons.push('Immediate joining intent within 14 days (+25 pts)');
    } else if (diffDays > 14 && diffDays <= 45) {
      startDateScore = 18;
      reasons.push('Near-term start date within 45 days (+18 pts)');
    } else if (diffDays > 45) {
      startDateScore = 10;
      reasons.push('Future batch start date beyond 45 days (+10 pts)');
    } else {
      startDateScore = 5;
      reasons.push('Past preferred start date (+5 pts)');
    }
  } else {
    reasons.push('No preferred start date provided (0/25 pts)');
  }
  factors.push({
    factor: 'Start Date Proximity',
    weight: 0.25,
    score: startDateScore,
    maxScore: 25,
    reason: `Target start date evaluation (${startDateScore}/25 pts)`,
  });

  // Factor 3: Communication Consent & Responsiveness (Max 20)
  let consentScore = 0;
  if (params.hasCommunicationConsent) {
    consentScore = 20;
    reasons.push('Explicit communication consent granted (+20 pts)');
  } else {
    reasons.push('No communication consent provided (0/20 pts)');
  }
  factors.push({
    factor: 'Communication Consent & Response Readiness',
    weight: 0.2,
    score: consentScore,
    maxScore: 20,
    reason: params.hasCommunicationConsent ? 'Full communication opt-in' : 'Missing consent',
  });

  // Factor 4: Counselling Availability Specified (Max 15)
  let counsellingSlotScore = 0;
  if (params.preferredCounsellingTime && params.preferredCounsellingTime.trim().length > 0) {
    counsellingSlotScore = 15;
    reasons.push('Preferred counselling slot indicated (+15 pts)');
  } else {
    reasons.push('No counselling slot selected (0/15 pts)');
  }
  factors.push({
    factor: 'Counselling Availability',
    weight: 0.15,
    score: counsellingSlotScore,
    maxScore: 15,
    reason: counsellingSlotScore === 15 ? 'Time preference stated' : 'Unscheduled slot',
  });

  // Factor 5: Follow-up & Stage Progression (Max 15)
  let stageScore = 5;
  if (['Counselling Booked', 'Attended', 'Application Started'].includes(params.stage)) {
    stageScore = 15;
    reasons.push(`Advanced pipeline stage '${params.stage}' (+15 pts)`);
  } else if (params.stage === 'Contacted') {
    stageScore = 10;
    reasons.push('Initial contact completed (+10 pts)');
  } else if (params.stage === 'Enrolled') {
    stageScore = 15;
    reasons.push('Enrolled candidate (+15 pts)');
  } else if (['Lost', 'Nurture'].includes(params.stage)) {
    stageScore = 2;
    reasons.push(`Low-engagement stage '${params.stage}' (+2 pts)`);
  } else {
    stageScore = 5;
    reasons.push('Newly ingested lead (+5 pts)');
  }
  factors.push({
    factor: 'Pipeline Stage Status',
    weight: 0.15,
    score: stageScore,
    maxScore: 15,
    reason: `Stage: ${params.stage}`,
  });

  const total = courseScore + startDateScore + consentScore + counsellingSlotScore + stageScore;

  let category: LeadScoreCategory = LEAD_SCORE_CATEGORIES.COLD;
  if (total >= 70) {
    category = LEAD_SCORE_CATEGORIES.HOT;
  } else if (total >= 40) {
    category = LEAD_SCORE_CATEGORIES.WARM;
  }

  return {
    total,
    category,
    factors,
    reasons,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Checks if a given time is within quiet hours (e.g. 21:00 to 08:00).
 */
export function isInQuietHours(
  date: Date = new Date(),
  timezone = 'Asia/Kolkata',
  quietStart = '21:00',
  quietEnd = '08:00'
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const currentMinutes = hour * 60 + minute;

    const [startH, startM] = quietStart.split(':').map((v) => parseInt(v, 10));
    const [endH, endM] = quietEnd.split(':').map((v) => parseInt(v, 10));

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // e.g. 21:00 (1260 min) to 08:00 (480 min) spans overnight
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return false;
  }
}

/**
 * Generates ISO week string: YYYY-Www (e.g. 2026-W44)
 */
export function getISOWeekString(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
