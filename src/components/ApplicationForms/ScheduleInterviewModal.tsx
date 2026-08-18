import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar as CalendarIcon, Clock, Video, MapPin, Phone, User, Mail, Send, Check } from 'lucide-react';
import { JobApplication, InterviewDetails } from '../../types/applicationForms';
import { scheduleInterview } from '../../services/applicationFormService';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: JobApplication | null;
  onInterviewScheduled?: (updatedDetails: InterviewDetails) => void;
}

const TIME_SLOTS = ['09:00 AM', '10:30 AM', '01:30 PM', '03:00 PM', '04:30 PM'];

export function ScheduleInterviewModal({ isOpen, onClose, applicant, onInterviewScheduled }: ScheduleInterviewModalProps) {
  if (!isOpen || !applicant) return null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState(defaultDateStr);
  const [time, setTime] = useState('10:30 AM');
  const [mode, setMode] = useState<'Online' | 'In-person' | 'Phone'>('Online');
  const [linkOrAddress, setLinkOrAddress] = useState('https://meet.google.com/ais-interview-room');
  const [interviewerName, setInterviewerName] = useState('Senior Recruiting Lead');
  const [message, setMessage] = useState(
    `Hi ${applicant.studentName}, we were impressed with your application and project work! We would like to schedule a 30-minute technical evaluation session.`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const details = await scheduleInterview(applicant.id, applicant.jobId, {
      date,
      time,
      mode,
      linkOrAddress,
      interviewerName,
      message,
    });

    setIsSubmitting(false);
    if (onInterviewScheduled) {
      onInterviewScheduled(details);
    }
    onClose();
    alert(`Interview invitation dispatched to ${applicant.studentName} (${applicant.studentEmail})`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[280] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="w-full max-w-xl bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_8px_30px_rgba(29,78,216,0.12)] flex flex-col overflow-hidden z-10 text-left"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-[#F5F8FF] border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Schedule Candidate Interview</h3>
                <p className="text-xs text-[#64748B]">Applicant: <span className="font-semibold text-[#0F172A]">{applicant.studentName}</span></p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-120px)] custom-scrollbar">
            {/* Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">
                Interview Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Online', label: 'Online Meet', icon: Video },
                  { id: 'In-person', label: 'In-person', icon: MapPin },
                  { id: 'Phone', label: 'Phone Call', icon: Phone },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMode(m.id as any);
                        if (m.id === 'Online') setLinkOrAddress('https://meet.google.com/ais-interview-room');
                        else if (m.id === 'In-person') setLinkOrAddress('HQ Building, 4th Floor Conference Suite');
                        else setLinkOrAddress('+1 (555) 019-2834');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1D4ED8]/10 border-[#1D4ED8] text-[#1D4ED8]'
                          : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:bg-[#F5F8FF]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Picker & Time Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-1.5">
                  Interview Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#F5F8FF] border border-[#E2E8F0] focus:border-[#1D4ED8] rounded-xl p-2.5 text-xs font-bold text-[#0F172A] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-1.5">
                  Time Slot Chips
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        time === slot
                          ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                          : 'bg-white border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Meeting Link / Address Field */}
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-1.5">
                {mode === 'Online' ? 'Meeting Link (Google Meet / Zoom)' : mode === 'In-person' ? 'Location Address' : 'Contact Phone Number'}
              </label>
              <input
                type="text"
                value={linkOrAddress}
                onChange={(e) => setLinkOrAddress(e.target.value)}
                className="w-full bg-[#F5F8FF] border border-[#E2E8F0] focus:border-[#1D4ED8] rounded-xl p-2.5 text-xs text-[#0F172A] font-semibold outline-none"
                required
              />
            </div>

            {/* Interviewer Name */}
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-1.5">
                Interviewer Name / Lead
              </label>
              <input
                type="text"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                className="w-full bg-[#F5F8FF] border border-[#E2E8F0] focus:border-[#1D4ED8] rounded-xl p-2.5 text-xs text-[#0F172A] font-semibold outline-none"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-1.5">
                Message to Candidate
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full bg-[#F5F8FF] border border-[#E2E8F0] focus:border-[#1D4ED8] rounded-xl p-3 text-xs text-[#0F172A] outline-none resize-none"
              />
            </div>

            {/* Notification Email Preview */}
            <div className="p-4 bg-[#F5F8FF] border border-[#E2E8F0] rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#1D4ED8] font-bold text-[11px] uppercase tracking-wider">
                <Mail className="w-3.5 h-3.5" />
                Candidate Notification Email Preview
              </div>
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg text-[11px] text-[#0F172A] space-y-1">
                <p><strong>To:</strong> {applicant.studentEmail}</p>
                <p><strong>Subject:</strong> Interview Invitation: {applicant.jobTitle}</p>
                <p className="text-[#64748B] pt-1">"{message}"</p>
                <div className="pt-2 text-[10px] font-mono text-[#1D4ED8] font-bold">
                  Date: {date} at {time} • Mode: {mode} ({linkOrAddress})
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold rounded-xl hover:bg-[#F5F8FF]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Confirm & Dispatch Invitation
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
