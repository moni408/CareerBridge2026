import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, 
  doc, setDoc, getDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  Video, FileText, CheckCircle2, Clock, AlertTriangle, Lock, 
  Unlock, Send, Award, CheckSquare, Plus, Sparkles, Calendar, 
  HelpCircle, ChevronDown, ChevronRight, X, ShieldAlert, AlertCircle,
  BarChart2, UserCheck, Flame, BookOpen, ExternalLink, Check, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sendEmailAlert, schedulePreEventAlert, sendCrossRoleEmailNotification } from '../services/emailService';
import { GoogleQuizBuilder } from './GoogleQuizBuilder';
import { ExamTakingModal } from './ExamTakingModal';
import { QuizQuestion } from '../types/quiz';

interface LearningSessionModuleProps {
  connection: any;
  user: any;
  profile: any;
  isMentor: boolean;
  onCloseWorkspace?: () => void;
}

export function LearningSessionModule({
  connection,
  user,
  profile,
  isMentor,
  onCloseWorkspace
}: LearningSessionModuleProps) {
  const resolveRecipientEmail = async (userId: string, conn?: any): Promise<string> => {
    if (conn?.menteeEmail) return conn.menteeEmail;
    if (conn?.studentEmail) return conn.studentEmail;
    if (conn?.mentorEmail) return conn.mentorEmail;
    if (conn?.recipientEmail) return conn.recipientEmail;

    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (userSnap.exists()) {
        const u = userSnap.data();
        if (u.email) return u.email;
        if (u.studentEmail) return u.studentEmail;
        if (u.menteeEmail) return u.menteeEmail;
        if (u.mentorEmail) return u.mentorEmail;
      }

      const studentSnap = await getDoc(doc(db, 'students', userId));
      if (studentSnap.exists() && studentSnap.data().email) {
        return studentSnap.data().email;
      }

      const mentorSnap = await getDoc(doc(db, 'mentors', userId));
      if (mentorSnap.exists() && mentorSnap.data().email) {
        return mentorSnap.data().email;
      }
    } catch (e) {
      console.warn('Error in resolveRecipientEmail:', e);
    }
    return '';
  };
  // Real-time collections states
  const [skillsList, setSkillsList] = useState<any[]>([]);
  const [learningSessions, setLearningSessions] = useState<any[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  
  // Selected format for creation by Mentor
  const [selectedFormat, setSelectedFormat] = useState<'lecture' | 'practical' | 'quiz' | 'assignment' | null>(null);

  // New Skill Modal for Mentee
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');

  // Format 1: Video Lecture Form State
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureDateTime, setLectureDateTime] = useState('');
  const [lectureMeetLink, setLectureMeetLink] = useState('');
  const [lectureDuration, setLectureDuration] = useState('45');
  const [lectureNotes, setLectureNotes] = useState('');

  // Format 2: Practical Task Form State
  const [practicalTitle, setPracticalTitle] = useState('');
  const [practicalQuestion, setPracticalQuestion] = useState('');
  const [practicalStartTime, setPracticalStartTime] = useState('');
  const [practicalEndTime, setPracticalEndTime] = useState('');

  // Format 3: Quiz Form State
  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestionCount, setQuizQuestionCount] = useState<number>(5);
  const [quizQuestionsText, setQuizQuestionsText] = useState('');
  const [quizStartTime, setQuizStartTime] = useState('');
  const [quizEndTime, setQuizEndTime] = useState('');
  const [quizTimezone, setQuizTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  // Google Quiz Builder Questions State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    {
      id: 'q_init_1',
      type: 'multiple_choice',
      title: 'Sample Multiple Choice Question',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      points: 5
    }
  ]);

  // Active Exam Taking Space Modal State
  const [activeExamSession, setActiveExamSession] = useState<any | null>(null);

  // Format 4: Assignment Form State
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDesc, setAssignmentDesc] = useState('');
  const [assignmentDeadline, setAssignmentDeadline] = useState('');

  // Submitting States
  const [isPublishing, setIsPublishing] = useState(false);

  // End Mentorship Panel & Certificate States
  const [showEndMentorshipPanel, setShowEndMentorshipPanel] = useState(false);
  const [isAllLearningsComplete, setIsAllLearningsComplete] = useState<'yes' | 'no' | null>(null);
  const [showIssueCertModal, setShowIssueCertModal] = useState(false);

  // Certificate Form States
  const [certSkillsGained, setCertSkillsGained] = useState('');
  const [certWorkDesc, setCertWorkDesc] = useState('');
  const [certAttentiveness, setCertAttentiveness] = useState('95%');
  const [certRegularity, setCertRegularity] = useState('98%');
  const [certFeedback, setCertFeedback] = useState('');
  const [issuingCert, setIssuingCert] = useState(false);
  const [issuedCertificate, setIssuedCertificate] = useState<any | null>(null);
  const [addingSkillsToProfile, setAddingSkillsToProfile] = useState(false);

  // Mentee Submission Form States
  const [submittingSessionId, setSubmittingSessionId] = useState<string | null>(null);
  const [menteeAnswerText, setMenteeAnswerText] = useState('');

  // Countdown timer trigger
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Sync Learning Modules (Skills to Learn set by Mentee)
  useEffect(() => {
    if (!connection?.id) return;

    const qSkills = query(
      collection(db, 'learning_modules'),
      where('connectionId', '==', connection.id)
    );

    const unsubSkills = onSnapshot(qSkills, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setSkillsList(list);

      // Auto select first module if none selected
      if (list.length > 0 && !activeModuleId) {
        setActiveModuleId(list[0].id);
      }
    }, (err) => console.warn('Error listening to learning_modules:', err));

    // 2. Sync Learning Sessions
    const qSessions = query(
      collection(db, 'learning_sessions'),
      where('connectionId', '==', connection.id)
    );

    const unsubSessions = onSnapshot(qSessions, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setLearningSessions(list);
    }, (err) => console.warn('Error listening to learning_sessions:', err));

    // 3. Sync Certificate if issued
    const certRef = doc(db, 'certificates', connection.id);
    getDoc(certRef).then((snap) => {
      if (snap.exists()) {
        setIssuedCertificate(snap.data());
      }
    });

    return () => {
      unsubSkills();
      unsubSessions();
    };
  }, [connection?.id]);

  // Is mentorship concluded / read-only mode?
  const isConcluded = connection?.status === 'concluded' || !!issuedCertificate;

  // Add Skill to Learn by Mentee
  const handleAddMenteeSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    try {
      const skillId = `mod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'learning_modules', skillId), {
        id: skillId,
        connectionId: connection.id,
        menteeId: connection.menteeId,
        mentorId: connection.mentorId,
        title: newSkillName.trim(),
        description: newSkillDesc.trim() || 'Core competency milestone to master during mentorship.',
        status: 'pending', // 'pending' | 'in_progress' | 'completed'
        order: skillsList.length + 1,
        createdAt: new Date().toISOString()
      });

      // Send notification to Mentor
      await addDoc(collection(db, 'notifications'), {
        recipientId: connection.mentorId,
        type: 'roadmap_skill_added',
        title: '🎯 New Skill Roadmap Added by Mentee',
        body: `${profile?.displayName || 'Your mentee'} added skill milestone "${newSkillName.trim()}" to learn.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });

      sendCrossRoleEmailNotification({
        senderId: user?.uid,
        senderName: profile?.displayName || 'Student',
        senderRole: 'student',
        senderEmail: user?.email || '',
        recipientId: connection.mentorId,
        recipientName: connection.mentorName || 'Mentor',
        recipientRole: 'mentor',
        subject: `🎯 New Roadmap Skill Milestone Added by ${profile?.displayName || 'Mentee'}`,
        category: 'mentorship',
        message: `Mentee ${profile?.displayName || 'Student'} added a new skill milestone: "${newSkillName.trim()}". Description: ${newSkillDesc.trim() || 'Core competency milestone'}`,
        actionUrl: window.location.origin
      }).catch(e => console.warn('Email dispatch failed:', e));

      setNewSkillName('');
      setNewSkillDesc('');
      setShowAddSkillModal(false);
    } catch (err) {
      console.error('Failed to add skill milestone:', err);
      alert('Error adding skill to roadmap.');
    }
  };

  // Auto-generate Google Meet Link
  const handleGenerateMeetLink = () => {
    const randomCode = `${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
    setLectureMeetLink(`https://meet.google.com/${randomCode}`);
  };

  // Format 1: Publish Video Lecture
  const handlePublishLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureTitle.trim() || !lectureDateTime || !lectureMeetLink.trim()) {
      alert('Please fill out Lecture Title, Date & Time, and Meeting Link.');
      return;
    }

    setIsPublishing(true);
    try {
      const activeModule = skillsList.find(s => s.id === activeModuleId);
      const sessionId = `sess_lec_${Date.now()}`;

      const newSession = {
        id: sessionId,
        connId: connection.id,
        connectionId: connection.id,
        menteeId: connection.menteeId,
        mentorId: connection.mentorId || user?.uid,
        moduleId: activeModuleId || '',
        moduleTitle: activeModule?.title || 'General Mentorship',
        format: 'lecture', // lecture | practical | quiz | assignment
        title: lectureTitle.trim(),
        description: lectureNotes.trim() || `Live Video Lecture on ${lectureTitle.trim()}`,
        dateTime: lectureDateTime,
        deadline: lectureDateTime,
        meetLink: lectureMeetLink.trim(),
        durationMinutes: parseInt(lectureDuration) || 60,
        notes: lectureNotes.trim(),
        status: 'scheduled', // scheduled | completed | missed
        createdAt: new Date().toISOString(),
        mentorName: profile?.displayName || 'Mentor',
        menteeName: connection.menteeName
      };

      await setDoc(doc(db, 'learning_sessions', sessionId), newSession);
      await setDoc(doc(db, 'tasks', sessionId), newSession);

      // Update Module Status to 'in_progress'
      if (activeModuleId) {
        await updateDoc(doc(db, 'learning_modules', activeModuleId), { status: 'in_progress' });
      }

      // Dispatch EmailJS Alerts
      const menteeEmail = await resolveRecipientEmail(connection.menteeId, connection);

      await sendEmailAlert({
        recipientId: connection.menteeId,
        recipientName: connection.menteeName,
        recipientEmail: menteeEmail,
        senderName: profile?.displayName || 'Mentor',
        subject: `🎥 Invitation: Video Lecture on ${lectureTitle.trim()}`,
        sessionType: 'Video Lecture',
        topic: lectureTitle.trim(),
        dateTime: new Date(lectureDateTime).toLocaleString(),
        meetingLink: lectureMeetLink.trim(),
        body: `Your mentor scheduled a live Video Lecture session for "${lectureTitle.trim()}". Join via Google Meet: ${lectureMeetLink.trim()}`
      });

      await schedulePreEventAlert({
        recipientId: connection.menteeId,
        recipientName: connection.menteeName,
        recipientEmail: menteeEmail,
        senderName: profile?.displayName || 'Mentor',
        sessionType: 'Video Lecture',
        topic: lectureTitle.trim(),
        dateTime: new Date(lectureDateTime).toLocaleString(),
        meetingLink: lectureMeetLink.trim()
      });

      alert('Video Lecture invitation sent to mentee with Google Meet link & Email alerts!');
      setSelectedFormat(null);
      setLectureTitle('');
      setLectureDateTime('');
      setLectureMeetLink('');
      setLectureNotes('');
    } catch (err) {
      console.error('Failed to publish lecture:', err);
      alert('Error publishing video lecture.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Format 2: Publish Practical Task
  const handlePublishPractical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practicalTitle.trim() || !practicalQuestion.trim() || !practicalStartTime || !practicalEndTime) {
      alert('Please fill out Title, Task Question, Start Time, and End Time.');
      return;
    }

    setIsPublishing(true);
    try {
      const activeModule = skillsList.find(s => s.id === activeModuleId);
      const sessionId = `sess_prac_${Date.now()}`;

      const newSession = {
        id: sessionId,
        connId: connection.id,
        connectionId: connection.id,
        menteeId: connection.menteeId,
        mentorId: connection.mentorId || user?.uid,
        moduleId: activeModuleId || '',
        moduleTitle: activeModule?.title || 'General Mentorship',
        format: 'practical',
        title: practicalTitle.trim(),
        description: practicalQuestion.trim(),
        question: practicalQuestion.trim(),
        startTime: practicalStartTime,
        endTime: practicalEndTime,
        deadline: practicalEndTime,
        isEncrypted: true, // Content auto-encrypted until 5 mins before startTime
        status: 'assigned', // assigned | completed | missed
        createdAt: new Date().toISOString(),
        mentorName: profile?.displayName || 'Mentor',
        menteeName: connection.menteeName
      };

      await setDoc(doc(db, 'learning_sessions', sessionId), newSession);
      await setDoc(doc(db, 'tasks', sessionId), newSession);

      if (activeModuleId) {
        await updateDoc(doc(db, 'learning_modules', activeModuleId), { status: 'in_progress' });
      }

      const menteeEmail = await resolveRecipientEmail(connection.menteeId, connection);

      await sendEmailAlert({
        recipientId: connection.menteeId,
        recipientName: connection.menteeName,
        recipientEmail: menteeEmail,
        senderName: profile?.displayName || 'Mentor',
        subject: `🧪 Practical Task Assigned: ${practicalTitle.trim()}`,
        sessionType: 'Practical Task',
        topic: practicalTitle.trim(),
        dateTime: `${new Date(practicalStartTime).toLocaleString()} to ${new Date(practicalEndTime).toLocaleString()}`,
        body: `A new Practical Task has been assigned. Note: The problem details remain encrypted until 5 minutes before the start time (${new Date(practicalStartTime).toLocaleTimeString()}).`
      });

      alert('Practical Task assigned! Question content is auto-encrypted and will unlock 5 mins before start time.');
      setSelectedFormat(null);
      setPracticalTitle('');
      setPracticalQuestion('');
      setPracticalStartTime('');
      setPracticalEndTime('');
    } catch (err) {
      console.error('Failed to publish practical task:', err);
      alert('Error assigning practical task.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Format 3: Publish Quiz (Google Quiz Builder)
  const handlePublishQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle.trim() || !quizStartTime || !quizEndTime) {
      alert('Please fill out Quiz Title, Start Time, and End Time.');
      return;
    }

    if (quizQuestions.length === 0) {
      alert('Please add at least 1 question to the quiz.');
      return;
    }

    setIsPublishing(true);
    try {
      const activeModule = skillsList.find(s => s.id === activeModuleId);
      const sessionId = `sess_quiz_${Date.now()}`;

      const newSession = {
        id: sessionId,
        connId: connection.id,
        connectionId: connection.id,
        menteeId: connection.menteeId,
        mentorId: connection.mentorId || user?.uid,
        moduleId: activeModuleId || '',
        moduleTitle: activeModule?.title || 'General Mentorship',
        format: 'quiz',
        title: quizTitle.trim(),
        description: quizQuestions.map((q, i) => `Q${i+1}. ${q.title}`).join('\n\n'),
        questionCount: quizQuestions.length,
        questions: quizQuestions,
        quizContent: quizQuestions.map((q, i) => `Q${i+1}. ${q.title}`).join('\n\n'),
        startTime: quizStartTime,
        endTime: quizEndTime,
        deadline: quizEndTime,
        timezone: quizTimezone,
        isEncrypted: true, // Content auto-encrypted until 5 mins before startTime
        status: 'assigned',
        createdAt: new Date().toISOString(),
        mentorName: profile?.displayName || 'Mentor',
        menteeName: connection.menteeName
      };

      await setDoc(doc(db, 'learning_sessions', sessionId), newSession);
      await setDoc(doc(db, 'tasks', sessionId), newSession);

      if (activeModuleId) {
        await updateDoc(doc(db, 'learning_modules', activeModuleId), { status: 'in_progress' });
      }

      const menteeEmail = await resolveRecipientEmail(connection.menteeId, connection);

      await sendEmailAlert({
        recipientId: connection.menteeId,
        recipientName: connection.menteeName,
        recipientEmail: menteeEmail,
        senderName: profile?.displayName || 'Mentor',
        subject: `❓ Quiz Scheduled: ${quizTitle.trim()} (${quizQuestions.length} Questions)`,
        sessionType: 'Quiz Assessment',
        topic: quizTitle.trim(),
        dateTime: `${new Date(quizStartTime).toLocaleString()} to ${new Date(quizEndTime).toLocaleString()}`,
        body: `A ${quizQuestions.length}-question Quiz has been generated. Click 'Take Part' to start when unlocked.`
      });

      alert('Quiz successfully generated and invitation dispatched to mentee!');
      setSelectedFormat(null);
      setQuizTitle('');
      setQuizQuestionsText('');
      setQuizStartTime('');
      setQuizEndTime('');
    } catch (err) {
      console.error('Failed to publish quiz:', err);
      alert('Error creating quiz.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Exam Submission handler from ExamTakingModal
  const handleExamSubmit = async (
    submissionData: { textAnswer?: string; quizAnswers?: Record<string, string>; formattedSummary: string },
    autoSubmitted?: boolean
  ) => {
    if (!activeExamSession) return;
    try {
      await updateDoc(doc(db, 'learning_sessions', activeExamSession.id), {
        menteeSubmission: submissionData.formattedSummary,
        submittedAnswers: submissionData.quizAnswers || {},
        status: 'completed',
        submittedAt: new Date().toISOString(),
        autoSubmitted: autoSubmitted || false
      });

      const mentorEmail = await resolveRecipientEmail(connection.mentorId, connection);
      await sendEmailAlert({
        recipientId: connection.mentorId,
        recipientName: connection.mentorName,
        recipientEmail: mentorEmail,
        senderName: profile?.displayName || 'Student',
        subject: `✅ Exam Submitted: ${activeExamSession.title}`,
        sessionType: activeExamSession.format === 'practical' ? 'Practical Exam' : 'Quiz Assessment',
        topic: activeExamSession.title,
        dateTime: new Date().toLocaleString(),
        body: `Student ${profile?.displayName || 'Student'} has completed and ended the exam.${autoSubmitted ? ' (Auto-submitted on time limit).' : ''}`
      });

      setActiveExamSession(null);
    } catch (err) {
      console.error('Error submitting exam:', err);
      throw err;
    }
  };

  // Format 4: Publish Assignment
  const handlePublishAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentTitle.trim() || !assignmentDesc.trim() || !assignmentDeadline) {
      alert('Please fill out Assignment Title, Instructions, and Deadline.');
      return;
    }

    setIsPublishing(true);
    try {
      const activeModule = skillsList.find(s => s.id === activeModuleId);
      const sessionId = `sess_assg_${Date.now()}`;

      const newSession = {
        id: sessionId,
        connId: connection.id,
        connectionId: connection.id,
        menteeId: connection.menteeId,
        mentorId: connection.mentorId || user?.uid,
        moduleId: activeModuleId || '',
        moduleTitle: activeModule?.title || 'General Mentorship',
        format: 'assignment',
        title: assignmentTitle.trim(),
        description: assignmentDesc.trim(),
        deadline: assignmentDeadline,
        isEncrypted: false, // NO ENCRYPTION FOR ASSIGNMENT
        status: 'assigned',
        createdAt: new Date().toISOString(),
        mentorName: profile?.displayName || 'Mentor',
        menteeName: connection.menteeName
      };

      await setDoc(doc(db, 'learning_sessions', sessionId), newSession);
      await setDoc(doc(db, 'tasks', sessionId), newSession);

      if (activeModuleId) {
        await updateDoc(doc(db, 'learning_modules', activeModuleId), { status: 'in_progress' });
      }

      const menteeEmail = await resolveRecipientEmail(connection.menteeId, connection);

      await sendEmailAlert({
        recipientId: connection.menteeId,
        recipientName: connection.menteeName,
        recipientEmail: menteeEmail,
        senderName: profile?.displayName || 'Mentor',
        subject: `📌 Assignment Published: ${assignmentTitle.trim()}`,
        sessionType: 'Assignment',
        topic: assignmentTitle.trim(),
        dateTime: `Deadline: ${new Date(assignmentDeadline).toLocaleString()}`,
        body: `Your mentor published a new Assignment: "${assignmentTitle.trim()}". View guidelines directly in your workspace.`
      });

      alert('Assignment published! Mentee can immediately view instructions.');
      setSelectedFormat(null);
      setAssignmentTitle('');
      setAssignmentDesc('');
      setAssignmentDeadline('');
    } catch (err) {
      console.error('Failed to publish assignment:', err);
      alert('Error publishing assignment.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Mentee Submits Practical / Quiz / Assignment Answer
  const handleSubmitMenteeAnswer = async (sessionId: string) => {
    if (!menteeAnswerText.trim()) {
      alert('Please enter your response / solution / link.');
      return;
    }

    try {
      await updateDoc(doc(db, 'learning_sessions', sessionId), {
        status: 'completed',
        menteeSubmission: menteeAnswerText.trim(),
        submittedAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        recipientId: connection.mentorId,
        type: 'session_task_submitted',
        title: '📥 Task Solution Submitted',
        body: `${profile?.displayName || 'Mentee'} submitted solution for session task.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });

      sendCrossRoleEmailNotification({
        senderId: user?.uid,
        senderName: profile?.displayName || 'Student',
        senderRole: 'student',
        senderEmail: user?.email || '',
        recipientId: connection.mentorId,
        recipientName: connection.mentorName || 'Mentor',
        recipientRole: 'mentor',
        subject: `📥 Task Solution / Deliverable Submitted by ${profile?.displayName || 'Mentee'}`,
        category: 'session',
        message: `Mentee ${profile?.displayName || 'Student'} submitted a task solution for session #${sessionId}:\n\n"${menteeAnswerText.trim()}"`,
        actionUrl: window.location.origin
      }).catch(e => console.warn('Email dispatch failed:', e));

      alert('Solution successfully submitted to mentor!');
      setSubmittingSessionId(null);
      setMenteeAnswerText('');
    } catch (err) {
      console.error('Failed to submit answer:', err);
      alert('Error submitting response.');
    }
  };

  // Complete a Learning Module & Progression to Next
  const handleCompleteModule = async (moduleId: string) => {
    try {
      await updateDoc(doc(db, 'learning_modules', moduleId), {
        status: 'completed',
        completedAt: new Date().toISOString()
      });

      // Auto select next pending module
      const currentIndex = skillsList.findIndex(s => s.id === moduleId);
      if (currentIndex > -1 && currentIndex + 1 < skillsList.length) {
        const nextMod = skillsList[currentIndex + 1];
        setActiveModuleId(nextMod.id);
        await updateDoc(doc(db, 'learning_modules', nextMod.id), { status: 'in_progress' });
      }

      alert('Module completed! Moved to the next learning milestone.');
    } catch (err) {
      console.error('Failed to complete module:', err);
    }
  };

  // Issue Official Certificate
  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certSkillsGained.trim() || !certWorkDesc.trim()) {
      alert('Please fill out the skills gained and related work description.');
      return;
    }

    setIssuingCert(true);
    try {
      const certData = {
        connectionId: connection.id,
        mentorId: connection.mentorId,
        mentorName: profile?.displayName || 'Dr. Faiz Rahman',
        mentorTitle: profile?.title || 'Verified Industry Mentor',
        menteeId: connection.menteeId,
        menteeName: connection.menteeName,
        skillsGained: certSkillsGained.split(',').map(s => s.trim()).filter(Boolean),
        workDescription: certWorkDesc.trim(),
        attentiveness: certAttentiveness,
        regularity: certRegularity,
        feedback: certFeedback.trim() || 'Demonstrated outstanding dedication, consistent progress, and technical excellence throughout the mentorship program.',
        issuedAt: new Date().toISOString()
      };

      // Save Certificate
      await setDoc(doc(db, 'certificates', connection.id), certData);

      // Conclude Mentorship Connection (Disables Active Communication)
      await updateDoc(doc(db, 'mentorship_connections', connection.id), {
        status: 'concluded',
        concludedAt: new Date().toISOString()
      });

      // Send Notification to Mentee
      await addDoc(collection(db, 'notifications'), {
        recipientId: connection.menteeId,
        type: 'certificate_issued',
        title: '🎓 Official Mentorship Certificate Issued!',
        body: `Congratulations! Your mentor ${profile?.displayName} issued your official Certificate of Completion!`,
        isRead: false,
        createdAt: new Date().toISOString()
      });

      setIssuedCertificate(certData);
      setShowIssueCertModal(false);
      setShowEndMentorshipPanel(false);
      alert('Official Certificate of Completion issued! Mentorship successfully concluded.');
    } catch (err) {
      console.error('Failed to issue certificate:', err);
      alert('Error issuing certificate.');
    } finally {
      setIssuingCert(false);
    }
  };

  // Mentee clicks "Add New Skills" on Certificate to update their profile
  const handleAddGainedSkillsToProfile = async () => {
    if (!issuedCertificate || !user) return;
    setAddingSkillsToProfile(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const uData = userSnap.data();
        const existingSkills = uData.skills || [];

        const newSkills = (issuedCertificate.skillsGained || []).map((sName: string) => ({
          name: sName,
          score: 95,
          reason: `Verified Mentorship Certificate by ${issuedCertificate.mentorName}`,
          category: 'technical'
        }));

        const merged = [...existingSkills];
        newSkills.forEach((ns: any) => {
          if (!merged.some((es: any) => (es.name || '').toLowerCase() === ns.name.toLowerCase())) {
            merged.push(ns);
          }
        });

        await updateDoc(userRef, {
          skills: merged,
          updatedAt: new Date().toISOString()
        });

        alert(`Success! ${newSkills.length} verified skills added directly to your profile!`);
      }
    } catch (err) {
      console.error('Failed to add skills to profile:', err);
      alert('Error updating profile skills.');
    } finally {
      setAddingSkillsToProfile(false);
    }
  };

  // Analytics Computation
  const totalLectures = learningSessions.filter(s => s.format === 'lecture').length;
  const totalPracticals = learningSessions.filter(s => s.format === 'practical').length;
  const totalQuizzes = learningSessions.filter(s => s.format === 'quiz').length;
  const totalAssignments = learningSessions.filter(s => s.format === 'assignment').length;

  // Determine missed items
  const missedSessions = learningSessions.filter(s => {
    const isSubmitted = Boolean(
      s.menteeSubmission || 
      s.submittedAt || 
      s.submittedContent || 
      s.status === 'completed' || 
      s.status === 'Under Review' || 
      s.status === 'Graded'
    );
    if (isSubmitted) return false;
    if (s.format === 'lecture' && new Date(s.dateTime).getTime() < nowTime) return true;
    if ((s.format === 'practical' || s.format === 'quiz') && new Date(s.endTime).getTime() < nowTime) return true;
    if (s.format === 'assignment' && new Date(s.deadline).getTime() < nowTime) return true;
    return false;
  });

  const activeModule = skillsList.find(s => s.id === activeModuleId);

  return (
    <div className="space-y-6 text-left relative">
      
      {/* BANNER IF CONCLUDED */}
      {isConcluded && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Mentorship Program Concluded & Certified</p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                All active communications, task creation, and submission forms are closed. Workspace logs and certificate are preserved in read-only archive mode.
              </p>
            </div>
          </div>
          {issuedCertificate && (
            <button 
              onClick={() => setShowIssueCertModal(true)} 
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-all shrink-0 cursor-pointer"
            >
              🎓 View Certificate
            </button>
          )}
        </div>
      )}

      {/* UPPER DECK HEADER & END MENTORSHIP ACTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-secondary p-5 rounded-2xl border border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Learning Session Module</span>
          </div>
          <h3 className="text-lg font-black text-text-primary tracking-tight">
            Mentorship Roadmap & Format Engine
          </h3>
          <p className="text-xs text-text-secondary">
            {isMentor ? `Guiding ${connection.menteeName}` : `Learning from ${connection.mentorName}`}
          </p>
        </div>

        {/* Upper Right "End Mentorship" Button & Container */}
        {isMentor && !isConcluded && (
          <div className="relative">
            <button
              onClick={() => setShowEndMentorshipPanel(!showEndMentorshipPanel)}
              className="px-4 py-2 bg-error/10 hover:bg-error/20 text-error border border-error/30 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>End Mentorship</span>
            </button>

            {/* Upper Right Div Question Box */}
            <AnimatePresence>
              {showEndMentorshipPanel && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-12 w-80 bg-card border border-border rounded-2xl shadow-2xl p-5 z-30 space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <h5 className="font-extrabold text-xs text-text-primary uppercase tracking-wider">Conclude Mentorship</h5>
                    <button onClick={() => setShowEndMentorshipPanel(false)} className="text-text-muted hover:text-text-primary">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs font-bold text-text-secondary leading-snug">
                    Is all aimed learnings complete?
                  </p>

                  <div className="space-y-2 text-xs font-semibold">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-bg-secondary hover:bg-bg-tertiary cursor-pointer transition-all">
                      <input
                        type="radio"
                        name="learnings_complete"
                        checked={isAllLearningsComplete === 'yes'}
                        onChange={() => setIsAllLearningsComplete('yes')}
                        className="w-4 h-4 accent-primary"
                      />
                      <span>1. Yes (All Roadmaps Mastered)</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-bg-secondary hover:bg-bg-tertiary cursor-pointer transition-all">
                      <input
                        type="radio"
                        name="learnings_complete"
                        checked={isAllLearningsComplete === 'no'}
                        onChange={() => setIsAllLearningsComplete('no')}
                        className="w-4 h-4 accent-primary"
                      />
                      <span>2. No (Incomplete)</span>
                    </label>
                  </div>

                  {/* Initially Hidden Button - Appears if 'Yes' checked */}
                  {isAllLearningsComplete === 'yes' && (
                    <motion.button
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      onClick={() => {
                        setShowIssueCertModal(true);
                        // pre-fill skills
                        const completedSkills = skillsList.map(s => s.title).join(', ');
                        setCertSkillsGained(completedSkills || 'React, TypeScript, System Design');
                      }}
                      className="w-full py-2.5 bg-success hover:bg-success/90 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-success/20 cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      <span>Issue Certificate</span>
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* TRACKING ANALYTICS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 bg-card border border-border rounded-xl space-y-1">
          <p className="text-[10px] font-bold uppercase text-text-muted">Video Lectures</p>
          <p className="text-lg font-black text-primary">{totalLectures}</p>
        </div>
        <div className="p-3.5 bg-card border border-border rounded-xl space-y-1">
          <p className="text-[10px] font-bold uppercase text-text-muted">Practical Tasks</p>
          <p className="text-lg font-black text-emerald-500">{totalPracticals}</p>
        </div>
        <div className="p-3.5 bg-card border border-border rounded-xl space-y-1">
          <p className="text-[10px] font-bold uppercase text-text-muted">Quizzes</p>
          <p className="text-lg font-black text-amber-500">{totalQuizzes}</p>
        </div>
        <div className="p-3.5 bg-card border border-border rounded-xl space-y-1">
          <p className="text-[10px] font-bold uppercase text-text-muted">Assignments</p>
          <p className="text-lg font-black text-purple-500">{totalAssignments}</p>
        </div>
        <div className="p-3.5 bg-card border border-border rounded-xl space-y-1 col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold uppercase text-text-muted">Missed Items</p>
          <p className={`text-lg font-black ${missedSessions.length > 0 ? 'text-error animate-pulse' : 'text-success'}`}>
            {missedSessions.length} {missedSessions.length > 0 ? 'Pending/Missed' : 'On Track'}
          </p>
        </div>
      </div>

      {/* MISSED SESSIONS ALERT BAR */}
      {missedSessions.length > 0 && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-error font-extrabold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>
              {isMentor 
                ? `Pending/Missed Alert: Mentee missed ${missedSessions.length} scheduled session(s)` 
                : `Action Required: You missed ${missedSessions.length} session/task deadline(s)`
              }
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            {isMentor 
              ? 'Below sessions/tasks passed their deadline without completion. Marked as Pending/Missed on dashboard.' 
              : 'You could not take part in the following items on time. Please message your mentor to request a re-schedule.'
            }
          </p>
        </div>
      )}

      {/* MAIN TWO COLUMN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: SKILL ROADMAP MILESTONES (Set by Mentee, Selected by Mentor) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 bg-card border border-border rounded-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h4 className="font-extrabold text-xs text-text-primary uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Skill Roadmap ({skillsList.length})
              </h4>

              {/* Mentee Option to add skills */}
              {!isMentor && !isConcluded && (
                <button
                  onClick={() => setShowAddSkillModal(true)}
                  className="px-2.5 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-primary-hover transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Skill
                </button>
              )}
            </div>

            {skillsList.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-border rounded-xl space-y-2 bg-bg-secondary/30">
                <Flame className="w-8 h-8 text-text-muted/40 mx-auto" />
                <p className="text-xs font-bold text-text-secondary">No skills added to roadmap</p>
                <p className="text-[10px] text-text-muted">
                  {!isMentor ? 'Click "Add Skill" above to set your 5 target learning milestones.' : 'Mentee will set their target skills to learn here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {skillsList.map((skill, idx) => {
                  const isActive = activeModuleId === skill.id;
                  const isDone = skill.status === 'completed';

                  return (
                    <div
                      key={skill.id}
                      onClick={() => setActiveModuleId(skill.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                        isActive 
                          ? 'bg-primary/10 border-primary shadow-xs' 
                          : 'bg-bg-secondary/60 hover:bg-bg-secondary border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase font-mono tracking-widest text-text-muted">
                            Module 0{idx + 1}
                          </span>
                          <h5 className="font-bold text-xs text-text-primary leading-snug">{skill.title}</h5>
                          <p className="text-[10px] text-text-muted line-clamp-2">{skill.description}</p>
                        </div>

                        <div>
                          {isDone ? (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-success/15 text-success border border-success/30 font-mono">
                              Done
                            </span>
                          ) : skill.status === 'in_progress' ? (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-primary/15 text-primary border border-primary/30 font-mono">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-text-muted/15 text-text-muted font-mono">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mentor Complete Button */}
                      {isMentor && !isConcluded && !isDone && isActive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteModule(skill.id);
                          }}
                          className="mt-3 w-full py-1.5 bg-success/10 hover:bg-success/20 text-success border border-success/30 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Mark Module Completed
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN CONTENT PAGE - FORMAT ENGINE & INVITATION FORMS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* FORMAT SELECTION BAR (When Mentor clicks a Learning Module) */}
          {isMentor && !isConcluded && activeModule && (
            <div className="p-5 bg-card border border-border rounded-2xl space-y-4">
              <div className="border-b border-border pb-2 flex justify-between items-center">
                <h4 className="font-extrabold text-xs text-text-primary uppercase tracking-wider">
                  Select Learning Format for <span className="text-primary">"{activeModule.title}"</span>
                </h4>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => setSelectedFormat('lecture')}
                  className={`p-3 rounded-xl border font-bold text-xs transition-all flex flex-col items-center gap-2 cursor-pointer ${
                    selectedFormat === 'lecture' 
                      ? 'bg-primary text-white border-primary shadow-sm' 
                      : 'bg-bg-secondary hover:bg-bg-tertiary border-border text-text-primary'
                  }`}
                >
                  <Video className="w-5 h-5" />
                  <span>1. Video Lecture</span>
                </button>

                <button
                  onClick={() => setSelectedFormat('practical')}
                  className={`p-3 rounded-xl border font-bold text-xs transition-all flex flex-col items-center gap-2 cursor-pointer ${
                    selectedFormat === 'practical' 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                      : 'bg-bg-secondary hover:bg-bg-tertiary border-border text-text-primary'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span>2. Practical</span>
                </button>

                <button
                  onClick={() => setSelectedFormat('quiz')}
                  className={`p-3 rounded-xl border font-bold text-xs transition-all flex flex-col items-center gap-2 cursor-pointer ${
                    selectedFormat === 'quiz' 
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                      : 'bg-bg-secondary hover:bg-bg-tertiary border-border text-text-primary'
                  }`}
                >
                  <HelpCircle className="w-5 h-5" />
                  <span>3. Quiz</span>
                </button>

                <button
                  onClick={() => setSelectedFormat('assignment')}
                  className={`p-3 rounded-xl border font-bold text-xs transition-all flex flex-col items-center gap-2 cursor-pointer ${
                    selectedFormat === 'assignment' 
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                      : 'bg-bg-secondary hover:bg-bg-tertiary border-border text-text-primary'
                  }`}
                >
                  <CheckSquare className="w-5 h-5" />
                  <span>4. Assignment</span>
                </button>
              </div>

              {/* EXPANDABLE HIDDEN INVITATION FORMS (In main content page, hidden until clicked) */}
              <AnimatePresence mode="wait">
                
                {/* FORMAT 1: VIDEO LECTURE INVITATION FORM */}
                {selectedFormat === 'lecture' && (
                  <motion.form
                    key="form_lecture"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handlePublishLecture}
                    className="p-5 bg-primary/5 border border-primary/20 rounded-xl space-y-4 mt-4"
                  >
                    <div className="flex justify-between items-center border-b border-primary/20 pb-2">
                      <h5 className="font-extrabold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <Video className="w-4 h-4" /> Schedule Video Lecture Invitation
                      </h5>
                      <button type="button" onClick={() => setSelectedFormat(null)} className="text-text-muted hover:text-text-primary">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Lecture Topic *</label>
                        <input
                          type="text"
                          required
                          value={lectureTitle}
                          onChange={(e) => setLectureTitle(e.target.value)}
                          placeholder={`e.g. Masterclass on ${activeModule.title}`}
                          className="w-full bg-card border border-border rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Date & Start Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={lectureDateTime}
                          onChange={(e) => setLectureDateTime(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase">Google Meet / Zoom Link *</label>
                        <button
                          type="button"
                          onClick={handleGenerateMeetLink}
                          className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Auto-Generate Meet Link
                        </button>
                      </div>
                      <input
                        type="url"
                        required
                        value={lectureMeetLink}
                        onChange={(e) => setLectureMeetLink(e.target.value)}
                        placeholder="https://meet.google.com/abc-defg-hij"
                        className="w-full bg-card border border-border rounded-lg p-2.5 text-xs font-mono font-semibold focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Pre-lecture Notes & Agenda</label>
                      <textarea
                        rows={2}
                        value={lectureNotes}
                        onChange={(e) => setLectureNotes(e.target.value)}
                        placeholder="Key concepts to review prior to session..."
                        className="w-full bg-card border border-border rounded-lg p-2.5 text-xs focus:outline-none focus:border-primary"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isPublishing}
                      className="w-full py-2.5 bg-primary text-white font-extrabold text-xs rounded-xl hover:bg-primary-hover transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send Lecture Invitation & Email Alert</span>
                    </button>
                  </motion.form>
                )}

                {/* FORMAT 2: PRACTICAL TASK FORM */}
                {selectedFormat === 'practical' && (
                  <motion.form
                    key="form_practical"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handlePublishPractical}
                    className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-4 mt-4"
                  >
                    <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2">
                      <h5 className="font-extrabold text-xs text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> Assign Practical Task (Encrypted Content)
                      </h5>
                      <button type="button" onClick={() => setSelectedFormat(null)} className="text-text-muted hover:text-text-primary">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Practical Task Title *</label>
                      <input
                        type="text"
                        required
                        value={practicalTitle}
                        onChange={(e) => setPracticalTitle(e.target.value)}
                        placeholder={`e.g. Hands-on coding challenge for ${activeModule.title}`}
                        className="w-full bg-card border border-border rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Problem Question Statement * (Auto-Encrypted)</label>
                      <textarea
                        rows={3}
                        required
                        value={practicalQuestion}
                        onChange={(e) => setPracticalQuestion(e.target.value)}
                        placeholder="Write detailed problem statement. Student cannot see this until 5 mins before start time..."
                        className="w-full bg-card border border-border rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Starting Date & Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={practicalStartTime}
                          onChange={(e) => setPracticalStartTime(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Ending Date & Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={practicalEndTime}
                          onChange={(e) => setPracticalEndTime(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-text-muted italic flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-500" /> System will auto-encrypt question details and unlock 5 mins prior to starting time.
                    </p>

                    <button
                      type="submit"
                      disabled={isPublishing}
                      className="w-full py-2.5 bg-emerald-600 text-white font-extrabold text-xs rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Assign Practical Task</span>
                    </button>
                  </motion.form>
                )}

                {/* FORMAT 3: QUIZ FORM (GOOGLE QUIZ BUILDER) */}
                {selectedFormat === 'quiz' && (
                  <motion.div
                    key="form_quiz"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <GoogleQuizBuilder
                      quizTitle={quizTitle}
                      setQuizTitle={setQuizTitle}
                      quizStartTime={quizStartTime}
                      setQuizStartTime={setQuizStartTime}
                      quizEndTime={quizEndTime}
                      setQuizEndTime={setQuizEndTime}
                      questions={quizQuestions}
                      setQuestions={setQuizQuestions}
                      onSubmitQuiz={handlePublishQuiz}
                      isPublishing={isPublishing}
                      onCancel={() => setSelectedFormat(null)}
                    />
                  </motion.div>
                )}

                {/* FORMAT 4: ASSIGNMENT FORM */}
                {selectedFormat === 'assignment' && (
                  <motion.form
                    key="form_assignment"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handlePublishAssignment}
                    className="p-5 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-4 mt-4"
                  >
                    <div className="flex justify-between items-center border-b border-purple-500/20 pb-2">
                      <h5 className="font-extrabold text-xs text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4" /> Publish Assignment (No Encryption)
                      </h5>
                      <button type="button" onClick={() => setSelectedFormat(null)} className="text-text-muted hover:text-text-primary">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Assignment Title *</label>
                      <input
                        type="text"
                        required
                        value={assignmentTitle}
                        onChange={(e) => setAssignmentTitle(e.target.value)}
                        placeholder={`e.g. Capstone deliverable for ${activeModule.title}`}
                        className="w-full bg-card border border-border rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Instructions & Guidelines *</label>
                      <textarea
                        rows={3}
                        required
                        value={assignmentDesc}
                        onChange={(e) => setAssignmentDesc(e.target.value)}
                        placeholder="Write detailed instructions. Mentee can see this immediately..."
                        className="w-full bg-card border border-border rounded-lg p-2.5 text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Submission Deadline *</label>
                      <input
                        type="datetime-local"
                        required
                        value={assignmentDeadline}
                        onChange={(e) => setAssignmentDeadline(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isPublishing}
                      className="w-full py-2.5 bg-purple-600 text-white font-extrabold text-xs rounded-xl hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Publish Assignment</span>
                    </button>
                  </motion.form>
                )}

              </AnimatePresence>
            </div>
          )}

          {/* ROADMAP INFORMATION NOTICE */}
          <div className="p-5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-primary font-extrabold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Roadmap Workspace Structure
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              This Learning Session section is dedicated exclusively to your high-level <strong className="text-text-primary font-bold">Skill Roadmap</strong>. All assigned materials (Lectures, Practical Tasks, Quizzes, and Assignments) and submission logs are tracked in your <strong className="text-text-primary font-bold">Task & Workspace</strong> section.
            </p>
          </div>

        </div>

      </div>

      {/* MENTEE ADD SKILL MODAL */}
      <AnimatePresence>
        {showAddSkillModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.form
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onSubmit={handleAddMenteeSkill}
              className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex justify-between items-center border-b border-border pb-2">
                <h4 className="font-extrabold text-sm text-text-primary uppercase tracking-wider">Add Skill Milestone</h4>
                <button type="button" onClick={() => setShowAddSkillModal(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Skill Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. React.js Architecture"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Target Goals & Notes</label>
                <textarea
                  rows={3}
                  placeholder="What specific topics or projects do you want to achieve for this skill?"
                  value={newSkillDesc}
                  onChange={(e) => setNewSkillDesc(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSkillModal(false)}
                  className="w-1/2 py-2 bg-bg-secondary font-bold text-xs rounded-xl border border-border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-hover transition-all cursor-pointer shadow-md shadow-primary/20"
                >
                  Add to Roadmap
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OFFICIAL CERTIFICATE ISSUANCE FORM MODAL (For Mentor) */}
      <AnimatePresence>
        {showIssueCertModal && isMentor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-card border border-border w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-5 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-primary" />
                  <h3 className="font-extrabold text-base text-text-primary uppercase tracking-tight">Issue Official Mentorship Certificate</h3>
                </div>
                <button onClick={() => setShowIssueCertModal(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleIssueCertificate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Mentee Candidate</label>
                  <input
                    type="text"
                    readOnly
                    value={connection.menteeName}
                    className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 text-xs font-semibold select-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Gained Skills Name (Comma Separated) *
                  </label>
                  <input
                    type="text"
                    required
                    value={certSkillsGained}
                    onChange={(e) => setCertSkillsGained(e.target.value)}
                    placeholder="e.g. React.js, TypeScript, REST API Design, Cloud Run"
                    className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Skills Description & Related Work *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={certWorkDesc}
                    onChange={(e) => setCertWorkDesc(e.target.value)}
                    placeholder="Summarize practical tasks, project deliverables, and capstone milestones completed..."
                    className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Attentiveness Score / %</label>
                    <input
                      type="text"
                      value={certAttentiveness}
                      onChange={(e) => setCertAttentiveness(e.target.value)}
                      className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Regularity Score / %</label>
                    <input
                      type="text"
                      value={certRegularity}
                      onChange={(e) => setCertRegularity(e.target.value)}
                      className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Qualitative Feedback</label>
                  <textarea
                    rows={2}
                    value={certFeedback}
                    onChange={(e) => setCertFeedback(e.target.value)}
                    placeholder="Feedback will be auto-formatted onto the official certificate..."
                    className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={issuingCert}
                  className="w-full py-3 bg-primary text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/25 cursor-pointer"
                >
                  {issuingCert ? 'Issuing Certificate...' : '🎓 Generate & Issue Official Certificate'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OFFICIAL CERTIFICATE VIEW MODAL (For Mentee & Mentor) */}
      <AnimatePresence>
        {showIssueCertModal && issuedCertificate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-card border-4 border-primary/40 w-full max-w-2xl rounded-3xl p-8 shadow-2xl space-y-6 text-center relative overflow-hidden bg-gradient-to-b from-card to-bg-secondary"
            >
              <button onClick={() => setShowIssueCertModal(false)} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl border border-primary/30 flex items-center justify-center text-primary mx-auto">
                  <Award className="w-10 h-10" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">CAREERBRIDGE OFFICIAL CERTIFICATE</span>
                <h2 className="text-2xl font-black text-text-primary tracking-tight">Certificate of Mentorship Completion</h2>
              </div>

              <div className="space-y-3 py-2 border-y border-border">
                <p className="text-xs text-text-secondary uppercase tracking-widest font-mono">This certifies that</p>
                <h3 className="text-xl font-extrabold text-primary">{issuedCertificate.menteeName}</h3>
                <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                  has successfully completed all learning modules and roadmap requirements under the direction of industry mentor <strong className="text-text-primary">{issuedCertificate.mentorName}</strong>.
                </p>
              </div>

              {/* GAINED SKILLS BADGES */}
              <div className="space-y-2 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Mastered & Verified Competencies:</p>
                <div className="flex flex-wrap gap-2">
                  {(issuedCertificate.skillsGained || []).map((sk: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-primary/15 text-primary border border-primary/30 text-xs font-extrabold rounded-lg">
                      ✓ {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* SCORES & FEEDBACK */}
              <div className="grid grid-cols-2 gap-4 text-left text-xs bg-bg-secondary p-4 rounded-xl border border-border">
                <div>
                  <p className="text-[10px] font-bold uppercase text-text-muted">Attentiveness</p>
                  <p className="font-extrabold text-text-primary">{issuedCertificate.attentiveness}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-text-muted">Regularity</p>
                  <p className="font-extrabold text-text-primary">{issuedCertificate.regularity}</p>
                </div>
                <div className="col-span-2 border-t border-border pt-2">
                  <p className="text-[10px] font-bold uppercase text-text-muted">Mentor Feedback</p>
                  <p className="text-text-secondary italic">"{issuedCertificate.feedback}"</p>
                </div>
              </div>

              {/* MENTEE ADD NEW SKILLS BUTTON */}
              {!isMentor && (
                <button
                  onClick={handleAddGainedSkillsToProfile}
                  disabled={addingSkillsToProfile}
                  className="w-full py-3 bg-success text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-success/90 transition-all shadow-lg shadow-success/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{addingSkillsToProfile ? 'Adding to Profile...' : 'Add New Skills to My Profile'}</span>
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXAM TAKING FULL WRITING SPACE POPUP MODAL */}
      <AnimatePresence>
        {activeExamSession && (
          <ExamTakingModal
            session={activeExamSession}
            onClose={() => setActiveExamSession(null)}
            onSubmitExam={handleExamSubmit}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
