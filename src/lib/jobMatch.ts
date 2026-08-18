export function calculateJobSkillMatch(job: any, userSkills: string[] = [], userMajor: string = ''): number {
  let jobSkills: string[] = [];
  const safeUserSkills = Array.isArray(userSkills) ? userSkills : [];

  if (job && Array.isArray(job.skills)) {
    jobSkills.push(...job.skills.map((s: any) => String(s).toLowerCase().trim()));
  } else if (job && typeof job.skills === 'string') {
    jobSkills.push(...job.skills.split(/[,;\n]/).map(s => s.toLowerCase().trim()));
  }

  if (job && Array.isArray(job.requirements)) {
    jobSkills.push(...job.requirements.map((s: any) => String(s).toLowerCase().trim()));
  } else if (job && typeof job.requirements === 'string') {
    jobSkills.push(...job.requirements.split(/[,;\n]/).map(s => s.toLowerCase().trim()));
  }

  if (job && Array.isArray(job.requiredSkills)) {
    jobSkills.push(...job.requiredSkills.map((s: any) => String(s).toLowerCase().trim()));
  }

  const titleLower = (job?.title || '').toLowerCase();
  const descLower = (job?.description || '').toLowerCase();
  const domainKeywords = [
    'react', 'typescript', 'javascript', 'frontend', 'backend', 'node.js', 'node', 
    'python', 'machine learning', 'ml', 'neural networks', 'ai', 'data science', 
    'pytorch', 'tensorflow', 'css', 'tailwind', 'sql', 'postgres', 'docker', 'aws', 
    'java', 'c++', 'go', 'devops', 'architecture', 'system design'
  ];
  
  domainKeywords.forEach(kw => {
    if ((titleLower.includes(kw) || descLower.includes(kw)) && !jobSkills.includes(kw)) {
      jobSkills.push(kw);
    }
  });

  jobSkills = Array.from(new Set(jobSkills.filter(s => s.length > 1)));

  // User background checks for foundational CS / Tech baseline
  const majorLower = (userMajor || '').toLowerCase();
  const isCsOrTechUser = safeUserSkills.length > 0 || majorLower.includes('computer') || majorLower.includes('software') || majorLower.includes('tech') || majorLower.includes('science');

  // Foundational baseline for CS/Tech profile cross-domain relevance
  const foundationalBaseline = isCsOrTechUser ? 48 : 25;

  if (jobSkills.length === 0) {
    return isCsOrTechUser ? 75 : 40;
  }

  let exactMatches = 0;
  let adjacentMatches = 0;

  jobSkills.forEach((jSkill) => {
    const isExactMatch = userSkills.some((uSkill) => 
      uSkill === jSkill || uSkill.includes(jSkill) || jSkill.includes(uSkill)
    );

    if (isExactMatch) {
      exactMatches++;
    } else {
      // Check for cross-domain programming & tech skill synergy
      const isAdjacentMatch = userSkills.some((uSkill) => {
        const isProgramming = ['python', 'javascript', 'typescript', 'c++', 'java', 'go', 'sql', 'html', 'css'].some(lang => uSkill.includes(lang));
        const isMlRole = jSkill.includes('ml') || jSkill.includes('machine learning') || jSkill.includes('ai') || jSkill.includes('neural');
        const isBackendRole = jSkill.includes('backend') || jSkill.includes('api') || jSkill.includes('database');
        const isFrontendRole = jSkill.includes('frontend') || jSkill.includes('ui') || jSkill.includes('web');

        return (isProgramming && (isMlRole || isBackendRole || isFrontendRole)) ||
               (uSkill.includes('problem solving') || uSkill.includes('data structure') || uSkill.includes('algorithm'));
      });

      if (isAdjacentMatch) {
        adjacentMatches++;
      }
    }
  });

  const directRatio = exactMatches / jobSkills.length;
  const adjacentRatio = (adjacentMatches / jobSkills.length) * 0.4;

  const totalBoost = Math.round((directRatio * 50) + (adjacentRatio * 25));
  const finalScore = foundationalBaseline + totalBoost;

  return Math.min(Math.max(finalScore, 42), 98);
}
