import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { sendCrossRoleEmailNotification } from '../services/emailService';
import { collection, query, onSnapshot, doc, setDoc, addDoc, where, updateDoc, getDocs } from 'firebase/firestore';
import { 
  GraduationCap, Users, BookOpen, Clock, Calendar, Plus, Trash2, 
  Search, ArrowUpRight, Award, TrendingUp, BarChart3, Star, 
  Settings, AlertCircle, Sparkles, MapPin, Briefcase, ChevronRight, ChevronLeft,
  CheckCircle2, RefreshCw, Bell, LogOut, LayoutGrid, Brain, Lightbulb, 
  Megaphone, Download, Share2, X, Info, FileSpreadsheet, List, Grid, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateUniversityReport, UniversityReport } from '../services/geminiService';

// ==========================================
// DYNAMIC RADAR RESOLVER & CONSTANTS
// ==========================================

const HEATMAP_ROWS = [
  'Cloud & DevOps',
  'System Design',
  'Advanced DSA',
  'Software Testing',
  'Database Optimization',
  'Microservices',
  'UI/UX Design',
  'ML/AI Fundamentals',
  'Computer Networks',
  'Security & Cryptography'
];

const HEATMAP_COLS = ['2021', '2022', '2023', '2024', '2025'];

export function UniversitySection() {
  const { signOut, setView, profile, user } = useAuth();
  
  // Dynamic identification metadata
  const targetUniversity = profile?.university || 'Academic Institution';
  const targetDepartment = profile?.department || 'Engineering Dept';
  const representativeName = profile?.displayName || 'Academic Director';

  // UI & Workspace states
  const [activeTab, setActiveTab ] = useState<string>('dashboard-overview');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewType, setViewType] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [lastSyncText, setLastSyncText] = useState('Last synced: Just now');
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === 'true';
    } catch (_) {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const val = !prev;
      try {
        localStorage.setItem('sidebar-collapsed', String(val));
      } catch (_) {}
      return val;
    });
  };
  const [liveStudents, setLiveStudents] = useState<any[]>([]);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showLocalDemo, setShowLocalDemo] = useState(() => {
    return localStorage.getItem('university_demo_active') === 'true';
  });
  const [aiReport, setAiReport] = useState<UniversityReport | null>(null);

  // Connection & Industry Partner States
  const [partneredIndustries, setPartneredIndustries] = useState<any[]>([]);
  const [sentSessions, setSentSessions] = useState<any[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<any | null>(null);
  const [sessionTopic, setSessionTopic] = useState('');
  const [industryOpinions, setIndustryOpinions] = useState<any[]>([]);

  // Focus analysis tab in the non-batch layout
  const [selectedAnalysisSkill, setSelectedAnalysisSkill] = useState<string>('Cloud & DevOps');

  // Active sync animation helper
  const handleReload = () => {
    setIsSynced(true);
    setLastSyncText('Syncing database...');
    setTimeout(() => {
      setIsSynced(false);
      setLastSyncText('Last synced: Just now');
      triggerToast('Database synchronized and indexes updated');
    }, 1200);
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast(null);
    }, 3000);
  };

  // Passive Real-time Student Discovery matched dynamically with the signed-up university!
  useEffect(() => {
    if (!profile || !user) return;
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snap) => {
      const repUniName = (profile?.university || '').trim().toLowerCase();
      
      const dbStudents = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((stu: any) => {
          const isStudent = stu.role === 'graduate' || stu.role === 'student' || stu.role === 'user';
          if (!isStudent) return false;
          
          if (!repUniName) return false; // Default: show nothing if university rep profile is incomplete
          
          // Match via email domain if available (with fallback dynamic extraction from full email addresses)
          const uniEmailDomain = (profile?.emailDomain || profile?.email?.split('@')[1] || '').trim().toLowerCase();
          const studentEmailDomain = (stu.emailDomain || stu.email?.split('@')[1] || '').trim().toLowerCase();
          if (uniEmailDomain && studentEmailDomain && uniEmailDomain === studentEmailDomain) {
            return true;
          }

          // Check education section array first with specialized substring & word-clipping clean matchers
          let matchesUni = false;
          const cleanString = (str: string) => {
            return str
              .toLowerCase()
              .replace(/(university|college|institute|school|of|and|the)/g, '')
              .replace(/[\s\-_,.]/g, '')
              .trim();
          };

          if (Array.isArray(stu.education)) {
            matchesUni = stu.education.some((edu: any) => {
              const school = (edu.school || edu.university || edu.institution || '').trim().toLowerCase();
              if (!school) return false;
              if (school.includes(repUniName) || repUniName.includes(school)) return true;
              
              const cSchool = cleanString(school);
              const cRep = cleanString(repUniName);
              return cSchool && cRep && (cSchool.includes(cRep) || cRep.includes(cSchool));
            });
          }

          // Fallback to top-level university fields
          if (!matchesUni) {
            const studentUni = (stu.university || stu.university_name || '').trim().toLowerCase();
            if (studentUni) {
              if (studentUni.includes(repUniName) || repUniName.includes(studentUni)) {
                matchesUni = true;
              } else {
                const cStudent = cleanString(studentUni);
                const cRep = cleanString(repUniName);
                if (cStudent && cRep && (cStudent.includes(cRep) || cRep.includes(cStudent))) {
                  matchesUni = true;
                }
              }
            }
          }

          return matchesUni;
        })
        .map((stu: any) => {
          const name = stu.displayName || stu.name || 'Registered Graduate';
          const status = stu.jobSprintsJoined ? 'Seeking Mentorship' : 'Active';
          const score = stu.readinessScore || Math.floor(Math.random() * 25) + 65;
          return {
            id: stu.id || stu.uid,
            name,
            avatar: name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
            avatarColor: 'bg-primary/10 text-primary',
            batch: stu.batch || '2024',
            skills: stu.skills && stu.skills.length > 0 
              ? stu.skills.map((s: any) => typeof s === 'string' ? s : s.name || s.title || '')
              : ['React', 'Node.js', 'Python'],
            score,
            weaknesses: stu.weaknesses || ['Cloud & DevOps', 'System Design'],
            status,
            email: stu.email || 'student@university.edu',
            lastActive: stu.lastActive || 'June 9, 2026',
            seekingMentorship: stu.seekingMentorship !== undefined ? stu.seekingMentorship : true,
            mentor: stu.mentor || 'Unassigned',
            sessionsCount: stu.sessionsCount || 1,
            resourcesCount: stu.resourcesCount || 3,
            assignmentsSubmitted: stu.assignmentsSubmitted || 5,
            quizzesCount: stu.quizzesCount || 2,
            quizScore: stu.quizScore || Math.max(50, score - 5),
            skillDetails: stu.skillDetails || {
              'Data Structures & Algorithms': score - 12,
              'System Design': score - 20,
              'Machine Learning': score - 5,
              'Database Management': score,
              'Python / Programming': score + 10,
              'Cloud & DevOps': score - 24
            }
          };
        });

      setLiveStudents(dbStudents);
    }, (err) => {
      console.warn("Firestore discovery error for university section:", err);
    });

     return () => unsub();
  }, [profile?.university, profile?.emailDomain, profile?.email, user]);

  // Sync partnered industries and session requests targeting this coordinator
  useEffect(() => {
    if (!profile || !user) return;
    
    // 1. Fetch industry accounts
    const qInd = query(collection(db, 'users'), where('role', '==', 'industry'));
    const unsubInd = onSnapshot(qInd, async (snap) => {
      try {
        const indPartnersSnap = await getDocs(collection(db, 'industry_partners'));
        const map = new Map<string, any>();

        snap.docs.forEach(d => {
          const data = d.data();
          const isVerified = data.verified === true || data.verificationStatus === 'verified' || data.email === 'ayeshasiddikamoni408@gmail.com';
          if (isVerified) {
            map.set(d.id, { id: d.id, uid: d.id, ...data });
          }
        });

        indPartnersSnap.docs.forEach(d => {
          const data = d.data();
          const isVerified = data.verified === true || data.verificationStatus === 'verified';
          if (isVerified) {
            const existing = map.get(d.id) || {};
            map.set(d.id, { id: d.id, uid: d.id, ...existing, ...data });
          }
        });

        setPartneredIndustries(Array.from(map.values()));
      } catch (e) {
        console.warn('Error syncing industry partners:', e);
        setPartneredIndustries(snap.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() })).filter((d: any) => d.verified || d.verificationStatus === 'verified'));
      }
    }, (err) => console.error("Error loading industries:", err));

    // 2. Fetch sent session requests
    const qSess = query(collection(db, 'industry_sessions'), where('universityId', '==', user?.uid || ''));
    const unsubSess = onSnapshot(qSess, (snap) => {
      setSentSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Error loading sent sessions:", err));

    // 3. Fetch industrial opinions submitted for our university students
    const qOpinions = query(collection(db, 'industry_opinions'), where('universityId', '==', user?.uid || ''));
    const unsubOpinions = onSnapshot(qOpinions, (snap) => {
      setIndustryOpinions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Error loading opinions:", err));

    return () => {
      unsubInd();
      unsubSess();
      unsubOpinions();
    };
  }, [profile, user]);

  // Seeder feature to dynamically enroll 4 student profiles inside Firestore for testing
  const enrollDemoStudents = async () => {
    setShowLocalDemo(true);
    localStorage.setItem('university_demo_active', 'true');
    setIsSynced(true);
    setLastSyncText('Enrolling demo profiles...');
    try {
      let uName = (profile?.university || '').trim();
      if (!uName) {
        uName = "Greenwood University";
        // Auto-configure the university representative's profile with 'Greenwood University' in Firestore
        if (user?.uid) {
          try {
            await updateDoc(doc(db, 'users', user.uid), { 
              university: "Greenwood University",
              department: "Computer Science & Engineering"
            });
            triggerToast("Auto-configuring your profile with 'Greenwood University' to show demo students...");
          } catch (profileErr) {
            console.warn("Could not auto-update profile, trying merge setDoc:", profileErr);
            try {
              await setDoc(doc(db, 'users', user.uid), {
                university: "Greenwood University",
                department: "Computer Science & Engineering"
              }, { merge: true });
            } catch (mergeErr) {
              console.error("SetDoc fallback failed:", mergeErr);
            }
          }
        }
      }

      const demos = [
        {
          uid: `demo_${Date.now()}_1`,
          displayName: "Rahim Chowdhury",
          email: "rahim.chowdhury@student.edu",
          role: "graduate",
          education: [
            {
              school: uName,
              degree: "B.Sc. in Computer Science & Engineering",
              year: "2024",
              gpa: "3.85"
            }
          ],
          batch: "2024",
          skills: ["Python", "Machine Learning", "System Design"],
          readinessScore: 78,
          jobSprintsJoined: true,
          bio: "Aspiring software architect concentrating on high scalable systems and machine learning data pipelines."
        },
        {
          uid: `demo_${Date.now()}_2`,
          displayName: "Priya Das",
          email: "priya.das@student.edu",
          role: "graduate",
          education: [
            {
              school: uName,
              degree: "B.Sc. in Software Engineering",
              year: "2023",
              gpa: "3.92"
            }
          ],
          batch: "2023",
          skills: ["React", "TypeScript", "Node.js", "Tailwind CSS"],
          readinessScore: 85,
          jobSprintsJoined: false,
          bio: "Frontend engineer with outstanding track record of responsive web products and elegant UI widgets."
        },
        {
          uid: `demo_${Date.now()}_3`,
          displayName: "Arif Hossain",
          email: "arif.hossain@student.edu",
          role: "graduate",
          education: [
            {
              school: uName,
              degree: "B.Sc. in Computer Science",
              year: "2024",
              gpa: "3.45"
            }
          ],
          batch: "2024",
          skills: ["C++", "Algorithms", "Databases"],
          readinessScore: 62,
          jobSprintsJoined: true,
          bio: "Hardworking algorithms engineer familiar with database optimizations and backend logic."
        },
        {
          uid: `demo_${Date.now()}_4`,
          displayName: "Nusrat Jahan",
          email: "nusrat.jahan@student.edu",
          role: "graduate",
          education: [
            {
              school: uName,
              degree: "B.Sc. in Computer Engineering",
              year: "2025",
              gpa: "3.68"
            }
          ],
          batch: "2025",
          skills: ["Python", "Django", "APIs"],
          readinessScore: 71,
          jobSprintsJoined: false,
          bio: "Backend developer interested in Django, REST API compliance, and secure software development."
        }
      ];

      for (const d of demos) {
        await setDoc(doc(db, 'users', d.uid), d);
      }
      triggerToast(`Successfully enrolled 4 student profiles under "${uName}"!`);
    } catch (error) {
      console.error("Seeder error:", error);
      triggerToast("Error adding demo profiles to the database.");
    } finally {
      setIsSynced(false);
      setLastSyncText('Last synced: Just now');
    }
  };

  const localDemos = useMemo(() => {
    const uName = (profile?.university || '').trim() || "Greenwood University";
    return [
      {
        id: "demo_1",
        uid: "demo_1",
        displayName: "Rahim Chowdhury",
        email: "rahim.chowdhury@student.edu",
        role: "graduate",
        education: [
          {
            school: uName,
            degree: "B.Sc. in Computer Science & Engineering",
            year: "2024",
            gpa: "3.85"
          }
        ],
        batch: "2024",
        skills: ["Python", "Machine Learning", "System Design"],
        readinessScore: 78,
        jobSprintsJoined: true,
        bio: "Aspiring software architect concentrating on high scalable systems and machine learning data pipelines.",
        avatar: "RC",
        avatarColor: 'bg-indigo-500/10 text-indigo-600',
        status: "Seeking Mentorship",
        seekingMentorship: true,
        mentor: "Unassigned",
        sessionsCount: 1,
        resourcesCount: 3,
        assignmentsSubmitted: 5,
        quizzesCount: 2,
        quizScore: 66,
        skillDetails: {
          'Data Structures & Algorithms': 66,
          'System Design': 58,
          'Machine Learning': 73,
          'Database Management': 78,
          'Python / Programming': 88,
          'Cloud & DevOps': 54
        }
      },
      {
        id: "demo_2",
        uid: "demo_2",
        displayName: "Priya Das",
        email: "priya.das@student.edu",
        role: "graduate",
        education: [
          {
            school: uName,
            degree: "B.Sc. in Software Engineering",
            year: "2023",
            gpa: "3.92"
          }
        ],
        batch: "2023",
        skills: ["React", "TypeScript", "Node.js", "Tailwind CSS"],
        readinessScore: 85,
        jobSprintsJoined: false,
        bio: "Frontend engineer with outstanding track record of responsive web products and elegant UI widgets.",
        avatar: "PD",
        avatarColor: 'bg-emerald-500/10 text-emerald-600',
        status: "Active",
        seekingMentorship: false,
        mentor: "Unassigned",
        sessionsCount: 1,
        resourcesCount: 3,
        assignmentsSubmitted: 5,
        quizzesCount: 2,
        quizScore: 80,
        skillDetails: {
          'Data Structures & Algorithms': 73,
          'System Design': 65,
          'Machine Learning': 80,
          'Database Management': 85,
          'Python / Programming': 95,
          'Cloud & DevOps': 61
        }
      },
      {
        id: "demo_3",
        uid: "demo_3",
        displayName: "Arif Hossain",
        email: "arif.hossain@student.edu",
        role: "graduate",
        education: [
          {
            school: uName,
            degree: "B.Sc. in Computer Science",
            year: "2024",
            gpa: "3.45"
          }
        ],
        batch: "2024",
        skills: ["C++", "Algorithms", "Databases"],
        readinessScore: 62,
        jobSprintsJoined: true,
        bio: "Hardworking algorithms engineer familiar with database optimizations and backend logic.",
        avatar: "AH",
        avatarColor: 'bg-rose-500/10 text-rose-600',
        status: "Seeking Mentorship",
        seekingMentorship: true,
        mentor: "Unassigned",
        sessionsCount: 1,
        resourcesCount: 3,
        assignmentsSubmitted: 5,
        quizzesCount: 2,
        quizScore: 57,
        skillDetails: {
          'Data Structures & Algorithms': 50,
          'System Design': 42,
          'Machine Learning': 57,
          'Database Management': 62,
          'Python / Programming': 72,
          'Cloud & DevOps': 38
        }
      },
      {
        id: "demo_4",
        uid: "demo_4",
        displayName: "Nusrat Jahan",
        email: "nusrat.jahan@student.edu",
        role: "graduate",
        education: [
          {
            school: uName,
            degree: "B.Sc. in Computer Engineering",
            year: "2025",
            gpa: "3.68"
          }
        ],
        batch: "2025",
        skills: ["Python", "Django", "APIs"],
        readinessScore: 71,
        jobSprintsJoined: false,
        bio: "Backend developer interested in Django, REST API compliance, and secure software development.",
        avatar: "NJ",
        avatarColor: 'bg-amber-500/10 text-amber-600',
        status: "Active",
        seekingMentorship: false,
        mentor: "Unassigned",
        sessionsCount: 1,
        resourcesCount: 3,
        assignmentsSubmitted: 5,
        quizzesCount: 2,
        quizScore: 66,
        skillDetails: {
          'Data Structures & Algorithms': 59,
          'System Design': 51,
          'Machine Learning': 66,
          'Database Management': 71,
          'Python / Programming': 81,
          'Cloud & DevOps': 47
        }
      }
    ];
  }, [profile?.university]);

  const aggregatedStudentsList = useMemo(() => {
    if (showLocalDemo) {
      const liveIds = new Set(liveStudents.map(s => s.id || s.uid));
      const filteredDemos = localDemos.filter(d => !liveIds.has(d.id));
      return [...liveStudents, ...filteredDemos];
    }
    return liveStudents;
  }, [liveStudents, showLocalDemo, localDemos]);

  // Automated/Dynamic AI Cohort Report fetch
  useEffect(() => {
    if (activeTab === 'curriculum-insights' && aggregatedStudentsList.length > 0) {
      const cacheKey = `uni_report_${targetUniversity}_${aggregatedStudentsList.length}`;
      // 1. Try to load from localStorage cache first
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setAiReport(JSON.parse(cached));
          return;
        }
      } catch (parseErr) {
        console.warn("Error reading cached report:", parseErr);
      }

      // 2. Generate new report if not cached
      const runReportGen = async () => {
        setIsRegenerating(true);
        try {
          const cohortData = aggregatedStudentsList.map((stu) => ({
            skills: Array.isArray(stu.skills) ? stu.skills : [],
            weaknesses: Array.isArray(stu.weaknesses) ? stu.weaknesses : []
          }));
          const report = await generateUniversityReport(targetUniversity, cohortData);
          setAiReport(report);
          
          // Cache the report
          localStorage.setItem(cacheKey, JSON.stringify(report));
          triggerToast('AI dynamic curriculum report synchronized from student profiles!');
        } catch (err) {
          console.error("Failed to generate AI report automatically:", err);
          triggerToast("Could not synthesize latest metrics dynamically.");
        } finally {
          setIsRegenerating(false);
        }
      };

      runReportGen();
    }
  }, [activeTab, aggregatedStudentsList.length, targetUniversity]);

  // Analyze aggregate strengths, weaknesses, and skill gaps dynamically after analyzing matched student accounts
  const skillAnalysisDetails = useMemo(() => {
    if (aggregatedStudentsList.length === 0) return [];
    
    return HEATMAP_ROWS.map((skill) => {
      let weakCount = 0;
      let strongCount = 0;
      let totalScore = 0;
      
      aggregatedStudentsList.forEach((stu) => {
        // Dynamic competency score mapping
        const score = stu.skillDetails?.[skill] || (stu.score - (skill.includes('Cloud') || skill.includes('Design') ? 15 : 5));
        totalScore += score;
        
        // Is it a weakness? (score < 65 or explicitly listed in weaknesses)
        const hasExplicitWeakness = Array.isArray(stu.weaknesses) && stu.weaknesses.some((w: string) => w.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(w.toLowerCase()));
        if (score < 65 || hasExplicitWeakness) {
          weakCount++;
        }
        
        // Is it a strength? (score >= 75 or explicitly listed in skills)
        const hasExplicitStrength = Array.isArray(stu.skills) && stu.skills.some((s: string) => s.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(s.toLowerCase()));
        if (score >= 75 || hasExplicitStrength) {
          strongCount++;
        }
      });
      
      const weakPercent = Math.round((weakCount / aggregatedStudentsList.length) * 100);
      const strongPercent = Math.round((strongCount / aggregatedStudentsList.length) * 100);
      const avgScore = Math.min(100, Math.max(0, Math.round(totalScore / aggregatedStudentsList.length)));
      
      return {
        skill,
        weakPercent, // Skill Gap %
        strongPercent, // Competency Strength %
        avgScore, // Average Score/100
        weakCount,
        strongCount
      };
    });
  }, [aggregatedStudentsList]);

  // Compute top weak areas dynamically
  const criticalGaps = useMemo(() => {
    if (skillAnalysisDetails.length === 0) return [];
    return [...skillAnalysisDetails]
      .sort((a,b) => b.weakPercent - a.weakPercent)
      .slice(0, 5);
  }, [skillAnalysisDetails]);

  // Filters stage 1
  const filteredRoster = aggregatedStudentsList.filter((stu) => {
    const text = `${stu.name} ${stu.email} ${stu.skills.join(' ')}`.toLowerCase();
    const queryMatch = text.includes(studentSearch.toLowerCase());
    const batchMatch = selectedBatch === 'all' || stu.batch === selectedBatch;
    const statusMatch = selectedStatus === 'all' || stu.status.toLowerCase() === selectedStatus.toLowerCase();
    return queryMatch && batchMatch && statusMatch;
  });

  const studentsPerPage = 8;
  const totalPages = Math.max(1, Math.ceil(filteredRoster.length / studentsPerPage));
  const paginatedRoster = filteredRoster.slice(
    (currentPage - 1) * studentsPerPage,
    currentPage * studentsPerPage
  );

  const handleExportCSV = () => {
    const headers = 'ID,Name,Batch,Competency Score,Status,Email,Primary Skills\n';
    const rows = filteredRoster.map(s => 
      `"${s.id}","${s.name}","${s.batch}",${s.score},"${s.status}","${s.email}","${s.skills.join(', ')}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${targetUniversity}_Student_Index_Export.csv`);
    a.click();
    triggerToast('Student index exported as CSV successfully');
  };

  const handleRegenerateAI = async () => {
    if (aggregatedStudentsList.length === 0) {
      triggerToast('No students matched to analyze.');
      return;
    }
    setIsRegenerating(true);
    try {
      const cohortData = aggregatedStudentsList.map((stu) => ({
        skills: Array.isArray(stu.skills) ? stu.skills : [],
        weaknesses: Array.isArray(stu.weaknesses) ? stu.weaknesses : []
      }));
      const report = await generateUniversityReport(targetUniversity, cohortData);
      setAiReport(report);
      
      const cacheKey = `uni_report_${targetUniversity}_${aggregatedStudentsList.length}`;
      localStorage.setItem(cacheKey, JSON.stringify(report));
      
      triggerToast('AI dynamic analysis generated successfully from latest cohort!');
    } catch (err) {
      console.error("AI report manual generation error:", err);
      triggerToast("Error updating dynamic AI metrics.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadReport = () => {
    const headers = "Metric,Value / Analysis\n";
    const dGaps = criticalGaps.map(g => `${g.skill},${g.weakPercent}% gap`);
    const rows = [
      `Total CareerBridge Students,${aggregatedStudentsList.length}`,
      `Primary Institutional Strength,${criticalGaps[criticalGaps.length - 1]?.skill || 'Programming'}`,
      `Primary Skill Deficiency,${criticalGaps[0]?.skill || 'Cloud Configuration'}`,
      ...dGaps
    ].join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${targetUniversity}_Anonymized_SkillGap_Report.csv`);
    a.click();
    triggerToast('Downloaded anonymized skill gap report.');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#ffffff] text-[#37352f] font-sans antialiased selection:bg-[#2383e2]/20">
      {/* Toast Alert Drawer */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.96 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#37352f] text-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2.5 text-xs font-medium tracking-wide"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00D4FF] animate-pulse" />
            <span>{showToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          [3] SIDEBAR SECTION (Student Role UI Style Side Nav)
         ========================================== */}
      <aside className={`hidden md:flex bg-bg-secondary text-text-primary flex-col shrink-0 sticky top-0 h-screen z-30 border-r border-border transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-52'}`}>
        {/* Top Brand Logo */}
        <div className="p-4 pb-4 flex items-center justify-between gap-2 border-b border-border/60">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <GraduationCap className="w-3.5 h-3.5 text-primary-text" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-[16px] tracking-tight text-text-primary whitespace-nowrap">CareerBridge</span>
            )}
          </div>
          <button 
            onClick={toggleSidebar} 
            className="p-1 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-all hidden md:block cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* [3] Side Navigation Items */}
        <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {isCollapsed ? (
              <div className="border-t border-border/50 my-3 mx-1" />
            ) : (
              <h3 className="px-3 text-[10px] font-bold tracking-widest text-text-muted mb-2 opacity-50 uppercase">
                WORKSPACE
              </h3>
            )}
            {[
              { id: 'dashboard-overview', label: 'Dashboard Overview', icon: LayoutGrid, count: null },
              { id: 'students', label: 'My Students', icon: Users, count: aggregatedStudentsList.length > 0 ? aggregatedStudentsList.length.toString() : null },
              { id: 'curriculum-insights', label: 'Curriculum Insights', icon: Lightbulb, count: aggregatedStudentsList.length > 0 ? 'AI' : null },
              { id: 'reports-analytics', label: 'Reports & Analytics', icon: BarChart3, count: null },
              { id: 'industry-connections', label: 'Partnered Industries', icon: Briefcase, count: partneredIndustries.length > 0 ? partneredIndustries.length.toString() : null },
              { id: 'settings', label: 'Settings', icon: Settings, count: null },
            ].map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id === 'dashboard-overview') {
                      triggerToast('Redirecting overview. Filter configured to Student Intelligence.');
                    } else {
                      triggerToast(`Switched view to ${item.label}`);
                    }
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all group text-[13px] font-medium relative cursor-pointer ${
                    isActive
                      ? 'bg-primary/5 text-primary font-bold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isActive && (
                      <motion.div 
                        layoutId="university-sidebar-accent"
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-full" 
                      />
                    )}
                    <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.count && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-primary/10 text-primary shrink-0">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Card / Footer */}
        <div className="p-4 border-t border-border bg-bg-primary/30">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-4">
              <div 
                className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-emerald-500/20 shrink-0"
                title={representativeName}
              >
                {representativeName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <button
                onClick={signOut}
                className="p-2 text-text-muted hover:text-error hover:bg-error-light rounded-lg transition-all border border-transparent hover:border-error/10 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="p-3 bg-bg-secondary rounded-xl border border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-emerald-500/20 shrink-0">
                  {representativeName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate" title={representativeName}>{representativeName}</p>
                  <p className="text-[11px] text-text-muted truncate">Faculty Chairman</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-bold tracking-widest text-text-muted hover:text-error hover:bg-error-light rounded-lg transition-all border border-transparent hover:border-error/10 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                SIGN OUT
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-52 bg-bg-secondary text-text-primary flex flex-col z-50 border-r border-border md:hidden"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary text-primary-text flex items-center justify-center shadow-lg shadow-primary/20">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-[15px] text-text-primary">CareerBridge</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-text-muted hover:text-text-primary rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto custom-scrollbar">
                <h3 className="px-3 text-[10px] font-bold tracking-widest text-text-muted mb-2 opacity-50 uppercase">
                  WORKSPACE
                </h3>
                {[
                  { id: 'dashboard-overview', label: 'Dashboard Overview', icon: LayoutGrid, count: null },
                  { id: 'students', label: 'My Students', icon: Users, count: aggregatedStudentsList.length > 0 ? aggregatedStudentsList.length.toString() : null },
                  { id: 'curriculum-insights', label: 'Curriculum Insights', icon: Lightbulb, count: aggregatedStudentsList.length > 0 ? 'AI' : null },
                  { id: 'reports-analytics', label: 'Reports & Analytics', icon: BarChart3, count: null },
                  { id: 'industry-connections', label: 'Partnered Industries', icon: Briefcase, count: partneredIndustries.length > 0 ? partneredIndustries.length.toString() : null },
                  { id: 'settings', label: 'Settings', icon: Settings, count: null },
                ].map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer ${
                        isActive
                          ? 'bg-primary/5 text-primary font-bold'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.count && (
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-primary/10 text-primary shrink-0">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-border bg-bg-primary/30">
                <div className="p-3 bg-bg-secondary rounded-xl border border-border flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-emerald-500/20 shrink-0">
                    {representativeName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{representativeName}</p>
                    <p className="text-[11px] text-text-muted truncate">Faculty Chairman</p>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-bold tracking-widest text-text-muted hover:text-error hover:bg-error-light rounded-lg transition-all border border-transparent hover:border-error/10 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  SIGN OUT
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ==========================================
          MAIN AREA (Zones 1, 2, 5)
         ========================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative bg-white">
        
        {/* Sticky Top Utility Bar */}
        <header className="h-12 px-6 lg:px-10 flex shrink-0 justify-between items-center bg-white border-b border-[#e9e9e7]/80 sticky top-0 z-10 text-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 text-[#6b6b67] hover:bg-[#fbfbfa] rounded-md"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-[11px] text-[#6b6b67]">
              <span className="font-medium">University Directory</span>
              <span>/</span>
              <span className="text-[#37352f] font-semibold">{targetDepartment}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleReload}
              className="flex items-center gap-1.5 text-[11px] text-[#6b6b67] hover:text-[#37352f] transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isSynced ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{lastSyncText}</span>
            </button>

            <button
              onClick={() => {
                if (showLocalDemo) {
                  setShowLocalDemo(false);
                  localStorage.removeItem('university_demo_active');
                  triggerToast('Demo seeds hidden.');
                } else {
                  enrollDemoStudents();
                }
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
                showLocalDemo 
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                  : 'bg-[#fbfbfa] border-[#e9e9e7] text-[#37352f] hover:bg-[#efefef]'
              }`}
            >
              {showLocalDemo ? 'Clear Demo Seeds' : 'Seed Demo Students'}
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowBellDropdown(!showBellDropdown)}
                className="p-1.5 text-[#6b6b67] hover:text-[#37352f] hover:bg-[#fbfbfa] rounded-md transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
              </button>

              {showBellDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowBellDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-[#e9e9e7] rounded-lg shadow-lg p-3 z-40 space-y-2">
                    <p className="text-[11px] font-semibold text-[#37352f] border-b border-[#e9e9e7] pb-1.5">Academic Notifications</p>
                    <div className="space-y-2 text-xs">
                      <div className="p-1.5 rounded hover:bg-[#fbfbfa]">
                        <p className="font-semibold text-[#37352f]">Cloud Gap Identified</p>
                        <p className="text-[11px] text-[#6b6b67]">Cloud competency measures reflect persistent weakness.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Notion Canvas */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 space-y-8">

          {/* ==========================================
              [1] UNIVERSITY NAME & [2] DEPARTMENT NAME ZONES
              (Only show on Dashboard Overview panel)
             ========================================== */}
          {activeTab === 'dashboard-overview' && (
            <div className="border-b border-[#e9e9e7] pb-6 space-y-1.5">
              {/* [1] University Name: Large serif heading */}
              <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-[#37352f] leading-tight">
                {targetUniversity}
              </h1>

              {/* [2] Department Name: Muted subtitle directly underneath */}
              <p className="text-base md:text-lg text-[#6b6b67] font-sans font-normal flex items-center gap-2">
                <span>{targetDepartment}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#fbfbfa] border border-[#e9e9e7] text-[#37352f] font-mono">
                  Faculty Board Portal
                </span>
              </p>
            </div>
          )}

          {/* If no students exist, show empty directory with seeder option */}
          {aggregatedStudentsList.length === 0 ? (
            /* EMPTY COLD START DECORATION */
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-secondary/40 border border-border rounded-2xl p-16 text-center max-w-2xl mx-auto space-y-6 shadow-sm"
            >
              <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-text-primary">Empty University Directory Status</h4>
                <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                  We searched Firestore but found 0 candidate profiles that matches your signup organization 
                  <strong className="text-primary font-bold"> "{targetUniversity}"</strong>.
                </p>
              </div>
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-xs text-text-secondary max-w-md mx-auto space-y-3 leading-relaxed">
                <p className="font-semibold text-text-primary">💡 Want to preview the intelligence system?</p>
                <p>Click below to seamlessly seed 4 high-quality candidate records with real-time skills data under your university into Firestore. This will instantly activate the heatmaps and AI recommendations panels!</p>
              </div>
              <button
                onClick={enrollDemoStudents}
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs font-bold tracking-widest transition-all uppercase flex items-center justify-center gap-2 mx-auto shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Seed Demo Students into Firestore</span>
              </button>
            </motion.div>
          ) : (
            <>
              {/* ==========================================
                  STAGE 3 — DYNAMIC SKILL GAP WORKSPACE
                 ========================================== */}
          {activeTab === 'dashboard-overview' && aggregatedStudentsList.length > 0 && (
            <section className="bg-white border border-[#e9e9e7] rounded-xl p-6 md:p-8 space-y-6 relative text-[#37352f]">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl font-bold tracking-tight text-[#37352f]">
                    Graduate Skill Gaps & Competency Diagnostics
                  </h3>
                  <span className="text-[10px] bg-[#fbfbfa] border border-[#e9e9e7] text-[#37352f] font-mono py-0.5 px-2.5 rounded-full font-medium">
                    Real-time Analysis
                  </span>
                </div>
                <p className="text-xs text-[#6b6b67] leading-relaxed">
                  Dynamically aggregated after analyzing {aggregatedStudentsList.length} candidate profiles matching <strong className="text-[#37352f]">"{targetUniversity}"</strong>.
                </p>
              </div>

              {/* Dynamic scrollable row of critical gaps tags */}
              <div className="flex gap-2 pb-1 overflow-x-auto custom-scrollbar py-1 border-b border-[#e9e9e7]">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[#6b6b67] flex items-center mr-1">CRITICAL SKILL GAPS:</span>
                {criticalGaps.map(({ skill, weakPercent }) => (
                  <button 
                    key={skill} 
                    onClick={() => setSelectedAnalysisSkill(skill)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selectedAnalysisSkill === skill 
                        ? 'bg-[#37352f] text-white' 
                        : 'bg-[#fbfbfa] text-[#37352f] border border-[#e9e9e7] hover:bg-[#efefef]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>{skill}</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${selectedAnalysisSkill === skill ? 'bg-white/20 text-white' : 'bg-[#e9e9e7] text-[#37352f]'}`}>{weakPercent}% gap</span>
                  </button>
                ))}
              </div>

              {/* SPLIT SCREEN WORKSPACE LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
                
                {/* LEFT PANEL: Core Skill Gaps list */}
                <div className="lg:col-span-5 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
                    <span>Select Skill Area to Diagnose</span>
                  </p>
                  
                  <div className="space-y-2 max-h-[490px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {skillAnalysisDetails.map((item) => {
                      const isSelected = selectedAnalysisSkill === item.skill;
                      
                      let statusText = 'Low Gap';
                      let statusColor = 'text-emerald-600 bg-emerald-500/10 border-emerald-500/25';
                      if (item.weakPercent > 65) {
                        statusText = 'Critical Gap';
                        statusColor = 'text-rose-600 bg-rose-500/10 border-rose-500/25';
                      } else if (item.weakPercent > 35) {
                        statusText = 'Moderate Gap';
                        statusColor = 'text-amber-600 bg-amber-500/10 border-amber-500/25';
                      }

                      return (
                        <div
                          key={item.skill}
                          onClick={() => setSelectedAnalysisSkill(item.skill)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 relative ${
                            isSelected 
                              ? 'bg-gradient-to-r from-[#090979]/10 to-[#00D4FF]/10 border-[#00D4FF] shadow-xs ring-1 ring-[#00D4FF]/30' 
                              : 'bg-bg-secondary/40 border-border hover:bg-bg-secondary/80 hover:border-border/80'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-text-primary leading-tight truncate">{item.skill}</h4>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${statusColor}`}>
                              {statusText}
                            </span>
                          </div>

                          {/* Dual track visual comparison strip */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-text-secondary font-medium">
                              <span className="flex items-center gap-1">Gap: <strong className="text-rose-500">{item.weakPercent}%</strong></span>
                              <span className="flex items-center gap-1">Strong: <strong className="text-emerald-500">{item.strongPercent}%</strong></span>
                            </div>
                            <div className="w-full h-2 bg-bg-primary/80 rounded-full overflow-hidden flex shadow-inner">
                              <div className="bg-gradient-to-r from-rose-600 to-rose-400 h-full" style={{ width: `${item.weakPercent}%` }} />
                              <div className="bg-bg-primary h-full flex-1" />
                              <div className="bg-gradient-to-r from-[#00D4FF] to-emerald-400 h-full" style={{ width: `${item.strongPercent}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT PANEL: Interactive Diagnostics Workspace for Selected Skill */}
                <div className="lg:col-span-7 bg-bg-secondary/40 border border-border rounded-2xl p-6 flex flex-col justify-between shadow-xs">
                  {(() => {
                    const currentSkillData = skillAnalysisDetails.find(s => s.skill === selectedAnalysisSkill) || skillAnalysisDetails[0] || {
                      skill: selectedAnalysisSkill,
                      weakPercent: 0,
                      strongPercent: 0,
                      avgScore: 0,
                      weakCount: 0,
                      strongCount: 0
                    };

                    // Analyze strength/weakness rosters dynamically
                    const strongStudents: any[] = [];
                    const weakStudents: any[] = [];
                    aggregatedStudentsList.forEach((stu) => {
                      const score = stu.skillDetails?.[currentSkillData.skill] || (stu.score - 5);
                      const isWeak = score < 65 || (Array.isArray(stu.weaknesses) && stu.weaknesses.some((w: string) => w.toLowerCase().includes(currentSkillData.skill.toLowerCase()) || currentSkillData.skill.toLowerCase().includes(w.toLowerCase())));
                      const isStrong = score >= 75 || (Array.isArray(stu.skills) && stu.skills.some((s: string) => s.toLowerCase().includes(currentSkillData.skill.toLowerCase()) || currentSkillData.skill.toLowerCase().includes(s.toLowerCase())));
                      
                      if (isWeak) weakStudents.push(stu);
                      else if (isStrong) strongStudents.push(stu);
                    });

                    return (
                      <div className="space-y-6">
                        
                        {/* Selected Title and Status Indicator */}
                        <div className="flex justify-between items-start border-b border-border pb-4 gap-4">
                          <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                              Active Analysis Panel
                            </p>
                            <h3 className="text-lg font-extrabold text-text-primary mt-1">{currentSkillData.skill}</h3>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-text-secondary uppercase font-bold">Average Score</p>
                            <span className="inline-block mt-1 px-3 py-1 bg-gradient-to-r from-[#090979] to-[#00D4FF] text-white text-sm font-extrabold rounded-xl shadow-xs">
                              {currentSkillData.avgScore} / 100
                            </span>
                          </div>
                        </div>

                        {/* Comparative stats boxes */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4.5 rounded-2xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20 space-y-1">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Cohort Gap</p>
                            <p className="text-3xl font-black text-rose-500">{currentSkillData.weakPercent}%</p>
                            <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
                              {currentSkillData.weakCount} of {aggregatedStudentsList.length} tracked graduates currently demonstrate a performance challenge here.
                            </p>
                          </div>

                          <div className="p-4.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 space-y-1">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Cohort Strengths</p>
                            <p className="text-3xl font-black text-emerald-500">{currentSkillData.strongPercent}%</p>
                            <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
                              {currentSkillData.strongCount} of {aggregatedStudentsList.length} tracked graduates exhibit high industry readiness metrics here.
                            </p>
                          </div>
                        </div>

                        {/* Detailed roster listings of actual matching student accounts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border/50">
                          
                          {/* Weak List */}
                          <div className="space-y-3">
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                              ⚠️ Gap Challenge ({weakStudents.length})
                            </h5>
                            {weakStudents.length === 0 ? (
                              <p className="text-[11px] text-text-secondary italic">No students flagged with weakness in this discipline.</p>
                            ) : (
                              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                                {weakStudents.map(student => (
                                  <div 
                                    key={student.id} 
                                    onClick={() => setSelectedStudent(student)}
                                    className="p-2.5 border border-border rounded-xl bg-card hover:border-rose-500/40 hover:bg-rose-500/5 transition cursor-pointer flex items-center justify-between"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold tracking-tight truncate">{student.name}</p>
                                      <p className="text-[9px] text-text-secondary">Batch {student.batch}</p>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                                      {student.skillDetails?.[currentSkillData.skill] || 55}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Strong List */}
                          <div className="space-y-3">
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                              ✅ Core Competence ({strongStudents.length})
                            </h5>
                            {strongStudents.length === 0 ? (
                              <p className="text-[11px] text-text-secondary italic">No students currently marked strong here.</p>
                            ) : (
                              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                                {strongStudents.map(student => (
                                  <div 
                                    key={student.id} 
                                    onClick={() => setSelectedStudent(student)}
                                    className="p-2.5 border border-border rounded-xl bg-card hover:border-emerald-500/40 hover:bg-emerald-500/5 transition cursor-pointer flex items-center justify-between"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold tracking-tight truncate">{student.name}</p>
                                      <p className="text-[9px] text-text-secondary">Batch {student.batch}</p>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                      {student.skillDetails?.[currentSkillData.skill] || 85}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>

                        {/* Micro Curriculum suggestions for selected gap */}
                        <div className="p-4 bg-gradient-to-r from-[#090979]/10 to-[#00D4FF]/10 rounded-2xl border border-[#00D4FF]/25 space-y-1.5">
                          <p className="text-[9px] uppercase font-black tracking-widest text-primary flex items-center gap-1">⚡ Suggested Diagnostics Action</p>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            {currentSkillData.weakPercent > 50 
                              ? `More than half of the matches show structural hurdles in "${currentSkillData.skill}". We strongly suggest recommending dedicated laboratory work units and real-world project portfolios.`
                              : `Competency levels are healthy or moderate. Reinforce core concepts of "${currentSkillData.skill}" inside classroom electives.`}
                          </p>
                        </div>

                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Below Grid Legend bar showing color scale */}
              <div className="flex flex-col sm:flex-row justify-between items-center pt-3 gap-4 text-[10px] font-bold text-text-secondary uppercase tracking-wide border-t border-border/50">
                <span>* Active Analysis maps profile data of matching institution graduates directly</span>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500" /> Challenging Gaps</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> High Strength Competencies</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-bg-primary border border-border" /> Neutral Area</span>
                </div>
              </div>

              {/* Heatmap statistics summaries */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 border-t border-border/60">
                <div className="p-5 bg-bg-secondary/40 border border-border/80 rounded-2xl flex gap-4 items-center hover:border-rose-500/30 transition-colors">
                  <div className="p-3 bg-gradient-to-br from-rose-500/20 to-rose-500/5 text-rose-500 rounded-xl border border-rose-500/20 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Most Critical Area</h4>
                    <p className="text-xs font-extrabold text-text-primary mt-1 leading-snug">
                      {criticalGaps[0] ? `${criticalGaps[0].weakPercent}% are weak in ${criticalGaps[0].skill}` : 'Full alignment'}
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-bg-secondary/40 border border-border/80 rounded-2xl flex gap-4 items-center hover:border-amber-500/30 transition-colors">
                  <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-600 rounded-xl border border-amber-500/20 shrink-0">
                    <TrendingUp className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Top Gap Concentration</h4>
                    <p className="text-xs font-extrabold text-text-primary mt-1 leading-snug">
                      {criticalGaps[0] ? `Strongest gaps reside in ${criticalGaps[0].skill}` : 'In balance'}
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-bg-secondary/40 border border-border/80 rounded-2xl flex gap-4 items-center hover:border-emerald-500/30 transition-colors">
                  <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-500 rounded-xl border border-emerald-500/20 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Strongest Area</h4>
                    <p className="text-xs font-extrabold text-text-primary mt-1 leading-snug">
                      {criticalGaps[criticalGaps.length - 1] ? `${100 - criticalGaps[criticalGaps.length - 1].weakPercent}% strong in ${criticalGaps[criticalGaps.length - 1].skill}` : 'Fully mapped'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ==========================================
              STAGE 4 — AI CURRICULUM INSIGHT PANEL
             ========================================== */}
          {activeTab === 'curriculum-insights' && aggregatedStudentsList.length > 0 && (
            <section className="bg-card text-text-primary rounded-3xl p-8 relative overflow-hidden shadow-xl border-l-4 border-l-primary border-t border-r border-b border-border">
              
              {/* Header top row */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 relative z-10 border-b border-border mb-8">
                <div className="space-y-1">
                  <p className="text-primary uppercase font-mono text-[10px] font-black tracking-widest">
                    AI CURRICULUM ANALYSIS
                  </p>
                  <h3 className="text-xl font-bold tracking-tight font-sans text-text-primary">
                    Recommended Curriculum Improvements
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    Based on skill gap data from {aggregatedStudentsList.length} {targetUniversity} students on platform · Calculated June 11, 2026
                  </p>
                </div>

                {/* Topbar AI Panel Action buttons */}
                <div className="flex items-center gap-2.5 w-full md:w-auto">
                  <button
                    onClick={handleRegenerateAI}
                    disabled={isRegenerating}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#090979]/15 to-[#00D4FF]/15 border border-[#00D4FF]/40 text-primary hover:bg-[#00D4FF]/25 rounded-xl text-xs font-bold tracking-wide transition-all uppercase flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-[#00D4FF] ${isRegenerating ? 'animate-spin' : ''}`} />
                    <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Analysis'}</span>
                  </button>

                  <button
                    onClick={() => triggerToast('Curriculum insights diagnostic report downloaded')}
                    className="px-4 py-2.5 bg-bg-secondary hover:bg-bg-secondary/80 border border-border text-text-primary rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer"
                  >
                    Export Report
                  </button>
                </div>
              </div>

              {/* Dynamic Loading Overlay for AI insights */}
              <AnimatePresence>
                {isRegenerating && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-bg-secondary/95 z-20 flex flex-col items-center justify-center gap-4"
                  >
                    <div className="w-10 h-10 border-4 border-primary/25 border-t-primary rounded-full animate-spin" />
                    <p className="font-mono text-xs text-primary tracking-widest uppercase animate-pulse">Running Neural Diagnostic Vitals...</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Diagnostic Summary Block */}
              <div className="bg-bg-secondary/50 border-l-4 border-l-primary rounded-2xl p-6 relative z-10 space-y-4 mb-8 shadow-inner">
                <h4 className="text-xs font-black uppercase text-text-primary tracking-widest flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Diagnosis Summary
                </h4>
                <p className="text-sm text-text-secondary leading-relaxed select-text font-normal">
                  Our system analyzed {aggregatedStudentsList.length} active {targetUniversity} student profiles on the platform. 
                  The analysis highlights core strengths and critical weakness nodes dynamically detected across student portfolios to guide syllabus refinement.
                </p>
                
                {aiReport ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-border/80">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block">Cohort Strengths</span>
                      <ul className="list-disc list-inside text-xs text-text-secondary space-y-1.5">
                        {(aiReport.mainStrengths || []).map((str, idx) => (
                          <li key={idx} className="leading-relaxed font-medium">{str}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">Critical Gaps / Weaknesses</span>
                      <ul className="list-disc list-inside text-xs text-text-secondary space-y-1.5">
                        {(aiReport.coreSkillGaps || []).map((gap, idx) => (
                          <li key={idx} className="leading-relaxed font-medium">{gap}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic leading-relaxed pt-2 border-t border-border">
                    Extracting dynamic cohort insights... Click "Regenerate Analysis" to force dynamic synthesis.
                  </p>
                )}
              </div>

              {/* Recommendation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                
                {aiReport && Array.isArray(aiReport.curriculumSuggestions) && aiReport.curriculumSuggestions.length > 0 ? (
                  aiReport.curriculumSuggestions.map((suggestion, idx) => {
                    const emojis = ['☁️', '🏗️', '🧩', '🧪', '🔒', '📊', '💻'];
                    const emoji = emojis[idx % emojis.length];

                    const priorities = [
                      { label: 'Critical Urgent', style: 'bg-rose-500/15 border border-rose-500/35 text-rose-500' },
                      { label: 'High Priority', style: 'bg-amber-500/15 border border-amber-500/35 text-amber-500' },
                      { label: 'Recommended Option', style: 'bg-primary/15 border border-primary/35 text-primary' }
                    ];
                    const priority = priorities[idx % priorities.length];

                    return (
                      <div key={idx} className="bg-bg-secondary/35 border border-border rounded-2xl p-6 hover:bg-bg-secondary/60 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-0.5 font-extrabold text-[9px] uppercase tracking-widest rounded-full ${priority.style}`}>
                              {priority.label}
                            </span>
                            <span className="text-2xl pt-1">{emoji}</span>
                          </div>
                          <div className="space-y-1.5">
                            <h5 className="font-extrabold text-sm text-text-primary group-hover:text-primary transition-colors leading-tight">
                              {suggestion.title}
                            </h5>
                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                              Target Course/Subject: {suggestion.subject}
                            </p>
                            <p className="text-xs text-text-secondary leading-relaxed font-light">
                              {suggestion.description}
                            </p>
                          </div>
                        </div>
                        <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-1.5 align-middle">
                          <span className="px-2 py-0.5 bg-bg-secondary/80 border border-border text-text-secondary rounded-md text-[9px] font-bold">#SyllabusUpdate</span>
                          <span className="px-2 py-0.5 bg-bg-secondary/80 border border-border text-text-secondary rounded-md text-[9px] font-bold">#AcademicImprovement</span>
                          <span className="ml-auto text-[9.5px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">AI Insight</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <>
                    {/* Fallback Static Cards when loading */}
                    {/* Card 1 */}
                    <div className="bg-bg-secondary/35 border border-border rounded-2xl p-6 hover:bg-bg-secondary/60 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 bg-rose-500/15 border border-rose-500/35 text-rose-500 font-extrabold text-[9px] uppercase tracking-widest rounded-full">
                            Critical
                          </span>
                          <span className="text-2xl pt-1">☁️</span>
                        </div>
                        <div className="space-y-1.5">
                          <h5 className="font-extrabold text-sm text-text-primary group-hover:text-primary transition-colors leading-tight">Introduce Cloud Computing as Core Course</h5>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            A persistent percentage of students show limited direct deployment experience. Current guidelines place DevOps as an elective. Recommend integrating practical Docker/AWS lab parameters securely.
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-1.5 align-middle">
                        <span className="px-2 py-0.5 bg-bg-secondary/80 border border-border text-text-secondary rounded-md text-[9px] font-bold">#Cloud</span>
                        <span className="px-2 py-0.5 bg-bg-secondary/80 border border-border text-text-secondary rounded-md text-[9px] font-bold">#DevOps</span>
                        <span className="ml-auto text-[9.5px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Urgent Focus</span>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-bg-secondary/35 border border-border rounded-2xl p-6 hover:bg-bg-secondary/60 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 bg-rose-500/15 border border-rose-500/35 text-rose-500 font-extrabold text-[9px] uppercase tracking-widest rounded-full">
                            Critical
                          </span>
                          <span className="text-2xl pt-1">🏗️</span>
                        </div>
                        <div className="space-y-1.5">
                          <h5 className="font-extrabold text-sm text-text-primary group-hover:text-primary transition-colors leading-tight">Introduce Applied System Design Labs</h5>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            Intermediate cohorts show difficulty in modular scaling and API trade-offs. Transition theoretical software studies towards practical microservices planning labs.
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-1.5 align-middle">
                        <span className="px-2 py-0.5 bg-bg-secondary/80 border border-border text-text-secondary rounded-md text-[9px] font-bold">#SystemDesign</span>
                        <span className="px-2 py-0.5 bg-bg-secondary/80 border border-border text-text-secondary rounded-md text-[9px] font-bold">#SoftwareEng</span>
                        <span className="ml-auto text-[9.5px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Affects Cohorts</span>
                      </div>
                    </div>
                  </>
                )}

              </div>

              {/* AI Panel footer block */}
              <div className="flex flex-col sm:flex-row justify-between items-center mt-10 pt-6 border-t border-border gap-4 relative z-10 text-xs font-semibold">
                <span className="text-text-secondary italic font-normal text-center sm:text-left">
                  Analysis dynamically powered by platform AI · Calculated from student data, diagnostic quizzes, and skill profiles
                </span>
                <button
                  onClick={() => triggerToast(`Curriculum guidelines synchronized to Faculty HOD board`)}
                  className="px-6 py-3 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl text-xs font-bold tracking-widest transition-all uppercase flex items-center justify-center gap-2 group/share cursor-pointer shadow-md"
                >
                  <span>Share with Faculty Board</span>
                  <Share2 className="w-3.5 h-3.5 group-hover/share:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </section>
          )}

          {/* ==========================================
              TAB 2: MY STUDENTS GRID LAYOUT — HIGHLIGHTING COVER, NAME, BATCH, CV RATE
             ========================================== */}
          {activeTab === 'students' && (
            <div className="space-y-8">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-text-primary tracking-tight font-sans">University Student Roster</h3>
                <p className="text-xs text-text-secondary font-light">Registered student profiles matching institutional email domain or curriculum enrollments.</p>
              </div>

              {/* Search & batch controls */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-bg-secondary p-4 border border-border rounded-2xl font-sans">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={studentSearch} 
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search student or skill..." 
                    className="p-2 sm:p-2.5 pl-10 bg-bg-primary border border-border rounded-xl text-xs text-text-primary outline-none focus:border-primary w-full"
                  />
                </div>
                <div className="flex gap-2.5 w-full sm:w-auto">
                  <select 
                    value={selectedBatch} 
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="p-2 sm:p-2.5 bg-bg-primary border border-border rounded-xl text-xs text-text-primary outline-none focus:border-primary font-sans"
                  >
                    <option value="all">All Batches</option>
                    <option value="2024">Batch of 2024</option>
                    <option value="2025">Batch of 2025</option>
                    <option value="2026">Batch of 2026</option>
                  </select>
                  <button onClick={handleExportCSV} className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-primary/20 transition-all font-sans">
                    Export Index
                  </button>
                </div>
              </div>

              {/* Student Card Grid */}
              {filteredRoster.length === 0 ? (
                <div className="p-16 text-center border border-dashed border-border rounded-3xl text-sm text-text-secondary font-light">
                  No students matching your filters found. Try registering more students or seed demo profiles.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredRoster.map((student) => {
                    // Calculate an elegant gradient cover based on name
                    const idx = student.name.charCodeAt(0) % 5;
                    const covers = [
                      'from-indigo-500/30 to-purple-500/20',
                      'from-emerald-500/30 to-teal-500/20',
                      'from-rose-500/30 to-orange-500/20',
                      'from-pink-500/30 to-blue-500/20',
                      'from-cyan-500/30 to-indigo-500/20'
                    ];
                    const selectedCover = covers[idx];

                    return (
                      <div 
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className="bg-bg-secondary border border-border rounded-[2rem] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                      >
                        {/* Cover Photo */}
                        <div className={`h-24 bg-gradient-to-br ${selectedCover} relative flex items-end justify-center pb-4`}>
                          <div className="absolute top-3.5 right-3.5 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider">
                            {student.status}
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-6 pt-0 relative flex flex-col items-center text-center -mt-8 flex-1">
                          {/* Profile Pic Circle */}
                          <div className="w-16 h-16 rounded-full border-4 border-bg-secondary bg-primary text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
                            {student.avatar}
                          </div>

                          <div className="mt-4 space-y-1">
                            <h4 className="font-extrabold text-sm text-text-primary group-hover:text-primary transition-colors leading-tight truncate max-w-[160px]">
                              {student.name}
                            </h4>
                            <p className="text-[10px] text-text-secondary leading-none">Batch of {student.batch}</p>
                          </div>

                          {/* Progress bar / Circle for CV Competency Rate */}
                          <div className="w-full mt-6 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-text-secondary font-light">Competency Index</span>
                              <span className="text-primary">{student.score}%</span>
                            </div>
                            <div className="w-full bg-bg-primary h-1.5 rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${student.score}%` }} />
                            </div>
                          </div>

                          {/* Micro skill tags */}
                          <div className="flex flex-wrap gap-1 mt-4 justify-center">
                            {student.skills.slice(0, 2).map((s: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 bg-bg-primary border border-border text-text-secondary rounded text-[8px] font-bold uppercase truncate max-w-[80px]">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              TAB 4: REPORTS & ANALYTICS — ANONYMIZED REPORT GENERATION
             ========================================== */}
          {activeTab === 'reports-analytics' && (
            <div className="bg-bg-secondary p-8 md:p-10 border border-border rounded-[2.5rem] space-y-8 max-w-4xl mx-auto text-text-primary">
              <div className="flex flex-col sm:flex-row justify-between items-start border-b border-border pb-6 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] bg-primary/10 border border-primary/25 text-primary py-0.5 px-2.5 rounded-full uppercase font-black tracking-widest leading-none">Anonymized Analysis Ledger</span>
                  <h3 className="text-2xl font-bold text-text-primary tracking-tight font-sans">Institutional Skill Gap Diagnostic</h3>
                  <p className="text-xs text-text-secondary font-light">{targetUniversity} · {profile?.department || "Computer Science Department"}</p>
                </div>
                <button 
                  onClick={handleDownloadReport}
                  className="px-4 py-2.5 bg-primary text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-115 shadow-sm transition-all flex items-center gap-2 font-sans shrink-0"
                >
                  <Download className="w-4 h-4" /> Download Anonymized Report
                </button>
              </div>

              {/* Stats Summary Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-bg-primary border border-border rounded-xl p-6 text-center space-y-1">
                  <p className="text-[10px] font-black tracking-widest text-[#6B7C93] dark:text-text-secondary uppercase font-sans">Active Cohorts Size</p>
                  <p className="text-3xl font-extrabold text-primary font-mono">{aggregatedStudentsList.length}</p>
                  <p className="text-[10px] text-text-secondary font-light">Fully analyzed profiles</p>
                </div>
                <div className="bg-bg-primary border border-border rounded-xl p-6 text-center space-y-1">
                  <p className="text-[10px] font-black tracking-widest text-[#6B7C93] dark:text-text-secondary uppercase font-sans">Overall Strengths Peak</p>
                  <p className="text-3xl font-extrabold text-emerald-500 font-mono">
                    {criticalGaps[criticalGaps.length - 1] ? `${100 - criticalGaps[criticalGaps.length - 1].weakPercent}%` : '85%'}
                  </p>
                  <p className="text-[10px] text-text-secondary font-light">In {criticalGaps[criticalGaps.length - 1]?.skill || 'Programming'}</p>
                </div>
                <div className="bg-bg-primary border border-border rounded-xl p-6 text-center space-y-1">
                  <p className="text-[10px] font-black tracking-widest text-[#6B7C93] dark:text-text-secondary uppercase font-sans">Core Curriculum Gap</p>
                  <p className="text-3xl font-extrabold text-rose-500 font-mono">
                    {criticalGaps[0] ? `${criticalGaps[0].weakPercent}%` : '62%'}
                  </p>
                  <p className="text-[10px] text-text-secondary font-light">In {criticalGaps[0]?.skill || 'DevOps'}</p>
                </div>
              </div>

              {/* Report Body Narrative */}
              <div className="space-y-6 border-t border-border pt-6 leading-relaxed">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-text-primary tracking-widest">Executive Summary</h4>
                  <p className="text-xs text-text-secondary leading-relaxed font-normal font-light">
                    There are currently <strong className="text-text-primary">{aggregatedStudentsList.length} students</strong> from <strong className="text-text-primary">{targetUniversity}</strong> cataloged inside the CareerBridge workspace. No specific student identifiers, batches, or demographic fields are disclosed in this ledger to preserve student privacy constraints while enabling data-driven course curation.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-text-primary tracking-widest">Core Insights Matrix</h4>
                  <div className="space-y-3 col-span-full">
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-start gap-3 text-xs">
                      <span className="text-lg">✅</span>
                      <div>
                        <p className="font-bold text-text-primary text-[13px]">Key Institutional Strengths Identified</p>
                        <p className="text-text-secondary mt-1 font-light">
                          The students demonstrate stellar competency and structural capabilities in <strong className="text-emerald-500 font-mono">{criticalGaps[criticalGaps.length - 1]?.skill || 'Core Programming Methods'}</strong> and <strong className="text-emerald-500 font-mono">{criticalGaps[criticalGaps.length - 2]?.skill || 'Data Management'}</strong>. Cohort readiness averages show excellent baseline comprehension of relational modeling and database rules.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl flex items-start gap-3">
                      <span className="text-lg">❌</span>
                      <div className="text-xs">
                        <p className="font-bold text-text-primary text-[13px]">Core Curriculum Skill Gaps & Deficiencies</p>
                        <p className="text-text-secondary mt-1 font-normal font-light">
                          The major technical constraints identified reside inside <strong className="text-rose-500 font-mono">{criticalGaps[0]?.skill || 'Cloud Administration'}</strong>, representing a <strong className="text-rose-500 font-mono">{criticalGaps[0]?.weakPercent}% gap</strong> across verified profiles, followed closely by <strong className="text-rose-500 font-mono">{criticalGaps[1]?.skill || 'Distributed Operations'}</strong> with a <strong className="text-rose-500 font-mono">{criticalGaps[1]?.weakPercent}% gap</strong>. These indicate critical deficits in microservices architectures, containerized workflow deployments, and live application infrastructure hosting.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase text-text-primary tracking-widest">Direct Industry-Bridge Feedback loop</h4>
                  <p className="text-xs text-text-secondary leading-relaxed font-normal font-light col-span-full">
                    The skill deficiencies strongly correlate with standard elective distributions. To resolve this, we advise partnering with the verified enterprise sponsors registered in the Industry Connection tab to coordinate live engineering talks and system labs.
                  </p>
                </div>

                {/* 3. Received Corporate Advisory & Student evaluations */}
                <div className="space-y-4 border-t border-border pt-6">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-500">
                      <Star className="w-4 h-4 fill-current" />
                    </span>
                    <h4 className="text-sm font-bold uppercase text-text-primary tracking-wider font-sans">Corporate Advisor Evaluations & Opinions ({industryOpinions.length})</h4>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed font-light">
                    Incoming feedback reports directly compiled by Platinum Enterprise Sponsors during live academic sessions. These represent verified external assessments of student readiness.
                  </p>

                  {industryOpinions.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-border rounded-2xl text-text-muted text-xs font-light">
                      No corporate student cohort evaluation checklists received yet. Schedule dynamic academic sessions in the "Outreach" tab to collect expert peer opinions.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {industryOpinions.map((op) => (
                        <div key={op.id} className="p-5 border border-indigo-500/10 bg-indigo-500/[0.02] hover:bg-indigo-500/[0.04] rounded-2xl space-y-3 transition-colors text-xs text-text-secondary leading-relaxed">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="font-bold text-text-primary text-[13px]">{op.industryName || "Enterprise Partner"}</p>
                              <p className="text-[10px] text-text-muted font-mono uppercase mt-0.5">Session Topic: "{op.sessionTopic || "Guest Lecture"}"</p>
                            </div>
                            <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full border ${
                              op.rating === 'Outstanding'
                                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500 font-bold'
                                : op.rating === 'Strong Skills'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-bold'
                                : op.rating === 'Moderate'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 font-bold'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-500 font-bold'
                            }`}>
                              Rating: {op.rating}
                            </span>
                          </div>

                          <div className="space-y-2 border-t border-border/40 pt-2.5 text-xs text-text-secondary font-light">
                            <div>
                              <span className="font-semibold text-text-primary">Corporate Opinion Assessment:</span>{" "}
                              <p className="italic mt-1 bg-bg-primary/50 p-3 rounded-lg border border-border/45 text-text-primary font-normal">
                                "{op.technicalReview}"
                              </p>
                            </div>
                            {op.suggestedCurriculumFocus && (
                              <div className="text-text-primary font-normal mt-2">
                                <span className="font-semibold text-indigo-500 text-[11px]">Proposed Curriculum Elective Course / Subject focus:</span>{" "}
                                <p className="mt-0.5 text-indigo-500 bg-indigo-500/5 py-1.5 px-3 rounded-lg font-mono text-[10px] border border-indigo-500/10">
                                  {op.suggestedCurriculumFocus}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 5: PARTNERED INDUSTRIES outreach page — REQUEST TALKS, SESSIONS, INTEGRATION INVITES
             ========================================== */}
          {activeTab === 'industry-connections' && (
            <div className="space-y-8 text-text-primary">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-text-primary tracking-tight font-sans">Partnered Enterprise Networks</h3>
                <p className="text-xs text-text-secondary font-light">Invite leading pre-vetted corporate partners and tech industry teams to support your student curriculum.</p>
              </div>

              {/* Industry List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {partneredIndustries.length === 0 ? (
                  <div className="p-12 text-center col-span-full border border-dashed border-border rounded-3xl text-sm text-text-secondary">
                    No registered and verified corporate partner nodes found on the CareerBridge platform.
                  </div>
                ) : (
                  partneredIndustries.map((ind) => (
                    <div key={ind.id} className="bg-bg-secondary border border-border rounded-[2rem] p-6 hover:shadow-lg transition-all flex flex-col justify-between group space-y-5">
                      <div className="space-y-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/15 text-indigo-500 flex items-center justify-center font-bold text-lg">
                          {ind.company ? ind.company[0].toUpperCase() : 'B'}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-text-primary group-hover:text-primary transition-colors leading-tight">{ind.company || 'Enterprise Partner'}</h4>
                          <p className="text-[10px] text-text-secondary">{ind.title || "Elite Corporate Sponsor"}</p>
                          <p className="text-[9px] text-[#6B7C93] dark:text-text-secondary flex items-center gap-1">📍 {ind.location || "Remote / Hybrid Base"}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedIndustry(ind);
                          setSessionTopic("Guest Lecture on Systems Optimization");
                        }}
                        className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 font-sans"
                      >
                        Request Session/Talk
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Active Sessions Requests list */}
              <div className="space-y-4 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Outstanding Session Proposals & Feedback ({sentSessions.length})</h4>
                {sentSessions.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-border rounded-3xl text-sm text-text-secondary font-light">
                    No academic sessions requested yet. Click "Request Session/Talk" above to connect.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sentSessions.map((sess) => {
                      const indName = sess.industryName || "Corporate Partner";
                      return (
                        <div key={sess.id} className="p-5 border border-border bg-bg-secondary rounded-2xl space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-bold text-sm text-text-primary flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-primary" />
                                Joint Webinar / Talk with {indName}
                              </h5>
                              <p className="text-xs text-text-secondary mt-1 font-light">Topic: <strong className="text-text-primary">{sess.topic}</strong> (Target: {sess.department})</p>
                              <p className="text-[10px] text-text-muted mt-0.5">Submitted: {sess.createdAt ? new Date(sess.createdAt).toLocaleDateString() : 'Recent'}</p>
                            </div>
                            <div>
                              {sess.status === 'pending' ? (
                                <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-[9px] uppercase tracking-wider rounded-full font-mono">Pending Host Response</span>
                              ) : sess.status === 'accepted' ? (
                                <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-bold text-[9px] uppercase tracking-wider rounded-full font-mono font-bold">Approved & Scheduled</span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-slate-500/10 border border-slate-500/30 text-text-secondary font-bold text-[9px] uppercase tracking-wider rounded-full font-mono font-bold">Rejected</span>
                              )}
                            </div>
                          </div>

                          {sess.status === 'accepted' && (
                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3 text-xs">
                              <div className="space-y-1.5 text-text-secondary font-normal font-light">
                                <p className="font-semibold text-text-primary text-[13px] gap-2 flex items-center mb-2 font-sans font-bold">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Host Feedback details:
                                </p>
                                <p>📅 Schedule: <strong className="text-emerald-550">{sess.meetingTime}</strong></p>
                                <p>🔗 Meeting link coordinates: <a href={sess.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">{sess.meetingLink}</a></p>
                                {sess.feedback && <p className="text-text-muted italic">Host Note: "{sess.feedback}"</p>}
                              </div>

                              {/* Invite Students Button */}
                              <button
                                onClick={async () => {
                                  const studentsToNotify = liveStudents;
                                  try {
                                    await Promise.all(
                                      studentsToNotify.map(async (stu) => {
                                        await addDoc(collection(db, 'notifications'), {
                                          recipientId: stu.id,
                                          type: 'academic_talk_broadcast',
                                          title: 'New Academic Talk Invitation!',
                                          body: `Your department invites you to join with ${indName}. Schedule: ${sess.meetingTime}. Join coordinates: ${sess.meetingLink}`,
                                          isRead: false,
                                          createdAt: new Date().toISOString()
                                        });
                                      })
                                    );
                                    triggerToast(`Successfully broadcasted invitations to your student cohort!`);
                                  } catch (e) {
                                    console.error("Broadcast invitation issue:", e);
                                    triggerToast("Unable to record invitation notifications.");
                                  }
                                }}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow hover:brightness-110 active:scale-98 transition-all flex items-center gap-1.5 font-sans mt-2"
                              >
                                <Megaphone className="w-3.5 h-3.5" /> Broadcast Invitation to Students
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Request Modal */}
              {selectedIndustry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
                  <div className="bg-bg-primary border border-border rounded-[2.5rem] w-full max-w-lg p-8 space-y-6 relative">
                    <div className="space-y-1.5">
                      <h4 className="text-lg font-bold text-text-primary">Propose Session / Talk</h4>
                      <p className="text-xs text-text-secondary font-light">Introduce a technical request for {selectedIndustry.company}.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-[#6B7C93] dark:text-text-secondary uppercase tracking-widest font-mono">Topic title</label>
                        <input 
                          type="text" 
                          value={sessionTopic} 
                          onChange={(e) => setSessionTopic(e.target.value)}
                          className="w-full p-2.5 bg-bg-secondary border border-border rounded-xl text-xs outline-none focus:border-primary text-text-primary"
                          placeholder="e.g. Guidance on Cloud Scalability Labs" 
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-[#6B7C93] dark:text-text-secondary uppercase tracking-widest font-mono">Hosting Organization Department</label>
                        <input 
                          type="text" 
                          readOnly
                          value={profile?.department || "Computer Science Department"}
                          className="w-full p-2.5 bg-bg-secondary/40 border border-border rounded-xl text-xs outline-none text-text-muted"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-4">
                      <button 
                        onClick={async () => {
                          if (!sessionTopic) {
                            alert("Provide topic parameter title first.");
                            return;
                          }
                          const indId = selectedIndustry.uid || selectedIndustry.id;
                          await addDoc(collection(db, 'industry_sessions'), {
                            universityId: user?.uid || '',
                            universityName: profile?.university || "University Dept",
                            department: profile?.department || "Computer Science",
                            industryId: indId,
                            industryName: selectedIndustry.company,
                            topic: sessionTopic,
                            status: 'pending',
                            createdAt: new Date().toISOString()
                          });

                          // Send notification to industry partner
                          await addDoc(collection(db, 'notifications'), {
                            recipientId: indId,
                            type: 'academic_talk_proposal',
                            title: 'Academic talk proposal!',
                            body: `University Department of ${profile?.university || 'Academic Institution'} submitted a talk proposal: "${sessionTopic}".`,
                            isRead: false,
                            createdAt: new Date().toISOString()
                          });

                          // Dispatch EmailJS Notification to Industry
                          sendCrossRoleEmailNotification({
                            senderId: user?.uid,
                            senderName: profile?.university || 'University Department',
                            senderRole: 'university',
                            senderEmail: user?.email || '',
                            recipientId: indId,
                            recipientName: selectedIndustry.company,
                            recipientRole: 'industry',
                            subject: `Academic Talk Proposal: ${sessionTopic}`,
                            category: 'collaboration',
                            message: `${profile?.university || 'University Department'} proposed an academic session on "${sessionTopic}". Please review and schedule details in your dashboard.`,
                            actionUrl: window.location.origin
                          }).catch(e => console.warn('Email dispatch failed:', e));

                          triggerToast(`Outreach proposal successfully submitted to ${selectedIndustry.company}`);
                          setSelectedIndustry(null);
                          setSessionTopic('');
                        }}
                        className="flex-1 py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:brightness-110 transition-all font-sans"
                      >
                        Propose Session
                      </button>
                      <button 
                        onClick={() => setSelectedIndustry(null)}
                        className="px-4 py-2.5 bg-bg-secondary text-text-secondary hover:text-text-primary rounded-xl text-xs font-bold border border-border uppercase tracking-wider transition-all font-sans"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              TAB 6: SETTINGS PAGE — IDENTITIES WRAPPER
             ========================================== */}
          {activeTab === 'settings' && (
            <div className="max-w-xl bg-bg-secondary p-10 border border-border rounded-[2.5rem] space-y-8 text-text-primary">
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-text-primary tracking-tight font-sans font-extrabold">Institutional Identity Settings</h3>
                <p className="text-text-muted-foreground text-sm leading-relaxed font-light">
                  Manage how your university division is presented to platform candidates and corporate mentors.
                </p>
              </div>

              <div className="space-y-6 border-t border-border/60 pt-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest font-mono">University Name</label>
                  <input 
                    type="text" 
                    defaultValue={profile?.university || 'Partner University'}
                    onChange={async (e) => {
                      const val = e.target.value;
                      if (user) {
                        await updateDoc(doc(db, 'users', user.uid), { university: val });
                      }
                    }}
                    className="p-3.5 bg-bg-primary border border-border rounded-xl text-xs text-text-primary outline-none focus:border-primary w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest font-mono">Department / Subdivision</label>
                  <input 
                    type="text" 
                    defaultValue={profile?.department || 'Computer Science & Engineering'}
                    onChange={async (e) => {
                      const val = e.target.value;
                      if (user) {
                        await updateDoc(doc(db, 'users', user.uid), { department: val });
                      }
                    }}
                    className="p-3.5 bg-bg-primary border border-border rounded-xl text-xs text-text-primary outline-none focus:border-primary w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest font-mono">Registered Whitelist Domain</label>
                  <div className="p-3.5 bg-bg-primary border border-border rounded-xl text-xs text-text-muted select-all font-mono font-bold">
                    {profile?.emailDomain || 'No Whitelist registered. Contact Admin.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
      </div>

      {/* ==========================================
          STAGE 2 — STUDENT DETAIL SLID-IN SIDE PANEL
         ========================================== */}
      <AnimatePresence>
        {selectedStudent && (
          <>
            {/* Backdrop click to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="fixed inset-0 bg-black z-30 pointer-events-auto"
            />

            {/* Slide-in drawer container (400px wide) */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="fixed top-0 right-0 h-screen w-full sm:w-[400px] bg-bg-secondary border-l border-border shadow-2xl z-40 overflow-y-auto flex flex-col text-text-primary"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-bg-secondary">
                <span className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Candidate Profile Dossier</span>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 hover:bg-bg-primary rounded-full text-text-secondary hover:text-text-primary transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile card details */}
              <div className="p-6 space-y-8 flex-1">
                
                {/* Header Profile element */}
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-extrabold text-2xl border border-border bg-primary/10 text-primary`}>
                    {selectedStudent.avatar}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-text-primary leading-tight select-text">{selectedStudent.name}</h3>
                    <p className="text-xs text-text-secondary">Batch {selectedStudent.batch}</p>
                    <p className="text-[11px] text-primary font-mono leading-none select-text">{selectedStudent.email}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1.5 justify-center">
                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-600">
                      {selectedStudent.status}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-primary/10 text-primary`}>
                      Tracked
                    </span>
                  </div>

                  <p className="text-[10px] text-text-secondary font-semibold">Discovery check-in: {selectedStudent.lastActive}</p>
                </div>

                {/* Skill Competency profiles */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-text-secondary border-b border-border pb-2">
                    Skill Competency Profile
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(selectedStudent.skillDetails || {}).map(([skillTitle, score]) => {
                      let meterColor = 'bg-emerald-500';
                      let meterText = 'text-emerald-500';
                      const numScore = Number(score) || 50;
                      if (numScore < 40) { meterColor = 'bg-rose-500'; meterText = 'text-rose-500'; }
                      else if (numScore < 60) { meterColor = 'bg-orange-500'; meterText = 'text-orange-500'; }
                      else if (numScore < 80) { meterColor = 'bg-amber-500'; meterText = 'text-amber-500'; }

                      return (
                        <div key={skillTitle} className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-text-primary">{skillTitle}</span>
                            <span className={meterText}>{numScore}%</span>
                          </div>
                          <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                            <div className={`h-full ${meterColor} transition-all duration-500`} style={{ width: `${numScore}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Identified weaknesses tag */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-text-secondary border-b border-border pb-2">
                    Identified Weak Areas
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStudent.weaknesses.map((w, i) => (
                      <span key={i} className="px-2.5 py-1 text-xs font-bold bg-rose-500/10 border border-rose-500/10 text-rose-500 rounded-xl uppercase tracking-wider">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mentorship space logs */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-text-secondary border-b border-border pb-2">
                    Mentorship Activity
                  </h4>
                  <div className="bg-bg-primary border border-border rounded-2xl p-4 space-y-2 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-text-secondary font-medium">Mentor Connected:</span>
                      <span className="text-text-primary text-right">{selectedStudent.mentor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary font-medium">Sessions Completed:</span>
                      <span className="text-text-primary font-bold">{selectedStudent.sessionsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary font-medium">Guides Consumed:</span>
                      <span className="text-text-primary font-bold">{selectedStudent.resourcesCount}</span>
                    </div>
                  </div>
                </div>

                {/* Platform performance activity */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-text-secondary border-b border-border pb-2">
                    Platform Activity Vitals
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-bg-primary border border-border rounded-xl text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#6B7C93] dark:text-text-secondary">Assignments</p>
                      <p className="text-sm font-extrabold text-text-primary mt-1">{selectedStudent.assignmentsSubmitted}/12</p>
                    </div>
                    <div className="p-3 bg-bg-primary border border-border rounded-xl text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#6B7C93] dark:text-text-secondary">Av. Quiz Score</p>
                      <p className="text-sm font-extrabold text-text-primary mt-1">{selectedStudent.quizScore}%</p>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
