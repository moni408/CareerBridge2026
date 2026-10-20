import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { MentorDashboard } from './MentorDashboard';
import { 
  TrendingUp, ArrowRight, CheckCircle2, ShieldCheck, ShieldX, 
  BrainCircuit, Code2, Users2, Rocket, Target, Zap, Flame, 
  Trophy, MessageSquare, Briefcase as BriefcaseIcon, 
  ExternalLink, Sparkles, AlertCircle, TrendingDown,
  LayoutDashboard, Search, Clock, ArrowUpRight, Check, Edit3, HelpCircle,
  Award, FileText, X, Download, Plus, Loader2, ShieldAlert, AlertTriangle
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, LineChart, Line, Cell
} from 'recharts';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getSkillColorClass, getSkillTextColorClass, getDeterministicSkillScore } from '../lib/skillColors';
import { calculateJobSkillMatch } from '../lib/jobMatch';
import { AddSkillModal } from './AddSkillModal';
import { CompetencyCockpit } from './CompetencyCockpit';
import { CockpitEmptyState } from './CockpitEmptyState';
import { subscribeStudentApplications } from '../services/applicationFormService';

interface DashboardProps {
  setView: (view: any) => void;
  currentView?: string;
}

interface CareerPathData {
  title: string;
  trendingSkills: string[];
  benchmarks: {
    technical: number;
    soft: number;
    problemSolving: number;
    communication: number;
    domain: number;
  };
  marketBenchmarkPercent: number;
  benchmarkDescription: string;
}

const CAREER_PATHS: Record<string, CareerPathData> = {
  'Software Engineer': {
    title: 'Software Engineer',
    trendingSkills: ['GoLang', 'System Design', 'PostgreSQL', 'LLM Ops', 'gRPC', 'Docker'],
    benchmarks: { technical: 90, soft: 80, problemSolving: 95, communication: 80, domain: 75 },
    marketBenchmarkPercent: 62,
    benchmarkDescription: "You're ahead of {percent}% of CS grads applying for software engineering roles."
  },
  'Frontend Developer': {
    title: 'Frontend Developer',
    trendingSkills: ['React 19', 'Next.js App Router', 'Tailwind v4', 'TypeScript', 'Framer Motion', 'Web Performance'],
    benchmarks: { technical: 95, soft: 85, problemSolving: 80, communication: 85, domain: 70 },
    marketBenchmarkPercent: 74,
    benchmarkDescription: "You're ahead of {percent}% of candidates applying for Frontend Engineering roles."
  },
  'Backend Developer': {
    title: 'Backend Developer',
    trendingSkills: ['Node.js/Express', 'PostgreSQL', 'System Design', 'Redis', 'Docker/Kubernetes', 'GraphQL'],
    benchmarks: { technical: 95, soft: 75, problemSolving: 90, communication: 80, domain: 80 },
    marketBenchmarkPercent: 68,
    benchmarkDescription: "You're ahead of {percent}% of applicants vying for backend software positions."
  },
  'Data Scientist': {
    title: 'Data Scientist',
    trendingSkills: ['Python', 'Pandas/NumPy', 'TensorFlow/PyTorch', 'SQL', 'Data Analytics', 'MLOps'],
    benchmarks: { technical: 90, soft: 80, problemSolving: 95, communication: 85, domain: 75 },
    marketBenchmarkPercent: 59,
    benchmarkDescription: "You're ahead of {percent}% of math and data graduates in product development."
  },
  'AI / ML Engineer': {
    title: 'AI / ML Engineer',
    trendingSkills: ['Generative AI', 'Vector DBs (Pinecone)', 'PyTorch', 'Prompt Engineering', 'LangChain', 'LLMs'],
    benchmarks: { technical: 90, soft: 75, problemSolving: 95, communication: 80, domain: 70 },
    marketBenchmarkPercent: 55,
    benchmarkDescription: "You're ahead of {percent}% of early-career developers in machine learning."
  },
  'Product Manager': {
    title: 'Product Manager',
    trendingSkills: ['Agile Roadmap', 'Product Analytics', 'A/B Testing', 'Client Stakeholders', 'SQL', 'User Research'],
    benchmarks: { technical: 75, soft: 95, problemSolving: 85, communication: 95, domain: 85 },
    marketBenchmarkPercent: 64,
    benchmarkDescription: "You're ahead of {percent}% of business/tech grads pursuing product management."
  },
  'Default': {
    title: 'Software Engineer',
    trendingSkills: ['GoLang', 'System Design', 'PostgreSQL', 'LLM Ops', 'Docker', 'REST APIs'],
    benchmarks: { technical: 85, soft: 80, problemSolving: 90, communication: 80, domain: 75 },
    marketBenchmarkPercent: 60,
    benchmarkDescription: "You're ahead of {percent}% of applicants applying to similar tech roles."
  }
};

const getCareerData = (role: string): CareerPathData => {
  if (!role) return CAREER_PATHS['Default'];
  const r = role.toLowerCase();
  if (r.includes('frontend') || r.includes('front-end') || r.includes('ui engineer')) {
    return CAREER_PATHS['Frontend Developer'];
  }
  if (r.includes('backend') || r.includes('back-end') || r.includes('node') || r.includes('django')) {
    return CAREER_PATHS['Backend Developer'];
  }
  if (r.includes('data sci') || r.includes('data analysis') || r.includes('analyst')) {
    return CAREER_PATHS['Data Scientist'];
  }
  if (r.includes('ai') || r.includes('ml') || r.includes('machine learning') || r.includes('intelligence')) {
    return CAREER_PATHS['AI / ML Engineer'];
  }
  if (r.includes('product manager') || r.includes('tech pm') || r.includes('product lead') || r.includes('product man')) {
    return CAREER_PATHS['Product Manager'];
  }
  if (r.includes('software') || r.includes('developer') || r.includes('programmer') || r.includes('engineer')) {
    return CAREER_PATHS['Software Engineer'];
  }
  return CAREER_PATHS['Default'];
};

export function Dashboard({ setView, currentView }: DashboardProps) {
  const { profile, user } = useAuth();
  
  if (profile?.role === 'mentor') {
    return <MentorDashboard setView={setView} initialView={currentView === 'recognition' ? 'recognition' : currentView === 'impact-report' ? 'impact' : 'dashboard'} />;
  }
  
  // Connect with real-time Firebase mentorship connection state
  const [hasMentor, setHasMentor] = useState(false);
  const [activeConnectionsCount, setActiveConnectionsCount] = useState(0);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRoleOption, setSelectedRoleOption] = useState('');

  const [endorsements, setEndorsements] = useState<any[]>([]);
  const [selectedEndorsementLetter, setSelectedEndorsementLetter] = useState<any | null>(null);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [scheduledInterviewsCount, setScheduledInterviewsCount] = useState<number>(0);

  // New Skill Modal state
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isUpdatingCV, setIsUpdatingCV] = useState(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string | null>(null);

  const hasSubmittedCV = useMemo(() => {
    return Boolean(
      profile?.profileAnalyzed || 
      profile?.hasCvSubmitted || 
      profile?.resumeText || 
      profile?.cvUrl || 
      (profile?.skills && profile.skills.length > 0)
    );
  }, [profile]);

  const handleUpdateCVWithNewSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSkillName.trim()) return;

    setIsUpdatingCV(true);
    setUpdateSuccessMsg(null);

    try {
      const existingSkills = profile?.skills || [];
      const existingProjects = profile?.projects || [];
      const existingResumeText = profile?.resumeText || '';

      const newSkillObj = {
        name: newSkillName.trim(),
        score: 88,
        category: 'technical',
        reason: 'Monthly practical project implementation'
      };

      const updatedSkills = [
        ...existingSkills.filter((s: any) => (typeof s === 'string' ? s : s.name).toLowerCase() !== newSkillName.trim().toLowerCase()),
        newSkillObj
      ];

      const newProjectObj = newProjectTitle.trim() ? {
        title: newProjectTitle.trim(),
        description: newProjectDesc.trim(),
        techStack: [newSkillName.trim()],
        dateAdded: new Date().toISOString()
      } : null;

      const updatedProjects = newProjectObj 
        ? [...existingProjects, newProjectObj]
        : existingProjects;

      const updatedResumeText = `${existingResumeText}\n\n[Skill Added]: ${newSkillName.trim()}\nProject: ${newProjectTitle.trim()} - ${newProjectDesc.trim()}`;

      const currentScore = profile?.readinessScore || profile?.meanSkillScore || 70;
      const boostedScore = Math.min(100, currentScore + 5);

      const profileRef = doc(db, 'users', user.uid);
      await updateDoc(profileRef, {
        skills: updatedSkills,
        projects: updatedProjects,
        resumeText: updatedResumeText,
        profileAnalyzed: true,
        hasCvSubmitted: true,
        readinessScore: boostedScore,
        meanSkillScore: boostedScore,
        updatedAt: new Date().toISOString()
      });

      setUpdateSuccessMsg('CV & Competency Cockpit auto-updated successfully!');
      setTimeout(() => {
        setUpdateSuccessMsg(null);
        setShowAddSkillModal(false);
        setNewSkillName('');
        setNewProjectTitle('');
        setNewProjectDesc('');
      }, 1500);
    } catch (err) {
      console.error("Failed to update CV with new skill", err);
    } finally {
      setIsUpdatingCV(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'endorsements'),
      where('menteeId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEndorsements(list);
    }, (err) => {
      console.error("Failed to fetch endorsements", err);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'mentorship_connections'),
      where('menteeId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasMentor(!snapshot.empty);
      setActiveConnectionsCount(snapshot.size);
    }, (err) => {
      console.error("Failed to fetch mentorship connection state", err);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'jobs'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJobsList(list);
    }, (err) => {
      console.error("Failed to load jobs snapshot in Dashboard:", err);
    });
    return () => unsub();
  }, []);

  // Real-time listener for scheduled interviews from industry
  useEffect(() => {
    if (!user) {
      setScheduledInterviewsCount(0);
      return;
    }
    const studentId = user.uid || (user as any).id;
    const studentEmail = user.email || undefined;
    const unsub = subscribeStudentApplications(studentId, studentEmail, (apps) => {
      const interviewApps = apps.filter(a => !a.withdrawn && (a.status === 'Interview' || Boolean(a.interviewDetails)));
      setScheduledInterviewsCount(interviewApps.length);
    });
    return () => unsub();
  }, [user]);

  const userSkillsForMatch = useMemo(() => {
    const rawUserSkills = [
      ...(Array.isArray(profile?.skills) ? profile.skills : []),
      ...(Array.isArray(profile?.parsedSkills) ? profile.parsedSkills : []),
      ...(Array.isArray(profile?.skillsList) ? profile.skillsList : []),
    ];
    return Array.from(
      new Set(
        rawUserSkills
          .map((s: any) => (typeof s === 'string' ? s : s?.name || s?.title || '').trim().toLowerCase())
          .filter(Boolean)
      )
    );
  }, [profile]);

  const matchedJobsCount = useMemo(() => {
    if (!jobsList || jobsList.length === 0) return 0;
    const userMajor = profile?.department || profile?.fieldOfStudy || profile?.major || '';
    
    return jobsList.filter(job => {
      const matchScore = calculateJobSkillMatch(job, userSkillsForMatch, userMajor);
      return matchScore >= 80;
    }).length;
  }, [jobsList, userSkillsForMatch, profile]);

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const profileCompletionScore = useMemo(() => {
    if (profile?.profileCompletion) return profile.profileCompletion;
    if (!profile) return 78;
    let score = 35;
    if (profile.displayName) score += 10;
    if (profile.email) score += 10;
    if (profile.profileAnalyzed || profile.hasCvSubmitted) score += 25;
    if (profile.skills && profile.skills.length > 0) score += 10;
    if (profile.targetRole) score += 10;
    return Math.min(100, score);
  }, [profile]);

  // Determine current preferred role from profile or input state
  const preferredRole = useMemo(() => {
    return profile?.targetRole || 'Software Engineer';
  }, [profile?.targetRole]);

  useEffect(() => {
    if (preferredRole) {
      setSelectedRoleOption(preferredRole);
    }
  }, [preferredRole]);

  const activePathData = useMemo(() => {
    return getCareerData(preferredRole);
  }, [preferredRole]);

  const handleUpdateRole = async (newRole: string) => {
    if (!user || !newRole.trim()) return;
    try {
      const profileRef = doc(db, 'users', user.uid);
      await updateDoc(profileRef, {
        targetRole: newRole,
        updatedAt: new Date().toISOString()
      });
      setIsEditingRole(false);
    } catch (err) {
      console.error("Failed to update target career role", err);
    }
  };

  // Sparkline data showing growth up to the profile score
  const sparklineData = useMemo(() => {
    const currentScore = profile?.profileAnalyzed ? (profile?.readinessScore || profile?.meanSkillScore || 0) : 0;
    return [
      { value: Math.max(0, Math.round(currentScore * 0.75)) },
      { value: Math.max(0, Math.round(currentScore * 0.8)) },
      { value: Math.max(0, Math.round(currentScore * 0.85)) },
      { value: Math.max(0, Math.round(currentScore * 0.82)) },
      { value: Math.max(0, Math.round(currentScore * 0.9)) },
      { value: Math.max(0, Math.round(currentScore * 0.92)) },
      { value: currentScore }
    ];
  }, [profile]);

  // Dynamic Competency Cockpit Radar data
  const radarData = useMemo(() => {
    const rawSkills = profile?.skills || [];
    
    // Fallback if no analyzed CV
    if (!profile?.profileAnalyzed || rawSkills.length === 0) {
      return [
        { subject: 'Technical', A: 0, B: 0, fullMark: 100 },
        { subject: 'Soft Skills', A: 0, B: 0, fullMark: 100 },
        { subject: 'Problem Solving', A: 0, B: 0, fullMark: 100 },
        { subject: 'Communication', A: 0, B: 0, fullMark: 100 },
        { subject: 'Domain', A: 0, B: 0, fullMark: 100 },
      ];
    }

    // Map keywords to categorize parsed skills
    const techSkills = rawSkills.filter((s: any) => s.category === 'technical' || !s.category);
    const softSkills = rawSkills.filter((s: any) => s.category === 'soft');
    const probSkills = rawSkills.filter((s: any) => 
      ['problem solving', 'logic', 'algorithm', 'data structure', 'math', 'analytical', 'debug', 'dsa'].some(kw => 
        (s.name || '').toLowerCase().includes(kw)
      )
    );
    const commSkills = rawSkills.filter((s: any) => 
      ['speak', 'write', 'present', 'communication', 'english', 'interpersonal', 'stakeholder'].some(kw => 
        (s.name || '').toLowerCase().includes(kw)
      )
    );
    const domainSkills = rawSkills.filter((s: any) => 
      ['product', 'business', 'domain', 'industry', 'market', 'finance', 'healthcare', 'e-commerce', 'banking', 'telecom'].some(kw => 
        (s.name || '').toLowerCase().includes(kw)
      )
    );

    const getAverage = (arr: any[], defaultVal: number) => {
      if (arr.length === 0) return defaultVal;
      const sum = arr.reduce((acc, curr) => acc + (curr.score || 0), 0);
      return Math.round(sum / arr.length);
    };

    const techAvg = getAverage(techSkills, 82);
    const softAvg = getAverage(softSkills, 74);
    const probAvg = getAverage(probSkills, Math.min(100, Math.round(techAvg * 0.95 + 5)));
    const commAvg = getAverage(commSkills, Math.min(100, Math.round(softAvg * 0.9 + 5)));
    const domAvg = getAverage(domainSkills, 72);

    return [
      { subject: 'Technical', A: techAvg, B: activePathData.benchmarks.technical, fullMark: 100 },
      { subject: 'Soft Skills', A: softAvg, B: activePathData.benchmarks.soft, fullMark: 100 },
      { subject: 'Problem Solving', A: probAvg, B: activePathData.benchmarks.problemSolving, fullMark: 100 },
      { subject: 'Communication', A: commAvg, B: activePathData.benchmarks.communication, fullMark: 100 },
      { subject: 'Domain', A: domAvg, B: activePathData.benchmarks.domain, fullMark: 100 },
    ];
  }, [profile, activePathData]);

  // Dynamic critical gaps calculated by comparing current capability vs career path benchmarks
  const criticalGaps = useMemo(() => {
    const gapsList: { title: string; gap: number; gapText: string; action: string }[] = [];
    
    radarData.forEach(item => {
      const diff = item.A - item.B;
      if (diff < 0) {
        let action = 'Workshop';
        if (item.subject === 'Technical') action = 'Deeper Review';
        if (item.subject === 'Soft Skills') action = 'Refinement Course';
        if (item.subject === 'Communication') action = 'Mentor Sync';
        if (item.subject === 'Problem Solving') action = 'DSA Module';
        if (item.subject === 'Domain') action = 'Sector Core Prep';
        
        gapsList.push({
          title: `${item.subject} Depth`,
          gap: diff,
          gapText: `${diff}%`,
          action: action
        });
      }
    });

    // Sort to show the biggest gaps first
    gapsList.sort((a, b) => a.gap - b.gap);

    if (gapsList.length === 0) {
      // If no gaps exist, congratulate the user or simulate minor refinement paths
      return [
        { title: 'Global Benchmarking', gap: -3, gapText: '-3%', action: 'Strategic Growth' },
        { title: 'Advanced Scalability', gap: -2, gapText: '-2%', action: 'Architecture Deck' }
      ];
    }

    if (gapsList.length < 2) {
      gapsList.push({ title: 'Communication Depth', gap: -8, gapText: '-8%', action: 'Mentor Sync' });
    }

    return gapsList.slice(0, 2);
  }, [radarData]);

  // Dynamic Skill Audit matching top results from the CV analyzer or falling back gracefully
  const dynamicSkillAudit = useMemo(() => {
    const rawSkills = profile?.skills || [];
    if (!profile?.profileAnalyzed || rawSkills.length === 0) {
      return [
        { name: 'React / Next.js', value: 88, color: getSkillColorClass(88), textColor: getSkillTextColorClass(88) },
        { name: 'TypeScript', value: 82, color: getSkillColorClass(82), textColor: getSkillTextColorClass(82) },
        { name: 'Node.js / Express', value: 68, color: getSkillColorClass(68), textColor: getSkillTextColorClass(68) },
        { name: 'PostgreSQL / SQL', value: 52, color: getSkillColorClass(52), textColor: getSkillTextColorClass(52) },
        { name: 'System Architecture', value: 35, color: getSkillColorClass(35), textColor: getSkillTextColorClass(35) },
      ];
    }

    return rawSkills.slice(0, 6).map((skill: any, idx: number) => {
      const val = getDeterministicSkillScore(skill, idx);
      return {
        name: typeof skill === 'string' ? skill : (skill?.name || 'Core Skill'),
        value: val,
        color: getSkillColorClass(val),
        textColor: getSkillTextColorClass(val)
      };
    });
  }, [profile]);

  // Real-time Trajectory Tracker Status logic
  // "if a graduate already connected with mentor then active the mentor"
  const trajectorySteps = useMemo(() => {
    const isProfileAnalyzed = profile?.profileAnalyzed || false;
    const hasAuditCompleted = (profile?.skills && profile.skills.length > 0) || isProfileAnalyzed;
    const isEndorsed = profile?.isEndorsed || (endorsements.length > 0);
    
    return [
      { id: 'profile', label: 'Resume Built', status: isProfileAnalyzed ? 'completed' : 'current' },
      { id: 'skills', label: 'Skill Audit', status: hasAuditCompleted ? 'completed' : (isProfileAnalyzed ? 'current' : 'pending') },
      { id: 'mentor', label: 'Mentor Connected', status: hasMentor ? 'completed' : (hasAuditCompleted ? 'current' : 'pending') },
      { id: 'endorsement', label: 'Mentorship Completed', status: isEndorsed ? 'completed' : (hasMentor ? 'current' : 'pending') },
      { id: 'apply', label: 'Career Active', status: isEndorsed ? 'current' : 'pending' },
    ];
  }, [profile, hasMentor, endorsements]);

  // Dynamic Today's 3 Moves
  const todayMoves = useMemo(() => {
    if (!profile?.profileAnalyzed) {
      return [];
    }
    const isEndorsed = profile?.isEndorsed || (endorsements.length > 0);
    const moves = [];
    
    if (isEndorsed) {
      moves.push({
        id: 1,
        title: `Review Endorsement Letter`,
        desc: `Read your verified mentorship letter signed by ${profile?.endorsementMentorName || 'your mentor'}.`,
        icon: Award,
        type: 'endorsement',
        actionView: 'endorsement'
      });
      moves.push({
        id: 2,
        title: `Apply to Advanced Placement Roles`,
        desc: `With a validated readiness score of ${profile?.readinessScore || 85}%, submit directly to preferred open roles.`,
        icon: Rocket,
        type: 'action',
        actionView: 'jobs'
      });
      moves.push({
        id: 3,
        title: `Audit Certified Cockpit Competencies`,
        desc: `Review the new skills officially verified on your radar chart.`,
        icon: Target,
        type: 'skill',
        actionView: 'skill-audit'
      });
      return moves;
    }

    // Move 1: Active apply suggestion based on Gemini recommendation or defaults
    if (profile?.recommendations?.jobs && profile.recommendations.jobs.length > 0) {
      const topJob = profile.recommendations.jobs[0];
      moves.push({
        id: 1,
        title: `Apply to ${topJob.title} @ ${topJob.company}`,
        desc: `Your AI Match score matches perfect at ${topJob.matchScore || 92}%!`,
        icon: Rocket,
        type: 'action',
        actionView: 'jobs'
      });
    } else {
      moves.push({
        id: 1,
        title: `Apply to Junior ${preferredRole} @ Microsoft`,
        desc: 'Based on your simulated trajectory check. Target matches at 94%.',
        icon: Rocket,
        type: 'action',
        actionView: 'jobs'
      });
    }

    // Move 2: Mentor Connect active state
    if (hasMentor) {
      moves.push({
        id: 2,
        title: 'Draft Sprint Sync with Mentor',
        desc: `You are synchronized with ${activeConnectionsCount} mentors. Connect in space.`,
        icon: MessageSquare,
        type: 'mentor',
        actionView: 'chat'
      });
    } else if (profile?.recommendations?.mentors && profile.recommendations.mentors.length > 0) {
      const topMentor = profile.recommendations.mentors[0];
      moves.push({
        id: 2,
        title: `Connect with Mentor: ${topMentor.name}`,
        desc: `${topMentor.rationale.substring(0, 60)}...`,
        icon: MessageSquare,
        type: 'mentor',
        actionView: 'mentors'
      });
    } else {
      moves.push({
        id: 2,
        title: 'Activate Mentor Connection',
        desc: 'Explore available domain specialists in your chosen career segment.',
        icon: MessageSquare,
        type: 'mentor',
        actionView: 'mentors'
      });
    }

    // Move 3: Skill gap complete
    const lowestSkill = profile?.skills?.length > 0
      ? [...profile.skills].sort((a: any, b: any) => (a.score || 0) - (b.score || 0))[0]
      : null;
      
    if (lowestSkill) {
      moves.push({
        id: 3,
        title: `Improve Core Skill: ${lowestSkill.name}`,
        desc: `Scored at ${lowestSkill.score}%: ${lowestSkill.reason || 'Gap detected.'}`,
        icon: Target,
        type: 'skill',
        actionView: 'skill-audit'
      });
    } else {
      moves.push({
        id: 3,
        title: `Target system gaps in ${preferredRole}`,
        desc: 'Complete fundamental modules to align your technical design depth.',
        icon: Target,
        type: 'skill',
        actionView: 'skill-audit'
      });
    }

    return moves;
  }, [profile, preferredRole, hasMentor, activeConnectionsCount]);

  // Dynamic Weekly Momentum Active learning Streak
  const momentumStreak = useMemo(() => {
    if (profile?.skills?.length > 0) {
      // Calculate a fun realistic active streak based on their profile improvements
      return Math.min(14, 5 + (profile.skills.length % 5) + (activeConnectionsCount * 2));
    }
    return 7;
  }, [profile, activeConnectionsCount]);

  return (
    <div className="w-full space-y-6 bg-bg-primary min-h-screen">
      {/* Fallback Warning Overlay if CV is not analyzed yet */}
      {!profile?.profileAnalyzed && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent-coral/10 border border-accent-coral/20 rounded-2xl p-5 flex items-start gap-4 shadow-sm"
        >
          <div className="p-2 bg-accent-coral-light rounded-xl text-accent-coral shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-text-primary">Interactive Simulation Mode Activated</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              We are showing general mock benchmarks for <span className="font-bold text-primary">{preferredRole}</span>. 
              Upload your CV or build your resume using our AI Builder to calibrate real-time precision telemetry directly to your profile attributes.
            </p>
          </div>
        </motion.div>
      )}

      {/* Figma Hero Banner Card (Marked Design) */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[16px] bg-[#0B1533] border border-[#E4EAF4]/10 p-6 sm:p-7 text-white shadow-sm"
      >
        {/* Soft cyan radial glow in top-right */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-[#00D4FF]/20 blur-3xl" />
        <div className="pointer-events-none absolute right-12 bottom-0 h-40 w-40 rounded-full bg-[#2563EB]/10 blur-2xl" />

        <div className="relative z-10 space-y-5">
          {/* Top greeting and user information */}
          <div className="space-y-1">
            <p className="text-[13px] uppercase font-medium text-[#8A99B5] tracking-wider">
              {timeGreeting},
            </p>
            <h1 className="text-[32px] sm:text-[36px] font-semibold text-white tracking-tight leading-none">
              {profile?.displayName || 'Alex Johnson'}
            </h1>
            <p className="text-[14px] font-medium text-[#5A6B8C] pt-1 flex flex-wrap items-center gap-1.5">
              <span>{profile?.department || profile?.fieldOfStudy || profile?.major || 'Computer Science'}</span>
              <span>·</span>
              <span>{profile?.university || profile?.institution || profile?.school || 'University of Michigan'}</span>
            </p>
          </div>

          {/* Three Stat Tiles Horizontal Strip with Hairline Dividers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/10 pt-4 mt-2 border-t border-white/10 max-w-xl">
            {/* Profile Complete */}
            <div className="py-2 sm:py-0 sm:px-4 first:pl-0 flex flex-col justify-center">
              <span className="text-[30px] font-semibold tabular-nums text-[#00D4FF] leading-none">
                {profileCompletionScore}%
              </span>
              <span className="text-[12px] uppercase tracking-wider font-medium text-[#8A99B5] mt-1">
                Profile Complete
              </span>
            </div>

            {/* Jobs Matched (80%+ Skill Sync) */}
            <div 
              onClick={() => setView('jobs')}
              className="py-2 sm:py-0 sm:px-4 flex flex-col justify-center cursor-pointer group"
              title="Click to view matched jobs"
            >
              <span className="text-[30px] font-semibold tabular-nums text-[#00D4FF] leading-none group-hover:scale-105 transition-transform">
                {matchedJobsCount}
              </span>
              <span className="text-[12px] uppercase tracking-wider font-medium text-[#8A99B5] mt-1">
                {matchedJobsCount === 1 ? 'Job Matched' : 'Jobs Matched'}
              </span>
            </div>

            {/* Real-time Interviews Status */}
            <div 
              onClick={() => setView('my-applications')}
              className="py-2 sm:py-0 sm:px-4 flex flex-col justify-center cursor-pointer group"
              title="Click to view your scheduled interviews and application updates"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[30px] font-semibold tabular-nums text-[#00D4FF] leading-none group-hover:scale-105 transition-transform">
                  {scheduledInterviewsCount}
                </span>
                {scheduledInterviewsCount > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <span className="text-[12px] uppercase tracking-wider font-medium text-[#8A99B5] mt-1 group-hover:text-[#00D4FF] transition-colors flex items-center gap-1">
                {scheduledInterviewsCount === 1 ? 'Interview' : 'Interviews'}
                {scheduledInterviewsCount > 0 && (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">Live</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mentorship Endorsement or Disciplinary Warning Badge */}
      {endorsements.length > 0 && (() => {
        const warningEndorsement = endorsements.find(e => e.isNegative || e.type === 'disciplinary_warning');
        const positiveEndorsement = endorsements.find(e => !e.isNegative && e.type !== 'disciplinary_warning');

        if (warningEndorsement) {
          return (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-red-50/80 border-2 border-red-300 rounded-[16px] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm mb-6 mt-4 relative overflow-hidden text-left"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="p-3.5 bg-red-100 text-red-600 rounded-2xl shrink-0 border border-red-200">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-red-200 text-red-800 tracking-wider">
                      ⚠️ CareerBridge Disciplinary Notice
                    </span>
                    <span className="text-[11px] font-semibold text-red-700">Formal Warning</span>
                  </div>
                  <h3 className="text-[16px] font-extrabold text-red-900 mt-1">
                    Mentorship Terminated & Formal Disciplinary Notice Issued
                  </h3>
                  <p className="text-[13px] text-red-800 mt-0.5 max-w-2xl leading-relaxed">
                    Issued by <strong>CareerBridge Academic & Disciplinary Integrity Board</strong> following grievance filed by mentor <span className="font-bold">{warningEndorsement.mentorName}</span>. Your profile is flagged under formal system review due to {warningEndorsement.complaintCategory || 'non-attendance/inattentiveness'}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEndorsementLetter(warningEndorsement)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/20 shrink-0 cursor-pointer flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>View Disciplinary Notice</span>
              </button>
            </motion.div>
          );
        }

        if (positiveEndorsement) {
          return (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-white border border-[#E4EAF4] rounded-[16px] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm mb-6 mt-4 relative overflow-hidden"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="p-3 bg-[#EEF3FF] text-[#1B2A8F] rounded-xl shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-[16px] font-semibold text-[#0B1533]">Mentorship Milestone Certified</h3>
                  <p className="text-[13px] text-[#5A6B8C] mt-0.5">
                    Successfully completed the mentorship protocol under the guidance of <span className="font-semibold text-[#1B2A8F]">{positiveEndorsement.mentorName}</span>.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(positiveEndorsement.skillsTaught || []).map((s: string, idx: number) => (
                      <span key={idx} className="badge-pill badge-blue">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEndorsementLetter(positiveEndorsement)}
                className="btn-primary shrink-0 cursor-pointer flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>View Endorsement Letter</span>
              </button>
            </motion.div>
          );
        }

        return null;
      })()}

      {/* Intelligence Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Career Readiness */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="card-surface flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start gap-2 mb-2">
              <div>
                <p className="eyebrow mb-1">Career Readiness</p>
                <h2 className="text-[32px] font-semibold tabular-nums text-[#0B1533] tracking-tight">
                  {profile?.profileAnalyzed ? (profile?.readinessScore || profile?.meanSkillScore || 0) : 0}%
                </h2>
              </div>
              <div className="badge-pill badge-cyan shrink-0">
                <ArrowUpRight className="w-3 h-3 text-[#00B8DE]" />
                <span>{profile?.profileAnalyzed ? 'Calibrated' : 'Simulation'}</span>
              </div>
            </div>
            <div className="h-14 w-full -mx-1 my-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[12px] text-[#8A99B5] font-medium pt-2 border-t border-[#E4EAF4]">
            {profile?.profileAnalyzed ? 'Averages calculated from verified CV parsed nodes' : 'Baseline matching score projection'}
          </p>
        </motion.div>

        {/* Mentor Activity */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="card-surface flex flex-col justify-between"
        >
          <div>
            <p className="eyebrow mb-3">Mentor Presence</p>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center -space-x-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="relative group/avatar">
                    <img 
                      src={`https://i.pravatar.cc/100?img=${i + 14}`} 
                      alt="Mentor" 
                      className="w-9 h-9 rounded-full border-2 border-white shadow-2xs"
                    />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#16A34A] rounded-full border-2 border-white" />
                  </div>
                ))}
              </div>
              <div className="text-right">
                <span className="text-[12px] font-semibold text-[#16A34A] block">
                  {hasMentor ? '● Active Mentor' : '● Expedited Search'}
                </span>
                <span className="text-[11px] font-medium text-[#8A99B5]">
                  {activeConnectionsCount} Connected
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setView('mentors')}
            className="btn-secondary w-full"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{hasMentor ? 'Chat in Mentorship Space' : 'Sync with Specialist'}</span>
          </button>
        </motion.div>

        {/* Tell Us What New Skill You Learned Card */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="card-surface flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="eyebrow">Monthly Growth</p>
              <span className="badge-pill badge-blue">
                <Sparkles className="w-3 h-3" /> Auto CV Sync
              </span>
            </div>

            <div className="flex items-start gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#EEF3FF] text-[#1B2A8F] flex items-center justify-center shrink-0">
                <BrainCircuit className="w-5 h-5 text-[#1B2A8F]" />
              </div>
              <div className="text-left">
                <h3 className="text-[14px] font-semibold text-[#0B1533] leading-snug">
                  Learned a new skill this month?
                </h3>
                <p className="text-[12px] text-[#5A6B8C] mt-0.5 leading-relaxed">
                  Tell us your new skill & related project to auto-update your CV & readiness score.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAddSkillModal(true)}
            className="btn-primary w-full mt-4"
          >
            <Plus className="w-4 h-4" />
            <span>Add Skill & Update CV</span>
          </button>
        </motion.div>
      </div>

      {/* Dynamic Competency Cockpit Engine */}
      {!hasSubmittedCV ? (
        <CockpitEmptyState 
          displayName={profile?.displayName}
          targetRole={preferredRole}
          department={profile?.department || profile?.fieldOfStudy}
          university={profile?.university}
          setView={setView}
          onOpenRoleModal={() => setIsEditingRole(true)}
        />
      ) : (
        <CompetencyCockpit 
          profile={profile}
          jobsList={jobsList}
          setView={setView}
          onOpenAddSkillModal={(suggestedSkill) => {
            if (suggestedSkill) {
              setNewSkillName(suggestedSkill);
            }
            setShowAddSkillModal(true);
          }}
          onUpdateTargetRole={handleUpdateRole}
        />
      )}

      {/* Row 2: Horizontal Trajectory Tracker */}
      <div className="w-full bg-white border border-[#E4EAF4] rounded-[16px] p-6 shadow-sm relative overflow-hidden group">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-[20px] font-semibold text-[#0B1533]">Trajectory Path</h3>
            <p className="text-[12px] font-medium text-[#8A99B5] mt-0.5">Real-time status synchronicity</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-[#F4F7FC] rounded-full border border-[#E4EAF4]">
            <Clock className="w-3.5 h-3.5 text-[#8A99B5]" />
            <span className="text-[11px] font-medium text-[#5A6B8C]">
              {hasMentor ? 'Active connection running' : 'Sync monitor online'}
            </span>
          </div>
        </header>

        <div className="relative">
          {/* Progress Line Background */}
          <div className="absolute top-4 left-8 right-8 h-0.5 bg-[#E4EAF4] -z-0" />
          
          <div className="flex justify-between items-start relative z-10 overflow-x-auto min-w-[600px] pb-2">
            {trajectorySteps.map((step, i) => (
              <div key={step.id} className="flex flex-col items-center gap-3 group/step w-28 shrink-0">
                <div className="relative">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      step.status === 'completed' 
                        ? 'bg-gradient-brand text-white shadow-xs' : 
                      step.status === 'current' 
                        ? 'bg-white border-2 border-[#2563EB] text-[#2563EB] ring-4 ring-[#00D4FF]/20 shadow-[0_0_12px_rgba(0,184,222,0.3)]' : 
                        'bg-[#E4EAF4] text-[#8A99B5] font-medium text-[12px]'
                    }`}
                  >
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-[12px] font-semibold">
                        {i + 1}
                      </span>
                    )}
                  </motion.div>
                </div>
                <div className="text-center">
                  <p className={`text-[13px] font-medium sentence-case ${
                    step.status === 'completed' ? 'text-[#0B1533]' : 
                    step.status === 'current' ? 'text-[#2563EB] font-semibold' : 'text-[#8A99B5]'
                  }`}>
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Moves & Industry Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {/* Today's 3 Moves */}
        <section className="bg-white border border-[#E4EAF4] rounded-[16px] p-6 shadow-sm space-y-5">
          <header className="flex justify-between items-center text-left">
            <h3 className="font-semibold text-[#0B1533] text-[20px]">Today's 3 Moves</h3>
          </header>
          <div className="space-y-3">
            {todayMoves.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center h-full min-h-[160px] bg-[#F4F7FC] border border-dashed border-[#E4EAF4] rounded-2xl">
                <Target className="w-8 h-8 text-[#8A99B5] opacity-40 mb-2" />
                <p className="text-[13px] font-semibold text-[#0B1533]">No moves queued</p>
                <p className="text-[12px] text-[#5A6B8C] mt-1 leading-relaxed">Please calibrate with a CV or resume build to fetch daily personalized suggestions.</p>
              </div>
            ) : (
              todayMoves.map((move) => (
                <button
                  key={move.id}
                  onClick={() => {
                    if (move.actionView === 'endorsement') {
                      setSelectedEndorsementLetter(endorsements[0] || {
                        mentorName: profile?.endorsementMentorName || 'Your Mentor',
                        letterText: `Successfully completed mentorship by ${profile?.endorsementMentorName || 'your mentor'}.`
                      });
                    } else {
                      setView(move.actionView);
                    }
                  }}
                  className="w-full p-4 rounded-[12px] bg-[#F4F7FC] border border-[#E4EAF4] hover:bg-[#EEF3FF] transition-all duration-150 text-left flex items-start gap-3.5 shadow-2xs cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-white border border-[#E4EAF4] flex items-center justify-center shrink-0 text-[#1B2A8F]">
                    <move.icon className="w-4 h-4 stroke-[1.75]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#0B1533] mb-0.5">{move.title}</p>
                    <p className="text-[12px] text-[#5A6B8C] leading-relaxed font-normal">{move.desc}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Industry Pulse */}
        <section className="bg-[#0B1533] border border-white/10 rounded-[16px] p-6 shadow-sm space-y-6 relative overflow-hidden flex flex-col justify-between text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D4FF]/10 blur-2xl rounded-full -mr-16 -mt-16 pointer-events-none" />
          
          <div className="space-y-5">
            <header className="flex justify-between items-center relative z-10 text-left">
              <h3 className="font-semibold text-white flex items-center gap-2 text-[20px]">
                <TrendingUp className="w-5 h-5 text-[#00D4FF]" />
                Industry Pulse
              </h3>
              <span className="badge-pill badge-cyan">Realtime</span>
            </header>

            {/* Target Role Selector */}
            <div className="relative z-10 p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-2 text-left">
              <span className="text-[11px] font-medium text-[#8A99B5] uppercase tracking-wider block">Targeted Path:</span>
              {isEditingRole ? (
                <div className="flex gap-2">
                  <select 
                    value={selectedRoleOption}
                    onChange={(e) => setSelectedRoleOption(e.target.value)}
                    className="flex-1 bg-[#0B1533] text-[13px] font-medium text-white border border-white/20 rounded-lg p-2 outline-none focus:border-[#00B8DE]"
                  >
                    {Object.keys(CAREER_PATHS).filter(k => k !== 'Default').map(pathKey => (
                      <option key={pathKey} value={pathKey}>{pathKey}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => handleUpdateRole(selectedRoleOption)}
                    className="p-2 bg-[#2563EB] rounded-lg text-white hover:bg-[#1B2A8F] active:scale-95 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-white">{preferredRole}</span>
                  <button 
                    onClick={() => setIsEditingRole(true)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2.5 relative z-10 text-left">
              <p className="text-[12px] font-medium text-[#8A99B5]">
                Trending skills in {activePathData.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {!profile?.profileAnalyzed ? (
                  <div className="text-[12px] text-white/50 italic py-1">No active trends computed. Awaiting CV upload.</div>
                ) : (
                  activePathData.trendingSkills.map(skill => (
                    <span key={skill} className="px-3 py-1 bg-white/10 border border-white/10 rounded-full text-[12px] font-medium text-white/90 hover:bg-white/20 transition-all cursor-default">
                      {skill}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 relative z-10 mt-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-[#00D4FF] shrink-0">
                <Trophy className="w-5 h-5 text-[#00D4FF]" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-white">Market Benchmarking</p>
                <p className="text-[11px] text-white/70 font-normal leading-relaxed mt-0.5">
                  {profile?.profileAnalyzed 
                    ? activePathData.benchmarkDescription.replace('{percent}', String(activePathData.marketBenchmarkPercent))
                    : 'Upload and analyze your CV to see your benchmark percentile match.'
                  }
                </p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${profile?.profileAnalyzed ? activePathData.marketBenchmarkPercent : 0}%` }}
                className="h-full bg-gradient-brand"
              />
            </div>
          </div>
        </section>
      </div>

      {/* STUDENT ENDORSEMENT LETTER DETAIL MODAL */}
      <AnimatePresence>
        {selectedEndorsementLetter && (
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
              className="bg-card border border-border w-full max-w-xl rounded-3xl shadow-2xl p-8 relative flex flex-col max-h-[90vh] overflow-y-auto text-left"
            >
              <button
                onClick={() => setSelectedEndorsementLetter(null)}
                className="absolute top-5 right-5 text-text-muted hover:text-text-primary p-2 rounded-full hover:bg-bg-secondary transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 border-b border-border pb-5 mb-6">
                <div className={`p-3 rounded-2xl ${selectedEndorsementLetter.isNegative ? 'bg-red-500/10 text-red-600' : 'bg-primary/10 text-primary'}`}>
                  {selectedEndorsementLetter.isNegative ? <ShieldAlert className="w-7 h-7" /> : <Award className="w-7 h-7" />}
                </div>
                <div className="text-left">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${selectedEndorsementLetter.isNegative ? 'bg-red-500/15 text-red-600 border border-red-500/30' : 'bg-primary/10 text-primary'}`}>
                    {selectedEndorsementLetter.isNegative ? 'CareerBridge Academic & Disciplinary Integrity Board' : 'Official Accreditation'}
                  </span>
                  <h3 className="text-xl font-extrabold text-text-primary mt-1">
                    {selectedEndorsementLetter.isNegative ? 'Official System Disciplinary Notice' : 'Verified Endorsement Letter'}
                  </h3>
                  {selectedEndorsementLetter.isNegative && (
                    <p className="text-xs text-text-muted mt-0.5">
                      Case Reference: <span className="font-mono font-bold text-text-primary">{selectedEndorsementLetter.caseReference || 'CB-WARN-REF'}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className={`border rounded-2xl p-6 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-[45vh] shadow-inner text-left ${selectedEndorsementLetter.isNegative ? 'bg-[#0F172A] text-red-300 border-red-500/30' : 'bg-bg-secondary/60 text-text-primary border-border/80'}`}>
                {selectedEndorsementLetter.letterText}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-border mt-6 text-left">
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Standing / Status</p>
                  {selectedEndorsementLetter.isNegative ? (
                    <p className="text-xs font-extrabold text-red-600 flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-pulse" />
                      Profile Flagged — Under Disciplinary Warning (Risk of Suspension)
                    </p>
                  ) : (
                    <p className="text-xs font-extrabold text-success flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-success inline-block animate-pulse" />
                      Successfully Endorsed & Certified
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const blob = new Blob([selectedEndorsementLetter.letterText], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = selectedEndorsementLetter.isNegative 
                        ? `CareerBridge_Disciplinary_Notice_${(selectedEndorsementLetter.caseReference || 'WARN')}.txt`
                        : `Mentorship_Endorsement_${(selectedEndorsementLetter.mentorName || '').replace(/\s+/g, '_')}.txt`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-5 py-2 bg-bg-secondary hover:bg-bg-tertiary border border-border text-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> {selectedEndorsementLetter.isNegative ? 'Download Notice (.txt)' : 'Download Letter (.txt)'}
                  </button>
                  <button
                    onClick={() => setSelectedEndorsementLetter(null)}
                    className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedEndorsementLetter.isNegative ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-hover'}`}
                  >
                    {selectedEndorsementLetter.isNegative ? 'Acknowledge Notice' : 'Done'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UNIFIED NEW SKILL & RELATED PROJECT FORM MODAL */}
      <AddSkillModal 
        isOpen={showAddSkillModal} 
        onClose={() => setShowAddSkillModal(false)} 
      />

    </div>
  );
}
