import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  normalizePhone,
  calculateAttendancePercentage,
  computeAttendanceMetrics,
  calculateLeadScore,
  isInQuietHours,
  getISOWeekString,
} from './index.js';

describe('Shared Utilities', () => {
  describe('Email & Phone Normalization', () => {
    it('normalizes emails to lowercase and trimmed', () => {
      expect(normalizeEmail('  Student.One@Example.COM ')).toBe('student.one@example.com');
    });

    it('normalizes 10-digit Indian phone numbers to E.164 with +91', () => {
      expect(normalizePhone('9876543210')).toBe('+919876543210');
      expect(normalizePhone('+91 98765-43210')).toBe('+919876543210');
    });
  });

  describe('Attendance Formula', () => {
    // Formula: (present + excused) / (held - excused) * 100
    it('accurately computes (present + excused) / (held - excused) * 100', () => {
      // 10 held, 7 present, 2 excused, 1 absent -> (7 + 2) / (10 - 2) * 100 = 9 / 8 * 100 = 112.5 -> capped at 100
      expect(calculateAttendancePercentage(7, 2, 10)).toBe(100);

      // 10 held, 5 present, 1 excused, 4 absent -> (5 + 1) / (10 - 1) * 100 = 6 / 9 * 100 = 66.7%
      expect(calculateAttendancePercentage(5, 1, 10)).toBe(66.7);

      // 20 held, 15 present, 0 excused, 5 absent -> 15 / 20 * 100 = 75.0%
      expect(calculateAttendancePercentage(15, 0, 20)).toBe(75);
    });

    it('calculates consecutive absences from latest records', () => {
      const records = [
        { status: 'PRESENT' as const, date: '2026-10-01' },
        { status: 'PRESENT' as const, date: '2026-10-02' },
        { status: 'ABSENT' as const, date: '2026-10-03' },
        { status: 'ABSENT' as const, date: '2026-10-04' },
        { status: 'ABSENT' as const, date: '2026-10-05' },
      ];
      const summary = computeAttendanceMetrics('student-1', records);
      expect(summary.consecutiveAbsences).toBe(3);
    });
  });

  describe('Lead Scoring Engine', () => {
    it('computes 0-100 score and assigns HOT category for strong leads', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const scoreResult = calculateLeadScore({
        courseInterest: 'NEET Foundation',
        preferredStartDate: futureDate.toISOString(),
        hasCommunicationConsent: true,
        preferredCounsellingTime: '10:00 AM - 12:00 PM',
        stage: 'New',
      });

      // 25 (course) + 25 (start date <= 14d) + 20 (consent) + 15 (counselling time) + 5 (new stage) = 90
      expect(scoreResult.total).toBe(90);
      expect(scoreResult.category).toBe('HOT');
      expect(scoreResult.factors.length).toBe(5);
    });

    it('assigns COLD category when course and details are missing', () => {
      const scoreResult = calculateLeadScore({
        courseInterest: '',
        preferredStartDate: null,
        hasCommunicationConsent: false,
        preferredCounsellingTime: null,
        stage: 'New',
      });

      // 0 + 0 + 0 + 0 + 5 = 5
      expect(scoreResult.total).toBe(5);
      expect(scoreResult.category).toBe('COLD');
    });
  });

  describe('Quiet Hours & ISO Week', () => {
    it('correctly calculates ISO week strings', () => {
      const testDate = new Date('2026-10-26T12:00:00Z');
      const isoWeek = getISOWeekString(testDate);
      expect(isoWeek).toMatch(/^2026-W\d{2}$/);
    });

    it('detects quiet hours across midnight boundary', () => {
      const nightTime = new Date('2026-10-25T22:30:00+05:30');
      const dayTime = new Date('2026-10-25T14:30:00+05:30');

      expect(isInQuietHours(nightTime, 'Asia/Kolkata', '21:00', '08:00')).toBe(true);
      expect(isInQuietHours(dayTime, 'Asia/Kolkata', '21:00', '08:00')).toBe(false);
    });
  });
});
