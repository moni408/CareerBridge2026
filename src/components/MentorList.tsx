import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { sendCrossRoleEmailNotification } from '../services/emailService';
import { collection, query, getDocs, addDoc, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Users, Star, MessageSquare, ShieldCheck, Search, Filter, Loader2, Send, X, CheckCircle2, ArrowRight, MapPin, Briefcase, Clock, Calendar, UserCheck, UserX, Check, User, FileText, Upload, Paperclip, Sparkles, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PublicProfileModal } from './PublicProfileModal';
import { analyzeCV } from '../services/geminiService';
import mammoth from 'mammoth';

export function resolveMentorIndustry(d: any): string {
  // 1. Direct explicit industry/sector/field
  const rawIndustry = d.industry || d.sector || d.domain || d.field || d.department || '';
  if (typeof rawIndustry === 'string' && rawIndustry.trim() && rawIndustry.trim().toLowerCase() !== 'tech') {
    return rawIndustry.trim();
  }

  // 2. Infer from role, jobTitle, company, expertise, bio, and skills
  const combined = [
    d.role || '',
    d.jobTitle || '',
    d.experience?.[0]?.title || '',
    d.company || '',
    d.experience?.[0]?.company || '',
    Array.isArray(d.expertise) ? d.expertise.join(' ') : '',
    Array.isArray(d.specialties) ? d.specialties.join(' ') : '',
    Array.isArray(d.skills) ? d.skills.map((s: any) => typeof s === 'string' ? s : (s?.name || '')).join(' ') : '',
    d.bio || '',
    d.summary || ''
  ].join(' ').toLowerCase();

  if (/health|clinic|medic|pharma|biotech|doctor|nurse|hospital|nursing|therap/.test(combined)) {
    return 'Healthcare & Medicine';
  }
  if (/fintech|finance|banking|bank|account|invest|audit|wealth|stock|crypto|trading|fiscal/.test(combined)) {
    return 'Finance & FinTech';
  }
  if (/market|seo|growth|advertising|brand|content|copywrit|social media|pr |public relation/.test(combined)) {
    return 'Marketing & Media';
  }
  if (/design|ui|ux|product design|graphic|animat|illustrat|figma|visual artist|creative/.test(combined)) {
    return 'Design & Creative';
  }
  if (/human resource|talent|recruit|hr |hiring|people ops|personnel/.test(combined)) {
    return 'Human Resources';
  }
  if (/product manag|scrum|agile|project manag|consult|operations|strategy|business dev|bizdev|sales|executive|founder|ceo/.test(combined)) {
    return 'Product & Strategy';
  }
  if (/educat|teach|professor|academic|lecturer|pedagogy|curriculum|tutor/.test(combined)) {
    return 'Education & Academia';
  }
  if (/legal|lawyer|attorney|compliance|regulatory|paralegal|policy/.test(combined)) {
    return 'Legal & Compliance';
  }
  if (/data sci|machine learn|ai |artificial intel|deep learn|nlp|computer vision|llm|analytics|bi analyst/.test(combined)) {
    return 'Data Science & AI';
  }
  if (/cloud|devops|aws|azure|gcp|kubernetes|docker|infrastructure|sysadmin|network eng/.test(combined)) {
    return 'Cloud & DevOps';
  }
  if (/cyber|security|infosec|pentest|soc|threat|vulnerab/.test(combined)) {
    return 'Cybersecurity';
  }
  if (/software|fullstack|frontend|backend|web dev|developer|engineer|react|node|python|golang|java|mobile|ios|android|flutter/.test(combined)) {
    return 'Software Engineering';
  }
  if (/robot|iot|embedded|hardware|electronics|circuit|semiconductor/.test(combined)) {
    return 'Hardware & IoT';
  }
  if (/supply chain|logistics|manufacturing|warehouse|procurement/.test(combined)) {
    return 'Logistics & Supply Chain';
  }

  if (rawIndustry && typeof rawIndustry === 'string' && rawIndustry.trim()) {
    return rawIndustry.trim();
  }
  if (d.role || d.jobTitle) {
    return d.role || d.jobTitle;
  }
  return 'Professional Mentorship';
}

export function MentorList({ setView, searchQuery }: { setView: (view: any) => void, searchQuery: string }) {
  const { profile, user } = useAuth();
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState<any | null>(null);
  const [requestMsg, setRequestMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myConnections, setMyConnections] = useState<any[]>([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalData, setProfileModalData] = useState<any | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');

  // REAL CV PARSING STATES FOR REQUEST PREPARATION
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState('');
  const [cvUploadMode, setCvUploadMode] = useState<'existing' | 'new_upload' | 'new_text'>('existing');
  const [cvError, setCvError] = useState<string | null>(null);
  const [analyzingStatus, setAnalyzingStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preset default mode depending on existing profile status
  useEffect(() => {
    if (selectedMentor) {
      if (profile?.profileAnalyzed || (profile?.skills && profile.skills.length > 0)) {
        setCvUploadMode('existing');
      } else {
        setCvUploadMode('new_upload');
      }
      setCvFile(null);
      setCvText('');
      setCvError(null);
      setAnalyzingStatus('');
    }
  }, [selectedMentor, profile]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'mentorship_requests'),
      where(profile?.role === 'mentor' ? 'mentorId' : 'menteeId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'mentorship_requests');
    });
    return () => unsubscribe();
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'mentorship_connections'),
      where(profile?.role === 'mentor' ? 'mentorId' : 'menteeId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyConnections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'mentorship_connections');
    });
    return () => unsubscribe();
  }, [user, profile]);

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        // 1. Fetch from 'mentors' collection
        const mentorsSnap = await getDocs(collection(db, 'mentors'));
        const mentorsColList = mentorsSnap.docs.map(doc => {
          const d = doc.data();
          const id = doc.id || d.uid;
          const xpVal = typeof d.xp === 'number' ? d.xp : (typeof d.score === 'number' ? d.score : 0);
          const resolvedInd = resolveMentorIndustry(d);
          const rawRole = d.role || d.jobTitle || d.title || (resolvedInd !== 'Professional Mentorship' ? `${resolvedInd} Specialist` : 'Industry Advisor');
          const rawCompany = d.company || (d.experience?.[0]?.company) || 'Independent Guild';
          return {
            id,
            uid: id,
            name: d.name || d.displayName || 'Mentor User',
            role: rawRole,
            company: rawCompany,
            industry: resolvedInd,
            expertise: Array.isArray(d.expertise) && d.expertise.length > 0
              ? d.expertise
              : (Array.isArray(d.skills) ? d.skills.map((s: any) => typeof s === 'object' && s !== null ? (s.name || s.title || '') : String(s)).filter(Boolean) : [resolvedInd]),
            xp: xpVal,
            rating: d.rating || 4.9,
            reviews: d.reviews || 12,
            bio: d.bio || d.summary || `Verified CareerBridge Mentor in ${resolvedInd} ready to assist candidates.`,
            available: d.available !== false && d.acceptingRequests !== false,
            verified: d.verified === true || d.verificationStatus === 'verified',
            verificationStatus: d.verificationStatus || (d.verified ? 'verified' : 'pending'),
            maxMentees: d.maxMentees || 8,
            activeMentees: d.activeMentees || 0,
            avatar: d.image || d.avatar || d.photo || d.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            location: d.location || 'Remote',
            linkedin: d.linkedin || '',
            hourlyRate: d.hourlyRate || '50'
          };
        });

        // 2. Fetch mentor accounts from 'users' collection
        const usersQ = query(collection(db, 'users'), where('role', '==', 'mentor'));
        const usersSnap = await getDocs(usersQ);
        const usersColList = usersSnap.docs.map(doc => {
          const d = doc.data();
          const id = doc.id || d.uid;
          const xpVal = typeof d.xp === 'number' ? d.xp : (typeof d.score === 'number' ? d.score : 0);
          const resolvedInd = resolveMentorIndustry(d);
          const rawRole = d.jobTitle || d.role || d.experience?.[0]?.title || d.title || (resolvedInd !== 'Professional Mentorship' ? `${resolvedInd} Lead` : 'Industry Advisor');
          const rawCompany = d.company || d.experience?.[0]?.company || 'Independent Guild';
          return {
            id,
            uid: id,
            name: d.displayName || d.name || 'Mentor User',
            role: rawRole,
            company: rawCompany,
            industry: resolvedInd,
            expertise: Array.isArray(d.skills) && d.skills.length > 0
              ? d.skills.map((s: any) => typeof s === 'object' && s !== null ? (s.name || s.title || '') : String(s)).filter(Boolean)
              : (Array.isArray(d.expertise) && d.expertise.length > 0 ? d.expertise : [resolvedInd]),
            xp: xpVal,
            rating: d.rating || 5.0,
            reviews: d.reviews || 0,
            bio: d.bio || d.summary || `Verified CareerBridge Mentor in ${resolvedInd} ready to assist candidates.`,
            available: d.acceptingRequests !== false && d.available !== false,
            verified: d.verified === true || d.verificationStatus === 'verified',
            verificationStatus: d.verificationStatus || (d.verified ? 'verified' : 'pending'),
            maxMentees: d.maxMentees || 8,
            activeMentees: d.activeMentees || 0,
            avatar: d.photo || d.photoURL || d.image || d.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            location: d.location || 'Remote',
            linkedin: d.linkedin || '',
            hourlyRate: d.hourlyRate || '50'
          };
        });

        // 3. Merge verified mentors from both collections and filter out demo mentors
        const isDemo = (m: any) => {
          const id = (m.id || m.uid || '').toLowerCase();
          const name = (m.name || m.displayName || '').trim().toLowerCase();
          return id.includes('mentor_rahman') || id.includes('mentor_sara') || id.includes('mentor_jack') ||
                 name === 'dr. faiz rahman' || name === 'sara tan' || name === 'jack miller';
        };

        const allMentorsMap = new Map<string, any>();

        usersColList.forEach(m => {
          if (m.verified && !isDemo(m)) {
            allMentorsMap.set(m.id, m);
          }
        });

        mentorsColList.forEach(m => {
          if (m.verified && !isDemo(m)) {
            if (allMentorsMap.has(m.id)) {
              const existing = allMentorsMap.get(m.id);
              const maxXP = Math.max(m.xp || 0, existing.xp || 0);
              allMentorsMap.set(m.id, { ...existing, ...m, xp: maxXP });
            } else {
              allMentorsMap.set(m.id, m);
            }
          }
        });

        const mergedList = Array.from(allMentorsMap.values())
          .sort((a, b) => b.xp - a.xp)
          .map((m, idx) => ({
            ...m,
            rank: idx + 1,
            leaderboardRank: idx + 1
          }));

        setMentors(mergedList);
      } catch (err) {
        console.warn('Error fetching mentors:', err);
        setMentors([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMentors();
  }, []);

  const handleSendRequest = async () => {
    if (!selectedMentor || !user) return;
    setSending(true);
    setCvError(null);
    setAnalyzingStatus('Preparing packet for transmission...');

    try {
      let result: any = null;

      if (cvUploadMode === 'new_upload') {
        if (!cvFile) {
          throw new Error('Please select a CV document format (PDF/DOCX) to attach.');
        }

        setAnalyzingStatus('Deconstructing active PDF/DOCX CV structure via Gemini AI...');
        if (cvFile.type === 'application/pdf') {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(cvFile);
          });
          const base64 = await base64Promise;
          result = await analyzeCV(undefined, { data: base64, mimeType: 'application/pdf' });
        } else if (cvFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const arrayBuffer = await cvFile.arrayBuffer();
          const docxResult = await mammoth.extractRawText({ arrayBuffer });
          result = await analyzeCV(docxResult.value);
        } else {
          throw new Error('Unsupported document format. Please upload standard PDF or DOCX format.');
        }
      } else if (cvUploadMode === 'new_text') {
        if (!cvText.trim()) {
          throw new Error('Please paste your professional CV curriculum details in the workbench.');
        }
        setAnalyzingStatus('Analyzing curriculum text metrics...');
        result = await analyzeCV(cvText);
      }

      // If we analyzed a new CV, update the student's global user details so their dashboard showcases real data
      if (result) {
        setAnalyzingStatus('Calibrating user competencies in the live cloud environment...');
        const profileRef = doc(db, 'users', user.uid);
        await updateDoc(profileRef, {
          ...result,
          profileAnalyzed: true,
          readinessScore: result.meanSkillScore || 62,
          updatedAt: new Date().toISOString()
        });
      }

      setAnalyzingStatus('Finalizing connection protocols...');
      const payload: any = {
        menteeId: user.uid,
        mentorId: selectedMentor.uid,
        menteeName: profile?.displayName || 'Graduate Student',
        mentorName: selectedMentor.name,
        message: requestMsg,
        careerGoal: result ? (result.targetRole || 'Career Guidance') : (profile?.goals?.[0] || 'Career Guidance'),
        status: 'pending',
        createdAt: new Date().toISOString(),
        
        // Attached dossiers
        skills: result ? (result.skills || []) : (profile?.skills || []),
        projects: result ? (result.projects || []) : (profile?.projects || []),
        academicBackground: result ? (result.academicBackground || []) : (profile?.academicBackground || profile?.education || []),
        certifications: result ? (result.certifications || []) : (profile?.certifications || []),
        gapAnalysis: result ? (result.gapAnalysis || '') : (profile?.gapAnalysis || ''),
        targetRole: result ? (result.targetRole || '') : (profile?.targetRole || ''),
        targetIndustry: result ? (result.targetIndustry || '') : (profile?.targetIndustry || ''),
        meanSkillScore: result ? (result.meanSkillScore || 62) : (profile?.meanSkillScore || profile?.readinessScore || 62)
      };

      await addDoc(collection(db, 'mentorship_requests'), payload);

      // Dispatch Email Notification to Mentor
      sendCrossRoleEmailNotification({
        senderId: user?.uid,
        senderName: profile?.displayName || user?.displayName || 'Student',
        senderRole: 'student',
        senderEmail: user?.email || '',
        recipientId: selectedMentor.id,
        recipientName: selectedMentor.name,
        recipientRole: 'mentor',
        subject: `New Mentorship Request from ${profile?.displayName || 'a Student'}`,
        category: 'mentorship',
        message: `Student ${profile?.displayName || 'Candidate'} sent you a mentorship request with message: "${requestMsg}"`,
        actionUrl: window.location.origin
      }).catch(e => console.warn('Email dispatch failed:', e));

      setSelectedMentor(null);
      setRequestMsg('');
      setCvFile(null);
      setCvText('');
      setAnalyzingStatus('');
    } catch (err: any) {
      console.error('Failed to parse or submit request:', err);
      setCvError(err.message || 'An error occurred during CV analysis. Please check your file content or try pasting text.');
    } finally {
      setSending(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, 'mentorship_requests', requestId));
    } catch (err) {
      console.error('Failed to cancel request', err);
    }
  };

  const handleAccept = async (request: any) => {
    try {
      await updateDoc(doc(db, 'mentorship_requests', request.id), { status: 'accepted' });
      await addDoc(collection(db, 'mentorship_connections'), {
        mentorId: request.mentorId,
        menteeId: request.menteeId,
        mentorName: request.mentorName,
        menteeName: request.menteeName,
        createdAt: new Date().toISOString()
      });

      // Dispatch Email Notification to Student
      sendCrossRoleEmailNotification({
        senderId: request.mentorId,
        senderName: request.mentorName,
        senderRole: 'mentor',
        recipientId: request.menteeId,
        recipientName: request.menteeName,
        recipientRole: 'student',
        subject: `Mentorship Request Accepted by ${request.mentorName}`,
        category: 'mentorship',
        message: `Great news! ${request.mentorName} accepted your mentorship request. You can now chat and schedule 1-on-1 sessions.`,
        actionUrl: window.location.origin
      }).catch(e => console.warn('Email dispatch failed:', e));
    } catch (err) {
      console.error('Failed to accept request', err);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'mentorship_requests', requestId), { status: 'rejected' });
    } catch (err) {
      console.error('Failed to reject request', err);
    }
  };

  const INDUSTRY_TABS = [
    { id: 'all', label: 'All Fields' },
    { id: 'Software Engineering', label: 'Software & Tech' },
    { id: 'Product & Strategy', label: 'Product & Strategy' },
    { id: 'Design & Creative', label: 'Design & Creative' },
    { id: 'Finance & FinTech', label: 'Finance & FinTech' },
    { id: 'Marketing & Media', label: 'Marketing & Growth' },
    { id: 'Human Resources', label: 'HR & Talent' },
    { id: 'Healthcare & Medicine', label: 'Healthcare & Biotech' },
    { id: 'Data Science & AI', label: 'Data Science & AI' },
    { id: 'Education & Academia', label: 'Education' },
    { id: 'other', label: 'Other Sectors' }
  ];

  const filteredMentors = mentors
    .filter(m => {
      // 1. Search Query Filter
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = !q || 
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.company.toLowerCase().includes(q) ||
        m.industry.toLowerCase().includes(q) ||
        m.expertise.some((e: string) => e.toLowerCase().includes(q));

      // 2. Industry Tab Filter
      let matchesIndustry = true;
      if (selectedIndustry !== 'all') {
        if (selectedIndustry === 'other') {
          const knownKeywords = ['software', 'tech', 'product', 'design', 'finance', 'fintech', 'marketing', 'human resource', 'health', 'data science', 'ai', 'education'];
          matchesIndustry = !knownKeywords.some(kw => m.industry.toLowerCase().includes(kw));
        } else {
          matchesIndustry = m.industry.toLowerCase().includes(selectedIndustry.toLowerCase());
        }
      }

      return matchesSearch && matchesIndustry;
    })
    .sort((a, b) => {
      // Find weakest skills (lowest scores)
      const weakestSkills = profile?.skills
        ?.filter((s: any) => typeof s !== 'string' && s.score < 60)
        ?.map((s: any) => s.name.toLowerCase()) || [];

      const aMatched = a.expertise.some((e: string) => weakestSkills.includes(e.toLowerCase())) ? 1 : 0;
      const bMatched = b.expertise.some((e: string) => weakestSkills.includes(e.toLowerCase())) ? 1 : 0;

      return bMatched - aMatched || ((b.xp || 0) - (a.xp || 0)) || (b.rating - a.rating);
    });

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-6 bg-bg-primary min-h-screen">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted animate-pulse">CONNECTING TO VERIFIED MENTORS NETWORK...</p>
    </div>
  );

  return (
    <div className="space-y-12 transition-colors duration-500 pb-24">
      {/* Requests Section */}
      {myRequests.some(r => r.status === 'pending') && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary mt-1">PENDING REQUESTS</h2>
          </div>
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {myRequests.filter(r => r.status === 'pending').map((req) => (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-bg-secondary border border-border p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/20 transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-5 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-primary font-bold text-xl border border-primary/10">
                      {(profile?.role === 'mentor' ? req.menteeName : 'M')?.[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-text-primary tracking-tight">
                        {profile?.role === 'mentor' ? req.menteeName : `Request sent to ${req.mentorName}`}
                      </h3>
                      <p className="text-sm text-text-secondary italic mt-1 line-clamp-1">"{req.message}"</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {profile?.role === 'mentor' ? (
                      <>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="p-3 text-error hover:bg-error-light rounded-xl transition-all"
                          title="Reject Connection"
                        >
                          <UserX className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleAccept(req)}
                          className="btn-primary px-8"
                        >
                          ACCEPT
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="text-[10px] font-bold uppercase tracking-widest text-error hover:text-error-dark px-4 py-2 hover:bg-error-light rounded-xl transition-all"
                      >
                        CANCEL
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      <header className="space-y-6 relative">
        <div className="absolute -left-12 top-0 bottom-0 w-[1px] bg-border hidden xl:block" />
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Mentor Network</p>
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight leading-tight">Expert Guidance</h1>
        </div>
        <p className="text-text-secondary text-base md:text-lg max-w-2xl leading-relaxed font-light">
          Connect with seasoned leaders across engineering, product, finance, healthcare, marketing, and design to accelerate your professional growth.
        </p>

        {/* Industry Sector Filter Tabs */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          {INDUSTRY_TABS.map((tab) => {
            const isActive = selectedIndustry === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedIndustry(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary border border-border'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {filteredMentors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor) => (
            <motion.div
              key={mentor.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              className="bg-bg-secondary border border-border p-6 rounded-2xl flex flex-col justify-between group h-full shadow-sm hover:shadow-xl hover:border-primary/20 transition-all"
            >
              <div>
                {/* Header: Avatar, Rating & Rank */}
                <div className="flex justify-between items-start mb-5">
                  <div className="relative">
                    {mentor.avatar && !mentor.avatar.includes('unsplash.com/photo-1534528741775-53994a69daeb') ? (
                      <img 
                        src={mentor.avatar} 
                        alt={mentor.name} 
                        className="w-14 h-14 rounded-2xl object-cover border border-primary/20 shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl border border-primary/20 group-hover:scale-105 transition-transform duration-500 shadow-sm">
                        {mentor.name?.[0] || 'M'}
                      </div>
                    )}
                    {mentor.verified && (
                      <div className="absolute -bottom-1 -right-1 bg-primary text-white p-0.5 rounded-full ring-2 ring-bg-secondary" title="Verified Mentor">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1.5 bg-warning-light text-warning px-2.5 py-1 rounded-full border border-warning/20">
                      <Star className="w-3.5 h-3.5 fill-warning" />
                      <span className="text-[11px] font-bold">{mentor.rating}</span>
                    </div>
                    {mentor.rank && (
                      <span className="text-[9.5px] font-mono font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        🏆 Rank #{mentor.rank} • {(mentor.xp || 0).toLocaleString()} XP
                      </span>
                    )}
                  </div>
                </div>

                {/* Mentor Info */}
                <div className="space-y-2 mb-4">
                  <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors tracking-tight truncate">
                    {mentor.name}
                  </h3>

                  <p className="text-xs font-semibold text-text-secondary line-clamp-1">
                    {mentor.role} <span className="text-text-muted font-normal">•</span> <span className="text-text-primary font-bold">{mentor.company}</span>
                  </p>

                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                      <Briefcase className="w-3 h-3" /> {mentor.industry}
                    </span>
                    {mentor.location && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-text-muted font-medium">
                        <MapPin className="w-3 h-3" /> {mentor.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bio / Tagline */}
                {mentor.bio && (
                  <p className="text-xs text-text-secondary line-clamp-2 italic font-light mb-4 leading-relaxed">
                    "{mentor.bio}"
                  </p>
                )}

                {/* Specialties */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {mentor.expertise.slice(0, 3).map((exp: string) => (
                    <span key={exp} className="bg-bg-tertiary border border-border px-2.5 py-1 rounded-lg text-[9.5px] font-semibold text-text-secondary">
                      {exp}
                    </span>
                  ))}
                  {mentor.expertise.length > 3 && (
                    <span className="bg-bg-tertiary border border-border px-2 py-1 rounded-lg text-[9.5px] font-semibold text-text-muted">
                      +{mentor.expertise.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/60 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setProfileModalData(mentor);
                    setProfileModalOpen(true);
                  }}
                  className="px-4 py-2 bg-bg-secondary hover:bg-bg-tertiary border border-border text-[10.5px] font-bold text-text-secondary rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  <User className="w-3.5 h-3.5 text-primary" /> View Profile
                </button>

                {(() => {
                  const isMentorProfile = profile?.role === 'mentor';
                  const existingConnection = myConnections.find(c => c.mentorId === mentor.uid || c.menteeId === mentor.uid);
                  const existingRequest = myRequests.find(r => r.mentorId === mentor.uid && r.status === 'pending');

                  if (existingConnection) {
                    return (
                      <button
                        onClick={() => setView('chat')}
                        className="btn-primary-outline w-full flex items-center justify-center gap-2 py-2 text-xs"
                      >
                        <MessageSquare className="w-4 h-4" />
                        CHAT NOW
                      </button>
                    );
                  }

                  if (existingRequest) {
                    return (
                      <div className="flex gap-2 w-full">
                        <div className="flex-1 bg-bg-tertiary border border-border text-text-muted text-[10px] font-bold tracking-widest px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
                          <Clock className="w-4 h-4" />
                          PENDING
                        </div>
                        <button
                          onClick={() => handleCancelRequest(existingRequest.id)}
                          className="p-2.5 text-error hover:bg-error-light border border-transparent hover:border-error/20 rounded-xl transition-all"
                          title="Cancel Request"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  }
                  return (
                    <button
                      onClick={() => setSelectedMentor(mentor)}
                      disabled={isMentorProfile}
                      className="btn-primary w-full group flex items-center justify-center gap-2 py-2.5 text-xs"
                    >
                      {isMentorProfile ? 'MENTOR ROLE ACTIVE' : (
                        <>
                          CONNECT NOW
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-bg-secondary/50 border-2 border-dashed border-border rounded-2xl p-20 text-center space-y-6">
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-primary/5 blur-xl rounded-full" />
            <Search className="w-14 h-14 text-text-muted relative z-10 mx-auto" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">No Mentors Found</h3>
            <p className="text-xs font-semibold text-text-muted max-w-sm mx-auto">
              No mentors currently matching your query or selected industry filter. Try selecting "All Fields" or clearing the search bar.
            </p>
          </div>
        </div>
      )}

      {/* Request Modal */}
      <AnimatePresence>
        {selectedMentor && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-bg-primary/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-card border border-border p-6 md:p-10 max-w-2xl w-full relative rounded-3xl shadow-2xl my-8 text-left"
            >
              <div className="space-y-8">
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 md:gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center text-primary font-bold text-xl border border-primary/20 shrink-0">
                      {selectedMentor.name[0]}
                    </div>
                    <div className="space-y-0.5">
                      <h2 className="text-xl md:text-2xl font-black text-text-primary tracking-tight leading-tight">Send Mentorship Request</h2>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#534AB7] bg-primary-light/55 px-2.5 py-0.5 rounded border border-primary/10 w-fit">
                        Advising Expert: {selectedMentor.name}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedMentor(null)}
                    className="p-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-border text-text-muted hover:text-text-primary rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Form Elements */}
                <div className="space-y-6">
                  {/* Message to Mentor */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted ml-0.5 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-primary" /> Introduce Yourself to {selectedMentor.name.split(' ')[0]}
                    </label>
                    <textarea
                      value={requestMsg}
                      onChange={(e) => setRequestMsg(e.target.value)}
                      placeholder="Be specific! Pitch your current training milestones and write what you hope to gain from this mentor..."
                      className="w-full h-28 resize-none p-4 bg-bg-secondary border border-border rounded-xl text-xs text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>

                  {/* CV Attacher - The Dynamic Extractor Core */}
                  <div className="space-y-3 bg-bg-secondary/45 border border-border p-4 rounded-2xl">
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#534AB7] animate-pulse" /> Attached Analytical CV Dossier
                      </h4>
                      <p className="text-[10px] text-text-muted font-medium">
                        Your mentor needs authentic professional context. Provide your CV to auto-generate a structured technical compatibility report.
                      </p>
                    </div>

                    {/* Mode Selector Tabs */}
                    <div className="grid grid-cols-3 gap-2 bg-bg-tertiary p-1 rounded-xl border border-border">
                      {(profile?.profileAnalyzed || (profile?.skills && profile.skills.length > 0)) && (
                        <button
                          type="button"
                          onClick={() => setCvUploadMode('existing')}
                          className={`py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all ${
                            cvUploadMode === 'existing' 
                              ? 'bg-card text-text-primary shadow-xs border border-border' 
                              : 'text-text-muted hover:text-text-secondary'
                          }`}
                        >
                          Use Extracted CV
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => setCvUploadMode('new_upload')}
                        className={`py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all ${
                          cvUploadMode === 'new_upload' 
                            ? 'bg-card text-text-primary shadow-xs border border-border' 
                            : 'text-text-muted hover:text-text-secondary'
                        } ${!(profile?.profileAnalyzed || (profile?.skills && profile.skills.length > 0)) ? 'col-span-2' : ''}`}
                      >
                        Upload PDF / DOCX
                      </button>

                      <button
                        type="button"
                        onClick={() => setCvUploadMode('new_text')}
                        className={`py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all ${
                          cvUploadMode === 'new_text' 
                            ? 'bg-card text-text-primary shadow-xs border border-border' 
                            : 'text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        Paste CV Text
                      </button>
                    </div>

                    {/* Tab Panels */}
                    <div className="pt-2">
                      {cvUploadMode === 'existing' && (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex items-start gap-2.5 text-left">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-emerald-600">Active Dossier Ready to Sync</p>
                            <p className="text-[9.5px] text-text-secondary leading-snug">
                              We found a pre-analyzed profile in CareerBridge with <strong>{profile?.skills?.length || 0} skills</strong> and <strong>{profile?.projects?.length || 0} projects</strong>. It will be pre-aligned for the mentor instantly.
                            </p>
                          </div>
                        </div>
                      )}

                      {cvUploadMode === 'new_upload' && (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                            cvFile 
                              ? 'border-primary bg-primary-light/30' 
                              : 'border-border bg-bg-tertiary hover:border-primary'
                          }`}
                        >
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                if (f.type === 'application/pdf' || f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                                  setCvFile(f);
                                  setCvError(null);
                                } else {
                                  setCvError('Please upload standard PDF or DOCX formatted files.');
                                }
                              }
                            }} 
                            className="hidden" 
                            accept=".pdf,.docx"
                          />
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Upload className="w-6 h-6 text-text-muted" />
                            {cvFile ? (
                              <div className="space-y-0.5">
                                <p className="text-[10px] font-bold text-text-primary">{cvFile.name}</p>
                                <p className="text-[9px] text-[#534AB7] font-bold uppercase tracking-wider">File Selected • Click Send to Parse</p>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <p className="text-[10.5px] font-bold text-text-secondary">Choose CV document files</p>
                                <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">PDF or DOCX max 10MB</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {cvUploadMode === 'new_text' && (
                        <div className="space-y-2">
                          <textarea
                            value={cvText}
                            onChange={(e) => setCvText(e.target.value)}
                            placeholder="Deconstruct your journey by pasting raw resume text headers, education lines, stacks used, and project bullet points here..."
                            className="w-full h-24 resize-none p-3 bg-bg-tertiary border border-border rounded-xl text-[10px] font-mono text-text-secondary focus:border-primary outline-none transition-all placeholder:text-[10px]"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational status trackers & Errors */}
                  {cvError && (
                    <div className="p-3.5 bg-rose-500/5 border border-rose-500/10 text-rose-600 rounded-xl flex items-start gap-2.5 text-[10px] leading-snug">
                      <X className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                      <div>
                        <span className="font-extrabold uppercase block tracking-wider mb-0.5">Dossier Calibration Fault</span>
                        {cvError}
                      </div>
                    </div>
                  )}

                  {sending && analyzingStatus && (
                    <div className="p-3.5 bg-primary-light/45 border border-primary/10 text-[#534AB7] rounded-xl flex items-center gap-3 text-[10px] font-bold italic animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0 text-primary" />
                      <div className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>{analyzingStatus}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Action row */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMentor(null)}
                      className="flex-1 py-3 bg-bg-secondary hover:bg-bg-tertiary text-[10.5px] font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary rounded-xl transition-all border border-border"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={handleSendRequest}
                      disabled={sending || !requestMsg.trim() || (cvUploadMode === 'new_upload' && !cvFile) || (cvUploadMode === 'new_text' && !cvText.trim())}
                      className="btn-primary flex-[2] flex items-center justify-center gap-2 group shadow-lg shadow-primary/25 text-[10.5px]"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {cvUploadMode === 'existing' ? 'SEND REQUEST' : 'ANALYZE && SUBMIT CV'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PUBLIC PROFILE VIEW AND SYSTEM PREVIEWS (LIKE FACEBOOK PLATFORM FOR GENERAL ROLES) */}
      <PublicProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => {
          setProfileModalOpen(false);
          setProfileModalData(null);
        }} 
        profileType="mentor" 
        profileData={profileModalData} 
      />
    </div>
  );
}
