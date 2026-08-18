import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import {
  Briefcase, Users, BookOpen, ExternalLink, Star,
  Sparkles, ArrowRight, Target, Search, ChevronRight,
  TrendingUp, Brain, Layers, CheckCircle, Clock, Check
} from 'lucide-react';
import { motion, useInView } from 'motion/react';
import Markdown from 'react-markdown';

/* ─── Animated counter ─── */
function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {value}
    </motion.span>
  );
}

/* ─── Scroll-triggered fade+slide wrapper ─── */
function FadeStagger({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Decorative shimmer divider ─── */
function ShimmerLine() {
  return (
    <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent my-8" />
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export function Recommendations({ isMentorView, searchQuery }: { isMentorView?: boolean; searchQuery: string }) {
  const { profile, user } = useAuth();
  
  // Mentor view states
  const [graduates, setGraduates] = useState<any[]>([]);
  const [existingRequests, setExistingRequests] = useState<Record<string, string>>({}); // gradId -> status
  const [loadingGrads, setLoadingGrads] = useState(false);
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);

  // Fetch graduates when mentor view is active
  useEffect(() => {
    if (!isMentorView || !user) return;
    setLoadingGrads(true);

    const gradsQuery = query(collection(db, 'users'), where('role', '==', 'graduate'));
    const unsubGrads = onSnapshot(gradsQuery, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGraduates(list);
      setLoadingGrads(false);
    }, (err) => {
      console.error(err);
      setLoadingGrads(false);
    });

    const requestsQuery = query(collection(db, 'mentorship_requests'), where('mentorId', '==', user.uid));
    const unsubReqs = onSnapshot(requestsQuery, (snap) => {
      const mapping: Record<string, string> = {};
      snap.docs.forEach((doc) => {
        const d = doc.data();
        mapping[d.menteeId] = d.status;
      });
      setExistingRequests(mapping);
    });

    return () => {
      unsubGrads();
      unsubReqs();
    };
  }, [isMentorView, user]);

  const handleInviteGrad = async (grad: any) => {
    if (!user) return;
    setSendingRequestTo(grad.id);
    try {
      await addDoc(collection(db, 'mentorship_requests'), {
        mentorId: user.uid,
        mentorName: profile?.displayName || user.displayName || 'Industry Mentor',
        menteeId: grad.id,
        menteeName: grad.displayName || 'Graduate student',
        status: 'pending',
        initiatedBy: 'mentor',
        createdAt: new Date().toISOString()
      });

      // Notify the graduate
      await addDoc(collection(db, 'notifications'), {
        recipientId: grad.id,
        type: 'mentor_invitation',
        title: '🌟 Mentor Invitation!',
        body: `Industry Mentor ${profile?.displayName || 'Verified Mentor'} invited you to join their mentorship connection. Workspace is ready for launch!`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSendingRequestTo(null);
    }
  };

  if (isMentorView) {
    const filteredGrads = graduates.filter(g => {
      const name = g.displayName || '';
      const target = g.targetRole || '';
      const skillsStr = (g.skills || []).map((s: any) => typeof s === 'string' ? s : (s.name || s.title || '')).join(' ');
      const search = searchQuery.toLowerCase();
      return name.toLowerCase().includes(search) || 
             target.toLowerCase().includes(search) || 
             skillsStr.toLowerCase().includes(search);
    });

    return (
      <div className="max-w-6xl mx-auto space-y-12 pb-32 transition-colors duration-500">
        <header className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Discover & Recruit</p>
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight leading-tight">Browse Graduate Students</h1>
          <p className="text-text-secondary text-lg max-w-2xl leading-relaxed italic font-light">
            Match with promising graduates on CareerBridge based on target role affinity and system skill readiness indices.
          </p>
        </header>

        {loadingGrads ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="animate-spin text-primary font-bold">●</span>
            <p className="text-xs uppercase tracking-widest text-text-muted">Analyzing platform candidates...</p>
          </div>
        ) : filteredGrads.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-bg-secondary space-y-4">
            <Users className="w-12 h-12 text-text-muted/40 mx-auto" />
            <h3 className="text-xl font-bold text-text-primary">No Matching Graduates Found</h3>
            <p className="text-[10px] font-bold tracking-widest text-text-muted uppercase">Try adjusting your search queries or adding developer skills filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGrads.map((grad) => {
              const status = existingRequests[grad.id];
              // compute a simulated matching affinity score based on overlapping expertise if profile tags exist, or standard high compatibility
              const matchScore = grad.targetRole && profile?.title && grad.targetRole.toLowerCase().split(' ').some((w: string) => profile.title.toLowerCase().includes(w)) ? 96 : 88;

              return (
                <div 
                  key={grad.id} 
                  className="bg-bg-secondary border border-border hover:border-primary/20 transition-all rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-sm"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                          {grad.displayName?.[0] || 'G'}
                        </div>
                        <div>
                          <h4 className="font-bold text-text-primary text-base leading-tight truncate">{grad.displayName || 'Ayesha Khan'}</h4>
                          <p className="text-xs text-text-muted mt-0.5">{grad.targetRole || 'Software Graduate'}</p>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-primary/10 rounded-lg text-primary text-[10px] font-bold uppercase tracking-wider">
                        {matchScore}% MATCH
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-text-secondary font-medium">Job Readiness Score</span>
                        <span className="font-bold text-primary">{grad.readinessScore || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${grad.readinessScore || 0}%` }} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Core Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {grad.skills && grad.skills.length > 0 ? (
                          grad.skills.slice(0, 4).map((sk: any, idx: number) => {
                            const name = typeof sk === 'string' ? sk : (sk.name || sk.title || '');
                            return (
                              <span key={`${name}-${idx}`} className="text-[10px] px-2.5 py-1 bg-bg-primary border border-border text-text-secondary rounded-full font-medium">
                                {name}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] italic text-text-muted">No audit tags configured.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-4 flex gap-2">
                    {status === 'pending' ? (
                      <button 
                        disabled 
                        className="w-full py-2.5 bg-bg-primary border border-border text-text-muted text-xs font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <Clock className="w-4 h-4" /> Pending Approval
                      </button>
                    ) : status === 'accepted' ? (
                      <button 
                        disabled 
                        className="w-full py-2.5 bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Connected
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleInviteGrad(grad)}
                        disabled={sendingRequestTo === grad.id}
                        className="w-full py-2.5 bg-primary hover:bg-[#43399A] active:scale-95 text-primary-text hover:text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                      >
                        {sendingRequestTo === grad.id ? 'Sending...' : 'Invite to Mentorship'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── Empty state ── */
  if (!profile?.profileAnalyzed) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center bg-bg-primary">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
        >
          <div className="mx-auto w-24 h-24 rounded-2xl bg-bg-secondary border border-border flex items-center justify-center relative group">
            <div className="absolute -inset-4 bg-primary/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-1000" />
            <Briefcase className="w-12 h-12 text-text-muted relative z-10 transition-colors group-hover:text-primary" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-text-primary tracking-tight">Profile Analysis Needed</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted max-w-sm mx-auto">
              PLEASE ANALYZE YOUR PROFESSIONAL PROFILE TO UNLOCK PERSONALIZED MATCHES AND CAREER GUIDANCE.
            </p>
          </div>
          <button
            className="btn-primary px-12 py-4 flex items-center gap-3 mx-auto shadow-xl shadow-primary/20"
          >
            ANALYZE RESUME
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  const filteredJobs = (profile.recommendations?.jobs || [])
    .filter((j: any) => {
      const title = typeof j === 'string' ? j : j.title;
      return title.toLowerCase().includes(searchQuery.toLowerCase()) &&
             (!profile.targetRole || title.toLowerCase().includes(profile.targetRole.toLowerCase()) || title.toLowerCase().includes('engineer'));
    })
    .sort((a: any, b: any) => {
      const scoreA = typeof a === 'string' ? 85 : a.matchScore;
      const scoreB = typeof b === 'string' ? 85 : b.matchScore;
      return scoreB - scoreA;
    });

  const filteredMentors   = profile.recommendations?.mentors?.filter((m: any) => {
    const name = typeof m === 'string' ? m : m.name;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];
  const filteredResources = profile.recommendations?.resources?.filter((r: string) => r.toLowerCase().includes(searchQuery.toLowerCase())) || [];
  const hasResults = filteredJobs.length > 0 || filteredMentors.length > 0 || filteredResources.length > 0;

  /* ── No search results ── */
  if (!hasResults && searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-10 bg-bg-primary">
        <div className="w-16 h-16 bg-bg-secondary border border-border rounded-xl flex items-center justify-center mx-auto shadow-inner">
          <Search className="w-8 h-8 text-text-muted/30" />
        </div>
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-text-primary tracking-tight italic">No Results Found</h3>
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">
            WE COULD NOT LOCATE ANY RECOMMENDATIONS MATCHING <span className="text-primary font-bold">"{searchQuery.toUpperCase()}"</span>.
          </p>
        </div>
      </div>
    );
  }

  /* ── Main recommendations view ── */
  return (
    <div className="max-w-6xl mx-auto space-y-24 pb-32 transition-colors duration-500">

      {/* ── HERO HEADER ───────────────────────────── */}
      <header className="space-y-10 relative">
        <div className="absolute -left-12 top-0 bottom-0 w-[1px] bg-border hidden xl:block" />
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Personalized Insights</p>
          <h1 className="text-5xl md:text-6xl font-bold text-text-primary tracking-tight leading-tight">Career Recommendations</h1>
          <p className="text-text-secondary text-xl max-w-2xl leading-relaxed italic font-light mt-6">
            Analyzing your professional background to find the best job opportunities, mentors, and learning resources for your career growth.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-12 pt-4">
          {[
            { icon: Briefcase, label: 'Matched Jobs',  value: filteredJobs.length },
            { icon: Users,     label: 'Top Mentors', value: filteredMentors.length },
            { icon: BookOpen,  label: 'Study Tools', value: filteredResources.length },
          ].map(({ icon: Icon, label, value }, i) => (
            <div key={label} className="flex items-center gap-5 group">
              <div className="w-12 h-12 rounded-xl bg-bg-secondary border border-border flex items-center justify-center group-hover:border-primary/40 transition-all duration-700 relative overflow-hidden shadow-sm">
                <Icon className="w-6 h-6 text-text-muted group-hover:text-primary relative z-10 transition-colors" />
                <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-text-primary leading-none tracking-tight">{value}</p>
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-2">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* ── GAP ANALYSIS ──────────────────────────── */}
      <section className="bg-bg-secondary border border-primary/20 p-12 rounded-[2rem] space-y-8 relative overflow-hidden group shadow-xl shadow-primary/5">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Brain className="w-32 h-32 text-primary" />
        </div>
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary mt-1">AI SKILL ANALYSIS</h3>
        </div>
        <div className="prose dark:prose-invert prose-sm max-w-none text-text-secondary font-light leading-loose italic">
          <Markdown>{profile.gapAnalysis}</Markdown>
        </div>
      </section>

      {/* ── THREE COLUMNS ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* JOBS */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <Briefcase className="w-4 h-4 text-text-muted" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1">Recommended Jobs</h3>
          </div>

          <div className="space-y-6">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job: any, i: number) => (
                <motion.div 
                  key={i} 
                  whileHover={{ x: 4 }}
                  className="group bg-bg-secondary border border-border rounded-2xl p-6 hover:border-primary/20 transition-all cursor-pointer space-y-6 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold text-text-primary leading-tight tracking-tight group-hover:text-primary transition-colors">
                        {typeof job === 'string' ? job : job.title}
                      </h4>
                      {typeof job !== 'string' && (
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{job.company}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="px-2.5 py-1.5 bg-primary-light border border-primary/20 rounded-lg">
                        <span className="text-[10px] font-bold text-primary uppercase">
                          {typeof job === 'string' ? '85' : job.matchScore}% MATCH
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="w-full text-[10px] font-bold uppercase tracking-widest text-primary py-4 rounded-xl border border-primary/20 hover:bg-primary-light transition-all">
                    VIEW JOB
                  </button>
                </motion.div>
              ))
            ) : (
              <p className="text-[9px] font-bold text-text-muted italic uppercase tracking-widest text-center py-10 border border-dashed border-border rounded-2xl">No job matches currently found.</p>
            )}
          </div>
        </div>

        {/* MENTORS */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <Users className="w-4 h-4 text-text-muted" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1">Potential Mentors</h3>
          </div>

          <div className="space-y-6">
            {filteredMentors.length > 0 ? (
              filteredMentors.map((mentor: any, i: number) => (
                <motion.div 
                  key={i} 
                  whileHover={{ x: 4 }}
                  className="group bg-bg-secondary border border-border rounded-2xl p-6 hover:border-primary/20 transition-all cursor-pointer space-y-6 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-bg-primary border border-border flex items-center justify-center text-text-muted font-bold text-xl transition-all group-hover:border-primary/40 group-hover:text-primary group-hover:scale-110 shadow-inner">
                      {(typeof mentor === 'string' ? mentor : mentor.name)[0]}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-text-primary leading-tight tracking-tight group-hover:text-primary transition-colors">
                        {typeof mentor === 'string' ? mentor : mentor.name}
                      </h4>
                      <p className="text-[9px] font-bold text-primary tracking-widest mt-1 uppercase italic opacity-60">
                        {typeof mentor === 'string' ? 'READY TO CONNECT' : 'TARGETED_EXPERTISE'}
                      </p>
                    </div>
                  </div>
                  {typeof mentor !== 'string' && (
                    <p className="text-[11px] text-text-secondary font-light leading-relaxed italic border-l-2 border-primary/20 pl-4">
                      {mentor.rationale}
                    </p>
                  )}
                  <button className="w-full text-[10px] font-bold uppercase tracking-widest text-primary py-4 rounded-xl border border-primary/20 hover:bg-primary-light transition-all">
                    CONNECT NOW
                  </button>
                </motion.div>
              ))
            ) : (
              <p className="text-[9px] font-bold text-text-muted italic uppercase tracking-widest text-center py-10 border border-dashed border-border rounded-2xl">No mentor recommendations currently found.</p>
            )}
          </div>
        </div>

        {/* RESOURCES */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <BookOpen className="w-4 h-4 text-text-muted" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1">Learning Tools</h3>
          </div>

          <div className="space-y-6">
            {filteredResources.map((resource: string, i: number) => (
              <motion.div 
                key={i} 
                whileHover={{ x: 4 }}
                className="group bg-bg-secondary border border-border rounded-2xl p-6 hover:border-warning/20 transition-all cursor-pointer space-y-6 shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <h4 className="text-xl font-bold text-text-primary leading-tight tracking-tight group-hover:text-warning transition-colors">{resource}</h4>
                  <ExternalLink className="w-5 h-5 text-text-muted/30 group-hover:text-warning group-hover:-translate-y-1 group-hover:translate-x-1 transition-all" />
                </div>
                <button className="w-full text-[10px] font-bold uppercase tracking-widest text-warning py-4 rounded-xl border border-warning/20 hover:bg-warning-light transition-all">
                  ACCESS RESOURCE
                </button>
              </motion.div>
            ))}
          </div>
        </div>

      </div>

      {/* ── BOTTOM CTA ────────────────────────────── */}
      <div className="bg-bg-secondary border border-border p-12 rounded-[3rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-12 group hover:border-primary/20 transition-all">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 rounded-2xl bg-bg-primary border border-border flex items-center justify-center relative transition-all duration-700 group-hover:border-primary/40 group-hover:rotate-12 shadow-sm">
            <Target className="w-10 h-10 text-text-muted/30 group-hover:text-primary transition-colors" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-text-primary tracking-tight italic">Ready for Your Next Step?</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">CONNECT WITH INDUSTRY MENTORS TO CATALYZE YOUR PROFESSIONAL GROWTH.</p>
          </div>
        </div>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="btn-primary px-12 py-5 flex items-center gap-4 text-[11px] uppercase tracking-widest shadow-2xl shadow-primary/20"
        >
          FIND MENTORS
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}

/*
  Add to your global CSS or tailwind.config.js:

  @keyframes gradient {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
*/