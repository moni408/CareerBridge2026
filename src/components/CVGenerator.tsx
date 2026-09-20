import React, { useState, useRef } from 'react';
import { useAuth } from '../App';
import { generateCV, GeneratedCV, sanitizeTechStack } from '../services/geminiService';
import { FileText, Loader2, Download, RefreshCw, Plus, Trash2, Sparkles, User, Mail, Phone, Briefcase, GraduationCap, Code, ArrowRight, CheckCircle2, MapPin, Globe, Linkedin, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { pdf } from '@react-pdf/renderer';
import { CVDocument } from './CVDocument';

export function CVGenerator() {
  const { profile } = useAuth();
  const resumeRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [generatedCV, setGeneratedCV] = useState<GeneratedCV | null>(null);
  const [formData, setFormData] = useState({
    fullName: profile?.displayName || '',
    role: profile?.role === 'mentor' ? 'Industry Mentor' : 'Graduate Candidate',
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
      setFormData({ ...formData, education: [...formData.education, { school: '', degree: '', year: '', gpa: '' }] });
    } else if (field === 'experience') {
      setFormData({ ...formData, experience: [...formData.experience, { company: '', role: '', duration: '', description: '' }] });
    } else {
      setFormData({ ...formData, projects: [...formData.projects, { name: '', techStack: '', description: '' }] });
    }
  };

  const handleRemoveField = (field: 'education' | 'experience' | 'projects', index: number) => {
    const newList = [...formData[field]].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newList });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const cv = await generateCV(formData);
      setGeneratedCV(cv);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!generatedCV) return;
    
    setDownloadingPDF(true);
    try {
      // Generate the PDF blob using @react-pdf/renderer
      // This is vector-based, sharp, and handles multiple pages perfectly.
      const blob = await pdf(<CVDocument data={generatedCV} />).toBlob();
      saveAs(blob, `CV_${generatedCV.fullName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      // Fallback
      window.print();
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!generatedCV) return;
    setDownloadingDocx(true);

    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: generatedCV.fullName,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `${generatedCV.role} | ${generatedCV.location}`, italics: true }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `${generatedCV.email} | ${generatedCV.phone} | ${generatedCV.github}` }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            
            new Paragraph({ text: "CAREER OBJECTIVE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: generatedCV.summary, spacing: { after: 200 } }),

            new Paragraph({ text: "EDUCATION", heading: HeadingLevel.HEADING_3 }),
            ...generatedCV.education.flatMap(edu => [
              new Paragraph({ children: [new TextRun({ text: edu.degree, bold: true })] }),
              new Paragraph({ text: `${edu.school} | ${edu.year}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}`, spacing: { after: 100 } }),
            ]),

            new Paragraph({ text: "WORK EXPERIENCE", heading: HeadingLevel.HEADING_3 }),
            ...generatedCV.experience.flatMap(exp => [
              new Paragraph({ children: [new TextRun({ text: exp.role, bold: true }), new TextRun({ text: ` at ${exp.company}`, bold: true })] }),
              new Paragraph({ children: [new TextRun({ text: exp.duration, italics: true })] }),
              ...exp.description.map(bullet => new Paragraph({ text: bullet, bullet: { level: 0 } })),
              new Paragraph({ text: "", spacing: { after: 100 } }),
            ]),

            new Paragraph({ text: "PROJECTS", heading: HeadingLevel.HEADING_3 }),
            ...generatedCV.projects.flatMap(proj => [
              new Paragraph({ children: [new TextRun({ text: proj.name || proj.title || 'Project', bold: true }), new TextRun({ text: ` (${sanitizeTechStack(proj.techStack).join(', ')})`, italics: true })] }),
              ...(Array.isArray(proj.description) ? proj.description : proj.description ? [String(proj.description)] : []).map(bullet => new Paragraph({ text: bullet, bullet: { level: 0 } })),
              new Paragraph({ text: "", spacing: { after: 100 } }),
            ]),
            
            new Paragraph({ text: "SKILLS", heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: (Array.isArray(generatedCV.skills) ? generatedCV.skills : []).map(s => typeof s === 'string' ? s : `${s.category || 'Skills'}: ${Array.isArray(s.items) ? s.items.join(', ') : (s.items || '')}`).join(' | ') }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `CV_${generatedCV.fullName.replace(/\s+/g, '_')}.docx`);
    } catch (err) {
      console.error('Docx Generation Error:', err);
    } finally {
      setDownloadingDocx(false);
    }
  };

  return (
    <div className="w-full mx-auto space-y-16 pb-32 px-6 py-12 bg-bg-primary min-h-screen">
      <header className="space-y-4">
        <div className="flex items-center gap-3 px-3 py-1.5 bg-primary-light rounded-full border border-primary/10 w-fit">
          <ArrowRight className="w-3.5 h-3.5 text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">STEP 02: CONTENT BUILDER</p>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight leading-tight">
          AI CV Generator
        </h1>
        <p className="text-lg text-text-secondary font-light leading-relaxed max-w-2xl">
          Crafting high-impact professional resumes. Our AI optimizes your profile to stand out to recruiters and hiring managers.
        </p>
      </header>

      <div className="flex flex-col xl:flex-row gap-16">
        {/* Form Section */}
        <div className="flex-1 space-y-12">
          <div className="bg-bg-secondary border border-border rounded-[2.5rem] p-12 space-y-12 shadow-sm">
            <div className="space-y-8">
              <div className="flex items-center gap-4 pb-6 border-b border-border">
                <div className="p-2 bg-primary-light rounded-lg text-primary shadow-sm">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">Personal Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full p-4 rounded-xl bg-bg-primary border border-border focus:border-primary outline-none transition-all text-text-primary shadow-inner"
                    placeholder="E.G. JOHN DOE"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-4 rounded-xl bg-bg-primary border border-border focus:border-primary outline-none transition-all text-text-primary shadow-inner"
                    placeholder="john.doe@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-muted uppercase tracking-wider ml-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3.5 rounded-lg bg-base-content/[0.03] border border-base-content/5 focus:border-primary outline-none transition-all text-sm text-base-content"
                    placeholder="+8801XXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-muted uppercase tracking-wider ml-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-3.5 rounded-lg bg-base-content/[0.03] border border-base-content/5 focus:border-primary outline-none transition-all text-sm text-base-content"
                    placeholder="Dhaka, Bangladesh"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-muted uppercase tracking-wider ml-1">GitHub</label>
                  <input
                    type="text"
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    className="w-full p-3.5 rounded-lg bg-base-content/[0.03] border border-base-content/5 focus:border-primary outline-none transition-all text-sm text-base-content"
                    placeholder="github.com/username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-muted uppercase tracking-wider ml-1">LinkedIn</label>
                  <input
                    type="text"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    className="w-full p-3.5 rounded-lg bg-base-content/[0.03] border border-base-content/5 focus:border-primary outline-none transition-all text-sm text-base-content"
                    placeholder="linkedin.com/in/username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-muted uppercase tracking-wider ml-1">Portfolio</label>
                  <input
                    type="text"
                    value={formData.portfolio}
                    onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                    className="w-full p-3.5 rounded-lg bg-base-content/[0.03] border border-base-content/5 focus:border-primary outline-none transition-all text-sm text-base-content"
                    placeholder="portfolio.dev"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted uppercase tracking-wider ml-1">Skills (Comma Separated)</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full p-3.5 rounded-lg bg-base-content/[0.03] border border-base-content/5 focus:border-primary outline-none transition-all text-sm text-base-content"
                  placeholder="React, Node.js, etc."
                />
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-4 pb-6 border-b border-border">
                <div className="p-2 bg-secondary-light rounded-lg text-secondary shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">Professional Summary</h3>
              </div>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="DESCRIBE YOUR PROFESSIONAL STRENGTHS AND CAREER GOALS..."
                className="w-full p-6 rounded-xl bg-bg-primary border border-border focus:border-primary outline-none transition-all h-40 resize-none text-text-primary leading-relaxed shadow-inner"
              />
            </div>

            {/* Education */}
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-base-content/10">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-accent-blue" />
                  <h3 className="text-[11px] font-bold text-accent-blue uppercase tracking-[0.2em]">Education</h3>
                </div>
                <button 
                  onClick={() => handleAddField('education')} 
                  className="text-[10px] font-bold text-primary hover:text-base-content transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> 
                  ADD RECORD
                </button>
              </div>
              <div className="space-y-4">
                {formData.education.map((edu, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-5 bg-base-content/[0.02] rounded-xl border border-base-content/5 space-y-4 relative group"
                  >
                    {formData.education.length > 1 && (
                      <button 
                        onClick={() => handleRemoveField('education', i)}
                        className="absolute top-4 right-4 p-2 text-base-content/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <input
                      placeholder="School or University"
                      value={edu.school}
                      onChange={(e) => {
                        const newEdu = [...formData.education];
                        newEdu[i].school = e.target.value;
                        setFormData({ ...formData, education: newEdu });
                      }}
                      className="w-full p-3 bg-transparent border-b border-base-content/5 focus:border-primary outline-none transition-all text-base font-medium"
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        placeholder="Degree"
                        value={edu.degree}
                        onChange={(e) => {
                          const newEdu = [...formData.education];
                          newEdu[i].degree = e.target.value;
                          setFormData({ ...formData, education: newEdu });
                        }}
                        className="w-full p-2.5 bg-base-content/[0.03] border border-base-content/5 rounded-lg outline-none transition-all text-xs"
                      />
                      <input
                        placeholder="Year"
                        value={edu.year}
                        onChange={(e) => {
                          const newEdu = [...formData.education];
                          newEdu[i].year = e.target.value;
                          setFormData({ ...formData, education: newEdu });
                        }}
                        className="w-full p-2.5 bg-base-content/[0.03] border border-base-content/5 rounded-lg outline-none transition-all text-xs"
                      />
                      <input
                        placeholder="GPA"
                        value={edu.gpa}
                        onChange={(e) => {
                          const newEdu = [...formData.education];
                          newEdu[i].gpa = e.target.value;
                          setFormData({ ...formData, education: newEdu });
                        }}
                        className="w-full p-2.5 bg-base-content/[0.03] border border-base-content/5 rounded-lg outline-none transition-all text-xs"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-base-content/10">
                <div className="flex items-center gap-3">
                  <Code className="w-4 h-4 text-accent-blue" />
                  <h3 className="text-[11px] font-bold text-accent-blue uppercase tracking-[0.2em]">Projects</h3>
                </div>
                <button 
                  onClick={() => handleAddField('projects')} 
                  className="text-[10px] font-bold text-primary hover:text-base-content transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ADD RECORD
                </button>
              </div>
              <div className="space-y-4">
                {formData.projects.map((proj, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-5 bg-base-content/[0.02] rounded-xl border border-base-content/5 space-y-4 relative group"
                  >
                    {formData.projects.length > 1 && (
                      <button 
                        onClick={() => handleRemoveField('projects', i)}
                        className="absolute top-4 right-4 p-2 text-base-content/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <input
                      placeholder="Project Name"
                      value={proj.name}
                      onChange={(e) => {
                        const newProj = [...formData.projects];
                        newProj[i].name = e.target.value;
                        setFormData({ ...formData, projects: newProj });
                      }}
                      className="w-full p-3 bg-transparent border-b border-base-content/5 focus:border-primary outline-none transition-all text-base font-medium"
                    />
                    <input
                      placeholder="Tech Stack"
                      value={proj.techStack}
                      onChange={(e) => {
                        const newProj = [...formData.projects];
                        newProj[i].techStack = e.target.value;
                        setFormData({ ...formData, projects: newProj });
                      }}
                      className="w-full p-2.5 bg-base-content/[0.03] border border-base-content/5 rounded-lg outline-none transition-all text-xs"
                    />
                    <textarea
                      placeholder="Project details..."
                      value={proj.description}
                      onChange={(e) => {
                        const newProj = [...formData.projects];
                        newProj[i].description = e.target.value;
                        setFormData({ ...formData, projects: newProj });
                      }}
                      className="w-full p-3 bg-base-content/[0.03] border border-base-content/5 rounded-lg outline-none transition-all text-xs h-24 resize-none leading-relaxed"
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-base-content/10">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-accent-blue" />
                  <h3 className="text-[11px] font-bold text-accent-blue uppercase tracking-[0.2em]">Experience</h3>
                </div>
                <button 
                  onClick={() => handleAddField('experience')} 
                  className="text-[10px] font-bold text-primary hover:text-base-content transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ADD RECORD
                </button>
              </div>
              <div className="space-y-4">
                {formData.experience.map((exp, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-5 bg-base-content/[0.02] rounded-xl border border-base-content/5 space-y-4 relative group"
                  >
                    {formData.experience.length > 1 && (
                      <button 
                        onClick={() => handleRemoveField('experience', i)}
                        className="absolute top-4 right-4 p-2 text-base-content/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <input
                      placeholder="Company or Organization"
                      value={exp.company}
                      onChange={(e) => {
                        const newExp = [...formData.experience];
                        newExp[i].company = e.target.value;
                        setFormData({ ...formData, experience: newExp });
                      }}
                      className="w-full p-3 bg-transparent border-b border-base-content/5 focus:border-primary outline-none transition-all text-base font-medium"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        placeholder="Job Title"
                        value={exp.role}
                        onChange={(e) => {
                          const newExp = [...formData.experience];
                          newExp[i].role = e.target.value;
                          setFormData({ ...formData, experience: newExp });
                        }}
                        className="w-full p-2.5 bg-base-content/[0.03] border border-base-content/5 rounded-lg outline-none transition-all text-xs"
                      />
                      <input
                        placeholder="Duration"
                        value={exp.duration}
                        onChange={(e) => {
                          const newExp = [...formData.experience];
                          newExp[i].duration = e.target.value;
                          setFormData({ ...formData, experience: newExp });
                        }}
                        className="w-full p-2.5 bg-base-content/[0.03] border border-base-content/5 rounded-lg outline-none transition-all text-xs"
                      />
                    </div>
                    <textarea
                      placeholder="Achievements and responsibilities..."
                      value={exp.description}
                      onChange={(e) => {
                        const newExp = [...formData.experience];
                        newExp[i].description = e.target.value;
                        setFormData({ ...formData, experience: newExp });
                      }}
                      className="w-full p-3 bg-base-content/[0.03] border border-base-content/5 rounded-lg outline-none transition-all text-xs h-24 resize-none leading-relaxed"
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Languages, Interests, Certifications */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-3 h-3" /> Languages
                </label>
                <textarea
                  value={formData.languages}
                  onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                  placeholder="E.G. BANGLA, ENGLISH..."
                  className="w-full p-3 rounded-lg bg-base-content/[0.03] border border-base-content/5 focus:border-primary outline-none transition-all h-20 resize-none text-[10px] text-base-content"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Interests
                </label>
                <textarea
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  placeholder="E.G. TECH BLOGGING..."
                  className="w-full p-3 rounded-lg bg-base-content/[0.03] border border-base-content/5 focus:border-primary outline-none transition-all h-20 resize-none text-[10px] text-base-content"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3" /> Certs
                </label>
                <textarea
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                  placeholder="E.G. AWS CERTIFIED..."
                  className="w-full p-3 rounded-lg bg-base-content/[0.03] border border-base-content/5 focus:border-primary outline-none transition-all h-20 resize-none text-[10px] text-base-content"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full h-12 rounded-lg bg-primary text-base-navy font-bold text-[13px] uppercase tracking-[0.1em] flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {generating ? 'Engine Processing...' : 'Generate High-Fidelity Resume'}
            </button>
          </div>
        </div>

        {/* Preview Section */}
        <div className="xl:w-[500px] h-fit sticky top-12">
          <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col min-h-[700px] border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center bg-bg-secondary">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-[10px] font-bold text-text-primary uppercase tracking-widest">High Fidelity Preview</h3>
              </div>
              {generatedCV && (
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 shadow-sm"
                  >
                    {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {generating ? 'Regenerating...' : 'Regenerate'}
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloadingPDF}
                    className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/20 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {downloadingPDF ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    PDF
                  </button>
                  <button
                    onClick={handleDownloadDocx}
                    disabled={downloadingDocx}
                    className="flex items-center gap-2 bg-text-primary/5 px-4 py-2 rounded-lg text-[10px] font-bold text-text-primary hover:bg-text-primary/10 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {downloadingDocx ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                    DOCX
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar bg-bg-tertiary/20 p-8">
              <AnimatePresence mode="wait">
                {generatedCV ? (
                  <motion.div 
                    key="cv"
                    ref={resumeRef}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white text-[#111827] p-10 border border-[#f3f4f6] min-h-[11in] w-full shadow-lg font-sans print-content text-[10px]"
                  >
                    {/* Simplified preview for UI */}
                    <div className="space-y-6">
                      <div className="text-center pb-6 border-b border-primary/20 space-y-2">
                        <h1 className="text-3xl font-bold uppercase tracking-tight">{generatedCV.fullName}</h1>
                        <p className="text-primary font-bold italic">{generatedCV.role}</p>
                      </div>
                      <section className="space-y-2">
                        <h4 className="text-[8px] font-bold text-white bg-[#0D1B2A] px-2 py-0.5 inline-block rounded-r-full tracking-[0.2em]">SUMMARY</h4>
                        <p className="text-[#4b5563] leading-relaxed italic">{generatedCV.summary}</p>
                      </section>
                      <section className="space-y-2">
                        <h4 className="text-[8px] font-bold text-white bg-[#0D1B2A] px-2 py-0.5 inline-block rounded-r-full tracking-[0.2em]">EXPERIENCE</h4>
                        {generatedCV.experience.map((exp, i) => (
                          <div key={i} className="mb-2">
                            <p className="font-bold flex justify-between"><span>{exp.role} @ {exp.company}</span> <span className="text-[7px] text-gray-400">{exp.duration}</span></p>
                          </div>
                        ))}
                      </section>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20"
                  >
                    <div className="w-20 h-20 rounded-full bg-bg-primary flex items-center justify-center shadow-inner">
                      <FileText className="w-10 h-10 text-text-muted/20" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-text-primary">Document Pending</h4>
                      <p className="text-sm font-normal text-text-muted leading-relaxed max-w-xs mx-auto">
                        Fill in your record details on the left to initialize the high-fidelity professional resume builder.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
