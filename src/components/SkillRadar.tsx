import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { CareerRoleConfig } from '../lib/careerTaxonomy';
import { Target, Sparkles, Award } from 'lucide-react';

interface SkillRadarProps {
  roleConfig: CareerRoleConfig;
  userSkillsRaw: any[];
  readinessScore?: number;
}

export const SkillRadar: React.FC<SkillRadarProps> = ({
  roleConfig,
  userSkillsRaw,
  readinessScore = 75
}) => {
  // Parse user skills to generate radar values across roleConfig's 5 categories
  const categories = roleConfig.radarCategories;
  const benchmarks = roleConfig.benchmarks;

  const parsedSkills = (userSkillsRaw || []).map((s: any) => {
    if (typeof s === 'string') return { name: s.trim().toLowerCase(), score: 75 };
    return { name: (s.name || s.title || '').trim().toLowerCase(), score: s.score || 75 };
  });

  // Calculate scores for each radar axis based on user's parsed skills
  const radarData = categories.map((catName, idx) => {
    const catKeywords = catName.toLowerCase().split(/[\s&/]+/);
    const matched = parsedSkills.filter(s => 
      catKeywords.some(kw => kw.length > 2 && s.name.includes(kw))
    );

    let score = 0;
    if (matched.length > 0) {
      const sum = matched.reduce((acc, curr) => acc + curr.score, 0);
      score = Math.round(sum / matched.length);
    } else {
      // Base score derived from overall readiness if user has skills
      const base = parsedSkills.length > 0 ? Math.max(30, Math.round(readinessScore * 0.75)) : 20;
      score = Math.min(100, base + (idx % 2 === 0 ? 10 : 0));
    }

    const benchmarkVal = idx === 0 ? benchmarks.cat1 :
                         idx === 1 ? benchmarks.cat2 :
                         idx === 2 ? benchmarks.cat3 :
                         idx === 3 ? benchmarks.cat4 : benchmarks.cat5;

    return {
      subject: catName,
      Current: score,
      Target: benchmarkVal,
      fullMark: 100
    };
  });

  return (
    <div className="bg-white border border-[#E4EAF4] rounded-[16px] p-6 shadow-[0_1px_2px_rgba(9,9,121,0.04),0_8px_24px_-12px_rgba(9,9,121,0.10)] space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#E4EAF4]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EEF3FF] text-[#1B2A8F] flex items-center justify-center font-bold">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-[#0B1533]">
              Competency Radar
            </h3>
            <p className="text-[12px] text-[#5A6B8C]">
              Benchmarked vs <strong className="text-[#1B2A8F]">{roleConfig.title}</strong> Industry Standard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[12px] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
            <span className="text-[#0B1533]">Current Capability</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#8A99B5]" />
            <span className="text-[#5A6B8C]">Target Standard</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="#E4EAF4" strokeDasharray="3 3" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#8A99B5', fontSize: 11, fontWeight: 500 }} 
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Target Standard"
              dataKey="Target"
              stroke="#8A99B5"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              fill="transparent"
            />
            <Radar
              name="Current Capability"
              dataKey="Current"
              stroke="#2563EB"
              strokeWidth={2}
              fill="#00B8DE"
              fillOpacity={0.18}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 text-[12px] text-[#5A6B8C] text-center bg-[#F4F7FC] rounded-xl p-2.5 border border-[#E4EAF4]">
        Radar axis standards automatically adapt to <strong className="text-[#0B1533]">{roleConfig.fieldCategory} ({roleConfig.field === 'tech' ? 'Technical Track' : 'Non-Tech Track'})</strong>
      </div>
    </div>
  );
};
