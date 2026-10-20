import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, query, where, onSnapshot, doc, getDoc, 
  updateDoc, addDoc, setDoc, getDocs 
} from 'firebase/firestore';
import { 
  Users, ChevronRight, Search, Clock, Check, X, 
  ArrowUpRight, Heart, Star, Sparkles, MessageSquare,
  ShieldCheck, AlertCircle, Award, Briefcase, RefreshCw, Layers, User, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MentorMenteesWorkspace } from './MentorMenteesWorkspace';
import { PublicProfileModal } from './PublicProfileModal';

export function MyMenteesOverview({ setView }: { setView: (view: string) => void }) {
  const { profile, user } = useAuth();
  
  // Tab states
  const [activeSubTab, setActiveSubTab] = useState<'connected' | 'requests' | 'all-graduates'>('connected');
  
  // Data list states
  const [connections, setConnections] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allGraduates, setAllGraduates] = useState<any[]>([]);
  
  // UI Loading & Interaction
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailedConnectionId, setDetailedConnectionId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalData, setProfileModalData] = useState<any | null>(null);

  // Load Firestore collections
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // 1. Load active mentorship connections
    const connQ = query(
      collection(db, 'mentorship_connections'),
      where('mentorId', '==', user.uid)
    );
    const unsubConnections = onSnapshot(connQ, (snap) => {
      setConnections(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    // 2. Load incoming / pending mentorship requests
    const requestsQ = query(
      collection(db, 'mentorship_requests'),
      where('mentorId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubRequests = onSnapshot(requestsQ, (snap) => {
      setPendingRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Load all graduates (the users in this website)
    const gradsQ = query(
      collection(db, 'users'),
      where('role', '==', 'graduate')
    );
    const unsubGrads = onSnapshot(gradsQ, (snap) => {
      setAllGraduates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubConnections();
      unsubRequests();
      unsubGrads();
    };
  }, [user]);

  // Accept a pending request from graduate
  const handleAcceptRequest = async (request: any) => {
    const activeCount = connections.filter(c => c.status !== 'concluded').length;
    if (activeCount >= 10) {
      alert('You have reached your active mentee limit (10). Please complete current mentees before accepting more.');
      return;
    }
    setProcessingId(request.id);
    try {
      const connId = `conn_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create actual active connection
      await setDoc(doc(db, 'mentorship_connections', connId), {
        id: connId,
        menteeId: request.menteeId,
        menteeName: request.menteeName,
        mentorId: user.uid,
        mentorName: profile?.displayName || user.displayName || 'Industry Mentor',
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

      // Update mentorship request status
      await updateDoc(doc(db, 'mentorship_requests', request.id), {
        status: 'accepted'
      });

      // Send student notification
      await addDoc(collection(db, 'notifications'), {
        recipientId: request.menteeId,
        type: 'request_accepted',
        title: '🎉 Mentorship Joined!',
        body: `Fantastic! Industry Mentor ${profile?.displayName || 'Dr. Rahman'} accepted your matching request.`,
        isRead: false,
        relatedId: connId,
        createdAt: new Date().toISOString()
      });

      // Increment total mentees & give bonus XP
      await updateDoc(doc(db, 'users', user.uid), {
        totalMentees: (profile?.totalMentees || 0) + 1,
        xp: (profile?.xp || 0) + 50
      });

      alert('Mentorship connection established successfully!');
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Reject/Decline pending request
  const handleRejectRequest = async (requestId: string) => {
    if (!confirm('Decline this mentorship request?')) return;
    setProcessingId(requestId);
    try {
      await updateDoc(doc(db, 'mentorship_requests', requestId), {
        status: 'declined'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Direct connect invite from mentor to a graduate student
  const handleInviteGraduate = async (grad: any) => {
    const activeCount = connections.filter(c => c.status !== 'concluded').length;
    if (activeCount >= 10) {
      alert('Active mentee slots full (10). Cannot add more candidates.');
      return;
    }
    setProcessingId(grad.id);
    try {
      const isAlreadyRequested = pendingRequests.some(r => r.menteeId === grad.id);
      if (isAlreadyRequested) {
        alert('A connection request is already pending for this graduate.');
        return;
      }

      // Check if already connected
      const isConnected = connections.some(c => c.menteeId === grad.id);
      if (isConnected) {
        alert('You are already connected with this graduate student.');
        return;
      }

      // Direct Connection creation for immediate workflow
      const connId = `conn_${Math.random().toString(36).substr(2, 9)}`;
      await setDoc(doc(db, 'mentorship_connections', connId), {
        id: connId,
        menteeId: grad.id,
        menteeName: grad.displayName || grad.email?.split('@')[0] || 'Graduate Student',
        mentorId: user.uid,
        mentorName: profile?.displayName || user.displayName || 'Industry Mentor',
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

      // Send invite notifications
      await addDoc(collection(db, 'notifications'), {
        recipientId: grad.id,
        type: 'request_accepted',
        title: '🌟 Mentor Joined Your Space!',
        body: `Industry Mentor ${profile?.displayName || 'Dr. Rahman'} connected with you! Let's build your career roadmap together.`,
        isRead: false,
        relatedId: connId,
        createdAt: new Date().toISOString()
      });

      // Increment total mentees
      await updateDoc(doc(db, 'users', user.uid), {
        totalMentees: (profile?.totalMentees || 0) + 1,
        xp: (profile?.xp || 0) + 30
      });

      alert(`Directly connected with ${grad.displayName || 'Graduate Student'}!`);
      setActiveSubTab('connected');
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Drilldown Connection Renderer
  if (detailedConnectionId) {
    const activeConnObj = connections.find(c => c.id === detailedConnectionId);
    return (
      <div className="space-y-4">
        <button 
          onClick={() => setDetailedConnectionId(null)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary px-4 py-2 bg-bg-secondary rounded-xl border border-border transition-all active:scale-95"
        >
          ← Back to Mentorship Hub
        </button>
        {activeConnObj ? (
          <MentorMenteesWorkspace initialTab="roadmap" passedConnectionId={detailedConnectionId} />
        ) : (
          <div className="text-center py-20 text-text-muted">Loading customized candidate workspace...</div>
        )}
      </div>
    );
  }

  // Filter lists based on Search Query
  const searchLower = searchQuery.toLowerCase();
  
  const filteredConnections = connections.filter(c => 
    c.menteeName?.toLowerCase().includes(searchLower)
  );

  const filteredRequests = pendingRequests.filter(r => 
    r.menteeName?.toLowerCase().includes(searchLower)
  );

  const filteredAllGrads = allGraduates.filter(g => {
    const name = g.displayName || '';
    const role = g.targetRole || '';
    const skills = (g.skills || []).map((sk: any) => typeof sk === 'string' ? sk : (sk.name || sk.title || '')).join(' ');
    return name.toLowerCase().includes(searchLower) || 
           role.toLowerCase().includes(searchLower) ||
           skills.toLowerCase().includes(searchLower);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 text-left animate-fade-in select-none">
      
      {/* HEADER BLOCK */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#EC4899]">Recruit & Guide Guild</p>
          <h1 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight">My Mentorship Hub</h1>
          <p className="text-text-secondary text-sm font-light italic">
            Coordinate matching requests, oversee roadmap stages, and explore our graduate pipeline.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72 shrink-0">
          <input 
            type="text" 
            placeholder="Search candidates & tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary border border-border rounded-xl text-xs outline-none focus:border-[#EC4899] text-text-primary placeholder:text-text-muted"
          />
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
        </div>
      </header>

      {/* TABS SELECTOR (Styled elegant & similar to browse graduates page layout) */}
      <div className="flex border-b border-border/60 text-[11px] font-bold uppercase tracking-widest gap-8 relative">
        <button 
          onClick={() => setActiveSubTab('connected')}
          className={`pb-4 border-b-2 transition-all relative ${
            activeSubTab === 'connected' ? 'border-[#EC4899] text-text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Connected Mentees ({connections.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('requests')}
          className={`pb-4 border-b-2 transition-all relative ${
            activeSubTab === 'requests' ? 'border-[#EC4899] text-text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Mentorship Requests ({pendingRequests.length})
          {pendingRequests.length > 0 && (
            <span className="absolute -top-1.5 -right-3.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          )}
        </button>
        <button 
          onClick={() => setActiveSubTab('all-graduates')}
          className={`pb-4 border-b-2 transition-all ${
            activeSubTab === 'all-graduates' ? 'border-[#EC4899] text-text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Browse All Graduates ({allGraduates.length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs uppercase tracking-widest text-text-muted font-bold font-mono">Synchronizing directories...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          
          {/* TAB 1: CONNECTED MENTEES */}
          {activeSubTab === 'connected' && (
            <motion.div 
              key="connected"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredConnections.length === 0 ? (
                <div className="col-span-full text-center py-24 border border-dashed border-border rounded-2xl bg-bg-secondary space-y-4">
                  <Users className="w-12 h-12 text-text-muted/40 mx-auto" />
                  <h3 className="text-lg font-bold text-text-primary">No Connected Mentees</h3>
                  <p className="text-xs text-text-secondary">Accept incoming matching requests, or browse all graduates to establish mentorship.</p>
                </div>
              ) : (
                filteredConnections.map((conn) => {
                  const initials = conn.menteeName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'ST';
                  const isReady = conn.progress >= 100;
                  const isConcluded = conn.status === 'concluded';

                  return (
                    <div 
                      key={conn.id} 
                      className={`border transition-all rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-sm group ${
                        isConcluded 
                          ? 'bg-bg-secondary/60 border-amber-500/25' 
                          : 'bg-bg-secondary border-border hover:border-primary/20'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-md ${
                              isConcluded ? 'bg-amber-500/10 text-amber-600' : 'bg-[#534AB7]/10 text-[#534AB7]'
                            }`}>
                              {initials}
                            </div>
                            <div>
                              <h4 className="font-bold text-text-primary text-md leading-tight group-hover:text-[#534AB7] transition-colors">{conn.menteeName}</h4>
                              <p className={`text-[11px] mt-0.5 uppercase tracking-wider font-semibold ${isConcluded ? 'text-amber-600' : 'text-text-muted'}`}>
                                {isConcluded ? 'Concluded Mentee' : 'Active Companion'}
                              </p>
                            </div>
                          </div>
                          {isConcluded ? (
                            <span className="text-[9px] px-2.5 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full font-bold flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> ARCHIVED
                            </span>
                          ) : isReady ? (
                            <span className="text-[9px] px-2.5 py-1 bg-green-500/10 text-green-500 border border-green-500/15 rounded-full font-bold">READY CERTIFICATION</span>
                          ) : null}
                        </div>

                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-text-secondary font-medium">Roadmap Progress</span>
                            <span className="font-bold text-primary">{conn.progress || 0}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${conn.progress || 0}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-border/60 pt-4 flex justify-between items-center">
                        <span className="text-[10px] text-text-muted font-mono uppercase">ESTABLISHED: {new Date(conn.createdAt).toLocaleDateString()}</span>
                        <button 
                          onClick={() => setDetailedConnectionId(conn.id)}
                          className={`inline-flex items-center gap-1.5 text-xs font-bold hover:underline ${
                            isConcluded ? 'text-amber-600' : 'text-[#534AB7]'
                          }`}
                        >
                          {isConcluded ? 'View Archive' : 'Open Workspace'} <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* TAB 2: MENTORSHIP REQUESTS */}
          {activeSubTab === 'requests' && (
            <motion.div 
              key="requests"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredRequests.length === 0 ? (
                <div className="col-span-full text-center py-24 border border-dashed border-border rounded-2xl bg-bg-secondary space-y-4">
                  <Clock className="w-12 h-12 text-text-muted/40 mx-auto animate-pulse" />
                  <h3 className="text-lg font-bold text-text-primary">No Pending Requests Found</h3>
                  <p className="text-xs text-text-secondary">We'll alert you immediately when graduates request your expertise matching.</p>
                </div>
              ) : (
                filteredRequests.map((req) => {
                  const initials = req.menteeName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'ST';

                  return (
                    <div 
                      key={req.id} 
                      className="bg-bg-secondary border border-border rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-sm"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between animate-pulse">
                          <span className="text-[9px] px-2.5 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full font-bold uppercase tracking-wider">PENDING REVIEW</span>
                          <span className="text-[10px] text-text-muted font-mono">{new Date(req.createdAt || req.timestamp).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-bold text-md">
                            {initials}
                          </div>
                          <div>
                            <h4 className="font-bold text-text-primary text-md leading-tight">{req.menteeName}</h4>
                            <p className="text-xs text-text-muted mt-0.5">Wants you as Industry Mentor</p>
                          </div>
                        </div>

                        {req.message && (
                          <div className="bg-bg-primary/50 text-xs text-text-secondary p-3.5 rounded-xl border border-border/40 italic leading-relaxed">
                            "{req.message}"
                          </div>
                        )}

                        {/* View Submitted Analytical Dossier Button */}
                        <button
                          onClick={() => {
                            const grObj = allGraduates.find(g => g.id === req.menteeId || g.uid === req.menteeId) || {};
                            setProfileModalData({
                              ...grObj,
                              ...req,
                              displayName: req.menteeName,
                              bio: req.message || 'No introduction provided.'
                            });
                            setProfileModalOpen(true);
                          }}
                          className="w-full py-2 bg-primary-light hover:bg-[#534AB7]/20 border border-[#534AB7]/10 text-[#534AB7] font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-2"
                        >
                          <User className="w-3.5 h-3.5" /> View Analytical CV
                        </button>
                      </div>

                      <div className="border-t border-border/60 pt-4 flex gap-2">
                        <button 
                          onClick={() => handleAcceptRequest(req)}
                          disabled={processingId === req.id}
                          className="flex-1 py-2 bg-success text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 hover:brightness-105"
                        >
                          {processingId === req.id ? 'Connecting...' : 'Accept'}
                        </button>
                        <button 
                          onClick={() => handleRejectRequest(req.id)}
                          disabled={processingId === req.id}
                          className="px-4 py-2 bg-bg-primary text-text-muted border border-border font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:bg-bg-tertiary"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* TAB 3: BROWSE ALL GRADUATES (The same premium card designs) */}
          {activeSubTab === 'all-graduates' && (
            <motion.div 
              key="graduates"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredAllGrads.length === 0 ? (
                <div className="col-span-full text-center py-24 border border-dashed border-border rounded-2xl bg-bg-secondary space-y-4">
                  <Search className="w-12 h-12 text-text-muted/40 mx-auto" />
                  <h3 className="text-lg font-bold text-text-primary">No Graduates Registered Yet</h3>
                  <p className="text-xs text-text-secondary">Please check again later as graduates submit completed CVs.</p>
                </div>
              ) : (
                filteredAllGrads.map((grad) => {
                  const initials = grad.displayName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'CP';
                  const matchScore = grad.targetRole && profile?.title && grad.targetRole.toLowerCase().split(' ').some((w: string) => profile.title.toLowerCase().includes(w)) ? 96 : 88;
                  const isConnected = connections.some(c => c.menteeId === grad.id);
                  const isInvitePending = pendingRequests.some(r => r.menteeId === grad.id);

                  return (
                    <div 
                      key={grad.id} 
                      className="bg-bg-secondary border border-border hover:border-primary/20 transition-all rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-sm"
                    >
                      <div className="space-y-4 text-left">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-md">
                              {initials}
                            </div>
                            <div>
                              <h4 className="font-bold text-text-primary text-md leading-tight">{grad.displayName || 'Graduate Student'}</h4>
                              <p className="text-xs text-text-muted mt-0.5">{grad.targetRole || 'Software Engineering student'}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-wider">{matchScore}% MATCH</span>
                        </div>

                        {/* Readiness */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-text-secondary font-medium">Job Readiness Score</span>
                            <span className="font-bold text-primary">{grad.readinessScore || grad.meanSkillScore || 0}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${grad.readinessScore || grad.meanSkillScore || 0}%` }} />
                          </div>
                        </div>

                        {/* Skills */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Core Skills</p>
                          <div className="flex flex-wrap gap-1">
                            {grad.skills && grad.skills.length > 0 ? (
                              grad.skills.slice(0, 3).map((sk: any, idx: number) => {
                                const name = typeof sk === 'string' ? sk : (sk.name || sk.title || '');
                                return (
                                  <span key={`${name}-${idx}`} className="text-[9px] px-2.5 py-0.5 bg-bg-primary border border-border text-text-secondary rounded-full font-medium">
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

                      <div className="border-t border-border/60 pt-4 flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setProfileModalData(grad);
                            setProfileModalOpen(true);
                          }}
                          className="w-full text-center py-2 bg-bg-secondary hover:bg-bg-tertiary border border-border text-xs font-bold uppercase rounded-lg text-text-secondary active:scale-95 transition-all outline-none cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <User className="w-3.5 h-3.5 text-primary" /> View CV Profile
                        </button>
                        {isConnected ? (
                          <div className="w-full text-center py-2 bg-success/15 border border-success/10 text-success text-xs font-bold uppercase rounded-lg">Connected Active</div>
                        ) : isInvitePending ? (
                          <div className="w-full text-center py-2 bg-yellow-500/10 border border-yellow-500/10 text-yellow-500 text-xs font-bold uppercase rounded-lg">Invitation Pending</div>
                        ) : (
                          <button 
                            onClick={() => handleInviteGraduate(grad)}
                            disabled={processingId === grad.id}
                            className="w-full text-center py-2 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white text-xs font-bold uppercase rounded-lg active:scale-95 transition-all outline-none cursor-pointer"
                          >
                            {processingId === grad.id ? 'Connecting...' : 'Connect Workspace'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

        </AnimatePresence>
      )}

      {/* PUBLIC DEEP ANALYSIS PROFILES MODAL */}
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
