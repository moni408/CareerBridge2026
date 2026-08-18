import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, Timestamp, onSnapshot } from 'firebase/firestore';
import { 
  Briefcase, MapPin, Calendar, ExternalLink, Sparkles, AlertCircle, Eye, 
  Building2, Code2, Layers, Cpu, Globe, Terminal 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { JobDetailsModal } from './JobDetailsModal';
import { calculateJobSkillMatch } from '../lib/jobMatch';
import { getRoleConfig } from '../lib/careerTaxonomy';

const COLOR_PALETTES = [
  {
    iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    tagBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
    barBg: 'bg-indigo-600 dark:bg-indigo-500',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    borderHover: 'hover:border-indigo-500/40 hover:shadow-indigo-500/5',
    icon: Code2,
  },
  {
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    tagBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    barBg: 'bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderHover: 'hover:border-emerald-500/40 hover:shadow-emerald-500/5',
    icon: Layers,
  },
  {
    iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    tagBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    barBg: 'bg-amber-500',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderHover: 'hover:border-amber-500/40 hover:shadow-amber-500/5',
    icon: Cpu,
  },
  {
    iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    tagBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    barBg: 'bg-rose-500',
    textColor: 'text-rose-600 dark:text-rose-400',
    borderHover: 'hover:border-rose-500/40 hover:shadow-rose-500/5',
    icon: Sparkles,
  },
  {
    iconBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    tagBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
    barBg: 'bg-sky-500',
    textColor: 'text-sky-600 dark:text-sky-400',
    borderHover: 'hover:border-sky-500/40 hover:shadow-sky-500/5',
    icon: Globe,
  },
  {
    iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    tagBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    barBg: 'bg-purple-500',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderHover: 'hover:border-purple-500/40 hover:shadow-purple-500/5',
    icon: Terminal,
  },
];

export function JobBoard({ searchQuery }: { searchQuery: string }) {
  const { profile, setView } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  useEffect(() => {
    const jobsQuery = collection(db, 'jobs');
    const unsub = onSnapshot(jobsQuery, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => {
        const tA = a.postedAt?.seconds || (a.postedAt ? new Date(a.postedAt).getTime() / 1000 : 0);
        const tB = b.postedAt?.seconds || (b.postedAt ? new Date(b.postedAt).getTime() / 1000 : 0);
        return tB - tA;
      });
      setJobs(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading jobs in real-time:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const rawUserSkills = [
    ...(Array.isArray(profile?.skills) ? profile.skills : []),
    ...(Array.isArray(profile?.parsedSkills) ? profile.parsedSkills : []),
    ...(Array.isArray(profile?.skillsList) ? profile.skillsList : []),
  ];

  const userSkills = Array.from(
    new Set(
      rawUserSkills
        .map((s: any) => (typeof s === 'string' ? s : s?.name || s?.title || '').trim().toLowerCase())
        .filter(Boolean)
    )
  );

  const targetRole = profile?.targetRole || profile?.careerPath || profile?.preferredRole || '';
  const userMajor = profile?.department || profile?.fieldOfStudy || profile?.major || '';
  const roleConfig = getRoleConfig(targetRole, userMajor);

  // Helper to verify if a job is strictly related to the user's career role or field of study
  const isJobRelated = (job: any) => {
    if (!job) return false;

    const jobTitle = (job.title || '').toLowerCase();
    const jobCompany = (job.company || '').toLowerCase();
    const jobDesc = (job.description || '').toLowerCase();
    const jobCat = (job.category || job.jobType || '').toLowerCase();
    const jobSkillsList = [
      ...(Array.isArray(job.skills) ? job.skills : []),
      ...(Array.isArray(job.requirements) ? job.requirements : []),
      ...(Array.isArray(job.requiredSkills) ? job.requiredSkills : []),
    ].map((s: any) => String(s).toLowerCase());

    const fullJobText = `${jobTitle} ${jobCompany} ${jobDesc} ${jobCat} ${jobSkillsList.join(' ')}`;

    const roleLower = (roleConfig.title || targetRole).toLowerCase().trim();
    const majorLower = userMajor.toLowerCase().trim();

    // Direct match
    if (roleLower && fullJobText.includes(roleLower)) return true;
    if (majorLower && fullJobText.includes(majorLower)) return true;

    // Token match from role or major
    const stopWords = new Set(['and', '&', 'or', 'the', 'a', 'an', 'in', 'at', 'for', 'to', 'of', '/', '-', 'junior', 'senior', 'lead', 'associate', 'intern', 'role', 'specialist']);
    
    const roleTokens = (roleConfig.title + ' ' + roleConfig.fieldCategory + ' ' + targetRole)
      .toLowerCase()
      .split(/[\s\/,]+/)
      .filter(t => t.length >= 3 && !stopWords.has(t));

    const majorTokens = userMajor
      .toLowerCase()
      .split(/[\s\/,]+/)
      .filter(t => t.length >= 3 && !stopWords.has(t));

    const hasRoleToken = roleTokens.some(tok => fullJobText.includes(tok));
    const hasMajorToken = majorTokens.some(tok => fullJobText.includes(tok));

    if (hasRoleToken || hasMajorToken) return true;

    // Required skills match from career taxonomy
    if (roleConfig.requiredSkills && roleConfig.requiredSkills.length > 0) {
      const hasSkillOverlap = roleConfig.requiredSkills.some(skill => 
        fullJobText.includes(skill.name.toLowerCase())
      );
      if (hasSkillOverlap) return true;
    }

    // Tech vs Non-tech alignment
    const isTechJob = /software|developer|engineer|tech|code|frontend|backend|data|python|react|java|sql|cloud|devops|security|cyber|ai|machine learning|web/i.test(fullJobText);
    if (roleConfig.field === 'tech' && isTechJob) return true;
    if (roleConfig.field === 'non-tech' && !isTechJob) return true;

    // Fallback match score
    const matchScore = calculateJobSkillMatch(job, userSkills, userMajor);
    return matchScore >= 60;
  };

  const filteredJobs = jobs.filter(job => {
    // Search query match
    const titleVal = (job.title || '').toLowerCase();
    const companyVal = (job.company || '').toLowerCase();
    const descVal = (job.description || '').toLowerCase();
    const searchVal = (searchQuery || '').toLowerCase();

    const matchesSearch = titleVal.includes(searchVal) || 
                         companyVal.includes(searchVal) ||
                         descVal.includes(searchVal);
    
    // Type filter match
    const matchesType = selectedType === 'all' || 
                        (job.jobType || '').toLowerCase() === selectedType.toLowerCase();

    // Related to user's career role or field of study
    const matchesCareerOrStudy = isJobRelated(job);

    return matchesSearch && matchesType && matchesCareerOrStudy;
  });

  // Dynamic Skill Match logic accurately synced with user profile skills
  const calculateSkillMatch = (job: any) => {
    return calculateJobSkillMatch(job, userSkills, userMajor);
  };

  const formatDeadline = (job: any) => {
    if (job.deadline) {
      if (job.deadline instanceof Timestamp) {
        return job.deadline.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return new Date(job.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (job.applicationDeadline) {
      return new Date(job.applicationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (job.postedAt) {
      const postDate = job.postedAt instanceof Timestamp ? job.postedAt.toDate() : new Date(job.postedAt);
      const deadlineDate = new Date(postDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      return deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return 'Open until filled';
  };

  return (
    <div className="w-full space-y-8">
      {/* Top Banner Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-primary-light rounded-full border border-primary/10">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Target Career Role: {roleConfig.title}
            </p>
          </div>
          {profile?.verified && (
            <div className="px-3 py-1.5 bg-success-light text-success text-[10px] font-bold tracking-widest rounded-full border border-success/20">
              VERIFIED CANDIDATE
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">Job Circulars</h1>
            <p className="text-text-secondary text-sm max-w-xl font-normal">
              Positions curated for your targeted role (<strong className="text-primary">{roleConfig.title}</strong>) and field of study (<strong className="text-text-primary">{userMajor || 'your track'}</strong>).
            </p>
          </div>
          
          <div className="flex flex-wrap bg-bg-secondary p-1 rounded-xl border border-border shadow-xs">
            {['all', 'full-time', 'part-time', 'internship', 'contract'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider cursor-pointer ${
                  selectedType === type 
                    ? 'bg-gradient-to-r from-[#090979] to-[#00D4FF] text-white shadow-sm' 
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Grid of 3 Cards per row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        <AnimatePresence mode="popLayout">
          {filteredJobs.map((job, idx) => {
            const palette = COLOR_PALETTES[idx % COLOR_PALETTES.length];
            const IconComponent = palette.icon;
            const skillMatchPct = calculateSkillMatch(job);
            const deadlineText = formatDeadline(job);

            return (
              <motion.div
                key={job.id ? `${job.id}-${idx}` : `job-${idx}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className={`bg-bg-secondary border border-border/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 ${palette.borderHover} shadow-xs hover:shadow-md relative group`}
              >
                <div className="space-y-4">
                  {/* Top Bar: Icon Badge on left + Category / Type Pill on right */}
                  <div className="flex items-center justify-between gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${palette.iconBg}`}>
                      <IconComponent className="w-4.5 h-4.5" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${palette.tagBg}`}>
                      {job.jobType || job.category || 'Full-time'}
                    </span>
                  </div>

                  {/* Main Details: Job Position, Company, Location & Deadline */}
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {job.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-text-secondary text-xs font-semibold">
                      <Building2 className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span className="truncate">{job.company || 'Partner Company'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-text-muted text-[11px] font-medium pt-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate max-w-[130px]">{job.location || 'Remote'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Deadline: {deadlineText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Required Skill Match Slide / Progress Bar */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                      <span className="text-text-muted uppercase tracking-wider text-[10px]">Skill Match</span>
                      <span className={`font-black tracking-tight ${palette.textColor}`}>{skillMatchPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${skillMatchPct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 + idx * 0.03 }}
                        className={`h-full rounded-full ${palette.barBg}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons: View Details & Apply Now */}
                <div className="mt-5 pt-4 border-t border-border/80 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedJob(job)}
                    className="px-3 py-2 border border-border hover:border-primary/40 text-text-secondary hover:text-primary rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 bg-bg-primary cursor-pointer hover:shadow-xs active:scale-[0.98]"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    View details
                  </button>

                  <button 
  type="button"
  onClick={() => setView(`student-apply:${job.id}`)}
  className={`${palette.barBg} hover:opacity-95 text-white font-semibold px-3 py-2 text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]`}
>
  Apply Now
  <ExternalLink className="w-3 h-3" />
</button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!loading && filteredJobs.length === 0 && (
          <div className="col-span-full py-20 px-6 text-center space-y-6 bg-bg-secondary/60 border border-dashed border-border rounded-3xl">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Briefcase className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl sm:text-2xl font-black text-text-primary">No job circular available for you</h3>
              <p className="text-xs text-text-muted leading-relaxed font-medium">
                There are currently no job circulars matching your target career role (<strong className="text-text-primary">{roleConfig.title || targetRole || 'your target role'}</strong>) or field of study (<strong className="text-text-primary">{userMajor || 'your track'}</strong>). Check back soon as new circulars are updated regularly!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal for full details if clicked */}
      <JobDetailsModal 
        isOpen={selectedJob !== null} 
        onClose={() => setSelectedJob(null)} 
        job={selectedJob} 
      />
    </div>
  );
}

