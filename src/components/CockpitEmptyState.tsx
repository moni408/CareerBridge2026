import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, FileUp, FileText, Target, ShieldAlert, ArrowRight, BookOpen, Compass, CheckCircle2 } from 'lucide-react';

interface CockpitEmptyStateProps {
  displayName?: string;
  targetRole?: string;
  department?: string;
  university?: string;
  setView: (view: any) => void;
  onOpenRoleModal?: () => void;
}

export const CockpitEmptyState: React.FC<CockpitEmptyStateProps> = ({
  displayName = 'Student',
  targetRole = 'Software Engineer',
  department = 'Computer Science & Engineering',
  university = 'University of Frontier Technology',
  setView,
  onOpenRoleModal
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 px-4">
      {/* Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-500/20"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Personalized Competency Cockpit</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-display">
            Welcome to your Career Cockpit, {displayName}!
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Your competency radar and skill gap analytics are currently <strong className="text-indigo-200 font-semibold">uninitialized</strong> because no CV or skill profile has been submitted yet.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              <span>Target Role: <strong className="text-white">{targetRole || 'Not set'}</strong></span>
              {onOpenRoleModal && (
                <button 
                  onClick={onOpenRoleModal}
                  className="text-xs text-indigo-300 hover:text-white underline ml-1 cursor-pointer"
                >
                  Change
                </button>
              )}
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Department: <strong className="text-white">{department || 'General Studies'}</strong></span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Cards: Step 1, Step 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Upload CV */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileUp className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Upload Existing CV / Resume
              </h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Upload your PDF or DOCX resume. Our Gemini AI engine will automatically parse your skills, academic background, and projects to initialize your radar chart.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Automated skill extraction & benchmark grading</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Detects missing critical skills vs target career path</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => setView('cv-upload')}
            className="mt-6 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <span>Upload CV File</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Card 2: Generate CV */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Build & Generate AI CV
              </h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Don't have a structured resume yet? Use our interactive CV builder to generate an industry-ready ATS resume aligned with your targeted career path.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Supports both Tech (CS/Dev) & Non-Tech (Arts, Policy, Business)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Creates instant shareable & downloadable resume PDF</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => setView('cv-generator')}
            className="mt-6 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <span>Generate CV Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* Guidance Note */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
          <Compass className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            How system guidance works when your skills don't match your target path:
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Whether you are a Computer Science student or a Political Science / Arts student, once your CV is submitted, the system automatically compares your current skills with industry requirements for <strong className="text-slate-900 dark:text-white">{targetRole}</strong>. If a gap is detected, the Competency Cockpit recommends specific <strong className="text-indigo-600 dark:text-indigo-400">Bridge Projects</strong>, matches you with domain mentors, and isolates "Reach Jobs" to guide your upskilling step-by-step.
          </p>
        </div>
      </div>
    </div>
  );
};
