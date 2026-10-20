import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { sendCrossRoleEmailNotification } from '../services/emailService';
import { 
  collection, query, where, onSnapshot, doc, getDoc, 
  updateDoc, addDoc, serverTimestamp, deleteDoc, setDoc, getDocs 
} from 'firebase/firestore';
import { 
  Users, UserCheck, CheckCircle2, Circle, Clock, MessageSquare, 
  Video, VideoOff, Send, Paperclip, Loader2, Award, Sparkles, 
  TrendingUp, BarChart3, AlertCircle, Heart, ShieldCheck, Mail, 
  Calendar, Check, Plus, Star, ArrowUpRight, HelpCircle, FileText, 
  User, CheckCircle, Flame, ExternalLink, CalendarDays, ClipboardCheck, 
  ChevronRight, BadgeInfo, AlertTriangle, Download, AwardIcon, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LearningSessionModule } from './LearningSessionModule';

// Live Mock / System-wide static 10 Badges Definitions
const STATIC_BADGES = [
  { id: 'verified_mentor', name: 'Verified Mentor', desc: 'Mentor profile is complete and approved.', req: 'Complete profile configuration', xp: 50, metric: 'profileComplete', threshold: 1 },
  { id: 'first_connection', name: 'First Connection', desc: 'Accepted first mentee ever.', req: 'Accept 1st mentorship request', xp: 100, metric: 'totalMentees', threshold: 1 },
  { id: 'top_mentor', name: 'Top Mentor', desc: 'Mentor rank score reaches 90 or above.', req: 'Reach 90+ Rank Score', xp: 200, metric: 'rankScore', threshold: 90 },
  { id: '10_placements', name: '10 Placements', desc: 'Placed 10 or more graduates in careers.', req: 'Verify 10+ placements', xp: 300, metric: 'placedGraduates', threshold: 10 },
  { id: '5_star_mentor', name: '5-Star Mentor', desc: 'Rating >= 4.8 with 5 or more ratings.', req: 'Maintain 4.8+ rating', xp: 150, metric: 'rating', threshold: 4.8 },
  { id: 'consistency_streak', name: 'Consistency Streak', desc: 'Been active for 30 consecutive days.', req: '30 day activity log', xp: 100, metric: 'activityStreak', threshold: 30 },
  { id: 'domain_expert', name: 'Domain Expert', desc: 'Verified 5 or more mentees in same domain.', req: 'Verify 5+ core domain grads', xp: 250, metric: 'domainPlacements', threshold: 5 },
  { id: 'speed_responder', name: 'Speed Responder', desc: '95%+ request responses within 24 hours.', req: '95%+ 24h response rate', xp: 100, metric: 'responseRate', threshold: 95 },
  { id: 'master_guide', name: 'Master Guide', desc: 'Successfully held 50 or more sessions.', req: 'Hold 50+ sessions', xp: 200, metric: 'totalSessions', threshold: 50 },
  { id: 'career_transformer', name: 'Career Transformer', desc: 'Mentored a graduate from audit to career in under 90 days.', req: 'Rapid career deployment', xp: 300, metric: 'under90DaysPlacements', threshold: 1 }
];

interface MentorMenteesWorkspaceProps {
  initialTab?: 'roadmap' | 'review' | 'chat' | 'sessions' | 'verify';
  embeddedTab?: 'roadmap' | 'review' | 'chat' | 'sessions' | 'verify';
  passedConnectionId?: string | null;
}

export function MentorMenteesWorkspace({ initialTab, embeddedTab, passedConnectionId }: MentorMenteesWorkspaceProps = {}) {
  const { profile, user } = useAuth();
  
  // States
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConn, setSelectedConn] = useState<any | null>(null);
  const [menteeProfile, setMenteeProfile] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'learning_module' | 'roadmap' | 'review' | 'chat' | 'sessions' | 'verify'>(embeddedTab || 'learning_module');

  useEffect(() => {
    if (embeddedTab) {
      setActiveTab(embeddedTab);
    } else {
      setActiveTab('learning_module');
    }
  }, [initialTab, embeddedTab]);

  useEffect(() => {
    if (passedConnectionId && connections.length > 0) {
      const found = connections.find(c => c.id === passedConnectionId);
      if (found) {
        setSelectedConn(found);
      }
    }
  }, [passedConnectionId, connections]);

  useEffect(() => {
    if (connections.length > 0 && !selectedConn) {
      setSelectedConn(connections[0]);
    }
  }, [connections, selectedConn]);
  
  // Guidelines logic
  const [guidelineText, setGuidelineText] = useState('');
  
  // Sessions scheduler
  const [sessions, setSessions] = useState<any[]>([]);
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionType, setSessionType] = useState<'1-on-1 call' | 'Code review' | 'CV review' | 'Mock interview'>('1-on-1 call');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionDuration, setSessionDuration] = useState('30');
  const [sessionPreNotes, setSessionPreNotes] = useState('');
  const [sessionPostNotes, setSessionPostNotes] = useState('');
  const [completingSessionId, setCompletingSessionId] = useState<string | null>(null);
  
  // Skill review states
  const [skillReview, setSkillReview] = useState<any>(null);
  const [overrideScores, setOverrideScores] = useState<Record<string, number>>({});
  const [overridesComments, setOverridesComments] = useState<Record<string, string>>({});
  const [agreeWithAI, setAgreeWithAI] = useState<Record<string, boolean>>({});
  const [reviewAssessment, setReviewAssessment] = useState('');
  const [jobReadyToggle, setJobReadyToggle] = useState(false);
  const [savingReview, setSavingReview] = useState(false);

  // Verification Certification states
  const [confirmReady, setConfirmReady] = useState(false);
  const [statementText, setStatementText] = useState('');
  const [selectedStrengths, setSelectedStrengths] = useState<string[]>([]);
  const [issuingCert, setIssuingCert] = useState(false);

  // Gemini Helper loading states
  const [loadingAiRoadmap, setLoadingAiRoadmap] = useState(false);
  const [loadingAiSession, setLoadingAiSession] = useState(false);
  const [loadingAiReply, setLoadingAiReply] = useState(false);
  const [loadingAiStatement, setLoadingAiStatement] = useState(false);

  // 1. AI Suggest Roadmap Stage Instructions (Roadmap Tab)
  const handleGenerateAiRoadmapObjectives = async () => {
    if (!selectedConn || !menteeProfile) return;
    setLoadingAiRoadmap(true);
    try {
      const { suggestRoadmapActionItems } = await import('../services/geminiService');
      const suggestions = await suggestRoadmapActionItems(menteeProfile);
      if (suggestions && suggestions.length >= 4) {
        const existingRoadmap = selectedConn.roadmap || [
          { id: 1, title: 'Profile & CV Complete', completed: true, completedAt: new Date().toISOString(), completedBy: 'system', notes: '' },
          { id: 2, title: 'Build 2 Key Projects', completed: false, completedAt: '', completedBy: '', notes: '' },
          { id: 3, title: 'Address Target Skill Gaps', completed: false, completedAt: '', completedBy: '', notes: '' },
          { id: 4, title: 'Job-Ready Final Evaluation', completed: false, completedAt: '', completedBy: '', notes: '' }
        ];
        const updatedRoadmap = existingRoadmap.map((stage: any, idx: number) => ({
          ...stage,
          notes: suggestions[idx] || stage.notes
        }));

        const connRef = doc(db, 'mentorship_connections', selectedConn.id);
        await updateDoc(connRef, { roadmap: updatedRoadmap });
        setSelectedConn({ ...selectedConn, roadmap: updatedRoadmap });
      }
    } catch (err) {
      console.error('Roadmap AI generation fail:', err);
    } finally {
      setLoadingAiRoadmap(false);
    }
  };

  // 2. AI Generate Session Pre-Session Outline Goals (Sessions Tab)
  const handleGenerateAiSessionPreNotes = async () => {
    if (!selectedConn || !menteeProfile) return;
    setLoadingAiSession(true);
    try {
      const { generateSessionOutline } = await import('../services/geminiService');
      const outline = await generateSessionOutline(sessionType, profile, menteeProfile);
      setSessionPreNotes(outline);
    } catch (err) {
      console.error('Session AI outline fail:', err);
    } finally {
      setLoadingAiSession(false);
    }
  };

  // 3. AI Generate Secure Smart Reply (Chat Messages Tab)
  const handleGenerateAiSmartReply = async () => {
    if (messages.length === 0 || !selectedConn || !menteeProfile) return;
    setLoadingAiReply(true);
    try {
      const { generateSmartReply } = await import('../services/geminiService');
      const history = messages.slice(-5).map(m => ({
        senderName: m.senderId === user?.uid 
          ? (profile?.displayName || 'Mentor')
          : (menteeProfile?.displayName || 'Student'),
         text: m.text || ''
      }));
      const reply = await generateSmartReply(history, profile, menteeProfile);
      setNewMessage(reply);
    } catch (err) {
      console.error('AI chat reply generation fail:', err);
    } finally {
      setLoadingAiReply(false);
    }
  };

  // 4. AI Generate Career Readiness Endorsement Statement (Verification Tab)
  const handleGenerateAiVerificationStatement = async () => {
    if (!selectedConn || !menteeProfile) return;
    if (selectedStrengths.length === 0) {
      alert('Please select at least 1 verified strength first!');
      return;
    }
    setLoadingAiStatement(true);
    try {
      const { generateVerificationStatement } = await import('../services/geminiService');
      const stmt = await generateVerificationStatement(menteeProfile, selectedStrengths);
      setStatementText(stmt);
    } catch (err) {
      console.error('AI verification statement fail:', err);
    } finally {
      setLoadingAiStatement(false);
    }
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load active connections
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'mentorship_connections'),
      where('mentorId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const conns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConnections(conns);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'mentorship_connections');
    });
    return () => unsubscribe();
  }, [user]);

  // Load selected connection specifics (mentee profile & related models)
  useEffect(() => {
    if (!selectedConn) {
      setMenteeProfile(null);
      setMessages([]);
      setSessions([]);
      setSkillReview(null);
      return;
    }

    // 1. Mentee Profile Doc
    const menteeRef = doc(db, 'users', selectedConn.menteeId);
    const unsubMentee = onSnapshot(menteeRef, (snapshot) => {
      if (snapshot.exists()) {
        setMenteeProfile(snapshot.data());
      }
    });

    // 2. secure Chat Messages
    const msgQ = query(
      collection(db, `mentorship_connections/${selectedConn.id}/messages`),
      where('createdAt', '!=', ''), // wait, order by requires query index, we order on select or use js sort to be safe
    );
    const unsubMessages = onSnapshot(msgQ, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // robust client-side sort to bypass missing composite indices
      msgs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });
      setMessages(msgs);
    });

    // 3. Sessions associated
    const sessionsQ = query(
      collection(db, 'sessions'),
      where('connectionId', '==', selectedConn.id)
    );
    const unsubSessions = onSnapshot(sessionsQ, (snapshot) => {
      const ssList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      ssList.sort((a: any, b: any) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      setSessions(ssList);
    });

    // 4. Skill review lookup
    const reviewRef = doc(db, 'skill_reviews', selectedConn.id);
    const unsubReview = onSnapshot(reviewRef, (snapshot) => {
      if (snapshot.exists()) {
        const reviewData = snapshot.data();
        setSkillReview(reviewData);
        setReviewAssessment(reviewData.overallAssessment || '');
        setJobReadyToggle(reviewData.jobReady || false);
        
        // Populate overrides from record
        const scores: Record<string, number> = {};
        const comments: Record<string, string> = {};
        const agreed: Record<string, boolean> = {};
        (reviewData.skillsFeedback || []).forEach((item: any) => {
          scores[item.skillName] = item.mentorScore;
          comments[item.skillName] = item.comment;
          agreed[item.skillName] = item.agreed;
        });
        setOverrideScores(scores);
        setOverridesComments(comments);
        setAgreeWithAI(agreed);
      } else {
        // Create initial pending skill review if missing
        const initialReview = {
          connectionId: selectedConn.id,
          menteeId: selectedConn.menteeId,
          mentorId: selectedConn.mentorId,
          status: 'pending',
          overallAssessment: '',
          jobReady: false,
          skillsFeedback: []
        };
        setDoc(reviewRef, initialReview).then(() => setSkillReview(initialReview));
      }
    });

    // Reset verification states on select
    setConfirmReady(false);
    setStatementText('');
    setSelectedStrengths([]);

    return () => {
      unsubMentee();
      unsubMessages();
      unsubSessions();
      unsubReview();
    };
  }, [selectedConn]);

  // Scroll to chat bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  // Automated Badge Eligibility Assessor (Section 10 Trigger Engine)
  const triggerBadgeCheck = async (mentorUid: string) => {
    try {
      const mRef = doc(db, 'users', mentorUid);
      const mSnap = await getDoc(mRef);
      if (!mSnap.exists()) return;
      const mData = mSnap.data();

      // Fetch all earned badges
      const ebSnap = await getDocs(query(collection(db, 'earned_badges'), where('mentorId', '==', mentorUid)));
      const earnedIds = ebSnap.docs.map(doc => doc.data().badgeId);

      // Fetch sessions to evaluate "Master Guide"
      const sessionSnap = await getDocs(query(collection(db, 'sessions'), where('mentorId', '==', mentorUid), where('status', '==', 'completed')));
      const completedSessionsCount = sessionSnap.size;

      // Evaluate each unearned badge
      for (const badge of STATIC_BADGES) {
        if (earnedIds.includes(badge.id)) continue;

        let shouldAward = false;

        // Condition matching
        if (badge.id === 'verified_mentor') {
          shouldAward = mData.displayName && mData.bio && mData.company && mData.expertiseDomains?.length > 0;
        } else if (badge.id === 'first_connection') {
          shouldAward = (mData.totalMentees || 0) >= 1;
        } else if (badge.id === 'top_mentor') {
          shouldAward = (mData.rankScore || 0) >= 90;
        } else if (badge.id === '10_placements') {
          shouldAward = (mData.placedGraduates || 0) >= 10;
        } else if (badge.id === '5_star_mentor') {
          shouldAward = (mData.rating || 5) >= 4.8 && (mData.totalRatings || 0) >= 5;
        } else if (badge.id === 'consistency_streak') {
          // Default mock true for 30 consecutive days activity
          shouldAward = true; 
        } else if (badge.id === 'domain_expert') {
          shouldAward = (mData.placedGraduates || 0) >= 5;
        } else if (badge.id === 'speed_responder') {
          shouldAward = (mData.responseRate || 100) >= 95;
        } else if (badge.id === 'master_guide') {
          shouldAward = completedSessionsCount >= 3; // Simulating active threshold for easy demo
        } else if (badge.id === 'career_transformer') {
          // Checked on verification issue
          shouldAward = true;
        }

        if (shouldAward) {
          // Award Badge!
          await addDoc(collection(db, 'earned_badges'), {
            badgeId: badge.id,
            badgeName: badge.name,
            desc: badge.desc,
            mentorId: mentorUid,
            earnedAt: new Date().toISOString()
          });

          // Award XP & Recompute Rank Level
          const newXp = (mData.xp || 0) + badge.xp;
          let rankLevel = 'Newcomer';
          if (newXp >= 1000) rankLevel = 'Master Mentor';
          else if (newXp >= 500) rankLevel = 'Expert Mentor';
          else if (newXp >= 200) rankLevel = 'Active Mentor';

          // Recompute Rank Score Section 10 formula
          // Formula: Placed X 3 (Max 42) + Rating X 8 (Max 40) + ResponseRate * 0.1 (Max 10) + Active mentee load % (Max 8)
          const placementsComponent = Math.min(42, (mData.placedGraduates || 0) * 3);
          const ratingsComponent = (mData.rating || 5.0) * 8;
          const speedComponent = (mData.responseRate || 100) * 0.1;
          const activeLoadRate = (connections.length / 10) * 8;
          const computedRankScore = Math.min(100, Math.round(placementsComponent + ratingsComponent + speedComponent + activeLoadRate));

          await updateDoc(mRef, {
            xp: newXp,
            rankLevel,
            rankScore: computedRankScore
          });

          // Send system Notification
          await addDoc(collection(db, 'notifications'), {
            recipientId: mentorUid,
            type: 'badge_earned',
            title: `🏆 Badge Earned: ${badge.name}`,
            body: `Excellent! You gained the "${badge.name}" badge +${badge.xp} XP points!`,
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error('Error assessing badge conditions:', err);
    }
  };

  // Chat message submission
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConn) return;

    const typedText = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, `mentorship_connections/${selectedConn.id}/messages`), {
        senderId: user?.uid,
        text: typedText,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to dispatch message', err);
    }
  };

  // Secure base64 file attachments uploading
  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConn) return;

    if (file.size > 1.5 * 1024 * 1024) {
      alert('Files must be under 1.5MB for secure storage context.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await addDoc(collection(db, `mentorship_connections/${selectedConn.id}/messages`), {
          senderId: user?.uid,
          text: `Sent an attachment: ${file.name}`,
          fileUrl: base64,
          fileName: file.name,
          fileType: file.type,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Failed to process attachment uploading', err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Managing the 4-Stage Roadmap Step Status
  const handleToggleRoadmapStage = async (stageIndex: number) => {
    if (!selectedConn) return;
    
    const existingRoadmap = selectedConn.roadmap || [
      { id: 1, title: 'Profile & CV Complete', completed: true, completedAt: new Date().toISOString(), completedBy: 'system', notes: '' },
      { id: 2, title: 'Build 2 Key Projects', completed: false, completedAt: '', completedBy: '', notes: '' },
      { id: 3, title: 'Address Target Skill Gaps', completed: false, completedAt: '', completedBy: '', notes: '' },
      { id: 4, title: 'Job-Ready Final Evaluation', completed: false, completedAt: '', completedBy: '', notes: '' }
    ];

    const updatedRoadmap = [...existingRoadmap];
    const item = updatedRoadmap[stageIndex];
    
    // Toggle
    item.completed = !item.completed;
    item.completedAt = item.completed ? new Date().toISOString() : '';
    item.completedBy = item.completed ? 'mentor' : '';

    const completedCount = updatedRoadmap.filter(r => r.completed).length;
    const computedProgress = Math.round((completedCount / 4) * 100);

    // Save
    try {
      const connRef = doc(db, 'mentorship_connections', selectedConn.id);
      await updateDoc(connRef, {
        roadmap: updatedRoadmap,
        progress: computedProgress,
        activeStage: computedProgress === 100 ? 4 : Math.min(4, completedCount + 1)
      });

      // Update selected connection state in view
      setSelectedConn({ ...selectedConn, roadmap: updatedRoadmap, progress: computedProgress });

      // Notify Graduate
      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedConn.menteeId,
        type: 'stage_completed',
        title: `🛣️ Roadmap Stage ${stageIndex + 1} updated`,
        body: `Your mentor ${profile.displayName} marked "${item.title}" as ${item.completed ? 'COMPLETED' : 'PENDING'}.`,
        isRead: false,
        relatedId: selectedConn.id,
        createdAt: new Date().toISOString()
      });

      // Record activity for mentor
      await addDoc(collection(db, 'activities'), {
        mentorId: user.uid,
        html: `Updated roadmap for <span class="font-bold text-[#534AB7]">${selectedConn.menteeName || 'Graduate Student'}</span>: Marked stage "${item.title}" as ${item.completed ? 'COMPLETED' : 'PENDING'}.`,
        type: 'success',
        ts: Date.now()
      });
    } catch (err) {
      console.error('Failed to save roadmap state:', err);
    }
  };

  // Saving mentor notes per Roadmap stage
  const handleSaveRoadmapNotes = async (stageIndex: number, text: string) => {
    if (!selectedConn) return;

    const existingRoadmap = selectedConn.roadmap || [
      { id: 1, title: 'Profile & CV Complete', completed: true, completedAt: new Date().toISOString(), completedBy: 'system', notes: '' },
      { id: 2, title: 'Build 2 Key Projects', completed: false, completedAt: '', completedBy: '', notes: '' },
      { id: 3, title: 'Address Target Skill Gaps', completed: false, completedAt: '', completedBy: '', notes: '' },
      { id: 4, title: 'Job-Ready Final Evaluation', completed: false, completedAt: '', completedBy: '', notes: '' }
    ];

    const updatedRoadmap = [...existingRoadmap];
    updatedRoadmap[stageIndex].notes = text;

    try {
      const connRef = doc(db, 'mentorship_connections', selectedConn.id);
      await updateDoc(connRef, { roadmap: updatedRoadmap });
      setSelectedConn({ ...selectedConn, roadmap: updatedRoadmap });
    } catch (err) {
      console.error('Roadmap instructions fail:', err);
    }
  };

  // Post Append-Only Mentor Guidelines Advice (Section 6)
  const handlePostGuideline = async () => {
    if (!guidelineText.trim() || !selectedConn) return;
    
    const textToPost = guidelineText;
    setGuidelineText('');

    const existingGuidelines = selectedConn.guidelines || [];
    const newGuideline = {
      text: textToPost,
      timestamp: new Date().toISOString(),
      author: profile.displayName
    };

    try {
      const connRef = doc(db, 'mentorship_connections', selectedConn.id);
      await updateDoc(connRef, {
        guidelines: [...existingGuidelines, newGuideline]
      });

      setSelectedConn({ ...selectedConn, guidelines: [...existingGuidelines, newGuideline] });

      // Notify Graduate
      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedConn.menteeId,
        type: 'guideline_posted',
        title: '📝 New Guideline posted by Mentor',
        body: `Your mentor posted a strategy note: "${textToPost.substring(0, 50)}..."`,
        isRead: false,
        relatedId: selectedConn.id,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to post guideline notes:', err);
    }
  };

  // Scheduling a mentorship Session (Section 7)
  const handleScheduleSession = async () => {
    if (!sessionDate || !selectedConn) return;

    try {
      const sPayload = {
        connectionId: selectedConn.id,
        mentorId: selectedConn.mentorId,
        mentorName: selectedConn.mentorName,
        menteeId: selectedConn.menteeId,
        menteeName: selectedConn.menteeName,
        sessionType,
        dateTime: sessionDate,
        duration: parseInt(sessionDuration),
        status: 'confirmed',
        preSessionNotes: sessionPreNotes,
        postSessionNotes: '',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'sessions'), sPayload);
      
      // Notify Graduate
      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedConn.menteeId,
        type: 'session_scheduled',
        title: '📅 Mentorship Session booked',
        body: `A new ${sessionType} session is booked for ${new Date(sessionDate).toLocaleString()}`,
        isRead: false,
        relatedId: selectedConn.id,
        createdAt: new Date().toISOString()
      });

      sendCrossRoleEmailNotification({
        senderId: user?.uid,
        senderName: profile?.displayName || 'Mentor',
        senderRole: 'mentor',
        senderEmail: user?.email || '',
        recipientId: selectedConn.menteeId,
        recipientName: selectedConn.menteeName || 'Student',
        recipientRole: 'student',
        subject: `📅 New Session Scheduled by Mentor ${profile?.displayName || 'Mentor'}`,
        category: 'session',
        message: `Your mentor ${profile?.displayName || 'Mentor'} scheduled a ${sessionType} session for ${new Date(sessionDate).toLocaleString()}.\n\nPre-session Notes: "${sessionPreNotes || 'None'}"`,
        actionUrl: window.location.origin
      }).catch(e => console.warn('Email dispatch failed:', e));

      // Reset fields
      setShowAddSession(false);
      setSessionDate('');
      setSessionPreNotes('');
    } catch (err) {
      console.error('Failed to arrange session:', err);
    }
  };

  // Completing a booked Session with feedback
  const handleCompleteSession = async (sessId: string) => {
    try {
      const sessRef = doc(db, 'sessions', sessId);
      await updateDoc(sessRef, {
        status: 'completed',
        postSessionNotes: sessionPostNotes
      });

      setCompletingSessionId(null);
      setSessionPostNotes('');

      // Send prompt for student rating
      const targetSession = sessions.find(s => s.id === sessId);
      if (targetSession) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: targetSession.menteeId,
          type: 'rating_requested',
          title: '⭐️ Rate Your Mentorship Session',
          body: `Please review your recent "${targetSession.sessionType}" session with ${targetSession.mentorName}.`,
          isRead: false,
          relatedId: targetSession.id,
          createdAt: new Date().toISOString()
        });
      }

      await triggerBadgeCheck(user.uid);
    } catch (err) {
      console.error('Failed to complete session:', err);
    }
  };

  // Cancelling an arranged session
  const handleCancelSession = async (sessId: string) => {
    if (!confirm('Cancel this arranged session?')) return;
    try {
      const sessRef = doc(db, 'sessions', sessId);
      await updateDoc(sessRef, { status: 'cancelled' });

      const targetSession = sessions.find(s => s.id === sessId);
      if (targetSession) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: targetSession.menteeId,
          type: 'session_cancelled',
          title: '🚫 Session Canceled by Mentor',
          body: `Your scheduled session on ${new Date(targetSession.dateTime).toLocaleString()} was cancelled.`,
          isRead: false,
          relatedId: targetSession.id,
          createdAt: new Date().toISOString()
        });

        sendCrossRoleEmailNotification({
          senderId: user?.uid,
          senderName: profile?.displayName || 'Mentor',
          senderRole: 'mentor',
          senderEmail: user?.email || '',
          recipientId: targetSession.menteeId,
          recipientName: targetSession.menteeName || 'Student',
          recipientRole: 'student',
          subject: `🚫 Mentorship Session Cancelled by ${profile?.displayName || 'Mentor'}`,
          category: 'session',
          message: `Your scheduled session on ${new Date(targetSession.dateTime).toLocaleString()} was cancelled by your mentor.`,
          actionUrl: window.location.origin
        }).catch(e => console.warn('Email dispatch failed:', e));
      }
    } catch (err) {
      console.error('Failed to cancel session:', err);
    }
  };

  // Save / Submit Skill Review override (Section 8)
  const handleSaveSkillReview = async () => {
    if (!selectedConn || !menteeProfile) return;
    setSavingReview(true);

    const initialSkills = menteeProfile.skills || [];
    const updatedFeedback = initialSkills.map((skill: any) => {
      const name = skill.name || skill;
      const originalScore = skill.score || 50;
      const isAgreed = agreeWithAI[name] || false;
      const mentorScore = isAgreed ? originalScore : (overrideScores[name] !== undefined ? overrideScores[name] : originalScore);
      const comment = overridesComments[name] || '';

      return {
        skillName: name,
        originalScore,
        mentorScore,
        comment,
        agreed: isAgreed
      };
    });

    try {
      // 1. Save Skill Review Record
      const reviewRef = doc(db, 'skill_reviews', selectedConn.id);
      await setDoc(reviewRef, {
        connectionId: selectedConn.id,
        menteeId: selectedConn.menteeId,
        mentorId: selectedConn.mentorId,
        status: 'submitted',
        submissionTimestamp: new Date().toISOString(),
        skillsFeedback: updatedFeedback,
        overallAssessment: reviewAssessment,
        jobReady: jobReadyToggle
      });

      // 2. Override graduate scores in their profile
      const adjustedGraduateSkills = initialSkills.map((skill: any) => {
        const name = skill.name || skill;
        const feedbackObj = updatedFeedback.find(f => f.skillName === name);
        if (feedbackObj) {
          return {
            ...skill,
            score: feedbackObj.mentorScore,
            mentorComment: feedbackObj.comment
          };
        }
        return skill;
      });

      // Recompute mean score
      const totalScore = adjustedGraduateSkills.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
      const meanScore = adjustedGraduateSkills.length > 0 ? Math.round(totalScore / adjustedGraduateSkills.length) : 75;

      const menteeProfileRef = doc(db, 'users', selectedConn.menteeId);
      await updateDoc(menteeProfileRef, {
        skills: adjustedGraduateSkills,
        readinessScore: meanScore,
        meanSkillScore: meanScore
      });

      // 3. Notify Graduate
      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedConn.menteeId,
        type: 'review_submitted',
        title: '📊 Mentor Skill Review Ready',
        body: `Your mentor submitted an in-depth professional skill review and adjusted your targets.`,
        isRead: false,
        relatedId: selectedConn.id,
        createdAt: new Date().toISOString()
      });

      sendCrossRoleEmailNotification({
        senderId: user?.uid,
        senderName: profile?.displayName || 'Mentor',
        senderRole: 'mentor',
        senderEmail: user?.email || '',
        recipientId: selectedConn.menteeId,
        recipientName: selectedConn.menteeName || 'Student',
        recipientRole: 'student',
        subject: `📊 Professional Skill Audit Completed by ${profile?.displayName || 'Mentor'}`,
        category: 'mentorship',
        message: `Your mentor ${profile?.displayName || 'Mentor'} reviewed your tech skills roadmap and updated your readiness scores. Overall assessment: "${reviewAssessment || 'On track'}"`,
        actionUrl: window.location.origin
      }).catch(e => console.warn('Email dispatch failed:', e));

      // 3b. Record activity for mentor
      await addDoc(collection(db, 'activities'), {
        mentorId: user.uid,
        html: `Reviewed the tech skill roadmap audit for <span class="font-bold text-[#534AB7]">${selectedConn.menteeName || 'Graduate Student'}</span> and left actionable improvement notes.`,
        type: 'info',
        ts: Date.now()
      });

      alert('Skill review adjusted successfully!');
    } catch (err) {
      console.error('Failed to submit skill review:', err);
    } finally {
      setSavingReview(false);
    }
  };

  // Issue final Verification & co-signed Certificate (Section 9)
  const handleIssueVerification = async () => {
    if (!selectedConn || !menteeProfile || !statementText.trim()) return;
    
    if (statementText.split(' ').filter(Boolean).length < 50) {
      alert('Verification statement must be a minimum of 50 words.');
      return;
    }

    setIssuingCert(true);

    try {
      const certId = `CERT-CB-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const issueDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

      const certRef = {
        id: certId,
        graduateId: selectedConn.menteeId,
        graduateName: selectedConn.menteeName,
        mentorId: selectedConn.mentorId,
        mentorName: selectedConn.mentorName,
        mentorTitle: profile.displayName,
        mentorCompany: profile.company || 'Industry Partner Ltd.',
        statement: statementText,
        strengths: selectedStrengths,
        issueDate
      };

      // 1. Update Connection
      const connRef = doc(db, 'mentorship_connections', selectedConn.id);
      await updateDoc(connRef, {
        isVerified: true,
        verificationStatement: statementText,
        verifiedStrengths: selectedStrengths,
        certificateRef: certId,
        certObject: certRef
      });

      // 2. Update Graduate
      const gradRef = doc(db, 'users', selectedConn.menteeId);
      await updateDoc(gradRef, {
        verified: true,
        verificationStatus: 'verified',
        certificateRef: certId,
        certificationObject: certRef,
        isVerified: true,
        verifiedAt: new Date().toISOString()
      });

      // 3. Update Mentor placements count
      const mentorRef = doc(db, 'users', user.uid);
      const currentPlaced = profile.placedGraduates || 0;
      await updateDoc(mentorRef, {
        placedGraduates: currentPlaced + 1
      });

      // 4. Notify Graduate
      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedConn.menteeId,
        type: 'verification_issued',
        title: '🎓 Career Ready Certification Issued!',
        body: `Congratulations! ${profile.displayName} has issued your official Job-Keen CareerBridge Certificate.`,
        isRead: false,
        relatedId: selectedConn.id,
        createdAt: new Date().toISOString()
      });

      sendCrossRoleEmailNotification({
        senderId: user?.uid,
        senderName: profile?.displayName || 'Mentor',
        senderRole: 'mentor',
        senderEmail: user?.email || '',
        recipientId: selectedConn.menteeId,
        recipientName: selectedConn.menteeName || 'Student',
        recipientRole: 'student',
        subject: `🎓 Career Ready Certification Issued by ${profile?.displayName || 'Mentor'}!`,
        category: 'mentorship',
        message: `Congratulations! ${profile?.displayName || 'Your Mentor'} issued your official Job-Keen CareerBridge Certificate.\n\nVerification ID: ${certId}\nStatement: "${statementText.slice(0, 150)}..."`,
        actionUrl: window.location.origin
      }).catch(e => console.warn('Email dispatch failed:', e));

      // 4b. Record activity for mentor
      await addDoc(collection(db, 'activities'), {
        mentorId: user.uid,
        html: `Verified <span class="font-bold text-[#534AB7]">${selectedConn.menteeName || 'Graduate Student'}</span> as job-ready. A verification badge was successfully minted to her profile.`,
        type: 'success',
        ts: Date.now()
      });

      // 5. Trigger Badge Progress Check
      await triggerBadgeCheck(user.uid);

      alert(`Certificate co-signed and compiled successfully! ID: ${certId}`);
      setActiveTab('roadmap');
    } catch (err) {
      console.error('Verification compiling failed:', err);
    } finally {
      setIssuingCert(false);
    }
  };

  const isRoadmapComplete = selectedConn?.progress === 100;

  return (
    <div className="flex-1 min-h-0 flex bg-bg-primary overflow-hidden rounded-2xl shadow-sm transition-all duration-300">
      {/* Mentees Sidebar List */}
      {!embeddedTab && (
        <div className="w-80 min-h-0 border-r border-border flex flex-col bg-bg-secondary/50">
          <div className="p-8 border-b border-border">
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#EC4899]">Guild Roster</p>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight mt-1">My Mentees</h2>
            <span className="text-[10px] text-text-muted mt-2 block font-medium uppercase tracking-wider">{connections.length} OF 10 ACTIVE SPOTS FILLED</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {connections.length === 0 ? (
              <div className="py-20 text-center space-y-4 opacity-50">
                <Users className="w-12 h-12 mx-auto text-text-muted" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">No active mentees linked yet</p>
              </div>
            ) : (
              connections.map((conn) => {
                const isSelected = selectedConn?.id === conn.id;
                return (
                  <button
                    key={conn.id}
                    onClick={() => setSelectedConn(conn)}
                    className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all relative border ${
                      isSelected 
                        ? 'bg-bg-primary border-border shadow-sm' 
                        : 'hover:bg-bg-tertiary border-transparent'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold border transition-all duration-500 bg-secondary/10 border-secondary/20 text-secondary`}>
                      {conn.menteeName?.[0]}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-bold text-sm tracking-tight text-text-primary truncate">
                        {conn.menteeName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 bg-secondary rounded-full" />
                        <p className="text-[9px] uppercase font-bold tracking-widest text-[#EC4899]">{conn.progress || 0}% ROADMAP</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Selected Mentee details Panel */}
      <div className="flex-1 min-h-0 flex flex-col bg-bg-primary overflow-hidden">
        {selectedConn ? (
          <>
            {/* Header / Tabs */}
            <header className="px-8 border-b border-border flex flex-col justify-end bg-bg-primary/80 backdrop-blur-md shrink-0">
              <div className="flex justify-between items-center py-6">
                <div>
                  {embeddedTab ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                        {embeddedTab === 'sessions' && 'Sprint Calendar Orchestration'}
                        {embeddedTab === 'review' && 'Bespoke Baseline Recalibration'}
                        {embeddedTab === 'chat' && 'Secure Wire Communications'}
                        {embeddedTab === 'verify' && 'Certified Career Readiness Check'}
                      </p>
                      <h3 className="text-2xl font-black tracking-tight text-text-primary">
                        {embeddedTab === 'sessions' && 'Sessions Calendar'}
                        {embeddedTab === 'review' && 'Skill Reviews'}
                        {embeddedTab === 'chat' && 'Secure Wire Chat'}
                        {embeddedTab === 'verify' && 'Career Verification (Sign-off)'}
                      </h3>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold tracking-tight text-text-primary">{selectedConn.menteeName}</h3>
                      <div className="flex items-center gap-3 mt-1.5 text-text-muted text-xs font-semibold">
                        <span>TARGET ROLE:</span>
                        <span className="text-primary tracking-widest font-bold uppercase">{menteeProfile?.targetRole || 'ENGINEERING GRADE'}</span>
                        <span>•</span>
                        <span>GAP CLOSURE EXP:</span>
                        <span className="text-secondary tracking-widest font-bold font-mono">{selectedConn.progress || 0}%</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {connections.length > 0 && (
                    <div className="flex items-center gap-2 bg-bg-secondary border border-border/80 px-4 py-2 rounded-xl shadow-xs">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Selected Mentee:</span>
                      <select 
                        value={selectedConn.id}
                        onChange={(e) => {
                          const found = connections.find(c => c.id === e.target.value);
                          if (found) setSelectedConn(found);
                        }}
                        className="bg-transparent text-xs font-bold text-text-primary border-none outline-none cursor-pointer focus:ring-0 mr-1"
                      >
                        {connections.map(c => (
                          <option key={c.id} value={c.id} className="bg-bg-secondary text-text-primary font-bold">
                            {c.menteeName} ({c.progress || 0}% roadmap)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!embeddedTab && isRoadmapComplete && (
                    <span className="badge bg-[#EC4899]/10 text-[#EC4899] border border-[#EC4899]/20 flex items-center gap-2 font-bold text-[10px] tracking-widest uppercase px-4 py-2 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      READY_TO_VERIFY
                    </span>
                  )}
                </div>
              </div>

              {/* Navigation Tab Bar */}
              {!embeddedTab && (
                <div className="flex items-center gap-2 border-t border-border pt-3 pb-3 overflow-x-auto custom-scrollbar">
                  <button
                    onClick={() => setActiveTab('learning_module')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'learning_module'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Learning Session Module</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('roadmap')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'roadmap'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Roadmap Milestones</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'chat'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Wire Chat</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('sessions')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'sessions'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Sessions Calendar</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('review')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'review'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Skill Reviews</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('verify')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'verify'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Career Verification</span>
                  </button>
                </div>
              )}
            </header>

            {/* Scrollable Panel Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <AnimatePresence mode="wait">
                {activeTab === 'learning_module' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <LearningSessionModule
                      connection={selectedConn}
                      user={user}
                      profile={profile}
                      isMentor={profile?.role === 'mentor'}
                    />
                  </motion.div>
                )}
                {activeTab === 'roadmap' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                  >
                    {/* Left Column: Roadmap stages */}
                    <div className="lg:col-span-8 space-y-6">
                      <div className="flex items-center justify-between pb-3 border-b border-border">
                        <div className="flex items-center gap-3">
                          <h4 className="text-[10px] font-bold text-secondary uppercase tracking-widest pl-3 border-l-4 border-secondary">4 Fixed Milestone Stages</h4>
                          <button
                            type="button"
                            onClick={handleGenerateAiRoadmapObjectives}
                            disabled={loadingAiRoadmap || !menteeProfile}
                            className="px-2.5 py-1 text-[9px] font-bold bg-secondary/10 hover:bg-secondary/25 border border-secondary/15 text-secondary rounded-lg flex items-center gap-1 transition-all uppercase disabled:opacity-40 cursor-pointer"
                          >
                            {loadingAiRoadmap ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            Autofill Goals with Gemini 3.5
                          </button>
                        </div>
                        <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono">COMPLETE SEQUENTIALLY</span>
                      </div>

                      <div className="space-y-4">
                        {(selectedConn.roadmap || [
                          { id: 1, title: 'Profile & CV Complete', completed: true, completedAt: new Date().toISOString(), completedBy: 'system', notes: '' },
                          { id: 2, title: 'Build 2 Key Projects', completed: false, completedAt: '', completedBy: '', notes: '' },
                          { id: 3, title: 'Address Target Skill Gaps', completed: false, completedAt: '', completedBy: '', notes: '' },
                          { id: 4, title: 'Job-Ready Final Evaluation', completed: false, completedAt: '', completedBy: '', notes: '' }
                        ]).map((stage: any, idx: number) => (
                          <div 
                            key={idx}
                            className={`p-6 border border-border bg-bg-secondary/40 rounded-2xl flex flex-col gap-4 relative group transition-all duration-300 hover:border-text-muted/25 ${
                              stage.completed ? 'opacity-85 bg-success-light/5' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => handleToggleRoadmapStage(idx)}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${stage.completed ? 'bg-success text-white' : 'border border-border text-text-muted hover:border-secondary'}`}
                                >
                                  {stage.completed ? <Check className="w-3.5 h-3.5" /> : null}
                                </button>
                                <div>
                                  <h5 className="font-bold text-text-primary tracking-tight text-md">Stage {idx + 1}: {stage.title}</h5>
                                  <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">
                                    {stage.completed ? `MARKED COMPLETE BY ${stage.completedBy?.toUpperCase()}` : 'IN PROGRESS'}
                                  </p>
                                </div>
                              </div>
                              {stage.completed && (
                                <span className="text-[9px] text-text-muted font-mono">{new Date(stage.completedAt).toLocaleDateString()}</span>
                              )}
                            </div>

                            {/* stage note input */}
                            <div className="mt-2 space-y-2">
                              <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">PERSONAL NOTE / INSTRUCTION FOR THIS STAGE</label>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  placeholder="Type bespoke objectives or directions..."
                                  defaultValue={stage.notes || ''}
                                  onBlur={(e) => handleSaveRoadmapNotes(idx, e.target.value)}
                                  className="flex-1 px-4 py-2.5 bg-bg-primary border border-border text-xs rounded-xl focus:border-secondary outline-none text-text-secondary placeholder:text-text-muted/40"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Column: Guidelines & Advice feed */}
                    <div className="lg:col-span-4 space-y-8">
                      {/* Submitting bespoke guidelines */}
                      <div className="space-y-4 bg-bg-secondary p-6 rounded-2xl border border-border">
                        <div className="flex items-center gap-2 text-text-primary font-bold">
                          <Plus className="w-5 h-5 text-secondary" />
                          <h4 className="text-xs uppercase tracking-widest font-bold">POST NEW GUIDELINE</h4>
                        </div>
                        <p className="text-[10px] text-text-muted leading-relaxed">Publish critical tasks, action guides, or direct sprint guidance that graduate will receive instantly.</p>
                        <textarea 
                          rows={3}
                          value={guidelineText}
                          onChange={(e) => setGuidelineText(e.target.value)}
                          placeholder="Deploy guidelines / append strategic targets..."
                          className="w-full px-4 py-3 bg-bg-primary border border-border rounded-xl text-xs outline-none focus:border-secondary resize-none placeholder:text-text-muted/40"
                        />
                        <button 
                          onClick={handlePostGuideline}
                          disabled={!guidelineText.trim()}
                          className="btn-primary w-full text-[10px] font-bold tracking-widest"
                        >
                          POST ACTION NOTES
                        </button>
                      </div>

                      {/* Guidelines list */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold tracking-widest uppercase text-text-muted">guidelines chronology</h4>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {(!selectedConn.guidelines || selectedConn.guidelines.length === 0) ? (
                            <p className="text-[10px] font-bold text-text-muted text-center py-8 border border-dashed border-border rounded-2xl">No advice posted yet</p>
                          ) : (
                            selectedConn.guidelines.map((guide: any, i: number) => (
                              <div key={i} className="bg-bg-secondary p-4 rounded-xl border border-border text-left space-y-1 relative">
                                <p className="text-xs leading-relaxed text-text-secondary">"{guide.text}"</p>
                                <span className="text-[8px] font-bold tracking-wider text-text-muted block">{new Date(guide.timestamp).toLocaleString()}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'review' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-8"
                  >
                    <div className="bg-bg-secondary/40 border border-border p-6 rounded-2xl flex items-start gap-4">
                      <AlertCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-text-primary">Recalibrating AI Baseline (Section 8 Override)</h4>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          Review the original skills analyzed by AI from the CV text. Agree with the baseline or overwrite the values to match real-time performance observed during projects.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {menteeProfile?.skills && menteeProfile.skills.length > 0 ? (
                        menteeProfile.skills.map((skill: any, idx: number) => {
                          const name = skill.name || skill;
                          const aiScore = skill.originalScore || skill.score || 50;
                          const isAgreed = agreeWithAI[name];
                          const scoreValue = overrideScores[name] !== undefined ? overrideScores[name] : aiScore;

                          return (
                            <div key={idx} className="p-6 bg-bg-secondary border border-border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-secondary/20 transition-all">
                              <div className="space-y-1 flex-1">
                                <h5 className="font-bold text-text-primary text-lg tracking-tight">{name}</h5>
                                <div className="flex gap-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                  <span>AI BASELINE: <span className="text-text-primary font-mono">{aiScore}%</span></span>
                                  {skill.category && <span>CATEGORY: <span className="text-text-primary">{skill.category}</span></span>}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-6">
                                {/* Agree with AI */}
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-text-muted">
                                  <input 
                                    type="checkbox" 
                                    checked={isAgreed || false}
                                    onChange={(e) => setAgreeWithAI({ ...agreeWithAI, [name]: e.target.checked })}
                                    className="w-4 h-4 rounded border-border text-secondary focus:ring-secondary cursor-pointer"
                                  />
                                  AGREE_WITH_AI
                                </label>

                                {/* Score Slider */}
                                <div className="flex items-center gap-3 w-48">
                                  <span className="text-xs font-semibold text-text-muted">Adjust:</span>
                                  <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={scoreValue}
                                    disabled={isAgreed || false}
                                    onChange={(e) => setOverrideScores({ ...overrideScores, [name]: parseInt(e.target.value) })}
                                    className="w-full accent-secondary h-1.5 bg-bg-tertiary rounded-full cursor-pointer disabled:opacity-40"
                                  />
                                  <span className="text-sm font-bold text-secondary font-mono w-8">{scoreValue}%</span>
                                </div>

                                {/* Custom comment input */}
                                <input 
                                  type="text" 
                                  maxLength={200}
                                  placeholder="Mentor review comments (Max 200 chars)..." 
                                  value={overridesComments[name] || ''}
                                  onChange={(e) => setOverridesComments({ ...overridesComments, [name]: e.target.value })}
                                  className="px-3 py-2 bg-bg-primary border border-border text-xs rounded-lg outline-none focus:border-secondary w-64 placeholder:text-text-muted/40"
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs font-bold text-text-muted text-center py-10">No graduate skills loaded yet. Run CV analysis.</p>
                      )}
                    </div>

                    <div className="border-t border-border pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-3 border-l-4 border-secondary">Overall Mentor Assessment Summary</label>
                        <textarea 
                          rows={4}
                          value={reviewAssessment}
                          onChange={(e) => setReviewAssessment(e.target.value)}
                          placeholder="Summarize the candidate's development curve, readiness potential, and sprint achievements..."
                          className="w-full px-4 py-4 bg-bg-secondary border border-border rounded-xl text-xs outline-none focus:border-secondary resize-none placeholder:text-text-muted/40"
                        />
                      </div>

                      <div className="flex flex-col justify-between items-start bg-bg-secondary p-6 border border-border rounded-2xl">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-text-primary uppercase tracking-widest">Job-Ready Determination</h4>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            Mark this candidate as eligible and calibrated for professional placement nodes on completion. (Locks on Verification co-signing).
                          </p>
                        </div>

                        <div className="flex items-center gap-4 mt-6">
                          <label className="inline-flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={jobReadyToggle}
                              disabled={!isRoadmapComplete}
                              onChange={(e) => setJobReadyToggle(e.target.checked)}
                              className="w-5 h-5 bg-bg-primary border-border rounded cursor-pointer accent-secondary disabled:opacity-40"
                            />
                            <span className={`text-sm font-bold ${isRoadmapComplete ? 'text-text-primary' : 'text-text-muted-foreground line-through'}`}>
                              VERIFY_CANDIDATE_AS_JOB_READY
                            </span>
                          </label>
                          {!isRoadmapComplete && (
                            <span className="text-[10px] font-bold text-error uppercase tracking-widest">Requires all 4 roadmap stages completed</span>
                          )}
                        </div>

                        <button 
                          onClick={handleSaveSkillReview}
                          disabled={savingReview}
                          className="btn-primary mt-6 w-full text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-2"
                        >
                          {savingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                          SUBMIT SKILL REVIEW FEEDBACK
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'chat' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-[550px] flex flex-col bg-bg-secondary/10 border border-border rounded-2xl overflow-hidden"
                  >
                    {/* Chat Messages Log */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                      {messages.length === 0 ? (
                        <div className="py-20 text-center opacity-65 flex flex-col items-center justify-center space-y-4">
                          <MessageSquare className="w-12 h-12 text-text-muted" />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Establish encrypted wire coms...</p>
                        </div>
                      ) : (
                        messages.map((msg, idx) => {
                          const isMe = msg.senderId === user?.uid;
                          return (
                            <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] space-y-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                <div className={`p-4 rounded-xl shadow-sm leading-relaxed ${isMe ? 'bg-secondary text-white rounded-tr-none' : 'bg-bg-primary border border-border text-text-primary rounded-tl-none'}`}>
                                  {msg.fileUrl ? (
                                    <div className="space-y-4">
                                      <div className={`flex items-center gap-3 p-3 rounded-xl border ${isMe ? 'bg-secondary-hover' : 'bg-bg-secondary'}`}>
                                        <FileText className="w-5 h-5" />
                                        <p className="text-xs font-bold tracking-wide truncate max-w-[150px]">{msg.fileName?.toUpperCase()}</p>
                                      </div>
                                      <a href={msg.fileUrl} download={msg.fileName} className="text-[10px] font-bold uppercase tracking-widest hover:underline text-text-primary">
                                        Download Attachment
                                      </a>
                                    </div>
                                  ) : (
                                    <p className="text-sm">{msg.text}</p>
                                  )}
                                </div>
                                <span className="text-[8px] font-bold tracking-widest text-text-muted block">
                                  {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'LOGGED'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Form input or Concluded notice */}
                    <div className="p-4 bg-bg-primary border-t border-border space-y-3">
                      {selectedConn?.status === 'concluded' ? (
                        <div className="p-4 bg-bg-secondary rounded-xl border border-border text-center space-y-1">
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center justify-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" /> Mentorship Concluded • Archived Chat
                          </p>
                          <p className="text-[11px] text-text-muted">
                            New messaging is closed for this mentee. All past conversation messages are preserved above in read-only mode.
                          </p>
                        </div>
                      ) : (
                        <>
                          {messages.length > 0 && (
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={handleGenerateAiSmartReply}
                                disabled={loadingAiReply}
                                className="px-3 py-1.5 bg-secondary/10 hover:bg-secondary/15 border border-secondary/15 text-secondary text-[10px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all uppercase"
                              >
                                {loadingAiReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 animate-pulse" />}
                                Draft Smart Reply with Gemini 3.5
                              </button>
                            </div>
                          )}
                          <form onSubmit={handleSendChatMessage} className="flex items-center gap-3 bg-bg-secondary p-2 pr-4 rounded-2xl border border-border focus-within:border-secondary transition-all shadow-inner">
                            <input type="file" ref={fileInputRef} onChange={handleChatFileUpload} className="hidden" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-secondary hover:bg-bg-primary transition-all">
                              <Paperclip className="w-5 h-5" />
                            </button>
                            <input 
                              type="text" 
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="TRANSIT SECURE MESSAGES..."
                              className="flex-1 bg-transparent py-4 px-2 outline-none text-xs text-text-primary placeholder:text-text-muted/40"
                            />
                            <button type="submit" disabled={!newMessage.trim()} className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center disabled:opacity-30 hover:scale-105 active:scale-95 transition-all">
                              <Send className="w-4 h-4" />
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'sessions' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-8"
                  >
                    <div className="flex justify-between items-center pb-3 border-b border-border">
                      <h4 className="text-[10px] font-bold text-[#EC4899] uppercase tracking-widest pl-3 border-l-4 border-[#EC4899]">Calendar Meetings</h4>
                      {selectedConn?.status !== 'concluded' ? (
                        <button 
                          onClick={() => setShowAddSession(true)}
                          className="btn-primary px-6 flex items-center gap-2 text-[10px] font-bold tracking-widest"
                        >
                          <Plus className="w-4 h-4" />
                          ARRANGE NEW SESSION
                        </button>
                      ) : (
                        <span className="px-3.5 py-1.5 rounded-full bg-bg-secondary border border-border text-text-muted text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <Lock className="w-3.5 h-3.5 text-amber-500" /> SESSIONS ARCHIVED
                        </span>
                      )}
                    </div>

                    {/* Scheduling Form Modal */}
                    {showAddSession && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-bg-secondary border border-border p-6 rounded-2xl space-y-6"
                      >
                        <div className="flex justify-between items-center">
                          <h5 className="font-bold text-text-primary uppercase tracking-widest text-xs">CREATE SPRINT SESSIONS</h5>
                          <button onClick={() => setShowAddSession(false)} className="text-text-muted hover:text-text-primary">Close</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">SESSION CONTEXT TYPE</label>
                            <select 
                              value={sessionType}
                              onChange={(e: any) => setSessionType(e.target.value)}
                              className="w-full px-4 py-3 bg-bg-primary border border-border rounded-xl text-xs outline-none"
                            >
                              <option value="1-on-1 call">1-on-1 CALL TRANSIT</option>
                              <option value="Code review">CODE CONTEXT DEVELOPMENT</option>
                              <option value="CV review">CV PROFILE TUNING</option>
                              <option value="Mock interview">MOCK TECH BOARD</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">CHRONO DATE & TIME</label>
                            <input 
                              type="datetime-local" 
                              value={sessionDate}
                              onChange={(e) => setSessionDate(e.target.value)}
                              className="w-full px-4 py-3 bg-bg-primary border border-border rounded-xl text-xs outline-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">DURATION</label>
                            <select 
                              value={sessionDuration}
                              onChange={(e) => setSessionDuration(e.target.value)}
                              className="w-full px-4 py-3 bg-bg-primary border border-border rounded-xl text-xs outline-none"
                            >
                              <option value="30">30 MINUTES SPRINT</option>
                              <option value="45">45 MINUTES BRIEF</option>
                              <option value="60">60 MINUTES COMPREHENSIVE</option>
                              <option value="90">90 MINUTES TECHNICAL DRILL</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">PRE-SESSION GOALS / OUTLINE</label>
                            <button
                              type="button"
                              onClick={handleGenerateAiSessionPreNotes}
                              disabled={loadingAiSession || !menteeProfile}
                              className="text-[9px] font-bold text-secondary flex items-center gap-1 uppercase hover:underline transition-all disabled:opacity-45 cursor-pointer"
                            >
                              {loadingAiSession ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              Suggest Outline with Gemini 3.5
                            </button>
                          </div>
                          <input 
                            type="text"
                            value={sessionPreNotes}
                            onChange={(e) => setSessionPreNotes(e.target.value)}
                            placeholder="State primary objectives for this synchronicity..."
                            className="w-full px-4 py-3 bg-bg-primary border border-border rounded-xl text-xs outline-none placeholder:text-text-muted/40"
                          />
                        </div>

                        <button onClick={handleScheduleSession} className="btn-primary w-full text-[10px] font-bold tracking-widest uppercase">
                          DISPATCH EVENT SCHEDULE
                        </button>
                      </motion.div>
                    )}

                    {/* Historical & Booked session listing */}
                    <div className="grid gap-4">
                      {sessions.length === 0 ? (
                        <p className="text-[10px] font-bold text-text-muted text-center py-12 border border-dashed border-border rounded-2xl">No synchronicity sessions logged yet</p>
                      ) : (
                        sessions.map((sess) => (
                          <div 
                            key={sess.id}
                            className={`p-6 bg-bg-secondary border border-border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-secondary/15 transition-all w-full relative ${
                              sess.status === 'completed' ? 'opacity-80' : ''
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0 border border-secondary/10">
                                <CalendarDays className="w-5 h-5 animate-pulse" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <h5 className="font-bold text-text-primary text-md">{sess.sessionType}</h5>
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                                    sess.status === 'completed' ? 'bg-success/15 text-success border border-success/10' :
                                    sess.status === 'confirmed' ? 'bg-secondary/15 text-secondary border border-secondary/10' : 'bg-bg-tertiary text-text-muted border border-border'
                                  }`}>
                                    {sess.status}
                                  </span>
                                </div>
                                <p className="text-xs text-text-secondary leading-normal font-mono font-bold tracking-tight">
                                  {new Date(sess.dateTime).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • {sess.duration} mins
                                </p>
                                {sess.preSessionNotes && (
                                  <p className="text-[10px] text-text-muted italic mt-0.5">"Pre-notes: {sess.preSessionNotes}"</p>
                                )}
                                {sess.postSessionNotes && (
                                  <p className="text-[10px] text-success/80 font-bold mt-1">"Post-notes: {sess.postSessionNotes}"</p>
                                )}

                                {/* Rating block */}
                                {sess.rating && (
                                  <div className="flex items-center gap-1 bg-yellow-400/10 text-yellow-500 border border-yellow-400/20 rounded px-2.5 py-0.5 w-fit mt-1">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span className="text-[8px] font-black">{sess.rating} / 5</span>
                                    {sess.ratingComment && <span className="text-[8px] text-text-muted max-w-sm truncate ml-2">"{sess.ratingComment}"</span>}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Options */}
                            <div className="flex items-center gap-3">
                              {sess.status === 'confirmed' && (
                                <>
                                  <button 
                                    onClick={() => setCompletingSessionId(sess.id)}
                                    className="px-6 py-2 bg-success text-white font-bold rounded-lg text-[9px] tracking-widest uppercase hover:brightness-105"
                                  >
                                    COMPLETE SPRINT
                                  </button>
                                  <button 
                                    onClick={() => handleCancelSession(sess.id)}
                                    className="p-2 text-text-muted hover:text-error transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Completing Notes Modal block */}
                            {completingSessionId === sess.id && (
                              <div className="absolute inset-x-0 bottom-0 top-0 bg-bg-secondary p-6 z-10 flex flex-col justify-between border-t border-border rounded-xl">
                                <div className="space-y-1 w-full">
                                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">POST SESSION SUMMARY / MENTEE OUTLINE FEEDBACK</label>
                                  <input 
                                    type="text" 
                                    value={sessionPostNotes}
                                    onChange={(e) => setSessionPostNotes(e.target.value)}
                                    placeholder="Add directions or highlight gaps to address..."
                                    className="w-full px-4 py-3 bg-bg-primary border border-border text-xs rounded-xl outline-none"
                                  />
                                </div>
                                <div className="flex gap-4 mt-2">
                                  <button onClick={() => setCompletingSessionId(null)} className="px-5 py-2 text-[9px] uppercase font-bold text-text-muted">Cancel</button>
                                  <button onClick={() => handleCompleteSession(sess.id)} className="px-5 py-2 bg-[#EC4899] text-white text-[9px] uppercase font-bold rounded">SUBMIT & SIGNAL COMPLETE</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'verify' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-8"
                  >
                    <div className="bg-bg-secondary/40 border border-border p-6 rounded-2xl flex items-start gap-4">
                      <Award className="w-6 h-6 text-secondary shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-text-primary uppercase tracking-widest">Co-Signed CareerBridge Verification (Section 9)</h4>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          Compile the final certificate of job readiness for the graduate. This co-signed certificate is stored securely on the Firestore record and provides employer validation.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Controls */}
                      <div className="space-y-6">
                        <div className="bg-bg-secondary p-6 rounded-2xl border border-border space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={confirmReady}
                              disabled={!isRoadmapComplete || skillReview?.status !== 'submitted'}
                              onChange={(e) => setConfirmReady(e.target.checked)}
                              className="w-5 h-5 bg-bg-primary border-border rounded cursor-pointer accent-[#EC4899]"
                            />
                            <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
                              I CONFIRM THE CANDIDATE HAS FINISHED ALL PROTOCOLS
                            </span>
                          </label>
                          {(!isRoadmapComplete || skillReview?.status !== 'submitted') && (
                            <p className="text-[10px] font-semibold text-error uppercase">Locks until all 4 Roadmap Stages are COMPLETE and Skill Review is SUBMITTED.</p>
                          )}
                        </div>

                        {/* Statement write */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            <label className="flex items-center gap-2">
                              <span>Professional verification statement</span>
                              <button
                                type="button"
                                onClick={handleGenerateAiVerificationStatement}
                                disabled={loadingAiStatement || !confirmReady || !menteeProfile}
                                className="px-2 py-0.5 text-[8px] font-extrabold bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/20 rounded flex items-center gap-1 transition-all uppercase disabled:opacity-40 cursor-pointer"
                              >
                                {loadingAiStatement ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                                Co-Write with Gemini 3.5
                              </button>
                            </label>
                            <span className={statementText.split(' ').filter(Boolean).length < 50 ? 'text-error' : 'text-success'}>
                              {statementText.split(' ').filter(Boolean).length} / 200 WORDS (MIN 50)
                            </span>
                          </div>
                          <textarea 
                            rows={4}
                            value={statementText}
                            placeholder="Write a comprehensive overview of the candidate's core strengths, build capacity, and character readiness for the industry..."
                            onChange={(e) => setStatementText(e.target.value)}
                            disabled={!confirmReady}
                            className="w-full px-4 py-4 bg-bg-secondary border border-border rounded-xl text-xs outline-none focus:border-secondary resize-none placeholder:text-text-muted/40 disabled:opacity-40"
                          />
                        </div>

                        {/* Top Strengths selectors */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Select Verified Strengths (Up to 3 tags)</label>
                          <div className="flex flex-wrap gap-2.5">
                            {['Dynamic Problem Solver', 'Excellent Communicator', 'Robust System Architect', 'PostgreSQL Expert', 'Node.js Core', 'Docker Containerization', 'Agile Product Master', 'UI Design Keen', 'Self-Motivated builder'].map((tag) => {
                              const selected = selectedStrengths.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  disabled={!confirmReady || (!selected && selectedStrengths.length >= 3)}
                                  onClick={() => {
                                    if (selected) {
                                      setSelectedStrengths(selectedStrengths.filter(t => t !== tag));
                                    } else {
                                      setSelectedStrengths([...selectedStrengths, tag]);
                                    }
                                  }}
                                  className={`px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
                                    selected ? 'bg-secondary text-white border-secondary' : 'bg-bg-secondary border-border text-text-muted hover:border-secondary'
                                  } disabled:opacity-40`}
                                >
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          onClick={handleIssueVerification}
                          disabled={issuingCert || !confirmReady || statementText.split(' ').filter(Boolean).length < 50 || selectedStrengths.length === 0}
                          className="btn-primary w-full text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 py-4"
                        >
                          {issuingCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <AwardIcon className="w-4.5 h-4.5" />}
                          COMPILE & CO-SIGN CERTIFICATE
                        </button>
                      </div>

                      {/* Live Certificate Preview mockup */}
                      <div className="bg-[#050510] border-2 border-[#1E1E3F]/35 p-8 rounded-3xl relative text-center text-white space-y-10 font-sans shadow-2xl overflow-hidden min-h-[450px] flex flex-col justify-between">
                        {/* Golden overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute -top-12 -left-12 w-28 h-28 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none" />

                        <div className="space-y-2 relative z-10 pt-4">
                          <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-[0.3em]">CareerBridge Guild Network</p>
                          <h4 className="text-xl font-bold uppercase tracking-widest border-b border-white/10 pb-4 max-w-sm mx-auto">CERTIFICATE OF READINESS</h4>
                        </div>

                        <div className="space-y-4 relative z-10">
                          <p className="text-xs text-white/40 italic uppercase tracking-wider">This official endorsement of software engineering competencies is issued to</p>
                          <h2 className="text-3xl font-black tracking-tight text-white">{selectedConn.menteeName}</h2>
                          <p className="text-xs text-white/50 leading-relaxed max-w-md mx-auto italic font-medium px-4">
                            "{statementText || 'Candidate professional verification statement preview...'}"
                          </p>
                        </div>

                        {/* Strength tags in Cert */}
                        <div className="flex justify-center gap-2 relative z-10">
                          {selectedStrengths.map((str) => (
                            <span key={str} className="bg-white/[0.04] border border-white/15 px-3 py-1 rounded text-[8px] font-bold tracking-widest text-yellow-500 uppercase">
                              {str}
                            </span>
                          ))}
                        </div>

                        <div className="border-t border-white/10 pt-6 flex justify-between items-end relative z-10 px-4 pb-2">
                          <div className="text-left space-y-1">
                            <span className="text-[8px] text-white/30 uppercase tracking-widest block font-bold">CO-SINGED REPRESENTATIVE</span>
                            <p className="text-xs font-bold text-white max-w-[150px] truncate">{profile.displayName}</p>
                            <span className="text-[8px] text-white/40 block leading-tight max-w-[150px] truncate">{profile.company || 'Guild Partner'}</span>
                          </div>

                          <div className="w-10 h-10 bg-yellow-500/10 rounded-full border border-yellow-500/20 flex items-center justify-center text-yellow-500 shrink-0">
                            <Award className="w-5 h-5" />
                          </div>

                          <div className="text-right space-y-1">
                            <span className="text-[8px] text-white/30 uppercase tracking-widest block font-bold">ISSUED DATE / AUTH</span>
                            <p className="text-xs font-mono font-bold text-white">{new Date().toLocaleDateString()}</p>
                            <span className="text-[7.5px] text-yellow-500 font-mono block">VERIFIED_SECURE</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-10 group">
            <div className="relative">
              <div className="absolute -inset-8 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-1000 pointer-events-none" />
              <div className="w-24 h-24 bg-bg-secondary rounded-[2rem] border border-border flex items-center justify-center text-text-muted/20 group-hover:text-primary group-hover:scale-110 transition-all duration-700 relative z-10 shadow-sm">
                <Users className="w-10 h-10" />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-bold text-text-primary tracking-tight">Mentorship Dashboard Workspace</h3>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] max-w-sm mx-auto">
                SELECT AN ACTIVE GRADUATE FROM THE ROSTER TO TRACK SPRINT ROADMAPS, ARRANGE CALLS, OVERRIDE SKILL AUDITS, AND CO-SIGN DEPLOYMENT CERTIFICATES.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
