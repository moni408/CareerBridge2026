import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { 
  User, Award, FileText, Link as LinkIcon, BookOpen, 
  Target, GraduationCap, X, Check, ArrowRight, HelpCircle 
} from 'lucide-react';
import { awardXP } from '../services/mentorBackend';
import { useAuth } from '../App';

interface MenteeProfilePageProps {
  connection: any;
  onBack: () => void;
  onAssignTaskSuccess?: () => void;
}

export function MenteeProfilePage({ connection, onBack, onAssignTaskSuccess }: MenteeProfilePageProps) {
  const { user } = useAuth();
  const [menteeUser, setMenteeUser] = useState<any | null>(null);
  const [gaps, setGaps] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedGap, setSelectedGap] = useState<any | null>(null);

  // Form states for assigning task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState('Technical');
  const [taskSubmission, setTaskSubmission] = useState('URL');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskRubric, setTaskRubric] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!connection) return;

    // Listen to mentee user profile
    const userRef = doc(db, 'users', connection.menteeId);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setMenteeUser(snap.data());
      } else {
        // Fallback demo values
        setMenteeUser({
          displayName: connection.menteeName,
          readinessScore: 68,
          skills: [
            { name: 'React Development', score: 85 },
            { name: 'Tailwind CSS', score: 90 },
            { name: 'REST APIs', score: 55 },
            { name: 'PostgreSQL Indexes', score: 35 },
            { name: 'System Security', score: 45 }
          ],
          education: [
            { degree: 'B.Sc. in Computer Science', school: 'Tech University', year: '2022–2026' }
          ],
          portfolio: 'https://github.com/alhaz/portfolio',
          resumeUrl: 'https://careerbridge.edu/cv/alhaz_ali.pdf',
          certifications: ['AWS Certified Cloud Practitioner', 'Oracle Certified Java SE']
        });
      }
    });

    // Query gaps for this connection
    const gapsRef = doc(db, 'mentorship_connections', connection.id);
    const unsubGaps = onSnapshot(gapsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // Extract gaps or synthesize
        const list = [
          { id: 'gap_api', title: 'REST APIs Routing & Auth', status: 'not started' },
          { id: 'gap_sql', title: 'PostgreSQL indexes & querying optimization', status: 'in progress' },
          { id: 'gap_sec', title: 'System Security Protocols & Encryption', status: 'filled' }
        ];
        setGaps(data.gaps || list);
      }
    });

    return () => {
      unsubUser();
      unsubGaps();
    };
  }, [connection]);

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDesc.trim() || !taskDeadline) {
      alert('Please fill in all mandatory fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      // Save task doc to firestore
      await setDoc(doc(db, 'tasks', taskId), {
        id: taskId,
        connId: connection.id,
        menteeId: connection.menteeId,
        title: taskTitle,
        description: taskDesc,
        type: taskType,
        submissionFormat: taskSubmission,
        deadline: taskDeadline,
        rubric: taskRubric,
        linkedGapId: selectedGap?.id || null,
        status: 'To Do',
        createdAt: new Date().toISOString()
      });

      // Update gap status to "in progress" if a gap was selected
      if (selectedGap) {
        const updatedGaps = gaps.map(g => g.id === selectedGap.id ? { ...g, status: 'in progress' } : g);
        await updateDoc(doc(db, 'mentorship_connections', connection.id), {
          gaps: updatedGaps
        });
      }

      alert('Task assigned successfully!');
      setShowAssignModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskDeadline('');
      setTaskRubric('');
      if (onAssignTaskSuccess) onAssignTaskSuccess();
    } catch (err: any) {
      console.error(err);
      alert('Error assigning task: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#10B981]'; // Success
    if (score >= 60) return 'text-[#F59E0B]'; // Warning
    return 'text-[#EF4444]'; // Rejected
  };

  // Safe fallback skills data
  const skillsArray = menteeUser?.skills || [
    { name: 'React Development', score: 85 },
    { name: 'Tailwind CSS', score: 90 },
    { name: 'REST APIs', score: 55 },
    { name: 'PostgreSQL Indexes', score: 35 },
    { name: 'System Security', score: 45 }
  ];

  const strengths = skillsArray.filter((s: any) => (s.score || s.level) >= 70);
  const developmentGaps = gaps;

  return (
    <div className="bg-white border-[0.5px] border-border/80 rounded-lg p-6 space-y-6 text-left select-none max-w-5xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-border/50 gap-4">
        <div>
          <button 
            onClick={onBack} 
            className="text-[11px] font-bold tracking-widest text-[#534AB7] hover:underline mb-1 flex items-center gap-1 cursor-pointer uppercase"
          >
            ← BACK TO YOUR MENTEES
          </button>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">{connection.menteeName}'s Profile</h2>
          <p className="text-xs text-gray-500 mt-0.5">Comprehensive professional analysis and targeted syllabus gaps</p>
        </div>

        <div className="flex items-center gap-4 bg-gray-50 border-[0.5px] border-border/60 p-3 rounded-lg">
          <div className="text-center">
            <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Professional Score</span>
            <span className={`text-2xl font-black ${getScoreColor(menteeUser?.readinessScore || 72)}`}>
              {menteeUser?.readinessScore || 72}<span className="text-xs text-gray-400 font-medium">/100</span>
            </span>
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID FOR INFO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: ABOUT, CV, EDUCATION, LINKS */}
        <div className="md:col-span-1 space-y-6">
          {/* PROFILE CARD */}
          <div className="p-4 border-[0.5px] border-border/80 rounded-lg space-y-3 bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-2">
              <User className="w-3.5 h-3.5 text-[#534AB7]" /> Identity & Contacts
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-medium">Student Name</span>
                <p className="text-xs font-bold text-gray-900">{connection.menteeName}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-medium">Graduate Email Address</span>
                <p className="text-xs font-medium text-gray-600 truncate">{menteeUser?.email || 'student@careerbridge.edu'}</p>
              </div>
            </div>
          </div>

          {/* EDUCATION HISTORY */}
          <div className="p-4 border-[0.5px] border-border/80 rounded-lg space-y-3 bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-2">
              <GraduationCap className="w-4 h-4 text-primary" /> Academic Timeline
            </h3>
            <div className="space-y-4">
              {menteeUser?.education?.map((edu: any, i: number) => (
                <div key={i} className="text-xs">
                  <p className="font-bold text-gray-900">{edu.degree}</p>
                  <p className="text-gray-600 font-medium">{edu.school}</p>
                  <span className="text-[10px] font-mono font-bold text-gray-400 mt-0.5 inline-block">{edu.year}</span>
                </div>
              )) || (
                <div className="text-xs">
                  <p className="font-bold text-gray-900">B.Sc. in Software Engineering</p>
                  <p className="text-gray-600 font-medium">State Technical University</p>
                  <span className="text-[10px] font-mono font-bold text-gray-400 mt-0.5 inline-block">2021–2025</span>
                </div>
              )}
            </div>
          </div>

          {/* CV & LINKS PORTFOLIO */}
          <div className="p-4 border-[0.5px] border-border/80 rounded-lg space-y-3 bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-2">
              <FileText className="w-3.5 h-3.5 text-primary" /> Document Attachments
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Portfolio & Social Links</span>
                <a 
                  href={menteeUser?.portfolio || 'https://github.com/'} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-1.5 text-[#534AB7] hover:underline font-bold text-[11px]"
                >
                  <LinkIcon className="w-3.5 h-3.5" /> Open Project Hub <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STRENGTHS, LEARNING GAPS, CERTIFICATIONS */}
        <div className="md:col-span-2 space-y-6">
          {/* VERIFIED STRENGTHS (GREEN TAGS) */}
          <div className="p-5 border-[0.5px] border-border/80 rounded-lg space-y-3">
            <h3 className="text-xs font-bold text-[#10B981] uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-2">
              <Check className="w-4 h-4" /> Verified Strengths
            </h3>
            <p className="text-[11px] text-gray-400 font-medium">Platform verified competency score of 70% or superior</p>
            
            <div className="flex flex-wrap gap-1.5 pt-1">
              {strengths.length === 0 ? (
                <span className="text-xs text-gray-400 italic">No verified strengths yet. Complete skills audit modules to start.</span>
              ) : (
                strengths.map((s: any, idx: number) => (
                  <span 
                    key={idx} 
                    className="px-2.5 py-1 bg-[#10B981]/5 text-[#10B981] rounded-full border border-[#10B981]/20 text-[10.5px] font-bold"
                  >
                    {s.name || s.title} {s.score ? `(${s.score || s.level}%)` : ''}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* LEARNING GAPS (AMBER/RED CARDS) */}
          <div className="p-5 border-[0.5px] border-border/80 rounded-lg space-y-4">
            <h3 className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-2">
              <Target className="w-4 h-4 text-[#F59E0B]" /> Target Syllabus Gaps
            </h3>
            <p className="text-[11px] text-gray-400 font-medium">Address these gaps to increase readiness and finalize graduation track</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {developmentGaps.map((gap) => {
                const isFilled = gap.status === 'filled';
                const isInProgress = gap.status === 'in progress';
                
                return (
                  <div 
                    key={gap.id} 
                    className={`p-3.5 border-[0.5px] rounded-lg transition-all flex flex-col justify-between gap-3 ${
                      isFilled 
                        ? 'border-[#10B981]/25 bg-[#10B981]/5' 
                        : isInProgress 
                          ? 'border-[#F59E0B]/25 bg-[#F59E0B]/5' 
                          : 'border-[#EF4444]/25 bg-[#EF4444]/5'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold text-gray-900 leading-snug">{gap.title}</h4>
                        <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded font-mono shrink-0 ${
                          isFilled 
                            ? 'bg-[#10B981]/15 text-[#10B981]' 
                            : isInProgress 
                              ? 'bg-[#F59E0B]/15 text-[#F59E0B]' 
                              : 'bg-[#EF4444]/15 text-[#EF4444]'
                        }`}>
                          {gap.status}
                        </span>
                      </div>
                    </div>

                    {!isFilled && (
                      <button
                        onClick={() => {
                          setSelectedGap(gap);
                          setTaskTitle(`Task: Address ${gap.title}`);
                          setTaskDesc(`Practice target: Master deep practical implementation of ${gap.title} to bridge this competency gap.`);
                          setShowAssignModal(true);
                        }}
                        className="py-1 px-3 bg-white hover:bg-gray-50 border-[0.5px] border-border/80 rounded text-[10px] font-bold text-gray-700 tracking-wide transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Assign task related to this gap →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* OTHER ACCREDITED CERTIFICATIONS */}
          <div className="p-5 border-[0.5px] border-border/80 rounded-lg space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-2">
              <Award className="w-4 h-4 text-purple-600" /> Professional Certifications
            </h3>
            
            <div className="space-y-2">
              {menteeUser?.certifications?.map((cert: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 border-[0.5px] border-border/50 p-2.5 rounded">
                  <Award className="w-4 h-4 text-[#534AB7] shrink-0" />
                  <span className="font-semibold">{cert}</span>
                </div>
              )) || (
                <p className="text-xs text-gray-400 italic">No external certifications listed yet.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* MODAL: TASK ASSIGNMENT DRAWER */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border-[0.5px] border-border rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button 
              onClick={() => setShowAssignModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Assign Mentorship Task</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Focusing on addressing: <span className="font-bold text-gray-800">{selectedGap?.title}</span></p>
              </div>

              <form onSubmit={handleAssignTask} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Task Title *</label>
                  <input 
                    type="text" 
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Implement REST API routers"
                    className="w-full bg-gray-50 border-[0.5px] border-border/80 rounded p-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Detailed Description *</label>
                  <textarea 
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    rows={3}
                    placeholder="Provide detailed roadmap tasks and specific guidelines..."
                    className="w-full bg-gray-50 border-[0.5px] border-border/80 rounded p-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Task Type</label>
                    <select 
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value)}
                      className="w-full bg-gray-50 border-[0.5px] border-border/80 rounded p-1.5 focus:outline-none"
                    >
                      <option value="Technical">Technical</option>
                      <option value="Written">Written</option>
                      <option value="Soft skill">Soft skill</option>
                      <option value="Quiz">Quiz</option>
                      <option value="External certificate">External certificate</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Submission Format</label>
                    <select 
                      value={taskSubmission}
                      onChange={(e) => setTaskSubmission(e.target.value)}
                      className="w-full bg-gray-50 border-[0.5px] border-border/80 rounded p-1.5 focus:outline-none"
                    >
                      <option value="File">File</option>
                      <option value="URL">URL</option>
                      <option value="Video">Video</option>
                      <option value="Platform quiz">Platform quiz</option>
                      <option value="External badge link">External badge link</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Verification Rubric Guidelines</label>
                  <input 
                    type="text" 
                    value={taskRubric}
                    onChange={(e) => setTaskRubric(e.target.value)}
                    placeholder="Metrics (e.g. All API endpoints must return correct status codes)"
                    className="w-full bg-gray-50 border-[0.5px] border-border/80 rounded p-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Deadline Date *</label>
                  <input 
                    type="date" 
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full bg-gray-50 border-[0.5px] border-border/80 rounded p-2 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button 
                    type="button" 
                    onClick={() => setShowAssignModal(false)}
                    className="px-3 py-1.5 border border-border rounded hover:bg-gray-50 text-gray-600 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-primary text-white rounded font-bold hover:bg-primary-hover disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Assigning...' : 'Assign Syllabus Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
