import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Phone, 
  FileText, 
  Download, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Send, 
  User, 
  Plus, 
  Sparkles, 
  Check, 
  ChevronRight, 
  MessageSquare,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { JobApplication, ApplicationStatus, InternalNote } from '../../types/applicationForms';
import { updateApplicationStatus, addApplicationNote } from '../../services/applicationFormService';
import { CvPreviewModal } from './CvPreviewModal';

interface ApplicantDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: JobApplication | null;
  onStatusChange?: (newStatus: ApplicationStatus) => void;
  onOpenScheduleInterview?: (applicant: JobApplication) => void;
}

export function ApplicantDetailDrawer({
  isOpen,
  onClose,
  applicant,
  onStatusChange,
  onOpenScheduleInterview,
}: ApplicantDetailDrawerProps) {
  if (!isOpen || !applicant) return null;

  const [activeTab, setActiveTab] = useState<'answers' | 'cv' | 'notes' | 'timeline'>('answers');
  const [notes, setNotes] = useState<InternalNote[]>(applicant.notes || []);
  const [newNoteText, setNewNoteText] = useState('');
  const [currentStatus, setCurrentStatus] = useState<ApplicationStatus>(applicant.status);
  const [isCvModalOpen, setIsCvModalOpen] = useState(false);

  const handleStatusUpdate = async (status: ApplicationStatus) => {
    setCurrentStatus(status);
    await updateApplicationStatus(applicant.id, applicant.jobId, status);
    if (onStatusChange) onStatusChange(status);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote = await addApplicationNote(applicant.id, applicant.jobId, newNoteText, 'Recruiting Manager');
    setNotes([newNote, ...notes]);
    setNewNoteText('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[260] overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
        />

        {/* Drawer container (520px wide) */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 bottom-0 w-full max-w-[520px] bg-white border-l border-[#E2E8F0] shadow-2xl flex flex-col z-10 text-left"
        >
          {/* Header */}
          <div className="p-6 bg-[#F5F8FF] border-b border-[#E2E8F0] space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1D4ED8] bg-[#1D4ED8]/10 px-2.5 py-0.5 rounded">
                Candidate Dossier
              </span>
              <button
                onClick={onClose}
                className="p-1.5 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar & Info Row */}
            <div className="flex items-start gap-4">
              <img
                src={
                  applicant.studentAvatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                }
                alt={applicant.studentName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#1D4ED8]/20 shadow-md shrink-0"
              />

              <div className="space-y-1 overflow-hidden flex-1">
                <h3 className="text-xl font-bold text-[#0F172A] truncate">{applicant.studentName}</h3>
                <p className="text-xs font-semibold text-[#1D4ED8] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> {applicant.matchPercentage}% Skill Match Score
                </p>

                {/* Contact Row */}
                <div className="flex items-center gap-3 pt-1 text-xs text-[#64748B] flex-wrap">
                  <a
                    href={`mailto:${applicant.studentEmail}`}
                    className="flex items-center gap-1 hover:text-[#1D4ED8] transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#1D4ED8]" />
                    <span className="truncate max-w-[180px]">{applicant.studentEmail}</span>
                  </a>
                  {applicant.studentPhone && (
                    <a
                      href={`tel:${applicant.studentPhone}`}
                      className="flex items-center gap-1 hover:text-[#1D4ED8] transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#1D4ED8]" />
                      <span>{applicant.studentPhone}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Status Selector Dropdown */}
            <div className="flex items-center justify-between bg-white p-3 border border-[#E2E8F0] rounded-xl text-xs">
              <span className="text-[#64748B] font-semibold">Current Pipeline Status:</span>
              <select
                value={currentStatus}
                onChange={(e) => handleStatusUpdate(e.target.value as ApplicationStatus)}
                className="bg-[#F5F8FF] border border-[#E2E8F0] text-[#0F172A] font-bold rounded-lg px-3 py-1 outline-none"
              >
                <option value="New">New</option>
                <option value="Under Review">Under Review</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview">Interview Scheduled</option>
                <option value="Offer">Offer Extended</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#E2E8F0] pt-2">
              {[
                { id: 'answers', label: 'Form Answers' },
                { id: 'cv', label: 'CV / Resume' },
                { id: 'notes', label: `Recruiter Notes (${notes.length})` },
                { id: 'timeline', label: 'Timeline' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-[#1D4ED8] text-[#1D4ED8]'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Drawer Body Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white custom-scrollbar">
            {/* TAB 1: ANSWERS */}
            {activeTab === 'answers' && (
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">
                  Submitted Question Responses
                </h4>

                {applicant.answers && applicant.answers.length > 0 ? (
                  applicant.answers.map((ans, idx) => (
                    <div key={idx} className="p-4 bg-[#F5F8FF] border border-[#E2E8F0] rounded-xl space-y-1.5">
                      <div className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-[#1D4ED8]/10 text-[#1D4ED8] text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        {ans.fieldLabel}
                      </div>

                      <div className="text-xs text-[#0F172A] pl-7 font-medium leading-relaxed bg-white p-2.5 border border-[#E2E8F0] rounded-lg">
                        {Array.isArray(ans.value) ? (
                          <div className="flex flex-wrap gap-1.5">
                            {ans.value.map((v: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-[#1D4ED8]/10 text-[#1D4ED8] font-semibold rounded text-[11px]">
                                {v}
                              </span>
                            ))}
                          </div>
                        ) : (
                          ans.value || <span className="text-[#64748B] italic">No answer provided</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center border border-dashed border-[#E2E8F0] rounded-xl text-xs text-[#64748B]">
                    No custom questions answered for this application.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CV / RESUME */}
            {activeTab === 'cv' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#F5F8FF] border border-[#E2E8F0] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center font-bold">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0F172A]">{applicant.cvFileName || 'Candidate_Resume.pdf'}</div>
                      <div className="text-[10px] text-[#64748B]">
                        {(applicant.cvFileSize ? applicant.cvFileSize / (1024 * 1024) : 1.2).toFixed(2)} MB • PDF Document
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsCvModalOpen(true)}
                    className="px-3.5 py-1.5 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Open Preview
                  </button>
                </div>

                <div className="h-[360px] bg-[#F5F8FF] border border-[#E2E8F0] rounded-xl flex items-center justify-center p-4">
                  {applicant.cvUrl ? (
                    <iframe
                      src={applicant.cvUrl}
                      title="Candidate CV Document"
                      className="w-full h-full bg-white rounded-lg border border-[#E2E8F0]"
                    />
                  ) : (
                    <div className="text-center space-y-3 p-6">
                      <ShieldCheck className="w-8 h-8 text-[#1D4ED8] mx-auto" />
                      <p className="text-xs font-semibold text-[#0F172A]">CV Verified by CareerBridge Engine</p>
                      <button
                        onClick={() => setIsCvModalOpen(true)}
                        className="px-4 py-2 bg-[#1D4ED8] text-white text-xs font-bold rounded-xl"
                      >
                        Inspect Candidate Document
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: RECRUITER NOTES */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                <form onSubmit={handleAddNote} className="space-y-2">
                  <label className="text-xs font-bold text-[#0F172A]">Add Internal Recruiter Note</label>
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Type private notes for internal hiring team..."
                    rows={3}
                    className="w-full p-3 bg-[#F5F8FF] border border-[#E2E8F0] focus:border-[#1D4ED8] rounded-xl text-xs text-[#0F172A] outline-none resize-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1D4ED8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Save Note
                  </button>
                </form>

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Note History</h4>
                  {notes.map((note, nIdx) => (
                    <div key={note.id ? `${note.id}-${nIdx}` : `note-${nIdx}`} className="p-3.5 bg-[#F5F8FF] border border-[#E2E8F0] rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#64748B]">
                        <span className="text-[#1D4ED8]">{note.author}</span>
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-[#0F172A] leading-relaxed">{note.text}</p>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <p className="text-xs text-[#64748B] italic">No internal notes added yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Candidate Progress Events</h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1D4ED8]">
                  {applicant.timeline?.map((tl, tIdx) => (
                    <div key={tl.id ? `${tl.id}-${tIdx}` : `tl-${tIdx}`} className="relative space-y-1">
                      <div className="absolute -left-[23px] top-0.5 w-4 h-4 rounded-full bg-white border-2 border-[#1D4ED8] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8]" />
                      </div>
                      <div className="text-xs font-bold text-[#0F172A]">{tl.event}</div>
                      {tl.description && <p className="text-[11px] text-[#64748B]">{tl.description}</p>}
                      <div className="text-[10px] text-[#1D4ED8] font-mono">
                        {new Date(tl.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer Bar */}
          <div className="p-4 bg-[#F5F8FF] border-t border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={() => handleStatusUpdate('Rejected')}
              className="px-4 py-2 bg-white hover:bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Reject Candidate
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStatusUpdate('Shortlisted')}
                className="px-4 py-2 bg-white border border-[#1D4ED8] text-[#1D4ED8] hover:bg-[#1D4ED8]/10 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Shortlist
              </button>
              <button
                onClick={() => {
                  if (onOpenScheduleInterview) {
                    onOpenScheduleInterview(applicant);
                  }
                }}
                className="px-5 py-2 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                Call for Interview
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CV Modal Preview */}
      <CvPreviewModal
        isOpen={isCvModalOpen}
        onClose={() => setIsCvModalOpen(false)}
        cvUrl={applicant.cvUrl}
        fileName={applicant.cvFileName}
        studentName={applicant.studentName}
      />
    </AnimatePresence>
  );
}
