import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../App';
import { analyzeCV, generateCV, GeneratedCV, sanitizeTechStack } from '../services/geminiService';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  Sparkles, 
  History, 
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
  Globe,
  GraduationCap,
  Briefcase,
  Code,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  Edit3,
  X,
  Eye,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Menu,
  PenTool
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { pdf } from '@react-pdf/renderer';
import { CVDocument } from './CVDocument';
import { AddSkillModal } from './AddSkillModal';

export function CVUpload({ setView, onComplete }: { setView: (view: any) => void; onComplete?: () => void }) {
  const { profile, user } = useAuth();
  const [analyzing, setAnalyzing] = useState(false);
  const [cvText, setCvText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'generate' | 'paste'>('upload');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Embedded CV Generator States
  const [builderStarted, setBuilderStarted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [builderStep, setBuilderStep] = useState<number>(1);
  const [generatingCV, setGeneratingCV] = useState(false);
  const [generatedCV, setGeneratedCV] = useState<GeneratedCV | null>(null);
  const [cvGeneratedInModalSuccess, setCvGeneratedInModalSuccess] = useState(false);
  const [showViewCV, setShowViewCV] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [isAddSkillModalOpen, setIsAddSkillModalOpen] = useState(false);
  const [skillAddedToast, setSkillAddedToast] = useState<string | null>(null);

  const handleSkillAddedInCVUpload = (newSkillObj?: any) => {
    const currentUserId = user?.uid || 'guest';
    const localCVRaw = localStorage.getItem(`saved_cv_${currentUserId}`);
    if (localCVRaw) {
      try {
        const parsed = JSON.parse(localCVRaw);
        setGeneratedCV(parsed);
      } catch (e) {
        /* ignore */
      }
    }
    const skillNameAdded = newSkillObj?.name || 'New skill';
    setSkillAddedToast(`"${skillNameAdded}" added & verified! Your CV, Skill Audit, and Career Readiness score have been recalculated.`);
  };

  // Hydrate saved CV from profile or localStorage
  useEffect(() => {
    const sanitizeCVObj = (cv: GeneratedCV): GeneratedCV => {
      if (!cv) return cv;
      return {
        ...cv,
        projects: Array.isArray(cv.projects)
          ? cv.projects.map(p => ({
              ...p,
              techStack: sanitizeTechStack(p.techStack)
            }))
          : []
      };
    };

    if (profile?.savedCV) {
      setGeneratedCV(sanitizeCVObj(profile.savedCV));
    } else {
      const local = localStorage.getItem(`saved_cv_${user?.uid || 'guest'}`);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (parsed && parsed.fullName) {
            setGeneratedCV(sanitizeCVObj(parsed));
          }
        } catch (e) {
          console.warn("Could not parse saved CV from local storage", e);
        }
      }
    }
  }, [profile?.savedCV, user?.uid]);

  // Keep builderFormData & generatedCV synchronized when profile updates
  useEffect(() => {
    if (profile) {
      const currentSkillsStr = profile.skills?.map((s: any) => typeof s === 'string' ? s : s.name).join(', ');
      if (currentSkillsStr) {
        setBuilderFormData(prev => ({
          ...prev,
          fullName: profile.displayName || prev.fullName,
          email: profile.email || prev.email,
          summary: profile.summary || prev.summary,
          skills: currentSkillsStr,
        }));
      }

      if (generatedCV && profile.skills && profile.skills.length > 0) {
        const activeSkillNames = profile.skills.map((s: any) => typeof s === 'string' ? s : s?.name || '');
        setGeneratedCV(prev => {
          if (!prev) return prev;
          const existingSkillsFlat = prev.skills?.flatMap(s => typeof s === 'string' ? [s] : Array.isArray(s?.items) ? s.items : []) || [];
          const hasNewSkill = activeSkillNames.some(s => Boolean(s) && !existingSkillsFlat.includes(s));
          if (hasNewSkill) {
            const updated = {
              ...prev,
              skills: [
                { category: 'Key Technical & Professional Skills', items: activeSkillNames.filter(Boolean) }
              ]
            };
            localStorage.setItem(`saved_cv_${user?.uid || 'guest'}`, JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      }
    }
  }, [profile?.displayName, profile?.email, profile?.summary, profile?.skills, user?.uid]);

  const [builderFormData, setBuilderFormData] = useState({
    fullName: profile?.displayName || '',
    role: profile?.role === 'mentor' ? 'Industry Mentor' : 'Software Engineer / Graduate',
    email: profile?.email || '',
    phone: '',
    location: '',
    github: '',
    linkedin: '',
    portfolio: '',
    summary: profile?.summary || '',
    education: [{ school: '', degree: '', year: '', gpa: '' }],
    experience: [{ company: '', role: '', duration: '', description: '' }],
    projects: [{ name: '', techStack: '', description: '' }],
    skills: profile?.skills?.map((s: any) => typeof s === 'string' ? s : s.name).join(', ') || '',
    languages: '',
    interests: '',
    certifications: '',
  });

  const handleAddField = (field: 'education' | 'experience' | 'projects') => {
    if (field === 'education') {
      setBuilderFormData({ ...builderFormData, education: [...builderFormData.education, { school: '', degree: '', year: '', gpa: '' }] });
    } else if (field === 'experience') {
      setBuilderFormData({ ...builderFormData, experience: [...builderFormData.experience, { company: '', role: '', duration: '', description: '' }] });
    } else {
      setBuilderFormData({ ...builderFormData, projects: [...builderFormData.projects, { name: '', techStack: '', description: '' }] });
    }
  };

  const handleRemoveField = (field: 'education' | 'experience' | 'projects', index: number) => {
    const newList = [...builderFormData[field]].filter((_, i) => i !== index);
    setBuilderFormData({ ...builderFormData, [field]: newList });
  };

  const handleGenerateCV = async () => {
    setGeneratingCV(true);
    setError(null);
    try {
      const cv = await generateCV(builderFormData);
      setGeneratedCV(cv);
      setShowViewCV(true);
      
      // Save locally
      localStorage.setItem(`saved_cv_${user?.uid || 'guest'}`, JSON.stringify(cv));

      // Show pop-up success message inside modal
      setCvGeneratedInModalSuccess(true);

      // Sync generated skills into user profile if authenticated
      if (user) {
        const profileRef = doc(db, 'users', user.uid);
        const extractedSkillNames = cv.skills?.flatMap(s => typeof s === 'string' ? [s] : Array.isArray(s?.items) ? s.items : []) || [];
        const payload: Record<string, any> = {
          savedCV: cv,
          skills: extractedSkillNames.map(name => ({ name, level: 'Intermediate' })),
          profileAnalyzed: true,
          updatedAt: new Date().toISOString()
        };
        if (cv.summary) {
          payload.summary = cv.summary;
        }
        await updateDoc(profileRef, payload).catch(e => console.warn('Silent notice updating profile after CV generation:', e));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate CV. Please check your network and try again.');
    } finally {
      setGeneratingCV(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!generatedCV) return;
    setDownloadingPDF(true);
    try {
      const blob = await pdf(<CVDocument data={generatedCV} />).toBlob();
      saveAs(blob, `CV_${generatedCV.fullName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      window.print();
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!generatedCV) return;
    setDownloadingDocx(true);
    try {
      const nameStr = generatedCV.fullName || 'Candidate Name';
      const roleStr = generatedCV.role || '';
      const locStr = generatedCV.location || '';
      const emailStr = generatedCV.email || '';
      const phoneStr = generatedCV.phone || '';
      const githubStr = generatedCV.github || '';

      const educationList = Array.isArray(generatedCV.education) ? generatedCV.education : [];
      const experienceList = Array.isArray(generatedCV.experience) ? generatedCV.experience : [];
      const projectsList = Array.isArray(generatedCV.projects) ? generatedCV.projects : [];
      const skillsList = Array.isArray(generatedCV.skills) ? generatedCV.skills : [];

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: nameStr,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `${roleStr} | ${locStr}`, italics: true }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `${emailStr} | ${phoneStr} | ${githubStr}` }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            
            new Paragraph({ text: "CAREER OBJECTIVE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: generatedCV.summary || '', spacing: { after: 200 } }),

            new Paragraph({ text: "EDUCATION", heading: HeadingLevel.HEADING_3 }),
            ...educationList.flatMap(edu => [
              new Paragraph({ children: [new TextRun({ text: edu.degree || '', bold: true })] }),
              new Paragraph({ text: `${edu.school || ''} | ${edu.year || ''}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}`, spacing: { after: 100 } }),
            ]),

            new Paragraph({ text: "WORK EXPERIENCE", heading: HeadingLevel.HEADING_3 }),
            ...experienceList.flatMap(exp => [
              new Paragraph({ children: [new TextRun({ text: exp.role || '', bold: true }), new TextRun({ text: ` at ${exp.company || ''}`, bold: true })] }),
              new Paragraph({ children: [new TextRun({ text: exp.duration || '', italics: true })] }),
              ...(Array.isArray(exp.description) ? exp.description : exp.description ? [exp.description] : []).map(bullet => new Paragraph({ text: bullet, bullet: { level: 0 } })),
              new Paragraph({ text: "", spacing: { after: 100 } }),
            ]),

            new Paragraph({ text: "PROJECTS", heading: HeadingLevel.HEADING_3 }),
            ...projectsList.flatMap(proj => [
              new Paragraph({ children: [new TextRun({ text: proj.name || '', bold: true }), new TextRun({ text: ` (${Array.isArray(proj.techStack) ? proj.techStack.join(', ') : (proj.techStack || '')})`, italics: true })] }),
              ...(Array.isArray(proj.description) ? proj.description : proj.description ? [proj.description] : []).map(bullet => new Paragraph({ text: bullet, bullet: { level: 0 } })),
              new Paragraph({ text: "", spacing: { after: 100 } }),
            ]),
            
            new Paragraph({ text: "SKILLS", heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: skillsList.map(s => typeof s === 'string' ? s : `${s.category || 'Skills'}: ${Array.isArray(s.items) ? s.items.join(', ') : (s.items || '')}`).join(' | ') }),

            ...(builderFormData.languages ? [
              new Paragraph({ text: "LANGUAGES", heading: HeadingLevel.HEADING_3 }),
              new Paragraph({ text: builderFormData.languages, spacing: { after: 100 } }),
            ] : []),

            ...(builderFormData.interests ? [
              new Paragraph({ text: "INTERESTS", heading: HeadingLevel.HEADING_3 }),
              new Paragraph({ text: builderFormData.interests, spacing: { after: 100 } }),
            ] : []),

            ...(builderFormData.certifications ? [
              new Paragraph({ text: "CERTIFICATES & REWARDS", heading: HeadingLevel.HEADING_3 }),
              new Paragraph({ text: builderFormData.certifications, spacing: { after: 100 } }),
            ] : []),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `CV_${nameStr.replace(/\s+/g, '_')}.docx`);
    } catch (err) {
      console.error('Docx Generation Error:', err);
    } finally {
      setDownloadingDocx(false);
    }
  };

  const processFile = (selectedFile: File) => {
    if (selectedFile.type === 'application/pdf' || 
        selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please upload a PDF or DOCX file.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAnalyze = async () => {
    if (!cvText.trim() && !file) return;
    
    setAnalyzing(true);
    setError(null);
    try {
      let result;
      if (file) {
        if (file.type === 'application/pdf') {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
            reader.readAsDataURL(file);
          });
          const base64 = await base64Promise;
          result = await analyzeCV(undefined, { data: base64, mimeType: 'application/pdf' });
        } else if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
            reader.readAsDataURL(file);
          });
          const base64 = await base64Promise;
          result = await analyzeCV(undefined, { data: base64, mimeType: file.type });
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const arrayBuffer = await file.arrayBuffer();
          const docxResult = await mammoth.extractRawText({ arrayBuffer });
          result = await analyzeCV(docxResult.value);
        } else {
          // General text or fallback
          const text = await file.text();
          result = await analyzeCV(text || cvText);
        }
      } else {
        result = await analyzeCV(cvText);
      }
      
      if (result) {
        setAnalysisResult(result);

        const extracted = result.extractedCV || ({} as Partial<GeneratedCV>);

        // Gather all skills to ensure none are missing
        const allExtractedSkillNames = new Set<string>();
        if (Array.isArray(result.skills)) {
          result.skills.forEach((s: any) => {
            if (s?.name) allExtractedSkillNames.add(s.name.trim());
          });
        }
        if (Array.isArray(extracted.skills)) {
          extracted.skills.forEach((group: any) => {
            if (typeof group === 'string') {
              allExtractedSkillNames.add(group.trim());
            } else if (Array.isArray(group?.items)) {
              group.items.forEach((item: string) => {
                if (item) allExtractedSkillNames.add(item.trim());
              });
            }
          });
        }

        // Build comprehensive categorized skills structure
        let categorizedSkills: { category: string; items: string[] }[] = [];
        if (Array.isArray(extracted.skills) && extracted.skills.length > 0 && typeof extracted.skills[0] === 'object') {
          categorizedSkills = extracted.skills.map((group: any) => ({
            category: group.category || 'Technical Skills',
            items: Array.isArray(group.items) ? group.items : [String(group.items || '')]
          }));
        } else if (Array.isArray(result.skills) && result.skills.length > 0) {
          const techSkills = result.skills.filter((s: any) => s.category === 'technical').map((s: any) => s.name);
          const softSkills = result.skills.filter((s: any) => s.category === 'soft').map((s: any) => s.name);
          if (techSkills.length > 0) categorizedSkills.push({ category: 'Technical Skills', items: techSkills });
          if (softSkills.length > 0) categorizedSkills.push({ category: 'Soft Skills & Leadership', items: softSkills });
        }

        if (categorizedSkills.length === 0 && allExtractedSkillNames.size > 0) {
          categorizedSkills.push({ category: 'Key Competencies', items: Array.from(allExtractedSkillNames) });
        }

        // Build complete newGeneratedCV with all extracted CV props preserved
        const newGeneratedCV: GeneratedCV = {
          fullName: extracted.fullName || profile?.displayName || builderFormData.fullName || 'Candidate Resume',
          role: extracted.role || result.targetRole || profile?.role || builderFormData.role || 'Professional Candidate',
          email: extracted.email || profile?.email || builderFormData.email || '',
          phone: extracted.phone || builderFormData.phone || '',
          location: extracted.location || builderFormData.location || '',
          github: extracted.github || builderFormData.github || '',
          linkedin: extracted.linkedin || builderFormData.linkedin || '',
          portfolio: extracted.portfolio || builderFormData.portfolio || '',
          links: extracted.links || [],
          summary: extracted.summary || profile?.summary || builderFormData.summary || `Results-driven professional with proven expertise in ${Array.from(allExtractedSkillNames).slice(0, 5).join(', ')}.`,
          education: (extracted.education && extracted.education.length > 0)
            ? extracted.education
            : (result.academicBackground && result.academicBackground.length > 0)
            ? result.academicBackground.map(school => ({
                school,
                degree: 'Academic Degree / Major',
                year: 'Completed'
              }))
            : builderFormData.education,
          experience: (extracted.experience && extracted.experience.length > 0)
            ? extracted.experience
            : builderFormData.experience.filter(e => e.company).map(e => ({ ...e, description: [e.description] })) || [],
          projects: (extracted.projects && extracted.projects.length > 0)
            ? extracted.projects.map(p => ({
                ...p,
                techStack: sanitizeTechStack(p.techStack)
              }))
            : (result.projects && result.projects.length > 0)
            ? result.projects.map(p => {
                const cleanStack = sanitizeTechStack(p.techStack);
                return {
                  name: p.name,
                  techStack: cleanStack,
                  description: (p.description && p.description.length > 0)
                    ? p.description 
                    : [`Designed and delivered ${p.name}${cleanStack.length > 0 ? ' using ' + cleanStack.join(', ') : ''}.`]
                };
              })
            : [],
          skills: categorizedSkills,
          languages: (extracted.languages && extracted.languages.length > 0)
            ? extracted.languages
            : builderFormData.languages
            ? builderFormData.languages.split(',').map(s => s.trim())
            : ['English (Fluent)'],
          interests: (extracted.interests && extracted.interests.length > 0)
            ? extracted.interests
            : builderFormData.interests
            ? builderFormData.interests.split(',').map(s => s.trim())
            : [],
          certifications: (extracted.certifications && extracted.certifications.length > 0)
            ? extracted.certifications
            : (result.certifications && result.certifications.length > 0)
            ? result.certifications
            : builderFormData.certifications
            ? builderFormData.certifications.split(',').map(s => s.trim())
            : []
        };

        setGeneratedCV(newGeneratedCV);
        setShowViewCV(true);
        localStorage.setItem(`saved_cv_${user?.uid || 'guest'}`, JSON.stringify(newGeneratedCV));

        if (user) {
          const profileRef = doc(db, 'users', user.uid);
          const rawPayload = {
            ...result,
            savedCV: newGeneratedCV,
            profileAnalyzed: true,
            readinessScore: result.meanSkillScore ?? 70,
            updatedAt: new Date().toISOString()
          };
          const cleanPayload = Object.fromEntries(
            Object.entries(rawPayload).filter(([_, val]) => val !== undefined)
          );
          await updateDoc(profileRef, cleanPayload).catch(e => console.warn('Silent notice updating profile:', e));
        }
        setSuccess(true);
        if (onComplete) onComplete();
        
        setTimeout(() => {
          if (result.meanSkillScore >= 70) {
            setView('jobs');
          } else {
            setView('mentors');
          }
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'users');
      setError('Failed to analyze CV. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Generate update history items
  const getHistoryEvents = () => {
    if (profile?.cvHistory && Array.isArray(profile.cvHistory) && profile.cvHistory.length > 0) {
      return profile.cvHistory;
    }
    const events: Array<{ type: 'replace' | 'additive' | 'minor'; title: string; subtitle: string; chips?: string[] }> = [];
    if (profile?.profileAnalyzed) {
      events.push({
        type: 'replace',
        title: 'Full resume replaced',
        subtitle: `Re-uploaded resume · ${profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : 'Recently'}`,
        chips: profile.skills?.length ? [`+${profile.skills.length} skills`, 'Skill audit mapped'] : ['Skill audit mapped']
      });
    }
    if (profile?.skills && profile.skills.length > 0) {
      events.push({
        type: 'additive',
        title: 'Skills section updated',
        subtitle: 'System sync · Verified',
        chips: [`${profile.skills.length} skills active`]
      });
    }
    if (profile?.createdAt || profile?.updatedAt) {
      events.push({
        type: 'minor',
        title: 'Career history initialized',
        subtitle: 'Profile setup',
        chips: ['1 role added']
      });
    }
    return events;
  };

  const historyEvents = getHistoryEvents();

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-6 bg-bg-primary min-h-[calc(100vh-4rem)]">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-border/70 pb-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Resume</h1>
          <p className="text-xs text-text-muted">Manage, upload, or build your professional profile</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAddSkillModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs font-bold text-primary transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>Add New Skill</span>
          </button>
          {generatedCV && (
            <button
              type="button"
              onClick={handleGenerateCV}
              disabled={generatingCV}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Regenerate CV with latest AI data"
            >
              {generatingCV ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{generatingCV ? 'Regenerating...' : 'Regenerate CV'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setActiveTab('generate');
              setShowViewCV(true);
              if (!generatedCV) {
                setIsModalOpen(true);
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Review CV</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT CARD (~65-70% / col-span-8) */}
        <div className="lg:col-span-8 bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
          {/* Header Row: Title on Left, Horizontal Tab Bar on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
            <h2 className="text-lg font-semibold text-text-primary">Add your resume</h2>
            
            {/* Tab Bar */}
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pt-1 sm:pt-0">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`text-sm font-medium transition-all relative pb-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'upload' ? 'text-text-primary font-semibold' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                Upload CV
                {activeTab === 'upload' && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('generate')}
                className={`text-sm font-medium transition-all relative pb-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'generate' ? 'text-text-primary font-semibold' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                Generate CV
                {activeTab === 'generate' && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`text-sm font-medium transition-all relative pb-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'paste' ? 'text-text-primary font-semibold' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                Paste CV info
                {activeTab === 'paste' && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* TAB 1: Upload CV (Default) */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".pdf,.docx"
              />

              {file ? (
                <div className="min-h-[280px] flex flex-col justify-center items-center p-6 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 text-center space-y-4">
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-bg-secondary border border-border w-full max-w-md shadow-2xs">
                    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 text-left flex-1">
                      <p className="text-sm font-semibold text-text-primary truncate">{file.name}</p>
                      <p className="text-xs text-text-muted">{formatFileSize(file.size)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{analyzing ? 'Analyzing resume...' : 'Analyze my resume'}</span>
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`group relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed min-h-[280px] transition-all cursor-pointer text-center ${
                    isDragging
                      ? 'border-primary bg-primary/10 ring-4 ring-primary/10'
                      : 'border-border bg-bg-secondary/40 hover:border-primary/60 hover:bg-primary/5'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-text-primary mb-1">
                    Upload your resume
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed mb-4">
                    Drag and drop here or browse<br />
                    PDF or DOCX, up to 5MB
                  </p>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl border border-border bg-bg-primary text-xs font-semibold text-text-primary hover:bg-bg-tertiary transition-all shadow-2xs cursor-pointer"
                  >
                    Browse files
                  </button>
                </div>
              )}

              <p className="text-center text-xs text-text-muted flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span>Encrypted in transit. Your resume is never shared.</span>
              </p>
            </div>
          )}

          {/* TAB 2: Generate CV */}
          {activeTab === 'generate' && (
            <div className="space-y-6">
              {generatedCV ? (
                /* Generated CV Management Box (Clean view without inline document clutter) */
                <div className="p-6 rounded-2xl bg-bg-secondary/60 border border-border space-y-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-success/10 text-success">
                        <CheckCircle2 className="w-6 h-6 shrink-0" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-text-primary">Resume Ready & Up To Date</h3>
                        <p className="text-xs text-text-muted">Click "View CV" for full-screen browser preview, or "Generate CV" to edit details in pop-up modal.</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {/* Generate CV Button (opens pop-up form wizard modal) */}
                    <button
                      type="button"
                      onClick={() => {
                        setCvGeneratedInModalSuccess(false);
                        setBuilderStep(1);
                        setIsModalOpen(true);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Generate CV</span>
                    </button>

                    {/* View CV Button (opens full-screen browser popup viewer) */}
                    <button
                      type="button"
                      onClick={() => setShowViewCV(true)}
                      className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View CV</span>
                    </button>

                    {/* Export PDF Button */}
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      disabled={downloadingPDF}
                      className="px-4 py-2.5 bg-bg-tertiary border border-border hover:border-primary/50 text-text-primary text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {downloadingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      <span>Export PDF</span>
                    </button>

                    {/* Export DOCX Button */}
                    <button
                      type="button"
                      onClick={handleDownloadDocx}
                      disabled={downloadingDocx}
                      className="px-4 py-2.5 bg-bg-tertiary border border-border hover:border-primary/50 text-text-primary text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {downloadingDocx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                      <span>Export DOCX</span>
                    </button>
                  </div>

                  {/* Quick Summary Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-bg-primary border border-border/80 text-xs">
                      <span className="text-[11px] font-semibold text-text-muted uppercase block mb-1">Full Name & Role</span>
                      <span className="font-bold text-text-primary truncate block">{generatedCV.fullName}</span>
                      <span className="text-text-muted text-[11px] truncate block">{builderFormData.role || 'Professional'}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-bg-primary border border-border/80 text-xs">
                      <span className="text-[11px] font-semibold text-text-muted uppercase block mb-1">Contact Info</span>
                      <span className="font-bold text-text-primary truncate block">{generatedCV.email || 'N/A'}</span>
                      <span className="text-text-muted text-[11px] truncate block">{generatedCV.phone || 'N/A'}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-bg-primary border border-border/80 text-xs">
                      <span className="text-[11px] font-semibold text-text-muted uppercase block mb-1">Content Stats</span>
                      <span className="font-bold text-text-primary block">{generatedCV.projects?.length || 0} Projects • {generatedCV.skills?.length || 0} Skill Groups</span>
                      <span className="text-text-muted text-[11px] block">{generatedCV.education?.length || 0} Education • {generatedCV.experience?.length || 0} Roles</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Hero Start Card */
                <div className="min-h-[320px] flex flex-col items-center justify-center p-8 rounded-2xl border border-border bg-bg-secondary/40 text-center space-y-5">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="space-y-2 max-w-md">
                    <h3 className="text-xl font-bold text-text-primary">Build a resume from scratch</h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Click below to launch our interactive pop-up wizard. Complete the 6 easy steps to generate a beautifully styled ATS resume with instant PDF & DOCX export directly on this website.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBuilderStarted(true);
                      setCvGeneratedInModalSuccess(false);
                      setIsModalOpen(true);
                      setBuilderStep(1);
                    }}
                    className="px-7 py-3.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate CV</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* POP-UP MODAL MULTI-STEP BUILDER WIZARD */}
              <AnimatePresence>
                {isModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 15 }}
                      className="relative w-full max-w-2xl bg-bg-primary border border-border rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
                    >
                      {/* Modal Header */}
                      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-bg-secondary/50 shrink-0">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-text-primary">
                              {cvGeneratedInModalSuccess ? 'Resume Ready' : 'Build Your Professional Resume'}
                            </h3>
                            <p className="text-[11px] text-text-muted">
                              {cvGeneratedInModalSuccess ? 'Generation Complete' : '6-Step Pop-up Wizard'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!cvGeneratedInModalSuccess && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                              Step {builderStep} of 6
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setIsModalOpen(false);
                              setCvGeneratedInModalSuccess(false);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                            title="Close modal"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Modal Body (Scrollable) */}
                      <div className="p-6 overflow-y-auto space-y-5 flex-1">
                        {cvGeneratedInModalSuccess ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-10 px-4 flex flex-col items-center justify-center text-center space-y-5 my-auto"
                          >
                            <div className="w-16 h-16 rounded-2xl bg-success/15 text-success flex items-center justify-center shadow-sm">
                              <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div className="space-y-2 max-w-md">
                              <h3 className="text-2xl font-extrabold text-text-primary">Resume Generated Successfully!</h3>
                              <p className="text-xs text-text-muted leading-relaxed">
                                Go back to see the Resume.
                              </p>
                              <div className="mt-4 p-4 rounded-xl bg-bg-secondary border border-border text-xs text-text-secondary font-medium space-y-1">
                                <p className="font-bold text-text-primary flex items-center justify-center gap-1.5">
                                  <Sparkles className="w-4 h-4 text-primary" />
                                  <span>Resume Available on Website</span>
                                </p>
                                <p className="text-text-muted text-[11px] pt-1">
                                  Click the upper <strong className="text-text-primary">X</strong> icon to close this pop-up and view or export your CV.
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <>
                            {/* Step Indicators Bar */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
                                <span>
                                  {builderStep === 1 && '1. Personal Details'}
                                  {builderStep === 2 && '2. Professional Summary'}
                                  {builderStep === 3 && '3. Education'}
                                  {builderStep === 4 && '4. Projects'}
                                  {builderStep === 5 && '5. Experience'}
                                  {builderStep === 6 && '6. Languages, Interests & Certificates'}
                                </span>
                                <span className="text-[11px]">{Math.round((builderStep / 6) * 100)}% Completed</span>
                              </div>
                              <div className="grid grid-cols-6 gap-1.5">
                                {[1, 2, 3, 4, 5, 6].map((st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => setBuilderStep(st)}
                                    className={`h-2 rounded-full transition-all cursor-pointer ${
                                      st === builderStep 
                                        ? 'bg-primary ring-2 ring-primary/20' 
                                        : st < builderStep 
                                        ? 'bg-primary/50' 
                                        : 'bg-border'
                                    }`}
                                    title={`Jump to Step ${st}`}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Animated Step Form Body */}
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={builderStep}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-4 pt-1"
                              >
                                {/* STEP 1: Personal Details */}
                                {builderStep === 1 && (
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                                      <User className="w-4 h-4 text-primary" />
                                      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Step 1: Personal Details</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                      <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-text-muted uppercase">Full Name</label>
                                        <input
                                          type="text"
                                          value={builderFormData.fullName}
                                          onChange={(e) => setBuilderFormData({ ...builderFormData, fullName: e.target.value })}
                                          placeholder="E.g. Jane Doe"
                                          className="w-full p-2.5 rounded-lg bg-bg-secondary border border-border focus:border-primary outline-none text-xs text-text-primary"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-text-muted uppercase">Target Job Title / Role</label>
                                        <input
                                          type="text"
                                          value={builderFormData.role}
                                          onChange={(e) => setBuilderFormData({ ...builderFormData, role: e.target.value })}
                                          placeholder="E.g. Full Stack Developer"
                                          className="w-full p-2.5 rounded-lg bg-bg-secondary border border-border focus:border-primary outline-none text-xs text-text-primary"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-text-muted uppercase">Email Address</label>
                                        <input
                                          type="email"
                                          value={builderFormData.email}
                                          onChange={(e) => setBuilderFormData({ ...builderFormData, email: e.target.value })}
                                          placeholder="jane@example.com"
                                          className="w-full p-2.5 rounded-lg bg-bg-secondary border border-border focus:border-primary outline-none text-xs text-text-primary"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-text-muted uppercase">Phone Number</label>
                                        <input
                                          type="text"
                                          value={builderFormData.phone}
                                          onChange={(e) => setBuilderFormData({ ...builderFormData, phone: e.target.value })}
                                          placeholder="+1 (555) 000-0000"
                                          className="w-full p-2.5 rounded-lg bg-bg-secondary border border-border focus:border-primary outline-none text-xs text-text-primary"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-text-muted uppercase">Location</label>
                                        <input
                                          type="text"
                                          value={builderFormData.location}
                                          onChange={(e) => setBuilderFormData({ ...builderFormData, location: e.target.value })}
                                          placeholder="New York, USA"
                                          className="w-full p-2.5 rounded-lg bg-bg-secondary border border-border focus:border-primary outline-none text-xs text-text-primary"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-text-muted uppercase">GitHub Profile</label>
                                        <input
                                          type="text"
                                          value={builderFormData.github}
                                          onChange={(e) => setBuilderFormData({ ...builderFormData, github: e.target.value })}
                                          placeholder="github.com/username"
                                          className="w-full p-2.5 rounded-lg bg-bg-secondary border border-border focus:border-primary outline-none text-xs text-text-primary"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-text-muted uppercase">LinkedIn Profile</label>
                                        <input
                                          type="text"
                                          value={builderFormData.linkedin}
                                          onChange={(e) => setBuilderFormData({ ...builderFormData, linkedin: e.target.value })}
                                          placeholder="linkedin.com/in/username"
                                          className="w-full p-2.5 rounded-lg bg-bg-secondary border border-border focus:border-primary outline-none text-xs text-text-primary"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-text-muted uppercase">Portfolio Website</label>
                                        <input
                                          type="text"
                                          value={builderFormData.portfolio}
                                          onChange={(e) => setBuilderFormData({ ...builderFormData, portfolio: e.target.value })}
                                          placeholder="portfolio.dev"
                                          className="w-full p-2.5 rounded-lg bg-bg-secondary border border-border focus:border-primary outline-none text-xs text-text-primary"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* STEP 2: Professional Summary */}
                                {builderStep === 2 && (
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                                      <FileText className="w-4 h-4 text-primary" />
                                      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Step 2: Professional Summary</h4>
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[11px] font-semibold text-text-muted uppercase">Career Objective & Key Highlights</label>
                                      <textarea
                                        value={builderFormData.summary}
                                        onChange={(e) => setBuilderFormData({ ...builderFormData, summary: e.target.value })}
                                        placeholder="Passionate engineer with 3+ years building scalable web applications. Expert in React, TypeScript, and modern cloud platforms..."
                                        className="w-full p-3 rounded-lg bg-bg-secondary border border-border focus:border-primary outline-none text-xs text-text-primary h-36 resize-y leading-relaxed"
                                      />
                                      <p className="text-[11px] text-text-muted">Tip: Keep it concise (2-4 sentences highlighting your core competencies).</p>
                                    </div>
                                  </div>
                                )}

                                {/* STEP 3: Education */}
                                {builderStep === 3 && (
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between pb-2 border-b border-border">
                                      <div className="flex items-center gap-2">
                                        <GraduationCap className="w-4 h-4 text-primary" />
                                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Step 3: Education</h4>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAddField('education')}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Record
                                      </button>
                                    </div>
                                    <div className="space-y-3">
                                      {builderFormData.education.map((edu, i) => (
                                        <div key={i} className="p-3.5 bg-bg-secondary border border-border rounded-xl space-y-2.5 relative group">
                                          {builderFormData.education.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveField('education', i)}
                                              className="absolute top-3 right-3 p-1 text-text-muted hover:text-error transition-colors cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          <input
                                            placeholder="School / University Name"
                                            value={edu.school}
                                            onChange={(e) => {
                                              const updated = [...builderFormData.education];
                                              updated[i].school = e.target.value;
                                              setBuilderFormData({ ...builderFormData, education: updated });
                                            }}
                                            className="w-full p-2 bg-bg-primary border border-border rounded-lg outline-none text-xs text-text-primary font-medium"
                                          />
                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <input
                                              placeholder="Degree (e.g. B.Sc in CSE)"
                                              value={edu.degree}
                                              onChange={(e) => {
                                                const updated = [...builderFormData.education];
                                                updated[i].degree = e.target.value;
                                                setBuilderFormData({ ...builderFormData, education: updated });
                                              }}
                                              className="w-full p-2 bg-bg-primary border border-border rounded-lg outline-none text-xs text-text-primary"
                                            />
                                            <input
                                              placeholder="Year (e.g. 2020 - 2024)"
                                              value={edu.year}
                                              onChange={(e) => {
                                                const updated = [...builderFormData.education];
                                                updated[i].year = e.target.value;
                                                setBuilderFormData({ ...builderFormData, education: updated });
                                              }}
                                              className="w-full p-2 bg-bg-primary border border-border rounded-lg outline-none text-xs text-text-primary"
                                            />
                                            <input
                                              placeholder="GPA / Result (Optional)"
                                              value={edu.gpa}
                                              onChange={(e) => {
                                                const updated = [...builderFormData.education];
                                                updated[i].gpa = e.target.value;
                                                setBuilderFormData({ ...builderFormData, education: updated });
                                              }}
                                              className="w-full p-2 bg-bg-primary border border-border rounded-lg outline-none text-xs text-text-primary"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* STEP 4: Projects */}
                                {builderStep === 4 && (
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between pb-2 border-b border-border">
                                      <div className="flex items-center gap-2">
                                        <Code className="w-4 h-4 text-primary" />
                                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Step 4: Key Projects</h4>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAddField('projects')}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Record
                                      </button>
                                    </div>
                                    <div className="space-y-3">
                                      {builderFormData.projects.map((proj, i) => (
                                        <div key={i} className="p-3.5 bg-bg-secondary border border-border rounded-xl space-y-2.5 relative group">
                                          {builderFormData.projects.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveField('projects', i)}
                                              className="absolute top-3 right-3 p-1 text-text-muted hover:text-error transition-colors cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <input
                                              placeholder="Project Title"
                                              value={proj.name}
                                              onChange={(e) => {
                                                const updated = [...builderFormData.projects];
                                                updated[i].name = e.target.value;
                                                setBuilderFormData({ ...builderFormData, projects: updated });
                                              }}
                                              className="w-full p-2 bg-bg-primary border border-border rounded-lg outline-none text-xs text-text-primary font-medium"
                                            />
                                            <input
                                              placeholder="Tech Stack (e.g. React, Node.js)"
                                              value={proj.techStack}
                                              onChange={(e) => {
                                                const updated = [...builderFormData.projects];
                                                updated[i].techStack = e.target.value;
                                                setBuilderFormData({ ...builderFormData, projects: updated });
                                              }}
                                              className="w-full p-2 bg-bg-primary border border-border rounded-lg outline-none text-xs text-text-primary"
                                            />
                                          </div>
                                          <textarea
                                            placeholder="Project details & achievements..."
                                            value={proj.description}
                                            onChange={(e) => {
                                              const updated = [...builderFormData.projects];
                                              updated[i].description = e.target.value;
                                              setBuilderFormData({ ...builderFormData, projects: updated });
                                            }}
                                            className="w-full p-2 bg-bg-primary border border-border rounded-lg outline-none text-xs text-text-primary h-20 resize-y"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* STEP 5: Experience */}
                                {builderStep === 5 && (
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between pb-2 border-b border-border">
                                      <div className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-primary" />
                                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Step 5: Work Experience</h4>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAddField('experience')}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Record
                                      </button>
                                    </div>
                                    <div className="space-y-3">
                                      {builderFormData.experience.map((exp, i) => (
                                        <div key={i} className="p-3.5 bg-bg-secondary border border-border rounded-xl space-y-2.5 relative group">
                                          {builderFormData.experience.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveField('experience', i)}
                                              className="absolute top-3 right-3 p-1 text-text-muted hover:text-error transition-colors cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          <input
                                            placeholder="Company / Organization"
                                            value={exp.company}
                                            onChange={(e) => {
                                              const updated = [...builderFormData.experience];
                                              updated[i].company = e.target.value;
                                              setBuilderFormData({ ...builderFormData, experience: updated });
                                            }}
                                            className="w-full p-2 bg-bg-primary border border-border rounded-lg outline-none text-xs text-text-primary font-medium"
                                          />
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <input
                                              placeholder="Job Title / Role"
                                              value={exp.role}
                                              onChange={(e) => {
                                                const updated = [...builderFormData.experience];
                                                updated[i].role = e.target.value;
                                                setBuilderFormData({ ...builderFormData, experience: updated });
                                              }}
                                              className="w-full p-2 bg-bg-primary border border-border rounded-lg outline-none text-xs text-text-primary"
                                            />
                                            <input
                                              placeholder="Duration (e.g. Jan 2023 - Present)"
                                              value={exp.duration}
                                              onChange={(e) => {
                                                const updated = [...builderFormData.experience];
                                                updated[i].duration = e.target.value;
                                                setBuilderFormData({ ...builderFormData, experience: updated });
                                              }}
                                              className="w-full p-2 bg-bg-primary border border-border rounded-lg outline-none text-xs text-text-primary"
                                            />
                                          </div>
                                          <textarea
                                            placeholder="Key responsibilities and achievements..."
                                            value={exp.description}
                                            onChange={(e) => {
                                              const updated = [...builderFormData.experience];
                                              updated[i].description = e.target.value;
                                              setBuilderFormData({ ...builderFormData, experience: updated });
                                            }}
                                            className="w-full p-2 bg-bg-primary border border-border rounded-lg outline-none text-xs text-text-primary h-20 resize-y"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* STEP 6: Languages, Interests, Certificates & Skills */}
                                {builderStep === 6 && (
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                                      <Sparkles className="w-4 h-4 text-primary" />
                                      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Step 6: Languages, Interests & Certificates</h4>
                                    </div>
                                    
                                    <div className="space-y-3">
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-text-muted uppercase">Technical & Soft Skills (Comma Separated)</label>
                                        <input
                                          type="text"
                                          value={builderFormData.skills}
                                          onChange={(e) => setBuilderFormData({ ...builderFormData, skills: e.target.value })}
                                          placeholder="React, TypeScript, Node.js, GraphQL, Problem Solving"
                                          className="w-full p-2.5 bg-bg-secondary border border-border rounded-lg outline-none text-xs text-text-primary"
                                        />
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-semibold text-text-muted uppercase">Language Proficiency</label>
                                          <textarea
                                            value={builderFormData.languages}
                                            onChange={(e) => setBuilderFormData({ ...builderFormData, languages: e.target.value })}
                                            placeholder="English (Fluent), Bangla (Native)"
                                            className="w-full p-2 bg-bg-secondary border border-border rounded-lg outline-none text-xs text-text-primary h-20 resize-y"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-semibold text-text-muted uppercase">Interests</label>
                                          <textarea
                                            value={builderFormData.interests}
                                            onChange={(e) => setBuilderFormData({ ...builderFormData, interests: e.target.value })}
                                            placeholder="Open Source Contributing, Technical Writing"
                                            className="w-full p-2 bg-bg-secondary border border-border rounded-lg outline-none text-xs text-text-primary h-20 resize-y"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-semibold text-text-muted uppercase">Certificates & Rewards</label>
                                          <textarea
                                            value={builderFormData.certifications}
                                            onChange={(e) => setBuilderFormData({ ...builderFormData, certifications: e.target.value })}
                                            placeholder="AWS Certified Solutions Architect, Hackathon Top 3"
                                            className="w-full p-2 bg-bg-secondary border border-border rounded-lg outline-none text-xs text-text-primary h-20 resize-y"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            </AnimatePresence>
                          </>
                        )}
                      </div>

                      {/* Modal Footer Controls (Only shown when not completed) */}
                      {!cvGeneratedInModalSuccess && (
                        <div className="px-6 py-4 border-t border-border bg-bg-secondary/50 flex items-center justify-between shrink-0">
                          <button
                            type="button"
                            onClick={() => setBuilderStep((prev) => Math.max(1, prev - 1))}
                            disabled={builderStep === 1}
                            className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Back</span>
                          </button>

                          {builderStep < 6 ? (
                            <button
                              type="button"
                              onClick={() => setBuilderStep((prev) => Math.min(6, prev + 1))}
                              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Next Step</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleGenerateCV}
                              disabled={generatingCV}
                              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {generatingCV ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                              <span>{generatingCV ? 'Generating Resume...' : 'Generate CV'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 3: Paste CV info */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  placeholder="Paste your resume text here…"
                  className="w-full min-h-[240px] p-4 rounded-xl bg-bg-secondary border border-border text-text-primary text-sm leading-relaxed focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-text-muted/60 resize-y"
                />
                <div className="text-right text-[11px] text-text-muted pt-1">
                  {cvText.length} characters
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || !cvText.trim()}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{analyzing ? 'Analyzing text...' : 'Use this text'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Results & Error display */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 pt-4 border-t border-border"
              >
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-xs font-semibold text-text-primary">Analysis complete</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-border bg-bg-secondary flex flex-col gap-0.5 shadow-xs">
                    <span className="text-xs text-text-muted font-medium">Expertise Score</span>
                    <span className="text-2xl font-bold text-text-primary">
                      {analysisResult?.meanSkillScore || (profile as any)?.meanSkillScore || 0}%
                    </span>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-bg-secondary flex flex-col gap-0.5 shadow-xs group">
                    <span className="text-xs text-text-muted font-medium">Strategic Path</span>
                    <div className="flex items-center gap-1.5 text-primary font-bold text-sm group-hover:translate-x-1 transition-transform">
                      {(analysisResult?.meanSkillScore || (profile as any)?.meanSkillScore || 0) >= 70 ? 'Job Board Integration' : 'Mentorship Activation'}
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2.5 text-error text-xs shadow-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT CARD (~340-380px / col-span-4): Update history */}
        <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4 lg:sticky lg:top-6 max-h-[520px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Update history
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                {historyEvents.length}
              </span>
            </div>
            <History className="w-4 h-4 text-text-muted" />
          </div>

          {historyEvents.length > 0 ? (
            <div className="relative space-y-4 pl-4 border-l-2 border-border/80 my-2">
              {historyEvents.map((event, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-card ${
                      event.type === 'replace' ? 'bg-primary' : event.type === 'additive' ? 'bg-emerald-500' : 'bg-text-muted'
                    }`}
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-text-primary leading-tight">
                      {event.title}
                    </p>
                    <p className="text-xs text-text-muted">
                      {event.subtitle}
                    </p>
                    {event.chips && event.chips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {event.chips.map((chip, cIdx) => (
                          <span
                            key={cIdx}
                            className="inline-block text-[10px] font-medium bg-bg-secondary text-text-secondary border border-border/60 px-2 py-0.5 rounded-full"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-text-muted mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-xs text-text-muted max-w-[220px] mx-auto leading-relaxed">
                No updates yet. Your resume changes will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      <AddSkillModal
        isOpen={isAddSkillModalOpen}
        onClose={() => setIsAddSkillModalOpen(false)}
        onSkillAdded={handleSkillAddedInCVUpload}
      />

      {/* FULL SCREEN BROWSER POPUP CV VIEWER */}
      <AnimatePresence>
        {showViewCV && generatedCV && (
          <div className="fixed inset-0 z-50 bg-[#323639] flex flex-col font-sans select-none overflow-hidden animate-in fade-in duration-200">
            {/* Top Browser Toolbar */}
            <div className="h-12 bg-[#202124] text-slate-200 border-b border-slate-700/80 px-4 flex items-center justify-between shrink-0 shadow-md">
              {/* Left: Hamburger Menu & Filename */}
              <div className="flex items-center gap-3 min-w-0">
                <Menu className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-200 text-xs truncate max-w-[180px] sm:max-w-xs">
                  {generatedCV.fullName ? `${generatedCV.fullName.replace(/\s+/g, '_')}_CV.docx` : 'Moni_CV.docx'}
                </span>
              </div>

              {/* Center: Toolbar Controls (1/1, Zoom, Rotate, Pen) */}
              <div className="hidden md:flex items-center gap-3 text-xs text-slate-300 bg-[#2d3034] px-3.5 py-1 rounded-md border border-slate-700 shadow-inner">
                <span className="font-medium text-slate-300">1 / 1</span>
                <span className="text-slate-600">|</span>
                <button 
                  type="button"
                  onClick={() => setZoomScale(Math.max(0.6, zoomScale - 0.1))} 
                  className="hover:text-white cursor-pointer p-0.5" 
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] text-slate-300 min-w-[36px] text-center">{Math.round(zoomScale * 100)}%</span>
                <button 
                  type="button"
                  onClick={() => setZoomScale(Math.min(1.5, zoomScale + 0.1))} 
                  className="hover:text-white cursor-pointer p-0.5" 
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <span className="text-slate-600">|</span>
                <button 
                  type="button"
                  onClick={() => setZoomScale(1.0)} 
                  className="hover:text-white cursor-pointer p-0.5" 
                  title="Reset Scale"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <PenTool className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </div>

              {/* Upper Right Corner Controls: Print, Download PDF, Download DOCX, Close X */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1.5 hover:bg-slate-700/80 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                  title="Print Document"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  className="p-1.5 hover:bg-slate-700/80 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium"
                  title="Download PDF"
                >
                  {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span className="hidden sm:inline">PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  disabled={downloadingDocx}
                  className="p-1.5 hover:bg-slate-700/80 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium"
                  title="Download DOCX"
                >
                  {downloadingDocx ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  <span className="hidden sm:inline">DOCX</span>
                </button>

                {/* Close / Go Back X Option */}
                <button
                  type="button"
                  onClick={() => setShowViewCV(false)}
                  className="p-1.5 bg-slate-700/60 hover:bg-red-600 rounded-full text-slate-200 hover:text-white transition-colors cursor-pointer ml-2 shadow-xs"
                  title="Close Preview & Go Back"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Document View Canvas */}
            <div className="flex-1 overflow-y-auto bg-[#323639] p-4 sm:p-10 flex justify-center items-start">
              <div
                style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}
                className="print-content bg-white text-slate-900 shadow-2xl rounded-sm max-w-4xl w-full p-8 sm:p-14 border border-slate-300 font-serif text-left transition-transform duration-150 space-y-4 min-h-[1050px] my-4"
              >
                {/* Document Header */}
                <div className="text-center pb-3 border-b border-slate-800">
                  <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-widest text-[#5b21b6] mb-2">
                    {generatedCV.fullName}
                  </h1>
                  <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-xs text-slate-700 font-sans">
                    {generatedCV.location && <span>{generatedCV.location}</span>}
                    {generatedCV.email && <span>| Email: {generatedCV.email}</span>}
                    {generatedCV.phone && <span>| Phone: {generatedCV.phone}</span>}
                    {generatedCV.linkedin && <span>| LinkedIn: {generatedCV.linkedin}</span>}
                    {generatedCV.github && <span>| GitHub: {generatedCV.github}</span>}
                    {generatedCV.portfolio && <span>| Portfolio: {generatedCV.portfolio}</span>}
                  </div>
                </div>

                {/* Professional Summary */}
                {generatedCV.summary && (
                  <div className="space-y-1">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#5b21b6]">PROFESSIONAL SUMMARY</h2>
                    <p className="text-xs text-slate-800 leading-relaxed text-justify font-sans">{generatedCV.summary}</p>
                  </div>
                )}

                {/* Education */}
                {generatedCV.education && generatedCV.education.length > 0 && (
                  <div className="space-y-1.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#5b21b6]">EDUCATION</h2>
                    <div className="space-y-1.5 font-sans">
                      {generatedCV.education.map((edu, idx) => (
                        <div key={idx} className="text-xs space-y-0.5">
                          <div className="flex justify-between items-baseline font-bold text-slate-900">
                            <span>{edu.degree} <span className="font-normal text-slate-700">| {edu.school}</span></span>
                            {edu.year && <span className="text-[11px] text-slate-600 font-normal">{edu.year}</span>}
                          </div>
                          {(edu.coursework || edu.gpa) && (
                            <p className="text-[11px] text-slate-700 pl-3">
                              • <span className="font-semibold">Relevant Coursework: </span>
                              {edu.coursework || `GPA: ${edu.gpa}`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Skills */}
                {generatedCV.skills && generatedCV.skills.length > 0 && (
                  <div className="space-y-1">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#5b21b6]">TECHNICAL SKILLS</h2>
                    <div className="space-y-1 text-xs text-slate-800 font-sans">
                      {(Array.isArray(generatedCV.skills) ? generatedCV.skills : []).map((sGroup, idx) => {
                        if (typeof sGroup === 'string') {
                          return (
                            <div key={idx} className="flex items-start gap-1.5 pl-3">
                              <span>•</span>
                              <span>{sGroup}</span>
                            </div>
                          );
                        }
                        const items = Array.isArray(sGroup?.items) ? sGroup.items.join(', ') : String(sGroup?.items || '');
                        return (
                          <div key={idx} className="leading-snug">
                            <span className="font-bold text-slate-900">{sGroup.category}: </span>
                            <span className="text-slate-800">{items}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {generatedCV.projects && generatedCV.projects.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#5b21b6]">PROJECTS</h2>
                    <div className="space-y-2 font-sans">
                      {generatedCV.projects.map((proj, idx) => {
                        const cleanStack = sanitizeTechStack(proj.techStack);
                        const techStackStr = cleanStack.join(', ');
                        const titleLine = [proj.name || proj.title, proj.subtitle, techStackStr].filter(Boolean).join(' | ');
                        return (
                          <div key={idx} className="text-xs space-y-1">
                            <p className="font-bold text-slate-900">{titleLine}</p>
                            {Array.isArray(proj.description) ? (
                              <ul className="space-y-0.5 text-slate-800 pl-3">
                                {proj.description.map((bullet, bIdx) => (
                                  <li key={bIdx} className="flex items-start gap-1.5">
                                    <span>•</span>
                                    <span>{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-slate-800 pl-3 flex items-start gap-1.5">
                                <span>•</span>
                                <span>{proj.description}</span>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {generatedCV.experience && generatedCV.experience.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#5b21b6]">EXPERIENCE</h2>
                    <div className="space-y-2 font-sans">
                      {generatedCV.experience.map((exp, idx) => {
                        const headerLine = [exp.company, exp.role, exp.location, exp.duration].filter(Boolean).join(' | ');
                        return (
                          <div key={idx} className="text-xs space-y-1">
                            <p className="font-bold text-slate-900">{headerLine}</p>
                            {Array.isArray(exp.description) ? (
                              <ul className="space-y-0.5 text-slate-800 pl-3">
                                {exp.description.map((bullet, bIdx) => (
                                  <li key={bIdx} className="flex items-start gap-1.5">
                                    <span>•</span>
                                    <span>{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-slate-800 pl-3 flex items-start gap-1.5">
                                <span>•</span>
                                <span>{exp.description}</span>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Certifications & Achievements */}
                {(generatedCV.certifications || builderFormData.certifications) && (
                  <div className="space-y-1">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#5b21b6]">CERTIFICATIONS & ACHIEVEMENTS</h2>
                    <div className="text-xs text-slate-800 pl-3 space-y-0.5 font-sans">
                      {Array.isArray(generatedCV.certifications) ? (
                        generatedCV.certifications.map((cert, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span>•</span>
                            <span>{cert}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-start gap-1.5">
                          <span>•</span>
                          <span>{generatedCV.certifications || builderFormData.certifications}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {(generatedCV.languages || builderFormData.languages) && (
                  <div className="space-y-0.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#5b21b6]">LANGUAGES</h2>
                    <div className="text-xs text-slate-800 pl-3 flex items-start gap-1.5 font-sans">
                      <span>•</span>
                      <span>{Array.isArray(generatedCV.languages) ? generatedCV.languages.join(' | ') : (generatedCV.languages || builderFormData.languages)}</span>
                    </div>
                  </div>
                )}

                {/* Interests & Goals */}
                {(generatedCV.interests || builderFormData.interests) && (
                  <div className="space-y-0.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#5b21b6]">INTERESTS & GOALS</h2>
                    <div className="text-xs text-slate-800 pl-3 space-y-0.5 font-sans">
                      {Array.isArray(generatedCV.interests) ? (
                        generatedCV.interests.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span>•</span>
                            <span>{item}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-start gap-1.5">
                          <span>•</span>
                          <span>{generatedCV.interests || builderFormData.interests}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION: Skill Verification Success */}
      <AnimatePresence>
        {skillAddedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-bg-secondary border border-primary/30 text-text-primary p-4 rounded-2xl shadow-2xl flex items-center gap-3.5 max-w-md backdrop-blur-md"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-0.5 text-xs">
              <div className="font-extrabold text-text-primary flex items-center gap-1.5">
                <span>Skill Verified & CV Updated</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <div className="text-text-muted leading-relaxed">{skillAddedToast}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowViewCV(true);
                setSkillAddedToast(null);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer shadow-xs"
            >
              Review CV
            </button>
            <button
              type="button"
              onClick={() => setSkillAddedToast(null)}
              className="p-1 text-text-muted hover:text-text-primary rounded-full hover:bg-bg-primary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


