import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  XCircle, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Table, 
  Kanban, 
  Download, 
  Paperclip, 
  MoreHorizontal, 
  Check, 
  ArrowLeft, 
  FileText, 
  Sparkles, 
  Mail, 
  Trash2, 
  ChevronRight,
  Eye,
  Plus
} from 'lucide-react';
import { JobApplication, ApplicationStatus } from '../../types/applicationForms';
import { getApplicationsForJob, updateApplicationStatus } from '../../services/applicationFormService';
import { ApplicantDetailDrawer } from './ApplicantDetailDrawer';
import { ScheduleInterviewModal } from './ScheduleInterviewModal';
import { CvPreviewModal } from './CvPreviewModal';

interface IndustryApplicantsDashboardProps {
  jobId: string;
  jobTitle?: string;
  onBack: () => void;
  onOpenFormBuilder?: () => void;
}

const KANBAN_COLUMNS: ApplicationStatus[] = [
  'New',
  'Under Review',
  'Shortlisted',
  'Interview',
  'Offer',
  'Rejected',
];

export function IndustryApplicantsDashboard({
  jobId,
  jobTitle = 'Senior Engineering Position',
  onBack,
  onOpenFormBuilder,
}: IndustryApplicantsDashboardProps) {
  const [applicants, setApplicants] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'match' | 'date'>('match');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Drawer & Modal States
  const [selectedApplicant, setSelectedApplicant] = useState<JobApplication | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleApplicant, setScheduleApplicant] = useState<JobApplication | null>(null);
  const [cvPreviewUrl, setCvPreviewUrl] = useState<{ url?: string; fileName?: string; studentName?: string } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const list = await getApplicationsForJob(jobId);
      setApplicants(list);
      setLoading(false);
    }
    load();
  }, [jobId]);

  // Derived Stats
  const stats = useMemo(() => {
    const total = applicants.length;
    const newCount = applicants.filter((a) => a.status === 'New').length;
    const shortlisted = applicants.filter((a) => a.status === 'Shortlisted').length;
    const interview = applicants.filter((a) => a.status === 'Interview').length;
    const rejected = applicants.filter((a) => a.status === 'Rejected').length;
    return { total, newCount, shortlisted, interview, rejected };
  }, [applicants]);

  // Filter & Sort Applicants
  const filteredApplicants = useMemo(() => {
    return applicants
      .filter((app) => {
        const matchesSearch =
          app.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (app.studentSkills || []).some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = selectedStatusFilter === 'all' || app.status === selectedStatusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'match') return b.matchPercentage - a.matchPercentage;
        return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
      });
  }, [applicants, searchQuery, selectedStatusFilter, sortBy]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredApplicants.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleBulkStatusChange = async (newStatus: ApplicationStatus) => {
    for (const id of selectedIds) {
      await updateApplicationStatus(id, jobId, newStatus);
    }
    const updated = await getApplicationsForJob(jobId);
    setApplicants(updated);
    setSelectedIds([]);
  };

  const handleExportCSV = () => {
    const headers = 'Name,Email,Applied Date,Match Score %,Status\n';
    const rows = filteredApplicants
      .map(
        (a) =>
          `"${a.studentName}","${a.studentEmail}","${new Date(a.appliedAt).toLocaleDateString()}",${
            a.matchPercentage
          },"${a.status}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Applicants_${jobId}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F8FF] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#64748B]">Loading Candidate Pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F8FF] text-[#0F172A] font-sans pb-28">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-6 shadow-sm">
        <div className="max-w-[1440px] mx-auto space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-[#F5F8FF] text-[#64748B] hover:text-[#0F172A] rounded-xl border border-[#E2E8F0] transition-all cursor-pointer"
                title="Back to Positions Manager"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1D4ED8] bg-[#1D4ED8]/10 px-2.5 py-0.5 rounded">
                    Applicants Pipeline
                  </span>
                  <span className="text-xs font-semibold text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded border border-[#16A34A]/20">
                    Active Recruiting
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">{jobTitle}</h1>
              </div>
            </div>

            {onOpenFormBuilder && (
              <button
                onClick={onOpenFormBuilder}
                className="px-4 py-2 bg-white hover:bg-[#F5F8FF] border border-[#1D4ED8] text-[#1D4ED8] text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                Edit Application Form
              </button>
            )}
          </div>

          {/* Stat Tiles Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Applicants', val: stats.total, icon: Users, color: 'text-[#1D4ED8]' },
              { label: 'New Submissions', val: stats.newCount, icon: Sparkles, color: 'text-[#3B82F6]' },
              { label: 'Shortlisted', val: stats.shortlisted, icon: UserCheck, color: 'text-[#16A34A]' },
              { label: 'Interview Set', val: stats.interview, icon: Calendar, color: 'text-[#F59E0B]' },
              { label: 'Rejected', val: stats.rejected, icon: XCircle, color: 'text-[#DC2626]' },
            ].map((st, idx) => {
              const Icon = st.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-4 border border-[#E2E8F0] rounded-xl shadow-[0_4px_20px_rgba(29,78,216,0.04)] flex items-center justify-between"
                >
                  <div>
                    <div className="text-[11px] font-semibold text-[#64748B]">{st.label}</div>
                    <div className="text-2xl font-extrabold text-[#0F172A] mt-0.5">{st.val}</div>
                  </div>
                  <div className={`p-2.5 bg-[#F5F8FF] rounded-xl ${st.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Toolbar */}
        <div className="bg-white p-4 border border-[#E2E8F0] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by candidate name, email or skill..."
              className="w-full bg-[#F5F8FF] border border-[#E2E8F0] focus:border-[#1D4ED8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#0F172A] outline-none"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-[#F5F8FF] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs text-[#0F172A]">
              <Filter className="w-3.5 h-3.5 text-[#64748B]" />
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent font-semibold outline-none"
              >
                <option value="all">All Statuses</option>
                {KANBAN_COLUMNS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#F5F8FF] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs text-[#0F172A]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#64748B]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-semibold outline-none"
              >
                <option value="match">Highest Match Score %</option>
                <option value="date">Most Recent Applied</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex bg-[#F5F8FF] p-1 border border-[#E2E8F0] rounded-xl">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-[#1D4ED8] text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                Table
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'kanban' ? 'bg-[#1D4ED8] text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                Kanban
              </button>
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white border border-[#E2E8F0] hover:bg-[#F5F8FF] text-[#0F172A] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#1D4ED8]" />
              Export CSV
            </button>
          </div>
        </div>

        {/* TABLE VIEW */}
        {viewMode === 'table' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-[0_4px_20px_rgba(29,78,216,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                {/* Sticky Header */}
                <thead className="bg-[#F5F8FF] border-b border-[#E2E8F0] text-[#64748B] uppercase tracking-wider font-extrabold sticky top-0">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length === filteredApplicants.length && filteredApplicants.length > 0
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="accent-[#1D4ED8] rounded"
                      />
                    </th>
                    <th className="p-4">Candidate</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Applied Date</th>
                    <th className="p-4">Match %</th>
                    <th className="p-4">CV Paperclip</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredApplicants.map((app, appIdx) => {
                    const isSelected = selectedIds.includes(app.id);

                    return (
                      <tr
                        key={app.id ? `${app.id}-${appIdx}` : `app-${appIdx}`}
                        onClick={() => {
                          setSelectedApplicant(app);
                          setIsDrawerOpen(true);
                        }}
                        className={`hover:bg-[#F5F8FF] transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#1D4ED8]/5' : ''
                        }`}
                      >
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(app.id)}
                            className="accent-[#1D4ED8] rounded"
                          />
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                app.studentAvatar ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                              }
                              alt={app.studentName}
                              className="w-9 h-9 rounded-xl object-cover border border-[#E2E8F0]"
                            />
                            <div>
                              <div className="font-bold text-[#0F172A]">{app.studentName}</div>
                              <div className="text-[10px] text-[#64748B] flex items-center gap-1">
                                {(app.studentSkills || []).slice(0, 2).join(', ')}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-[#64748B] font-medium">{app.studentEmail}</td>

                        <td className="p-4 text-[#64748B] font-mono">
                          {new Date(app.appliedAt).toLocaleDateString()}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#1D4ED8] h-full rounded-full"
                                style={{ width: `${app.matchPercentage}%` }}
                              />
                            </div>
                            <span className="font-extrabold text-[#1D4ED8]">{app.matchPercentage}%</span>
                          </div>
                        </td>

                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() =>
                              setCvPreviewUrl({
                                url: app.cvUrl,
                                fileName: app.cvFileName,
                                studentName: app.studentName,
                              })
                            }
                            className="p-1.5 text-[#1D4ED8] bg-[#1D4ED8]/10 hover:bg-[#1D4ED8]/20 rounded-lg flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            CV
                          </button>
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              app.status === 'Shortlisted'
                                ? 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20'
                                : app.status === 'Interview'
                                ? 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
                                : app.status === 'Rejected'
                                ? 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20'
                                : 'bg-[#1D4ED8]/10 text-[#1D4ED8] border border-[#1D4ED8]/20'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>

                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedApplicant(app);
                              setIsDrawerOpen(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F5F8FF] rounded-lg transition-all"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredApplicants.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-[#64748B] text-xs space-y-2">
                        <Users className="w-8 h-8 text-[#3B82F6] mx-auto opacity-50" />
                        <div>No candidates matching search or filters.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KANBAN VIEW */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((col) => {
              const colApplicants = filteredApplicants.filter((a) => a.status === col);

              return (
                <div
                  key={col}
                  className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm space-y-3 min-w-[220px]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                    <span className="text-xs font-bold text-[#0F172A]">{col}</span>
                    <span className="text-[10px] font-extrabold text-[#1D4ED8] bg-[#1D4ED8]/10 px-2 py-0.5 rounded-full">
                      {colApplicants.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                    {colApplicants.map((app, appIdx) => (
                      <div
                        key={app.id ? `${app.id}-${appIdx}` : `app-${appIdx}`}
                        onClick={() => {
                          setSelectedApplicant(app);
                          setIsDrawerOpen(true);
                        }}
                        className="bg-[#F5F8FF] hover:bg-white border border-[#E2E8F0] hover:border-[#1D4ED8] rounded-xl p-3.5 shadow-sm space-y-2 cursor-pointer transition-all hover:shadow-md"
                      >
                        <div className="flex items-start gap-2.5">
                          <img
                            src={
                              app.studentAvatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                            }
                            alt={app.studentName}
                            className="w-8 h-8 rounded-lg object-cover border border-[#E2E8F0]"
                          />
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-[#0F172A] truncate">{app.studentName}</div>
                            <div className="text-[10px] text-[#64748B] truncate">{app.studentEmail}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#E2E8F0] text-[10px]">
                          <span className="text-[#1D4ED8] font-bold">{app.matchPercentage}% Match</span>
                          <span className="text-[#64748B]">{new Date(app.appliedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}

                    {colApplicants.length === 0 && (
                      <div className="p-6 text-center border border-dashed border-[#E2E8F0] rounded-xl text-[11px] text-[#64748B]">
                        No candidates
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sliding Bulk Action Bar at Bottom */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0F172A] text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-6 border border-[#E2E8F0]/20"
          >
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#1D4ED8] flex items-center justify-center text-[11px]">
                {selectedIds.length}
              </span>
              Candidates Selected
            </span>

            <div className="h-4 w-px bg-white/20" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkStatusChange('Shortlisted')}
                className="px-3.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg transition-all"
              >
                Shortlist
              </button>
              <button
                onClick={() => {
                  const target = applicants.find((a) => a.id === selectedIds[0]);
                  if (target) {
                    setScheduleApplicant(target);
                    setIsScheduleModalOpen(true);
                  }
                }}
                className="px-3.5 py-1.5 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-lg transition-all"
              >
                Schedule Interview
              </button>
              <button
                onClick={() => handleBulkStatusChange('Rejected')}
                className="px-3.5 py-1.5 bg-[#DC2626] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-lg transition-all"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  alert(`Sending broadcast email to ${selectedIds.length} candidates.`);
                }}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-all"
              >
                Email
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Applicant Detail Drawer */}
      <ApplicantDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        applicant={selectedApplicant}
        onStatusChange={async () => {
          const updated = await getApplicationsForJob(jobId);
          setApplicants(updated);
        }}
        onOpenScheduleInterview={(app) => {
          setScheduleApplicant(app);
          setIsScheduleModalOpen(true);
        }}
      />

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        applicant={scheduleApplicant}
        onInterviewScheduled={async () => {
          const updated = await getApplicationsForJob(jobId);
          setApplicants(updated);
        }}
      />

      {/* CV Preview Modal */}
      {cvPreviewUrl && (
        <CvPreviewModal
          isOpen={!!cvPreviewUrl}
          onClose={() => setCvPreviewUrl(null)}
          cvUrl={cvPreviewUrl.url}
          fileName={cvPreviewUrl.fileName}
          studentName={cvPreviewUrl.studentName}
        />
      )}
    </div>
  );
}
