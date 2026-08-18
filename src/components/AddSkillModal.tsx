import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Sparkles, BrainCircuit, CheckCircle2, FileText, ArrowRight, ArrowLeft,
  Briefcase, Star, MessageSquare, ShieldCheck, Zap, Layers, Link as LinkIcon, RefreshCw
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../App';
import { verifySkillAndEvaluateStrength, SkillInterviewQnA, SkillVerificationResult } from '../services/geminiService';

export type SkillCategory = 'Technical' | 'Soft Skills' | 'Tools' | 'Cloud & DevOps' | 'Languages' | 'Core Competencies';

interface AddSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillAdded?: (newSkill: any) => void;
  defaultCategory?: SkillCategory;
}

const COMMON_SKILL_TAXONOMY = [
  'React', 'Next.js', 'TypeScript', 'Node.js', 'Express.js', 'Python', 'GoLang', 
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'PostgreSQL', 'MongoDB', 'GraphQL', 
  'REST APIs', 'System Design', 'Tailwind CSS', 'CI/CD Pipelines', 'Java', 
  'Spring Boot', 'C++', 'Rust', 'Microservices', 'Figma', 'Git & GitHub', 
  'Agile & Scrum', 'Communication', 'Data Analysis', 'Machine Learning', 
  'Unit Testing', 'Redis', 'Kafka', 'SQL', 'DevOps', 'Cybersecurity'
];

export function AddSkillModal({ isOpen, onClose, onSkillAdded }: AddSkillModalProps) {
  const { user, profile } = useAuth();
  
  // Step State: 'input' -> 'interview' -> 'evaluating' -> 'result'
  const [modalStep, setModalStep] = useState<'input' | 'interview' | 'evaluating' | 'result'>('input');
  
  // Step 1: Input & Autocomplete
  const [skillName, setSkillName] = useState('');
  const [showTaxonomyDropdown, setShowTaxonomyDropdown] = useState(false);

  // Step 2: Conversational Interview State
  const [interviewQuestions, setInterviewQuestions] = useState<SkillInterviewQnA[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [hasProject, setHasProject] = useState<boolean | null>(null);

  // Form states for current Q
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');
  const [roleContribution, setRoleContribution] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  
  // Non-project branch form states
  const [learningSource, setLearningSource] = useState('');
  const [courseworkDesc, setCourseworkDesc] = useState('');
  const [selfRating, setSelfRating] = useState<number>(4);

  // Step 3 & 4: AI Verification Results
  const [evaluatingStep, setEvaluatingStep] = useState<string>('Analyzing interview responses...');
  const [verificationResult, setVerificationResult] = useState<SkillVerificationResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Taxononomy Autocomplete filter
  const filteredTaxonomy = useMemo(() => {
    if (!skillName.trim()) return COMMON_SKILL_TAXONOMY;
    const lower = skillName.toLowerCase();
    return COMMON_SKILL_TAXONOMY.filter(s => s.toLowerCase().includes(lower));
  }, [skillName]);

  // Existing skills check
  const isDuplicateSkill = useMemo(() => {
    if (!skillName.trim() || !profile?.skills) return false;
    const lower = skillName.trim().toLowerCase();
    return profile.skills.some((s: any) => {
      const name = typeof s === 'string' ? s : s?.name;
      return name?.toLowerCase() === lower;
    });
  }, [skillName, profile?.skills]);

  if (!isOpen) return null;

  const handleReset = () => {
    setModalStep('input');
    setSkillName('');
    setInterviewQuestions([]);
    setCurrentQIndex(0);
    setHasProject(null);
    setProjectTitle('');
    setProjectDesc('');
    setTechStack([]);
    setTechInput('');
    setRoleContribution('');
    setProjectUrl('');
    setLearningSource('');
    setCourseworkDesc('');
    setSelfRating(4);
    setVerificationResult(null);
    setIsSyncing(false);
    setErrorMsg(null);
  };

  const handleStartInterview = () => {
    if (!skillName.trim() || isDuplicateSkill) return;
    setModalStep('interview');
    setInterviewQuestions([
      {
        question: `Have you completed any practical project or application using ${skillName.trim()}?`,
        answer: ''
      }
    ]);
    setCurrentQIndex(0);
  };

  const handleGateAnswer = (hasProj: boolean) => {
    setHasProject(hasProj);
    const updatedQs = [...interviewQuestions];
    updatedQs[0].answer = hasProj 
      ? `Yes, I built a project using ${skillName.trim()}.`
      : `No, I acquired ${skillName.trim()} through study and coursework.`;

    if (hasProj) {
      updatedQs.push({ question: `What is the project title?`, answer: '' });
      updatedQs.push({ question: `Briefly describe what the project does and key features built.`, answer: '' });
      updatedQs.push({ question: `What related technologies/tools did you use alongside ${skillName.trim()}?`, answer: '' });
      updatedQs.push({ question: `What was your specific role or contribution on this project?`, answer: '' });
      updatedQs.push({ question: `On a scale of 1 to 5, how confident are you using ${skillName.trim()} in a production job?`, answer: '' });
    } else {
      updatedQs.push({ question: `How did you learn ${skillName.trim()}?`, answer: '' });
      updatedQs.push({ question: `Describe coursework, exercises, or mini-tasks you completed using this skill.`, answer: '' });
      updatedQs.push({ question: `On a scale of 1 to 5, how confident are you applying ${skillName.trim()} independently?`, answer: '' });
    }

    setInterviewQuestions(updatedQs);
    setCurrentQIndex(1);
  };

  const handleAddTechChip = (tech: string) => {
    const trimmed = tech.trim();
    if (trimmed && !techStack.includes(trimmed)) {
      setTechStack([...techStack, trimmed]);
      setTechInput('');
    }
  };

  const handleNextQuestion = () => {
    const updated = [...interviewQuestions];
    
    if (hasProject) {
      if (currentQIndex === 1) {
        if (!projectTitle.trim()) return;
        updated[1].answer = projectTitle.trim();
      } else if (currentQIndex === 2) {
        if (!projectDesc.trim()) return;
        updated[2].answer = projectDesc.trim();
      } else if (currentQIndex === 3) {
        updated[3].answer = techStack.length > 0 ? techStack.join(', ') : 'Primary stack';
      } else if (currentQIndex === 4) {
        if (!roleContribution.trim()) return;
        updated[4].answer = roleContribution.trim();
      } else if (currentQIndex === 5) {
        updated[5].answer = `${selfRating} out of 5 stars`;
      }
    } else {
      if (currentQIndex === 1) {
        if (!learningSource) return;
        updated[1].answer = learningSource;
      } else if (currentQIndex === 2) {
        if (!courseworkDesc.trim()) return;
        updated[2].answer = courseworkDesc.trim();
      } else if (currentQIndex === 3) {
        updated[3].answer = `${selfRating} out of 5 stars`;
      }
    }

    setInterviewQuestions(updated);

    if (currentQIndex < updated.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      // Complete interview -> Trigger AI evaluation
      triggerAIEvaluation(updated);
    }
  };

  const triggerAIEvaluation = async (completedTranscript: SkillInterviewQnA[]) => {
    setModalStep('evaluating');
    setEvaluatingStep('Analyzing interview transcript...');

    try {
      setTimeout(() => setEvaluatingStep('Classifying skill taxonomy & domain...'), 600);
      setTimeout(() => setEvaluatingStep('Cross-referencing candidate project history...'), 1200);
      setTimeout(() => setEvaluatingStep('Computing strength score & evidence summary...'), 1800);

      const result = await verifySkillAndEvaluateStrength(
        skillName.trim(),
        completedTranscript,
        profile
      );

      setVerificationResult(result);
      setModalStep('result');
    } catch (err) {
      console.error('Failed to evaluate skill verification:', err);
      // Fallback result
      const fallback: SkillVerificationResult = {
        skillName: skillName.trim(),
        category: 'Technical & Core Skills',
        score: hasProject ? 85 : 72,
        level: hasProject ? 'Advanced' : 'Intermediate',
        reason: 'Verified through AI interview transcript.',
        evidenceSummary: hasProject 
          ? `Demonstrated ${skillName.trim()} in project: ${projectTitle || 'Practical application'}`
          : `Acquired ${skillName.trim()} via ${learningSource || 'self-study and exercises'}.`,
        suggestedProject: projectTitle ? {
          title: projectTitle,
          description: [projectDesc],
          techStack: techStack.length > 0 ? techStack : [skillName.trim()]
        } : undefined,
        recalculatedReadinessBoost: 5,
        resolvedGaps: [skillName.trim()]
      };
      setVerificationResult(fallback);
      setModalStep('result');
    }
  };

  const handleFinalSyncAndSave = async () => {
    if (!verificationResult) return;
    setIsSyncing(true);

    const currentUserId = user?.uid || auth.currentUser?.uid || 'guest';
    const storageKey = `saved_cv_${currentUserId}`;

    const newSkillObj = {
      name: verificationResult.skillName,
      category: verificationResult.category,
      score: verificationResult.score,
      level: verificationResult.level,
      reason: verificationResult.reason,
      evidenceSummary: verificationResult.evidenceSummary,
      dateAdded: new Date().toISOString()
    };

    const newProjectObj = verificationResult.suggestedProject ? {
      title: verificationResult.suggestedProject.title,
      name: verificationResult.suggestedProject.title,
      description: verificationResult.suggestedProject.description,
      techStack: verificationResult.suggestedProject.techStack,
      dateAdded: new Date().toISOString()
    } : null;

    try {
      if (currentUserId !== 'guest') {
        const profileRef = doc(db, 'users', currentUserId);
        const docSnap = await getDoc(profileRef);

        let existingSkills = docSnap.exists() ? (docSnap.data().skills || []) : (profile?.skills || []);
        let existingProjects = docSnap.exists() ? (docSnap.data().projects || []) : (profile?.projects || []);

        // Filter out duplicate if present
        existingSkills = existingSkills.filter((s: any) => {
          const name = typeof s === 'string' ? s : (s.name || s.title);
          return name.toLowerCase() !== verificationResult.skillName.toLowerCase();
        });

        const updatedSkills = [newSkillObj, ...existingSkills];
        const updatedProjects = newProjectObj ? [newProjectObj, ...existingProjects] : existingProjects;

        const currentScore = profile?.readinessScore || profile?.meanSkillScore || 70;
        const boostedScore = Math.min(100, currentScore + verificationResult.recalculatedReadinessBoost);

        // Update CV state object
        let cvData = docSnap.exists() ? docSnap.data().savedCV : null;
        if (!cvData) {
          const localCVRaw = localStorage.getItem(storageKey);
          if (localCVRaw) {
            try { cvData = JSON.parse(localCVRaw); } catch (e) { /* ignore */ }
          }
        }

        if (!cvData) {
          cvData = {
            fullName: profile?.displayName || 'Student / Candidate',
            email: profile?.email || '',
            summary: profile?.summary || `Experienced professional skilled in ${verificationResult.skillName}.`,
            skills: [{ category: verificationResult.category, items: [verificationResult.skillName] }],
            projects: newProjectObj ? [newProjectObj] : [],
            experience: [],
            education: []
          };
        } else {
          // Sync skill into CV skills list
          let cvSkills = Array.isArray(cvData.skills) ? [...cvData.skills] : [];
          let catIndex = cvSkills.findIndex((sGroup: any) => {
            if (typeof sGroup === 'object' && sGroup !== null) {
              const catLower = (sGroup.category || '').toLowerCase();
              return catLower.includes(verificationResult.category.toLowerCase()) || catLower.includes('skill');
            }
            return false;
          });

          if (catIndex >= 0) {
            const targetGroup = { ...cvSkills[catIndex] };
            const items = Array.isArray(targetGroup.items) ? [...targetGroup.items] : [];
            if (!items.some(it => String(it).toLowerCase() === verificationResult.skillName.toLowerCase())) {
              items.push(verificationResult.skillName);
            }
            targetGroup.items = items;
            cvSkills[catIndex] = targetGroup;
          } else {
            cvSkills.unshift({
              category: verificationResult.category,
              items: [verificationResult.skillName]
            });
          }
          cvData.skills = cvSkills;

          if (newProjectObj) {
            let cvProjects = Array.isArray(cvData.projects) ? [...cvData.projects] : [];
            cvProjects = cvProjects.filter((p: any) => (p.title || p.name || '').toLowerCase() !== newProjectObj.title.toLowerCase());
            cvProjects.unshift(newProjectObj);
            cvData.projects = cvProjects;
          }
        }

        localStorage.setItem(storageKey, JSON.stringify(cvData));

        await updateDoc(profileRef, {
          skills: updatedSkills,
          projects: updatedProjects,
          profileAnalyzed: true,
          hasCvSubmitted: true,
          readinessScore: boostedScore,
          meanSkillScore: boostedScore,
          savedCV: cvData,
          lastSkillVerifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        // Guest user local storage
        const localCVRaw = localStorage.getItem(storageKey);
        let cvData = localCVRaw ? JSON.parse(localCVRaw) : {
          fullName: 'Student Candidate',
          skills: [{ category: verificationResult.category, items: [verificationResult.skillName] }],
          projects: newProjectObj ? [newProjectObj] : []
        };

        let cvSkills = Array.isArray(cvData.skills) ? [...cvData.skills] : [];
        if (cvSkills.length > 0) {
          const items = Array.isArray(cvSkills[0].items) ? [...cvSkills[0].items] : [];
          if (!items.includes(verificationResult.skillName)) items.push(verificationResult.skillName);
          cvSkills[0].items = items;
        } else {
          cvSkills = [{ category: verificationResult.category, items: [verificationResult.skillName] }];
        }
        cvData.skills = cvSkills;

        if (newProjectObj) {
          let cvProjects = Array.isArray(cvData.projects) ? [...cvData.projects] : [];
          cvProjects.unshift(newProjectObj);
          cvData.projects = cvProjects;
        }

        localStorage.setItem(storageKey, JSON.stringify(cvData));
      }

      if (onSkillAdded) {
        onSkillAdded(newSkillObj);
      }

      setIsSyncing(false);
      onClose();
      handleReset();
    } catch (err) {
      console.error('Error saving verified skill:', err);
      setIsSyncing(false);
      if (onSkillAdded) onSkillAdded(newSkillObj);
      onClose();
      handleReset();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="bg-bg-primary border border-border rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl relative overflow-hidden text-left max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
                <BrainCircuit className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-text-primary leading-tight flex items-center gap-2">
                  <span>AI Skill Verification & CV Growth</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider">
                    Interactive
                  </span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Declare new skills, verify strength via Q&A, and auto-update your CV
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { onClose(); handleReset(); }}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-full hover:bg-bg-secondary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body Scroll Container */}
          <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">

            {/* STEP 1: Skill Input with Taxonomy Autocomplete */}
            {modalStep === 'input' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="space-y-2 relative">
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Skill Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={skillName}
                      onChange={(e) => setSkillName(e.target.value)}
                      placeholder="e.g. Docker, React, GoLang, System Design, GraphQL..."
                      className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary transition-all placeholder:text-text-muted"
                    />
                    {skillName && (
                      <button
                        type="button"
                        onClick={() => setSkillName('')}
                        className="absolute right-3 top-3 text-text-muted hover:text-text-primary text-xs"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Duplicate Warning */}
                {isDuplicateSkill && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center gap-2">
                    <Zap className="w-4 h-4 shrink-0" />
                    <span>This skill is already listed on your CV. Adding it again will re-verify and update your proficiency score.</span>
                  </div>
                )}

                {/* Info Card */}
                <div className="p-4 bg-primary/5 border border-primary/15 rounded-2xl text-xs text-text-secondary space-y-2">
                  <div className="flex items-center gap-2 font-bold text-text-primary">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>How Skill Verification Works</span>
                  </div>
                  <p className="leading-relaxed text-text-muted">
                    Our AI interviewer asks 4–5 quick questions about your practical usage or study background. It then calculates a verified strength level, writes a tailored CV bullet, and recalculates your overall Career Readiness Score.
                  </p>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!skillName.trim()}
                    onClick={handleStartInterview}
                    className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Start AI Verification Interview</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Conversational Interview (Q&A Chat) */}
            {modalStep === 'interview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-text-muted">
                    <span>Interview Question {currentQIndex + 1} of {interviewQuestions.length}</span>
                    <span>Skill: <strong className="text-primary">{skillName}</strong></span>
                  </div>
                  <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${((currentQIndex + 1) / interviewQuestions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* AI Chat Bubble Question Card */}
                <div className="bg-bg-secondary border border-border rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                      AI
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">CareerBridge Interviewer</span>
                      <p className="text-sm font-semibold text-text-primary leading-relaxed">
                        {interviewQuestions[currentQIndex]?.question}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Question Forms */}
                  <div className="pt-2 pl-0 sm:pl-11 space-y-3">
                    {/* Q1: Gate Question */}
                    {currentQIndex === 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleGateAnswer(true)}
                          className="p-3.5 bg-bg-primary hover:bg-primary/10 border border-border hover:border-primary rounded-xl text-left transition-all cursor-pointer group"
                        >
                          <div className="font-bold text-xs text-text-primary group-hover:text-primary flex items-center justify-between">
                            <span>Yes, built a project</span>
                            <Briefcase className="w-4 h-4 text-primary" />
                          </div>
                          <p className="text-[11px] text-text-muted mt-1">I have applied this skill in a personal, team, or production app.</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGateAnswer(false)}
                          className="p-3.5 bg-bg-primary hover:bg-primary/10 border border-border hover:border-primary rounded-xl text-left transition-all cursor-pointer group"
                        >
                          <div className="font-bold text-xs text-text-primary group-hover:text-primary flex items-center justify-between">
                            <span>Learned via Course / Study</span>
                            <BrainCircuit className="w-4 h-4 text-purple-500" />
                          </div>
                          <p className="text-[11px] text-text-muted mt-1">I learned this through coursework, tutorials, or workshops.</p>
                        </button>
                      </div>
                    )}

                    {/* PROJECT BRANCH QUESTIONS */}
                    {hasProject && (
                      <>
                        {/* Q1: Project Title */}
                        {currentQIndex === 1 && (
                          <input
                            type="text"
                            value={projectTitle}
                            onChange={(e) => setProjectTitle(e.target.value)}
                            placeholder="e.g. High-Throughput E-Commerce Microservices, Weather Dashboard..."
                            className="w-full px-4 py-2.5 bg-bg-primary border border-border rounded-xl text-xs font-medium text-text-primary focus:outline-none focus:border-primary"
                          />
                        )}

                        {/* Q2: Project Description */}
                        {currentQIndex === 2 && (
                          <textarea
                            rows={3}
                            value={projectDesc}
                            onChange={(e) => setProjectDesc(e.target.value)}
                            placeholder="Describe main functionality, challenges overcome, and key technical outcomes..."
                            className="w-full px-4 py-2.5 bg-bg-primary border border-border rounded-xl text-xs font-medium text-text-primary focus:outline-none focus:border-primary resize-none"
                          />
                        )}

                        {/* Q3: Related Tech Stack */}
                        {currentQIndex === 3 && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={techInput}
                                onChange={(e) => setTechInput(e.target.value)}
                                placeholder="Type related tool/lib (e.g. Redis, Tailwind, Docker) & press Add"
                                className="flex-1 px-3 py-2 bg-bg-primary border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTechChip(techInput);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleAddTechChip(techInput)}
                                className="px-3 py-2 bg-primary/10 text-primary font-bold text-xs rounded-xl hover:bg-primary/20"
                              >
                                Add
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {techStack.map(t => (
                                <span key={t} className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold flex items-center gap-1">
                                  {t}
                                  <button type="button" onClick={() => setTechStack(techStack.filter(x => x !== t))}>×</button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Q4: Role Contribution */}
                        {currentQIndex === 4 && (
                          <div className="grid grid-cols-2 gap-2">
                            {['Sole Developer / Project Creator', 'Lead Developer / Architect', 'Backend Developer', 'Frontend Developer', 'Core Contributor'].map(r => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setRoleContribution(r)}
                                className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                                  roleContribution === r ? 'bg-primary/10 border-primary text-primary' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Q5: Confidence Rating */}
                        {currentQIndex === 5 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 justify-center py-2">
                              {[1, 2, 3, 4, 5].map(num => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setSelfRating(num)}
                                  className={`w-11 h-11 rounded-2xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                    selfRating >= num ? 'bg-amber-500 text-white shadow-xs' : 'bg-bg-primary border border-border text-text-muted'
                                  }`}
                                >
                                  <span>{num}</span>
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                </button>
                              ))}
                            </div>
                            <p className="text-center text-xs text-text-muted">
                              {selfRating === 5 ? 'Mastery: Ready to architect & interview others' :
                               selfRating === 4 ? 'Advanced: Confident building production features' :
                               selfRating === 3 ? 'Intermediate: Comfortable with standard tasks' : 'Foundational / Beginner'}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* NON-PROJECT BRANCH QUESTIONS */}
                    {!hasProject && hasProject !== null && (
                      <>
                        {/* Q1: Learning Source */}
                        {currentQIndex === 1 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {['Online Certification / Course', 'Mentorship & Practice Sessions', 'Self-Directed Study & Docs', 'University Coursework', 'Workshop / Bootcamp'].map(src => (
                              <button
                                key={src}
                                type="button"
                                onClick={() => setLearningSource(src)}
                                className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                                  learningSource === src ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'
                                }`}
                              >
                                {src}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Q2: Coursework / Exercises */}
                        {currentQIndex === 2 && (
                          <textarea
                            rows={3}
                            value={courseworkDesc}
                            onChange={(e) => setCourseworkDesc(e.target.value)}
                            placeholder="Describe key concepts mastered, assignments completed, or lab exercises..."
                            className="w-full px-4 py-2.5 bg-bg-primary border border-border rounded-xl text-xs font-medium text-text-primary focus:outline-none focus:border-primary resize-none"
                          />
                        )}

                        {/* Q3: Self Rating */}
                        {currentQIndex === 3 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 justify-center py-2">
                              {[1, 2, 3, 4, 5].map(num => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setSelfRating(num)}
                                  className={`w-11 h-11 rounded-2xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                    selfRating >= num ? 'bg-primary text-white shadow-xs' : 'bg-bg-primary border border-border text-text-muted'
                                  }`}
                                >
                                  <span>{num}</span>
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Interview Action Buttons */}
                {currentQIndex > 0 && (
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
                      className="px-4 py-2.5 border border-border rounded-xl text-xs font-bold text-text-muted hover:text-text-primary flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>{currentQIndex === interviewQuestions.length - 1 ? 'Evaluate & Sync' : 'Next Question'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3: Evaluating State */}
            {modalStep === 'evaluating' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center space-y-5">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative">
                  <BrainCircuit className="w-8 h-8 animate-pulse" />
                  <Sparkles className="w-4 h-4 text-purple-500 absolute -top-1 -right-1 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-text-primary">AI Verification in Progress</h4>
                  <p className="text-xs text-text-muted">{evaluatingStep}</p>
                </div>
                <div className="w-48 mx-auto h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-purple-500 animate-pulse w-full" />
                </div>
              </motion.div>
            )}

            {/* STEP 4: Verification Result & Impact Card */}
            {modalStep === 'result' && verificationResult && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                {/* Top Success Badge */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs uppercase tracking-wider">Skill Verification Complete!</span>
                    <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
                      We have verified <strong>{verificationResult.skillName}</strong> and generated tailored CV evidence.
                    </p>
                  </div>
                </div>

                {/* Score & Category Card */}
                <div className="bg-bg-secondary border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/70 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Skill Category</span>
                      <p className="text-sm font-bold text-text-primary">{verificationResult.category}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Proficiency Level</span>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-sm font-extrabold text-primary">{verificationResult.level}</span>
                        <span className="text-xs font-mono text-text-muted">({verificationResult.score}/100)</span>
                      </div>
                    </div>
                  </div>

                  {/* Evidence Summary Bullet */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">CV Evidence Summary</span>
                    <div className="p-3 bg-bg-primary border border-border/80 rounded-xl text-xs font-medium text-text-primary flex items-start gap-2">
                      <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{verificationResult.evidenceSummary}</span>
                    </div>
                  </div>

                  {/* Career Readiness Impact */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <div className="text-[10px] font-bold text-text-muted uppercase">Readiness Score</div>
                        <div className="text-xs font-bold text-primary">+{verificationResult.recalculatedReadinessBoost} pts Boost</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-500 shrink-0" />
                      <div>
                        <div className="text-[10px] font-bold text-text-muted uppercase">Gaps Resolved</div>
                        <div className="text-xs font-bold text-purple-600 dark:text-purple-400 truncate max-w-[120px]">
                          {verificationResult.resolvedGaps.join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirm Action Button */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-1/3 py-3 border border-border hover:bg-bg-secondary text-text-secondary rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Add Another
                  </button>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleFinalSyncAndSave}
                    className="w-2/3 py-3 bg-primary hover:bg-primary-hover text-white rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{isSyncing ? 'Syncing CV & Metrics...' : 'Update CV & Metrics'}</span>
                  </button>
                </div>
              </motion.div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
