import React from 'react';
import { 
  Clock, 
  LogOut, 
  Globe, 
  Linkedin, 
  Briefcase, 
  GraduationCap, 
  CheckCircle,
  Building2,
  Users,
  Star,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeToggle } from './ThemeToggle';

interface PendingVerificationProps {
  profile: any;
  onSignOut: () => Promise<void>;
}

export function PendingVerificationScreen({ profile, onSignOut }: PendingVerificationProps) {
  const isMentor = profile.role === 'mentor';
  const isIndustry = profile.role === 'industry';
  const isUniversity = profile.role === 'university';

  return (
    <div className="min-h-screen bg-bg-primary font-sans text-text-primary selection:bg-primary/20 relative noise overflow-x-hidden flex flex-col">
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#EC4899]/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Styled Top Header */}
      <header className="px-8 py-6 border-b border-border bg-bg-primary/50 backdrop-blur-md relative z-30 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <Briefcase className="w-4 h-4 text-primary-text" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-text-primary">CareerBridge</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button 
            onClick={onSignOut}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:text-error hover:border-error/30 transition-all"
          >
            <LogOut className="w-4 h-4" />
            SIGN OUT
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 w-[92%] max-w-7xl mx-auto py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10 items-start">
        
        {/* Left Side: Status / Instructions Box */}
        <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-24">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              VERIFICATION IN PROGRESS
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight leading-tight">
              CareerBridge is verifying your profile. Please give us some time.
            </h1>
            
            <p className="text-text-muted text-[15px] md:text-[16px] leading-relaxed font-light">
              Thank you for applying to the CareerBridge platform. Your registration data has been submitted successfully and sent to our administrators. Once your professional credentials are model-verified and endorsed, you will receive a verification completion email and can log in to access your full workspace panel!
            </p>

            <div className="pt-2">
              <button 
                onClick={onSignOut}
                className="w-full sm:w-auto px-6 py-4 bg-primary text-primary-text font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/25 cursor-pointer"
              >
                <LogOut className="w-4.5 h-4.5" />
                Back to Landing Page
              </button>
            </div>

            <div className="p-6 bg-bg-secondary border border-border rounded-3xl space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="text-xs font-mono text-text-muted tracking-wider uppercase">Application Role</span>
                <span className="text-xs font-bold text-primary uppercase tracking-widest">{profile.role}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-text-muted tracking-wider uppercase">Review Priority</span>
                <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">High Vetting</span>
              </div>
            </div>

            <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-text-primary">Real-time Synchronization</h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  As soon as the administrator verifies your credentials, this page will update automatically to access your full workspace panel.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Public Profile Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase flex items-center gap-4">
              Public Profile Preview <div className="h-px w-24 bg-border" />
            </h3>
            <span className="text-[10px] font-mono text-text-muted bg-bg-secondary px-3 py-1 rounded-md border border-border">PUBLIC PREVIEW</span>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {isMentor && (
              <div className="bg-[#FAF6F0] text-[#1E1B18] p-10 rounded-[3rem] border border-[#CBD5E1]/30 shadow-2xl relative overflow-hidden">
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-[#EAB308]/10 blur-[40px] pointer-events-none rounded-full" />
                
                <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                  {/* Photo Profile block */}
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl overflow-hidden border-4 border-white shadow-xl shrink-0">
                    <img 
                      src={profile.photo || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200"} 
                      className="object-cover w-full h-full" 
                      alt={profile.displayName} 
                    />
                  </div>

                  {/* Header info */}
                  <div className="space-y-4 flex-1 text-left">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-[#3C3026] tracking-tight font-serif">
                          {profile.displayName}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#D97706]">Mentor Request</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                          <span className="text-xs font-mono text-gray-500 uppercase">{profile.location || 'Dhaka, BD'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-white/70 border border-gray-200 rounded-full shadow-sm text-xs">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold">5.0</span>
                        <span className="text-gray-400 font-light">(0 reviews)</span>
                      </div>
                    </div>

                    <p className="text-[#5C4D3D] text-[15px] font-medium flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#8C7A6B] inline" />
                      {profile.experience?.[0]?.title || 'Professional Expert'} at {profile.experience?.[0]?.company || 'Tech Industry'}
                    </p>

                    <p className="text-[#3C3026]/80 text-sm leading-relaxed font-light italic bg-white/40 p-4 rounded-2xl border border-white/50">
                      "{profile.bio || 'Experienced senior leader ready to support the next generation of technologists.'}"
                    </p>

                    {/* Technical details tags */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Areas of Expertise</span>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills && profile.skills.length > 0 ? (
                          profile.skills.map((skill: string) => (
                            <span key={skill} className="px-3.5 py-1.5 bg-[#F1E9DB] hover:bg-[#EAE0CD] text-[#5C4D3D] text-[11px] font-semibold rounded-full transition-colors">
                              {skill}
                            </span>
                          ))
                        ) : (
                          ['Software Engineering', 'System Design', 'Leadership'].map((tag) => (
                            <span key={tag} className="px-3.5 py-1.5 bg-[#F1E9DB] text-[#5C4D3D] text-[11px] font-semibold rounded-full">
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Social connection points */}
                    <div className="flex gap-4 pt-4 border-t border-[#EAE0CD]">
                      {profile.linkedin && (
                        <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-medium text-[#0A66C2] hover:underline">
                          <Linkedin className="w-4 h-4" />
                          LinkedIn Profile <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <span className="text-xs font-sans text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-bold block ml-auto">
                        ✦ Active Responder
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isIndustry && (
              <div className="bg-[#0A0A1F] text-white p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
                {/* Visual grid overlay */}
                <div className="absolute inset-0 bg-grid-overlay opacity-5 pointer-events-none" />
                <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/10 blur-[50px]" />

                <div className="space-y-8 relative z-10">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-pink-500 font-bold text-3xl shadow-inner">
                        {profile.company?.charAt(0) || 'IP'}
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white">{profile.company}</h2>
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-400 hover:underline flex items-center gap-1.5 mt-1">
                          <Globe className="w-3.5 h-3.5" />
                          {profile.website || 'website_missing.com'}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <span className="px-4 py-1.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold tracking-wider rounded-full uppercase">
                      Enterprise Partner
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block font-mono uppercase tracking-wider">Representative Authority</span>
                      <span className="text-md font-semibold text-white block mt-1">{profile.displayName}</span>
                      <span className="text-xs text-gray-400 block mt-0.5">{profile.email}</span>
                    </div>
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block font-mono uppercase tracking-wider">Expected Hiring Size</span>
                      <span className="text-md font-semibold text-white block mt-1">{profile.size || 'Unspecified'}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted block">Primary Technologies Stack</span>
                    <div className="flex flex-wrap gap-2">
                      {profile.techStack ? (
                        profile.techStack.split(',').map((tech: string) => (
                          <span key={tech} className="px-3.5 py-1.5 bg-white/5 text-gray-300 text-xs font-medium rounded-full border border-white/10">
                            {tech.trim()}
                          </span>
                        ))
                      ) : (
                        ['React', 'Node.js', 'PostgreSQL', 'Cloud Infrastructure'].map((tech) => (
                          <span key={tech} className="px-3.5 py-1.5 bg-white/5 text-gray-300 text-xs font-medium rounded-full border border-white/10">
                            {tech}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isUniversity && (
              <div className="bg-[#0b140b] text-white p-10 rounded-[3rem] border border-emerald-500/10 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-overlay opacity-5 pointer-events-none" />
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[50px]" />

                <div className="space-y-8 relative z-10">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                        <GraduationCap className="w-9 h-9" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-white">{profile.university}</h2>
                        <span className="text-xs text-emerald-400 flex items-center gap-1.5 mt-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {profile.department || 'Computer Science Department'}
                        </span>
                      </div>
                    </div>
                    <span className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wider rounded-full uppercase">
                      Academic Platform
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block font-mono uppercase tracking-wider">Liaison Representative</span>
                      <span className="text-md font-semibold text-white block mt-1">{profile.displayName}</span>
                      <span className="text-xs text-gray-400 block mt-0.5">{profile.email}</span>
                    </div>
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block font-mono uppercase tracking-wider">Website / URL Domain</span>
                      <span className="text-md font-semibold text-emerald-400 block mt-1 hover:underline truncate">
                        <a href={profile.website} target="_blank" rel="noopener noreferrer">
                          {profile.website || 'university_link.edu'}
                        </a>
                      </span>
                    </div>
                  </div>

                  <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="text-[10px] text-gray-400 block font-mono uppercase tracking-wider mb-2">Academic Profile Summary Range</span>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-white">Target Graduating Batch Size</span>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold rounded-lg border border-emerald-500/20">
                        {profile.batchSize || '100 - 500 Students'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

      </div>
    </div>
  );
}
