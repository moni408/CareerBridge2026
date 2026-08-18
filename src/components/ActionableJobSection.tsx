import React, { useState } from 'react';
import { calculateJobSkillMatch } from '../lib/jobMatch';
import { Briefcase, CheckCircle2, AlertCircle, ArrowUpRight, Sparkles, Building2, MapPin, ChevronRight, Plus, Rocket } from 'lucide-react';
import { motion } from 'motion/react';

interface ActionableJobSectionProps {
  jobsList: any[];
  userSkills: string[];
  userMajor?: string;
  targetRole?: string;
  onOpenAddSkillModal: (suggestedSkill?: string) => void;
  setView: (view: any) => void;
}

export const ActionableJobSection: React.FC<ActionableJobSectionProps> = ({
  jobsList = [],
  userSkills = [],
  userMajor = '',
  targetRole = '',
  onOpenAddSkillModal,
  setView
}) => {
  const [activeTab, setActiveTab] = useState<'safe' | 'reach'>('safe');

  // Compute matches for all jobs
  const evaluatedJobs = jobsList.map(job => {
    const score = calculateJobSkillMatch(job, userSkills, userMajor);
    
    // Extract job requirements
    const jobReqs = Array.isArray(job.requirements) 
      ? job.requirements 
      : (typeof job.requirements === 'string' ? job.requirements.split(/[,;\n]/) : []);
      
    const jobSkills = Array.isArray(job.skills)
      ? job.skills
      : (typeof job.skills === 'string' ? job.skills.split(/[,;\n]/) : []);

    const combinedReqs = Array.from(new Set([...jobReqs, ...jobSkills].map((s: any) => String(s).trim()).filter(Boolean)));

    // Find missing skills
    const missing = combinedReqs.filter(req => {
      const reqLower = req.toLowerCase();
      return !userSkills.some(u => u.toLowerCase().includes(reqLower) || reqLower.includes(u.toLowerCase()));
    });

    return {
      ...job,
      matchScore: score,
      missingSkills: missing,
      isSafe: score >= 70
    };
  });

  const safeJobs = evaluatedJobs.filter(j => j.isSafe).sort((a, b) => b.matchScore - a.matchScore);
  const reachJobs = evaluatedJobs.filter(j => !j.isSafe).sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Briefcase className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Actionable Job Alignment Matrix
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Categorized directly by your skills & gap score for <strong className="text-slate-900 dark:text-white">{targetRole || 'your career path'}</strong>
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('safe')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'safe'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Qualified Roles ({safeJobs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reach')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reach'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Target / Growth Roles ({reachJobs.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'safe' ? (
        safeJobs.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No jobs currently match &ge;70% of your listed skills. Add missing skills or upload your updated CV to unlock qualified roles!
            </p>
            <button
              onClick={() => onOpenAddSkillModal()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Skill / Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeJobs.slice(0, 4).map((job) => (
              <div 
                key={job.id} 
                className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {job.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{job.company || 'Partner Enterprise'}</span>
                        {job.location && (
                          <>
                            <span>·</span>
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{job.location}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-extrabold shrink-0 border border-emerald-500/30">
                      {job.matchScore}% Match
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {job.description || 'Verified job matching your competency radar profile.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Skills Qualified</span>
                  </span>

                  <button
                    onClick={() => setView('jobs')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Apply Now</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Reach / Growth Roles */
        reachJobs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            All listed jobs match your current skill benchmark profile!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reachJobs.slice(0, 4).map((job) => {
              const topMissing = job.missingSkills.slice(0, 2);
              return (
                <div 
                  key={job.id} 
                  className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {job.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.company || 'Target Industry Partner'}</span>
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 font-mono text-xs font-extrabold shrink-0 border border-amber-500/30">
                        {job.matchScore}% Match
                      </span>
                    </div>

                    {/* Missing Skill Chips */}
                    {topMissing.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                          Missing Skills to Unlock:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {topMissing.map((sk: string, i: number) => (
                            <span 
                              key={i} 
                              className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] font-medium"
                            >
                              + {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Add project to bridge score
                    </span>

                    <button
                      onClick={() => onOpenAddSkillModal(topMissing[0] || 'Required Domain Skill')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Rocket className="w-3 h-3" />
                      <span>Bridge Gap</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
