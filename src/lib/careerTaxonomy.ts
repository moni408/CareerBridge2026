export interface RequiredSkill {
  name: string;
  category: string;
  weight: number;
}

export interface CareerRoleConfig {
  id: string;
  title: string;
  field: 'tech' | 'non-tech';
  fieldCategory: 'Software & Data' | 'Humanities & Social Sciences' | 'Arts & Creative' | 'Business & Policy' | 'Media & Journalism';
  description: string;
  requiredSkills: RequiredSkill[];
  radarCategories: string[];
  benchmarks: {
    cat1: number;
    cat2: number;
    cat3: number;
    cat4: number;
    cat5: number;
  };
  sampleBridgeProjects: {
    title: string;
    description: string;
    skillToGain: string;
    estimatedHours: string;
  }[];
}

export const CAREER_ROLE_TAXONOMY: Record<string, CareerRoleConfig> = {
  // --- TECH ROLES ---
  'Software Engineer': {
    id: 'software-engineer',
    title: 'Software Engineer',
    field: 'tech',
    fieldCategory: 'Software & Data',
    description: 'Builds scalable applications, designs RESTful APIs, handles backend databases and version control.',
    requiredSkills: [
      { name: 'System Design', category: 'technical', weight: 90 },
      { name: 'PostgreSQL / SQL', category: 'technical', weight: 85 },
      { name: 'REST & gRPC APIs', category: 'technical', weight: 85 },
      { name: 'Git & Version Control', category: 'technical', weight: 90 },
      { name: 'Data Structures & Algorithms', category: 'technical', weight: 88 },
      { name: 'Docker / Containerization', category: 'technical', weight: 80 },
    ],
    radarCategories: ['Technical Depth', 'System Architecture', 'Problem Solving', 'Code Quality & Git', 'Domain & APIs'],
    benchmarks: { cat1: 90, cat2: 85, cat3: 90, cat4: 88, cat5: 80 },
    sampleBridgeProjects: [
      {
        title: 'Microservice API & Relational Schema',
        description: 'Design a clean Express/PostgreSQL backend with JWT authentication and Docker deployment.',
        skillToGain: 'System Design',
        estimatedHours: '8 hours'
      },
      {
        title: 'Optimized Data Pipeline',
        description: 'Build an asynchronous queue processor using Redis and TypeScript.',
        skillToGain: 'PostgreSQL / SQL',
        estimatedHours: '6 hours'
      }
    ]
  },
  'Frontend Developer': {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    field: 'tech',
    fieldCategory: 'Software & Data',
    description: 'Engineers responsive user interfaces, modular React components, state management, and web accessibility.',
    requiredSkills: [
      { name: 'React / Next.js', category: 'technical', weight: 95 },
      { name: 'TypeScript', category: 'technical', weight: 90 },
      { name: 'Tailwind CSS', category: 'technical', weight: 90 },
      { name: 'State Management', category: 'technical', weight: 85 },
      { name: 'Web Performance & SEO', category: 'technical', weight: 80 },
      { name: 'UI / UX Prototyping', category: 'technical', weight: 80 },
    ],
    radarCategories: ['React & Frameworks', 'TypeScript Safety', 'UI & Styling', 'Web Performance', 'Component Architecture'],
    benchmarks: { cat1: 95, cat2: 90, cat3: 90, cat4: 82, cat5: 85 },
    sampleBridgeProjects: [
      {
        title: 'Interactive Dashboard with Dark Mode',
        description: 'Construct a responsive Vite/React SPA using Tailwind CSS and Recharts.',
        skillToGain: 'React / Next.js',
        estimatedHours: '5 hours'
      }
    ]
  },
  'Data Scientist': {
    id: 'data-scientist',
    title: 'Data Scientist',
    field: 'tech',
    fieldCategory: 'Software & Data',
    description: 'Analyzes structured/unstructured datasets, builds ML models, performs statistical hypothesis testing.',
    requiredSkills: [
      { name: 'Python', category: 'technical', weight: 95 },
      { name: 'SQL & Pandas', category: 'technical', weight: 90 },
      { name: 'Machine Learning (PyTorch/Scikit)', category: 'technical', weight: 90 },
      { name: 'Data Visualization (Seaborn/Plotly)', category: 'technical', weight: 85 },
      { name: 'Statistics & Probability', category: 'technical', weight: 88 },
      { name: 'MLOps & Model Deployment', category: 'technical', weight: 75 },
    ],
    radarCategories: ['Python Programming', 'SQL & Data Wrangling', 'Machine Learning', 'Statistical Modeling', 'Visualization'],
    benchmarks: { cat1: 95, cat2: 90, cat3: 88, cat4: 85, cat5: 82 },
    sampleBridgeProjects: [
      {
        title: 'Predictive Student Retention Model',
        description: 'Clean academic CSV datasets using Pandas and train a Random Forest Classifier in Python.',
        skillToGain: 'Machine Learning (PyTorch/Scikit)',
        estimatedHours: '10 hours'
      }
    ]
  },

  // --- NON-TECH / ARTS / SOCIAL SCIENCE ROLES ---
  'Public Policy / Political Analyst': {
    id: 'public-policy-analyst',
    title: 'Public Policy / Political Analyst',
    field: 'non-tech',
    fieldCategory: 'Humanities & Social Sciences',
    description: 'Evaluates government policies, performs qualitative & quantitative research, drafts legislative briefs and advocacy reports.',
    requiredSkills: [
      { name: 'Policy Research & Analysis', category: 'domain', weight: 92 },
      { name: 'Quantitative & Qualitative Research', category: 'domain', weight: 88 },
      { name: 'Legislative Brief Drafting', category: 'writing', weight: 90 },
      { name: 'Stakeholder & Public Advocacy', category: 'soft', weight: 85 },
      { name: 'Data Interpretation (Excel/SPSS)', category: 'technical', weight: 80 },
      { name: 'Governance & Administrative Law', category: 'domain', weight: 82 },
    ],
    radarCategories: ['Policy Research', 'Legislative Drafting', 'Data & Survey Analysis', 'Public Advocacy', 'Governance Knowledge'],
    benchmarks: { cat1: 92, cat2: 90, cat3: 80, cat4: 85, cat5: 82 },
    sampleBridgeProjects: [
      {
        title: 'National Digital Education Policy Whitepaper',
        description: 'Synthesize regional policy datasets, evaluate governance impacts, and produce a 5-page policy brief.',
        skillToGain: 'Legislative Brief Drafting',
        estimatedHours: '8 hours'
      },
      {
        title: 'Public Opinion Survey & Data Analysis',
        description: 'Conduct a sample demographic survey and present statistical findings in an executive summary.',
        skillToGain: 'Data Interpretation (Excel/SPSS)',
        estimatedHours: '6 hours'
      }
    ]
  },

  'Digital Marketer & Growth Strategist': {
    id: 'digital-marketer',
    title: 'Digital Marketer & Growth Strategist',
    field: 'non-tech',
    fieldCategory: 'Business & Policy',
    description: 'Drives user acquisition, designs multi-channel digital campaigns, optimizes SEO/SEM, and analyzes funnel conversions.',
    requiredSkills: [
      { name: 'SEO & SEM Optimization', category: 'domain', weight: 90 },
      { name: 'Content Marketing Strategy', category: 'writing', weight: 88 },
      { name: 'Web Analytics (Google Analytics)', category: 'technical', weight: 85 },
      { name: 'Campaign Execution & Copywriting', category: 'writing', weight: 90 },
      { name: 'A/B Testing & Funnel Conversion', category: 'domain', weight: 82 },
      { name: 'Social Media Advertising', category: 'soft', weight: 85 },
    ],
    radarCategories: ['SEO & Search Ops', 'Content Strategy', 'Web Analytics', 'Ad Campaign Execution', 'Copywriting & Brand'],
    benchmarks: { cat1: 90, cat2: 88, cat3: 85, cat4: 82, cat5: 88 },
    sampleBridgeProjects: [
      {
        title: 'Multi-Channel Growth Campaign Teardown',
        description: 'Formulate an end-to-end digital acquisition funnel, draft ad copy, and map analytics event tracking.',
        skillToGain: 'Web Analytics (Google Analytics)',
        estimatedHours: '5 hours'
      }
    ]
  },

  'Gallery Curator & Art Specialist': {
    id: 'gallery-curator',
    title: 'Gallery Curator',
    field: 'non-tech',
    fieldCategory: 'Arts & Creative',
    description: 'Manages art collections, curates exhibition themes, researches art history & provenance, manages cataloging, and coordinates gallery installations.',
    requiredSkills: [
      { name: 'Art History & Provenance Research', category: 'domain', weight: 95 },
      { name: 'Exhibition Curation & Design', category: 'domain', weight: 92 },
      { name: 'Collection Cataloging & Archiving', category: 'domain', weight: 88 },
      { name: 'Visual Arts Aesthetics & Criticism', category: 'writing', weight: 90 },
      { name: 'Gallery Operations & Art Handling', category: 'soft', weight: 85 },
      { name: 'Cultural Asset Conservation', category: 'domain', weight: 80 },
    ],
    radarCategories: ['Art History & Research', 'Exhibition Curation', 'Cataloging & Archiving', 'Gallery Operations', 'Visual Criticism'],
    benchmarks: { cat1: 95, cat2: 92, cat3: 88, cat4: 85, cat5: 90 },
    sampleBridgeProjects: [
      {
        title: 'Contemporary Fine Arts Exhibition Proposal',
        description: 'Curate a themed 10-piece fine art exhibition catalog, write curatorial statements, and design wall placement floorplans.',
        skillToGain: 'Exhibition Curation & Design',
        estimatedHours: '8 hours'
      },
      {
        title: 'Collection Archival & Provenance Dossier',
        description: 'Document and catalog fine art acquisitions, compile historical provenance records, and draft condition reports.',
        skillToGain: 'Art History & Provenance Research',
        estimatedHours: '6 hours'
      }
    ]
  },

  'UX / UI Designer': {
    id: 'ux-ui-designer',
    title: 'UX / UI Designer',
    field: 'non-tech',
    fieldCategory: 'Arts & Creative',
    description: 'Conducts user research, creates interactive Figma wireframes, establishes visual design systems and accessibility guidelines.',
    requiredSkills: [
      { name: 'Figma Prototyping', category: 'technical', weight: 95 },
      { name: 'User Research & Persona Mapping', category: 'domain', weight: 90 },
      { name: 'Wireframing & Information Architecture', category: 'technical', weight: 88 },
      { name: 'Design Systems & Tokens', category: 'technical', weight: 85 },
      { name: 'Usability Testing & Feedback Loop', category: 'soft', weight: 82 },
      { name: 'Visual Aesthetics & Typography', category: 'writing', weight: 90 },
    ],
    radarCategories: ['Figma Prototyping', 'User Research', 'Information Arch', 'Design Systems', 'Visual Aesthetics'],
    benchmarks: { cat1: 95, cat2: 90, cat3: 88, cat4: 85, cat5: 90 },
    sampleBridgeProjects: [
      {
        title: 'Mobile Banking Accessibility Redesign',
        description: 'Conduct user interviews, design high-fidelity Figma components, and build an interactive prototype.',
        skillToGain: 'Figma Prototyping',
        estimatedHours: '8 hours'
      }
    ]
  },

  'Journalist & Media Specialist': {
    id: 'journalist-media',
    title: 'Journalist & Media Specialist',
    field: 'non-tech',
    fieldCategory: 'Media & Journalism',
    description: 'Investigates breaking news stories, conducts interviews, writes editorial feature pieces, and enforces media ethics.',
    requiredSkills: [
      { name: 'Investigative Reporting', category: 'domain', weight: 92 },
      { name: 'Copyediting & Fact-Checking', category: 'writing', weight: 95 },
      { name: 'SEO Article Writing', category: 'writing', weight: 88 },
      { name: 'Interviewing & Sourcing', category: 'soft', weight: 90 },
      { name: 'Media Ethics & Law', category: 'domain', weight: 85 },
      { name: 'Multimedia Storytelling', category: 'technical', weight: 80 },
    ],
    radarCategories: ['Investigative Depth', 'Editing & Grammar', 'Interviewing Skills', 'SEO Copywriting', 'Ethics & Law'],
    benchmarks: { cat1: 92, cat2: 95, cat3: 90, cat4: 88, cat5: 85 },
    sampleBridgeProjects: [
      {
        title: 'Investigative Feature Article & Data Story',
        description: 'Interview key domain experts, cross-examine public records, and publish a 1,200-word investigative report.',
        skillToGain: 'Investigative Reporting',
        estimatedHours: '7 hours'
      }
    ]
  },

  'Business Analyst / Consultant': {
    id: 'business-analyst',
    title: 'Business Analyst / Consultant',
    field: 'non-tech',
    fieldCategory: 'Business & Policy',
    description: 'Bridges executive stakeholders and operational teams, documents functional requirements, maps workflow models.',
    requiredSkills: [
      { name: 'Requirements Gathering & Documentation', category: 'domain', weight: 92 },
      { name: 'Process Mapping & BPMN', category: 'domain', weight: 88 },
      { name: 'Excel & Data Modeling', category: 'technical', weight: 88 },
      { name: 'Stakeholder Communication', category: 'soft', weight: 92 },
      { name: 'Business Case Development', category: 'domain', weight: 85 },
      { name: 'SQL for Business Analytics', category: 'technical', weight: 80 },
    ],
    radarCategories: ['Requirements Specs', 'Process Mapping', 'Excel / SQL Modeling', 'Stakeholder Mgmt', 'Strategic Planning'],
    benchmarks: { cat1: 92, cat2: 88, cat3: 88, cat4: 92, cat5: 85 },
    sampleBridgeProjects: [
      {
        title: 'Enterprise Process Automation Business Case',
        description: 'Map AS-IS vs TO-BE workflow diagrams in BPMN and compute cost ROI in Excel.',
        skillToGain: 'Process Mapping & BPMN',
        estimatedHours: '6 hours'
      }
    ]
  }
};

// Dynamic cache for AI-generated career taxonomies
const DYNAMIC_ROLE_CACHE: Record<string, CareerRoleConfig> = {};

export function registerDynamicRoleConfig(config: CareerRoleConfig) {
  if (config && config.title) {
    const key = config.title.trim().toLowerCase();
    DYNAMIC_ROLE_CACHE[key] = config;
    try {
      localStorage.setItem(`career_taxonomy_${key}`, JSON.stringify(config));
    } catch (e) {
      // Ignore storage errors
    }
  }
}

/**
 * Helper to match any targetRole string to our rich taxonomy while preserving
 * the student's exact signup career path title.
 */
export function getRoleConfig(targetRoleStr?: string, departmentStr?: string): CareerRoleConfig {
  const rawRoleTitle = (targetRoleStr || '').trim();
  const rawDeptStr = (departmentStr || '').trim();

  // If both are completely empty, return default software role
  if (!rawRoleTitle && !rawDeptStr) {
    return CAREER_ROLE_TAXONOMY['Software Engineer'];
  }

  const roleTitleToUse = rawRoleTitle || rawDeptStr || 'Career Professional';
  const roleKey = roleTitleToUse.toLowerCase();

  // 0. Check dynamic cache or localStorage
  if (DYNAMIC_ROLE_CACHE[roleKey]) {
    return DYNAMIC_ROLE_CACHE[roleKey];
  }
  try {
    const stored = localStorage.getItem(`career_taxonomy_${roleKey}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      DYNAMIC_ROLE_CACHE[roleKey] = parsed;
      return parsed;
    }
  } catch (e) {
    // Ignore
  }

  // 1. Check exact key match in taxonomy
  if (CAREER_ROLE_TAXONOMY[roleTitleToUse]) {
    return CAREER_ROLE_TAXONOMY[roleTitleToUse];
  }

  const query = `${roleTitleToUse} ${rawDeptStr}`.toLowerCase();

  // 2. Helper to clone preset but set exact student title
  const clonePresetWithTitle = (presetKey: string): CareerRoleConfig => {
    const base = CAREER_ROLE_TAXONOMY[presetKey];
    return {
      ...base,
      title: roleTitleToUse, // Keep student's exact target role name!
      id: roleTitleToUse.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    };
  };

  if (query.includes('curator') || query.includes('gallery') || query.includes('museum') || query.includes('fine art') || query.includes('art history') || query.includes('exhibition') || query.includes('archivist') || query.includes('sculpture') || query.includes('painting')) {
    return clonePresetWithTitle('Gallery Curator & Art Specialist');
  }

  if (query.includes('policy') || query.includes('political') || query.includes('government') || query.includes('governance') || query.includes('social science') || query.includes('international relations') || query.includes('law')) {
    return clonePresetWithTitle('Public Policy / Political Analyst');
  }

  if (query.includes('marketing') || query.includes('digital') || query.includes('seo') || query.includes('growth') || query.includes('brand') || query.includes('sales')) {
    return clonePresetWithTitle('Digital Marketer & Growth Strategist');
  }

  if (query.includes('ux') || query.includes('ui') || query.includes('figma') || query.includes('wireframe') || query.includes('user experience') || query.includes('user interface') || query.includes('product design') || (query.includes('design') && !query.includes('fine art') && !query.includes('gallery') && !query.includes('curator'))) {
    return clonePresetWithTitle('UX / UI Designer');
  }

  if (query.includes('journal') || query.includes('media') || query.includes('writer') || query.includes('english') || query.includes('content') || query.includes('copywriting') || query.includes('editor')) {
    return clonePresetWithTitle('Journalist & Media Specialist');
  }

  if (query.includes('business') || query.includes('analyst') || query.includes('consultant') || query.includes('management') || query.includes('finance') || query.includes('economics') || query.includes('accountant') || query.includes('hr')) {
    return clonePresetWithTitle('Business Analyst / Consultant');
  }

  if (query.includes('data') || query.includes('machine learning') || query.includes('ai') || query.includes('statistic') || query.includes('analytics')) {
    return clonePresetWithTitle('Data Scientist');
  }

  if (query.includes('frontend') || query.includes('front-end') || query.includes('web developer') || query.includes('fullstack') || query.includes('full-stack') || query.includes('mobile') || query.includes('react')) {
    return clonePresetWithTitle('Frontend Developer');
  }

  if (query.includes('software') || query.includes('engineer') || query.includes('developer') || query.includes('code') || query.includes('backend') || query.includes('system') || query.includes('cloud') || query.includes('cyber') || query.includes('devops')) {
    return clonePresetWithTitle('Software Engineer');
  }

  // 3. Dynamic Custom Role Fallback: preserves exact role title for any non-matched field (e.g. Biology, History, Agriculture, etc.)
  const isTechKeywords = /software|engineer|developer|tech|computer|data|code|cyber|system|cloud|ai|machine|web|app/i.test(query);
  const isBusinessKeywords = /business|policy|market|finance|manage|account|econ|admin|hr|sale/i.test(query);
  const isCreativeKeywords = /art|design|media|write|content|journal|music|photo|video/i.test(query);

  const field: 'tech' | 'non-tech' = isTechKeywords ? 'tech' : 'non-tech';
  const fieldCategory = isTechKeywords ? 'Software & Data' :
                        isCreativeKeywords ? 'Arts & Creative' :
                        isBusinessKeywords ? 'Business & Policy' : 'Humanities & Social Sciences';

  return {
    id: roleTitleToUse.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: roleTitleToUse,
    field,
    fieldCategory,
    description: `Target career path focused on ${roleTitleToUse} domain competencies and industry standards.`,
    requiredSkills: isTechKeywords ? [
      { name: `${roleTitleToUse} Core Principles`, category: 'technical', weight: 90 },
      { name: 'System Architecture & Design', category: 'technical', weight: 85 },
      { name: 'Data Management & Databases', category: 'technical', weight: 85 },
      { name: 'Git & Version Control', category: 'technical', weight: 80 },
      { name: 'Problem Solving & Algorithms', category: 'technical', weight: 85 },
      { name: 'APIs & Domain Tools', category: 'technical', weight: 80 },
    ] : [
      { name: `${roleTitleToUse} Research & Strategy`, category: 'domain', weight: 90 },
      { name: 'Qualitative & Quantitative Analysis', category: 'domain', weight: 88 },
      { name: 'Stakeholder & Domain Communication', category: 'soft', weight: 90 },
      { name: 'Documentation & Report Drafting', category: 'writing', weight: 85 },
      { name: 'Industry Regulations & Best Practices', category: 'domain', weight: 80 },
      { name: 'Data Interpretation & Tools', category: 'technical', weight: 80 },
    ],
    radarCategories: isTechKeywords 
      ? ['Domain Core', 'System Architecture', 'Problem Solving', 'Tools & Version Control', 'Domain APIs']
      : ['Domain Knowledge', 'Research & Analysis', 'Communication & Drafting', 'Stakeholder Strategy', 'Domain Tools'],
    benchmarks: { cat1: 90, cat2: 88, cat3: 85, cat4: 85, cat5: 80 },
    sampleBridgeProjects: [
      {
        title: `${roleTitleToUse} Practical Case Study`,
        description: `Execute an end-to-end practical project demonstrating core ${roleTitleToUse} methodologies and deliverables.`,
        skillToGain: `${roleTitleToUse} Research & Strategy`,
        estimatedHours: '8 hours'
      }
    ]
  };
}

/**
 * Calculates detailed skill gaps comparing a student's profile against the target role requirements
 */
export function calculateSkillGapAnalysis(userSkillsRaw: any[], targetRoleStr?: string, departmentStr?: string) {
  const roleConfig = getRoleConfig(targetRoleStr, departmentStr);

  const parsedUserSkills = (userSkillsRaw || []).map((s: any) => {
    if (typeof s === 'string') return { name: s.trim(), score: 75 };
    return { name: (s.name || s.title || '').trim(), score: s.score || 75 };
  });

  const possessedSkills: { req: RequiredSkill; userScore: number }[] = [];
  const missingSkills: RequiredSkill[] = [];

  roleConfig.requiredSkills.forEach((reqSkill) => {
    const reqLower = reqSkill.name.toLowerCase();
    const match = parsedUserSkills.find(uSkill => {
      const uLower = uSkill.name.toLowerCase();
      return uLower.includes(reqLower) || reqLower.includes(uLower) ||
        reqLower.split(/[\s/]+/).some(s => s.length > 2 && uLower.includes(s));
    });

    if (match) {
      possessedSkills.push({ req: reqSkill, userScore: match.score });
    } else {
      missingSkills.push(reqSkill);
    }
  });

  // Alignment Score percentage
  const totalRequiredWeight = roleConfig.requiredSkills.reduce((acc, curr) => acc + curr.weight, 0);
  const possessedWeight = possessedSkills.reduce((acc, curr) => acc + (curr.req.weight * (curr.userScore / 100)), 0);
  
  const alignmentPercent = totalRequiredWeight > 0 
    ? Math.min(98, Math.max(15, Math.round((possessedWeight / totalRequiredWeight) * 100)))
    : 45;

  return {
    roleConfig,
    alignmentPercent,
    possessedSkills,
    missingSkills,
    isTech: roleConfig.field === 'tech'
  };
}
