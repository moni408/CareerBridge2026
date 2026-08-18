import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../App';
import { motion } from 'motion/react';
import { getSkillColorClass, getSkillTextColorClass, getDeterministicSkillScore } from '../lib/skillColors';
import { calculateSkillGapAnalysis, registerDynamicRoleConfig } from '../lib/careerTaxonomy';
import { generateDynamicCareerTaxonomy } from '../services/geminiService';
import { SkillRadar } from './SkillRadar';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts';
import { 
  LayoutDashboard, Radar as RadarIcon, AlertTriangle, Briefcase, 
  FileText, Code, Upload, Info, CheckCircle2, ChevronRight,
  TrendingUp, Activity, User, ShieldCheck, Zap, Cloud, TestTube,
  Lock, Beaker, Terminal, Target, Plus, Trash2, Filter, Wrench, Users, Globe, Rocket
} from 'lucide-react';
import { AddSkillModal, SkillCategory } from './AddSkillModal';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

function inferCategory(s: any): SkillCategory {
  if (typeof s === 'object' && s !== null && s.category) {
    const cat = String(s.category);
    if (cat.includes('Soft')) return 'Soft Skills';
    if (cat.includes('Tools')) return 'Tools';
    if (cat.includes('Cloud') || cat.includes('DevOps')) return 'Cloud & DevOps';
    if (cat.includes('Lang')) return 'Languages';
    if (cat.includes('Tech')) return 'Technical';
  }
  const name = typeof s === 'string' ? s : (s?.name || s?.title || '');
  const lower = name.toLowerCase();

  if (['english', 'french', 'spanish', 'german', 'mandarin', 'japanese', 'bengali', 'hindi'].some(l => lower.includes(l))) {
    return 'Languages';
  }
  if (['git', 'github', 'figma', 'postman', 'jira', 'vs code', 'vscode', 'terminal', 'webpack', 'vite', 'npm'].some(t => lower.includes(t))) {
    return 'Tools';
  }
  if (['aws', 'gcp', 'azure', 'docker', 'k8s', 'kubernetes', 'ci/cd', 'terraform', 'nginx', 'cloud', 'devops'].some(c => lower.includes(c))) {
    return 'Cloud & DevOps';
  }
  if (['leadership', 'communication', 'problem solving', 'agile', 'scrum', 'teamwork', 'mentorship', 'time management', 'project management'].some(sk => lower.includes(sk))) {
    return 'Soft Skills';
  }
  return 'Technical';
}

export function SkillAudit() {
  const { profile, user, setView } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [aiTick, setAiTick] = useState(0);

  const targetRoleStr = profile?.targetRole || 'Software Engineer';
  const departmentStr = profile?.department || profile?.fieldOfStudy || '';
  const userSkillsRaw = profile?.skills || [];

  useEffect(() => {
    let isMounted = true;
    async function calibrate() {
      if (!targetRoleStr) return;
      try {
        const res = await generateDynamicCareerTaxonomy(targetRoleStr, departmentStr, userSkillsRaw);
        if (isMounted && res && res.title && Array.isArray(res.radarCategories) && res.radarCategories.length === 5) {
          registerDynamicRoleConfig({
            id: res.id || targetRoleStr.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            title: targetRoleStr,
            field: res.field || 'non-tech',
            fieldCategory: res.fieldCategory || 'Arts & Creative',
            description: res.description,
            requiredSkills: res.requiredSkills,
            radarCategories: res.radarCategories,
            benchmarks: res.benchmarks,
            sampleBridgeProjects: res.sampleBridgeProjects
          });
          setAiTick(prev => prev + 1);
        }
      } catch (err) {
        // Fallback preset active
      }
    }
    calibrate();
    return () => { isMounted = false; };
  }, [targetRoleStr, departmentStr]);

  // Real or derived skill strengths
  const allSkills = useMemo(() => {
    const rawSkills = profile?.skills || [];

    if (!profile?.profileAnalyzed || rawSkills.length === 0) {
      return [
        { name: 'React / Next.js', score: 88, category: 'Technical' as SkillCategory, reason: 'Core frontend framework proficiency', color: getSkillColorClass(88), textColor: getSkillTextColorClass(88) },
        { name: 'TypeScript', score: 82, category: 'Technical' as SkillCategory, reason: 'Strong typed JavaScript development', color: getSkillColorClass(82), textColor: getSkillTextColorClass(82) },
        { name: 'Node.js / Express', score: 68, category: 'Technical' as SkillCategory, reason: 'Backend API design and middleware', color: getSkillColorClass(68), textColor: getSkillTextColorClass(68) },
        { name: 'Agile & Scrum', score: 85, category: 'Soft Skills' as SkillCategory, reason: 'Cross-functional sprint coordination', color: getSkillColorClass(85), textColor: getSkillTextColorClass(85) },
        { name: 'Git & GitHub', score: 90, category: 'Tools' as SkillCategory, reason: 'Version control and PR workflows', color: getSkillColorClass(90), textColor: getSkillTextColorClass(90) },
        { name: 'Docker', score: 72, category: 'Cloud & DevOps' as SkillCategory, reason: 'Containerized deployment setups', color: getSkillColorClass(72), textColor: getSkillTextColorClass(72) },
      ];
    }
    
    return rawSkills.map((s: any, idx: number) => {
      const score = getDeterministicSkillScore(s, idx);
      const cat = inferCategory(s);
      return {
        name: typeof s === 'string' ? s : (s.name || s.title || 'Skill'),
        score: score,
        category: cat,
        reason: typeof s === 'object' && s?.reason ? s.reason : 'Analyzed from CV',
        color: getSkillColorClass(score),
        textColor: getSkillTextColorClass(score)
      };
    }).sort((a: any, b: any) => b.score - a.score);
  }, [profile]);

  // Categorical filtered skills
  const filteredSkills = useMemo(() => {
    if (selectedCategoryFilter === 'All') return allSkills;
    return allSkills.filter(s => s.category === selectedCategoryFilter);
  }, [allSkills, selectedCategoryFilter]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: allSkills.length,
      Technical: 0,
      'Soft Skills': 0,
      Tools: 0,
      'Cloud & DevOps': 0,
      Languages: 0
    };
    allSkills.forEach(s => {
      if (counts[s.category] !== undefined) {
        counts[s.category] += 1;
      }
    });
    return counts;
  }, [allSkills]);

  const handleDeleteSkill = async (skillToDeleteName: string) => {
    if (!user?.uid) return;
    try {
      const profileRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(profileRef);
      if (docSnap.exists()) {
        const existing = docSnap.data().skills || [];
        const updated = existing.filter((s: any) => {
          const name = typeof s === 'string' ? s : (s.name || s.title);
          return name.toLowerCase() !== skillToDeleteName.toLowerCase();
        });

        // Also remove from savedCV if present
        const savedCV = docSnap.data().savedCV;
        let updatePayload: any = { skills: updated };
        if (savedCV && Array.isArray(savedCV.skills)) {
          const cvSkills = savedCV.skills.map((grp: any) => {
            if (typeof grp === 'object' && grp !== null && Array.isArray(grp.items)) {
              return {
                ...grp,
                items: grp.items.filter((it: string) => it.toLowerCase() !== skillToDeleteName.toLowerCase())
              };
            }
            return grp;
          });
          savedCV.skills = cvSkills;
          localStorage.setItem(`saved_cv_${user.uid}`, JSON.stringify(savedCV));
          updatePayload.savedCV = savedCV;
        }

        await updateDoc(profileRef, updatePayload);
      }
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };

  // Active target role gap analysis aligned with student signup career taxonomy
  const gapAnalysis = useMemo(() => {
    return calculateSkillGapAnalysis(
      profile?.skills || [], 
      profile?.targetRole, 
      profile?.department || profile?.fieldOfStudy
    );
  }, [profile]);

  const roleConfig = gapAnalysis.roleConfig;

  const gaps = useMemo(() => {
    if (gapAnalysis.missingSkills.length > 0) {
      return gapAnalysis.missingSkills.map((sk) => ({
        title: sk.name,
        desc: `Required competency for ${roleConfig.title}.`,
        score: `Gap`,
        reco: `Gain ${sk.name} proficiency via practical projects`,
        priority: 'high',
        icon: Target
      }));
    }
    if (!profile?.skills || profile.skills.length === 0) return [];
    return profile.skills
      .slice(0, 3)
      .map((s: any) => ({
        title: typeof s === 'string' ? s : (s.name || s.title),
        desc: s.reason || `Improvement suggested based on ${roleConfig.title} standards.`,
        score: `${s.score || 70}%`,
        reco: `Advance your proficiency`,
        priority: (s.score || 70) < 60 ? 'high' : 'medium',
        icon: Target
      }));
  }, [gapAnalysis, roleConfig, profile]);

  return (
    <div className="space-y-8 pb-20">
      {/* Header with Navigation */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-text-primary">
              {activeTab === 'overview' && 'Skill Audit'}
              {activeTab === 'radar' && 'Radar Breakdown'}
              {activeTab === 'gaps' && 'Gap Analysis'}
              {activeTab === 'projects' && 'Project Portfolio'}
            </h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
              <Activity className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.1em]">
                {profile?.profileAnalyzed ? 'AI Analyzed' : 'Preview Mode'}
              </span>
            </div>
          </div>
          <p className="text-xs text-text-muted font-medium">
            {profile?.profileAnalyzed 
              ? `Analyzed from CV + ${profile?.projects?.length || 0} submitted projects`
              : 'Sample data · Automated inference engine'
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Skill</span>
          </button>

          <nav className="flex items-center p-1 bg-bg-secondary rounded-xl border border-border">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'radar', label: 'Radar', icon: RadarIcon },
              { id: 'gaps', label: 'Gaps', icon: AlertTriangle },
              { id: 'projects', label: 'Projects', icon: Briefcase },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === item.id 
                    ? 'bg-bg-primary text-text-primary shadow-sm border border-border' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {activeTab === 'overview' && (
        <>
          {/* Score Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Overall score', value: profile?.profileAnalyzed ? `${profile?.readinessScore || 0}` : '0', sub: profile?.profileAnalyzed ? '↑ 8pts vs last audit' : 'Awaiting CV audit', color: 'text-primary' },
              { label: 'Strengths found', value: profile?.profileAnalyzed ? allSkills.filter(s => s.score > 75).length : 0, sub: profile?.profileAnalyzed ? 'across multiple domains' : 'Awaiting CV audit', color: 'text-success' },
              { label: 'Gaps identified', value: profile?.profileAnalyzed ? gaps.length : 0, sub: profile?.profileAnalyzed ? `${gaps.filter(g => g.priority === 'high').length} high priority` : 'Awaiting CV audit', color: 'text-error' },
              { label: 'Market fit', value: profile?.profileAnalyzed ? `${gapAnalysis.alignmentPercent}%` : '0%', sub: roleConfig.title, color: 'text-accent' },
            ].map((stat, i) => (
              <div key={i} className="bg-bg-secondary border border-border rounded-2xl p-6 shadow-sm">
                <p className="text-[11px] font-bold text-text-secondary mb-3 uppercase tracking-[0.15em]">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold tracking-tight ${stat.color}`}>{stat.value}</span>
                  {stat.label === 'Overall score' && <span className="text-sm text-text-muted font-medium ml-1">/100</span>}
                </div>
                <p className="text-[10px] font-medium text-text-muted mt-2">{stat.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Skill Strengths Panel */}
            <div className="bg-bg-secondary border border-border rounded-[2.5rem] p-8 sm:p-10 shadow-premium flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text-primary">Skills & Competencies</h2>
                      <p className="text-xs text-text-muted">Filtered by domain category</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Skill</span>
                  </button>
                </div>

                {/* Categorical Filtering Tabs */}
                <div className="mb-6">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                    {['All', 'Technical', 'Soft Skills', 'Tools', 'Cloud & DevOps', 'Languages'].map((cat) => {
                      const isActive = selectedCategoryFilter === cat;
                      const count = categoryCounts[cat] || 0;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border ${
                            isActive
                              ? 'bg-primary text-white border-primary shadow-xs'
                              : 'bg-bg-primary text-text-secondary border-border hover:text-text-primary hover:bg-bg-tertiary'
                          }`}
                        >
                          <span>{cat}</span>
                          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                            isActive ? 'bg-white/20 text-white' : 'bg-bg-tertiary text-text-muted'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Scale Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-text-secondary bg-bg-primary/60 border border-border p-2.5 rounded-xl mb-6">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> ≥75% (Strong)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> 60-74% (Proficient)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 40-59% (Developing)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> &lt;40% (Gap)</span>
                </div>

                {/* Filtered Skills List */}
                <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
                  {filteredSkills.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-border rounded-2xl p-6">
                      <p className="text-xs font-semibold text-text-muted mb-2">No skills found in category "{selectedCategoryFilter}".</p>
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add {selectedCategoryFilter} Skill</span>
                      </button>
                    </div>
                  ) : (
                    filteredSkills.map((skill, i) => (
                      <div key={`${skill.name}-${i}`} className="group relative bg-bg-primary/50 border border-border/80 p-3.5 rounded-2xl hover:border-border transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary">{skill.name}</span>
                            <span className="px-2 py-0.5 rounded-md bg-bg-secondary text-[10px] font-semibold text-text-muted border border-border">
                              {skill.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black tabular-nums ${skill.textColor}`}>{skill.score}%</span>
                            <button
                              onClick={() => handleDeleteSkill(skill.name)}
                              title="Delete skill"
                              className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-500 transition-opacity cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${skill.score}%` }}
                            transition={{ duration: 0.8, delay: i * 0.05 }}
                            className={`h-full rounded-full ${skill.color}`} 
                          />
                        </div>
                        <p className="text-[10px] text-text-muted mt-1.5 font-medium italic truncate">
                          {skill.reason}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Synchronized Competency Radar Panel */}
            <div className="w-full">
              <SkillRadar 
                roleConfig={roleConfig}
                userSkillsRaw={profile?.skills || []}
                readinessScore={profile?.readinessScore || 75}
              />
            </div>
          </div>
        </>
      )}

      {activeTab === 'radar' && (
        <div className="space-y-6">
          <div className="bg-bg-secondary border border-border rounded-[2.5rem] p-8 shadow-sm space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-text-primary">
                Competency Radar & Career Alignment
              </h2>
              <p className="text-sm text-text-muted">
                High-fidelity capability radar benchmarked against industry standards for <strong className="text-primary">{roleConfig.title}</strong> ({roleConfig.fieldCategory} Track).
              </p>
            </div>
            
            <SkillRadar 
              roleConfig={roleConfig}
              userSkillsRaw={profile?.skills || []}
              readinessScore={profile?.readinessScore || 75}
            />
          </div>
        </div>
      )}

      {(activeTab === 'gaps' || activeTab === 'overview') && (
        <div className={`space-y-8 ${activeTab === 'overview' ? '' : 'min-h-[600px]'}`}>
          {/* Career Alignment Summary Card */}
          <div className="bg-bg-secondary border border-border rounded-[2.5rem] p-8 sm:p-10 shadow-premium relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full -mr-20 -mt-20" />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/15">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Target Career Path: {roleConfig.title} ({roleConfig.fieldCategory})</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                  Career Alignment & Competency Gaps
                </h2>
                <p className="text-xs sm:text-sm text-text-muted font-medium leading-relaxed">
                  {roleConfig.description} We compare your verified skills against industry benchmarks for <strong className="text-text-primary">{roleConfig.title}</strong> to identify missing core competencies and recommend bridge projects.
                </p>
              </div>

              <div className="flex items-center gap-6 p-4 sm:p-6 bg-bg-primary rounded-2xl border border-border shrink-0">
                <div className="text-center">
                  <div className="text-3xl font-black text-primary">{gapAnalysis.alignmentPercent}%</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-0.5">Role Match</div>
                </div>
                <div className="h-10 w-[1px] bg-border" />
                <div className="text-center">
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{gapAnalysis.possessedSkills.length}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-0.5">Skills Matched</div>
                </div>
                <div className="h-10 w-[1px] bg-border" />
                <div className="text-center">
                  <div className="text-3xl font-black text-rose-500">{gapAnalysis.missingSkills.length}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-0.5">Critical Gaps</div>
                </div>
              </div>
            </div>
          </div>

          {/* Gap Analysis & Strategic Guidance List */}
          <div className="bg-bg-secondary border border-border rounded-[2.5rem] p-8 sm:p-10 shadow-premium space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-error/10 rounded-xl text-error">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">Prioritized Skill Gaps</h3>
                  <p className="text-xs text-text-muted font-medium">Core requirements needed to reach 100% target alignment</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] font-bold text-primary px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                  {roleConfig.title} Standards
                </span>
                <span className="text-[10px] font-bold text-text-muted px-3 py-1.5 bg-bg-primary rounded-full border border-border">
                  AI Context
                </span>
              </div>
            </div>

            <div className="divide-y divide-border">
              {gaps.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h4 className="text-lg font-bold text-text-primary">All Core Requirements Covered!</h4>
                  <p className="text-xs text-text-muted max-w-md mx-auto font-medium">
                    You have verified competencies matching all required skill areas for {roleConfig.title}. Keep refining your projects!
                  </p>
                </div>
              ) : (
                gaps.map((gap, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="py-6 flex flex-col md:flex-row items-start gap-6 group hover:bg-bg-tertiary/20 transition-colors rounded-2xl px-4 -mx-4"
                  >
                    <div className={`p-3.5 rounded-2xl shrink-0 shadow-sm ${
                      gap.priority === 'high' ? 'bg-error/10 text-error' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      <gap.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <h4 className="text-lg font-bold text-text-primary">{gap.title}</h4>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                          gap.priority === 'high' ? 'bg-error text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {gap.priority} priority
                        </span>
                      </div>
                      <p className="text-[13px] text-text-secondary leading-relaxed mb-4 max-w-3xl font-medium">
                        {gap.desc} {gap.score && <span className="font-bold text-text-primary ml-1 underline decoration-primary/30 underline-offset-4">Score: {gap.score}</span>}
                      </p>
                      <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/5 border border-primary/10 rounded-xl text-[11px] font-bold text-primary group-hover:bg-primary group-hover:text-white transition-all cursor-pointer">
                        <Zap className="w-4 h-4" />
                        <span>GUIDANCE: {gap.reco}</span>
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Career Bridge Projects Guidance Subsection */}
          {roleConfig.sampleBridgeProjects && roleConfig.sampleBridgeProjects.length > 0 && (
            <div className="bg-bg-secondary border border-border rounded-[2.5rem] p-8 sm:p-10 shadow-premium space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">Recommended Bridge Projects</h3>
                    <p className="text-xs text-text-muted font-medium">Targeted practical projects to bridge your top competency gaps</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {roleConfig.sampleBridgeProjects.map((proj, idx) => (
                  <div key={idx} className="p-6 bg-bg-primary rounded-2xl border border-border space-y-4 flex flex-col justify-between hover:border-primary/40 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          To Gain: {proj.skillToGain}
                        </span>
                        <span className="text-[11px] font-medium text-text-muted">
                          {proj.estimatedHours}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-text-primary">{proj.title}</h4>
                      <p className="text-xs text-text-secondary leading-relaxed font-medium">
                        {proj.description}
                      </p>
                    </div>

                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-all cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Log Project or Skill to Profile</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(profile?.projects || [
            { name: 'Portfolio Engine', techStack: ['React', 'Tailwind', 'Firebase'], description: 'Real-time skill audit platform with AI integration and live updates.' },
            { name: 'Ecommerce API', techStack: ['Node.js', 'Express', 'Postgres'], description: 'Scalable backend architecture with complex relational database management.' },
            { name: 'Auth Gateway', techStack: ['OAuth2', 'JWT', 'TypeScript'], description: 'Secure authentication layer supporting multiple third-party providers.' }
          ]).map((project: any, i: number) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -5 }}
              className="bg-bg-secondary border border-border rounded-[2rem] p-8 space-y-6 hover:border-primary/50 transition-all group shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="p-4 bg-bg-primary rounded-2xl text-primary shadow-sm group-hover:bg-primary group-hover:text-white transition-all ring-1 ring-border">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-text-tertiary">
                    <Info className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary mb-2 line-clamp-1">{project.name || project.title || 'Inferred Project'}</h3>
                  <p className="text-[13px] text-text-secondary leading-relaxed line-clamp-3 font-medium opacity-80 italic">
                    {project.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border mt-4">
                {(Array.isArray(project.techStack) ? project.techStack : []).map((tech: string) => (
                  <span key={tech} className="text-[10px] font-bold text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                    {tech}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AddSkillModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
