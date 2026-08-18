import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Briefcase, Calendar, ExternalLink, ShieldCheck, Mail, Building, Tag, ClipboardList } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

export function JobDetailsModal({ isOpen, onClose, job }: JobDetailsModalProps) {
  if (!isOpen || !job) return null;

  // Resolve application link URL correctly
  const resolvedApplyUrl = (() => {
    const link = job.applicationLink || '';
    if (!link) return '';
    if (link.startsWith('http://') || link.startsWith('https://')) {
      return link;
    }
    if (link.includes('@') && !link.includes('/')) {
      return `mailto:${link}`;
    }
    return `https://${link}`;
  })();

  const isEmail = job.applicationLink?.includes('@') && !job.applicationLink?.includes('/');

  // Format posted date
  const formattedDate = (() => {
    if (!job.postedAt) return 'Recent';
    if (job.postedAt instanceof Timestamp) {
      return job.postedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (job.postedAt.seconds) {
      return new Date(job.postedAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return new Date(job.postedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  })();

  return (
    <AnimatePresence>
      <div id="job-details-overlay" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop overlay with glassmorphism */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="w-full max-w-2xl h-[85vh] md:h-auto md:max-h-[85vh] bg-card border border-border rounded-2xl flex flex-col shadow-2xl overflow-hidden z-10 text-left"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border bg-bg-secondary flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3 max-w-[85%]">
              <div className="p-2.5 rounded-xl border bg-primary-light text-primary border-primary/20 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 truncate">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#534AB7] bg-primary-light/50 px-2 py-0.5 rounded border border-primary/10">
                    Opportunity Details
                  </span>
                  {job.industry && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted bg-bg-primary px-2 py-0.5 rounded border border-border truncate max-w-[150px]">
                      {job.industry}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-text-primary tracking-tight truncate mt-1">
                  {job.title}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-border text-text-muted hover:text-text-primary rounded-lg transition-all cursor-pointer"
              title="Close Dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-bg-primary custom-scrollbar">
            {/* Quick Metadata badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-card border border-border rounded-xl flex items-center gap-3">
                <Building className="w-4 h-4 text-primary shrink-0" />
                <div className="truncate">
                  <span className="text-[9px] text-text-muted block uppercase font-mono tracking-wider font-semibold">Company</span>
                  <span className="text-xs font-bold text-text-primary block truncate">{job.company || 'N/A'}</span>
                </div>
              </div>

              <div className="p-3 bg-card border border-border rounded-xl flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div className="truncate">
                  <span className="text-[9px] text-text-muted block uppercase font-mono tracking-wider font-semibold">Location</span>
                  <span className="text-xs font-bold text-text-primary block truncate">{job.location || 'Remote'}</span>
                </div>
              </div>

              <div className="p-3 bg-card border border-border rounded-xl flex items-center gap-3 col-span-2 sm:col-span-1">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <div className="truncate">
                  <span className="text-[9px] text-text-muted block uppercase font-mono tracking-wider font-semibold">Posted Date</span>
                  <span className="text-xs font-bold text-text-primary block truncate">{formattedDate}</span>
                </div>
              </div>
            </div>

            {/* Employment Type Tag */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Employment Mode:</span>
              <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider rounded-full">
                {job.jobType || 'Full-time'}
              </span>
            </div>

            {/* Full Job Description Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 border-b border-border pb-1.5">
                <ClipboardList className="w-4 h-4 text-primary" /> Complete Job Circular & Description
              </h4>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                <p className="text-text-secondary text-[13px] leading-relaxed pl-5 whitespace-pre-wrap font-normal selection:bg-primary/20">
                  {job.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {/* Requirements Section */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 border-b border-border pb-1.5">
                <Tag className="w-4 h-4 text-primary" /> Key Requirements & Technology Stack
              </h4>
              <div className="flex flex-wrap gap-2 pl-1">
                {job.requirements ? (
                  job.requirements.includes(',') ? (
                    job.requirements.split(',').map((req: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-bg-secondary border border-border rounded-xl text-xs font-semibold text-text-secondary shadow-xs hover:border-primary/20 transition-colors"
                      >
                        {req.trim()}
                      </span>
                    ))
                  ) : (
                    <p className="text-text-secondary text-[13px] leading-relaxed pl-1 whitespace-pre-wrap">
                      {job.requirements}
                    </p>
                  )
                ) : (
                  <span className="text-text-muted text-xs italic pl-1">No specific technology stack or requirements listed.</span>
                )}
              </div>
            </div>
          </div>

          {/* Footer containing Apply triggers */}
          <div className="px-6 py-4 border-t border-border bg-bg-secondary flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 text-left">
            <div className="space-y-1 w-full sm:w-auto">
              <span className="text-[9px] uppercase tracking-wider text-text-muted block font-extrabold">
                Application Route
              </span>
              <span className="text-xs font-mono text-text-secondary break-all block max-w-xs sm:max-w-md bg-white border border-border/80 px-2 py-1 rounded">
                {job.applicationLink || 'Direct Application Portal'}
              </span>
            </div>

            {job.applicationLink && (
              <a
                href={resolvedApplyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white font-semibold px-8 py-3.5 text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2.5 group border border-transparent cursor-pointer shrink-0"
              >
                {isEmail ? (
                  <>
                    Email Application
                    <Mail className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  </>
                ) : (
                  <>
                    Apply Externally
                    <ExternalLink className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
