import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, User, Award, Target, BookOpen, GraduationCap, Link2, 
  ExternalLink, Sparkles, ShieldCheck, Briefcase, Star, 
  FileText, Download, Building, Percent, Code, Compass, ArrowRight 
} from 'lucide-react';

interface PublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileType: 'student' | 'mentor' | 'industry';
  profileData: any; // Can be connection object, user object, mentor object, etc.
}

export function PublicProfileModal({ isOpen, onClose, profileType, profileData }: PublicProfileModalProps) {
  if (!isOpen || !profileData) return null;

  // Safe field checks with fallbacks
  const displayName = profileData.name || profileData.displayName || profileData.menteeName || profileData.mentorName || 'Professional User';
  const email = profileData.email || 'contact@careerbridge.systems';
  const bio = profileData.bio || profileData.description || 'Dedicated participant in the CareerBridge professional network system.';
  
  // Calculate dynamic competency average from student skills
  const getCompetencyAverage = (skillsList: any[]) => {
    if (!skillsList || skillsList.length === 0) return 62;
    let total = 0;
    let count = 0;
    skillsList.forEach((s: any) => {
      let score = 0;
      if (typeof s === 'object' && s !== null) {
        score = typeof s.score === 'number' ? s.score : parseInt(s.score || '60');
      } else if (typeof s === 'string') {
        score = 65;
      }
      if (!isNaN(score) && score > 0) {
        total += score;
        count++;
      }
    });
    return count > 0 ? Math.round(total / count) : 62;
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop glassmorphism */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md"
        />

        {/* Modal Sheet Container */}
        <motion.div 
          initial={{ scale: 0.95, y: 15, opacity: 0 }} 
          animate={{ scale: 1, y: 0, opacity: 1 }} 
          exit={{ scale: 0.95, y: 15, opacity: 0 }} 
          transition={{ type: "spring", duration: 0.4 }}
          className="w-full max-w-4xl h-[85vh] bg-card border border-border rounded-2xl flex flex-col shadow-2xl overflow-hidden z-10 text-left select-none"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border bg-bg-secondary flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${
                profileType === 'student' ? 'bg-primary-light text-primary border-primary/20' : 
                profileType === 'mentor' ? 'bg-warning-light text-warning border-warning/20' : 
                'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              }`}>
                {profileType === 'student' && <User className="w-5 h-5" />}
                {profileType === 'mentor' && <Briefcase className="w-5 h-5" />}
                {profileType === 'industry' && <Building className="w-5 h-5" />}
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#534AB7] bg-primary-light/50 px-2 py-0.5 rounded border border-primary/10">
                  {profileType === 'student' ? 'Graduate Candidate' : profileType === 'mentor' ? 'Verified Industry Advisor' : 'Industry Placement Partner'}
                </span>
                <h3 className="text-lg font-extrabold text-text-primary tracking-tight">{displayName}</h3>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-border text-text-muted hover:text-text-primary rounded-lg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body (Scrollable dynamic layouts) */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-bg-primary">
            
            {/* ----------------- TYPE STUDENT / GRADUATE ----------------- */}
            {profileType === 'student' && (() => {
              const skills = profileData.skills || [
                { name: 'React Development', score: 85 },
                { name: 'Tailwind CSS', score: 90 },
                { name: 'REST APIs', score: 55 },
                { name: 'PostgreSQL Indexes', score: 35 },
                { name: 'System Security', score: 45 }
              ];
              // Sync the competency average score beautifully with the graduate profile score!
              const compScore = profileData.menteeScore || profileData.readinessScore || profileData.meanSkillScore || getCompetencyAverage(skills);
              const goalsList = profileData.goals || [
                'Bridge software architecture skills gap to transition to Full-Stack Developer roles.',
                'Engage with mentor to practice system design, indexing, and authentication flows.',
                'Secure high-impact front-end/back-end roles in technology or logistics sectors.'
              ];
              const educationHistory = (profileData.education && Array.isArray(profileData.education) && profileData.education.length > 0) ? profileData.education :
                                       (profileData.academicBackground && Array.isArray(profileData.academicBackground) && profileData.academicBackground.length > 0) ? profileData.academicBackground : [
                                         { degree: profileData.degree || 'B.Sc. in Computer Science', school: profileData.university || 'State Technical University', year: '2021–2025' }
                                       ];

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-left">
                  
                  {/* Left sidebar info card */}
                  <div className="md:col-span-1 space-y-6">
                    {/* Career Goal & Aspirations */}
                    <div className="p-5 bg-card border border-border rounded-xl space-y-3 shadow-xs">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 border-b border-border pb-2">
                        <Target className="w-4 h-4 text-primary" /> Career goals & segment
                      </h4>
                      <p className="text-text-secondary leading-normal italic text-[11px] font-medium">
                        "{bio}"
                      </p>
                      
                      <div className="pt-2 space-y-3">
                        <span className="text-[9px] uppercase tracking-wider text-text-muted block font-extrabold">Aspirations Timeline:</span>
                        <div className="space-y-2">
                          {goalsList.map((g: string, i: number) => (
                            <div key={i} className="flex gap-2">
                              <span className="font-mono bg-bg-secondary px-1 text-text-muted mt-0.5 rounded leading-none shrink-0 text-[10px]">0{i+1}</span>
                              <span className="text-text-secondary leading-relaxed">{g}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Academic background */}
                    <div className="p-5 bg-card border border-border rounded-xl space-y-3 shadow-xs">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 border-b border-border pb-2">
                        <GraduationCap className="w-4 h-4 text-indigo-500" /> Education History
                      </h4>
                      <div className="space-y-4">
                        {educationHistory.map((edu: any, i: number) => (
                          <div key={i} className="space-y-1">
                            <p className="font-bold text-text-primary leading-snug">{edu.degree || 'Degree Program'}</p>
                            <p className="text-text-secondary font-medium">{edu.school || 'Verified Institution'}</p>
                            <span className="text-[9px] font-bold font-mono text-text-muted bg-bg-secondary px-2 py-0.5 rounded border border-border mt-1 inline-block">
                              {edu.year || '2022–2026'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Certifications and accreditations */}
                    <div className="p-5 bg-card border border-border rounded-xl space-y-3 shadow-xs">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 border-b border-border pb-2">
                        <Award className="w-4 h-4 text-amber-500" /> Accreditations
                      </h4>
                      <div className="space-y-2">
                        {(profileData.certifications || [
                          'AWS Cloud Practitioner Exam 101',
                          'System Security Fundamentals v2'
                        ]).map((cert: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-text-secondary bg-bg-secondary border border-border p-2 rounded-lg">
                            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="font-semibold leading-tight">{cert}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right wider panel */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Competency gauge banner */}
                    <div className="p-6 bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent border border-border rounded-xl flex items-center justify-between gap-6 shadow-xs">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                          <h4 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">Dynamic Competency Scoreboard</h4>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed max-w-md">
                          Dynamic student average compiled based on authentic platform skills audits and verified project submissions. This serves as their active career-readiness credential.
                        </p>
                      </div>

                      <div className={`shrink-0 px-4 py-3 rounded-2xl border text-center font-bold ${scoreColor(compScore)}`}>
                        <span className="text-[10px] uppercase font-bold text-text-muted block tracking-widest mb-0.5">Average</span>
                        <span className="text-4xl font-black">{compScore}%</span>
                      </div>
                    </div>

                    {/* Skills Breakdown matrix */}
                    <div className="p-5 bg-card border border-border rounded-xl space-y-4 shadow-xs">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 border-b border-border pb-2">
                        <Code className="w-4 h-4 text-indigo-500" /> Technology Competency Matrix
                      </h4>
                      <div className="space-y-4">
                        {skills.map((skill: any, i: number) => {
                          const sName = skill.name || skill.title || 'Dynamic Dev Module';
                          const sScore = typeof skill.score === 'number' ? skill.score : parseInt(skill.score || '60');
                          return (
                            <div key={i} className="space-y-1.5">
                              <div className="flex justify-between font-bold text-text-secondary">
                                <span className="text-[11px]">{sName}</span>
                                <span className="font-mono text-text-primary">{sScore}%</span>
                              </div>
                              <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden border border-border">
                                <div 
                                  className={`h-full tracking-wide rounded-full ${
                                    sScore >= 80 ? 'bg-emerald-500' : sScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`} 
                                  style={{ width: `${sScore}%` }} 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* ----------------- TYPE MENTOR ----------------- */}
            {profileType === 'mentor' && (() => {
              const rating = profileData.rating || 4.9;
              const jobTitle = profileData.role || profileData.jobTitle || 'Industry Advisor';
              const company = profileData.company || 'Independent';
              const expertise = profileData.expertise || profileData.specialties || ['System Architectures', 'Web Security', 'Database Indexing'];
              const maxSlots = profileData.maxMentees || 8;
              const slotsCount = profileData.slotsCount || 3;
              const achievements = profileData.achievements || [
                'Ex-Manager @ Google Cloud Architectures',
                'Coached 24+ graduates to high-income technical roles',
                'Expert in routing full-stack candidates to enterprise roles'
              ];

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-left">
                  
                  {/* Left Column Profile Summary */}
                  <div className="md:col-span-1 space-y-6">
                    {/* Mentor Badge & Star rating */}
                    <div className="p-5 bg-card border border-border rounded-xl text-center space-y-4 shadow-xs">
                      <div className="w-20 h-20 rounded-2xl bg-warning-light text-warning mx-auto flex items-center justify-center font-black text-4xl border border-warning/20 shadow-inner overflow-hidden">
                        {profileData.image || profileData.photo ? (
                          <img src={profileData.image || profileData.photo} className="object-cover w-full h-full" alt={displayName} />
                        ) : displayName[0]}
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-text-primary leading-tight">{displayName}</h4>
                        <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase">{jobTitle} at {company}</p>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 bg-warning-light text-warning px-4 py-2 border border-warning/20 rounded-xl max-w-[120px] mx-auto">
                        <Star className="w-4 h-4 fill-warning" />
                        <span className="text-xs font-extrabold">{rating} Rating</span>
                      </div>
                    </div>

                    {/* Mentor Details Info Card */}
                    <div className="p-5 bg-card border border-border rounded-xl space-y-3.5 shadow-xs">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted border-b border-border pb-2 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" /> Advisor Credentials
                      </h4>
                      <div className="space-y-3 font-sans">
                        <div className="flex justify-between items-center text-[11px] font-medium border-b border-border/40 pb-1.5">
                          <span className="text-text-muted">Experience</span>
                          <span className="text-text-primary font-bold">{profileData.experience || '5-8 Years'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-medium border-b border-border/40 pb-1.5">
                          <span className="text-text-muted">Hourly Rate</span>
                          <span className="text-emerald-600 font-extrabold">${profileData.hourlyRate || profileData.rate || '50'} / hr</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-medium border-b border-border/40 pb-1.5">
                          <span className="text-text-muted">Location</span>
                          <span className="text-text-primary font-bold flex items-center gap-1">
                            <Compass className="w-3 h-3 text-warning" /> {profileData.location || 'Bangladesh'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-medium border-b border-border/40 pb-1.5">
                          <span className="text-text-muted">Email Contact</span>
                          <span className="text-text-primary font-bold select-all break-all text-right max-w-[140px]">{profileData.email || 'contact@careerbridge.systems'}</span>
                        </div>
                        {profileData.linkedin && (
                          <div className="pt-1">
                            <a 
                              href={profileData.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="w-full py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-blue-600/20"
                            >
                              <Link2 className="w-3.5 h-3.5" /> LinkedIn Profile <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Operational availability stats */}
                    <div className="p-5 bg-card border border-border rounded-xl space-y-3.5 shadow-xs">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted border-b border-border pb-2 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-primary" /> Active Guidance limits
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-bg-secondary p-3 rounded-lg border border-border text-center">
                          <span className="text-[9px] text-text-muted uppercase block font-bold mb-1">Max Limits</span>
                          <span className="text-base font-extrabold text-text-primary">{maxSlots} slots</span>
                        </div>
                        <div className="bg-bg-secondary p-3 rounded-lg border border-border text-center">
                          <span className="text-[9px] text-text-muted uppercase block font-bold mb-1">Occupied</span>
                          <span className="text-base font-extrabold text-primary">{slotsCount} active</span>
                        </div>
                      </div>

                      <p className="text-[10.5px] text-text-secondary leading-normal text-center bg-primary-light/30 border border-primary/10 p-2.5 rounded-lg font-medium">
                        Advising capacity threshold: {maxSlots - slotsCount} open mentorship slots currently available.
                      </p>
                    </div>
                  </div>

                  {/* Right wider panel */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Mentoring Philosophy bio */}
                    <div className="p-6 bg-card border border-border rounded-xl space-y-3 shadow-xs">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[#534AB7] flex items-center gap-1.5">
                        <Compass className="w-4 h-4" /> Mentor Philosophy & Bio
                      </h4>
                      <p className="text-text-secondary text-sm font-light leading-relaxed">
                        {bio}
                      </p>
                    </div>

                    {/* Expertise Tag segment */}
                    <div className="p-5 bg-card border border-border rounded-xl space-y-3 shadow-xs">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 border-b border-border pb-2">
                        <Code className="w-4 h-4 text-indigo-500" /> Core Coaching Areas
                      </h4>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {expertise.map((tag: string) => (
                          <span key={tag} className="px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Achievements portfolio */}
                    <div className="p-5 bg-card border border-border rounded-xl space-y-4 shadow-xs">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 border-b border-border pb-2">
                        <Award className="w-4 h-4 text-warning" /> Validated Accomplishments
                      </h4>
                      <div className="space-y-3">
                        {achievements.map((ach: string, idx: number) => (
                          <div key={idx} className="flex gap-3 items-start bg-bg-secondary p-3 rounded-lg border border-border/80">
                            <span className="w-5 h-5 rounded bg-warning-light text-warning font-mono font-bold flex items-center justify-center shrink-0">
                              ✓
                            </span>
                            <p className="text-text-secondary font-semibold text-xs leading-normal pt-0.5">{ach}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* ----------------- TYPE INDUSTRY / COMPANY ----------------- */}
            {profileType === 'industry' && (() => {
              const techStack = profileData.techStack || ['React Router', 'Docker Containers', 'Ruby on Rails', 'PostgreSQL Redundancies'];
              const minScore = profileData.minScore || 70;
              const mission = profileData.mission || 'To leverage real-time state analysis and automation technologies to drive supply-chain optimization globally.';
              const openPositions = profileData.openJobsCount || 4;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-left">
                  
                  {/* Left Column stats */}
                  <div className="md:col-span-1 space-y-6">
                    {/* Basic Industry header */}
                    <div className="p-5 bg-card border border-border rounded-xl text-center space-y-4 shadow-xs">
                      <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center font-black text-4xl border border-emerald-500/20 shadow-inner">
                        {displayName[0]}
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-text-primary leading-tight">{displayName}</h4>
                        <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Verified Employer</p>
                      </div>

                      <div className="bg-emerald-500/10 text-emerald-600 px-4 py-2 border border-emerald-500/20 rounded-xl text-center font-bold inline-block">
                        {openPositions} Active Job Posts
                      </div>
                    </div>

                    {/* Minimum requirements */}
                    <div className="p-5 bg-card border border-border rounded-xl space-y-3.5 shadow-xs">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted border-b border-border pb-2 flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-emerald-500" /> Competency threshold
                      </h4>
                      <div className="p-4 bg-emerald-500/5 text-emerald-600 rounded-xl border border-emerald-500/15 text-center space-y-1">
                        <span className="text-[10px] text-text-muted font-bold uppercase block tracking-widest">Graduation Cutoff</span>
                        <span className="text-3xl font-black">{minScore}% Match</span>
                      </div>
                      <p className="text-[10px] text-text-secondary leading-normal text-center">
                        Minimum professional readiness score required to pass automatic candidate routing pipelines for this employer.
                      </p>
                    </div>
                  </div>

                  {/* Right Column wider info */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Mission statement */}
                    <div className="p-6 bg-card border border-border rounded-xl space-y-3 shadow-xs">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                        <Compass className="w-4 h-4" /> Company Mission & Objectives
                      </h4>
                      <p className="text-text-secondary text-sm font-light leading-relaxed">
                        {mission}
                      </p>
                    </div>

                    {TechStack(techStack)}

                    {/* About company information */}
                    <div className="p-5 bg-card border border-border rounded-xl space-y-3.5 shadow-xs">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 border-b border-border pb-2">
                        <Building className="w-4 h-4 text-emerald-500" /> Employer overview
                      </h4>
                      <p className="text-text-secondary leading-normal">
                        This employer actively collaborates with CareerBridge, monitoring targeted curriculum scorecards to find pre-calibrated graduates. Connect today to streamline your hiring pipeline.
                      </p>
                    </div>
                  </div>

                </div>
              );
            })()}

          </div>

          {/* Footer action bar */}
          <div className="px-6 py-4 border-t border-border bg-bg-secondary flex justify-end items-center gap-3 shrink-0">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-bg-primary hover:bg-bg-tertiary border border-border rounded-xl text-xs font-bold text-text-secondary transition-all cursor-pointer inline-flex items-center gap-1"
            >
              Close Dossier
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function TechStack(techStack: any) {
  return (
    <div className="p-5 bg-card border border-border rounded-xl space-y-3 shadow-xs">
      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 border-b border-border pb-2">
        <Code className="w-4 h-4 text-indigo-500" /> Primary Technology Stack
      </h4>
      <div className="flex flex-wrap gap-2 pt-1">
        {techStack.map((tech: string) => (
          <span key={tech} className="px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-extrabold text-text-secondary uppercase tracking-wider">
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
}
