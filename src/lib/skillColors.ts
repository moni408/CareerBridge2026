export function getSkillColorClass(score: number): string {
  if (score >= 75) return 'bg-blue-600';  // Dark Blue (75% or up)
  if (score >= 60) return 'bg-sky-400';   // Lighter shade of blue (60-74%)
  if (score >= 40) return 'bg-amber-400';  // Yellow (40-59%)
  return 'bg-red-500';                    // Red (under 40%)
}

export function getSkillTextColorClass(score: number): string {
  if (score >= 75) return 'text-blue-600';
  if (score >= 60) return 'text-sky-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

export function getDeterministicSkillScore(skill: any, index: number = 0): number {
  if (typeof skill === 'object' && skill !== null && typeof skill?.score === 'number' && skill.score > 0) {
    return skill.score;
  }
  
  const skillName = typeof skill === 'string' ? skill : (skill?.name || skill?.title || '');
  if (!skillName) return 75;

  const level = typeof skill === 'object' && skill !== null ? (skill?.level || '').toLowerCase() : '';
  let baseMin = 66;
  let baseMax = 92;

  if (level.includes('expert') || level.includes('advanced') || level.includes('master')) {
    baseMin = 86;
    baseMax = 96;
  } else if (level.includes('beginner') || level.includes('basic')) {
    baseMin = 50;
    baseMax = 65;
  } else if (level.includes('intermediate')) {
    baseMin = 72;
    baseMax = 84;
  }

  let charSum = 0;
  for (let i = 0; i < skillName.length; i++) {
    charSum += skillName.charCodeAt(i) * (i + 1);
  }

  const hash = Math.abs(charSum + index * 19);
  const spread = baseMax - baseMin;
  return baseMin + (hash % (spread + 1));
}
