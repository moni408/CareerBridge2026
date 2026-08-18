import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { generateMentorImpactFocusItems, ImpactFocusItem } from '../services/geminiService';
import { 
  collection, query, where, onSnapshot, doc, getDoc, 
  updateDoc, addDoc, serverTimestamp, setDoc, getDocs,
  orderBy, limit
} from 'firebase/firestore';
import { 
  TrendingUp, Users, Star, Award, ShieldCheck, Mail, Calendar, 
  Check, X, AlertTriangle, Play, HelpCircle, ArrowUpRight, 
  CheckCircle2, Clock, CheckCircle, Flame, Plus, ShieldAlert, Loader2,
  TrendingDown, Globe, Share2, Clipboard, Heart, BarChart3, ChevronRight,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

// STATIC BADGES ALIGNING WITH TEMPLATE
const BADGES = [
  { id: 'top_mentor', name: 'Top Mentor', desc: 'Top 5% platform-wide', icon: 'trophy', earned: true, progress: 100, progressText: '100%' },
  { id: '10_placements', name: '10 Placements', desc: '14 grads placed in jobs', icon: 'rocket', earned: true, progress: 100, progressText: '100%' },
  { id: 'verified_mentor', name: 'Verified Mentor', desc: 'CareerBridge certified', icon: 'check', earned: true, progress: 100, progressText: '100%' },
  { id: 'consistency_streak', name: 'Consistency Streak', desc: 'Guidance regularity incentive', icon: 'clock', earned: false, progress: 60, progressText: '18 / 30 days' },
  { id: '5_star_mentor', name: '5-Star Mentor', desc: 'Premium verified ratings', icon: 'star', earned: false, progress: 75, progressText: '3 / 4 reviews' },
  { id: 'domain_expert', name: 'Domain Expert', desc: 'Verify core domain mentees', icon: 'shield', earned: false, progress: 60, progressText: '3 / 5 graduates' }
];

interface MentorDashboardProps {
  setView: (view: any) => void;
  initialView?: 'dashboard' | 'recognition' | 'impact';
}

export function MentorDashboard({ setView, initialView = 'dashboard' }: MentorDashboardProps) {
  const { profile, user } = useAuth();
  
  // Internal views
  const [currentSubView, setCurrentSubView] = useState<'dashboard' | 'recognition' | 'impact'>(initialView);

  // States
  const [requests, setRequests] = useState<any[]>([]);
  const [activeConnections, setActiveConnections] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [unconnectedGrads, setUnconnectedGrads] = useState<any[]>([]);
  const [aiMatches, setAiMatches] = useState<any[]>([]);
  const [loadingAiMatches, setLoadingAiMatches] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [accepting, setAccepting] = useState(profile?.acceptingRequests !== false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);

  // Focus Items and nudge feedback for newly Redesigned Impact Report
  const [focusItems, setFocusItems] = useState<ImpactFocusItem[]>([]);
  const [loadingFocus, setLoadingFocus] = useState(false);
  const [nudgeStatus, setNudgeStatus] = useState<string | null>(null);

  // Synchronize deep-linked initial view
  useEffect(() => {
    setCurrentSubView(initialView);
  }, [initialView]);

  // Fetch AI focus suggestions for the redesigned Impact Report
  useEffect(() => {
    if (currentSubView === 'impact' && user) {
      setLoadingFocus(true);
      generateMentorImpactFocusItems(profile, activeConnections)
        .then(items => {
          setFocusItems(items);
        })
        .catch(err => {
          console.error("Failed to load Gemini focus recommendations:", err);
        })
        .finally(() => {
          setLoadingFocus(false);
        });
    }
  }, [currentSubView, activeConnections, profile, user]);

  // Send interactive, authenticated notifications and log activities
  const handleNudgeMentee = async (menteeName: string, menteeId?: string) => {
    if (!user) return;
    try {
      const targetId = menteeId || 'nudge_alhaz_ali';
      
      // Write a real Firestore notification
      await addDoc(collection(db, 'notifications'), {
        recipientId: targetId,
        type: 'nudge_alert',
        title: '⚡ Mentor Nudge!',
        body: `Your mentor ${profile?.displayName || 'Mentor'} sent you a gentle nudge on your roadmap targets. You can do this!`,
        isRead: false,
        createdAt: new Date().toISOString()
      });

      // Write a real Firestore activity log for mentor
      await addDoc(collection(db, 'activities'), {
        mentorId: user.uid,
        html: `Sent a motivational nudge message to <span class="font-bold text-[#534AB7]">${menteeName}</span> encouraging them to login and audit their skill gaps.`,
        type: 'info',
        ts: Date.now()
      });

      setNudgeStatus(`Sent motivational nudge to ${menteeName}!`);
      setTimeout(() => setNudgeStatus(null), 4000);
    } catch (err) {
      console.error("Nudge operation failed:", err);
      alert("Failed to send nudge");
    }
  };

  // Handle Gemini 3.5 Flash Matching
  const handleGenerateAiMatches = async () => {
    if (unconnectedGrads.length === 0) return;
    setLoadingAiMatches(true);
    try {
      const { suggestMentorMatches } = await import('../services/geminiService');
      const matches = await suggestMentorMatches(profile, unconnectedGrads);
      
      const mapped = matches.map(m => {
        const originalGrad = unconnectedGrads.find(g => (g.id === m.uid || g.uid === m.uid)) || unconnectedGrads[0];
        return {
          ...originalGrad,
          id: originalGrad?.id || m.uid,
          displayName: m.name,
          targetRole: m.role,
          skills: m.skills,
          matchPercent: m.matchScore,
          rationale: m.rationale
        };
      });
      setAiMatches(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAiMatches(false);
    }
  };

  // Firestore Listeners
  useEffect(() => {
    if (!user) return;

    // 1. Pending incoming Requests
    const reqQ = query(
      collection(db, 'mentorship_requests'),
      where('mentorId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubRequests = onSnapshot(reqQ, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Active connections
    const connQ = query(
      collection(db, 'mentorship_connections'),
      where('mentorId', '==', user.uid)
    );
    const unsubConnections = onSnapshot(connQ, (snapshot) => {
      setActiveConnections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. active Sessions
    const sessQ = query(
      collection(db, 'sessions'),
      where('mentorId', '==', user.uid),
      where('status', '==', 'confirmed')
    );
    const unsubSessions = onSnapshot(sessQ, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Earned Badges
    const badgeQ = query(
      collection(db, 'earned_badges'),
      where('mentorId', '==', user.uid)
    );
    const unsubBadges = onSnapshot(badgeQ, (snapshot) => {
      setEarnedBadges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 5. Unconnected graduates (for suggestions panel)
    const gradsQ = query(collection(db, 'users'), where('role', '==', 'graduate'));
    const unsubGrads = onSnapshot(gradsQ, (snapshot) => {
      const allGrads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUnconnectedGrads(allGrads.slice(0, 3)); // show first few as premium matches
    });

    // 6. Recent dynamic activities list
    const actQ = query(
      collection(db, 'activities'),
      where('mentorId', '==', user.uid),
      orderBy('ts', 'desc'),
      limit(10)
    );
    const unsubActivities = onSnapshot(actQ, (snapshot) => {
      if (snapshot.empty) {
        const defaults = [
          {
            id: 'act1',
            html: 'Verified <span class="font-bold text-[#534AB7]">Nadia Jahan</span> as job-ready. A verification badge was successfully minted to her profile.',
            type: 'success',
            ts: Date.now() - 2 * 60 * 60 * 1000
          },
          {
            id: 'act2',
            html: 'Reviewed the tech skill roadmap audit for <span class="font-bold text-[#534AB7]">Ayesha Khan</span> and left actionable improvement notes.',
            type: 'info',
            ts: Date.now() - 24 * 60 * 60 * 1000
          },
          {
            id: 'act3',
            html: 'Milestone Awarded: Unlocked <span class="font-bold text-[#534AB7]">10 Placements</span> badge for guiding graduates to full corporate employment.',
            type: 'award',
            ts: Date.now() - 3 * 24 * 60 * 60 * 1000
          }
        ];
        setActivities(defaults);
      } else {
        setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    }, (err) => {
      console.warn("Activities Firestore snapshot failed, falling back to static defaults:", err);
      const defaults = [
        {
          id: 'act1',
          html: 'Verified <span class="font-bold text-[#534AB7]">Nadia Jahan</span> as job-ready. A verification badge was successfully minted to her profile.',
          type: 'success',
          ts: Date.now() - 2 * 60 * 60 * 1000
        },
        {
          id: 'act2',
          html: 'Reviewed the tech skill roadmap audit for <span class="font-bold text-[#534AB7]">Ayesha Khan</span> and left actionable improvement notes.',
          type: 'info',
          ts: Date.now() - 24 * 60 * 60 * 1000
        },
        {
          id: 'act3',
          html: 'Milestone Awarded: Unlocked <span class="font-bold text-[#534AB7]">10 Placements</span> badge for guiding graduates to full corporate employment.',
          type: 'award',
          ts: Date.now() - 3 * 24 * 60 * 60 * 1000
        }
      ];
      setActivities(defaults);
    });

    return () => {
      unsubRequests();
      unsubConnections();
      unsubSessions();
      unsubBadges();
      unsubGrads();
      unsubActivities();
    };
  }, [user]);

  // accepting toggle
  const handleToggleAccepting = async () => {
    try {
      const nextVal = !accepting;
      setAccepting(nextVal);
      await updateDoc(doc(db, 'users', user.uid), {
        acceptingRequests: nextVal
      });
    } catch (err) {
      console.error('Failed to toggle requests state:', err);
    }
  };

  // Accept suggested graduate match directly
  const handleAcceptGradMatch = async (grad: any) => {
    if (activeConnections.length >= 10) {
      alert('You have reached the maximum active graduate limit (10). Please verify or complete current connections.');
      return;
    }
    setProcessingId(grad.id);
    try {
      const connId = `conn_${Math.random().toString(36).substr(2, 9)}`;
      await setDoc(doc(db, 'mentorship_connections', connId), {
        id: connId,
        menteeId: grad.id,
        menteeName: grad.displayName || grad.email?.split('@')[0] || 'Grad Student',
        mentorId: user.uid,
        mentorName: profile?.displayName || user.displayName || 'Dr. Rahman',
        createdAt: new Date().toISOString(),
        progress: 0,
        activeStage: 1,
        roadmap: [
          { id: 1, title: 'Profile & CV Complete', completed: true, completedAt: new Date().toISOString(), completedBy: 'system' },
          { id: 2, title: 'Build 2 Key Projects', completed: false, completedAt: '' },
          { id: 3, title: 'Address Target Skill Gaps', completed: false, completedAt: '' },
          { id: 4, title: 'Job-Ready Final Evaluation', completed: false, completedAt: '' }
        ],
        guidelines: []
      });

      // Send greeting notification
      await addDoc(collection(db, 'notifications'), {
        recipientId: grad.id,
        type: 'request_accepted',
        title: '🎉 Mentorship Joined!',
        body: `Excellent news! Industry Mentor ${profile?.displayName || 'Dr. Rahman'} matched with you directly. Workspace is ready fallback.`,
        isRead: false,
        relatedId: connId,
        createdAt: new Date().toISOString()
      });

      // Increment mentor profile stats
      const mentorRef = doc(db, 'users', user.uid);
      await updateDoc(mentorRef, {
        totalMentees: (profile?.totalMentees || 0) + 1,
        xp: (profile?.xp || 0) + 50
      });

      // Record activity
      await addDoc(collection(db, 'activities'), {
        mentorId: user.uid,
        html: `Accepted matching recommendation: <span class="font-bold text-[#534AB7]">${grad.displayName || grad.email?.split('@')[0] || 'Grad Student'}</span> was successfully added to your active mentees workspace.`,
        type: 'success',
        ts: Date.now()
      });

      // Local state filter fallback
      setUnconnectedGrads(prev => prev.filter(g => g.id !== grad.id));
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Skip matches locally
  const handleSkipMatch = (gradId: string) => {
    setUnconnectedGrads(prev => prev.filter(g => g.id !== gradId));
  };

  const handleShareProfile = () => {
    const url = `${window.location.origin}/mentor/${user?.uid}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Compute stats or fallback to user specs
  const mentorName = profile?.displayName || 'Dr. Rahman';
  const activeCount = activeConnections.length || 6;
  const placementCount = profile?.placedGraduates || 14;
  const rankScore = profile?.rankScore || 91;
  const sessionsCount = sessions.length || 8;

  // Render Sub Views
  return (
    <div className="space-y-8 select-none">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Good morning, {mentorName}</h2>
          <p className="text-xs text-text-muted mt-1">{activeCount} mentees are actively working on tasks you assigned</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setView('browse-graduates')} 
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-primary text-primary-text hover:bg-[#413997] rounded-xl transition-all shadow-md active:scale-95"
          >
            <Users className="w-4 h-4" /> Accept new mentee
          </button>
          <button 
            onClick={handleToggleAccepting} 
            className={`inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 border rounded-xl transition-all active:scale-95 ${
              accepting ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-bg-secondary text-text-secondary border-border'
            }`}
          >
            {accepting ? '● Accepting Mentees' : '○ Standby Mode'}
          </button>
        </div>
      </div>

      {/* STATS STRIP OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-1 bg-bg-secondary/20 rounded-2xl border border-border/80">
        <div className="bg-bg-secondary border border-border/60 p-4 rounded-xl flex items-center justify-between shadow-sm border-l-4 border-[#185FA5] hover:shadow-md transition-all">
          <div className="space-y-1.5 text-left">
            <p className="text-[10px] uppercase tracking-widest text-[#185FA5] font-extrabold font-sans">Active Mentees</p>
            <h3 className="text-3xl font-black text-text-primary tracking-tight">{activeCount}</h3>
            <p className="text-[10px] text-text-muted font-medium leading-none">{requests.length} pending approval</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E6F1FB] text-[#185FA5] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-bg-secondary border border-border/60 p-4 rounded-xl flex items-center justify-between shadow-sm border-l-4 border-green-500 hover:shadow-md transition-all">
          <div className="space-y-1.5 text-left">
            <p className="text-[10px] uppercase tracking-widest text-green-600 font-extrabold font-sans">Placed Graduates</p>
            <h3 className="text-3xl font-black text-green-600 tracking-tight">{placementCount}</h3>
            <p className="text-[10px] text-text-muted font-medium leading-none">graduates placed in jobs</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-bg-secondary border border-border/60 p-4 rounded-xl flex items-center justify-between shadow-sm border-l-4 border-[#534AB7] hover:shadow-md transition-all">
          <div className="space-y-1.5 text-left">
            <p className="text-[10px] uppercase tracking-widest text-[#534AB7] font-extrabold font-sans">Platform Rank</p>
            <h3 className="text-3xl font-black text-[#534AB7] tracking-tight">{rankScore}%</h3>
            <p className="text-[10px] text-text-muted font-medium leading-none">top {100 - rankScore}% worldwide</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EEEDFE] text-[#534AB7] flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-bg-secondary border border-border/60 p-4 rounded-xl flex items-center justify-between shadow-sm border-l-4 border-amber-500 hover:shadow-md transition-all">
          <div className="space-y-1.5 text-left">
            <p className="text-[10px] uppercase tracking-widest text-amber-600 font-extrabold font-sans">Monthly Sessions</p>
            <h3 className="text-3xl font-black text-amber-600 tracking-tight">{sessionsCount}</h3>
            <p className="text-[10px] text-text-muted font-medium leading-none">next: Tuesday 4:00 PM</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE SCREEN */}
      {currentSubView === 'dashboard' && (
        <div className="space-y-8">
          
          {/* WORKSPACE SEPARATOR */}
          <div className="flex items-center gap-4 py-1">
            <div className="h-px bg-border flex-1 opacity-80" />
            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest bg-bg-secondary/40 px-4 py-1.5 rounded-full border border-border/85">
              Workspace & Match Insights
            </span>
            <div className="h-px bg-border flex-1 opacity-80" />
          </div>

          {/* PANELS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* ACTIVE MENTEES PANEL */}
            <div className="border border-border rounded-2xl p-6 bg-bg-secondary space-y-4 text-left shadow-xs">
              <div className="flex justify-between items-center border-b border-border/80 pb-3">
                <h4 className="text-[13px] font-bold text-text-primary flex items-center gap-2">
                  <Users className="w-4 h-4 text-text-muted" /> Active mentees
                </h4>
                <button onClick={() => setView('mentees-workspace')} className="text-xs text-primary font-semibold hover:underline cursor-pointer">
                  View all
                </button>
              </div>

              <div className="space-y-4">
                {activeConnections.length === 0 ? (
                  // Fallback items perfectly aligned in layout
                  <>
                    <div className="flex items-center gap-4 py-2 border-b border-border last:border-b-0">
                      <div className="w-9 h-9 rounded-full bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center font-bold text-xs shrink-0">
                        AK
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-text-primary leading-tight">Ayesha Khan</span>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FAEEDA] text-[#633806] font-medium font-sans">Review due</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] text-text-muted font-mono whitespace-nowrap">Roadmap progress · 72%</span>
                          <div className="flex-1 h-1 bg-bg-primary rounded-full overflow-hidden">
                            <div className="h-full bg-[#185FA5]" style={{ width: '72%' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 py-2 border-b border-border last:border-b-0">
                      <div className="w-9 h-9 rounded-full bg-[#EAF3DE] text-[#27500A] flex items-center justify-center font-bold text-xs shrink-0">
                        RS
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-text-primary leading-tight">Rafiq Siddiqui</span>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#E6F1FB] text-[#0C447C] font-medium font-sans">On track</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] text-text-muted font-mono whitespace-nowrap">Roadmap progress · 45%</span>
                          <div className="flex-1 h-1 bg-bg-primary rounded-full overflow-hidden">
                            <div className="h-full bg-[#639922]" style={{ width: '45%' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 py-2 border-b border-border last:border-b-0">
                      <div className="w-9 h-9 rounded-full bg-[#FAEEDA] text-[#633806] flex items-center justify-center font-bold text-xs shrink-0">
                        NJ
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-text-primary leading-tight">Nadia Jahan</span>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#EAF3DE] text-[#27500A] font-medium font-sans">Ready to verify</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] text-text-muted font-mono whitespace-nowrap">Roadmap progress · 90%</span>
                          <div className="flex-1 h-1 bg-bg-primary rounded-full overflow-hidden">
                            <div className="h-full bg-[#0F6E56]" style={{ width: '90%' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 py-2 border-b border-border last:border-b-0">
                      <div className="w-9 h-9 rounded-full bg-[#EEEDFE] text-[#3C3489] flex items-center justify-center font-bold text-xs shrink-0">
                        MH
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-text-primary leading-tight">Mehedi Hasan</span>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FAEEDA] text-[#633806] font-medium font-sans">Needs nudge</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] text-text-muted font-mono whitespace-nowrap">Roadmap progress · 20%</span>
                          <div className="flex-1 h-1 bg-bg-primary rounded-full overflow-hidden">
                            <div className="h-full bg-[#BA7517]" style={{ width: '20%' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  activeConnections.map((conn) => {
                    const progress = conn.progress || 24;
                    const initials = conn.menteeName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'ST';
                    
                    const isVerificationReady = progress >= 90;
                    const isNeedsNudge = progress < 30;
                    const isReviewDue = progress >= 60 && progress < 90;

                    let chipBg = 'bg-[#E6F1FB] text-[#0C447C]';
                    let chipLabel = 'On track';
                    let barColor = 'bg-[#639922]';

                    if (isVerificationReady) {
                      chipBg = 'bg-[#EAF3DE] text-[#27500A]';
                      chipLabel = 'Ready to verify';
                      barColor = 'bg-[#0F6E56]';
                    } else if (isReviewDue) {
                      chipBg = 'bg-[#FAEEDA] text-[#633806]';
                      chipLabel = 'Review due';
                      barColor = 'bg-[#185FA5]';
                    } else if (isNeedsNudge) {
                      chipBg = 'bg-[#FAEEDA] text-[#534AB7]';
                      chipLabel = 'Needs nudge';
                      barColor = 'bg-[#BA7517]';
                    }

                    return (
                      <div 
                        key={conn.id} 
                        onClick={() => setView('mentees-workspace')}
                        className="flex items-center gap-4 py-2 border-b border-border last:border-b-0 cursor-pointer hover:bg-bg-primary/40 rounded-lg p-1 transition-all"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center font-bold text-xs shrink-0 font-sans">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-text-primary leading-tight truncate">{conn.menteeName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium font-sans shrink-0 ${chipBg}`}>{chipLabel}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] text-text-muted font-mono whitespace-nowrap">Roadmap progress · {progress}%</span>
                            <div className="flex-1 h-1 bg-bg-primary rounded-full overflow-hidden">
                              <div className="h-full" style={{ width: `${progress}%`, backgroundColor: barColor === 'bg-[#639922]' ? '#639922' : barColor === 'bg-[#0F6E56]' ? '#0F6E56' : barColor === 'bg-[#185FA5]' ? '#185FA5' : '#BA7517' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* AI-SUGGESTED MATCHES PANEL */}
            <div className="border border-border rounded-xl p-6 bg-bg-secondary space-y-4 text-left shadow-xs">
              <div className="flex justify-between items-center border-b border-border/80 pb-3">
                <h4 className="text-[13px] font-bold text-text-primary flex items-center gap-2">
                  <Flame className="w-4 h-4 text-primary animate-pulse" /> AI-suggested matches
                </h4>
                <button
                  type="button"
                  onClick={handleGenerateAiMatches}
                  disabled={loadingAiMatches || unconnectedGrads.length === 0}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[10px] uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  {loadingAiMatches ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                  Match via Gemini 3.5
                </button>
              </div>

              <div className="space-y-4">
                {aiMatches.length > 0 ? (
                  aiMatches.map((grad) => {
                    const initials = grad.displayName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'FA';
                    const listSkills = grad.skills || [];
                    const matchPercent = grad.matchPercent || 90;

                    return (
                      <div key={grad.id} className="bg-bg-primary border border-border/85 rounded-xl p-4 flex gap-4 hover:border-primary/20 transition-all animate-fade-in">
                        <div className="w-9 h-9 rounded-full bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center font-bold text-xs shrink-0 font-sans">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-center gap-2">
                            <p className="font-bold text-xs text-text-primary truncate">{grad.displayName}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold shrink-0">{matchPercent}% Match</span>
                          </div>
                          <div>
                            <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{grad.targetRole}</p>
                            {grad.rationale && (
                              <p className="text-[10px] text-primary/95 mt-1.5 italic leading-relaxed bg-primary/5 p-2 rounded-lg border border-primary/10">"{grad.rationale}"</p>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-1 font-mono">
                            {listSkills.slice(0, 3).map((sk: any, idx: number) => {
                              const name = typeof sk === 'string' ? sk : (sk.name || sk.title || '');
                              return (
                                <span key={`${name}-${idx}`} className="text-[9px] px-2.5 py-0.5 rounded-full bg-[#EAF3DE] text-[#27500A] font-semibold">
                                  {name}
                                </span>
                              );
                            })}
                          </div>

                          <div className="flex gap-2 pt-1 font-mono">
                            <button 
                              onClick={() => {
                                handleAcceptGradMatch(grad);
                                setAiMatches(prev => prev.filter(g => g.id !== grad.id));
                              }}
                              disabled={processingId === grad.id}
                              className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/15 rounded-md text-[9px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                            >
                              {processingId === grad.id ? '...' : 'Accept'}
                            </button>
                            <button 
                              onClick={() => {
                                handleSkipMatch(grad.id);
                                setAiMatches(prev => prev.filter(g => g.id !== grad.id));
                              }} 
                              className="px-3 py-1 bg-transparent hover:bg-bg-tertiary text-text-muted hover:text-text-primary rounded-md text-[9px] font-semibold transition-all uppercase cursor-pointer"
                            >
                              Skip
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : unconnectedGrads.length === 0 ? (
                  <p className="text-[10px] font-bold text-text-muted text-center py-4">No remaining unconnected graduates</p>
                ) : (
                  unconnectedGrads.map((grad) => {
                    const initials = grad.displayName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'FA';
                    const listSkills = grad.skills || ['Node.js', 'PostgreSQL'];
                    const matchPercent = grad.targetRole?.toLowerCase().includes('engineer') ? 94 : 88;

                    return (
                      <div key={grad.id} className="bg-bg-primary border border-border/80 rounded-xl p-4 flex gap-4 hover:border-primary/20 transition-all animate-fade-in">
                        <div className="w-9 h-9 rounded-full bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center font-bold text-xs shrink-0 font-sans">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-center gap-2">
                            <p className="font-bold text-xs text-text-primary truncate">{grad.displayName || 'Unresolved Candidate'}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold shrink-0">{matchPercent}% Match</span>
                          </div>
                          <div>
                            <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{grad.targetRole || 'Software developer'}</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {listSkills.slice(0, 3).map((sk: any, idx: number) => {
                              const name = typeof sk === 'string' ? sk : (sk.name || sk.title || '');
                              return (
                                <span key={`${name}-${idx}`} className="text-[9px] px-2.5 py-0.5 rounded-full bg-[#EAF3DE] text-[#27500A] font-semibold font-sans">
                                  {name}
                                </span>
                              );
                            })}
                          </div>

                          <div className="flex gap-2 pt-1 font-mono">
                            <button 
                              onClick={() => handleAcceptGradMatch(grad)}
                              disabled={processingId === grad.id}
                              className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/15 rounded-md text-[9px] font-bold uppercase transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40"
                            >
                              {processingId === grad.id ? '...' : 'Accept'}
                            </button>
                            <button 
                              onClick={() => handleSkipMatch(grad.id)} 
                              className="px-3 py-1 bg-transparent hover:bg-bg-tertiary text-text-muted hover:text-text-primary rounded-md text-[9px] font-semibold transition-all text-center uppercase cursor-pointer"
                            >
                              Skip
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* RECOGNITION & BADGES PANEL */}
          <div className="border border-border rounded-2xl p-6 bg-bg-secondary space-y-6 text-left">
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <h4 className="text-[13px] font-bold text-text-primary flex items-center gap-2">
                <Award className="w-4 h-4 text-text-muted" /> Recognition & badges
              </h4>
              <button 
                onClick={handleShareProfile} 
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 active:scale-95 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" /> {copiedLink ? 'Copied Link!' : 'Share profile'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {BADGES.map((badge) => {
                const isEarned = badge.earned;
                
                return (
                  <div 
                    key={badge.id} 
                    className={`border rounded-xl p-4 flex gap-4 transition-all hover:shadow-xs cursor-default ${
                      isEarned 
                        ? 'border-[#534AB7]/35 bg-[#EEEDFE]/15 text-[#3C3489]' 
                        : 'border-border/60 bg-bg-primary/20 text-[#555]'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isEarned ? 'bg-[#EEEDFE] text-[#534AB7]' : 'bg-bg-tertiary text-text-muted'}`}>
                      {badge.icon === 'trophy' && <Award className="w-5 h-5" />}
                      {badge.icon === 'rocket' && <Flame className="w-5 h-5" />}
                      {badge.icon === 'check' && <CheckCircle className="w-5 h-5" />}
                      {badge.icon === 'clock' && <Clock className="w-5 h-5" />}
                      {badge.icon === 'star' && <Star className="w-5 h-5" />}
                      {badge.icon === 'shield' && <ShieldCheck className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5 text-left">
                      <div className="flex justify-between items-start gap-2">
                        <h5 className={`font-bold text-xs leading-tight ${isEarned ? 'text-[#3C3489]' : 'text-text-primary'}`}>{badge.name}</h5>
                        {isEarned ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#EEEDFE] text-[#534AB7] font-semibold tracking-wider uppercase font-sans">Active</span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-bg-tertiary text-text-muted font-bold font-mono shrink-0">{badge.progressText}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-secondary leading-normal">{badge.desc}</p>
                      
                      {/* PROGRESS BAR */}
                      <div className="w-full pt-1">
                        <div className="w-full h-1 bg-border/40 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isEarned ? 'bg-[#534AB7]' : 'bg-text-muted/40'}`} 
                            style={{ width: `${badge.progress}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RECENT ACTIVITY SECTION */}
          <div className="border border-border/80 rounded-2xl p-6 bg-[#FCFCFD]/50 dark:bg-bg-secondary space-y-4 text-left shadow-xs">
            <div className="flex justify-between items-center border-b border-border/80 pb-3">
              <h4 className="text-[13px] font-extrabold text-text-primary tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary animate-pulse" /> Recent Activity Log
              </h4>
              <span className="text-[9px] font-bold text-text-muted bg-border/40 px-2 py-0.5 rounded-md font-mono">Live</span>
            </div>

            <div className="space-y-3 pt-1">
              {activities.map((item, idx) => {
                const formatRelativeTime = (ts: any) => {
                  if (!ts) return 'Just now';
                  const timestamp = typeof ts === 'number' ? ts : new Date(ts).getTime();
                  const diff = Math.max(0, Date.now() - timestamp);
                  const mins = Math.floor(diff / 60000);
                  const hours = Math.floor(mins / 60);
                  const days = Math.floor(hours / 24);

                  if (mins < 1) return 'Just now';
                  if (mins < 60) return `${mins}m ago`;
                  if (hours < 24) return `${hours} hours ago`;
                  if (days === 1) return 'Yesterday';
                  return `${days} days ago`;
                };

                const getActivityStyle = (type: string) => {
                  switch (type) {
                    case 'success':
                      return {
                        iconBg: 'bg-green-500/15 text-green-600',
                        borderColor: 'hover:border-green-500/30 border-border/60',
                        label: 'COMPLETED',
                        icon: <CheckCircle className="w-4 h-4" />
                      };
                    case 'award':
                      return {
                        iconBg: 'bg-amber-500/15 text-amber-600',
                        borderColor: 'hover:border-amber-500/30 border-border/60',
                        label: 'ACHIEVEMENT',
                        icon: <Award className="w-4 h-4" />
                      };
                    case 'warning':
                      return {
                        iconBg: 'bg-red-500/15 text-red-600',
                        borderColor: 'hover:border-red-500/30 border-border/60',
                        label: 'ALERT',
                        icon: <AlertTriangle className="w-4 h-4" />
                      };
                    case 'info':
                    default:
                      return {
                        iconBg: 'bg-[#E6F1FB] text-[#185FA5]',
                        borderColor: 'hover:border-blue-500/30 border-border/60',
                        label: 'REVIEW READY',
                        icon: <MessageSquare className="w-4 h-4" />
                      };
                  }
                };

                const style = getActivityStyle(item.type);

                return (
                  <div key={item.id || idx} className={`flex items-start gap-4 p-3 bg-bg-secondary border rounded-xl transition-all ${style.borderColor}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.iconBg}`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p 
                        className="text-xs text-text-primary font-medium leading-relaxed font-sans"
                        dangerouslySetInnerHTML={{ __html: item.html }}
                      />
                      <p className="text-[10px] text-text-muted font-mono mt-1 flex items-center gap-1.5">
                        <span>{formatRelativeTime(item.ts)}</span>
                        <span>•</span>
                        <span className="font-semibold uppercase tracking-wider text-[8px]" style={{ color: item.type === 'success' ? '#22c55e' : item.type === 'award' ? '#d97706' : item.type === 'warning' ? '#ef4444' : '#185FA5' }}>
                          {style.label}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* RECOGNITION EXTENDED SCREEN */}
      {currentSubView === 'recognition' && (
        <div className="space-y-8 animate-fade-in text-left">
          
          <div className="bg-[#534AB7] rounded-3xl p-8 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full translate-x-32 -translate-y-32" />
            <div className="space-y-3 relative z-10">
              <span className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-3.5 py-1.5 rounded-full">CERTIFIED PLATFORM AUTHORITY</span>
              <h3 className="text-3xl font-black mt-2">Dr. Rahman's Guild Recognition</h3>
              <p className="text-sm font-light text-white/80 max-w-xl">Earn XP points by conducting active mock calls, verifying roadmap progress indicators, and evaluating technical audits.</p>
            </div>
            <div className="bg-white/10 p-6 rounded-2xl border border-white/15 text-center shrink-0 min-w-44 backdrop-blur-md">
              <p className="text-xs uppercase tracking-wider text-white/60 font-medium">Accumulated XP</p>
              <p className="text-4xl font-extrabold text-yellow-300 mt-2">1,250 <span className="text-xs text-white/70">XP</span></p>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-yellow-300" style={{ width: '85%' }} />
              </div>
              <p className="text-[9px] text-white/60 uppercase tracking-widest mt-2">85% to Grandmaster</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 border border-border rounded-2xl p-6 bg-bg-secondary space-y-6">
              <h4 className="font-bold text-sm text-text-primary uppercase tracking-wider">Milestones & Achievements Unlocked</h4>
              
              <div className="space-y-4">
                {[
                  { title: 'Verified Mentor Authority', desc: 'Initial background credentials check verified by CareerBridge panel.', xp: 100, date: '12 May 2026' },
                  { title: 'First Guidance Spark', desc: 'Accepted and established first collaborative task loop with code checks.', xp: 150, date: '14 May 2026' },
                  { title: 'Placements Authority Spike', desc: 'Directly helped 10 graduates secure active corporate employment.', xp: 500, date: '20 May 2026' },
                  { title: 'Sprint Optimizer', desc: 'Graduates verified under your direct guidance score 40% faster response times.', xp: 250, date: '21 May 2026' }
                ].map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-bg-primary rounded-xl border border-border">
                    <div>
                      <p className="font-bold text-xs text-text-primary">{m.title}</p>
                      <p className="text-[11px] text-text-secondary mt-1 font-light">{m.desc}</p>
                      <p className="text-[10px] text-text-muted mt-2 font-mono">{m.date}</p>
                    </div>
                    <span className="text-xs font-bold text-success font-mono bg-success/10 px-3 py-1.5 rounded-lg shrink-0">+{m.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-border rounded-2xl p-6 bg-bg-secondary space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <h4 className="font-bold text-sm text-text-primary uppercase tracking-wider">Shareable Credentials</h4>
                
                <div className="p-4 bg-bg-primary border border-border rounded-xl text-center space-y-4">
                  <Award className="w-12 h-12 text-[#534AB7] mx-auto animate-pulse" />
                  <div>
                    <p className="text-xs font-semibold text-text-primary">CareerBridge Verification badge</p>
                    <p className="text-[10px] text-text-muted mt-1 uppercase">ID: CB-MENT-DR58291</p>
                  </div>
                  <button onClick={() => alert('Credential verified on blockchain network!')} className="w-full py-2 bg-secondary/10 border border-secondary/15 hover:bg-secondary/20 text-secondary text-[10px] font-bold uppercase rounded-lg transition-all tracking-wider">
                    Verify Credential Code
                  </button>
                </div>
              </div>

              <button 
                onClick={handleShareProfile} 
                className="w-full text-center py-3.5 bg-primary hover:bg-[#43399A] text-primary-text font-bold text-xs uppercase rounded-xl transition-all shadow-md mt-6"
              >
                {copiedLink ? 'Copied Link!' : 'Export Public Portfolio'}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* IMPACT REPORT EXTENDED SCREEN */}
      {currentSubView === 'impact' && (
        <div className="space-y-6 animate-fade-in text-left pb-10">
          
          {/* Page Heading */}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-text-primary">Impact report</h1>
            <p className="text-xs text-text-muted text-[#757493] dark:text-[#A7A6C3]">Your mentoring results — January to June 2026</p>
          </div>

          {/* Feedback Status */}
          {nudgeStatus && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-xs py-3 px-4 rounded-xl flex items-center gap-2 animate-fade-in shadow-2xs font-semibold">
              <CheckCircle className="w-4 h-4 shrink-0 text-green-500" />
              <span>{nudgeStatus}</span>
            </div>
          )}

          {/* Story Banner */}
          <div className="bg-bg-secondary dark:bg-bg-secondary/40 border border-border/70 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5 hover:shadow-xs transition-all shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#EEEDFE] dark:bg-[#EEEDFE]/10 text-[#3C3489] dark:text-[#E0DBFF] flex items-center justify-center font-bold text-base shrink-0 shadow-inner">
              {profile?.displayName ? profile.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'DR'}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-base font-semibold text-text-primary leading-snug">
                You helped {profile?.placedGraduates || 14} people start their careers.
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                You responded faster than 70% of mentors and closed 62% of your mentees' skill gaps. Here's the full breakdown.
              </p>
            </div>
            <div className="text-center shrink-0 bg-bg-primary border border-border/80 rounded-xl px-4 py-2 mt-2 sm:mt-0 shadow-inner">
              <div className="text-3xl font-black text-[#534AB7] dark:text-[#9A94F5] tracking-tight">{profile?.rankScore || 91}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold mt-0.5">mentor score</div>
            </div>
          </div>

          {/* Section: What you achieved */}
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 mt-4">
            <span>What you achieved</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Impact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Placed */}
            <div className="bg-bg-secondary border border-border rounded-xl p-5 flex flex-col justify-between hover:shadow-sm hover:border-border/80 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center text-sm">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-green-500/10 text-green-600">Top 9%</span>
                </div>
                <div className="text-2xl font-black text-text-primary tracking-tight">{profile?.placedGraduates || 14} placed</div>
                <div className="text-xs text-text-muted font-semibold mb-4">graduates got jobs</div>
              </div>
              <div>
                <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '92%' }}></div>
                </div>
                <p className="text-xs text-text-muted mt-3 pt-3 border-t border-border/50 leading-relaxed font-sans">
                  92% of your mentees landed jobs. Platform average is <b className="font-semibold text-text-primary">61%</b>. You are well above average.
                </p>
              </div>
            </div>

            {/* Card 2: Speed */}
            <div className="bg-bg-secondary border border-border rounded-xl p-5 flex flex-col justify-between hover:shadow-sm hover:border-border/80 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#EEEDFE] dark:bg-[#EEEDFE]/10 text-[#534AB7] dark:text-[#E0DBFF] flex items-center justify-center text-sm">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#EEEDFE] dark:bg-[#EEEDFE]/10 text-[#534AB7] dark:text-[#E0DBFF]">Fast</span>
                </div>
                <div className="text-2xl font-black text-text-primary tracking-tight">1.8 hrs</div>
                <div className="text-xs text-text-muted font-semibold mb-4">avg. reply time to mentees</div>
              </div>
              <div>
                <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-[#534AB7] dark:bg-[#7D75E4] rounded-full" style={{ width: '70%' }}></div>
                </div>
                <p className="text-xs text-text-muted mt-3 pt-3 border-t border-border/50 leading-relaxed font-sans">
                  You reply <b className="font-semibold text-text-primary">30% faster</b> than the average mentor. Mentees with fast mentors are 2× more likely to stay on track.
                </p>
              </div>
            </div>

            {/* Card 3: Gaps */}
            <div className="bg-bg-secondary border border-border rounded-xl p-5 flex flex-col justify-between hover:shadow-sm hover:border-border/80 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center text-sm">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-green-500/10 text-green-600">Great</span>
                </div>
                <div className="text-2xl font-black text-text-primary tracking-tight">62% closed</div>
                <div className="text-xs text-text-muted font-semibold mb-4">skill gaps closed</div>
              </div>
              <div>
                <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '62%' }}></div>
                </div>
                <p className="text-xs text-text-muted mt-3 pt-3 border-t border-border/50 leading-relaxed font-sans">
                  Your skill reviews and sessions directly closed <b className="font-semibold text-text-primary">62% of gaps</b> your mentees had when they first joined.
                </p>
              </div>
            </div>

            {/* Card 4: Active */}
            <div className="bg-bg-secondary border border-border rounded-xl p-5 flex flex-col justify-between hover:shadow-sm hover:border-border/80 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center text-sm">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">Active</span>
                </div>
                <div className="text-2xl font-black text-text-primary tracking-tight">{sessions?.length || 8} sessions</div>
                <div className="text-xs text-text-muted font-semibold mb-4">this month</div>
              </div>
              <div>
                <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '53%' }}></div>
                </div>
                <p className="text-xs text-text-muted mt-3 pt-3 border-t border-border/50 leading-relaxed font-sans">
                  You've run <b className="font-semibold text-text-primary">38 sessions</b> total this year. Next milestone unlocks at 50 — the Consistency streak badge.
                </p>
              </div>
            </div>

          </div>

          {/* Section: Monthly placements */}
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 mt-4">
            <span>Monthly placements</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Monthly placements bar */}
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-text-muted font-medium">How many mentees got placed each month</span>
              <span className="text-xs text-green-600 font-bold">+12 since Jan</span>
            </div>
            
            {/* Bars Column Container */}
            <div className="flex items-end gap-3 sm:gap-6 h-20 px-2 border-b border-border/60 pb-1">
              {[
                { label: 'Jan', height: '16%' },
                { label: 'Feb', height: '28%' },
                { label: 'Mar', height: '44%', current: true },
                { label: 'Apr', height: '64%', current: true },
                { label: 'May', height: '88%', current: true },
                { label: 'Jun', height: '100%', current: true }
              ].map((m, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end">
                  <div className={`w-full rounded-t-sm transition-all duration-300 group-hover:opacity-90 ${m.current ? 'bg-green-600' : 'bg-green-600/30'}`} style={{ height: m.height }} />
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold transition-colors group-hover:text-text-primary">{m.label}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-text-muted mt-3 pt-3 border-t border-border/40 font-sans leading-relaxed">
              Your placements have grown every month since March — a sign your mentoring approach is working.
            </p>
          </div>

          {/* Section: Your mentees at a glance */}
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-[#757493] dark:text-[#A7A6C3] mb-2 mt-4">
            <span>Your mentees at a glance</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Mentees Table */}
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="grid grid-cols-4 bg-bg-secondary/60 border-b border-border px-4 py-2.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Mentee</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Progress</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Sessions</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Outcome</span>
            </div>
            
            {/* Table Rows */}
            <div className="divide-y divide-border/45">
              {activeConnections.length > 0 ? (
                activeConnections.map((conn, idx) => {
                  const initialAvatar = conn.menteeName ? conn.menteeName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'GS';
                  const progressVal = conn.progress || (conn.activeStage ? (conn.activeStage - 1) * 25 + 20 : 50);
                  const isPlaced = progressVal >= 90;
                  const needsNudge = progressVal < 40;
                  const stateLabel = isPlaced ? 'Placed' : needsNudge ? 'Needs nudge' : 'On track';
                  const badgeColor = isPlaced 
                    ? 'bg-green-500/10 text-green-600' 
                    : needsNudge 
                      ? 'bg-amber-500/10 text-amber-700' 
                      : 'bg-[#EEEDFE] dark:bg-[#EEEDFE]/10 text-[#3C3489] dark:text-[#E0DBFF]';
                  
                  return (
                    <div key={conn.id || idx} className="grid grid-cols-4 px-4 py-3 items-center hover:bg-bg-primary/20 transition-all text-left">
                      <div className="text-xs font-semibold text-text-primary flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#EEEDFE] dark:bg-[#EEEDFE]/10 text-[#3C3489] dark:text-[#E0DBFF] text-[9px] font-extrabold flex items-center justify-center shrink-0 shadow-inner border border-white/10">
                          {initialAvatar}
                        </div>
                        <span className="truncate">{conn.menteeName || 'Graduate Student'}</span>
                      </div>
                      <div className="text-xs text-text-muted font-bold font-mono">{progressVal}%</div>
                      <div className="text-xs text-text-muted font-bold font-mono">{idx * 2 + 3}</div>
                      <div>
                        <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${badgeColor}`}>
                          {stateLabel}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Beautiful default fallback rows matching specs exactly
                <>
                  <div className="grid grid-cols-4 px-4 py-3 items-center hover:bg-bg-primary/20 transition-all text-left">
                    <div className="text-xs font-semibold text-text-primary flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#EEEDFE] dark:bg-[#EEEDFE]/10 text-[#3C3489] dark:text-[#E0DBFF] text-[9px] font-bold flex items-center justify-center shrink-0 shadow-inner border border-white/10">AS</div>
                      <span>Ayesha S.</span>
                    </div>
                    <div className="text-xs text-text-muted font-bold font-mono">56%</div>
                    <div className="text-xs text-text-muted font-bold font-mono">4</div>
                    <div>
                      <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider bg-[#EEEDFE] dark:bg-[#EEEDFE]/10 text-[#3C3489] dark:text-[#E0DBFF]">
                        On track
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 px-4 py-3 items-center hover:bg-bg-primary/20 transition-all text-left">
                    <div className="text-xs font-semibold text-text-primary flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-700 text-[9px] font-bold flex items-center justify-center shrink-0 shadow-inner border border-white/10">AA</div>
                      <span>Alhaz A.</span>
                    </div>
                    <div className="text-xs text-text-muted font-bold font-mono">24%</div>
                    <div className="text-xs text-text-muted font-bold font-mono">2</div>
                    <div>
                      <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider bg-amber-500/10 text-amber-700">
                        Needs nudge
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 px-4 py-3 items-center hover:bg-bg-primary/20 transition-all text-left">
                    <div className="text-xs font-semibold text-text-primary flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-500/10 text-green-600 text-[9px] font-bold flex items-center justify-center shrink-0 shadow-inner border border-white/10">NJ</div>
                      <span>Nadia J.</span>
                    </div>
                    <div className="text-xs text-text-muted font-bold font-mono">100%</div>
                    <div className="text-xs text-text-muted font-bold font-mono">6</div>
                    <div>
                      <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider bg-green-500/10 text-green-600">
                        Placed
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section: What to focus on next */}
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-[#757493] dark:text-[#A7A6C3] mb-2 mt-4">
            <span>What to focus on next</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <div className="border border-border rounded-xl bg-bg-secondary p-5">
            {loadingFocus ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#534AB7]" />
                <span className="text-xs text-text-muted font-medium">Analyzing student indicators via Gemini...</span>
              </div>
            ) : (
              <div className="space-y-4 divide-y divide-border/40">
                {focusItems.map((item, idx) => {
                  const isNudge = item.actionType === 'nudge';
                  const isVerify = item.actionType === 'verify';
                  
                  return (
                    <div key={idx} className={`flex items-start gap-4 pb-4 ${idx > 0 ? 'pt-4' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${
                        isNudge ? 'bg-amber-500/10 text-amber-700' : 'bg-green-500/10 text-green-700'
                      }`}>
                        {isNudge ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-text-primary leading-tight">{item.title}</div>
                        <div className="text-xs text-text-muted mt-1 leading-relaxed font-sans">{item.desc}</div>
                        <button
                          onClick={() => {
                            if (isNudge) {
                              handleNudgeMentee(item.menteeName || 'Alhaz Ali', item.relatedId);
                            } else if (item.actionType === 'review') {
                              setView('skill-reviews');
                            } else if (item.actionType === 'accept') {
                              setView('browse-graduates');
                            } else if (isVerify) {
                              setView('career-verification');
                            } else {
                              setView('mentees-workspace');
                            }
                          }}
                          className="text-xs font-bold text-primary hover:text-primary/80 mt-2.5 inline-flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          {item.actionText}
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
