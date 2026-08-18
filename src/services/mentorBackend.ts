import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, doc, getDoc, updateDoc, setDoc, 
  addDoc, getDocs, query, where, serverTimestamp, 
  Timestamp, writeBatch, limit, orderBy, deleteDoc
} from 'firebase/firestore';

// LEVEL XP CONSTANTS
export const LEVELS = {
  NEWCOMER: { min: 0, max: 99, name: "Newcomer" },
  JUNIOR: { min: 100, max: 499, name: "Junior guide" },
  SENIOR: { min: 500, max: 1199, name: "Senior guide" },
  EXPERT: { min: 1200, max: 2499, name: "Expert mentor" },
  LEADER: { min: 2500, max: Infinity, name: "Thought leader" }
};

// XP RULES ENGINE
export const XP_RULES = {
  ACCEPT_REQUEST: 50,
  COMPLETE_GAP_ANALYSIS: 30,
  APPROVE_TASK: 20,
  REVISE_TASK: 10,
  CLOSE_SESSION: 150,
  RATING_3_STAR: 30,
  RATING_4_STAR: 30, // Or same
  RATING_5_STAR: 20, // Extra +20 for 5 star (30 + 20 = 50 total)
  BONUS_SCORE_IMPROVED: 50 // if student score improved by 15+ points
};

export const XP_PENALTIES = {
  SHORT_FEEDBACK: -20, // under 20 characters
  RAPID_APPROVAL: -50, // 3 approvals in <5 min
  LOW_RATING: -30 // 1-2 star rating
};

export interface MentorReputationState {
  xp: number;
  level: string;
  nextLevelXp: number;
  levelProgress: number; // 0 to 100
  impactScore: number;
  badges: string[];
  leaderboardRank: number;
}

// 1. Level Calculation helper
export function calculateLevelInfo(xp: number) {
  if (xp < 100) {
    return {
      level: LEVELS.NEWCOMER.name,
      min: LEVELS.NEWCOMER.min,
      max: LEVELS.NEWCOMER.max,
      progress: (xp / 99) * 100
    };
  } else if (xp < 500) {
    return {
      level: LEVELS.JUNIOR.name,
      min: LEVELS.JUNIOR.min,
      max: LEVELS.JUNIOR.max,
      progress: ((xp - 100) / 399) * 100
    };
  } else if (xp < 1200) {
    return {
      level: LEVELS.SENIOR.name,
      min: LEVELS.SENIOR.min,
      max: LEVELS.SENIOR.max,
      progress: ((xp - 500) / 699) * 100
    };
  } else if (xp < 2500) {
    return {
      level: LEVELS.EXPERT.name,
      min: LEVELS.EXPERT.min,
      max: LEVELS.EXPERT.max,
      progress: ((xp - 1200) / 1299) * 100
    };
  } else {
    return {
      level: LEVELS.LEADER.name,
      min: 2500,
      max: 5000,
      progress: Math.min(((xp - 2500) / 2500) * 100, 100)
    };
  }
}

// XP AWARD FUNCTION (Pure logic with database write)
export async function awardXP(
  event: 'ACCEPT_REQUEST' | 'COMPLETE_GAP_ANALYSIS' | 'APPROVE_TASK' | 'REVISE_TASK' | 'CLOSE_SESSION' | 'RATING_3_STAR' | 'RATING_4_STAR' | 'RATING_5_STAR' | 'BONUS_SCORE_IMPROVED' | 'SHORT_FEEDBACK' | 'RAPID_APPROVAL' | 'LOW_RATING', 
  mentorId: string,
  meta?: { feedbackLength?: number; menteeName?: string; ratingValue?: number; relatedId?: string }
): Promise<{ xpDelta: number; newXp: number }> {
  
  const mentorRef = doc(db, 'users', mentorId);
  const mentorSnap = await getDoc(mentorRef);
  
  if (!mentorSnap.exists()) {
    throw new Error(`Mentor document with ID ${mentorId} does not exist`);
  }
  
  const currentData = mentorSnap.data();
  const originalXp = currentData.xp || 0;
  let delta = 0;

  // Rule processing
  switch (event) {
    case 'ACCEPT_REQUEST':
      delta = XP_RULES.ACCEPT_REQUEST;
      break;
    case 'COMPLETE_GAP_ANALYSIS':
      delta = XP_RULES.COMPLETE_GAP_ANALYSIS;
      break;
    case 'APPROVE_TASK':
      delta = XP_RULES.APPROVE_TASK;
      // Safeguard: Check feedback under 20 chars
      if (meta?.feedbackLength !== undefined && meta.feedbackLength < 20) {
        delta += XP_PENALTIES.SHORT_FEEDBACK; // -20 penalty
      }
      break;
    case 'REVISE_TASK':
      delta = XP_RULES.REVISE_TASK;
      if (meta?.feedbackLength !== undefined && meta.feedbackLength < 20) {
        delta += XP_PENALTIES.SHORT_FEEDBACK;
      }
      break;
    case 'CLOSE_SESSION':
      delta = XP_RULES.CLOSE_SESSION;
      break;
    case 'RATING_3_STAR':
    case 'RATING_4_STAR':
      delta = XP_RULES.RATING_4_STAR;
      break;
    case 'RATING_5_STAR':
      delta = XP_RULES.RATING_4_STAR + XP_RULES.RATING_5_STAR; // 30 + 20
      break;
    case 'BONUS_SCORE_IMPROVED':
      delta = XP_RULES.BONUS_SCORE_IMPROVED;
      break;
    case 'SHORT_FEEDBACK':
      delta = XP_PENALTIES.SHORT_FEEDBACK;
      break;
    case 'RAPID_APPROVAL':
      delta = XP_PENALTIES.RAPID_APPROVAL;
      break;
    case 'LOW_RATING':
      delta = XP_PENALTIES.LOW_RATING; // -30 penalty
      break;
  }

  const finalXp = Math.max(0, originalXp + delta);
  
  // Record Transaction/Event Document for Audit
  const xpEventId = `xp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await setDoc(doc(db, 'xp_events', xpEventId), {
    id: xpEventId,
    mentorId,
    event,
    delta,
    originalXp,
    finalXp,
    timestamp: new Date().toISOString(),
    details: meta || null
  });

  // Calculate new level info
  const newLevelInfo = calculateLevelInfo(finalXp);

  // Update original profile
  await updateDoc(mentorRef, {
    xp: finalXp,
    xpLevel: newLevelInfo.level,
    updatedAt: new Date().toISOString()
  });

  return { xpDelta: delta, newXp: finalXp };
}

// ANTI-GAMING GUARDEE: Evaluate Speed Auditing and Auto Penalize
export async function auditAndFlagRapidApprovals(mentorId: string): Promise<boolean> {
  try {
    const recentReviewsQ = query(
      collection(db, 'reviews'),
      where('mentorId', '==', mentorId),
      orderBy('actionTakenAt', 'desc'),
      limit(5)
    );
    const snap = await getDocs(recentReviewsQ);
    const reviews = snap.docs.map(d => d.data());
    
    if (reviews.length < 3) return false;

    // Filter approved reviews only
    const approvedReviews = reviews.filter(r => r.action === 'Approved');
    if (approvedReviews.length < 3) return false;

    // Take the 3 most recent approvals
    const approvalTimes = approvedReviews.slice(0, 3).map(r => new Date(r.actionTakenAt).getTime());
    
    // Check span between newest and 3rd newest
    const maxTime = Math.max(...approvalTimes);
    const minTime = Math.min(...approvalTimes);
    const differenceMinutes = (maxTime - minTime) / 1000 / 60;

    if (differenceMinutes < 5) {
      // Rapid approvals flagged! Create admin flag + deduct 50 XP
      const flagId = `flag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      
      await setDoc(doc(db, 'admin_flags', flagId), {
        id: flagId,
        mentorId,
        type: 'speed_gaming_attempt',
        severity: 'high',
        description: `Rapid approvals detected: 3 tasks approved within ${differenceMinutes.toFixed(1)} minutes (< 5 min benchmark)`,
        createdAt: new Date().toISOString(),
        status: 'pending_review'
      });

      // Award XP penalty
      await awardXP('RAPID_APPROVAL', mentorId, { relatedId: flagId });
      
      // Auto-notify mentor
      await addDoc(collection(db, 'notifications'), {
        recipientId: mentorId,
        type: 'admin_flag',
        title: '⚠️ Speed Safeguard Triggered',
        body: 'Admin system detected 3 approvals in under 5 minutes. An XP penalty of -50 XP has been applied and flagged for review.',
        createdAt: new Date().toISOString(),
        isRead: false
      });

      return true;
    }
  } catch (err) {
    console.error('Safeguard check failure:', err);
  }
  return false;
}

// IMPACT SCORE CALCULATOR
export function computeImpactScore(connections: any[], sessions?: any[]): { 
  score: number;
  menteesCount: number;
  avgRating: number;
  avgImprovement: number;
  breakdown: string;
} {
  // Specs: Students Guided (40%), Avg score improvement (35%), Avg Rating (25%)
  const completedMentees = connections.filter(c => c.status === 'completed' || c.progress === 100);
  const menteesCount = connections.length;
  
  let totalRating = 0;
  let ratedCount = 0;
  let totalImprovement = 0;
  let improvedCount = 0;

  connections.forEach(c => {
    if (c.rating) {
      totalRating += Number(c.rating);
      ratedCount++;
    }
    if (c.scoreDelta !== undefined) {
      totalImprovement += Number(c.scoreDelta);
      improvedCount++;
    } else if (c.menteeReadinessProgress !== undefined) {
      totalImprovement += Number(c.menteeReadinessProgress);
      improvedCount++;
    }
  });

  // Factor in session-level rating assessments if available
  if (sessions) {
    sessions.forEach(s => {
      if (s.feedback && s.feedback.rating !== undefined) {
        totalRating += Number(s.feedback.rating);
        ratedCount++;
      }
    });
  }

  const avgRating = ratedCount > 0 ? totalRating / ratedCount : 5.0;
  const avgImprovement = improvedCount > 0 ? totalImprovement / improvedCount : 12; // default avg delta

  // Calculate weighted impact score (normalized to 100)
  // Mentees component: (Count / 10 limit) * 40 points
  const menteesComponent = Math.min((menteesCount / 8) * 40, 40);
  // Improvement: (Avg improvement / 25 points target) * 35 points
  const improvementComponent = Math.min((avgImprovement / 20) * 35, 35);
  // Rating: (Avg rating / 5.0 max) * 25 points
  const ratingComponent = (avgRating / 5.0) * 25;

  const score = Math.round(menteesComponent + improvementComponent + ratingComponent);

  return {
    score: Math.min(score, 100),
    menteesCount,
    avgRating: parseFloat(avgRating.toFixed(1)),
    avgImprovement: Math.round(avgImprovement),
    breakdown: `Students Guided: ${menteesComponent.toFixed(1)}/40 · Readiness Delta: ${improvementComponent.toFixed(1)}/35 · Student Feedback: ${ratingComponent.toFixed(1)}/25`
  };
}

// ENDORSEMENT LETTER GENERATOR
export function generateEndorsementLetter(mentorName: string, menteeName: string, domainSelected: string, stats: any): string {
  const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return `OFFICIAL CAREERBRIDGE ENDORSEMENT LETTER
Date: ${date}
To Whom It May Concern,

I am writing to formally provide my high-level professional endorsement for ${menteeName}, who I have personally guided through the CareerBridge platform.

Over our extensive collaborative sessions, ${menteeName} has demonstrated exceptional focus and rapid technical mastery in ${domainSelected || 'Software Engineering'}. Through detailed skill audits and mentor-guided task verifications, they successfully addressed critical core competency gaps.

Key Metrics Verified During Mentorship Project:
- Target Skill Readiness Score: Improved by +${stats ? stats.scoreDelta || 16 : 16} points
- Completed Tasks Reviewed: ${stats ? stats.tasksApproved || 4 : 4} rigorous assignments
- Core Domain Milestones Met: Technical code submission verifications, code reviews and system compliance architecture.

Based on my professional assessment, ${menteeName} possesses excellent technical logic, communication strength, and is fully ready to excel in a professional high-performing team. I give them my highest, unreserved recommendation.

Sincerely,

${mentorName}
Senior Technical Advisor, CareerBridge Guild`;
}

// EXPORT TO CSV SESSION HISTORY
export function exportSessionsCSV(sessions: any[]): string {
  const headers = ['Session ID', 'Mentee Name', 'Date & Time', 'Type', 'Duration (min)', 'Pre-Notes', 'Post-Notes', 'Status'];
  const rows = sessions.map(s => [
    s.id || '',
    s.menteeName || '',
    s.date || '',
    s.type || '',
    s.duration || '',
    (s.preNotes || '').replace(/"/g, '""'),
    (s.postNotes || '').replace(/"/g, '""'),
    s.status || 'scheduled'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(val => `"${val}"`).join(','))
  ].join('\n');

  return csvContent;
}

// CLEAR DEMO MENTORS FUNCTION
export async function clearDemoMentors() {
  const demoMentorIds = [
    'mentor_rahman_id',
    'mentor_sara_id',
    'mentor_jack_id'
  ];

  try {
    // 1. Delete from users collection
    for (const uid of demoMentorIds) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (err) {
        console.warn(`Error deleting demo user ${uid}:`, err);
      }
    }

    // 2. Delete from mentors collection
    for (const uid of demoMentorIds) {
      try {
        await deleteDoc(doc(db, 'mentors', uid));
      } catch (err) {
        console.warn(`Error deleting demo mentor doc ${uid}:`, err);
      }
    }

    // 3. Delete any users or mentors with names matching demo mentors
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const d of usersSnap.docs) {
        const udata = d.data();
        const dName = (udata.displayName || udata.name || '').trim().toLowerCase();
        if (dName === 'dr. faiz rahman' || dName === 'sara tan' || dName === 'jack miller') {
          await deleteDoc(doc(db, 'users', d.id));
        }
      }
    } catch (err) {
      console.warn('Error cleaning matching demo users:', err);
    }

    try {
      const mentorsSnap = await getDocs(collection(db, 'mentors'));
      for (const d of mentorsSnap.docs) {
        const mdata = d.data();
        const dName = (mdata.name || mdata.displayName || '').trim().toLowerCase();
        if (dName === 'dr. faiz rahman' || dName === 'sara tan' || dName === 'jack miller') {
          await deleteDoc(doc(db, 'mentors', d.id));
        }
      }
    } catch (err) {
      console.warn('Error cleaning matching demo mentors:', err);
    }

    // 4. Delete demo mentorship requests and connections
    const demoReqIds = ['req_rahman_1', 'req_rahman_2'];
    for (const rId of demoReqIds) {
      try {
        await deleteDoc(doc(db, 'mentorship_requests', rId));
      } catch (err) {
        // ignore
      }
    }

    const demoConnIds = ['conn_rahman_alhaz', 'conn_rahman_tanya'];
    for (const cId of demoConnIds) {
      try {
        await deleteDoc(doc(db, 'mentorship_connections', cId));
      } catch (err) {
        // ignore
      }
    }

    console.log('Demo mentors successfully cleared from Firestore.');
    return { success: true };
  } catch (err) {
    console.error('Failed to clear demo mentors:', err);
    return { success: false, error: err };
  }
}

// DATABASE BOOTSTRAP SEEDING SCRIPT
export async function seedDemoData() {
  const usersToSeed = [
    // Students/Graduates only
    {
      uid: 'grad_alhaz_id',
      email: 'alhaz.ali@university.edu',
      displayName: 'Alhaz Ali',
      role: 'graduate',
      readinessScore: 68,
      skills: ['React', 'CSS', 'JavaScript'],
      createdAt: new Date().toISOString()
    },
    {
      uid: 'grad_tanya_id',
      email: 'tanya.ghosh@dev.io',
      displayName: 'Tanya Ghosh',
      role: 'graduate',
      readinessScore: 74,
      skills: ['Python', 'SQL', 'FastAPI'],
      createdAt: new Date().toISOString()
    },
    {
      uid: 'grad_shakil_id',
      email: 'shakil.ahmed@code.in',
      displayName: 'Shakil Ahmed',
      role: 'graduate',
      readinessScore: 54,
      skills: ['HTML', 'Tailwind', 'Vite'],
      createdAt: new Date().toISOString()
    },
    {
      uid: 'grad_mim_id',
      email: 'mim.sultana@academy.net',
      displayName: 'Mim Sultana',
      role: 'graduate',
      readinessScore: 82,
      skills: ['Java', 'Spring Boot', 'Docker'],
      createdAt: new Date().toISOString()
    },
    {
      uid: 'grad_kamrul_id',
      email: 'kamrul.hasan@edu.bd',
      displayName: 'Kamrul Hasan',
      role: 'graduate',
      readinessScore: 61,
      skills: ['Node.js', 'Express', 'MongoDB'],
      createdAt: new Date().toISOString()
    }
  ];

  // Writing graduate users
  for (const u of usersToSeed) {
    await setDoc(doc(db, 'users', u.uid), u);
  }

  console.log('Seed protocol successful for candidate demo pool!');
}
