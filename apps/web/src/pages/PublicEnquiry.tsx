import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import {
  GraduationCap,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Phone,
  Mail,
  User,
  Clock,
  Calendar,
} from 'lucide-react';

export const PublicEnquiry: React.FC = () => {
  const [formData, setFormData] = useState({
    studentName: '',
    email: '',
    phone: '',
    courseInterest: 'JEE Advanced FastTrack',
    preferredStartDate: '',
    preferredCounsellingTime: '10:00 AM - 12:00 PM',
    source: 'WEB_FORM',
    freeTextInterests: '',
    communicationConsent: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        preferredStartDate: formData.preferredStartDate
          ? new Date(formData.preferredStartDate).toISOString()
          : null,
      };

      const res = await fetchApi('/api/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-cyan-500 selection:text-white">
      <div className="w-full max-w-xl space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between text-xs px-1">
          <Link
            to="/"
            className="text-slate-400 hover:text-cyan-400 font-medium transition flex items-center space-x-1"
          >
            <span>&larr; Back to Dashboard</span>
          </Link>
          <Link
            to="/login"
            className="text-cyan-400 hover:text-cyan-300 font-semibold transition"
          >
            Staff Sign In &rarr;
          </Link>
        </div>
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20 mx-auto">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">TEAM B COACHING INSTITUTE</h1>
          <p className="text-xs text-slate-400">
            Admissions Enquiry Portal • Fast-Track 15-Minute Counsellor Routing
          </p>
        </div>

        {/* Form Container */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          {result ? (
            /* Success confirmation */
            <div className="text-center space-y-4 py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Enquiry Received Successfully!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {result.isDuplicate
                    ? `Your existing enquiry has been updated (${result.duplicateReason}). A counsellor will connect shortly.`
                    : 'Your enquiry has been routed to our subject admissions specialist.'}
                </p>
              </div>

              {result.routing && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs space-y-1.5 font-mono text-slate-300">
                  <div className="text-cyan-400 font-bold">AUTOMATED ROUTING DIAGNOSTIC:</div>
                  <div>Lead ID: {result.lead?.id}</div>
                  <div>Assigned Counsellor: {result.routing.counsellorName || 'Fallback Triage Queue'}</div>
                  <div>Calculated Score: {result.lead?.score} / 100 ({result.lead?.scoreCategory})</div>
                  <div>Reason: {result.routing.matchedReason}</div>
                </div>
              )}

              <button
                onClick={() => {
                  setResult(null);
                  setFormData({
                    studentName: '',
                    email: '',
                    phone: '',
                    courseInterest: 'JEE Advanced FastTrack',
                    preferredStartDate: '',
                    preferredCounsellingTime: '10:00 AM - 12:00 PM',
                    source: 'WEB_FORM',
                    freeTextInterests: '',
                    communicationConsent: false,
                  });
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                Submit Another Enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/50 text-xs text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Student Name */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Student Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aryan Malhotra"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="aryan@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Phone Number *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Course Interest */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Program of Interest *</label>
                <select
                  value={formData.courseInterest}
                  onChange={(e) => setFormData({ ...formData, courseInterest: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="JEE Advanced FastTrack">JEE Advanced FastTrack (2-Year Engineering)</option>
                  <option value="NEET Comprehensive">NEET Comprehensive (Medical Entrance)</option>
                  <option value="Foundation 10th">Foundation 10th (Olympiad & NTSE)</option>
                  <option value="CUET General Test">CUET General Test Preparation</option>
                </select>
              </div>

              {/* Start Date & Counselling Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Target Start Date</label>
                  <input
                    type="date"
                    value={formData.preferredStartDate}
                    onChange={(e) => setFormData({ ...formData, preferredStartDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Preferred Counselling Slot</label>
                  <select
                    value={formData.preferredCounsellingTime}
                    onChange={(e) => setFormData({ ...formData, preferredCounsellingTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="10:00 AM - 12:00 PM">Morning (10:00 AM - 12:00 PM)</option>
                    <option value="02:00 PM - 04:00 PM">Afternoon (02:00 PM - 04:00 PM)</option>
                    <option value="05:00 PM - 07:00 PM">Evening (05:00 PM - 07:00 PM)</option>
                  </select>
                </div>
              </div>

              {/* Free Text Background / Interests */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Academic Background & Target Colleges (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Share recent board percentages, target institutions (e.g. IIT Bombay, AIIMS), or specific doubt subjects..."
                  value={formData.freeTextInterests}
                  onChange={(e) => setFormData({ ...formData, freeTextInterests: e.target.value })}
                  className="w-full p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Communication Consent Checkbox */}
              <div className="flex items-start space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="consent"
                  checked={formData.communicationConsent}
                  onChange={(e) => setFormData({ ...formData, communicationConsent: e.target.checked })}
                  className="mt-0.5 rounded border-slate-800 text-cyan-600 focus:ring-cyan-500 bg-slate-950"
                />
                <label htmlFor="consent" className="text-[11px] text-slate-400 leading-tight">
                  I consent to receive counselling schedules, batch updates, and fee brochures via WhatsApp, SMS, and email. (Respects quiet hours 21:00-08:00).
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-cyan-600/30 flex items-center justify-center space-x-2 transition"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Routing to Counsellor...' : 'Submit Admissions Enquiry'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400">
          TEAM B Coaching Institute Automation Platform • Safe Demo Mode
        </div>
      </div>
    </div>
  );
};
