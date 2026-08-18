import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { sendCrossRoleEmailNotification } from '../services/emailService';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';
import {
  Building2, Briefcase, Users, Plus, Trash2, Search, CheckCircle2,
  MapPin, Clock, Calendar, ExternalLink, Sparkles, AlertCircle,
  TrendingUp, Award, ClipboardCheck, ArrowUpRight, GraduationCap,
  BriefcaseIcon, Settings, BarChart3, Star, Filter, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PublicProfileModal } from './PublicProfileModal';
import { User, FileText, ClipboardList } from 'lucide-react';
import { getDeterministicSkillScore } from '../lib/skillColors';
import { IndustryFormBuilder } from './ApplicationForms/IndustryFormBuilder';
import { IndustryApplicantsDashboard } from './ApplicationForms/IndustryApplicantsDashboard';

export function IndustrySection() {
  const { profile, user, setView, view } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('industry-dashboard');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalData, setProfileModalData] = useState<any | null>(null);

  // Tab dynamic syncing
  useEffect(() => {
    if (view) {
      if (view === 'academic-sessions' || view === 'industry-academic-sessions') {
        setActiveTab('industry-academic-sessions');
      } else if (view.startsWith('industry-')) {
        setActiveTab(view);
      }
    }
  }, [view]);

  // Data state
  const [allGraduates, setAllGraduates] = useState<any[]>([]);
  const [industryJobs, setIndustryJobs] = useState<any[]>([]);
  const [allApplications, setAllApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>('all');
  const [selectedJobForForm, setSelectedJobForForm] = useState<{ id: string; title: string } | null>(null);
  const [selectedJobForApplicants, setSelectedJobForApplicants] = useState<{ id: string; title: string } | null>(null);

  // Positions Manager Control Bar & Filter States
  const [jobsSearchQuery, setJobsSearchQuery] = useState<string>('');
  const [jobsStatusFilter, setJobsStatusFilter] = useState<string>('all');
  const [jobsDeptFilter, setJobsDeptFilter] = useState<string>('all');
  const [jobsSortBy, setJobsSortBy] = useState<string>('newest');

  // Form states for posting a job
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobType, setJobType] = useState('full-time');
  const [jobIndustry, setJobIndustry] = useState('Software Engineering');
  const [jobLink, setJobLink] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobReqs, setJobReqs] = useState('');
  const [jobDeadline, setJobDeadline] = useState('');

  // Selected Talent Detail Modal State
  const [selectedTalent, setSelectedTalent] = useState<any | null>(null);

  // University session requests states
  const [sessionRequests, setSessionRequests] = useState<any[]>([]);
  const [schedulingSessionId, setSchedulingSessionId] = useState<string | null>(null);
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [customFeedback, setCustomFeedback] = useState('');

  // Rejection/Decline specific state
  const [rejectingSessionId, setRejectingSessionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Student Opinion feedback states
  const [opinionSessionId, setOpinionSessionId] = useState<string | null>(null);
  const [opinionRating, setOpinionRating] = useState('Strong Skills');
  const [opinionTechnicalReview, setOpinionTechnicalReview] = useState('');
  const [opinionCurriculumAdvice, setOpinionCurriculumAdvice] = useState('');
  const [submittedOpinions, setSubmittedOpinions] = useState<any[]>([]);

  // Toast indicator state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Firestore Sync
  useEffect(() => {
    if (!user || !profile) return;

    // 1. Fetch Graduates (Candidates)
    const graduatesQuery = query(collection(db, 'users'), where('role', '==', 'graduate'));
    const unsubGrads = onSnapshot(graduatesQuery, (snap) => {
      setAllGraduates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'industry/graduates'));

    // 2. Fetch Jobs
    const jobsQuery = query(collection(db, 'jobs'), orderBy('postedAt', 'desc'));
    const unsubJobs = onSnapshot(jobsQuery, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const partnerCompanyName = profile?.company || 'CareerBridge Partner';
      const myJobs = list.filter((j: any) => j.company?.toLowerCase() === partnerCompanyName.toLowerCase() || j.postedBy === user.uid);
      setIndustryJobs(myJobs);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'industry/jobs'));

    // 3. Fetch Job Applications (for applicant counts & stats)
    const appsQuery = query(collection(db, 'job_applications'));
    const unsubApps = onSnapshot(appsQuery, (snap) => {
      setAllApplications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.log("Applications sync info:", err));

    // 4. Fetch University Session/Talk Requests
    const sessionsQuery = query(collection(db, 'industry_sessions'), where('industryId', '==', user.uid));
    const unsubSessions = onSnapshot(sessionsQuery, (snap) => {
      setSessionRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Error fetching sessions:", err));

    // 5. Fetch Submitted Opinions
    const opinionsQuery = query(collection(db, 'industry_opinions'), where('industryId', '==', user.uid));
    const unsubOpinions = onSnapshot(opinionsQuery, (snap) => {
      setSubmittedOpinions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Error loaded industry opinions:", err));

    return () => {
      unsubGrads();
      unsubJobs();
      unsubApps();
      unsubSessions();
      unsubOpinions();
    };
  }, [user, profile]);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !jobDesc) {
      alert('Please fill out the job title and description.');
      return;
    }

    try {
      await addDoc(collection(db, 'jobs'), {
        title: jobTitle,
        company: profile?.company || 'Enterprise Partner Ltd',
        location: jobLocation || 'Remote / Hybrid',
        jobType,
        industry: jobIndustry,
        description: jobDesc,
        requirements: jobReqs,
        deadline: jobDeadline || 'Immediate',
        applicationLink: jobLink || '#',
        postedAt: Timestamp.now(),
        postedBy: user.uid
      });

      // Reset
      setShowJobForm(false);
      setJobTitle('');
      setJobLocation('');
      setJobType('full-time');
      setJobIndustry('Software Engineering');
      setJobLink('');
      setJobDesc('');
      setJobReqs('');
      setJobDeadline('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'jobs');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job opening?')) return;
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `jobs/${jobId}`);
    }
  };

  // Get unique skills among all graduates
  const availableSkillsList = Array.from(new Set(
    allGraduates.flatMap(g => g.skills || []).map((s: any) => typeof s === 'string' ? s : s.name || s.title)
  )).filter(Boolean);

  // Filter candidates logic
  const filteredCandidates = allGraduates.filter(g => {
    const candidateName = g.displayName || 'Candidate Name';
    const email = g.email || '';
    const bio = g.bio || '';
    const textToMatch = `${candidateName} ${email} ${bio}`.toLowerCase();
    const queryMatch = textToMatch.includes(searchQuery.toLowerCase());

    if (selectedSkillFilter === 'all') return queryMatch;

    const candidateSkills = (g.skills || []).map((s: any) => typeof s === 'string' ? s.toLowerCase() : (s.name || s.title || '').toLowerCase());
    return queryMatch && candidateSkills.includes(selectedSkillFilter.toLowerCase());
  });

  // Helper for job status & deadline calculation
  const getJobStatus = (job: any) => {
    if (job.status === 'closed') return { label: 'Closed', color: 'slate', daysLeft: 'Closed' };

    if (!job.deadline || job.deadline.toLowerCase() === 'immediate' || job.deadline.toLowerCase() === 'open') {
      return { label: 'Open', color: 'emerald', daysLeft: 'Immediate' };
    }

    const deadlineDate = new Date(job.deadline);
    if (!isNaN(deadlineDate.getTime())) {
      const diffMs = deadlineDate.getTime() - Date.now();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        return { label: 'Closed', color: 'slate', daysLeft: 'Closed' };
      } else if (diffDays <= 7) {
        return { label: 'Closing Soon', color: 'amber', daysLeft: `${diffDays}d left` };
      } else {
        return { label: 'Open', color: 'emerald', daysLeft: `${diffDays}d left` };
      }
    }

    return { label: 'Open', color: 'emerald', daysLeft: job.deadline };
  };

  // Helper for job stats (applicant counts)
  const getJobStats = (jobId: string) => {
    const jobApps = allApplications.filter(a => a.jobId === jobId);
    const total = jobApps.length;
    const shortlisted = jobApps.filter(a => ['Shortlisted', 'Interview Scheduled', 'Offered'].includes(a.status)).length;
    return { total, shortlisted };
  };

  // Helper for clean prerequisites tag parsing
  const parseJobSkills = (reqs: string) => {
    if (!reqs) return [];
    const rawItems = reqs.split(/[,;\n•]/).map(s => s.trim()).filter(Boolean);
    const cleanSkills: string[] = [];
    for (const item of rawItems) {
      if (item.length > 28) {
        const parts = item.split(/\s+(?:or|and|such as|including)\s+/i);
        for (const p of parts) {
          const trimmed = p.replace(/^(experience with|knowledge of|proficient in|strong|hands-on)\s+/i, '').trim();
          if (trimmed && trimmed.length <= 22) {
            cleanSkills.push(trimmed);
          } else if (trimmed) {
            cleanSkills.push(trimmed.substring(0, 20) + '...');
          }
        }
      } else {
        cleanSkills.push(item);
      }
    }
    return Array.from(new Set(cleanSkills));
  };

  // Unique departments for filter dropdown
  const uniqueDepartments = Array.from(new Set(
    industryJobs.map(j => j.industry).filter(Boolean)
  ));

  // Counts for status tabs
  const statusCounts = {
    all: industryJobs.length,
    open: industryJobs.filter(j => getJobStatus(j).label === 'Open').length,
    closing: industryJobs.filter(j => getJobStatus(j).label === 'Closing Soon').length,
    closed: industryJobs.filter(j => getJobStatus(j).label === 'Closed').length,
  };

  // Filtered & sorted jobs
  const filteredJobs = industryJobs.filter((job) => {
    const statusInfo = getJobStatus(job);

    // Status filter
    if (jobsStatusFilter === 'open' && statusInfo.label !== 'Open') return false;
    if (jobsStatusFilter === 'closing' && statusInfo.label !== 'Closing Soon') return false;
    if (jobsStatusFilter === 'closed' && statusInfo.label !== 'Closed') return false;

    // Department filter
    if (jobsDeptFilter !== 'all' && (job.industry || '').toLowerCase() !== jobsDeptFilter.toLowerCase()) return false;

    // Search query
    if (jobsSearchQuery.trim()) {
      const q = jobsSearchQuery.toLowerCase();
      const titleMatch = (job.title || '').toLowerCase().includes(q);
      const deptMatch = (job.industry || '').toLowerCase().includes(q);
      const locMatch = (job.location || '').toLowerCase().includes(q);
      const reqMatch = (job.requirements || '').toLowerCase().includes(q);
      if (!titleMatch && !deptMatch && !locMatch && !reqMatch) return false;
    }

    return true;
  }).sort((a, b) => {
    if (jobsSortBy === 'applicants') {
      return getJobStats(b.id).total - getJobStats(a.id).total;
    }
    if (jobsSortBy === 'deadline') {
      return (a.deadline || '').localeCompare(b.deadline || '');
    }
    // Default: newest first
    const dateA = a.postedAt?.toDate ? a.postedAt.toDate().getTime() : 0;
    const dateB = b.postedAt?.toDate ? b.postedAt.toDate().getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="space-y-8">
      {/* Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center font-black text-base shadow-sm shrink-0">
            {(profile?.company || 'E').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                {profile?.company || 'Enterprise Partner'}
              </h1>
              <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-[10px] font-bold rounded-md uppercase tracking-wider">
                Industry Hub
              </span>
            </div>
            <p className="text-xs text-text-muted font-normal mt-0.5">
              Manage open positions, review applicant pipelines, and drive campus talent partnerships.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            {/* Tab 1: Console */}
            {activeTab === 'industry-dashboard' && (
              <div className="space-y-12">
                {/* Stats Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-bg-secondary p-8 rounded-3xl border border-border flex flex-col justify-between hover:shadow-xl transition-all group">
                    <div className="p-3.5 bg-indigo-500/10 rounded-2xl w-fit text-indigo-500 group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="mt-6">
                      <span className="text-4xl font-bold text-text-primary block tracking-tight">{allGraduates.length}</span>
                      <span className="text-[10px] font-black text-text-muted mt-2 block uppercase tracking-widest">Global Talent Pool</span>
                    </div>
                  </div>

                  <div className="bg-bg-secondary p-8 rounded-3xl border border-border flex flex-col justify-between hover:shadow-xl transition-all group">
                    <div className="p-3.5 bg-emerald-500/10 rounded-2xl w-fit text-emerald-500 group-hover:scale-110 transition-transform">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div className="mt-6">
                      <span className="text-4xl font-bold text-text-primary block tracking-tight">{industryJobs.length}</span>
                      <span className="text-[10px] font-black text-text-muted mt-2 block uppercase tracking-widest">My Active Postings</span>
                    </div>
                  </div>

                  <div className="bg-bg-secondary p-8 rounded-3xl border border-border flex flex-col justify-between hover:shadow-xl transition-all group">
                    <div className="p-3.5 bg-pink-500/10 rounded-2xl w-fit text-pink-500 group-hover:scale-110 transition-transform">
                      <Award className="w-6 h-6" />
                    </div>
                    <div className="mt-6">
                      <span className="text-4xl font-bold text-text-primary block tracking-tight">
                        {allGraduates.filter(g => g.readinessScore >= 80).length}
                      </span>
                      <span className="text-[10px] font-black text-text-muted mt-2 block uppercase tracking-widest">Elite Matches (🔑 Score &gt;= 80)</span>
                    </div>
                  </div>

                  <div className="bg-bg-secondary p-8 rounded-3xl border border-border flex flex-col justify-between hover:shadow-xl transition-all group">
                    <div className="p-3.5 bg-cyan-500/10 rounded-2xl w-fit text-cyan-500 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div className="mt-6">
                      <span className="text-4xl font-semibold text-text-primary block tracking-tight">
                        {allGraduates.length > 0
                          ? Math.round(allGraduates.reduce((acc, current) => acc + (current.readinessScore || 0), 0) / allGraduates.length)
                          : 0}%
                      </span>
                      <span className="text-[10px] font-black text-text-muted mt-2 block uppercase tracking-widest">Average Readiness Index</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Bento Hub */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Candidates Preview */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-border/60">
                      <h3 className="text-[11px] font-bold tracking-widest text-text-muted uppercase">Elite Graduate Candidates</h3>
                      <button
                        onClick={() => {
                          setActiveTab('industry-talents');
                          setView('industry-talents');
                        }}
                        className="text-primary text-[10px] font-bold tracking-widest uppercase hover:underline flex items-center gap-1.5"
                      >
                        Launch Directory <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {allGraduates.slice(0, 4).map((cand) => (
                        <div
                          key={cand.id}
                          onClick={() => setSelectedTalent(cand)}
                          className="p-5 bg-card border border-border rounded-2xl flex items-center justify-between hover:border-primary/20 hover:scale-[1.01] transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center font-bold text-primary">
                              {cand.displayName?.[0] || 'C'}
                            </div>
                            <div>
                              <p className="font-bold text-text-primary">{cand.displayName || 'Anonymous Graduate'}</p>
                              <p className="text-[10px] text-text-muted font-mono">{cand.targetRole || 'Software Associate'}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-bold text-primary block">
                              {cand.profileAnalyzed ? `${cand.readinessScore || 0}% Match` : 'Awaiting CV'}
                            </div>
                            <span className="text-[9px] text-text-muted uppercase tracking-wider block font-semibold mt-1">Readiness Index</span>
                          </div>
                        </div>
                      ))}
                      {allGraduates.length === 0 && (
                        <div className="p-8 text-center bg-card border border-dashed border-border rounded-2xl text-text-muted text-xs">
                          No graduates matching target roles registered yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Pipeline Info */}
                  <div className="p-8 bg-bg-secondary border border-border rounded-[2.5rem] space-y-6">
                    <h3 className="text-xl font-bold text-text-primary tracking-tight">Enterprise Talent Matching</h3>
                    <p className="text-text-muted-foreground text-sm font-light leading-relaxed">
                      CareerBridge matches graduates' active skill portfolios with live vacancy pipelines asynchronously. Seniors, students, and target recruiters operate on one single verified talent standard.
                    </p>

                    <div className="space-y-4 border-t border-border pt-6">
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-text-primary">Vetted Skill Verifications</h4>
                          <p className="text-[11px] text-text-secondary leading-relaxed mt-1">Candidates pass coding benchmarks verified directly by senior engineers.</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-text-primary">Direct Application Sprints</h4>
                          <p className="text-[11px] text-text-secondary leading-relaxed mt-1">Bypass initial vetting filters through directly sponsored University coding challenges.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Talent Directory */}
            {activeTab === 'industry-talents' && (
              <div className="space-y-8">
                {/* Find Controls */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-6 border-b border-border">
                  <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search talent database by name or keyword..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2.5 bg-bg-secondary border border-border rounded-xl text-xs outline-none focus:border-primary w-full"
                    />
                  </div>

                  {/* Skill filter */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-text-muted whitespace-nowrap shrink-0" />
                    <select
                      value={selectedSkillFilter}
                      onChange={(e) => setSelectedSkillFilter(e.target.value)}
                      className="px-4 py-2 bg-bg-secondary border border-border rounded-xl text-xs text-text-primary outline-none focus:border-primary w-full md:w-48 appearance-none"
                    >
                      <option value="all">All Specialties</option>
                      {availableSkillsList.map((skill, index) => (
                        <option value={skill} key={index}>{skill}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredCandidates.map((candidate) => {
                    const hasCV = !!candidate.profileAnalyzed;
                    const avgScore = hasCV ? (candidate.readinessScore || 0) : 0;
                    return (
                      <motion.div
                        key={candidate.id}
                        whileHover={{ y: -6 }}
                        onClick={() => setSelectedTalent(candidate)}
                        className="bg-bg-secondary border border-border hover:border-primary/20 p-8 rounded-[2.5rem] flex flex-col justify-between hover:shadow-xl transition-all cursor-pointer space-y-6"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="w-12 h-12 bg-primary-light text-primary rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner">
                              {candidate.displayName?.[0] || 'C'}
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-black border rounded-full px-3 py-1 font-mono ${
                                hasCV ? 'text-primary bg-primary-light border-primary/20' : 'text-text-muted bg-bg-secondary border-border'
                              }`}>
                                SCORE: {hasCV ? `${avgScore}%` : 'Awaiting CV'}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-lg font-bold text-text-primary tracking-tight">{candidate.displayName || 'Pre-Vetted Graduate'}</h4>
                            <p className="text-[11px] font-black text-text-muted uppercase tracking-wider">{candidate.targetRole || 'Software Developer'}</p>
                          </div>

                          <p className="text-[12px] text-text-secondary leading-relaxed line-clamp-3">
                            {candidate.bio || 'This candidate is currently participating in verify challenges and active skill gaps audits.'}
                          </p>
                        </div>

                        {/* Candidate Skills badge row */}
                        <div className="space-y-4 border-t border-border pt-4">
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {(candidate.skills || []).slice(0, 3).map((skill: any, idx: number) => {
                              const sName = typeof skill === 'string' ? skill : skill.name || skill.title;
                              return (
                                <span key={idx} className="px-2 py-0.5 bg-bg-primary text-text-secondary rounded text-[9px] font-medium border border-border">
                                  {sName}
                                </span>
                              );
                            })}
                            {(candidate.skills || []).length > 3 && (
                              <span className="text-[9px] text-text-muted font-bold px-1.5 py-0.5">
                                +{(candidate.skills || []).length - 3} more
                              </span>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-black text-primary tracking-wider uppercase">
                            <span>Inspect Dossier</span>
                            <ArrowUpRight className="w-4 h-4" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {filteredCandidates.length === 0 && (
                    <div className="p-12 text-center col-span-full border-2 border-dashed border-border rounded-3xl text-text-muted text-sm space-y-2">
                      <AlertCircle className="w-8 h-8 mx-auto opacity-40 text-primary" />
                      <p className="font-bold">No candidate found match search terms.</p>
                      <p className="text-xs">Try selecting 'All Specialties' or resetting your query.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Positions / Careers Manager */}
            {activeTab === 'industry-jobs' && (
              <div className="space-y-6">
                {selectedJobForForm ? (
                  <IndustryFormBuilder
                    jobId={selectedJobForForm.id}
                    jobInfo={{ title: selectedJobForForm.title }}
                    onBack={() => setSelectedJobForForm(null)}
                  />
                ) : selectedJobForApplicants ? (
                  <IndustryApplicantsDashboard
                    jobId={selectedJobForApplicants.id}
                    jobTitle={selectedJobForApplicants.title}
                    onBack={() => setSelectedJobForApplicants(null)}
                    onOpenFormBuilder={() => {
                      const currentJob = selectedJobForApplicants;
                      setSelectedJobForApplicants(null);
                      setSelectedJobForForm(currentJob);
                    }}
                  />
                ) : (
                  <>
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                          Positions Manager
                          <span className="text-xs font-semibold px-2.5 py-0.5 bg-bg-secondary border border-border text-text-secondary rounded-full">
                            {filteredJobs.length} {filteredJobs.length === 1 ? 'position' : 'positions'}
                          </span>
                        </h3>
                        <p className="text-xs text-text-muted mt-0.5">Publish, edit, and track applicant flow across active career tracks.</p>
                      </div>
                      <button
                        onClick={() => setShowJobForm(!showJobForm)}
                        className="px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all w-fit cursor-pointer shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        {showJobForm ? 'Close Form' : 'Post New Position'}
                      </button>
                    </div>

                    {/* Job Form Drawer */}
                    <AnimatePresence>
                      {showJobForm && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <form onSubmit={handlePostJob} className="p-6 bg-bg-secondary border border-border rounded-2xl space-y-5">
                            <h4 className="text-xs font-bold text-primary tracking-wider uppercase">Post New Opportunity Vacancy</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-[11px] font-semibold text-text-secondary mb-1">Position Title *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Senior Backend Engineer"
                                  value={jobTitle}
                                  onChange={(e) => setJobTitle(e.target.value)}
                                  className="p-2.5 bg-bg-primary border border-border rounded-xl text-xs outline-none focus:border-primary w-full"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-text-secondary mb-1">Location</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Dhaka, Bangladesh / Remote"
                                  value={jobLocation}
                                  onChange={(e) => setJobLocation(e.target.value)}
                                  className="p-2.5 bg-bg-primary border border-border rounded-xl text-xs outline-none focus:border-primary w-full"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-text-secondary mb-1">Employment Type</label>
                                <select
                                  value={jobType}
                                  onChange={(e) => setJobType(e.target.value)}
                                  className="p-2.5 bg-gradient-to-r from-[#090979] to-[#00D4FF] text-white font-bold border border-transparent rounded-xl text-xs outline-none focus:border-primary w-full cursor-pointer shadow-sm"
                                >
                                  <option value="full-time" className="bg-[#090979] text-white font-semibold">Full Time</option>
                                  <option value="part-time" className="bg-[#090979] text-white font-semibold">Part Time</option>
                                  <option value="internship" className="bg-[#090979] text-white font-semibold">Internship</option>
                                  <option value="contract" className="bg-[#090979] text-white font-semibold">Contract</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-text-secondary mb-1">Department / Track</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Software Engineering"
                                  value={jobIndustry}
                                  onChange={(e) => setJobIndustry(e.target.value)}
                                  className="p-2.5 bg-bg-primary border border-border rounded-xl text-xs outline-none focus:border-primary w-full"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-text-secondary mb-1">Application Link (Optional)</label>
                                <input
                                  type="text"
                                  placeholder="https://careers.mycompany.com"
                                  value={jobLink}
                                  onChange={(e) => setJobLink(e.target.value)}
                                  className="p-2.5 bg-bg-primary border border-border rounded-xl text-xs outline-none focus:border-primary w-full"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-text-secondary mb-1">Deadline Date</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 2026-08-30 or Immediate"
                                  value={jobDeadline}
                                  onChange={(e) => setJobDeadline(e.target.value)}
                                  className="p-2.5 bg-bg-primary border border-border rounded-xl text-xs outline-none focus:border-primary w-full"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[11px] font-semibold text-text-secondary mb-1">Job Summary *</label>
                                <textarea
                                  rows={3}
                                  placeholder="Overview of responsibilities and scope..."
                                  value={jobDesc}
                                  onChange={(e) => setJobDesc(e.target.value)}
                                  className="p-3 bg-bg-primary border border-border rounded-xl text-xs outline-none focus:border-primary w-full"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-text-secondary mb-1">Required Prerequisites (comma-separated)</label>
                                <textarea
                                  rows={3}
                                  placeholder="React, TypeScript, Node.js, PostgreSQL, Docker"
                                  value={jobReqs}
                                  onChange={(e) => setJobReqs(e.target.value)}
                                  className="p-3 bg-bg-primary border border-border rounded-xl text-xs outline-none focus:border-primary w-full"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setShowJobForm(false)}
                                className="px-4 py-2 bg-bg-primary border border-border text-text-secondary rounded-xl text-xs font-semibold hover:bg-bg-tertiary transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-5 py-2 bg-primary hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                              >
                                Publish Position
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Control Bar: Status Tabs, Search, Department & Sort */}
                    <div className="p-3.5 bg-bg-secondary rounded-2xl border border-border space-y-3">
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        {/* Status Filter Tabs */}
                        <div className="flex items-center gap-1 bg-bg-primary p-1 rounded-xl border border-border/80 overflow-x-auto custom-scrollbar">
                          {[
                            { id: 'all', label: 'All', count: statusCounts.all },
                            { id: 'open', label: 'Open', count: statusCounts.open },
                            { id: 'closing', label: 'Closing Soon', count: statusCounts.closing },
                            { id: 'closed', label: 'Closed', count: statusCounts.closed },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => setJobsStatusFilter(tab.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                                jobsStatusFilter === tab.id
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                              }`}
                            >
                              <span>{tab.label}</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                jobsStatusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-bg-secondary text-text-muted border border-border'
                              }`}>
                                {tab.count}
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Search & Dropdown Filters */}
                        <div className="flex flex-wrap items-center gap-2 flex-1 lg:max-w-xl justify-end">
                          <div className="relative flex-1 min-w-[180px]">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-text-muted" />
                            <input
                              type="text"
                              placeholder="Search positions..."
                              value={jobsSearchQuery}
                              onChange={(e) => setJobsSearchQuery(e.target.value)}
                              className="w-full pl-8 pr-7 py-2 bg-bg-primary border border-border rounded-xl text-xs text-text-primary outline-none focus:border-primary transition-all"
                            />
                            {jobsSearchQuery && (
                              <button
                                onClick={() => setJobsSearchQuery('')}
                                className="absolute right-2.5 top-2 text-text-muted hover:text-text-primary text-xs font-bold"
                              >
                                ×
                              </button>
                            )}
                          </div>

                          {uniqueDepartments.length > 0 && (
                            <select
                              value={jobsDeptFilter}
                              onChange={(e) => setJobsDeptFilter(e.target.value)}
                              className="py-2 px-3 bg-bg-primary border border-border rounded-xl text-xs text-text-primary outline-none focus:border-primary transition-all cursor-pointer"
                            >
                              <option value="all">All Departments</option>
                              {uniqueDepartments.map((dept: string) => (
                                <option key={dept} value={dept}>{dept}</option>
                              ))}
                            </select>
                          )}

                          <select
                            value={jobsSortBy}
                            onChange={(e) => setJobsSortBy(e.target.value)}
                            className="py-2 px-3 bg-bg-primary border border-border rounded-xl text-xs text-text-primary outline-none focus:border-primary transition-all cursor-pointer"
                          >
                            <option value="newest">Newest First</option>
                            <option value="deadline">Deadline (Soonest)</option>
                            <option value="applicants">Most Applicants</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Positions Cards Responsive Grid (3 columns on xl screen!) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {filteredJobs.map((job) => {
                        const statusInfo = getJobStatus(job);
                        const stats = getJobStats(job.id);
                        const skillTags = parseJobSkills(job.requirements);
                        const displayedSkills = skillTags.slice(0, 4);
                        const remainingSkillsCount = skillTags.length - displayedSkills.length;

                        return (
                          <div
                            key={job.id}
                            className={`bg-bg-secondary rounded-2xl border border-border p-5 flex flex-col justify-between hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative group border-l-4 ${
                              statusInfo.color === 'emerald' ? 'border-l-emerald-500' :
                              statusInfo.color === 'amber' ? 'border-l-amber-500' : 'border-l-slate-400'
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Header: Title & Status Pill */}
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-base font-bold text-text-primary tracking-tight leading-snug truncate group-hover:text-primary transition-colors">
                                    {job.title}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted font-medium">
                                    <span>{job.industry || 'Engineering'}</span>
                                    <span>•</span>
                                    <span className="capitalize">{job.jobType || 'Full-time'}</span>
                                  </div>
                                </div>

                                {/* Status Pill */}
                                <span className={`shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                                  statusInfo.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                  statusInfo.color === 'amber' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                  'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    statusInfo.color === 'emerald' ? 'bg-emerald-500' :
                                    statusInfo.color === 'amber' ? 'bg-amber-500' : 'bg-slate-400'
                                  }`} />
                                  {statusInfo.label}
                                </span>
                              </div>

                              {/* Clamped Description */}
                              <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                                {job.description || 'No description provided for this vacancy.'}
                              </p>

                              {/* Stat Row: Applicants, Shortlisted, Deadline */}
                              <div className="flex items-center flex-wrap gap-y-1 gap-x-3 text-xs text-text-secondary font-medium pt-1">
                                <div className="flex items-center gap-1 text-primary">
                                  <Users className="w-3.5 h-3.5" />
                                  <span className="font-semibold">{stats.total} {stats.total === 1 ? 'applicant' : 'applicants'}</span>
                                </div>
                                <span className="text-text-muted">•</span>
                                <div className="flex items-center gap-1 text-emerald-600">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{stats.shortlisted} shortlisted</span>
                                </div>
                                <span className="text-text-muted">•</span>
                                <div className="flex items-center gap-1 text-text-muted">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{statusInfo.daysLeft || job.deadline}</span>
                                </div>
                              </div>

                              {/* Prerequisites Clean Chips */}
                              {displayedSkills.length > 0 && (
                                <div className="pt-2 border-t border-border/60">
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {displayedSkills.map((skill, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-bg-primary text-text-secondary border border-border/80 rounded-md text-[11px] font-medium max-w-[140px] truncate"
                                        title={skill}
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                    {remainingSkillsCount > 0 && (
                                      <span className="px-2 py-0.5 bg-bg-tertiary text-text-muted border border-border rounded-md text-[10px] font-bold">
                                        +{remainingSkillsCount} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Card Action Buttons */}
                            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                {/* Primary Action: Applicants */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedJobForApplicants({ id: job.id, title: job.title })}
                                  className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  <span>Applicants</span>
                                  <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px] font-extrabold">
                                    {stats.total}
                                  </span>
                                </button>

                                {/* Secondary Action: Form Builder */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedJobForForm({ id: job.id, title: job.title })}
                                  className="py-2 px-3 bg-bg-primary hover:bg-bg-tertiary text-text-primary border border-border rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                  title="Configure application form questions"
                                >
                                  <FileText className="w-3.5 h-3.5 text-primary" />
                                  <span className="hidden sm:inline">Form</span>
                                </button>
                              </div>

                              {/* Delete Action */}
                              <button
                                type="button"
                                onClick={() => handleDeleteJob(job.id)}
                                className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                                title="Delete position"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Empty State */}
                      {filteredJobs.length === 0 && (
                        <div className="p-12 text-center col-span-full border border-dashed border-border rounded-3xl bg-bg-secondary space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                            <Briefcase className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-text-primary">No positions found</h4>
                            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                              {jobsSearchQuery || jobsStatusFilter !== 'all' || jobsDeptFilter !== 'all'
                                ? "No positions match your selected filter criteria. Try clearing your search query or status filter."
                                : "You haven't posted any positions yet. Post your first opportunity to start receiving candidate applications."}
                            </p>
                          </div>
                          {(jobsSearchQuery || jobsStatusFilter !== 'all' || jobsDeptFilter !== 'all') ? (
                            <button
                              onClick={() => {
                                setJobsSearchQuery('');
                                setJobsStatusFilter('all');
                                setJobsDeptFilter('all');
                              }}
                              className="px-4 py-2 bg-bg-primary border border-border text-text-primary rounded-xl text-xs font-semibold hover:bg-bg-tertiary transition-all cursor-pointer"
                            >
                              Reset Filters
                            </button>
                          ) : (
                            <button
                              onClick={() => setShowJobForm(true)}
                              className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all cursor-pointer"
                            >
                              Post Your First Job
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab 4: Partnership Settings */}
            {activeTab === 'industry-settings' && (
              <div className="max-w-xl bg-bg-secondary p-10 border border-border rounded-[2.5rem] space-y-8">
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-text-primary tracking-tight">Enterprise Identity Settings</h3>
                  <p className="text-text-muted-foreground text-sm leading-relaxed font-light">
                    Manage how your corporate entity is presented to university partners and graduate candidate searches.
                  </p>
                </div>

                <div className="space-y-6 border-t border-border/60 pt-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest font-mono">Company Name / Organization</label>
                    <input
                      type="text"
                      defaultValue={profile?.company || 'Enterprise Partner Ltd'}
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (user) {
                          await updateDoc(doc(db, 'users', user.uid), { company: val });
                        }
                      }}
                      className="p-3.5 bg-bg-primary border border-border rounded-xl text-xs text-text-primary outline-none focus:border-primary w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest font-mono">Recruitment Track / Title Focus</label>
                    <input
                      type="text"
                      defaultValue={profile?.title || 'Global Cloud & Ops Division'}
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (user) {
                          await updateDoc(doc(db, 'users', user.uid), { title: val });
                        }
                      }}
                      className="p-3.5 bg-bg-primary border border-border rounded-xl text-xs text-text-primary outline-none focus:border-primary w-full"
                    />
                  </div>

                  <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-500 text-xs font-bold uppercase tracking-wider font-mono">
                      <Star className="w-4 h-4 fill-current" />
                      Partner Tier: Platinum Academic Sponsor
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed font-light">
                      Your organization receives gold-star priority indexing in graduate matching, portfolio assessments, and directly sponsored curriculum tasks.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Academic Sessions (University Coordinator Connection Hub) */}
            {(activeTab === 'industry-academic-sessions' || activeTab === 'academic-sessions') && (
              <div className="bg-bg-secondary p-8 md:p-10 border border-border rounded-[2.5rem] space-y-8">
                {toastMessage && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-semibold animate-pulse">
                    ✓ {toastMessage}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-text-primary tracking-tight">Academic Connection Hub</h3>
                    <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 font-bold px-2 py-0.5 rounded-full uppercase">Academic Outreach</span>
                  </div>
                  <p className="text-text-muted-foreground text-sm leading-relaxed font-light">
                    University departments can request guest lectures, technical talks, or curriculum-focused sessions. Use this hub to approve requests with interactive meeting coordinates, or deliver student advisory feedback evaluations to shape university course curriculum.
                  </p>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black tracking-widest text-[#6B7C93] dark:text-text-secondary uppercase">Received Session Proposals ({sessionRequests.length})</h4>

                  {sessionRequests.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-border rounded-3xl text-text-muted text-xs">
                      No active academic session or talk proposals received from partnered universities.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sessionRequests.map((req) => {
                        const opinion = submittedOpinions.find(o => o.sessionId === req.id);
                        return (
                          <div key={req.id} className="p-6 border border-border bg-bg-primary/40 rounded-2xl space-y-4 hover:border-indigo-500/30 transition-all">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-bold text-sm text-text-primary flex items-center gap-2">
                                  <GraduationCap className="w-4 h-4 text-primary" />
                                  {req.universityName}
                                </h5>
                                <p className="text-[11px] text-text-secondary mt-1">Proposal Topic: <strong className="text-text-primary">{req.topic || "Career Mentorship Talk"}</strong> ({req.department})</p>
                                <p className="text-[10px] text-text-muted mt-0.5">Submitted: {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent'}</p>
                              </div>

                              <div>
                                {req.status === 'pending' ? (
                                  <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-[9px] uppercase tracking-wider rounded-full">Pending Response</span>
                                ) : req.status === 'accepted' ? (
                                  <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold text-[9px] uppercase tracking-wider rounded-full">Approved & Scheduled</span>
                                ) : (
                                  <span className="px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold text-[9px] uppercase tracking-wider rounded-full">Proposal Declined</span>
                                )}
                              </div>
                            </div>

                            {req.status === 'accepted' && (
                              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3 text-xs">
                                <div className="flex items-center justify-between">
                                  <p className="text-text-primary font-bold">Scheduled Details:</p>
                                  <span className="text-[10px] font-mono text-emerald-500 font-bold">Session Live</span>
                                </div>
                                <p className="text-text-secondary">📅 Time: <strong className="text-emerald-500">{req.meetingTime}</strong></p>
                                <p className="text-text-secondary">🔗 Link: <a href={req.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">{req.meetingLink}</a></p>
                                {req.feedback && <p className="text-text-muted italic">Coordinator Notes: "{req.feedback}"</p>}
                              </div>
                            )}

                            {req.status === 'rejected' && (
                              <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs space-y-1">
                                <p className="font-semibold text-rose-500">Decline Status Logged</p>
                                <p className="text-text-secondary">Reason provided: <span className="italic">"{req.feedback || 'No specific reason reported'}"</span></p>
                              </div>
                            )}

                            {req.status === 'pending' && schedulingSessionId !== req.id && rejectingSessionId !== req.id && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSchedulingSessionId(req.id);
                                    setRejectingSessionId(null);
                                    setMeetingTime("Wednesday, June 24 at 3:00 PM (GMT+6)");
                                    setMeetingLink("https://meet.google.com/xyz-abc-123");
                                  }}
                                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm hover:brightness-110 transition-all font-mono"
                                >
                                  Accept & Schedule
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingSessionId(req.id);
                                    setSchedulingSessionId(null);
                                    setRejectionReason("Our senior software engineers are currently fully scheduled with project releases this quarter. We apologize and suggest scheduling a dynamic session in the next semester academic cycle.");
                                  }}
                                  className="px-4 py-2 bg-bg-secondary hover:bg-rose-500/5 hover:text-rose-500 rounded-xl text-xs font-bold uppercase tracking-wider border border-border transition-all"
                                >
                                  Decline with Reason
                                </button>
                              </div>
                            )}

                            {/* Rejection Reason Form */}
                            {rejectingSessionId === req.id && (
                              <div className="p-5 border border-rose-500/20 bg-rose-500/5 rounded-xl space-y-4">
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">Provide Decline Reason / Sorry Message</p>
                                  <p className="text-[11px] text-text-muted">The university coordinator will receive this sorry reason immediately to understand adjustments.</p>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest leading-none">Decline Message</label>
                                  <textarea
                                    rows={3}
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full p-2.5 bg-bg-secondary border border-border rounded-lg text-xs outline-none focus:border-rose-500 text-text-primary resize-none"
                                    placeholder="Write a message explaining the conflict or sorry reason..."
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={async () => {
                                      if (!rejectionReason.trim()) {
                                        alert("Please enter a decline reason or sorry message.");
                                        return;
                                      }
                                      const sessRef = doc(db, 'industry_sessions', req.id);
                                      await updateDoc(sessRef, {
                                        status: 'rejected',
                                        feedback: rejectionReason
                                      });

                                      // Send inbox notification
                                      await addDoc(collection(db, 'notifications'), {
                                        userId: req.universityId,
                                        title: 'Session Proposal Unavailable',
                                        message: `"${profile?.company || 'Enterprise Partner'}" has declined your academic session proposal on "${req.topic || 'General Talk'}". Notification Note: "${rejectionReason}"`,
                                        read: false,
                                        createdAt: new Date().toISOString()
                                      });

                                      setRejectingSessionId(null);
                                      setRejectionReason('');
                                      triggerToast("Proposal declined and coordinator has been notified.");
                                    }}
                                    className="px-4 py-2 bg-rose-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-rose-600 transition-all"
                                  >
                                    Confirm Decline
                                  </button>
                                  <button onClick={() => setRejectingSessionId(null)} className="px-4 py-2 bg-transparent text-text-secondary hover:text-text-primary rounded-lg text-xs font-bold uppercase tracking-wider transition-all">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Scheduling Form */}
                            {schedulingSessionId === req.id && (
                              <div className="p-5 border border-primary/20 bg-primary/5 rounded-xl space-y-4">
                                <p className="text-xs font-bold text-text-primary uppercase tracking-wider">Confirm Session Schedule</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-full">
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest leading-none">Meeting Time / Date</label>
                                    <input type="text" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="w-full p-2.5 bg-bg-secondary border border-border rounded-lg text-xs outline-none focus:border-primary text-text-primary" placeholder="e.g. Wednesday, June 24 at 3:00 PM" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest leading-none">Live Meeting URL</label>
                                    <input type="text" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} className="w-full p-2.5 bg-bg-secondary border border-border rounded-lg text-xs outline-none focus:border-primary text-text-primary" placeholder="e.g. https://meet.google.com/abc-efg-hij" />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest leading-none">Optional Host message / Note</label>
                                  <input type="text" value={customFeedback} onChange={(e) => setCustomFeedback(e.target.value)} className="w-full p-2.5 bg-bg-secondary border border-border rounded-lg text-xs outline-none focus:border-primary text-text-primary" placeholder="Introduce yourself or leave feedback notes for the students..." />
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={async () => {
                                      if (!meetingTime || !meetingLink) {
                                        alert("Please supply meeting time and link coordinates.");
                                        return;
                                      }
                                      const sessRef = doc(db, 'industry_sessions', req.id);
                                      await updateDoc(sessRef, {
                                        status: 'accepted',
                                        meetingTime,
                                        meetingLink,
                                        feedback: customFeedback
                                      });

                                      // Add notification to university HOD
                                      await addDoc(collection(db, 'notifications'), {
                                        userId: req.universityId,
                                        title: 'Talk Request Approved!',
                                        message: `"${profile?.company}" approved your request for a session on ${meetingTime}! Check coordinates and invite your students.`,
                                        read: false,
                                        createdAt: new Date().toISOString()
                                      });

                                      setSchedulingSessionId(null);
                                      setCustomFeedback('');
                                      triggerToast("Session approved and details dispatched to academic partner.");

                                      sendCrossRoleEmailNotification({
                                        senderId: user?.uid,
                                        senderName: profile?.company || 'Industry Partner',
                                        senderRole: 'industry',
                                        senderEmail: user?.email || '',
                                        recipientId: req.universityId,
                                        recipientName: req.universityName || 'University Department',
                                        recipientRole: 'university',
                                        subject: `Talk Proposal Approved: ${req.topic || 'Academic Session'}`,
                                        category: 'collaboration',
                                        message: `Industry partner "${profile?.company || 'Enterprise'}" approved your academic session proposal on "${req.topic || 'Academic Talk'}". Scheduled time: ${meetingTime}. Meeting link: ${meetingLink}`,
                                        actionUrl: window.location.origin
                                      }).catch(e => console.warn('Email dispatch failed:', e));
                                    }}
                                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all font-sans"
                                  >
                                    Submit Schedule
                                  </button>
                                  <button onClick={() => setSchedulingSessionId(null)} className="px-4 py-2 bg-transparent text-text-secondary hover:text-text-primary rounded-lg text-xs font-bold uppercase tracking-wider transition-all">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Industry Opinion & Cohort Evaluation Section */}
                            {req.status === 'accepted' && (
                              <div className="pt-2 border-t border-border/55">
                                {opinion ? (
                                  <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-500">
                                      <Star className="w-4 h-4 fill-current text-indigo-500" />
                                      Submitted Industry Cohort Opinion
                                    </div>
                                    <div className="space-y-1.5 text-xs text-text-secondary font-light">
                                      <p>• <strong>Overall Cohort Quality Assessment:</strong> <span className="text-primary font-bold">{opinion.rating}</span></p>
                                      <p>• <strong>Technical Skills review:</strong> "{opinion.technicalReview}"</p>
                                      {opinion.suggestedCurriculumFocus && (
                                        <p>• <strong>Dynamic Curriculum Improvement suggestion:</strong> <span className="text-text-primary underline decoration-indigo-500">{opinion.suggestedCurriculumFocus}</span></p>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  opinionSessionId === req.id ? (
                                    <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 space-y-4">
                                      <p className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
                                        <Star className="w-4 h-4 fill-primary text-primary" />
                                        Provide Official Student Cohort Evaluation & Opinion
                                      </p>
                                      <p className="text-[11px] text-text-muted">
                                        Your expert checklist serves as verified telemetry to shape course curriculums and target student mentoring.
                                      </p>

                                      <div className="space-y-3">
                                        {/* Rating selector */}
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest font-mono">Cohort Readiness Rating</label>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {['Outstanding', 'Strong Skills', 'Moderate', 'Needs Coaching'].map((rate) => (
                                              <button
                                                key={rate}
                                                type="button"
                                                onClick={() => setOpinionRating(rate)}
                                                className={`p-2 rounded-xl text-[10px] font-bold border transition-all truncate ${
                                                  opinionRating === rate
                                                    ? 'bg-indigo-500/15 border-indigo-500 text-indigo-500 shadow-sm'
                                                    : 'bg-bg-primary border-border hover:border-text-secondary text-text-secondary'
                                                }`}
                                              >
                                                {rate}
                                              </button>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Technical opinion review */}
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest font-mono">Technical Strengths & Weaknesses Opinion</label>
                                          <textarea
                                            rows={2}
                                            value={opinionTechnicalReview}
                                            onChange={(e) => setOpinionTechnicalReview(e.target.value)}
                                            className="w-full p-2.5 bg-bg-secondary border border-border rounded-lg text-xs outline-none focus:border-indigo-500 text-text-primary resize-none font-light"
                                            placeholder="Comment on technical knowledge, problem-solving abilities or interaction..."
                                          />
                                        </div>

                                        {/* Suggested curriculumFocus */}
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest font-mono">Suggested Curriculum Focus (Courses/Frameworks to Add)</label>
                                          <input
                                            type="text"
                                            value={opinionCurriculumAdvice}
                                            onChange={(e) => setOpinionCurriculumAdvice(e.target.value)}
                                            className="w-full p-2.5 bg-bg-secondary border border-border rounded-lg text-xs outline-none focus:border-indigo-500 text-text-primary"
                                            placeholder="e.g. Include CI/CD Docker pipelines, testing suites (Vitest), AWS orchestration"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex gap-2">
                                        <button
                                          onClick={async () => {
                                            if (!opinionTechnicalReview.trim()) {
                                              alert("Please specify technical review comments first.");
                                              return;
                                            }

                                            // Write to Firestore db
                                            await addDoc(collection(db, 'industry_opinions'), {
                                              sessionId: req.id,
                                              sessionTopic: req.topic || "Enterprise Talk",
                                              industryId: user.uid,
                                              industryName: profile?.company || "Corporate Partner",
                                              universityId: req.universityId,
                                              universityName: req.universityName,
                                              rating: opinionRating,
                                              technicalReview: opinionTechnicalReview,
                                              suggestedCurriculumFocus: opinionCurriculumAdvice,
                                              createdAt: new Date().toISOString()
                                            });

                                            // Send notification
                                            await addDoc(collection(db, 'notifications'), {
                                              userId: req.universityId,
                                              title: 'Cohort Opinion Published!',
                                              message: `Official feedback evaluation opinion and curriculum recommendations have been published by "${profile?.company || 'Industry Partner'}" for your student cohort. View reports now!`,
                                              read: false,
                                              createdAt: new Date().toISOString()
                                            });

                                            setOpinionSessionId(null);
                                            setOpinionTechnicalReview('');
                                            setOpinionCurriculumAdvice('');
                                            triggerToast("Industry opinion submitted successfully!");
                                          }}
                                          className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-600 transition-all font-sans"
                                        >
                                          Submit Feedback
                                        </button>
                                        <button
                                          onClick={() => setOpinionSessionId(null)}
                                          className="px-4 py-2 bg-transparent text-text-secondary hover:text-text-primary rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setOpinionSessionId(req.id);
                                        setOpinionRating('Strong Skills');
                                        setOpinionTechnicalReview('Students showcased clear backend comprehension. We suggest introducing automated REST routing and Unit Testing tools to perfect project pipelines.');
                                        setOpinionCurriculumAdvice('Comprehensive DevOps testing pipelines with CI/CD and deployment virtualization via Docker.');
                                      }}
                                      className="px-4 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/20 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all font-mono"
                                    >
                                      ★ Provide Student Cohort Opinion
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      {/* Talent Spotlight Detail Drawer / Modal */}
      <AnimatePresence>
        {selectedTalent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bg-primary border border-border rounded-[3rem] w-full max-w-2xl p-10 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Card Ribbon Accent */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-accent to-secondary" />

              <div className="flex justify-between items-start gap-4 pb-6 border-b border-border">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary-light text-primary rounded-2xl flex items-center justify-center font-bold text-2xl shadow-inner">
                    {selectedTalent.displayName?.[0] || 'C'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-text-primary tracking-tight">{selectedTalent.displayName || 'Pre-Vetted Candidate'}</h3>
                    <p className="text-xs text-text-muted font-mono mt-1">{selectedTalent.email}</p>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1 inline-block px-2.5 py-0.5 bg-primary-light border border-primary/20 rounded-full">
                      Graduate Track
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTalent(null)}
                  className="p-2 text-text-muted hover:text-text-primary bg-bg-secondary border border-border hover:border-primary/20 rounded-xl transition-all cursor-pointer font-bold select-none text-xs flex items-center justify-center w-8 h-8"
                >
                  ✕
                </button>
              </div>

              <div className="py-8 space-y-6">
                {/* Score section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-bg-secondary border border-border rounded-2xl text-center">
                    <span className="text-4xl font-extrabold text-primary block font-mono">
                      {selectedTalent.profileAnalyzed ? `${selectedTalent.readinessScore || 0}%` : 'Pending'}
                    </span>
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-1 block">Verification Readiness</span>
                  </div>
                  <div className="p-4 bg-bg-secondary border border-border rounded-2xl text-center">
                    <span className="text-4xl font-extrabold text-emerald-500 block font-mono">
                      {selectedTalent.skills?.length || 0}
                    </span>
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-1 block">Verified Skill Matrix</span>
                  </div>
                </div>

                {/* Candidate Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-text-muted uppercase tracking-widest font-mono">Professional Dossier</h4>
                  <p className="text-xs text-text-secondary leading-relaxed bg-bg-secondary p-4 rounded-xl border border-border">
                    {selectedTalent.bio || 'This graduate is currently undergoing pre-verification testing and portfolio review at CareerBridge partner institutions.'}
                  </p>
                </div>

                {/* Core Competencies Audit */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-text-muted uppercase tracking-widest font-mono">Core Competency Benchmarks</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedTalent.skills || []).map((skill: any, index: number) => {
                      const sName = typeof skill === 'string' ? skill : skill.name || skill.title;
                      const score = getDeterministicSkillScore(skill, index);
                      return (
                        <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border border-border rounded-xl">
                          <span className="text-[11px] font-bold text-text-primary">{sName}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                            score >= 80 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'
                          }`}>
                            {score}%
                          </span>
                        </div>
                      );
                    })}
                    {(selectedTalent.skills || []).length === 0 && (
                      <span className="text-xs text-text-muted italic">Skill audits currently in progress.</span>
                    )}
                  </div>
                </div>

                {/* Match criteria / Offer invitation */}
                <div className="pt-6 border-t border-border flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setProfileModalData({
                        ...selectedTalent,
                        name: selectedTalent.displayName,
                        skills: selectedTalent.skills || [
                          { name: 'React Development', score: 85 },
                          { name: 'Tailwind CSS', score: 90 },
                          { name: 'REST APIs', score: 55 },
                          { name: 'PostgreSQL Indexes', score: 35 },
                          { name: 'System Security', score: 45 }
                        ]
                      });
                      setProfileModalOpen(true);
                    }}
                    className="flex-1 py-3 bg-bg-secondary hover:bg-bg-tertiary border border-border text-text-secondary rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-primary" />
                    Full Public Profile
                  </button>
                  <button
                    onClick={() => {
                      alert(`Direct recruiting invitation has been sent to ${selectedTalent.displayName}. They will receive a notification in their chat workspace.`);
                      setSelectedTalent(null);
                    }}
                    className="flex-[2] py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md hover:brightness-110 active:scale-98 transition-all"
                  >
                    <Briefcase className="w-4 h-4" />
                    Request Interview / Contact
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PUBLIC DEEP ANALYSIS PROFILES MODAL (LIKE FACEBOOK PLATFORM FOR GENERAL ROLES) */}
      <PublicProfileModal
        isOpen={profileModalOpen}
        onClose={() => {
          setProfileModalOpen(false);
          setProfileModalData(null);
        }}
        profileType="student"
        profileData={profileModalData}
      />
    </div>
  );
}
