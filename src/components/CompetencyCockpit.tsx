import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getRoleConfig, calculateSkillGapAnalysis, CAREER_ROLE_TAXONOMY, registerDynamicRoleConfig } from '../lib/careerTaxonomy';
import { generateDynamicCareerTaxonomy } from '../services/geminiService';
import { SkillRadar } from './SkillRadar';
import { 
  Sparkles, Target, Award, Rocket, CheckCircle2, AlertCircle, 
  ArrowUpRight, BookOpen, Briefcase, Plus, RefreshCw, Layers,
  Compass, ChevronRight, HelpCircle, Code2, FileText, Share2, Edit3, X, Loader2
} from 'lucide-react';

interface CompetencyCockpitProps {
  profile: any;
  jobsList: any[];
  setView: (view: any) => void;
  onOpenAddSkillModal: (suggestedSkill?: string) => void;
  onUpdateTargetRole: (newRole: string) => Promise<void>;
}

export const CompetencyCockpit: React.FC<CompetencyCockpitProps> = ({
  profile,
  jobsList = [],
  setView,
  onOpenAddSkillModal,
  onUpdateTargetRole
}) => {
  const [isEditingRoleModal, setIsEditingRoleModal] = useState(false);
  const [selectedRoleInput, setSelectedRoleInput] = useState(profile?.targetRole || 'Software Engineer');
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isCalibratingAI, setIsCalibratingAI] = useState(false);
  const [aiTick, setAiTick] = useState(0);

  const targetRoleStr = profile?.targetRole || 'Software Engineer';
  const departmentStr = profile?.department || profile?.fieldOfStudy || '';
  const userSkillsRaw = profile?.skills || [];

  // Recalibrate AI Taxonomy when role or CV skills change
  const triggerAiCalibration = async () => {
    if (!targetRoleStr) return;
    setIsCalibratingAI(true);
    try {
      const res = await generateDynamicCareerTaxonomy(targetRoleStr, departmentStr, userSkillsRaw);
      if (res && res.title && Array.isArray(res.radarCategories) && res.radarCategories.length === 5) {
        registerDynamicRoleConfig({
          id: res.id || targetRoleStr.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: targetRoleStr, // Preserve user's role title
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
    } catch (e) {
      console.warn("AI calibration note (using preset taxonomy fallback):", e);
    } finally {
      setIsCalibratingAI(false);
    }
  };

  useEffect(() => {
    triggerAiCalibration();
  }, [targetRoleStr, departmentStr]);

  // Skill gap calculation using taxonomy (incorporating dynamic AI cache)
  const gapAnalysis = calculateSkillGapAnalysis(userSkillsRaw, targetRoleStr, departmentStr);
  const roleConfig = gapAnalysis.roleConfig;
  const isTech = gapAnalysis.isTech;

  const handleSaveRole = async () => {
    if (!selectedRoleInput.trim()) return;
    setIsSavingRole(true);
    try {
      await onUpdateTargetRole(selectedRoleInput.trim());
      setIsEditingRoleModal(false);
    } catch (e) {
      console.error("Failed to update target role:", e);
    } finally {
      setIsSavingRole(false);
    }
  };

  const userSkillsListForJobMatch = userSkillsRaw.map((s: any) => 
    (typeof s === 'string' ? s : s?.name || '').trim()
  ).filter(Boolean);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 md:px-4 py-2">
      {/* ─── 1. TOP COCKPIT HEADER WITH TRACK BADGE & ROLE SELECTOR ─── */}
      <div className="bg-white border border-[#E4EAF4] rounded-[16px] p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4EAF4] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge-pill ${isTech ? 'badge-blue' : 'badge-cyan'}`}>
                {isTech ? <Code2 className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                <span>{roleConfig.fieldCategory} Track</span>
              </span>

              <span className="badge-pill bg-[#F4F7FC] text-[#5A6B8C]">
                {profile?.university || 'Academic Workspace'}
              </span>
            </div>

            <h1 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#0B1533] flex items-center gap-2 pt-1">
              <span>Competency Cockpit</span>
              <Sparkles className="w-5 h-5 text-[#00B8DE] shrink-0" />
            </h1>

            <p className="text-[13px] text-[#5A6B8C]">
              Personalized career radar & skill gap analysis calibrated for <strong className="text-[#0B1533]">{roleConfig.title}</strong>
            </p>
          </div>

          {/* Target Role Selector & AI Recalibrate Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={triggerAiCalibration}
              disabled={isCalibratingAI}
              className="btn-secondary text-[12px] h-9"
              title="Calibrate taxonomy & radar using Gemini AI"
            >
              {isCalibratingAI ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1B2A8F]" />
                  <span>AI Calibrating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#00B8DE]" />
                  <span>AI Recalibrate</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setSelectedRoleInput(targetRoleStr);
                setIsEditingRoleModal(true);
              }}
              className="btn-secondary text-[12px] h-9"
            >
              <Target className="w-4 h-4 text-[#1B2A8F]" />
              <span>Target Role: <strong className="text-[#1B2A8F]">{roleConfig.title}</strong></span>
              <Edit3 className="w-3.5 h-3.5 text-[#8A99B5]" />
            </button>

            <button
              onClick={() => onOpenAddSkillModal()}
              className="btn-primary text-[13px] h-9"
            >
              <Plus className="w-4 h-4" />
              <span>Add Skill / Project</span>
            </button>
          </div>
        </div>

        {/* ─── 2. ADAPTIVE FIELD METRIC CARDS ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Alignment Match */}
          <div className="bg-[#F4F7FC] border border-[#E4EAF4] rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-[12px] text-[#5A6B8C] font-medium">
              <span>Career Path Alignment</span>
              <Award className="w-4 h-4 text-[#1B2A8F]" />
            </div>
            <p className="text-[28px] font-semibold text-[#0B1533] tabular-nums leading-none pt-1">
              {gapAnalysis.alignmentPercent}%
            </p>
            <p className="text-[12px] text-[#16A34A] font-medium pt-1">
              vs {roleConfig.title} Benchmark
            </p>
          </div>

          {/* Card 2: Possessed Skills */}
          <div className="bg-[#F4F7FC] border border-[#E4EAF4] rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-[12px] text-[#5A6B8C] font-medium">
              <span>Verified Core Skills</span>
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            </div>
            <p className="text-[28px] font-semibold text-[#0B1533] tabular-nums leading-none pt-1">
              {gapAnalysis.possessedSkills.length} / {roleConfig.requiredSkills.length}
            </p>
            <p className="text-[12px] text-[#5A6B8C] pt-1">
              Matched in user profile & CV
            </p>
          </div>

          {/* Card 3: Missing Skill Gaps */}
          <div className="bg-[#F4F7FC] border border-[#E4EAF4] rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-[12px] text-[#5A6B8C] font-medium">
              <span>Critical Skill Gaps</span>
              <AlertCircle className="w-4 h-4 text-[#D97706]" />
            </div>
            <p className="text-[28px] font-semibold text-[#0B1533] tabular-nums leading-none pt-1">
              {gapAnalysis.missingSkills.length}
            </p>
            <p className="text-[12px] text-[#D97706] font-medium pt-1">
              Requires Bridge Project
            </p>
          </div>

          {/* Card 4: Field-Specific Portfolio Metric */}
          <div className="bg-[#F4F7FC] border border-[#E4EAF4] rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-[12px] text-[#5A6B8C] font-medium">
              <span>{isTech ? 'Code Artifacts & Repos' : 'Publications & Reports'}</span>
              {isTech ? <Code2 className="w-4 h-4 text-[#1B2A8F]" /> : <FileText className="w-4 h-4 text-[#00B8DE]" />}
            </div>
            <p className="text-[28px] font-semibold text-[#0B1533] tabular-nums leading-none pt-1">
              {profile?.projects?.length || (profile?.skills?.length > 0 ? 3 : 0)}
            </p>
            <p className="text-[12px] text-[#5A6B8C] pt-1">
              {isTech ? 'GitHub & Project builds' : 'Policy / Article portfolio entries'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. SKILL RADAR + SKILL GAP REMEDIATION ROADMAP ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Chart (5 cols) */}
        <div className="lg:col-span-5">
          <SkillRadar 
            roleConfig={roleConfig}
            userSkillsRaw={userSkillsRaw}
            readinessScore={profile?.readinessScore || profile?.meanSkillScore || 75}
          />
        </div>

        {/* Skill Gap & Guidance Engine (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E4EAF4] rounded-[16px] p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#E4EAF4] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EEF3FF] text-[#1B2A8F] flex items-center justify-center font-bold">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[#0B1533]">
                  Career Alignment & Skill Gap Guidance
                </h3>
                <p className="text-[12px] text-[#5A6B8C]">
                  Step-by-step roadmap to bridge from current skills to <strong className="text-[#0B1533]">{roleConfig.title}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Missing Skills Pills */}
          {gapAnalysis.missingSkills.length > 0 ? (
            <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl space-y-2">
              <span className="text-[12px] font-semibold text-[#B45309] flex items-center gap-1.5 uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0" />
                <span>Detected Skill Gaps for {roleConfig.title}:</span>
              </span>

              <div className="flex flex-wrap gap-2 pt-1">
                {gapAnalysis.missingSkills.map((sk, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 rounded-lg bg-white border border-[#FDE68A] text-[#92400E] text-[12px] font-medium shadow-2xs flex items-center gap-1.5"
                  >
                    <span>{sk.name}</span>
                    <button 
                      onClick={() => onOpenAddSkillModal(sk.name)}
                      className="ml-1 text-[#2563EB] hover:underline font-semibold cursor-pointer"
                      title="Add skill to profile"
                    >
                      + Add
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
              <div>
                <h4 className="text-[13px] font-semibold text-[#166534]">
                  Strong Career Skill Alignment!
                </h4>
                <p className="text-[12px] text-[#15803D]">
                  Your current profile possesses all required core skills for {roleConfig.title}. Complete bridge projects to boost your readiness score further.
                </p>
              </div>
            </div>
          )}

          {/* Recommended Bridge Projects */}
          <div className="space-y-3">
            <h4 className="text-[12px] font-medium uppercase tracking-wider text-[#8A99B5] flex items-center gap-1.5">
              <Rocket className="w-4 h-4 text-[#1B2A8F]" />
              <span>Recommended Bridge Projects</span>
            </h4>

            <div className="space-y-2.5">
              {roleConfig.sampleBridgeProjects.map((proj, idx) => (
                <div 
                  key={idx} 
                  className="p-3.5 bg-[#F4F7FC] border border-[#E4EAF4] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#2563EB] transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#0B1533]">
                        {proj.title}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#EEF3FF] text-[#1B2A8F] text-[11px] font-medium">
                        {proj.estimatedHours}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#5A6B8C] leading-relaxed">
                      {proj.description}
                    </p>
                  </div>

                  <button
                    onClick={() => onOpenAddSkillModal(proj.skillToGain)}
                    className="btn-secondary text-[12px] h-8 shrink-0"
                  >
                    <span>Complete & Add Skill</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. TARGET ROLE EDIT MODAL ─── */}
      <AnimatePresence>
        {isEditingRoleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#E4EAF4] rounded-[16px] max-w-md w-full p-6 space-y-5 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[#E4EAF4] pb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#1B2A8F]" />
                  <h3 className="text-[16px] font-semibold text-[#0B1533]">
                    Select Target Career Path
                  </h3>
                </div>
                <button 
                  onClick={() => setIsEditingRoleModal(false)}
                  className="p-1 text-[#8A99B5] hover:text-[#0B1533] rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[12px] text-[#5A6B8C] leading-relaxed">
                Choose or type your desired career role. The Competency Cockpit radar, skill gap analysis, and job matching will immediately recalibrate!
              </p>

              {/* Quick Select Buttons */}
              <div className="space-y-2">
                <label className="text-[12px] font-semibold text-[#0B1533] block">
                  Quick Select Popular Roles:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(CAREER_ROLE_TAXONOMY).map((roleKey) => (
                    <button
                      key={roleKey}
                      type="button"
                      onClick={() => setSelectedRoleInput(roleKey)}
                      className={`px-2.5 py-1 rounded-lg text-[12px] font-medium border transition-all cursor-pointer ${
                        selectedRoleInput === roleKey
                          ? 'bg-[#1B2A8F] text-white border-[#1B2A8F]'
                          : 'bg-[#F4F7FC] text-[#5A6B8C] border-[#E4EAF4] hover:border-[#2563EB]'
                      }`}
                    >
                      {roleKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input */}
              <div className="space-y-1 pt-2">
                <label className="text-[12px] font-semibold text-[#0B1533] block">
                  Or Custom Target Role:
                </label>
                <input 
                  type="text" 
                  value={selectedRoleInput}
                  onChange={(e) => setSelectedRoleInput(e.target.value)}
                  placeholder="e.g. Public Policy Specialist, Frontend Engineer"
                  className="w-full px-3.5 py-2.5 bg-[#F4F7FC] border border-[#E4EAF4] rounded-xl text-[12px] outline-none text-[#0B1533] focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4EAF4]">
                <button
                  type="button"
                  onClick={() => setIsEditingRoleModal(false)}
                  className="btn-secondary text-[12px] h-9"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRole}
                  disabled={isSavingRole}
                  className="btn-primary text-[12px] h-9"
                >
                  {isSavingRole ? 'Saving...' : 'Apply & Recalibrate'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
