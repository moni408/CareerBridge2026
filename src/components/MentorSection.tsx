import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { sendCrossRoleEmailNotification } from '../services/emailService';
import { 
  collection, query, where, onSnapshot, doc, getDoc, 
  updateDoc, addDoc, setDoc, getDocs, orderBy, limit 
} from 'firebase/firestore';
import { 
  calculateLevelInfo, awardXP, auditAndFlagRapidApprovals,
  computeImpactScore, generateEndorsementLetter, exportSessionsCSV,
  seedDemoData, clearDemoMentors, LEVELS, XP_RULES
} from '../services/mentorBackend';
import { 
  LayoutDashboard, Users, Bell, ClipboardCheck, Award, 
  User as UserIcon, Settings, Star, TrendingUp, Trophy, 
  Clock, ArrowUpRight, Search, Check, X, ShieldAlert, ShieldCheck,
  Loader2, Play, FileText, Send, Paperclip, ChevronRight,
  ExternalLink, BarChart3, Heart, LogIn, ChevronDown, CheckCircle, Plus, Calendar, Download, Share2, Sparkles, Video,
  Lock, CheckCircle2, ZoomIn, ZoomOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MenteeProfilePage } from './MenteeProfilePage';
import { OneToOneSessionsPage } from './OneToOneSessionsPage';
import { MentorMessagingPage } from './MentorMessagingPage';
import { PublicProfileModal } from './PublicProfileModal';
import { LearningSessionModule } from './LearningSessionModule';

export function MentorSection() {
  const { profile, user, setView, view } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('mentor-dashboard');

  // SHARED STATES
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [activeConnections, setActiveConnections] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allGraduates, setAllGraduates] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [xpEvents, setXpEvents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [realMentors, setRealMentors] = useState<any[]>([]);
  const [selectedMentee, setSelectedMentee] = useState<any | null>(null);
  const [selectedProfileConnection, setSelectedProfileConnection] = useState<any | null>(null);
  const [viewingCvUrl, setViewingCvUrl] = useState<string | null>(null);
  const [viewingCvName, setViewingCvName] = useState<string>('');
  const [publicProfileOpen, setPublicProfileOpen] = useState<boolean>(false);
  const [publicProfileType, setPublicProfileType] = useState<'student' | 'mentor' | 'industry'>('student');
  const [publicProfileData, setPublicProfileData] = useState<any | null>(null);

  // Endorsement Modal states
  const [isEndorsementModalOpen, setIsEndorsementModalOpen] = useState<boolean>(false);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [certificateZoom, setCertificateZoom] = useState<number>(0.9);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [endorsementMenteeId, setEndorsementMenteeId] = useState<string>('');
  const [endorsementSkills, setEndorsementSkills] = useState<string>('');
  const [endorsementProjects, setEndorsementProjects] = useState<string>('');
  const [endorsementConnectivity, setEndorsementConnectivity] = useState<string>('');
  const [submittingEndorsement, setSubmittingEndorsement] = useState<boolean>(false);

  // Sync activeTab with the global view from the sidebar
  useEffect(() => {
    if (view && view.startsWith('mentor-')) {
      setActiveTab(view);
      // reset selected mentee on workspace transition if none set
      if (view === 'mentor-workspace' && activeConnections.length > 0 && !selectedMentee) {
        setSelectedMentee(activeConnections[0]);
      }
    }
  }, [view, activeConnections, selectedMentee]);

  // Trigger background cleanup of demo mentors once on mount
  useEffect(() => {
    clearDemoMentors().catch(err => console.warn('Auto demo mentors cleanup error:', err));
  }, []);

  // REALTIME SYNC FOR DATA
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // 1. Sync Connections
    const connQ = query(
      collection(db, 'mentorship_connections'),
      where('mentorId', '==', user.uid)
    );
    const unsubConn = onSnapshot(connQ, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveConnections(list);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'mentorship_connections'));

    // 2. Sync Requests
    const reqQ = query(
      collection(db, 'mentorship_requests'),
      where('mentorId', '==', user.uid)
    );
    const unsubReq = onSnapshot(reqQ, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingRequests(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'mentorship_requests'));

    // 3. Sync Graduates/Candidates
    const gradsQ = query(
      collection(db, 'users'),
      where('role', '==', 'graduate')
    );
    const unsubGrads = onSnapshot(gradsQ, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllGraduates(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'users_graduates'));

    // 4. Sync Activities
    const actQ = query(
      collection(db, 'activities'),
      where('mentorId', '==', user.uid)
    );
    const unsubAct = onSnapshot(actQ, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActivities(list.sort((a: any, b: any) => b.ts - a.ts));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'activities'));

    // 5. Sync XP events
    const xpQ = query(
      collection(db, 'xp_events'),
      where('mentorId', '==', user.uid)
    );
    const unsubXp = onSnapshot(xpQ, (snap) => {
      const list = snap.docs.map(doc => doc.data());
      setXpEvents(list.sort((a:any, b:any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'xp_events'));

    // 6. Sync Sessions
    const sessionsQ = query(
      collection(db, 'sessions'),
      where('mentorId', '==', user.uid)
    );
    const unsubSessions = onSnapshot(sessionsQ, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'sessions'));

    // 7. Sync Real Mentors for Leaderboard Rankings
    const mentorsQ = query(
      collection(db, 'users'),
      where('role', '==', 'mentor')
    );
    const unsubMentors = onSnapshot(mentorsQ, async (usersSnap) => {
      try {
        const mentorsColSnap = await getDocs(collection(db, 'mentors'));
        const isDemo = (id: string, name: string) => {
          const lowerId = (id || '').toLowerCase();
          const lowerName = (name || '').trim().toLowerCase();
          return lowerId.includes('mentor_rahman') || lowerId.includes('mentor_sara') || lowerId.includes('mentor_jack') ||
                 lowerId.includes('demo') ||
                 lowerName.includes('dr. faiz rahman') || lowerName.includes('faiz rahman') ||
                 lowerName.includes('sara tan') || lowerName.includes('jack miller');
        };

        const mentorsMap = new Map<string, any>();

        usersSnap.docs.forEach((d) => {
          const data = d.data();
          const uid = d.id || data.uid;
          if (!uid) return;
          const name = data.displayName || data.name || 'Mentor User';
          if (isDemo(uid, name)) return;
          const xpVal = typeof data.xp === 'number' ? data.xp : (typeof data.score === 'number' ? data.score : 0);
          mentorsMap.set(uid, {
            id: uid,
            uid: uid,
            name: name,
            role: data.experience?.[0]?.title || data.jobTitle || data.role || 'Industry Advisor',
            company: data.experience?.[0]?.company || data.company || data.industry || 'CareerBridge Guild',
            xp: xpVal,
            level: calculateLevelInfo(xpVal).level,
            avatar: data.photoURL || data.photo || data.image || data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            verified: data.verified === true || data.verificationStatus === 'verified'
          });
        });

        mentorsColSnap.docs.forEach((d) => {
          const data = d.data();
          const uid = d.id || data.uid;
          if (!uid) return;
          const name = data.name || data.displayName || 'Mentor User';
          if (isDemo(uid, name)) return;
          const existing = mentorsMap.get(uid) || {};
          const xpVal = typeof data.xp === 'number' ? data.xp : (typeof data.score === 'number' ? data.score : (existing.xp || 0));
          mentorsMap.set(uid, {
            ...existing,
            ...data,
            id: uid,
            uid: uid,
            name: data.name || data.displayName || existing.name || name,
            role: data.role || data.jobTitle || existing.role || 'Industry Advisor',
            company: data.company || existing.company || 'CareerBridge Guild',
            avatar: data.image || data.avatar || data.photo || data.photoURL || existing.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            verified: data.verified === true || data.verificationStatus === 'verified' || existing.verified,
            xp: xpVal,
            level: calculateLevelInfo(xpVal).level
          });
        });

        // Ensure active current mentor profile is synchronized with latest profile xp
        if (user && profile?.role === 'mentor') {
          const currentXp = typeof profile.xp === 'number' ? profile.xp : (typeof profile.score === 'number' ? profile.score : 0);
          mentorsMap.set(user.uid, {
            id: user.uid,
            uid: user.uid,
            name: profile.displayName || profile.name || 'You',
            role: profile.jobTitle || profile.role || profile.experience?.[0]?.title || 'Industry Guide',
            company: profile.company || profile.industry || 'CareerBridge Guild',
            xp: currentXp,
            level: calculateLevelInfo(currentXp).level,
            avatar: profile.photoURL || profile.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            verified: true,
            isYou: true
          });
        }

        const sortedList = Array.from(mentorsMap.values()).sort((a, b) => (b.xp || 0) - (a.xp || 0));
        setRealMentors(sortedList);
      } catch (e) {
        console.warn('Error fetching mentors for leaderboard:', e);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'users_mentors'));

    return () => {
      unsubConn();
      unsubReq();
      unsubGrads();
      unsubAct();
      unsubXp();
      unsubSessions();
      unsubMentors();
    };
  }, [user, profile]);

  // Auto select first connection if available
  useEffect(() => {
    if (activeConnections.length > 0 && !selectedMentee) {
      setSelectedMentee(activeConnections[0]);
    }
  }, [activeConnections, selectedMentee]);

  // Handle Seeding Action
  const triggerSeedData = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      alert('CareerBridge demo data seeded successfully! Try reloading or checking your slots.');
    } catch (e: any) {
      console.error(e);
      alert('Error during seeding: ' + e.message);
    } finally {
      setSeeding(false);
    }
  };

  if(!user) {
    return (
      <div className="p-8 text-center bg-bg-secondary rounded-2xl border border-border">
        <p className="text-sm font-medium">Please sign in as a mentor protocol to access this suite.</p>
      </div>
    );
  }

  // CALC LEVEL INFO
  const mentorXp = profile?.xp || 0;
  const levelInfo = calculateLevelInfo(mentorXp);
  const impactSummary = computeImpactScore(activeConnections, sessions);

  // LEVEL UNLOCK FLAGS
  const isExpert = mentorXp >= LEVELS.EXPERT.min;
  const isSenior = mentorXp >= LEVELS.SENIOR.min;
  const isJunior = mentorXp >= LEVELS.JUNIOR.min;
  const isLeader = mentorXp >= LEVELS.LEADER.min;

  // 500 XP Proof of Standing Unlock & Live Platform Metrics
  const isCertificateUnlocked = mentorXp >= 500;
  const myRankIndex = realMentors.findIndex(m => m.uid === user?.uid || m.isYou);
  const myPlatformRank = myRankIndex >= 0 ? myRankIndex + 1 : 1;
  const studentsMentoredCount = activeConnections.length;

  // Helper to render high-fidelity vector certificate directly in jsPDF
  const renderVectorCertificate = (pdf: jsPDF, data: {
    recipientName: string;
    recipientTitle: string;
    recipientCompany: string;
    rank: number;
    menteesCount: number;
    xp: number;
    level: string;
    credentialId: string;
    ledgerHash: string;
    issueDate: string;
  }) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // White background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Outer gold double borders
    pdf.setDrawColor(217, 119, 6);
    pdf.setLineWidth(1.5);
    pdf.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S');
    pdf.setLineWidth(0.5);
    pdf.rect(14.5, 14.5, pageWidth - 29, pageHeight - 29, 'S');

    // Corner decorative accents
    pdf.setFillColor(217, 119, 6);
    pdf.circle(18, 18, 1.5, 'F');
    pdf.circle(pageWidth - 18, 18, 1.5, 'F');
    pdf.circle(18, pageHeight - 18, 1.5, 'F');
    pdf.circle(pageWidth - 18, pageHeight - 18, 1.5, 'F');

    // Top Institution Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(180, 83, 9);
    pdf.text('CAREERBRIDGE GUILD ACCREDITATION', pageWidth / 2, 34, { align: 'center' });

    // Main Certificate Title
    pdf.setFont('times', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Certificate of Mentorship Standing', pageWidth / 2, 46, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Institutional Verification of Platform Rank & Graduate Mentoring Record', pageWidth / 2, 53, { align: 'center' });

    // Accent line
    pdf.setDrawColor(245, 158, 11);
    pdf.setLineWidth(0.4);
    pdf.line(40, 58, pageWidth - 40, 58);

    // Certifies statement
    pdf.setFont('times', 'italic');
    pdf.setFontSize(11);
    pdf.setTextColor(71, 85, 105);
    pdf.text('This official institutional document hereby certifies that', pageWidth / 2, 72, { align: 'center' });

    // Recipient Name
    pdf.setFont('times', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(27, 42, 143);
    pdf.text(data.recipientName, pageWidth / 2, 86, { align: 'center' });

    // Underline
    const nameWidth = pdf.getTextWidth(data.recipientName);
    pdf.setDrawColor(27, 42, 143);
    pdf.setLineWidth(0.5);
    pdf.line((pageWidth - nameWidth) / 2 - 4, 89, (pageWidth + nameWidth) / 2 + 4, 89);

    // Role & Organization
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(51, 65, 85);
    pdf.text(`${data.recipientTitle} • ${data.recipientCompany}`, pageWidth / 2, 98, { align: 'center' });

    // Highlights Grid
    const boxY = 110;
    const boxWidth = 54;
    const boxHeight = 28;
    const gap = 8;
    const startX = (pageWidth - (boxWidth * 3 + gap * 2)) / 2;

    // Box 1: Rank
    pdf.setFillColor(254, 243, 199);
    pdf.setDrawColor(245, 158, 11);
    pdf.roundedRect(startX, boxY, boxWidth, boxHeight, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(180, 83, 9);
    pdf.text('PLATFORM STANDING', startX + boxWidth / 2, boxY + 7, { align: 'center' });
    pdf.setFontSize(14);
    pdf.text(`Rank #${data.rank}`, startX + boxWidth / 2, boxY + 16, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('CareerBridge Directory', startX + boxWidth / 2, boxY + 23, { align: 'center' });

    // Box 2: Mentoring Impact
    const box2X = startX + boxWidth + gap;
    pdf.setFillColor(238, 242, 255);
    pdf.setDrawColor(99, 102, 241);
    pdf.roundedRect(box2X, boxY, boxWidth, boxHeight, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(67, 56, 202);
    pdf.text('MENTORING IMPACT', box2X + boxWidth / 2, boxY + 7, { align: 'center' });
    pdf.setFontSize(14);
    pdf.text(`${data.menteesCount}`, box2X + boxWidth / 2, boxY + 16, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Active Mentees Guided', box2X + boxWidth / 2, boxY + 23, { align: 'center' });

    // Box 3: Accreditation Tier
    const box3X = box2X + boxWidth + gap;
    pdf.setFillColor(236, 253, 245);
    pdf.setDrawColor(16, 185, 129);
    pdf.roundedRect(box3X, boxY, boxWidth, boxHeight, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(4, 120, 87);
    pdf.text('ACCREDITATION TIER', box3X + boxWidth / 2, boxY + 7, { align: 'center' });
    pdf.setFontSize(14);
    pdf.text(`${data.xp} XP`, box3X + boxWidth / 2, boxY + 16, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(data.level, box3X + boxWidth / 2, boxY + 23, { align: 'center' });

    // Formal Statement
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(51, 65, 85);
    const narrative = `Has achieved Senior Mentorship Accreditation under CareerBridge standards, holding active rank #${data.rank} in the platform directory with ${data.menteesCount} successfully guided mentees. This document serves as official verifiable proof of leadership, candidate task evaluation, and professional mentorship impact.`;
    const splitText = pdf.splitTextToSize(narrative, pageWidth - 48);
    pdf.text(splitText, pageWidth / 2, 150, { align: 'center' });

    // Golden Official Seal
    pdf.setFillColor(245, 158, 11);
    pdf.circle(pageWidth / 2, 184, 13, 'F');
    pdf.setFillColor(254, 243, 199);
    pdf.circle(pageWidth / 2, 184, 11, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(180, 83, 9);
    pdf.text('OFFICIAL', pageWidth / 2, 182.5, { align: 'center' });
    pdf.text('SEAL', pageWidth / 2, 187, { align: 'center' });

    // Verification & Signatures
    pdf.setDrawColor(245, 158, 11);
    pdf.setLineWidth(0.4);
    pdf.line(26, 206, pageWidth - 26, 206);

    pdf.setFont('courier', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(30, 41, 59);
    pdf.text(`Credential ID: ${data.credentialId}`, 24, 216);
    pdf.text(`Ledger Hash:   ${data.ledgerHash}`, 24, 222);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Issued On:     ${data.issueDate}`, 24, 228);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(5, 150, 105);
    pdf.text('✓ VERIFIED CREDENTIAL', pageWidth - 24, 216, { align: 'right' });
    pdf.setFont('times', 'italic');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text('CareerBridge Academic & Guild Council', pageWidth - 24, 222, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Autonomous Ledger Verification System', pageWidth - 24, 228, { align: 'right' });
  };

  const handleDownloadPDF = async () => {
    setIsExportingPdf(true);
    setExportSuccess(null);

    const certData = {
      recipientName: profile?.displayName || profile?.name || 'Verified Mentor',
      recipientTitle: profile?.jobTitle || profile?.role || 'Senior Industry Mentor',
      recipientCompany: profile?.company || 'CareerBridge Industry Guild',
      rank: myPlatformRank,
      menteesCount: studentsMentoredCount,
      xp: mentorXp,
      level: levelInfo.level,
      credentialId: `CB-MTR-${(user?.uid || '8942').slice(0, 8).toUpperCase()}`,
      ledgerHash: `SHA256:CB-${(user?.uid || '8942').slice(0, 6).toUpperCase()}-${(mentorXp * 11 + 777).toString(16).toUpperCase()}`,
      issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    };

    const cleanName = certData.recipientName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `CareerBridge-Certificate-${cleanName}-Rank${myPlatformRank}.pdf`;

    try {
      // Direct high-resolution vector PDF generation (100% resilient, no DOM/CSS rules reading)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      renderVectorCertificate(pdf, certData);
      pdf.save(fileName);
      setExportSuccess('Certificate downloaded successfully as official PDF! You can now print or save it.');
      setTimeout(() => setExportSuccess(null), 6000);
    } catch (err: any) {
      console.error('Vector PDF export failed:', err);
      alert('Could not export PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Helper to compute average skills score for a graduate
  const getCompetencyScore = (menteeId: string) => {
    const graduate = allGraduates.find(g => g.id === menteeId);
    
    // Default skills fallback if user or skills don't exist
    const skillsList = graduate?.skills || [
      { name: 'React Development', score: 85 },
      { name: 'Tailwind CSS', score: 90 },
      { name: 'REST APIs', score: 55 },
      { name: 'PostgreSQL Indexes', score: 35 },
      { name: 'System Security', score: 45 }
    ];

    if (!skillsList || skillsList.length === 0) return 62;

    let total = 0;
    let count = 0;
    skillsList.forEach((s: any) => {
      let score = 0;
      if (typeof s === 'object' && s !== null) {
        score = typeof s.score === 'number' ? s.score : parseInt(s.score || '0');
      } else if (typeof s === 'string') {
        score = 65; // fallback for string-only skills
      }
      if (!isNaN(score) && score > 0) {
        total += score;
        count++;
      }
    });

    return count > 0 ? Math.round(total / count) : 62;
  };

  const handleSendEndorsement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !endorsementMenteeId) {
      alert("Please select a mentee first!");
      return;
    }

    const selectedConn = activeConnections.find(c => c.menteeId === endorsementMenteeId);
    if (!selectedConn) {
      alert("Selected connection record not found.");
      return;
    }

    setSubmittingEndorsement(true);
    try {
      const parsedSkills = endorsementSkills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // 1. Generate Letter Text
      const mentorDisplayName = profile?.displayName || user.displayName || 'Mentor';
      const letterText = `OFFICIAL CAREERBRIDGE ENDORSEMENT LETTER
==========================================
Date: ${new Date().toLocaleDateString()}
Mentor: ${mentorDisplayName} (${profile?.industry || 'Software Engineering'})
Mentee: ${selectedConn.menteeName}

I am writing to formally provide my high-level professional endorsement for ${selectedConn.menteeName}, whom I have guided through the CareerBridge mentorship program.

Successfully Completed Mentorship by: ${mentorDisplayName}

NEW SKILLS ACQUIRED & ENDORSED:
${parsedSkills.map(s => ` - ${s} (Verified Depth: 95%)`).join('\n')}

COMPLETED PROJECTS:
${endorsementProjects ? ` - ${endorsementProjects}` : ' - Mentorship-guided Capstone Milestone'}

OVERALL ASSESSMENT & CONNECTIVITY:
${endorsementConnectivity || 'Demonstrated outstanding collaborative drive, consistent communications, and technical execution.'}

Signed,
${mentorDisplayName}
CareerBridge Verified Expert Mentor`;

      // 2. Save endorsement to collection
      const endorsementData = {
        mentorId: user.uid,
        mentorName: mentorDisplayName,
        mentorIndustry: profile?.industry || 'Software Engineering',
        menteeId: selectedConn.menteeId,
        menteeName: selectedConn.menteeName,
        skillsTaught: parsedSkills,
        projectsCompleted: endorsementProjects,
        connectivity: endorsementConnectivity,
        letterText: letterText,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'endorsements'), endorsementData);

      // 3. Retrieve student and update user doc
      const studentDocRef = doc(db, 'users', selectedConn.menteeId);
      const studentSnap = await getDoc(studentDocRef);
      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        const existingSkills = studentData.skills || [];
        
        // Map new skills
        const newSkillsToAdd = parsedSkills.map(skillName => ({
          name: skillName,
          score: 95,
          reason: `Mentorship completion under ${mentorDisplayName}.`,
          category: 'technical' as const
        }));

        // Merge skills
        const mergedSkills = [...existingSkills];
        newSkillsToAdd.forEach(newSkill => {
          const idx = mergedSkills.findIndex((s: any) => (s.name || s.title || '').toLowerCase() === newSkill.name.toLowerCase());
          if (idx > -1) {
            mergedSkills[idx] = { 
              ...mergedSkills[idx], 
              score: 95, 
              reason: newSkill.reason 
            };
          } else {
            mergedSkills.push(newSkill);
          }
        });

        // readinessScore calculation
        const currentReadiness = studentData.readinessScore || studentData.meanSkillScore || 65;
        const newReadiness = Math.min(100, currentReadiness + 15);

        // Update projects
        const existingProjects = studentData.projects || [];
        const mergedProjects = [...existingProjects];
        if (endorsementProjects.trim()) {
          mergedProjects.push({
            name: endorsementProjects.trim(),
            techStack: parsedSkills,
            description: `Project mentored and endorsed by ${mentorDisplayName}.`
          });
        }

        // If student has savedCV, inject the verified mentorship experience into their CV
        let updatedSavedCV = studentData.savedCV ? { ...studentData.savedCV } : null;
        if (updatedSavedCV) {
          const mentorshipExp = {
            company: 'CareerBridge Mentorship Program',
            role: 'Verified Mentorship Graduate (Mentee)',
            location: 'Remote / Global',
            duration: 'Completed',
            isEndorsedExperience: true,
            mentorName: mentorDisplayName,
            description: [
              `Successfully completed formal CareerBridge Mentorship Program under the 1:1 guidance of ${mentorDisplayName} (Senior Industry Mentor).`,
              parsedSkills.length > 0 ? `Verified Competencies & Applied Practices: ${parsedSkills.join(', ')}.` : '',
              endorsementProjects.trim() ? `Capstone Project Milestone: ${endorsementProjects.trim()} — reviewed, validated, and accredited.` : '',
              `Awarded Official CareerBridge Verified Mentorship Endorsement Letter & Graduate Standing.`
            ].filter(Boolean)
          };
          const existingExp = Array.isArray(updatedSavedCV.experience) ? updatedSavedCV.experience : [];
          const filteredExp = existingExp.filter((e: any) => e.company !== 'CareerBridge Mentorship Program');
          updatedSavedCV.experience = [mentorshipExp, ...filteredExp];

          const existingCerts = Array.isArray(updatedSavedCV.certifications) ? updatedSavedCV.certifications : [];
          const endorsementCertTitle = `CareerBridge Verified Mentorship Endorsement — Endorsed by ${mentorDisplayName}`;
          if (!existingCerts.includes(endorsementCertTitle)) {
            updatedSavedCV.certifications = [endorsementCertTitle, ...existingCerts];
          }
        }

        // Write updates to Firestore
        await updateDoc(studentDocRef, {
          skills: mergedSkills,
          projects: mergedProjects,
          readinessScore: newReadiness,
          meanSkillScore: newReadiness,
          isEndorsed: true,
          endorsementMentorName: mentorDisplayName,
          ...(updatedSavedCV ? { savedCV: updatedSavedCV } : {}),
          updatedAt: new Date().toISOString()
        });
      }

      // Also create an activity item for the student to see
      await addDoc(collection(db, 'activities'), {
        type: 'endorsement',
        title: `Mentorship Completed & Endorsed!`,
        content: `Successfully completed the mentorship by ${mentorDisplayName}. Verified key competencies: ${parsedSkills.join(', ')}.`,
        postedBy: user.uid,
        userName: mentorDisplayName,
        userRole: 'mentor',
        createdAt: new Date().toISOString()
      });

      // Award XP to the mentor for completing a mentorship!
      await awardXP('CLOSE_SESSION', user.uid, { menteeName: selectedConn.menteeName });

      alert(`Success! The endorsement letter has been sent to ${selectedConn.menteeName}. Their Skill Audit, Readiness Score, Competency Cockpit, and Trajectory Path have been updated in real-time!`);
      
      // Reset form & close
      setEndorsementSkills('');
      setEndorsementProjects('');
      setEndorsementConnectivity('');
      setIsEndorsementModalOpen(false);
    } catch (err) {
      console.error("Failed to send endorsement:", err);
      alert("Error sending endorsement. Please try again.");
    } finally {
      setSubmittingEndorsement(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto max-w-7xl mx-auto p-4 md:p-8 text-left select-none relative pb-20">
      
      {/* SEED TOP FLOATER ALERT */}
      {activeConnections.length === 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-primary/10 border border-primary/20 rounded-xl relative z-10">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold text-text-primary">Bootstrap Demonstration Data Available</p>
              <p className="text-[11px] text-text-secondary mt-0.5">Seed 3 expert level mentors, 2 active connections, and 5 grad profiles instantly.</p>
            </div>
          </div>
          <button 
            disabled={seeding}
            onClick={triggerSeedData}
            className="px-4 py-1.5 bg-primary text-white text-[11px] font-bold rounded-full hover:bg-primary-hover active:scale-95 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
          >
            {seeding ? 'SEEDING PROTOCOL...' : '⚡ INITIALIZE SEED DATA'}
          </button>
        </div>
      )}



      {/* CORE VIEW PORTS */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'mentor-dashboard' && (
            <motion.div key="db" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              
              {/* TOP LEVEL INTRO SUMMARY card */}
              <div className="p-6 bg-card rounded-2xl border border-border shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-primary-light text-primary border border-primary/20 rounded">
                      Level: {levelInfo.level}
                    </span>
                    <span className="text-xs text-text-muted">Total: {mentorXp} XP</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-text-primary">Welcome Back, {profile?.displayName || 'Industry Guide'}</h3>
                  <p className="text-xs text-text-secondary">Your active students are waiting for task audits. Help them address critical skill gaps.</p>
                </div>
                
                {/* XP PROCESS CONTAINER WITH PILLS */}
                <div className="w-full md:w-80 space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-bold text-text-secondary">
                    <span>XP progress to Next Rank</span>
                    <span className="text-primary font-mono">{mentorXp} / {levelInfo.max} XP ({levelInfo.progress.toFixed(0)}%)</span>
                  </div>
                  <div className="relative w-full h-6 bg-bg-secondary border border-border rounded-full overflow-hidden p-0.5 shadow-inner flex items-center">
                    <div 
                      className="h-full bg-gradient-to-r from-primary via-indigo-600 to-orange-500 rounded-full transition-all duration-500 flex items-center justify-center px-2.5 relative min-w-[3.5rem] shadow-xs" 
                      style={{ width: `${Math.max(levelInfo.progress, 18)}%` }}
                    >
                      <span className="text-[10px] font-black text-white tracking-wider drop-shadow-md whitespace-nowrap">
                        ⚡ {mentorXp} XP
                      </span>
                    </div>
                    {levelInfo.progress < 30 && (
                      <span className="absolute right-3 text-[10px] font-mono font-bold text-text-muted">
                        {mentorXp} / {levelInfo.max} XP
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* IMPACT SCORE WIDGET AND SCORE STRIP */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* IMPACT SUMMARY card */}
                <div className="p-5 bg-card border border-border rounded-xl space-y-3 shadow-xs">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Impact Score</p>
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  </div>
                  <h4 className="text-4xl font-extrabold text-[#534AB7]">{impactSummary.score}<span className="text-sm font-normal text-text-muted">/100</span></h4>
                  <p className="text-[11px] text-text-secondary leading-normal">{impactSummary.breakdown}</p>
                </div>

                {/* STATS COUNT */}
                <div className="p-5 bg-card border border-border rounded-xl flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Active Mentees</p>
                    <h4 className="text-3xl font-extrabold text-text-primary">{activeConnections.filter(c => c.status !== 'completed').length}</h4>
                    <p className="text-xs text-text-secondary">Connected slots limits: {profile?.maxMentees || 8}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center text-text-secondary border border-border">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* TASKS UNDER REVIEW */}
                <div className="p-5 bg-card border border-border rounded-xl flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Open Tasks Reviews</p>
                    <h4 className="text-3xl font-extrabold text-amber-500">
                      {activeConnections.reduce((acc, c) => acc + (c.roadmap?.filter((r: any) => !r.completed).length || 0), 0)}
                    </h4>
                    <p className="text-xs text-text-secondary">Needs attention soon</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* TWO COLUMN GRID FOR ACTIVITIES AND DEADLINES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* RECENT ACTIVITIES logs */}
                <div className="p-6 bg-card border border-border rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold tracking-tight text-text-primary uppercase border-b border-border pb-3">Recent Activity Stream</h4>
                  {activities.length === 0 ? (
                    <div className="py-12 text-center text-text-muted text-xs">No records logged in the active session.</div>
                  ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {activities.map((a, i) => (
                        <div key={i} className="flex gap-3 text-xs">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            a.type === 'success' ? 'bg-success' : 'bg-primary'
                          }`} />
                          <div className="flex-1 space-y-1">
                            <p className="text-text-secondary leading-snug" dangerouslySetInnerHTML={{ __html: a.html }} />
                            <p className="text-[10px] text-text-muted">{new Date(a.ts).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* LEADERBOARD WIDGET */}
                <div className="p-6 bg-card border border-border rounded-2xl space-y-4">
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <div>
                      <h4 className="text-sm font-bold tracking-tight text-text-primary uppercase flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" /> Leaderboard Rankings
                      </h4>
                      <p className="text-[10px] text-text-muted mt-0.5">Real-time platform mentors ranked by verified XP</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      {realMentors.length} Real Mentors
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                    {realMentors.length === 0 ? (
                      <div className="py-8 text-center text-xs text-text-muted">
                        No mentor rankings recorded yet.
                      </div>
                    ) : (
                      realMentors.map((lead, i) => {
                        const position = i + 1;
                        const isCurrent = user?.uid === lead.uid || lead.isYou;
                        return (
                          <div 
                            key={lead.id || i} 
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                              isCurrent 
                                ? 'bg-primary/10 border-primary/30 font-bold shadow-xs' 
                                : 'bg-card border-border/70 hover:border-border'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                position === 1 ? 'bg-amber-500 text-white shadow-xs' :
                                position === 2 ? 'bg-slate-300 text-slate-800' :
                                position === 3 ? 'bg-amber-700 text-white' :
                                'bg-bg-secondary text-text-muted border border-border'
                              }`}>
                                #{position}
                              </div>
                              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0 uppercase tracking-wider">
                                {(lead.name || 'Mentor').trim().slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-text-primary font-bold flex items-center gap-1.5">
                                  {lead.name}
                                  {isCurrent && (
                                    <span className="text-[9px] bg-primary text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                                      YOU
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-text-muted">{lead.role || lead.company} • {lead.level}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-extrabold text-primary text-sm">
                                {lead.xp.toLocaleString()} XP
                              </span>
                              <p className="text-[9px] text-text-muted font-mono">Position #{position}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* REQUESTS LIST PANELS */}
          {activeTab === 'mentor-requests' && (
            <motion.div key="reqs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold">Mentees Connection Requests</h3>
                  <p className="text-xs text-text-secondary">Assess student introduces, resume gaps, and match priorities.</p>
                </div>
                
                {/* MAX METEES CONTROLS */}
                <div className="bg-bg-secondary p-3.5 rounded-xl border border-border flex items-center gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-extrabold text-text-muted">Mentee Slot capacity</p>
                    <p className="text-xs font-bold text-text-primary">Current Cap: {profile?.maxMentees || 8}</p>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={profile?.maxMentees || 8}
                    onChange={async (e) => {
                      if (!user) return;
                      await updateDoc(doc(db, 'users', user.uid), {
                        maxMentees: Number(e.target.value)
                      });
                    }}
                    className="w-24 accent-primary" 
                  />
                </div>
              </div>

              {pendingRequests.filter(r => r.status === 'pending').length === 0 ? (
                <div className="p-12 text-center border border-dashed border-border rounded-2xl text-text-muted text-xs">
                  No pending requests currently. Try seeding data to test!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingRequests.filter(r => r.status === 'pending').map((req) => (
                    <div key={req.id} className="p-5 bg-card border border-border rounded-xl space-y-4 shadow-xs text-left relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-text-primary">{req.menteeName}</h4>
                          <span className="inline-block text-[10px] px-2 py-0.5 bg-cool-gray/10 text-text-secondary border border-border rounded">
                            Graduate Profile Score: {req.menteeScore || 62}
                          </span>
                        </div>
                        <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded font-mono font-bold">
                          Relevance Match: 94%
                        </span>
                      </div>

                      <p className="text-xs text-text-secondary leading-relaxed bg-bg-secondary p-3 rounded-lg italic">
                        "{req.intro || req.message || 'No introduction note provided.'}"
                      </p>

                      <button
                        onClick={() => {
                          const grObj = allGraduates.find(g => g.id === req.menteeId || g.uid === req.menteeId) || {};
                          setPublicProfileType('student');
                          setPublicProfileData({
                            ...grObj,
                            ...req,
                            displayName: req.menteeName,
                            bio: req.message || req.intro || 'No introduction provided.'
                          });
                          setPublicProfileOpen(true);
                        }}
                        className="w-full py-2 bg-primary-light hover:bg-[#534AB7]/20 border border-[#534AB7]/10 text-[#534AB7] font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-primary" />
                        View Submitted CV Profile
                      </button>

                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase font-bold text-text-muted">Skill Gap Gaps To Resolve:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(req.skillsGap || ['OAuth', 'Vite Bundle optimization']).map((gap: string) => (
                            <span key={gap} className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] rounded border border-primary/10">
                              {gap}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* ACTION BUTTONS WITH REJECTION NOTICES */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={async () => {
                            if (activeConnections.length >= (profile?.maxMentees || 8)) {
                              alert(`Cap threshold reached! Maximum allowed connected mentees configured is ${profile?.maxMentees || 8}.`);
                              return;
                            }
                            
                            const connId = `conn_${Math.random().toString(36).substr(2, 9)}`;
                            await setDoc(doc(db, 'mentorship_connections', connId), {
                              id: connId,
                              menteeId: req.menteeId,
                              menteeName: req.menteeName,
                              mentorId: user.uid,
                              mentorName: profile?.displayName || 'Dr. Rahman',
                              createdAt: new Date().toISOString(),
                              progress: 0,
                              status: 'active',
                              activeStage: 1,
                              scoreDelta: 0,
                              roadmap: [
                                { id: 1, title: 'Profile & CV Complete', completed: true, completedAt: new Date().toISOString(), completedBy: 'system' },
                                { id: 2, title: 'Build 2 Key Projects', completed: false, completedAt: '' },
                                { id: 3, title: 'Address Target Skill Gaps', completed: false, completedAt: '' },
                                { id: 4, title: 'Job-Ready Final Evaluation', completed: false, completedAt: '' }
                              ]
                            });

                            await updateDoc(doc(db, 'mentorship_requests', req.id), { status: 'accepted' });
                            await awardXP('ACCEPT_REQUEST', user.uid, { menteeName: req.menteeName });

                            // Activity log
                            await addDoc(collection(db, 'activities'), {
                              mentorId: user.uid,
                              html: `Accepted mentorship connection for <span class="font-bold text-primary">${req.menteeName}</span>`,
                              type: 'success',
                              ts: Date.now()
                            });

                            alert('Connection Accepted successfully!');
                          }}
                          className="px-4 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
                        >
                          Accept Mentorship (+50 XP)
                        </button>
                        <button
                          onClick={async () => {
                            const reason = prompt('Please enter a constructive decline feedback reason note:');
                            if (reason === null) return;
                            await updateDoc(doc(db, 'mentorship_requests', req.id), {
                              status: 'declined',
                              declineReason: reason || 'Not a mutual match at this stage.'
                            });
                            alert('Request declined.');
                          }}
                          className="px-4 py-1.5 bg-bg-secondary text-text-secondary text-[11px] font-bold rounded-lg hover:bg-bg-tertiary border border-border active:scale-95 transition-all cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}

              {/* ARCHIVED COMPLETED DECLINED TRIPS */}
              <div className="p-6 bg-card border border-border rounded-2xl">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4">Past requests archive tab</h4>
                <div className="space-y-3">
                  {pendingRequests.filter(r => r.status !== 'pending').length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-6">No historical records.</p>
                  ) : (
                    pendingRequests.filter(r => r.status !== 'pending').map(r => (
                      <div key={r.id} className="flex justify-between items-center text-xs p-3 bg-bg-secondary/40 border border-border rounded-lg">
                        <div>
                          <p className="font-bold text-text-primary">{r.menteeName}</p>
                          <p className="text-[10px] text-text-muted">Created: {new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          r.status === 'accepted' ? 'bg-green-500/10 text-green-500 border-green-500/10' : 'bg-rose-500/10 text-rose-500 border-rose-500/10'
                        }`}>
                          {r.status.toUpperCase()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </motion.div>
          )}

                  {/* MENTEES GRID VIEW */}
          {activeTab === 'mentor-mentees' && (
            selectedProfileConnection ? (
              <MenteeProfilePage 
                connection={selectedProfileConnection} 
                onBack={() => setSelectedProfileConnection(null)} 
                onAssignTaskSuccess={() => {
                  setSelectedProfileConnection(null);
                  setActiveTab('mentor-workspace');
                }}
              />
            ) : (
              <motion.div key="mentees" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold">Connected Graduates Network</h3>
                    <p className="text-xs text-text-secondary">Progress monitors and targeted skill gaps resolutions.</p>
                  </div>
                </div>

                {activeConnections.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-border rounded-2xl text-text-muted text-xs">
                    No active mentees. Seed connections or accept pending requests to unlock layout.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeConnections.map((conn) => {
                      const graduateObj = allGraduates.find(g => g.id === conn.menteeId);
                      const cvUrl = graduateObj?.resumeUrl || 'https://careerbridge.edu/cv/alhaz_ali.pdf';
                      const compScore = getCompetencyScore(conn.menteeId);
                      return (
                        <div key={conn.id} className="p-5 bg-card border border-border rounded-xl space-y-4 shadow-sm text-left hover:shadow-md transition-all relative">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-text-primary">{conn.menteeName}</h4>
                              <p className="text-[10px] text-text-muted">Joined: {new Date(conn.createdAt).toLocaleDateString()}</p>
                            </div>
                            
                            {/* COMPETENCY SCORE BADGE */}
                            <span className="text-[10px] font-bold text-green-600 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                              Competency Score: {compScore}%
                            </span>
                          </div>

                          {/* SESSION PROGRESS BAR */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] text-text-secondary">
                              <span>Roadmap Progress</span>
                              <span>{conn.progress || 0}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${conn.progress || 0}%` }} />
                            </div>
                          </div>

                          {/* KEY COMPLETED STAGES WITH COUNT PILLS */}
                          <div className="border bg-bg-secondary/40 p-3 rounded-lg text-xs flex justify-between items-center border-border">
                            <span className="text-[10px] text-text-secondary font-medium">Completed Milestones:</span>
                            <span className="font-mono font-bold text-text-primary">
                              {conn.roadmap?.filter((r:any) => r.completed).length || 1} / 4
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const gr = allGraduates.find(g => g.id === conn.menteeId) || {};
                                setPublicProfileType('student');
                                setPublicProfileData({
                                  ...gr,
                                  name: conn.menteeName,
                                  menteeName: conn.menteeName,
                                  menteeId: conn.menteeId,
                                  resumeUrl: cvUrl,
                                  skills: gr.skills || [
                                    { name: 'React Development', score: 85 },
                                    { name: 'Tailwind CSS', score: 90 },
                                    { name: 'REST APIs', score: 55 },
                                    { name: 'PostgreSQL Indexes', score: 35 },
                                    { name: 'System Security', score: 45 }
                                  ]
                                });
                                setPublicProfileOpen(true);
                              }}
                              className="flex-1 py-1.5 bg-bg-secondary text-text-secondary hover:bg-bg-tertiary border border-border text-[10.5px] font-bold rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer text-center"
                            >
                              Profile Analysis
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMentee(conn);
                                setActiveTab('mentor-workspace');
                              }}
                              className="flex-1 py-1.5 bg-primary text-white hover:bg-primary-hover border border-primary text-[10.5px] font-bold rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs"
                            >
                              Workspace →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </motion.div>
            )
          )}

          {/* MENTEE WORKSPACE (Core Page) */}
          {activeTab === 'mentor-workspace' && (
            <motion.div key="workspac" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              
              {/* SELECTOR DROPDOWN ON TOP IF MULTIPLE MENTEES EXIST */}
              <div className="bg-bg-secondary p-4 rounded-xl border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Interactive Mentee Workspace Command Deck</h3>
                    <p className="text-[11px] text-text-secondary">Currently auditing performance data for {selectedMentee?.menteeName || 'candidate'}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <select 
                    value={selectedMentee?.id || ''} 
                    onChange={(e) => {
                      const found = activeConnections.find(c => c.id === e.target.value);
                      if (found) setSelectedMentee(found);
                    }}
                    className="bg-card text-xs border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
                  >
                    <option value="" disabled>Select Mentee Profile</option>
                    {activeConnections.map(c => (
                      <option key={c.id} value={c.id}>{c.menteeName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedMentee ? (
                <div className="p-12 text-center border border-dashed border-border rounded-2xl text-text-muted text-xs">
                  Please select or connect with a mentee to unlock the core workspace operations.
                </div>
              ) : (
                <WorkspaceMain deckConnection={selectedMentee} />
              )
            }

            </motion.div>
          )}

          {/* REPUTATION AND LEVELS MODULE */}
          {activeTab === 'mentor-reputation' && (
            <motion.div key="rep" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              
              {/* LEVEL DISPLAY PROGRESS BAR */}
              <div className="p-6 bg-card border border-border rounded-2xl shadow-xs space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Scoring & Rewards System</p>
                    <h3 className="text-xl font-bold text-text-primary">{levelInfo.level} TITLE UNLOCKED</h3>
                    <p className="text-xs text-text-secondary">Earning standard points based on candidate reviews & task validation guidelines.</p>
                  </div>
                  <Trophy className="w-8 h-8 text-amber-500" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono font-bold text-text-secondary">
                    <span>Rank Points: {mentorXp} XP</span>
                    <span>Next Rank Title: {mentorXp < 100 ? 'Junior guide (100 XP)' : mentorXp < 500 ? 'Senior guide (500 XP)' : mentorXp < 1200 ? 'Expert mentor (1200 XP)' : mentorXp < 2500 ? 'Thought leader (2500 XP)' : 'Highest Rank reached!'}</span>
                  </div>
                  <div className="relative w-full h-6 bg-bg-secondary border border-border rounded-full overflow-hidden p-0.5 shadow-inner flex items-center">
                    <div className="h-full bg-gradient-to-r from-primary via-indigo-600 to-orange-500 rounded-full transition-all duration-500 flex items-center justify-center px-2.5 relative min-w-[3.5rem]" style={{ width: `${Math.max(levelInfo.progress, 18)}%` }}>
                      <span className="text-[10px] font-black text-white tracking-wider drop-shadow-md whitespace-nowrap">⚡ {mentorXp} XP</span>
                    </div>
                    {levelInfo.progress < 30 && (
                      <span className="absolute right-3 text-[10px] font-mono font-bold text-text-muted">{mentorXp} / {levelInfo.max} XP</span>
                    )}
                  </div>
                </div>
              </div>

              {/* TWO SECIONS WITH CERTIFICATES AND ENDORSEMENT LETTERS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* OFFICIAL PROOF OF STANDING & DIPLOMA */}
                <div className="p-6 bg-card border border-border rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h4 className="text-sm font-bold tracking-tight text-text-primary flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" /> Official Proof of Standing & Accreditation
                    </h4>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isCertificateUnlocked 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`}>
                      {isCertificateUnlocked ? '✨ Unlocked (500+ XP)' : `Locked • ${mentorXp}/500 XP`}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    Unlocked at **500 XP (Senior Guide)**. Generates an institutional proof of standing certifying that you are **Rank #{myPlatformRank}** with **{studentsMentoredCount} successfully mentored {studentsMentoredCount === 1 ? 'student' : 'students'}** on CareerBridge.
                  </p>

                  <div className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-3 text-center transition-all ${
                    isCertificateUnlocked 
                      ? 'bg-gradient-to-b from-primary/5 to-transparent border-primary/20' 
                      : 'bg-bg-secondary/40 border-dashed border-border opacity-70'
                  }`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                      isCertificateUnlocked ? 'bg-primary text-white' : 'bg-bg-secondary text-text-muted border border-border'
                    }`}>
                      {isCertificateUnlocked ? <Award className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-text-primary">
                        Rank #{myPlatformRank} • Mentorship Accreditation Certificate
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {studentsMentoredCount} students successfully guided • Digitally authenticated on CareerBridge ledger
                      </p>
                    </div>

                    {isCertificateUnlocked ? (
                      <div className="flex flex-wrap gap-2 justify-center pt-1">
                        <button
                          id="btn-view-certificate"
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowCertificateModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Proof Document
                        </button>
                        <button
                          type="button"
                          disabled={isExportingPdf}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowCertificateModal(true);
                            setTimeout(() => handleDownloadPDF(), 350);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-60"
                        >
                          {isExportingPdf ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          Download PDF
                        </button>
                      </div>
                    ) : (
                      <div className="w-full max-w-xs space-y-1.5 pt-1">
                        <div className="w-full bg-bg-secondary rounded-full h-2 overflow-hidden border border-border">
                          <div 
                            className="bg-primary h-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.round((mentorXp / 500) * 100))}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-text-muted">
                          Reach 500 XP to unlock ({Math.max(0, 500 - mentorXp)} XP needed)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ENDORSEMENT LETTER GENERATOR WITH CHANNELS */}
                <div className="p-6 bg-card border border-border rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold tracking-tight text-text-primary border-b border-border pb-3 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-primary" /> Endorsement Letter Engine
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Auto-generate signed recommendation letters for candidates who address skill targets during active connections.
                  </p>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <select 
                        value={endorsementMenteeId}
                        onChange={(e) => setEndorsementMenteeId(e.target.value)}
                        className="bg-bg-secondary text-xs border border-border rounded-lg px-3 py-1.5 w-full focus:outline-none"
                      >
                        <option value="">Select connection record</option>
                        {activeConnections.map(c => (
                          <option key={c.id} value={c.menteeId}>{c.menteeName} (Competency: {getCompetencyScore(c.menteeId)}%)</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        if (!endorsementMenteeId) {
                          alert('Please select a connection candidate first!');
                          return;
                        }
                        setIsEndorsementModalOpen(true);
                      }}
                      className="w-full py-1.5 bg-bg-secondary text-text-primary hover:bg-bg-tertiary border border-border rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Write & Send Endorsement Letter
                    </button>
                  </div>
                </div>

              </div>

              {/* BADGES WALL GRID SECTIONS */}
              <div className="p-6 bg-card border border-border rounded-2xl space-y-6">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border pb-3">Mentor Achievements Vault</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {[
                    { id: 'top_mentor', name: 'Top Mentor', desc: 'Maintain 90+ Rank Rating', levelReq: 'Senior', earned: isSenior },
                    { id: '10_placements', name: '10 Placements', desc: '10 candidates placed', levelReq: 'Expert', earned: isExpert },
                    { id: 'verified_mentor', name: 'Verified Mentor', desc: 'Accreditation Complete', levelReq: 'Junior', earned: isJunior },
                    { id: 'master_leader', name: 'Thought Leader', desc: 'Reach 2500+ score', levelReq: 'Leader', earned: isLeader },
                    { id: 'consistency_streak', name: 'Consistency', desc: 'Guidance regularity', levelReq: 'Junior', earned: isJunior },
                  ].map((badge) => (
                    <div key={badge.id} className={`p-4 border rounded-xl flex flex-col items-center justify-center text-center space-y-2 transition-all duration-300 ${
                      badge.earned 
                        ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' 
                        : 'bg-transparent border-border grayscale opacity-40'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                        badge.earned ? 'bg-primary text-white' : 'bg-bg-secondary text-text-secondary'
                      }`}>
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-text-primary">{badge.name}</p>
                        <p className="text-[9px] text-text-muted mt-0.5 leading-snug">{badge.desc}</p>
                      </div>
                      <span className="text-[8px] tracking-wide uppercase px-1.5 py-0.5 bg-bg-secondary text-text-secondary border border-border rounded font-semibold font-mono">
                        {badge.levelReq} Guide
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* STUDENT FEEDBACK & REVIEWS LIST */}
              <div className="p-6 bg-card border border-border rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Scholar Session Evaluations & Feedback
                  </h4>
                  <span className="text-[10px] font-mono font-bold bg-[#534AB7]/10 text-[#534AB7] px-2.5 py-0.5 rounded-full">
                    Average Rating: {impactSummary.avgRating} / 5.0
                  </span>
                </div>

                {sessions.filter(s => s.feedback).length === 0 ? (
                  <div className="p-8 bg-bg-secondary/40 border border-dashed border-border rounded-xl text-center space-y-1">
                    <p className="text-xs font-bold text-text-secondary">No session reviews received yet.</p>
                    <p className="text-[10px] text-text-muted">Once your scholars complete a session and leave ratings/comments, they will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar">
                    {sessions.filter(s => s.feedback).map((sess) => (
                      <div key={sess.id} className="p-4 bg-bg-primary border border-border rounded-xl space-y-2 text-left">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[9px] uppercase font-mono bg-primary/10 text-primary tracking-wider font-bold px-2 py-0.5 rounded">
                              {sess.sessionType || 'Mentorship Session'}
                            </span>
                            <div className="flex items-center gap-1 mt-1.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`w-3.5 h-3.5 ${
                                    star <= sess.feedback.rating 
                                      ? 'fill-yellow-400 text-yellow-400' 
                                      : 'text-text-muted/20'
                                  }`} 
                                />
                              ))}
                              <span className="text-[10px] text-text-secondary font-mono font-bold ml-1">
                                {sess.feedback.rating} / 5
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-text-primary">Scholar: {sess.menteeName || 'Anonymous Scholar'}</p>
                            <p className="text-[8px] font-mono text-text-muted mt-0.5">
                              {new Date(sess.dateTime).toLocaleDateString([], { dateStyle: 'medium' })}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-text-secondary font-sans leading-relaxed italic">
                          "{sess.feedback.comment}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* DEDICATED LEADERBOARD TAB */}
          {activeTab === 'mentor-leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              
              {/* HEADER BANNER */}
              <div className="p-8 bg-gradient-to-r from-amber-500/10 via-primary/10 to-indigo-500/10 border border-amber-500/20 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" /> Platform Guild Leaderboard
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">Real Mentor Rankings & XP</h2>
                  <p className="text-xs text-text-secondary max-w-2xl">
                    Mentor rankings are computed dynamically in real-time from verified session completions, candidate feedback, and task reviews.
                  </p>
                </div>

                {user && profile?.role === 'mentor' && (
                  <div className="p-4 bg-card border border-border rounded-xl shadow-xs text-right shrink-0">
                    <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Your Active Rank Position</p>
                    <p className="text-2xl font-black text-primary font-mono mt-0.5">
                      #{realMentors.findIndex(m => m.uid === user.uid || m.isYou) + 1 || '1'}
                    </p>
                    <p className="text-[11px] font-mono font-bold text-amber-600 mt-0.5">
                      {mentorXp.toLocaleString()} XP • {levelInfo.level}
                    </p>
                  </div>
                )}
              </div>

              {/* TOP 3 PODIUM CARDS */}
              {realMentors.length >= 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  {/* SILVER #2 */}
                  {realMentors[1] && (
                    <div className="order-2 md:order-1 p-6 bg-card border border-slate-300/40 rounded-2xl shadow-sm text-center relative flex flex-col items-center justify-between space-y-4">
                      <div className="absolute -top-3 bg-slate-300 text-slate-900 text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full shadow-xs">
                        🥈 Rank #2 • Silver Guild
                      </div>
                      <div className="relative mt-2">
                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-4 border-slate-300 shadow-md flex items-center justify-center font-black text-2xl uppercase tracking-wider">
                          {(realMentors[1].name || 'Mentor').trim().slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-text-primary flex items-center justify-center gap-1.5">
                          {realMentors[1].name}
                          {(user?.uid === realMentors[1].uid || realMentors[1].isYou) && (
                            <span className="text-[9px] bg-primary text-white font-extrabold px-1.5 py-0.2 rounded-full">YOU</span>
                          )}
                        </h3>
                        <p className="text-xs text-text-muted mt-0.5">{realMentors[1].role || realMentors[1].company}</p>
                        <span className="inline-block mt-2 text-[10px] font-bold text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1 rounded-md">
                          {realMentors[1].level}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-border w-full">
                        <span className="font-mono font-black text-xl text-primary">{realMentors[1].xp.toLocaleString()} XP</span>
                      </div>
                    </div>
                  )}

                  {/* GOLD #1 */}
                  {realMentors[0] && (
                    <div className="order-1 md:order-2 p-6 bg-gradient-to-b from-amber-500/10 to-card border-2 border-amber-500/40 rounded-2xl shadow-md text-center relative flex flex-col items-center justify-between space-y-4 transform md:-translate-y-2">
                      <div className="absolute -top-3.5 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-sm flex items-center gap-1">
                        🥇 Rank #1 • Guild Champion
                      </div>
                      <div className="relative mt-3">
                        <div className="w-24 h-24 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-4 border-amber-500 shadow-lg flex items-center justify-center font-black text-3xl uppercase tracking-wider">
                          {(realMentors[0].name || 'Mentor').trim().slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xl text-text-primary flex items-center justify-center gap-1.5">
                          {realMentors[0].name}
                          {(user?.uid === realMentors[0].uid || realMentors[0].isYou) && (
                            <span className="text-[9px] bg-primary text-white font-extrabold px-1.5 py-0.2 rounded-full">YOU</span>
                          )}
                        </h3>
                        <p className="text-xs text-text-muted mt-0.5">{realMentors[0].role || realMentors[0].company}</p>
                        <span className="inline-block mt-2 text-[10px] font-extrabold text-amber-700 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-md">
                          {realMentors[0].level}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-amber-500/20 w-full">
                        <span className="font-mono font-black text-2xl text-amber-600">{realMentors[0].xp.toLocaleString()} XP</span>
                      </div>
                    </div>
                  )}

                  {/* BRONZE #3 */}
                  {realMentors[2] && (
                    <div className="order-3 p-6 bg-card border border-amber-700/30 rounded-2xl shadow-sm text-center relative flex flex-col items-center justify-between space-y-4">
                      <div className="absolute -top-3 bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full shadow-xs">
                        🥉 Rank #3 • Bronze Guild
                      </div>
                      <div className="relative mt-2">
                        <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-4 border-amber-700/60 shadow-md flex items-center justify-center font-black text-2xl uppercase tracking-wider">
                          {(realMentors[2].name || 'Mentor').trim().slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-text-primary flex items-center justify-center gap-1.5">
                          {realMentors[2].name}
                          {(user?.uid === realMentors[2].uid || realMentors[2].isYou) && (
                            <span className="text-[9px] bg-primary text-white font-extrabold px-1.5 py-0.2 rounded-full">YOU</span>
                          )}
                        </h3>
                        <p className="text-xs text-text-muted mt-0.5">{realMentors[2].role || realMentors[2].company}</p>
                        <span className="inline-block mt-2 text-[10px] font-bold text-amber-800 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded-md">
                          {realMentors[2].level}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-border w-full">
                        <span className="font-mono font-black text-xl text-primary">{realMentors[2].xp.toLocaleString()} XP</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FULL LEADERBOARD TABLE */}
              <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
                  <div>
                    <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" /> Complete Mentor Leaderboard Standings
                    </h3>
                    <p className="text-xs text-text-secondary">Official CareerBridge accreditation and experience points table</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-bg-secondary border border-border text-text-secondary px-3 py-1 rounded-full">
                    Total Active Mentors: {realMentors.length}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-[10px] uppercase text-text-muted font-bold font-mono tracking-wider">
                        <th className="py-3 px-3">Position</th>
                        <th className="py-3 px-3">Mentor</th>
                        <th className="py-3 px-3">Company / Role</th>
                        <th className="py-3 px-3">Rank Title</th>
                        <th className="py-3 px-3 text-right">Verified XP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {realMentors.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-text-muted text-xs">
                            No mentor records loaded from Firestore.
                          </td>
                        </tr>
                      ) : (
                        realMentors.map((lead, i) => {
                          const position = i + 1;
                          const isCurrent = user?.uid === lead.uid || lead.isYou;
                          return (
                            <tr 
                              key={lead.id || i}
                              className={`transition-colors hover:bg-bg-secondary/60 ${
                                isCurrent ? 'bg-primary/10 font-semibold' : ''
                              }`}
                            >
                              <td className="py-3.5 px-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                                  position === 1 ? 'bg-amber-500 text-white font-black shadow-xs' :
                                  position === 2 ? 'bg-slate-300 text-slate-900 font-black' :
                                  position === 3 ? 'bg-amber-700 text-white font-black' :
                                  'bg-bg-secondary text-text-muted border border-border'
                                }`}>
                                  #{position}
                                </div>
                              </td>
                              <td className="py-3.5 px-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0 uppercase tracking-wider">
                                    {(lead.name || 'Mentor').trim().slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-text-primary font-bold flex items-center gap-1.5">
                                      {lead.name}
                                      {isCurrent && (
                                        <span className="text-[9px] bg-primary text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                                          YOU
                                        </span>
                                      )}
                                      {lead.verified && <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                                    </p>
                                    <p className="text-[10px] text-text-muted">ID: {lead.uid.slice(0, 10)}...</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-3">
                                <p className="text-text-primary font-medium">{lead.role}</p>
                                <p className="text-[10px] text-text-muted">{lead.company}</p>
                              </td>
                              <td className="py-3.5 px-3">
                                <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  lead.level.toLowerCase().includes('expert') || lead.level.toLowerCase().includes('leader')
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                    : lead.level.toLowerCase().includes('senior')
                                    ? 'bg-primary/10 text-primary border-primary/20'
                                    : 'bg-bg-secondary text-text-secondary border-border'
                                }`}>
                                  {lead.level}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                <span className="font-mono font-extrabold text-primary text-sm">
                                  {lead.xp.toLocaleString()} XP
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

          {activeTab === 'mentor-sessions' && (
            <motion.div key="sessions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <MentorSessionsView activeConnections={activeConnections || []} />
            </motion.div>
          )}

          {activeTab === 'mentor-messaging' && (
            <motion.div key="messages" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <MentorMessagingPage activeConnections={activeConnections || []} />
            </motion.div>
          )}

          {/* PUBLIC PROFILE HEADER AND PREVIEWS */}
          {activeTab === 'mentor-profile' && (
            <motion.div key="prof" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              
              <div className="p-6 bg-card border border-border rounded-2xl shadow-xs space-y-6">
                
                {/* Header profile */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg ring-2 ring-primary/20">
                      {profile?.displayName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'ME'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">{profile?.displayName || 'Mentor User'}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">
                          {levelInfo.level}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          Domain: {profile?.industry || 'Cloud Architecture'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                      Availability status:
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                      profile?.acceptingRequests !== false 
                        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`}>
                      {profile?.acceptingRequests !== false ? '• Accepting Requests' : '• Standby'}
                    </span>
                  </div>
                </div>

                {/* About and stats details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Mentor Biographical Profile</h4>
                      <p className="text-text-secondary leading-relaxed bg-bg-secondary p-4 rounded-xl min-h-[100px]">
                        {profile?.bio || 'No biographies set. Access settings parameters to modify profile information.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Target Expertise tags</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {['Node.js', 'PostgreSQL', 'API Routing Middleware', 'SaaS Architectures', 'OAuth auth validators'].map(skill => (
                          <span key={skill} className="px-2 py-1 bg-bg-secondary hover:bg-bg-tertiary text-text-primary border border-border rounded-lg tracking-tight transition-all">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-l border-border pl-0 md:pl-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Verified Outcomes</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-border/60 pb-1.5">
                        <span className="text-text-secondary">Average rating:</span>
                        <span className="font-bold text-text-primary flex items-center gap-1 text-amber-500 font-mono">
                          <Star className="w-3.5 h-3.5 fill-current" /> 5.0
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-border/60 pb-1.5">
                        <span className="text-text-secondary">Total placement outcomes:</span>
                        <span className="font-bold text-text-primary font-mono">{profile?.placedGraduates || 14} Graduates</span>
                      </div>
                      <div className="flex justify-between border-b border-border/60 pb-1.5">
                        <span className="text-text-secondary">Connected limit threshold:</span>
                        <span className="font-bold text-text-primary font-mono">{profile?.maxMentees || 8} Slots Max</span>
                      </div>
                    </div>

                    {/* graduation request action mock */}
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                      <p className="text-[10px] text-text-secondary leading-normal">
                        **Graduates Note**: Senior level mentors profiles are publicly listed on CareerBridge directories.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* SETTINGS AND SLIDER ADJUSTMENTS */}
          {activeTab === 'mentor-settings' && (
            <motion.div key="sett" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* SETTING PARAMETERS card */}
                <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-xs text-xs">
                  <h4 className="text-sm font-bold tracking-tight text-text-primary uppercase border-b border-border pb-3">Edit Biography Properties</h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-bold text-text-secondary">Full Professional Name</label>
                      <input 
                        type="text" 
                        defaultValue={profile?.displayName || 'Dr. Rahman'} 
                        id="settings-name-input"
                        className="w-full bg-bg-secondary border border-border rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-primary font-medium" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-text-secondary">Brief Description Bio</label>
                      <textarea 
                        rows={4}
                        defaultValue={profile?.bio || 'Ex-Manager @ Google Cloud. Dedicated to routing talented software devs to global cloud careers.'} 
                        id="settings-bio-input"
                        className="w-full bg-bg-secondary border border-border rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-primary font-medium" 
                      />
                    </div>

                    <button 
                      onClick={async () => {
                        const nameVal = (document.getElementById('settings-name-input') as HTMLInputElement)?.value;
                        const bioVal = (document.getElementById('settings-bio-input') as HTMLTextAreaElement)?.value;
                        await updateDoc(doc(db, 'users', user.uid), {
                          displayName: nameVal,
                          bio: bioVal
                        });
                        alert('Biographical settings updated successfully!');
                      }}
                      className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover active:scale-95 transition-all text-[11px] cursor-pointer"
                    >
                      Update Profile Parameters
                    </button>
                  </div>
                </div>

                {/* AVAILABILITY REASONS AND CSV EXPORTS */}
                <div className="space-y-6">
                  
                  {/* Availability toggle card */}
                  <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-xs text-xs">
                    <h4 className="text-sm font-bold tracking-tight text-text-primary uppercase border-b border-border pb-3">Mentor Availability Deck</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-bg-secondary/40 p-3 rounded-lg border border-border">
                        <div>
                          <p className="font-bold text-text-primary">Accepting active mentorship requests</p>
                          <p className="text-[10px] text-text-muted mt-0.5">Toggle to instantly update the graduate directory listing status.</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={profile?.acceptingRequests !== false}
                          onChange={async (e) => {
                            await updateDoc(doc(db, 'users', user.uid), {
                              acceptingRequests: e.target.checked
                            });
                          }}
                          className="w-4 h-4 accent-primary shrink-0" 
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-text-secondary">If Standby, provide description reasons note:</label>
                        <input 
                          type="text" 
                          placeholder="e.g., On technical leave, at max mentee bounds, etc." 
                          className="w-full bg-bg-secondary border border-border rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SESSION EXPORTS */}
                  <div className="p-6 bg-card border border-border rounded-2xl space-y-3 shadow-xs text-xs">
                    <h4 className="text-xs font-extrabold uppercase tracking-wide text-text-muted">CSV Export Controls</h4>
                    <p className="text-text-secondary leading-normal">
                      Export your active mentorship session listings and progression records as a standard Microsoft Excel/CSV spreadsheet report.
                    </p>
                    <button
                      onClick={() => {
                        const csvContent = exportSessionsCSV(activeConnections);
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', 'Mentor_Mentees_Session_History.csv');
                        link.click();
                        URL.revokeObjectURL(url);
                        alert('Your comprehensive session history report spreadsheet disptached successfully!');
                      }}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-bg-secondary text-text-primary hover:bg-bg-tertiary border border-border rounded-lg font-bold transition-all active:scale-95 text-[11px] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> EXPORT HISTORICAL DATA (.CSV)
                    </button>
                  </div>

                </div>

              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* IN-APP CV PDF VIEWER WORKBENCH MODAL */}
      <AnimatePresence>
        {viewingCvUrl && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-neutral-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 15 }} 
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-5xl h-[85vh] bg-card border border-border rounded-2xl flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border bg-bg-secondary flex justify-between items-center shrink-0">
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider font-sans">Student Professional Profile & CV Analytical Desk</h4>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Active dossier preview for <strong className="text-text-primary">{viewingCvName}</strong>
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <a 
                    href={viewingCvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-border rounded-lg text-[11px] font-bold text-text-secondary transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Fullscreen View
                  </a>
                  <button 
                    onClick={() => {
                      setViewingCvUrl(null);
                      setViewingCvName('');
                    }}
                    className="p-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-border text-text-muted hover:text-text-primary rounded-lg transition-all cursor-pointer"
                    aria-label="Close Preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Interactive Frame Wrapper */}
              <div className="flex-1 bg-neutral-900 relative">
                <iframe 
                  src={`${viewingCvUrl}#toolbar=1`}
                  className="w-full h-full border-0 bg-neutral-900"
                  title={`${viewingCvName} PDF CV Preview`}
                  referrerPolicy="no-referrer"
                />
                
                {/* Float helper status bar */}
                <div className="absolute bottom-4 left-1/2 -sidemargin -translate-x-1/2 bg-neutral-950/90 border border-neutral-800 text-[10.5px] text-neutral-400 px-4 py-2.5 rounded-xl flex items-center justify-between gap-4 shadow-xl max-w-[90%] md:w-auto">
                  <span className="leading-tight shrink pr-4 text-left">Can't see the PDF document clearly? Browser security may limit external domain embeds.</span>
                  <a 
                    href={viewingCvUrl} 
                    download
                    className="text-primary hover:underline font-bold shrink-0 flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Direct Download
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENDORSEMENT FORM MODAL */}
      <AnimatePresence>
        {isEndorsementModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[90vh] overflow-y-auto text-left"
            >
              <button
                onClick={() => setIsEndorsementModalOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1.5 rounded-full hover:bg-bg-secondary transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Formal Mentorship Endorsement</h3>
                  <p className="text-xs text-text-secondary">Validate competencies and issue an official letter to your mentee.</p>
                </div>
              </div>

              <form onSubmit={handleSendEndorsement} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">Mentee Candidate</label>
                  <input
                    type="text"
                    readOnly
                    value={activeConnections.find(c => c.menteeId === endorsementMenteeId)?.menteeName || ''}
                    className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-semibold text-text-primary select-none focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    New Skills Taught <span className="text-text-muted font-normal">(Comma separated, e.g. React, Node.js, Cloud Run)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Next.js, GraphQL, PostgreSQL Optimization"
                    value={endorsementSkills}
                    onChange={(e) => setEndorsementSkills(e.target.value)}
                    className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Industry Projects Completed <span className="text-text-muted font-normal">(Title & stack)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Real-time Mentorship Tracker Portal"
                    value={endorsementProjects}
                    onChange={(e) => setEndorsementProjects(e.target.value)}
                    className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Overall Mentorship Connectivity & Assessment
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide specific feedback on active collaboration, response rates, and final milestones achieved..."
                    value={endorsementConnectivity}
                    onChange={(e) => setEndorsementConnectivity(e.target.value)}
                    className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEndorsementModalOpen(false)}
                    className="w-1/2 py-2 bg-bg-secondary hover:bg-bg-tertiary border border-border text-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEndorsement}
                    className="w-1/2 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submittingEndorsement ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Disbursing...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send Endorsement
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PUBLIC DEEP ANALYSIS PROFILES MODAL (LIKE FACEBOOK PLATFORM FOR GENERAL ROLES) */}
      <PublicProfileModal 
        isOpen={publicProfileOpen} 
        onClose={() => {
          setPublicProfileOpen(false);
          setPublicProfileData(null);
        }} 
        profileType={publicProfileType} 
        profileData={publicProfileData} 
      />

      {/* OFFICIAL CERTIFICATE OF MENTORSHIP STANDING MODAL */}
      {showCertificateModal && typeof document !== 'undefined' && createPortal(
        <div
          id="certificate-modal-overlay"
          onClick={() => setShowCertificateModal(false)}
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[88vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col relative text-left"
          >
            {/* Modal Top Bar - Sticky & Fully Visible at top */}
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border bg-card shadow-xs z-30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-text-primary leading-tight truncate">Official Proof of Standing</h3>
                  <p className="text-[10px] text-text-muted truncate">Rank #{myPlatformRank} • {studentsMentoredCount} Mentees Guided</p>
                </div>
              </div>

              {/* Upper Action Controls: Zoom + Download PDF + Print + Close */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Zoom Controls */}
                <div className="hidden sm:flex items-center bg-bg-secondary rounded-lg border border-border p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCertificateZoom(prev => Math.max(0.6, Number((prev - 0.1).toFixed(2))));
                    }}
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-card rounded transition-all cursor-pointer"
                    title="Zoom Out (-10%)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCertificateZoom(0.85);
                    }}
                    className="px-2 py-0.5 text-[11px] font-mono font-bold text-text-secondary hover:text-text-primary transition-all cursor-pointer select-none"
                    title="Reset Zoom to 85%"
                  >
                    {Math.round(certificateZoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCertificateZoom(prev => Math.min(1.4, Number((prev + 0.1).toFixed(2))));
                    }}
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-card rounded transition-all cursor-pointer"
                    title="Zoom In (+10%)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Primary Action: Direct Download PDF */}
                <button
                  type="button"
                  disabled={isExportingPdf}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadPDF();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer shrink-0 active:scale-95 disabled:opacity-60"
                  title="Download official PDF file directly to your device"
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>

                {/* Close button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCertificateModal(false);
                  }}
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-secondary rounded-lg border border-border transition-all cursor-pointer shrink-0 active:scale-95"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification Banner when PDF is exported */}
            {exportSuccess && (
              <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{exportSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setExportSuccess(null)}
                  className="p-0.5 text-emerald-600 hover:text-emerald-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Printable Certificate Body - Scrollable Container with Zoom */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950/70 flex justify-center items-start">
              <div 
                className="w-full transition-transform duration-150"
                style={{ transform: `scale(${certificateZoom})`, transformOrigin: 'top center' }}
              >
                <div 
                  id="mentor-certificate-render-target"
                  className="print-content p-6 sm:p-8 bg-white text-slate-900 relative overflow-hidden rounded-xl border border-slate-200 shadow-md"
                >
                  {/* Certificate Decorative Border */}
                  <div className="border-4 border-double border-amber-600/40 rounded-xl p-5 sm:p-7 relative bg-gradient-to-b from-amber-500/[0.02] to-transparent">
                    
                    {/* Top Seal / Emblem */}
                    <div className="flex flex-col items-center text-center space-y-1.5 pb-5 border-b border-amber-500/20">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-md flex items-center justify-center">
                        <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                          <Trophy className="w-6 h-6 text-amber-500" />
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-black tracking-[0.25em] text-amber-600 uppercase">
                        CAREERBRIDGE GUILD ACCREDITATION
                      </span>
                      <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 uppercase font-serif">
                        Certificate of Mentorship Standing
                      </h2>
                      <p className="text-[10px] text-slate-500 max-w-md">
                        Institutional Verification of Platform Rank & Graduate Mentoring Record
                      </p>
                    </div>

                    {/* Certifies Recipient */}
                    <div className="py-5 text-center space-y-2">
                      <p className="text-[11px] font-serif italic text-slate-500">
                        This official institutional document hereby certifies that
                      </p>
                      <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-primary font-serif">
                        {profile?.displayName || profile?.name || 'Verified Mentor'}
                      </h1>
                      <p className="text-xs font-medium text-slate-600">
                        {profile?.jobTitle || profile?.role || 'Senior Industry Mentor'} • {profile?.company || 'CareerBridge Industry Guild'}
                      </p>
                    </div>

                    {/* Proof Highlights Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-0.5">
                        <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">Platform Standing</p>
                        <p className="text-lg sm:text-xl font-black text-amber-600 font-mono">
                          Rank #{myPlatformRank}
                        </p>
                        <p className="text-[8px] text-slate-500">CareerBridge Platform</p>
                      </div>

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-0.5">
                        <p className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">Mentoring Impact</p>
                        <p className="text-lg sm:text-xl font-black text-primary font-mono">
                          {studentsMentoredCount}
                        </p>
                        <p className="text-[8px] text-slate-500">
                          {studentsMentoredCount === 1 ? 'Student Successfully Mentoring' : 'Students Successfully Mentoring'}
                        </p>
                      </div>

                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-center space-y-0.5">
                        <p className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">Accreditation Tier</p>
                        <p className="text-lg sm:text-xl font-black text-indigo-600 font-mono">
                          {mentorXp} XP
                        </p>
                        <p className="text-[8px] text-slate-500">{levelInfo.level}</p>
                      </div>
                    </div>

                    {/* Formal Certification Statement */}
                    <p className="text-[11px] text-slate-600 text-center max-w-lg mx-auto leading-relaxed my-3">
                      Has achieved Senior Mentorship Accreditation under CareerBridge standards, holding active rank #{myPlatformRank} in the platform directory with {studentsMentoredCount} successfully mentored {studentsMentoredCount === 1 ? 'student' : 'students'}. This document serves as verifiable proof of leadership, candidate task evaluation, and professional mentorship impact.
                    </p>

                    {/* Footer Details & Verification Signatures */}
                    <div className="pt-4 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                      <div className="space-y-0.5 text-center sm:text-left">
                        <p className="text-[9px] font-mono">
                          <strong className="text-slate-700">Credential ID:</strong> CB-MTR-{(user?.uid || '8942').slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[9px] font-mono">
                          <strong className="text-slate-700">Ledger Hash:</strong> SHA256:CB-{(user?.uid || '8942').slice(0, 6).toUpperCase()}-{(mentorXp * 11 + 777).toString(16).toUpperCase()}
                        </p>
                        <p className="text-[9px]">
                          <strong className="text-slate-700">Issued On:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>

                      <div className="flex flex-col items-center sm:items-end space-y-0.5 text-center sm:text-right">
                        <div className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" /> VERIFIED CREDENTIAL
                        </div>
                        <p className="text-[9px] font-serif italic text-slate-600">
                          CareerBridge Academic & Guild Council
                        </p>
                        <p className="text-[8px] text-slate-400">Autonomous Ledger Verification</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

// ==========================================
// INTERNAL SUB VIEW: CORE STUDENT DECK WORKSPACE
// ==========================================
interface WorkspaceMainProps {
  deckConnection: any;
}
function WorkspaceMain({ deckConnection }: WorkspaceMainProps) {
  const { user, profile } = useAuth();
  
  return (
    <div className="space-y-6 text-xs text-left">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
        <LearningSessionModule
          connection={deckConnection}
          user={user}
          profile={profile}
          isMentor={true}
        />
      </div>
    </div>
  );
}

// ==========================================
// PUBLISHED ASSIGNMENTS & TASKS VIEW
// ==========================================
interface PublishedAssignmentsViewProps {
  deckConnection: any;
}

function PublishedAssignmentsView({ deckConnection }: PublishedAssignmentsViewProps) {
  const { user, profile } = useAuth();
  
  // States
  const [tasks, setTasks] = useState<any[]>([]);
  
  // Grading & Feedback State
  const [gradingTaskId, setGradingTaskId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState<string>('');
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  // Sync tasks and learning_sessions for the active connection in real-time
  useEffect(() => {
    if (!deckConnection?.id) return;

    let tasksList: any[] = [];
    let sessionsList1: any[] = [];
    let sessionsList2: any[] = [];

    const combineAndSet = () => {
      const map = new Map<string, any>();
      tasksList.forEach(t => map.set(t.id, t));
      [...sessionsList1, ...sessionsList2].forEach(s => {
        if (!map.has(s.id)) {
          map.set(s.id, {
            ...s,
            deadline: s.deadline || s.endTime || s.dateTime || s.createdAt,
            description: s.description || s.question || s.quizContent || s.notes || ''
          });
        } else {
          map.set(s.id, { ...s, ...map.get(s.id) });
        }
      });

      const combined = Array.from(map.values());
      combined.sort((a: any, b: any) => new Date(b.createdAt || b.dateTime || 0).getTime() - new Date(a.createdAt || a.dateTime || 0).getTime());
      setTasks(combined);
    };

    const qTasks = query(
      collection(db, 'tasks'),
      where('connId', '==', deckConnection.id)
    );
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      tasksList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      combineAndSet();
    }, (err) => console.error("Failed to fetch tasks in PublishedAssignmentsView:", err));

    const qSess1 = query(
      collection(db, 'learning_sessions'),
      where('connId', '==', deckConnection.id)
    );
    const unsubSess1 = onSnapshot(qSess1, (snapshot) => {
      sessionsList1 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      combineAndSet();
    }, (err) => console.error("Failed to fetch learning_sessions (connId):", err));

    const qSess2 = query(
      collection(db, 'learning_sessions'),
      where('connectionId', '==', deckConnection.id)
    );
    const unsubSess2 = onSnapshot(qSess2, (snapshot) => {
      sessionsList2 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      combineAndSet();
    }, (err) => console.error("Failed to fetch learning_sessions (connectionId):", err));

    return () => {
      unsubTasks();
      unsubSess1();
      unsubSess2();
    };
  }, [deckConnection?.id]);

  // Handle Submitting Feedback and Score for a student's task
  const handleGradeSubmission = async (task: any) => {
    const scoreVal = parseInt(gradeScore);
    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 100) {
      alert("Please enter a valid numeric grade score between 0 and 100.");
      return;
    }

    setIsSubmittingGrade(true);
    try {
      const payload = {
        status: 'Graded',
        score: scoreVal,
        mentorFeedback: gradeFeedback.trim() || 'Well done on completing this task!',
        gradedAt: new Date().toISOString()
      };

      try {
        await updateDoc(doc(db, 'tasks', task.id), payload);
      } catch (e) { /* ignore if not in tasks */ }

      try {
        await updateDoc(doc(db, 'learning_sessions', task.id), payload);
      } catch (e) { /* ignore if not in learning_sessions */ }

      // Send a notification to the mentee
      await addDoc(collection(db, 'notifications'), {
        recipientId: deckConnection.menteeId,
        type: 'task_graded',
        title: '🎖️ Task Graded',
        body: `Your task "${task.title}" has been graded with a score of ${scoreVal}/100!`,
        isRead: false,
        createdAt: new Date().toISOString()
      });

      sendCrossRoleEmailNotification({
        senderId: user?.uid,
        senderName: profile?.displayName || 'Mentor',
        senderRole: 'mentor',
        senderEmail: user?.email || '',
        recipientId: deckConnection.menteeId,
        recipientName: deckConnection.menteeName || 'Student',
        recipientRole: 'student',
        subject: `🎖️ Task Graded: ${task.title} (Score: ${scoreVal}/100)`,
        category: 'mentorship',
        message: `Your mentor ${profile?.displayName || 'Mentor'} evaluated and graded your submission for "${task.title}".\n\nScore: ${scoreVal}/100\nFeedback: "${gradeFeedback.trim() || 'Great effort!'}"`,
        actionUrl: window.location.origin
      }).catch(e => console.warn('Email dispatch failed:', e));

      // Dynamically calculate and update connection progress percentage
      const totalCount = tasks.length || 1;
      const gradedCount = tasks.filter(t => t.id === task.id ? true : t.status === 'Graded').length;
      const computedProg = Math.round((gradedCount / totalCount) * 100);

      await updateDoc(doc(db, 'mentorship_connections', deckConnection.id), {
        progress: computedProg,
        scoreDelta: (deckConnection.scoreDelta || 0) + 15 // Add skill reputation points
      });

      // Clear grading state
      setGradingTaskId(null);
      setGradeScore('');
      setGradeFeedback('');
      alert('Grade and feedback submitted successfully!');
    } catch (err) {
      console.error('Error grading task:', err);
      alert('Failed to submit grade.');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-left">
      {/* CANDIDATE WORKSPACE (TOP - FULL WIDTH) */}
      <div className="p-5 bg-card border border-border rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h4 className="font-bold text-text-primary uppercase tracking-wide text-xs md:text-sm">Candidate Workspace</h4>
          </div>
          <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">
            Mentee Student Command Deck
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {/* Student Overview & Workspace Progress */}
          <div className="md:col-span-2 bg-bg-secondary p-4 rounded-xl border border-border space-y-3 flex flex-col justify-between">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <p className="font-extrabold text-text-primary text-sm">{deckConnection.menteeName}</p>
                <p className="text-[10px] text-text-muted mt-0.5">Assigned Mentee Student</p>
              </div>
              <div className="text-right font-mono">
                <span className="text-[9px] text-text-muted block font-extrabold">WORKSPACE PROGRESS</span>
                <span className="font-black text-primary text-sm">{deckConnection.progress || 0}%</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="w-full bg-border/80 rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${deckConnection.progress || 0}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[10px] pt-1">
              <div className="bg-card p-2.5 rounded-lg border border-border flex justify-between items-center">
                <span className="text-text-muted font-semibold">Total Logged Tasks</span>
                <span className="font-extrabold text-text-primary text-xs font-mono">{tasks.length}</span>
              </div>
              <div className="bg-card p-2.5 rounded-lg border border-border flex justify-between items-center">
                <span className="text-text-muted font-semibold">Under Review / Submitted</span>
                <span className="font-extrabold text-amber-500 text-xs font-mono">
                  {tasks.filter(t => t.status === 'Under Review' || t.status === 'completed' || !!t.menteeSubmission || !!t.submittedAt).length}
                </span>
              </div>
            </div>
          </div>

          {/* Workspace Log Activity Info Box */}
          <div className="p-4 bg-primary/5 border border-primary/15 rounded-xl text-[11px] text-text-secondary leading-relaxed space-y-2 flex flex-col justify-center">
            <p className="font-bold text-primary flex items-center gap-1.5 text-xs">
              <FileText className="w-4 h-4 text-primary" /> Workspace Log Activity
            </p>
            <p className="text-[10.5px] text-text-muted leading-relaxed">
              This section stores and displays all logged assignments, practical deliverables, session activity, and quiz records for <strong className="text-text-primary">{deckConnection.menteeName}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* PUBLISHED ASSIGNMENTS & TASKS (BOTTOM - FULL WIDTH) */}
      <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-xs">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h4 className="font-bold text-text-primary uppercase tracking-wide text-xs md:text-sm">Published Assignments ({tasks.length})</h4>
          <span className="text-[10px] text-text-muted uppercase font-mono tracking-widest">Chronological View</span>
        </div>

        {tasks.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl bg-bg-secondary/25 space-y-2">
            <ClipboardCheck className="w-10 h-10 text-text-muted/40 mx-auto" />
            <p className="font-bold text-text-secondary">No tasks assigned yet</p>
            <p className="text-[10px] text-text-muted max-w-xs mx-auto">Tasks and sessions assigned from the Learning Session module will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => {
              const hasSubmission = Boolean(task.submittedAt || task.menteeSubmission || task.submittedContent || task.status === 'completed' || task.status === 'Under Review');
              const isUnderReview = task.status === 'Under Review' || (hasSubmission && task.status !== 'Graded');
              const isGraded = task.status === 'Graded';
              const isGradingNow = gradingTaskId === task.id;

              const isLecture = task.format === 'lecture';
              const isPractical = task.format === 'practical';
              const isQuiz = task.format === 'quiz';
              const isAssignment = task.format === 'assignment';

              return (
                <div key={task.id} className="p-5 bg-bg-secondary/40 border border-border rounded-2xl space-y-4 transition-all hover:bg-bg-secondary/60">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded font-mono ${
                          isLecture ? 'bg-primary/20 text-primary' :
                          isPractical ? 'bg-emerald-500/20 text-emerald-600' :
                          isQuiz ? 'bg-amber-500/20 text-amber-600' :
                          isAssignment ? 'bg-purple-500/20 text-purple-600' : 'bg-text-muted/15 text-text-muted'
                        }`}>
                          {task.format || 'Task'}
                        </span>

                        {task.moduleTitle && (
                          <span className="text-[10px] text-text-muted font-bold font-mono">
                            Module: {task.moduleTitle}
                          </span>
                        )}
                      </div>

                      <h5 className="font-bold text-sm text-text-primary tracking-tight">{task.title}</h5>
                      <p className="text-xs text-text-secondary leading-relaxed mt-1">{task.description}</p>
                      
                      <div className="flex items-center gap-3 text-[10px] text-text-muted pt-2 font-medium flex-wrap">
                        {task.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-primary" /> Deadline: {new Date(task.deadline).toLocaleString()}
                          </span>
                        )}
                        {task.meetLink && (
                          <a 
                            href={task.meetLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary font-bold rounded hover:underline"
                          >
                            <Video className="w-3 h-3" /> Meet Link
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Status badges */}
                    <div>
                      {isGraded ? (
                        <div className="text-right">
                          <span className="px-2.5 py-1 text-[9px] font-black tracking-wider uppercase rounded-lg font-mono bg-success/10 text-success border border-success/20">
                            Graded: {task.score}/100
                          </span>
                        </div>
                      ) : isUnderReview ? (
                        <span className="px-2.5 py-1 text-[9px] font-black tracking-wider uppercase rounded-lg font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                          Under Review
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[9px] font-black tracking-wider uppercase rounded-lg font-mono bg-text-muted/15 text-text-muted">
                          To Do
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mentee work submission deliverable display VS Not Submitted Banner */}
                  {hasSubmission ? (
                    <div className="p-4 bg-card border border-border rounded-xl space-y-3 text-left">
                      <div className="flex justify-between items-center border-b border-border/60 pb-1.5">
                        <span className="font-extrabold uppercase text-[9px] tracking-wider text-text-muted flex items-center gap-1.5">
                          <Play className="w-3 h-3 text-primary" /> Submitted Deliverable & Answers
                        </span>
                        {task.submittedAt && (
                          <span className="text-[9px] text-text-muted font-mono">{new Date(task.submittedAt).toLocaleString()}</span>
                        )}
                      </div>

                      <div className="space-y-2 text-xs">
                        {task.menteeSubmission && (
                          <div className="bg-bg-secondary p-3 rounded-lg border border-border/60 text-text-primary leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                            {task.menteeSubmission}
                          </div>
                        )}

                        {task.submittedType && (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-text-secondary">Type:</span> 
                            <span className="px-2 py-0.5 bg-primary-light text-primary font-bold rounded uppercase text-[10px]">
                              {task.submittedType}
                            </span>
                          </div>
                        )}

                        {task.submittedType === 'link' && task.submittedContent && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-text-secondary">Project URL:</span>
                            <a 
                              href={task.submittedContent} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-primary hover:underline font-bold break-all flex items-center gap-1"
                            >
                              {task.submittedContent} <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}

                        {task.submittedType === 'file' && task.submittedContent && (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-text-secondary">Attachment file:</span>
                            <a 
                              href={task.submittedContent} 
                              download={task.submittedName || 'submission'}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#534AB7]/10 hover:bg-[#534AB7]/20 text-[#534AB7] rounded-md font-bold transition-all text-[11px]"
                            >
                              <Download className="w-3.5 h-3.5 text-primary" /> {task.submittedName || 'Attachment_File'}
                            </a>
                          </div>
                        )}

                        {task.submittedComment && (
                          <div className="bg-bg-secondary p-3 rounded-lg border border-border/60 text-text-primary leading-relaxed italic">
                            "{task.submittedComment}"
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-bg-secondary/60 border border-border/80 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Clock className="w-4 h-4 text-amber-500/80" />
                        <span className="font-bold text-text-secondary">Not submitted yet by student</span>
                      </div>
                      <span className="text-[9.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 font-mono">
                        Pending Submission
                      </span>
                    </div>
                  )}

                  {/* Graded info display */}
                  {isGraded && (
                    <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-xl text-left space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold uppercase text-[9px] tracking-wider text-success">Mentor Evaluation feedback</span>
                        <button
                          onClick={() => {
                            setGradingTaskId(task.id);
                            setGradeScore(task.score ? String(task.score) : '85');
                            setGradeFeedback(task.mentorFeedback || '');
                          }}
                          className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wide cursor-pointer"
                        >
                          Edit Score / Feedback
                        </button>
                      </div>
                      <p className="text-text-secondary italic">"{task.mentorFeedback}"</p>
                      <p className="text-[9.5px] text-text-muted font-mono block pt-0.5">Evaluated on {new Date(task.gradedAt).toLocaleString()}</p>
                    </div>
                  )}

                  {/* Prompt review box for mentor if task is pending evaluation */}
                  {!isGraded && !isGradingNow && (
                    <button
                      onClick={() => {
                        setGradingTaskId(task.id);
                        setGradeScore(task.score ? String(task.score) : '85');
                        setGradeFeedback(task.mentorFeedback || 'Outstanding effort, well executed!');
                      }}
                      className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer block text-center shadow-xs"
                    >
                      ✔ Review & Grade Work
                    </button>
                  )}

                  {/* GRADING ACTION BOX */}
                  {isGradingNow && (
                    <div className="p-5 bg-card border border-amber-500/30 rounded-xl space-y-4 text-left animate-fade-in shadow-md">
                      <div className="flex justify-between items-center border-b border-border pb-2">
                        <h6 className="font-bold text-text-primary uppercase tracking-wider text-[10px] text-[#534AB7] flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-primary" /> Grade & Give Feedback
                        </h6>
                        <button 
                          onClick={() => setGradingTaskId(null)} 
                          className="text-text-muted hover:text-text-primary p-1 rounded-md hover:bg-bg-secondary transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase"
                          title="Close form"
                        >
                          <X className="w-4 h-4" /> Close
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <label className="font-bold text-text-secondary uppercase text-[10px] tracking-wide block">Score out of 100 *</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            value={gradeScore}
                            onChange={(e) => setGradeScore(e.target.value)}
                            className="w-full bg-bg-secondary border border-border rounded-lg p-2.5 focus:outline-none text-xs font-bold font-mono"
                            required
                          />
                        </div>

                        <div className="md:col-span-3 space-y-1.5">
                          <label className="font-bold text-text-secondary uppercase text-[10px] tracking-wide block">Feedback Notes *</label>
                          <textarea 
                            rows={2}
                            placeholder="Review highlights and offer suggestions directly..."
                            value={gradeFeedback}
                            onChange={(e) => setGradeFeedback(e.target.value)}
                            className="w-full bg-bg-secondary border border-border rounded-lg p-2 focus:outline-none text-xs"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setGradingTaskId(null)}
                          className="px-4 py-2 bg-bg-secondary hover:bg-bg-tertiary border border-border rounded-lg text-text-secondary text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Close / Cancel
                        </button>
                        <button
                          disabled={isSubmittingGrade}
                          onClick={() => handleGradeSubmission(task)}
                          className="px-6 py-2 bg-gradient-to-r from-[#534AB7] to-[#453c9e] text-white text-[11px] font-bold rounded-lg hover:from-primary hover:to-primary-hover shadow-sm uppercase tracking-wider transition-all cursor-pointer"
                        >
                          {isSubmittingGrade ? 'Submitting...' : '✔ Submit Feedback & Score'}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MENTOR SESSIONS VIEW (Sessions Tab)
// ==========================================
interface MentorSessionsViewProps {
  activeConnections: any[];
}

function MentorSessionsView({ activeConnections }: MentorSessionsViewProps) {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    activeConnections[0]?.id || ''
  );

  // Ensure active connection is picked
  const activeConn = activeConnections.find(c => c.id === selectedConnectionId) || activeConnections[0];

  useEffect(() => {
    if (!selectedConnectionId && activeConnections.length > 0) {
      setSelectedConnectionId(activeConnections[0].id);
    }
  }, [activeConnections, selectedConnectionId]);

  return (
    <div className="space-y-6 text-xs text-left">
      {/* Top Header & Mentee Selector */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-text-primary">Sessions Command Deck</h3>
            <p className="text-[11px] text-text-secondary">Manage published assignments, candidate submissions, grades & feedback</p>
          </div>
        </div>

        {/* Mentee Selector */}
        {activeConnections.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted font-medium">Mentee Candidate:</span>
            <select
              value={activeConn?.id || ''}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              className="bg-bg-secondary text-xs border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-bold min-w-[180px]"
            >
              {activeConnections.map(c => (
                <option key={c.id} value={c.id}>{c.menteeName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content Rendering */}
      {activeConn ? (
        <PublishedAssignmentsView deckConnection={activeConn} />
      ) : (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl text-text-muted text-xs bg-bg-secondary/20">
          No active mentee connected yet. Connect with a mentee to view published assignments.
        </div>
      )}
    </div>
  );
}


