import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  Building2, 
  Clock, 
  Search, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Video, 
  Download, 
  Trash2, 
  FileText, 
  Sparkles, 
  MapPin, 
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { JobApplication, ApplicationStatus } from '../../types/applicationForms';
import { getStudentApplications, withdrawApplication } from '../../services/applicationFormService';
import { useAuth } from '../../App';
import { CvPreviewModal } from './CvPreviewModal';

interface StudentApplicationsListProps {
  onSelectJobForForm?: (jobId: string) => void;
}

const STATUS_STEPS: ApplicationStatus[] = [
  'New',
  'Under Review',
  'Shortlisted',
  'Interview',
  'Offer',
];

export function StudentApplicationsList({ onSelectJobForForm }: StudentApplicationsListProps) {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'interview' | 'offer' | 'rejected'>('all');
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [previewCvUrl, setPreviewCvUrl] = useState<{ url?: string; fileName?: string; name?: string } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const studentId = user?.uid || 'student-guest';
      const list = await getStudentApplications(studentId);
      setApplications(list);
      setLoading(false);
    }
    load();
  }, [user]);

  const handleWithdraw = async (appId: string, jobId: string) => {
    if (confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
      const studentId = user?.uid || 'student-guest';
      await withdrawApplication(appId, jobId, studentId);
      setApplications((prev) => prev.filter((a) => a.id !== appId));
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.companyName.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'active') return matchesSearch && !['Rejected', 'Offer'].includes(app.status);
    if (activeTab === 'interview') return matchesSearch && app.status === 'Interview';
    if (activeTab === 'offer') return matchesSearch && app.status === 'Offer';
    if (activeTab === 'rejected') return matchesSearch && app.status === 'Rejected';

    return matchesSearch;
  });

  const getStepProgressIndex = (status: ApplicationStatus) => {
    if (status === 'New') return 0;
    if (status === 'Under Review') return 1;
    if (status === 'Shortlisted') return 2;
    if (status === 'Interview') return 3;
    if (status === 'Offer') return 4;
    if (status === 'Rejected') return 0;
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F8FF] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#64748B]">Loading My Applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F8FF] text-[#0F172A] font-sans pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-8 shadow-sm">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1D4ED8] bg-[#1D4ED8]/10 px-2.5 py-0.5 rounded">
              Student Career Portal
            </span>
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">My Job Applications</h1>
            <p className="text-xs text-[#64748B]">Track real-time status, scheduled interviews, and responses</p>
          </div>

          {/* Search & Tabs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search position or company..."
                className="w-full bg-[#F5F8FF] border border-[#E2E8F0] focus:border-[#1D4ED8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#0F172A] outline-none"
              />
            </div>

            <div className="flex bg-[#F5F8FF] p-1 border border-[#E2E8F0] rounded-xl text-xs overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'all', label: `All (${applications.length})` },
                { id: 'active', label: 'Active' },
                { id: 'interview', label: 'Interviews' },
                { id: 'offer', label: 'Offers' },
                { id: 'rejected', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#1D4ED8] text-white shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Applications Cards List */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {filteredApplications.map((app, appIdx) => {
          const isExpanded = expandedAppId === app.id;
          const currentStepIdx = getStepProgressIndex(app.status);
          const isRejected = app.status === 'Rejected';

          return (
            <div
              key={app.id ? `${app.id}-${appIdx}` : `app-${appIdx}`}
              className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-[0_4px_20px_rgba(29,78,216,0.04)] space-y-6 transition-all hover:border-[#3B82F6]/40"
            >
              {/* Header Row */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                    {app.companyName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">{app.jobTitle}</h3>
                    <div className="text-xs text-[#64748B] font-medium flex items-center gap-2 mt-0.5">
                      <span>{app.companyName}</span>
                      <span>•</span>
                      <span>Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      app.status === 'Offer'
                        ? 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20'
                        : app.status === 'Interview'
                        ? 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 animate-pulse'
                        : app.status === 'Rejected'
                        ? 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20'
                        : 'bg-[#1D4ED8]/10 text-[#1D4ED8] border border-[#1D4ED8]/20'
                    }`}
                  >
                    Status: {app.status}
                  </span>
                </div>
              </div>

              {/* 5-Step Status Tracker Component */}
              {!isRejected ? (
                <div className="pt-2 pb-2">
                  <div className="relative flex items-center justify-between">
                    {/* Horizontal Connector Line */}
                    <div className="absolute left-6 right-6 top-4 h-1 bg-[#E2E8F0] -z-0">
                      <div
                        className="h-full bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6] transition-all duration-500"
                        style={{ width: `${(currentStepIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
                      />
                    </div>

                    {/* Step Circles */}
                    {STATUS_STEPS.map((stepName, sIdx) => {
                      const isCompleted = sIdx <= currentStepIdx;
                      const isCurrent = sIdx === currentStepIdx;

                      return (
                        <div key={stepName} className="relative z-10 flex flex-col items-center gap-1.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isCompleted
                                ? 'bg-[#1D4ED8] text-white shadow-md'
                                : 'bg-white border-2 border-[#E2E8F0] text-[#64748B]'
                            } ${isCurrent ? 'ring-4 ring-[#1D4ED8]/20 scale-110' : ''}`}
                          >
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : sIdx + 1}
                          </div>
                          <span
                            className={`text-[10px] font-bold text-center max-w-[80px] ${
                              isCurrent ? 'text-[#1D4ED8]' : isCompleted ? 'text-[#0F172A]' : 'text-[#64748B]'
                            }`}
                          >
                            {stepName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-xl flex items-center gap-3 text-xs text-[#DC2626]">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <strong className="font-bold">Application Not Selected:</strong> The employer has closed or updated candidate selections for this round.
                  </div>
                </div>
              )}

              {/* Interview Box if Scheduled */}
              {app.interviewDetails && (
                <div className="p-4 bg-[#F5F8FF] border border-[#1D4ED8]/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1D4ED8] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      Scheduled Interview Session
                    </span>
                    <span className="text-[10px] font-extrabold uppercase bg-[#1D4ED8] text-white px-2 py-0.5 rounded">
                      {app.interviewDetails.mode}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#0F172A] bg-white p-3 border border-[#E2E8F0] rounded-lg">
                    <div>
                      <span className="text-[#64748B]">Date & Time:</span>
                      <div className="font-bold">{app.interviewDetails.date} at {app.interviewDetails.time}</div>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Interviewer:</span>
                      <div className="font-bold">{app.interviewDetails.interviewerName}</div>
                    </div>
                  </div>

                  {app.interviewDetails.linkOrAddress && (
                    <a
                      href={app.interviewDetails.linkOrAddress}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1D4ED8] text-white text-xs font-bold rounded-lg hover:bg-[#1e40af] transition-all"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Join Video Meeting Room
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Toggle Answers Drawer */}
              <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                <button
                  onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                  className="text-xs font-bold text-[#1D4ED8] hover:text-[#1e40af] flex items-center gap-1 cursor-pointer"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {isExpanded ? 'Hide Submitted Application Details' : 'View Submitted Responses & CV'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setPreviewCvUrl({
                        url: app.cvUrl,
                        fileName: app.cvFileName,
                        name: profile?.displayName || 'Applicant',
                      })
                    }
                    className="p-1.5 text-[#64748B] hover:text-[#1D4ED8] hover:bg-[#F5F8FF] rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    View CV
                  </button>

                  <button
                    onClick={() => handleWithdraw(app.id, app.jobId)}
                    className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    title="Withdraw Application"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Withdraw
                  </button>
                </div>
              </div>

              {/* Collapsible Answers Section */}
              {isExpanded && (
                <div className="pt-4 border-t border-[#E2E8F0] space-y-3 bg-[#F5F8FF] p-4 rounded-xl">
                  <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                    Submitted Responses
                  </h4>

                  <div className="space-y-2">
                    {app.answers?.map((ans, idx) => (
                      <div key={idx} className="bg-white p-3 border border-[#E2E8F0] rounded-lg space-y-1 text-xs">
                        <div className="font-bold text-[#64748B]">{ans.fieldLabel}</div>
                        <div className="text-[#0F172A] font-semibold">
                          {Array.isArray(ans.value) ? ans.value.join(', ') : ans.value || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredApplications.length === 0 && (
          <div className="bg-white border border-dashed border-[#E2E8F0] rounded-2xl p-12 text-center space-y-4">
            <Briefcase className="w-10 h-10 text-[#3B82F6] mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#0F172A]">No Applications Found</h3>
              <p className="text-xs text-[#64748B]">You haven't submitted applications matching this filter.</p>
            </div>
          </div>
        )}
      </div>

      {/* CV Modal Preview */}
      {previewCvUrl && (
        <CvPreviewModal
          isOpen={!!previewCvUrl}
          onClose={() => setPreviewCvUrl(null)}
          cvUrl={previewCvUrl.url}
          fileName={previewCvUrl.fileName}
          studentName={previewCvUrl.name}
        />
      )}
    </div>
  );
}
