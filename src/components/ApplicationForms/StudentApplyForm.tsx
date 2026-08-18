import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Upload, 
  FileText, 
  X, 
  AlertCircle, 
  Send, 
  ArrowLeft, 
  Briefcase, 
  DollarSign, 
  Sparkles, 
  Check, 
  ChevronRight, 
  ExternalLink 
} from 'lucide-react';
import { JobForm, FormField, ApplicationAnswer, JobApplication } from '../../types/applicationForms';
import { getJobForm, submitApplication } from '../../services/applicationFormService';
import { useAuth } from '../../App';

interface StudentApplyFormProps {
  jobId: string;
  isPreview?: boolean;
  onBack?: () => void;
  onNavigateToMyApplications?: () => void;
}

export function StudentApplyForm({ jobId, isPreview = false, onBack, onNavigateToMyApplications }: StudentApplyFormProps) {
  const { user, profile, setView } = useAuth();
  const [form, setForm] = useState<JobForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cvFile, setCvFile] = useState<{ name: string; size: number; url: string; progress: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<JobApplication | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getJobForm(jobId);
      setForm(data);

      // Pre-fill student defaults if profile available
      const initialAnswers: Record<string, any> = {};
      if (profile) {
        data.fields.forEach((f) => {
          if (f.type === 'short_answer' && f.label.toLowerCase().includes('name')) {
            initialAnswers[f.id] = profile.displayName || '';
          } else if (f.type === 'email') {
            initialAnswers[f.id] = user?.email || profile.email || '';
          } else if (f.type === 'phone') {
            initialAnswers[f.id] = profile.phone || '';
          }
        });
      }
      setAnswers(initialAnswers);

      // Pre-fill sample CV if profile has one
      if (profile?.cvUrl || profile?.resumeUrl) {
        setCvFile({
          name: profile.cvFileName || `${profile.displayName || 'Candidate'}_Resume.pdf`,
          size: 1450000,
          url: profile.cvUrl || profile.resumeUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          progress: 100,
        });
      }

      setLoading(false);
    }
    load();
  }, [jobId, profile, user]);

  // Calculate percentage answered
  const calculateProgress = () => {
    if (!form) return 0;
    const requiredFields = form.fields.filter((f) => f.required && f.type !== 'section_break');
    if (requiredFields.length === 0) return 100;

    let answeredCount = 0;
    requiredFields.forEach((f) => {
      if (f.type === 'file_upload') {
        if (cvFile && cvFile.progress === 100) answeredCount++;
      } else {
        const val = answers[f.id];
        if (Array.isArray(val) ? val.length > 0 : val && String(val).trim() !== '') {
          answeredCount++;
        }
      }
    });

    return Math.round((answeredCount / requiredFields.length) * 100);
  };

  const handleInputChange = (fieldId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: val }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleCheckboxToggle = (fieldId: string, option: string) => {
    const current: string[] = Array.isArray(answers[fieldId]) ? answers[fieldId] : [];
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    handleInputChange(fieldId, next);
  };

  const handleFileUpload = (file: File) => {
    // Simulate uploading progress
    setCvFile({
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      progress: 0,
    });

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
      }
      setCvFile((prev) => (prev ? { ...prev, progress: p } : null));
    }, 150);
  };

  const validate = () => {
    if (!form) return false;
    const newErrors: Record<string, string> = {};

    form.fields.forEach((f) => {
      if (!f.required || f.type === 'section_break') return;

      if (f.type === 'file_upload') {
        if (!cvFile || cvFile.progress < 100) {
          newErrors[f.id] = 'CV / Resume upload is required.';
        }
      } else {
        const val = answers[f.id];
        if (!val || (Array.isArray(val) && val.length === 0) || String(val).trim() === '') {
          newErrors[f.id] = 'This field is required.';
        } else if (f.type === 'email' && !String(val).includes('@')) {
          newErrors[f.id] = 'Please enter a valid email address.';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    if (!validate()) {
      // Scroll to first error
      const firstErrKey = Object.keys(errors)[0];
      if (firstErrKey) {
        const el = document.getElementById(`field-card-${firstErrKey}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);

    const formattedAnswers: ApplicationAnswer[] = form.fields
      .filter((f) => f.type !== 'section_break' && f.type !== 'file_upload')
      .map((f) => ({
        fieldId: f.id,
        fieldLabel: f.label,
        fieldType: f.type,
        value: answers[f.id] || '',
      }));

    const result = await submitApplication({
      jobId: form.jobId,
      jobTitle: form.jobRoleChip || form.title,
      companyName: form.companyName || 'Enterprise Partner',
      formId: form.id,
      studentId: user?.uid || 'student-guest',
      studentName: profile?.displayName || user?.displayName || 'Applicant Candidate',
      studentEmail: user?.email || profile?.email || 'applicant@university.edu',
      studentPhone: profile?.phone || '',
      studentAvatar: profile?.photoURL || user?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      matchPercentage: Math.floor(Math.random() * 15) + 85, // 85-99% match
      cvUrl: cvFile?.url,
      cvFileName: cvFile?.name,
      cvFileSize: cvFile?.size,
      answers: formattedAnswers,
      status: 'New',
    });

    setSubmittedApp(result);
    setSubmitting(false);
  };

  if (loading || !form) {
    return (
      <div className="min-h-screen bg-[#F5F8FF] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#64748B]">Loading Application Form...</p>
        </div>
      </div>
    );
  }

  // Calculate Days Remaining for Countdown Pill
  const calculateDaysRemaining = () => {
    if (!form.settings.deadline) return 14;
    const deadlineDate = new Date(form.settings.deadline);
    const now = new Date();
    const diff = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const daysLeft = calculateDaysRemaining();
  const progressPct = calculateProgress();

  // Success Confirmation Card
  if (submittedApp) {
    return (
      <div className="min-h-screen bg-[#F5F8FF] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-xl w-full bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-[0_8px_30px_rgba(29,78,216,0.08)] text-center space-y-6"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1D4ED8] bg-[#1D4ED8]/10 px-3 py-1 rounded-md">
              Application Received
            </span>
            <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Application Submitted Successfully!</h2>
            <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
              {form.settings.confirmationMessage ||
                "Your application has been logged and forwarded directly to the recruiting team's candidate pipeline."}
            </p>
          </div>

          <div className="p-4 bg-[#F5F8FF] border border-[#E2E8F0] rounded-xl text-left space-y-2 text-xs">
            <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
              <span className="text-[#64748B]">Application Reference ID:</span>
              <span className="font-mono font-bold text-[#1D4ED8]">{submittedApp.id}</span>
            </div>
            <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
              <span className="text-[#64748B]">Position & Company:</span>
              <span className="font-semibold text-[#0F172A]">
                {submittedApp.jobTitle} • {submittedApp.companyName}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-[#64748B]">Notification Status:</span>
              <span className="text-[#16A34A] font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> You'll be notified by email
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                if (onNavigateToMyApplications) {
                  onNavigateToMyApplications();
                } else {
                  setView('my-applications');
                }
              }}
              className="flex-1 py-3 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              View My Applications
              <ChevronRight className="w-4 h-4" />
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-5 py-3 bg-white hover:bg-[#F5F8FF] border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Return to Jobs
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F8FF] text-[#0F172A] font-sans pb-24">
      {/* Thin Blue Progress Bar fixed at very top */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1.5 bg-[#E2E8F0]">
        <div
          className="h-full bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="max-w-[720px] mx-auto px-4 pt-8 space-y-6" ref={formRef}>
        {/* Back Link if available */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#1D4ED8] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to position listings
          </button>
        )}

        {/* Hero Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-[0_4px_20px_rgba(29,78,216,0.06)] relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                {form.companyName ? form.companyName.charAt(0) : 'E'}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1D4ED8] bg-[#1D4ED8]/10 px-2.5 py-0.5 rounded-md">
                  {form.companyName || 'Enterprise Corporate Partner'}
                </span>
                <h1 className="text-xl md:text-2xl font-extrabold text-[#0F172A] tracking-tight">{form.title}</h1>

                {/* Chips Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[#64748B]">
                  {form.location && (
                    <span className="flex items-center gap-1 bg-[#F5F8FF] px-2.5 py-1 rounded-lg border border-[#E2E8F0]">
                      <MapPin className="w-3.5 h-3.5 text-[#1D4ED8]" />
                      {form.location}
                    </span>
                  )}
                  {form.jobType && (
                    <span className="flex items-center gap-1 bg-[#F5F8FF] px-2.5 py-1 rounded-lg border border-[#E2E8F0]">
                      <Briefcase className="w-3.5 h-3.5 text-[#1D4ED8]" />
                      {form.jobType}
                    </span>
                  )}
                  {form.salary && (
                    <span className="flex items-center gap-1 bg-[#F5F8FF] px-2.5 py-1 rounded-lg border border-[#E2E8F0]">
                      <DollarSign className="w-3.5 h-3.5 text-[#16A34A]" />
                      {form.salary}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Deadline Countdown Pill (Amber when < 3 days) */}
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                daysLeft <= 3
                  ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30 animate-pulse'
                  : 'bg-[#1D4ED8]/10 text-[#1D4ED8] border-[#1D4ED8]/20'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {daysLeft > 0 ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left` : 'Deadline Today'}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#64748B] border-t border-[#E2E8F0] pt-4 mt-5 leading-relaxed">
            {form.description}
          </p>

          {/* Progress % indicator bar */}
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-semibold text-[#64748B]">
            <span>Form Completion Progress</span>
            <span className="text-[#1D4ED8] font-bold">{progressPct}% Answered</span>
          </div>
        </div>

        {/* Application Questions Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {form.fields.map((field, idx) => {
            const hasError = !!errors[field.id];

            if (field.type === 'section_break') {
              return (
                <div key={field.id ? `${field.id}-${idx}` : `field-${idx}`} className="pt-4 border-t border-[#E2E8F0] my-6">
                  <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">{field.label}</h3>
                  {field.helperText && <p className="text-xs text-[#64748B] mt-1">{field.helperText}</p>}
                </div>
              );
            }

            return (
              <div
                id={`field-card-${field.id}`}
                key={field.id ? `${field.id}-${idx}` : `field-${idx}`}
                className={`bg-white border rounded-xl p-6 shadow-[0_2px_12px_rgba(29,78,216,0.03)] transition-all ${
                  hasError ? 'border-[#DC2626] ring-1 ring-[#DC2626]/20' : 'border-[#E2E8F0] hover:border-[#3B82F6]/30'
                }`}
              >
                {/* Field Label */}
                <div className="space-y-1 mb-3">
                  <label className="text-base font-semibold text-[#0F172A] flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-[#DC2626] font-bold">*</span>}
                  </label>
                  {field.helperText && <p className="text-xs text-[#64748B]">{field.helperText}</p>}
                </div>

                {/* Field Inputs */}
                {field.type === 'short_answer' && (
                  <input
                    type="text"
                    value={answers[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={field.placeholder || 'Type your response here...'}
                    className="w-full bg-white border border-[#E2E8F0] focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#3B82F6]/20 rounded-xl p-3 text-xs text-[#0F172A] outline-none transition-all"
                  />
                )}

                {field.type === 'paragraph' && (
                  <textarea
                    value={answers[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={field.placeholder || 'Write a detailed response...'}
                    rows={4}
                    className="w-full bg-white border border-[#E2E8F0] focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#3B82F6]/20 rounded-xl p-3 text-xs text-[#0F172A] outline-none transition-all resize-none"
                  />
                )}

                {field.type === 'email' && (
                  <input
                    type="email"
                    value={answers[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={field.placeholder || 'alex@university.edu'}
                    className="w-full bg-white border border-[#E2E8F0] focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#3B82F6]/20 rounded-xl p-3 text-xs text-[#0F172A] outline-none transition-all"
                  />
                )}

                {field.type === 'phone' && (
                  <input
                    type="tel"
                    value={answers[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={field.placeholder || '+1 (555) 000-0000'}
                    className="w-full bg-white border border-[#E2E8F0] focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#3B82F6]/20 rounded-xl p-3 text-xs text-[#0F172A] outline-none transition-all"
                  />
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    value={answers[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={field.placeholder || 'e.g. 3'}
                    className="w-full bg-white border border-[#E2E8F0] focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#3B82F6]/20 rounded-xl p-3 text-xs text-[#0F172A] outline-none transition-all"
                  />
                )}

                {field.type === 'date' && (
                  <input
                    type="date"
                    value={answers[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full bg-white border border-[#E2E8F0] focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#3B82F6]/20 rounded-xl p-3 text-xs text-[#0F172A] outline-none transition-all font-semibold"
                  />
                )}

                {field.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {(field.options || []).map((opt, oIdx) => (
                      <label
                        key={`${opt}-${oIdx}`}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          answers[field.id] === opt
                            ? 'bg-[#1D4ED8]/5 border-[#1D4ED8] text-[#1D4ED8] font-semibold'
                            : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:bg-[#F5F8FF]'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`radio-${field.id}`}
                          checked={answers[field.id] === opt}
                          onChange={() => handleInputChange(field.id, opt)}
                          className="accent-[#1D4ED8]"
                        />
                        <span className="text-xs">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'checkboxes' && (
                  <div className="space-y-2">
                    {(field.options || []).map((opt, oIdx) => {
                      const checked = (answers[field.id] || []).includes(opt);
                      return (
                        <label
                          key={`${opt}-${oIdx}`}
                          className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                            checked
                              ? 'bg-[#1D4ED8]/5 border-[#1D4ED8] text-[#1D4ED8] font-semibold'
                              : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:bg-[#F5F8FF]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleCheckboxToggle(field.id, opt)}
                            className="accent-[#1D4ED8] rounded"
                          />
                          <span className="text-xs">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {field.type === 'dropdown' && (
                  <select
                    value={answers[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full bg-white border border-[#E2E8F0] focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#3B82F6]/20 rounded-xl p-3 text-xs font-semibold text-[#0F172A] outline-none transition-all"
                  >
                    <option value="">Select an option...</option>
                    {(field.options || []).map((opt, oIdx) => (
                      <option key={`${opt}-${oIdx}`} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {/* CV Upload Dropzone */}
                {field.type === 'file_upload' && (
                  <div className="space-y-3">
                    {!cvFile ? (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOver(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFileUpload(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`p-8 border-2 border-dashed rounded-xl text-center space-y-3 transition-all cursor-pointer ${
                          isDragOver
                            ? 'border-[#1D4ED8] bg-[#1D4ED8]/10 scale-[1.01]'
                            : 'border-[#3B82F6]/40 bg-[#F5F8FF] hover:border-[#1D4ED8] hover:bg-[#1D4ED8]/5'
                        }`}
                      >
                        <div className="w-12 h-12 mx-auto rounded-full bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0F172A]">
                            Drag your CV / Resume here, or{' '}
                            <label className="text-[#1D4ED8] underline cursor-pointer">
                              browse files
                              <input
                                type="file"
                                accept=".pdf,.docx"
                                onChange={(e) => e.target.files && e.target.files[0] && handleFileUpload(e.target.files[0])}
                                className="hidden"
                              />
                            </label>
                          </p>
                          <p className="text-[11px] text-[#64748B] mt-1">
                            Accepted formats: PDF or DOCX (Max {Math.round(form.settings.maxCvSizeBytes / (1024 * 1024))}MB)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-[#F5F8FF] border border-[#3B82F6]/30 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center font-bold">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#0F172A]">{cvFile.name}</div>
                            <div className="text-[10px] text-[#64748B]">
                              {(cvFile.size / 1024 / 1024).toFixed(2)} MB •{' '}
                              {cvFile.progress === 100 ? (
                                <span className="text-[#16A34A] font-semibold">Uploaded & Ready</span>
                              ) : (
                                `Uploading ${cvFile.progress}%...`
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Progress ring if uploading */}
                          {cvFile.progress < 100 && (
                            <div className="w-6 h-6 border-2 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
                          )}
                          <button
                            type="button"
                            onClick={() => setCvFile(null)}
                            className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-white rounded-lg transition-all"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline Error Message */}
                {hasError && (
                  <div className="flex items-center gap-1.5 text-[#DC2626] text-xs font-semibold mt-2 animate-fadeIn">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors[field.id]}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit Button Bar */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 active:scale-[0.99] text-white text-sm font-extrabold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Application Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
