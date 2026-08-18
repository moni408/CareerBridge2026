import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, query, where, onSnapshot, addDoc, orderBy, 
  serverTimestamp, doc, getDoc, deleteDoc, updateDoc, setDoc 
} from 'firebase/firestore';
import { 
  Send, Paperclip, Video, User, Loader2, FileText, ImageIcon, 
  MessageSquare, X, MoreVertical, Phone, Search, ChevronLeft, 
  Mic, MicOff, VideoOff, UserX, AlertTriangle, Calendar, Clock, 
  Check, Plus, Star, ArrowUpRight, HelpCircle, CheckCircle2, 
  Flame, ExternalLink, CalendarDays, ClipboardCheck, ArrowUp, 
  Briefcase, Sparkles, BookOpen, UserCheck, Play, SendHorizontal,
  ThumbsUp, BookMarked, Users, Lock, Unlock, CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCachedAccessToken, signInWithGoogle } from '../lib/firebase';
import { LearningSessionModule } from './LearningSessionModule';
import { ExamTakingModal } from './ExamTakingModal';
import { sendEmailAlert, sendCrossRoleEmailNotification } from '../services/emailService';

// Helper function to create event on Google Calendar via REST API
async function createGoogleCalendarEvent(accessToken: string, payload: {
  summary: string;
  description: string;
  startDateTime: string;
  durationMinutes: number;
  attendees: string[];
}) {
  const endDate = new Date(new Date(payload.startDateTime).getTime() + payload.durationMinutes * 60000);
  const event = {
    summary: payload.summary,
    description: payload.description,
    start: {
      dateTime: new Date(payload.startDateTime).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    },
    attendees: payload.attendees.map(email => ({ email })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 }
      ]
    }
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to create calendar event:', errorText);
    throw new Error('Google Calendar Error: ' + errorText);
  }

  return response.json();
}

export function MentorshipSpace() {
  const { profile, user } = useAuth();
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConn, setSelectedConn] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Custom workspace/tasks & sessions states
  const [activeSubTab, setActiveSubTab] = useState<'learning_module' | 'chat' | 'tasks' | 'sessions'>('learning_module');
  const [tasks, setTasks] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState<boolean>(false);
  const [msgReactions, setMsgReactions] = useState<{ [msgId: string]: string[] }>({});
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [showInstructionModal, setShowInstructionModal] = useState<boolean>(false);
  const [hasSeenInstruction, setHasSeenInstruction] = useState<boolean>(false);

  // Sync instruction guide popup based on user moving into tasks tab
  useEffect(() => {
    if (activeSubTab === 'tasks' && !hasSeenInstruction) {
      setShowInstructionModal(true);
    }
  }, [activeSubTab, hasSeenInstruction]);
  
  // Feedback submission states for One-to-One Sessions
  const [activeFeedbackSessionId, setActiveFeedbackSessionId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  
  // Task submission form state
  const [submittingTask, setSubmittingTask] = useState<any | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [subType, setSubType] = useState<'pdf' | 'docx' | 'ppt' | 'link'>('pdf');
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');

  // Learning session state
  const [learningSessions, setLearningSessions] = useState<any[]>([]);
  const [submittingSessionId, setSubmittingSessionId] = useState<string | null>(null);
  const [sessionAnswerText, setSessionAnswerText] = useState('');
  const [activeExamSession, setActiveExamSession] = useState<any | null>(null);
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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

      const mentorId = selectedConn?.mentorId;
      if (mentorId) {
        const mentorSnap = await getDoc(doc(db, 'users', mentorId));
        const mentorEmail = mentorSnap.exists() ? mentorSnap.data().email : '';
        if (mentorEmail) {
          await sendEmailAlert({
            recipientId: mentorId,
            recipientName: selectedConn?.mentorName || 'Mentor',
            recipientEmail: mentorEmail,
            senderName: profile?.displayName || 'Student',
            subject: `✅ Exam Submitted: ${activeExamSession.title}`,
            sessionType: activeExamSession.format === 'practical' ? 'Practical Exam' : 'Quiz Assessment',
            topic: activeExamSession.title,
            dateTime: new Date().toLocaleString(),
            body: `Student ${profile?.displayName || 'Student'} has completed and ended the exam.${autoSubmitted ? ' (Auto-submitted on time limit).' : ''}`
          });
        }
      }

      setActiveExamSession(null);
    } catch (err) {
      console.error('Error submitting exam in MentorshipSpace:', err);
      throw err;
    }
  };

  const handleSubmitSessionAnswer = async (sessionId: string) => {
    if (!sessionAnswerText.trim()) return;
    try {
      await updateDoc(doc(db, 'learning_sessions', sessionId), {
        menteeSubmission: sessionAnswerText,
        status: 'completed',
        submittedAt: new Date().toISOString()
      });
      setSubmittingSessionId(null);
      setSessionAnswerText('');
      alert('Answer submitted successfully!');
    } catch (err) {
      console.error('Failed to submit learning session answer:', err);
      alert('Failed to submit answer.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert("Due to sandbox limits, files must be under 800 KB. Please upload a smaller file or link to an external sandbox/repository.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
      setFileName(file.name);
    };
    reader.onerror = (err) => {
      console.error("FileReader error:", err);
      alert("Failed to read selected file.");
    };
    reader.readAsDataURL(file);
  };
  
  // 1-on-1 call scheduling state
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('14:00');
  const [schedType, setSchedType] = useState<'1-on-1 call' | 'Code review' | 'CV review' | 'Mock interview'>('1-on-1 call');
  const [schedDuration, setSchedDuration] = useState('30');
  const [schedDoubts, setSchedDoubts] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showRequestMeetingModal, setShowRequestMeetingModal] = useState<boolean>(false);

  // Video calling states
  const [isVideoCalling, setIsVideoCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVideoCalling && localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [isVideoCalling, localStream]);

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setIsVideoCalling(true);
    } catch (err) {
      console.error('Failed to get media devices', err);
    }
  };

  const endVideoCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setIsVideoCalling(false);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConn) return;

    if (file.size > 800 * 1024) {
      alert('File size exceeds the 800KB maximum for server memory sandbox.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await addDoc(collection(db, `mentorship_connections/${selectedConn.id}/messages`), {
          senderId: user?.uid,
          text: `Sent a file: ${file.name}`,
          fileUrl: base64,
          fileName: file.name,
          fileType: file.type,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Failed to upload file', err);
      }
    };
    reader.readAsDataURL(file);
  };

  // 1. Fetch initial mentoring connection
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'mentorship_connections'),
      where(profile?.role === 'mentor' ? 'mentorId' : 'menteeId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConnections(list);
      setLoading(false);
      if (list.length > 0 && !selectedConn) {
        setSelectedConn(list[0]);
      }
    });

    return () => unsubscribe();
  }, [user, profile]);

  // 2. Fetch Chat Messages, Tasks, Sessions, and Reviews on select connection
  useEffect(() => {
    if (!selectedConn) return;

    // Secure messenger queries
    const qMess = query(
      collection(db, `mentorship_connections/${selectedConn.id}/messages`),
      orderBy('createdAt', 'asc')
    );
    const unsubMess = onSnapshot(qMess, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Sync tasks published by mentor
    const qTasks = query(
      collection(db, 'tasks'),
      where('connId', '==', selectedConn.id)
    );
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Sync planned sessions
    const qSess = query(
      collection(db, 'sessions'),
      where('connectionId', '==', selectedConn.id)
    );
    const unsubSess = onSnapshot(qSess, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      list.sort((a: any, b: any) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      setSessions(list);
    });

    // Sync task audits/reviews
    const qRev = query(
      collection(db, 'reviews'),
      where('connId', '==', selectedConn.id)
    );
    const unsubRev = onSnapshot(qRev, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Sync roadmap learning sessions and materials
    let learn1: any[] = [];
    let learn2: any[] = [];
    const setCombinedLearn = () => {
      const map = new Map<string, any>();
      [...learn1, ...learn2].forEach(s => map.set(s.id, s));
      setLearningSessions(Array.from(map.values()));
    };

    const qLearnSess1 = query(
      collection(db, 'learning_sessions'),
      where('connId', '==', selectedConn.id)
    );
    const unsubLearnSess1 = onSnapshot(qLearnSess1, (snapshot) => {
      learn1 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCombinedLearn();
    });

    const qLearnSess2 = query(
      collection(db, 'learning_sessions'),
      where('connectionId', '==', selectedConn.id)
    );
    const unsubLearnSess2 = onSnapshot(qLearnSess2, (snapshot) => {
      learn2 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCombinedLearn();
    });

    return () => {
      unsubMess();
      unsubTasks();
      unsubSess();
      unsubRev();
      unsubLearnSess1();
      unsubLearnSess2();
    };
  }, [selectedConn]);

  // Fetch Partner profile details (to get role, company, bio, etc.)
  useEffect(() => {
    if (!selectedConn || !user) return;
    setPartnerProfile(null);
    const partnerId = profile?.role === 'mentor' ? selectedConn.menteeId : selectedConn.mentorId;
    
    // First try the 'users' collection for basic profile details
    const userRef = doc(db, 'users', partnerId);
    getDoc(userRef).then((snap) => {
      if (snap.exists()) {
        const uData = snap.data();
        setPartnerProfile(uData);
        // If they are a mentor, also check the 'mentors' collection for company/role details
        if (uData.role === 'mentor') {
          const mRef = doc(db, 'mentors', partnerId);
          getDoc(mRef).then((mSnap) => {
            if (mSnap.exists()) {
              setPartnerProfile(prev => ({ ...prev, ...mSnap.data() }));
            }
          });
        }
      } else {
        // Fallback: directly query 'mentors'
        const mRef = doc(db, 'mentors', partnerId);
        getDoc(mRef).then((mSnap) => {
          if (mSnap.exists()) {
            setPartnerProfile(mSnap.data());
          }
        });
      }
    }).catch(err => {
      console.warn("Error fetching partner profile:", err);
    });
  }, [selectedConn, user, profile]);

  const handleAddReaction = async (msgId: string, emoji: string) => {
    setMsgReactions(prev => {
      const current = prev[msgId] || [];
      if (current.includes(emoji)) {
        return { ...prev, [msgId]: current.filter(e => e !== emoji) };
      } else {
        return { ...prev, [msgId]: [...current, emoji] };
      }
    });

    try {
      const msgRef = doc(db, `mentorship_connections/${selectedConn.id}/messages`, msgId);
      await setDoc(msgRef, {
        reactions: {
          [emoji]: 1
        }
      }, { merge: true });
    } catch (e) {
      console.log("Firestore message reaction sync skipped or unpermitted:", e);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeSubTab, isPartnerTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConn) return;

    const text = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, `mentorship_connections/${selectedConn.id}/messages`), {
        senderId: user?.uid,
        text,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleCancelMentorship = async () => {
    if (!selectedConn) return;
    setCancelling(true);
    try {
      const connId = selectedConn.id;
      setShowCancelConfirm(false);
      setSelectedConn(null);
      await deleteDoc(doc(db, 'mentorship_connections', connId));
    } catch (err) {
      console.error('Failed to cancel mentorship', err);
    } finally {
      setCancelling(false);
    }
  };

  // Submit complete work evidence for verification
  const handleTaskSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTask) return;

    const contentVal = subType === 'link' ? evidenceUrl : fileBase64;
    if (subType === 'link' && !evidenceUrl.trim()) {
      alert("Please specify your deliverable reference Link/URL.");
      return;
    }
    if (subType !== 'link' && !fileBase64) {
      alert("Please select and upload your deliverables file.");
      return;
    }

    setIsSubmittingEvidence(true);
    try {
      // Update Task status & set submission variables right inside the task document!
      await updateDoc(doc(db, 'tasks', submittingTask.id), {
        status: 'Under Review',
        submittedType: subType,
        submittedContent: contentVal,
        submittedName: subType === 'link' ? '' : fileName,
        submittedComment: evidenceNote.trim(),
        submittedAt: new Date().toISOString()
      });

      // Send immediate notification to Mentor
      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedConn.mentorId,
        type: 'task_submitted',
        title: '📥 Task Deliverable Submitted',
        body: `${profile?.displayName || 'Your candidate'} submitted deliverables for task "${submittingTask.title}".`,
        isRead: false,
        relatedId: selectedConn.id,
        createdAt: new Date().toISOString()
      });

      sendCrossRoleEmailNotification({
        senderId: user?.uid,
        senderName: profile?.displayName || 'Student',
        senderRole: 'student',
        senderEmail: user?.email || '',
        recipientId: selectedConn.mentorId,
        recipientName: selectedConn.mentorName || 'Mentor',
        recipientRole: 'mentor',
        subject: `📥 Task Deliverable Submitted: ${submittingTask.title}`,
        category: 'application',
        message: `Mentee ${profile?.displayName || 'Student'} submitted deliverables for task "${submittingTask.title}". Notes: ${evidenceNote.trim() || 'Deliverables uploaded.'}`,
        actionUrl: window.location.origin
      }).catch(e => console.warn('Email dispatch failed:', e));

      alert('Work successfully submitted for mentor verification!');
      setSubmittingTask(null);
      setEvidenceUrl('');
      setEvidenceNote('');
      setFileBase64('');
      setFileName('');
    } catch (err) {
      console.error('Submission failed:', err);
      alert('System error posting deliverable evidence.');
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  // Schedule new 1on1 session + Google Calendar sync
  const handleBookingSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedDate || !selectedConn) {
      alert('Please select a valid scheduled Date.');
      return;
    }

    setIsScheduling(true);
    try {
      const dateTimeIso = `${schedDate}T${schedTime}:00`;
      
      const payload: any = {
        connectionId: selectedConn.id,
        mentorId: selectedConn.mentorId,
        mentorName: selectedConn.mentorName,
        menteeId: user?.uid,
        menteeName: profile?.displayName || user?.displayName || 'Graduate Student',
        sessionType: schedType,
        dateTime: dateTimeIso,
        duration: parseInt(schedDuration),
        status: 'confirmed',
        preSessionNotes: schedDoubts || 'No prior ideas or doubts logged.',
        postSessionNotes: '',
        createdAt: new Date().toISOString()
      };

      // Add to firestore
      const docRef = await addDoc(collection(db, 'sessions'), payload);
      
      // Google Calendar Integration
      const googleToken = await getCachedAccessToken();
      let calendarSynced = false;
      let syncErrorMsg = '';

      if (googleToken) {
        try {
          // Get mentor email from their user account to invite them
          const mentorSnap = await getDoc(doc(db, 'users', selectedConn.mentorId));
          const mentorEmail = mentorSnap.exists() ? mentorSnap.data().email : '';
          
          const inviteEmails = [];
          if (user?.email) inviteEmails.push(user.email);
          if (mentorEmail) inviteEmails.push(mentorEmail);

          await createGoogleCalendarEvent(googleToken, {
            summary: `1-on-1 Mentorship: ${schedType} (${profile?.displayName || 'Graduate'})`,
            description: `Type: ${schedType}\nMentee Doubts/Ideas Shared:\n"${schedDoubts || 'None'}"\n\nReminders are scheduled automatically to trigger prompt alerts.`,
            startDateTime: dateTimeIso,
            durationMinutes: parseInt(schedDuration),
            attendees: inviteEmails
          });
          calendarSynced = true;
        } catch (calErr: any) {
          console.error('Google Calendar event creation fail:', calErr);
          syncErrorMsg = calErr.message;
        }
      }

      // Notify Mentor
      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedConn.mentorId,
        type: 'session_scheduled',
        title: '📅 Mentorship Session booked',
        body: `A new ${schedType} session is booked by your mentee for ${new Date(dateTimeIso).toLocaleString()}.`,
        isRead: false,
        relatedId: selectedConn.id,
        createdAt: new Date().toISOString()
      });

      sendCrossRoleEmailNotification({
        senderId: user?.uid,
        senderName: profile?.displayName || 'Student',
        senderRole: 'student',
        senderEmail: user?.email || '',
        recipientId: selectedConn.mentorId,
        recipientName: selectedConn.mentorName || 'Mentor',
        recipientRole: 'mentor',
        subject: `📅 1-on-1 Mentorship Session Booked by ${profile?.displayName || 'Mentee'}`,
        category: 'session',
        message: `Mentee ${profile?.displayName || 'Student'} booked a ${schedType} session on ${new Date(dateTimeIso).toLocaleString()}.\n\nDoubts / Topics: "${schedDoubts || 'None provided'}"`,
        actionUrl: window.location.origin
      }).catch(e => console.warn('Email dispatch failed:', e));

      if (calendarSynced) {
        alert(`Success! Session booked and synced directly to Google Calendar. Invitation sent to your mentor.`);
      } else if (googleToken && syncErrorMsg) {
        alert(`Session stored in database, but Google Calendar sync failed securely: ${syncErrorMsg}`);
      } else {
        alert('Session booked successfully! Connect Google Calendar below to get automatic notification triggers.');
      }

      setSchedDate('');
      setSchedTime('14:00');
      setSchedDoubts('');
      setShowRequestMeetingModal(false);
    } catch (err: any) {
      console.error(err);
      alert('Booking session error: ' + err.message);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSubmitFeedback = async (sessionId: string, rating: number, comment: string, mentorId: string) => {
    if (!sessionId) return;
    setIsSubmittingFeedback(true);
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        feedback: {
          rating,
          comment,
          createdAt: new Date().toISOString()
        },
        status: 'completed'
      });

      // Award XP to the mentor profile
      const mentorRef = doc(db, 'users', mentorId);
      const mentorSnap = await getDoc(mentorRef);
      if (mentorSnap.exists()) {
        const mentorData = mentorSnap.data();
        const currentXp = mentorData.xp || 0;
        await updateDoc(mentorRef, {
          xp: currentXp + rating * 15
        });
      }

      // Add a mentor activity log
      await addDoc(collection(db, 'activities'), {
        mentorId: mentorId,
        html: `Received an interactive <span class="font-bold text-[#534AB7]">${rating}-star rating</span> and qualitative session review.`,
        type: 'success',
        ts: Date.now()
      });

      // Send structured notification to mentor
      await addDoc(collection(db, 'notifications'), {
        recipientId: mentorId,
        type: 'feedback_received',
        title: '⭐️ New Session Feedback',
        body: `A mentee rated your session with ${rating} stars: "${comment.slice(0, 50)}${comment.length > 50 ? '...' : ''}"`,
        isRead: false,
        createdAt: new Date().toISOString()
      });

      alert("Thank you! Your rating and comments have been stored in the feedback database and dispatched directly to your mentor's reputation index.");
      
      // Clear feedback state
      setActiveFeedbackSessionId(null);
      setFeedbackRating(5);
      setFeedbackComment('');
    } catch (err: any) {
      console.error("Feedback dispatch error:", err);
      alert("Failed to submit feedback: " + err.message);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const startCalendarAuth = async () => {
    setIsAuthenticating(true);
    try {
      await signInWithGoogle();
      alert('Access authorized! All upcoming sessions scheduled will now sync directly to your Google Calendar calendar.');
    } catch (err: any) {
      console.error(err);
      alert('OAuth credentials handshake failed: ' + err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-6 bg-bg-primary min-h-full">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted animate-pulse">LOADING SECURE INSTANCING...</p>
    </div>
  );

  const googleAccessToken = getCachedAccessToken();

  return (
    <div className="flex-1 min-h-0 flex bg-bg-primary border border-border overflow-hidden rounded-2xl shadow-sm">
      {/* List sidebar */}
      <div className="w-80 min-h-0 border-r border-border flex flex-col bg-bg-secondary/50">
        <div className="p-8 border-b border-border">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Mentorship Command</p>
              <h2 className="text-2xl font-bold text-text-primary tracking-tight">Active Spaces</h2>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="FILTER CONNECTIONS..." 
              className="w-full pl-10 pr-4 py-3 bg-bg-primary border border-border rounded-xl text-[10px] font-bold tracking-widest text-text-primary focus:border-primary outline-none transition-all placeholder:text-text-muted/50"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {connections.length === 0 ? (
            <div className="py-20 text-center space-y-4 opacity-50">
              <Users className="w-12 h-12 mx-auto text-text-muted" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">No networks active</p>
            </div>
          ) : (
            connections.map((conn) => (
              <button
                key={conn.id}
                onClick={() => setSelectedConn(conn)}
                className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all relative group ${
                  selectedConn?.id === conn.id 
                    ? 'bg-bg-primary border border-border shadow-xs' 
                    : 'hover:bg-bg-tertiary border border-transparent'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black uppercase tracking-wider border transition-all duration-500 ${
                  selectedConn?.id === conn.id ? 'bg-primary text-white border-primary' : 'bg-bg-tertiary border-border text-text-muted group-hover:border-primary/40'
                }`}>
                  {((profile?.role === 'mentor' ? conn.menteeName : conn.mentorName) || 'U').trim().slice(0, 2).toUpperCase()}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className={`font-bold text-sm tracking-tight transition-colors truncate ${selectedConn?.id === conn.id ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {profile?.role === 'mentor' ? conn.menteeName : conn.mentorName}
                  </p>
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-0.5">ACTIVE COHORT</p>
                </div>
                {selectedConn?.id === conn.id && (
                  <motion.div layoutId="active-chat" className="absolute right-4 w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main interaction workspace */}
      <div className="flex-1 min-w-0 flex flex-col bg-bg-primary relative">
        {selectedConn ? (
          <>
            {/* Upper Action Command Deck */}
            <header className="py-4 px-8 border-b border-border flex flex-col md:flex-row md:justify-between md:items-center bg-bg-primary/80 backdrop-blur-md sticky top-0 z-10 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-primary-hover flex items-center justify-center text-white font-black text-sm uppercase tracking-wider shadow-md shadow-primary/10 shrink-0">
                  {((profile?.role === 'mentor' ? selectedConn.menteeName : selectedConn.mentorName) || 'U').trim().slice(0, 2).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-text-primary tracking-tight leading-none">
                    {profile?.role === 'mentor' ? selectedConn.menteeName : selectedConn.mentorName}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-sm shadow-success/40" />
                    <p className="text-[10px] uppercase font-black tracking-wider text-success font-mono">Active Now</p>
                  </div>
                </div>
              </div>
              
              {/* Actions with Labels */}
              <div className="flex items-center gap-3 shrink-0">
                <button 
                  onClick={() => setShowCancelConfirm(true)}
                  title="Conclude Cohort Connection"
                  className="px-4 py-2.5 rounded-xl flex items-center gap-2 bg-error/5 hover:bg-error-light text-text-secondary hover:text-error border border-border/80 hover:border-error/20 transition-all font-bold text-[10px] uppercase tracking-wider"
                >
                  <UserX className="w-4 h-4 text-error" />
                  <span>Conclude</span>
                </button>
              </div>
            </header>

            {/* HIGH-COHESION SUBTAB PANEL NAVIGATOR */}
            <div className="flex bg-bg-secondary/40 border-b border-border px-8 py-2.5 gap-2.5 overflow-x-auto text-xs">
              <button 
                onClick={() => setActiveSubTab('learning_module')} 
                className={`px-4 py-2 text-[10px] font-bold tracking-wider uppercase rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'learning_module' ? 'bg-primary text-white border-primary shadow-xs' : 'text-text-secondary border-transparent hover:bg-bg-tertiary'}`}
              >
                <Sparkles className="w-4 h-4" /> Learning Session Module
              </button>
              <button 
                onClick={() => setActiveSubTab('chat')} 
                className={`px-4 py-2 text-[10px] font-bold tracking-wider uppercase rounded-lg border transition-all cursor-pointer ${activeSubTab === 'chat' ? 'bg-primary text-white border-primary shadow-xs' : 'text-text-secondary border-transparent hover:bg-bg-tertiary'}`}
              >
                💬 Secure Chat
              </button>
              <button 
                onClick={() => setActiveSubTab('tasks')} 
                className={`px-4 py-2 text-[10px] font-bold tracking-wider uppercase rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'tasks' ? 'bg-primary text-white border-primary shadow-xs' : 'text-text-secondary border-transparent hover:bg-bg-tertiary'}`}
              >
                <ClipboardCheck className="w-4 h-4" /> Tasks & Workspace
              </button>
              <button 
                onClick={() => setActiveSubTab('sessions')} 
                className={`px-4 py-2 text-[10px] font-bold tracking-wider uppercase rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'sessions' ? 'bg-primary text-white border-primary shadow-xs' : 'text-text-secondary border-transparent hover:bg-bg-tertiary'}`}
              >
                <Calendar className="w-4 h-4" /> 1-on-1 Scheduled Meetings
              </button>
            </div>

            {/* PANEL RENDER AREAS */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-bg-secondary/15">
              <AnimatePresence mode="wait">
                
                {/* TAB 0: LEARNING SESSION MODULE */}
                {activeSubTab === 'learning_module' && (
                  <motion.div
                    key="learning_module_pane"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8"
                  >
                    <LearningSessionModule
                      connection={selectedConn}
                      user={user}
                      profile={profile}
                      isMentor={profile?.role === 'mentor'}
                    />
                  </motion.div>
                )}
                
                {/* TAB 1: DISCUSSION MESSENGER */}
                {activeSubTab === 'chat' && (
                  <motion.div 
                    key="chat_pane" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col justify-between"
                  >
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6 min-h-0">
                      
                      {/* Start of conversation divider */}
                      <div className="flex flex-col items-center justify-center py-8 border-b border-border/40 mb-8 text-center space-y-2">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-2xl font-black shadow-sm">
                          {(profile?.role === 'mentor' ? selectedConn.menteeName : selectedConn.mentorName)?.[0]}
                        </div>
                        <h4 className="text-base font-extrabold text-text-primary tracking-tight">
                          Start of conversation with {profile?.role === 'mentor' ? selectedConn.menteeName : selectedConn.mentorName}
                        </h4>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest max-w-md leading-relaxed">
                          This encrypted, direct guidance channel is established. Share CVs, roadmaps, code reviews, and schedule 1-on-1 virtual consultations directly.
                        </p>
                      </div>

                      {messages.map((msg, idx) => {
                        const isMe = msg.senderId === user?.uid;
                        
                        // Sender Name logic
                        const senderName = isMe ? "You" : (profile?.role === 'mentor' ? selectedConn.menteeName : selectedConn.mentorName);
                        const showSenderName = idx === 0 || messages[idx - 1].senderId !== msg.senderId;

                        // Date Separator logic
                        const msgDate = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
                        const prevMsgDate = idx > 0 && messages[idx - 1].createdAt?.toDate ? messages[idx - 1].createdAt.toDate() : null;
                        const showDateSeparator = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();

                        return (
                          <div key={msg.id || idx} className="space-y-1.5">
                            {/* Date Separator */}
                            {showDateSeparator && (
                              <div className="flex items-center justify-center py-4 my-2">
                                <div className="h-[1px] bg-border/60 flex-1" />
                                <span className="px-4 text-[9px] font-mono font-black text-text-muted uppercase tracking-widest bg-bg-primary z-10 border border-border/50 rounded-full py-0.5">
                                  {msgDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                </span>
                                <div className="h-[1px] bg-border/60 flex-1" />
                              </div>
                            )}

                            {/* Sender Name */}
                            {showSenderName && (
                              <div className={`text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                {senderName}
                              </div>
                            )}

                            <div 
                              className={`flex ${isMe ? 'justify-end' : 'justify-start'} relative group/msg`}
                              onMouseEnter={() => setHoveredMsgId(msg.id)}
                              onMouseLeave={() => setHoveredMsgId(null)}
                            >
                              <div className={`max-w-[75%] space-y-1 ${isMe ? 'text-right' : 'text-left'} relative`}>
                                
                                {/* Hover reaction controls */}
                                {hoveredMsgId === msg.id && (
                                  <div className={`absolute -top-7 ${isMe ? 'right-0' : 'left-0'} bg-bg-primary border border-border rounded-full shadow-md py-1 px-2.5 flex items-center gap-1.5 z-20`}>
                                    {['👍', '❤️', '🔥', '👏', '💡'].map(emoji => (
                                      <button 
                                        key={emoji}
                                        type="button"
                                        onClick={() => handleAddReaction(msg.id, emoji)}
                                        className="hover:scale-125 active:scale-95 transition-transform text-xs cursor-pointer"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Message bubble itself */}
                                <div className={`p-4 rounded-2xl shadow-xs leading-relaxed inline-block text-left relative ${
                                  isMe 
                                    ? 'bg-primary text-white rounded-tr-none' 
                                    : 'bg-bg-primary border border-border text-text-primary rounded-tl-none'
                                }`}>
                                  {msg.fileUrl ? (
                                    <div className="space-y-4">
                                      <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                                        isMe ? 'bg-primary-hover/50 border-primary-light/25' : 'bg-bg-secondary border-border'
                                      }`}>
                                        <FileText className="w-5 h-5 animate-pulse" />
                                        <p className="text-xs font-bold truncate max-w-[200px]">{msg.fileName?.toUpperCase()}</p>
                                      </div>
                                      {msg.fileType?.startsWith('image/') && (
                                        <img 
                                          src={msg.fileUrl} 
                                          alt={msg.fileName} 
                                          className="max-h-[300px] max-w-full rounded-xl border object-contain shadow-md"
                                          referrerPolicy="no-referrer"
                                        />
                                      )}
                                      <a 
                                        href={msg.fileUrl} 
                                        download={msg.fileName}
                                        className={`text-[10px] font-bold uppercase tracking-widest hover:underline inline-block mt-1 ${isMe ? 'text-white/80' : 'text-primary'}`}
                                      >
                                        Download Material
                                      </a>
                                    </div>
                                  ) : (
                                    <p className="text-sm font-medium whitespace-pre-wrap">{msg.text}</p>
                                  )}

                                  {/* Reactions list */}
                                  {((msg.reactions && Object.keys(msg.reactions).length > 0) || (msgReactions[msg.id] && msgReactions[msg.id].length > 0)) && (
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                      {Array.from(new Set([
                                        ...Object.keys(msg.reactions || {}),
                                        ...(msgReactions[msg.id] || [])
                                      ])).map(emoji => (
                                        <span key={emoji} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-bg-secondary/80 border border-border/60 rounded-full text-[10px]">
                                          <span>{emoji}</span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Message Timestamp & Read Status */}
                                <div className="flex items-center gap-2 justify-start px-1 mt-0.5">
                                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono">
                                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Delivered'}
                                  </span>
                                  {isMe && (
                                    <span className="text-[8px] font-bold text-success font-mono uppercase tracking-widest inline-flex items-center gap-0.5">
                                      <Check className="w-3 h-3 text-success" /> Read
                                    </span>
                                  )}
                                </div>

                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Typing Indicator */}
                      {isPartnerTyping && (
                        <div className="flex items-center gap-2 text-text-muted text-[10px] font-mono uppercase tracking-wider pl-1 mt-4 animate-pulse">
                          <div className="flex gap-1 py-1 px-2.5 bg-bg-tertiary border border-border rounded-xl">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span>{profile?.role === 'mentor' ? selectedConn.menteeName : selectedConn.mentorName} is writing...</span>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Text area input */}
                    <div className="p-6 bg-bg-primary border-t border-border">
                      <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-bg-secondary p-1.5 pr-4 rounded-xl border border-border focus-within:border-primary transition-all">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:text-primary transition-colors"
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message here..."
                          className="flex-1 bg-transparent py-3 px-1 outline-none text-xs text-text-primary font-medium placeholder:text-text-muted/40"
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim()}
                          className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-30 hover:scale-105 active:scale-95 transition-all shadow-xs"
                        >
                          <SendHorizontal className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: INTERACTIVE ROADMAP & ASSIGNED TASKS */}
                {activeSubTab === 'tasks' && (
                  <motion.div 
                    key="tasks_pane"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-8 text-left w-[90%] max-w-[90%] mx-auto space-y-8 text-xs"
                  >
                    {/* SECTION 1: ROADMAP MODULE MATERIALS (Lectures, Practicals, Quizzes, Assignments) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-border">
                        <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-widest pl-3 border-l-4 border-primary flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" /> Roadmap Module Sessions & Tasks ({learningSessions.length})
                        </h4>
                      </div>

                      {learningSessions.length === 0 ? (
                        <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl bg-card space-y-2">
                          <Video className="w-8 h-8 text-text-muted/40 mx-auto" />
                          <p className="text-xs font-bold text-text-secondary">No learning module sessions or materials assigned yet</p>
                          <p className="text-[10px] text-text-muted">When your mentor posts video lectures, practical exercises, quizzes, or assignments for roadmap modules, they will appear here.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {learningSessions.map((session) => {
                            const isLecture = session.format === 'lecture';
                            const isPractical = session.format === 'practical';
                            const isQuiz = session.format === 'quiz';
                            const isAssignment = session.format === 'assignment';

                            // Calculate encryption status for practical & quiz
                            const startMs = new Date(session.startTime || 0).getTime();
                            const unlockMs = startMs - (5 * 60 * 1000); // 5 mins before start time
                            const isLocked = session.isEncrypted && nowTime < unlockMs;
                            const isCountdownWindow = session.isEncrypted && nowTime >= unlockMs && nowTime < startMs;

                            const endMs = isPractical || isQuiz 
                              ? new Date(session.endTime || 0).getTime() 
                              : isAssignment 
                              ? new Date(session.deadline || 0).getTime() 
                              : new Date(session.dateTime || 0).getTime();

                            const isSubmitted = Boolean(
                              session.menteeSubmission || 
                              session.submittedAt || 
                              session.submittedContent || 
                              session.status === 'completed' || 
                              session.status === 'Under Review' || 
                              session.status === 'Graded'
                            );

                            const isPassed = endMs > 0 && nowTime > endMs;
                            const isMissed = isPassed && !isSubmitted;

                            return (
                              <div 
                                key={session.id} 
                                className={`p-5 rounded-2xl border space-y-3 transition-all ${
                                  isMissed 
                                    ? 'bg-error/5 border-error/30' 
                                    : 'bg-card border-border shadow-xs'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded font-mono ${
                                        isLecture ? 'bg-primary/20 text-primary' :
                                        isPractical ? 'bg-emerald-500/20 text-emerald-600' :
                                        isQuiz ? 'bg-amber-500/20 text-amber-600' : 'bg-purple-500/20 text-purple-600'
                                      }`}>
                                        {session.format}
                                      </span>

                                      {session.moduleTitle && (
                                        <span className="text-[10px] text-text-muted font-bold font-mono">
                                          Module: {session.moduleTitle}
                                        </span>
                                      )}
                                    </div>

                                    <h5 className="font-extrabold text-sm text-text-primary">{session.title}</h5>
                                  </div>

                                  <div>
                                    {session.status === 'completed' || session.status === 'Graded' ? (
                                      <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg bg-success/20 text-success border border-success/30 font-mono">
                                        Completed
                                      </span>
                                    ) : isSubmitted ? (
                                      <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30 font-mono animate-pulse">
                                        Submitted / Under Review
                                      </span>
                                    ) : isMissed ? (
                                      <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg bg-error/20 text-error border border-error/30 font-mono animate-pulse">
                                        Pending / Missed
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg bg-primary/20 text-primary border border-primary/30 font-mono">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* FORMAT SPECIFIC CONTENT DETAILS */}
                                
                                {/* 1. Video Lecture Details */}
                                {isLecture && (
                                  <div className="p-3 bg-bg-secondary/60 rounded-xl border border-border space-y-2 text-xs">
                                    <div className="flex justify-between items-center text-[10px] text-text-muted font-mono font-bold">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-primary" /> {new Date(session.dateTime).toLocaleString()}
                                      </span>
                                      <span>Duration: {session.durationMinutes} mins</span>
                                    </div>

                                    {session.notes && <p className="text-text-secondary text-xs">{session.notes}</p>}

                                    {session.meetLink && (
                                      <a
                                        href={session.meetLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-all"
                                      >
                                        <Video className="w-4 h-4" /> Join Google Meet
                                      </a>
                                    )}
                                  </div>
                                )}

                                {/* 2 & 3. Practical / Quiz Details (WITH AUTO ENCRYPTION) */}
                                {(isPractical || isQuiz) && (
                                  <div className="p-3 bg-bg-secondary/60 rounded-xl border border-border space-y-2 text-xs">
                                    <div className="flex justify-between items-center text-[10px] text-text-muted font-mono font-bold">
                                      <span>Start: {new Date(session.startTime).toLocaleString()}</span>
                                      <span>End: {new Date(session.endTime).toLocaleString()}</span>
                                    </div>

                                    {/* IF LOCKED FOR MENTEE (ENCRYPTED CONTENT) */}
                                    {isLocked ? (
                                      <div className="p-3 bg-card rounded-lg border border-border text-center space-y-1">
                                        <Lock className="w-5 h-5 text-amber-500 mx-auto" />
                                        <p className="text-xs font-bold text-amber-500 uppercase">🔒 Encrypted Task Content</p>
                                        <p className="text-[10px] text-text-muted">
                                          Question details remain encrypted and will unlock automatically 5 minutes before start time ({new Date(unlockMs).toLocaleTimeString()}).
                                        </p>
                                      </div>
                                    ) : isCountdownWindow ? (
                                      <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30 text-center space-y-1">
                                        <Unlock className="w-5 h-5 text-emerald-500 mx-auto animate-bounce" />
                                        <p className="text-xs font-bold text-emerald-500 uppercase">🔓 Task Content Unlocked!</p>
                                        <p className="text-[11px] font-mono text-text-primary">{session.question || session.quizContent}</p>
                                        <p className="text-[10px] text-text-muted">Starting in 5 minutes. Get ready!</p>
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5">
                                        <p className="font-semibold text-text-primary whitespace-pre-wrap">{session.question || session.quizContent}</p>
                                        {session.questionCount && <p className="text-[10px] text-text-muted font-mono">Quiz Count: {session.questionCount} Questions</p>}
                                      </div>
                                    )}

                                    {/* Solution Submission / Take Part / Missed View for Mentee */}
                                    {!isSubmitted && (
                                      <div className="pt-3 border-t border-border space-y-3">
                                        {isMissed ? (
                                          <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-center space-y-1">
                                            <AlertTriangle className="w-4 h-4 text-error mx-auto" />
                                            <p className="text-xs font-bold text-error uppercase">⚠️ Time Limit Exceeded (Missed)</p>
                                            <p className="text-[10px] text-text-muted">
                                              The deadline for this assessment has passed. You can no longer take part in this exam.
                                            </p>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setActiveExamSession(session)}
                                            className={`w-full py-3 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                                              isPractical 
                                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                                                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                                            }`}
                                          >
                                            <Send className="w-4 h-4" />
                                            <span>Take Part in {isPractical ? 'Practical Exam' : 'Quiz Assessment'}</span>
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {/* Submitted Solution View */}
                                    {session.menteeSubmission && (
                                      <div className="p-3 bg-success/10 rounded-xl border border-success/20 text-xs space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-success font-bold uppercase text-[10px]">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Submitted Solution (Under Mentor Review):</span>
                                        </div>
                                        <p className="text-text-primary font-mono bg-card p-2 rounded-lg border border-border/50">{session.menteeSubmission}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* 4. Assignment Details */}
                                {isAssignment && (
                                  <div className="p-3 bg-bg-secondary/60 rounded-xl border border-border space-y-2 text-xs">
                                    <div className="flex justify-between items-center text-[10px] text-text-muted font-mono font-bold">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-purple-500" /> Deadline: {new Date(session.deadline).toLocaleString()}
                                      </span>
                                    </div>

                                    <p className="text-text-primary whitespace-pre-wrap">{session.description}</p>

                                    {!isSubmitted && (
                                      <div className="pt-3 border-t border-border space-y-3">
                                        {isMissed ? (
                                          <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-center space-y-1">
                                            <AlertTriangle className="w-4 h-4 text-error mx-auto" />
                                            <p className="text-xs font-bold text-error uppercase">⚠️ Time Limit Exceeded (Missed)</p>
                                            <p className="text-[10px] text-text-muted">
                                              The deadline for this assignment has passed. Please contact your mentor if you need an extension.
                                            </p>
                                          </div>
                                        ) : submittingSessionId === session.id ? (
                                          <div className="p-3 bg-card border border-border rounded-xl space-y-3">
                                            <div>
                                              <label className="block text-[10px] font-extrabold text-text-secondary uppercase mb-1">
                                                Your Assignment Submission / Work Link *
                                              </label>
                                              <textarea
                                                rows={4}
                                                value={sessionAnswerText}
                                                onChange={(e) => setSessionAnswerText(e.target.value)}
                                                placeholder="Type your submission notes, project links, or answers here..."
                                                className="w-full bg-bg-secondary border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-purple-500 font-medium"
                                              />
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => handleSubmitSessionAnswer(session.id)}
                                                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                              >
                                                <Send className="w-4 h-4" />
                                                <span>Submit Assignment</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setSubmittingSessionId(null)}
                                                className="px-4 py-2.5 bg-bg-secondary hover:bg-bg-tertiary text-text-primary font-bold text-xs rounded-xl border border-border cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setSubmittingSessionId(session.id)}
                                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer"
                                          >
                                            <Send className="w-4 h-4" />
                                            <span>Submit Assignment Work</span>
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {isSubmitted && session.menteeSubmission && (
                                      <div className="p-3 bg-success/10 rounded-xl border border-success/20 text-xs space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-success font-bold uppercase text-[10px]">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Submitted Solution (Under Mentor Review):</span>
                                        </div>
                                        <p className="text-text-primary font-mono bg-card p-2 rounded-lg border border-border/50">{session.menteeSubmission}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: CUSTOM INDIVIDUAL ASSIGNMENTS */}
                    <div className="space-y-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between pb-3 border-b border-border">
                        <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-widest pl-3 border-l-4 border-primary">
                          Custom Workspace Tasks ({tasks.length})
                        </h4>
                      </div>

                      {tasks.length === 0 ? (
                        <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl bg-card space-y-2">
                          <BookOpen className="w-8 h-8 text-text-muted/40 mx-auto" />
                          <p className="text-xs font-bold text-text-secondary">No custom tasks assigned</p>
                          <p className="text-[10px] text-text-muted">Wait for your Industry Mentor to publish custom individual tasks inside your workspace.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {tasks.map((task) => {
                            const isToDo = task.status === 'To Do' || !task.status;
                            const isUnderReview = task.status === 'Under Review';
                            const isGraded = task.status === 'Graded';

                            return (
                              <div key={task.id} className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-xs relative">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="space-y-1">
                                    <h5 className="font-bold text-base text-text-primary tracking-tight">{task.title}</h5>
                                    <p className="text-xs text-text-secondary font-medium leading-relaxed mt-2">{task.description}</p>
                                    
                                    <p className="text-text-muted text-[10px] font-bold inline-flex items-center gap-1 mt-3">
                                      <Clock className="w-3.5 h-3.5 text-primary" /> Target Deadline: {new Date(task.deadline).toLocaleDateString()}
                                    </p>
                                  </div>
                                  
                                  {/* Status badge */}
                                  <div>
                                    {isGraded ? (
                                      <span className="px-2.5 py-1 text-[9px] font-black tracking-wider uppercase rounded-lg font-mono bg-success/15 text-success border border-success/20">
                                        Score: {task.score}/100
                                      </span>
                                    ) : isUnderReview ? (
                                      <span className="px-2.5 py-1 text-[9px] font-black tracking-wider uppercase rounded-lg font-mono bg-amber-500/15 text-amber-500 border border-amber-500/20 animate-pulse">
                                        Under Review
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 text-[9px] font-black tracking-wider uppercase rounded-lg font-mono bg-slate-500/10 text-slate-500 border border-slate-500/20">
                                        To Do
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Submitted material view */}
                                {task.submittedAt && (
                                  <div className="p-4 bg-bg-secondary rounded-xl border space-y-2 text-xs">
                                    <p className="font-extrabold uppercase text-[9px] tracking-wider text-text-muted">Your Submission:</p>
                                    <p className="text-text-secondary">Type: <span className="font-bold uppercase text-[10px] bg-primary-light text-primary px-1.5 py-0.5 rounded">{task.submittedType}</span></p>
                                    {task.submittedType === 'link' ? (
                                      <p className="text-text-secondary font-bold inline-flex items-center gap-1">
                                        URL: <a href={task.submittedContent} target="_blank" rel="noreferrer" className="text-primary hover:underline">{task.submittedContent} <ExternalLink className="w-3.5 h-3.5" /></a>
                                      </p>
                                    ) : (
                                      <p className="text-text-secondary font-bold inline-flex items-center gap-1">
                                        Attached: <span className="text-[#534AB7]">{task.submittedName || 'Deliverable file'}</span>
                                      </p>
                                    )}
                                    {task.submittedComment && (
                                      <p className="italic text-text-primary bg-card p-2 rounded border border-border/60">"{task.submittedComment}"</p>
                                    )}
                                  </div>
                                )}

                                {/* Mentor's Grade & Feedback view */}
                                {isGraded && (
                                  <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-xl text-left space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle2 className="w-4 h-4 text-success animate-pulse" />
                                      <span className="text-[10px] tracking-wider font-bold text-success uppercase font-mono">EVALUATION RECEIVED SUCCESSFULLY</span>
                                    </div>
                                    <p className="text-text-secondary font-mono text-[9px] uppercase tracking-widest font-bold">Feedback Note:</p>
                                    <p className="text-text-secondary italic">"{task.mentorFeedback || 'Outstanding effort, well executed!'}"</p>
                                  </div>
                                )}

                                {/* To Do submit trigger */}
                                {isToDo && (
                                  <button
                                    onClick={() => setSubmittingTask(task)}
                                    className="w-full py-2.5 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-primary/10"
                                  >
                                    <Play className="w-3.5 h-3.5" /> Submit Task Deliverable
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* TAB 3: SCHEDULE 1-ON-1 AND SYNCHRONIZE EVENTS */}
                {activeSubTab === 'sessions' && (
                  <motion.div 
                    key="sessions_pane"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-8 text-left w-[90%] max-w-[90%] mx-auto text-xs"
                  >
                    <div className="bg-card border border-border rounded-3xl p-8 space-y-6 shadow-xs relative">
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between border-b border-border/60 pb-4">
                        <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest">
                          MY PLANNED CALL CHRONOLOGY
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowRequestMeetingModal(true)}
                          className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> Request Meeting
                        </button>
                      </div>

                      {/* Body Content */}
                      {sessions.length === 0 ? (
                        <div className="py-16 text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                            <Clock className="w-6 h-6" />
                          </div>
                          <h4 className="text-base font-bold text-primary">No sessions scheduled.</h4>
                          <p className="text-xs text-text-muted text-center max-w-sm mx-auto leading-relaxed">
                            Tap "+ Request Meeting" in the corner to book a new 1-on-1 discussion and sync instantly.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[550px] overflow-y-auto custom-scrollbar pt-2">
                          {sessions.map((sess) => (
                            <div key={sess.id} className="p-5 bg-bg-secondary/40 border border-border rounded-2xl space-y-3 shadow-xs">
                              <div className="flex justify-between items-start gap-2">
                                <div className="space-y-1">
                                  <h5 className="font-bold text-sm text-text-primary">{sess.sessionType}</h5>
                                  <div className="flex items-center gap-4 text-text-muted font-mono text-[10px]">
                                    <span className="flex items-center gap-1 text-primary">
                                      <CalendarDays className="w-3.5 h-3.5" /> {new Date(sess.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                    <span>⏱️ {sess.duration} mins</span>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase ${
                                  sess.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary animate-pulse'
                                }`}>
                                  {sess.status}
                                </span>
                              </div>

                              <div className="p-3 bg-bg-primary rounded-lg border space-y-1">
                                <span className="text-[8px] font-mono text-text-muted uppercase tracking-widest font-black">Shared Doubts & Ideas beforehand:</span>
                                <p className="text-text-secondary font-medium">"{sess.preSessionNotes || 'Collaborative discussion outlines'}"</p>
                              </div>

                              {sess.postSessionNotes && (
                                <div className="p-3 bg-success-light/10 border border-success/15 rounded-lg space-y-1 mt-2">
                                  <span className="text-[8px] font-mono text-success uppercase tracking-widest font-black flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-success" /> Mentor Post-Session feedback recap:
                                  </span>
                                  <p className="text-text-secondary font-medium font-sans">"{sess.postSessionNotes}"</p>
                                </div>
                              )}

                              {/* Student Session Feedback system */}
                              {sess.feedback ? (
                                <div className="p-3 bg-primary/5 border border-primary/25 rounded-2xl space-y-1.5 mt-2">
                                  <span className="text-[8px] font-mono text-primary uppercase tracking-widest font-black flex items-center gap-1.5">
                                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> My Submitted Rating & Review:
                                  </span>
                                  <div className="flex gap-1 items-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star 
                                        key={star} 
                                        className={`w-3.5 h-3.5 ${
                                          star <= sess.feedback.rating 
                                            ? 'fill-yellow-400 text-yellow-400' 
                                            : 'text-text-muted/30'
                                        }`} 
                                      />
                                    ))}
                                    <span className="text-[10px] font-mono text-text-secondary ml-1">({sess.feedback.rating}/5)</span>
                                  </div>
                                  <p className="text-text-secondary font-medium italic">"{sess.feedback.comment || 'No qualitative comments provided.'}"</p>
                                </div>
                              ) : (
                                (sess.status === 'completed' || new Date(sess.dateTime).getTime() < Date.now()) && (
                                  <div className="mt-3">
                                    {activeFeedbackSessionId === sess.id ? (
                                      <div className="p-4 bg-bg-primary border border-border rounded-2xl space-y-3">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-text-muted">How was your session guidance?</span>
                                          <button 
                                            type="button"
                                            onClick={() => setActiveFeedbackSessionId(null)}
                                            className="text-[9px] font-mono text-text-muted hover:text-red-500 uppercase font-black cursor-pointer"
                                          >
                                            [ Cancel ]
                                          </button>
                                        </div>
                                        
                                        {/* Star selection */}
                                        <div className="flex items-center gap-1.5">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                              key={star}
                                              type="button"
                                              onClick={() => setFeedbackRating(star)}
                                              className="cursor-pointer transition-transform active:scale-95 text-left"
                                            >
                                              <Star 
                                                className={`w-5 h-5 transition-all ${
                                                  star <= feedbackRating 
                                                    ? 'fill-yellow-400 text-yellow-400 scale-110' 
                                                    : 'text-text-muted/40 hover:text-yellow-400'
                                                }`} 
                                              />
                                            </button>
                                          ))}
                                          <span className="text-[10px] font-mono text-text-muted ml-2">({feedbackRating} / 5 stars)</span>
                                        </div>

                                        {/* Review comments */}
                                        <textarea
                                          rows={2}
                                          value={feedbackComment}
                                          onChange={(e) => setFeedbackComment(e.target.value)}
                                          placeholder="How helpful was your mentor in addressing doubts and reviewing tasks? What are your key takeaways?"
                                          className="w-full text-xs bg-bg-secondary border border-border rounded-xl p-2.5 focus:border-primary outline-none resize-none font-sans"
                                        />

                                        <button
                                          type="button"
                                          disabled={isSubmittingFeedback || !feedbackComment.trim()}
                                          onClick={() => handleSubmitFeedback(sess.id, feedbackRating, feedbackComment, sess.mentorId)}
                                          className="w-full py-2 bg-primary text-white font-mono text-[9px] tracking-widest font-bold uppercase rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                          {isSubmittingFeedback ? (
                                            <>
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              Submitting Review...
                                            </>
                                          ) : (
                                            "Submit Session Feedback"
                                          )}
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveFeedbackSessionId(sess.id);
                                          setFeedbackRating(5);
                                          setFeedbackComment('');
                                        }}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#534AB7]/10 hover:bg-[#534AB7]/20 text-[#534AB7] border border-[#534AB7]/25 text-[10px] font-mono tracking-wider uppercase font-bold rounded-xl cursor-pointer transition-all shadow-2xs"
                                      >
                                        <Star className="w-3.5 h-3.5 fill-current text-amber-500" /> Share Session Feedback & Rating
                                      </button>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Submission evidence Modal frame */}
            <AnimatePresence>
              {submittingTask && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-8 bg-black/70 backdrop-blur-md">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-bg-primary border border-border p-8 max-w-xl w-full rounded-2xl shadow-2xl text-left space-y-6"
                  >
                    <div className="flex justify-between items-center pb-3 border-b border-border">
                      <div className="space-y-0.5">
                        <span className="text-[9px] px-2 py-0.5 bg-[#534AB7]/10 text-[#534AB7] border border-[#534AB7]/20 rounded font-black uppercase tracking-wider font-mono">Sprint Deliverable Setup</span>
                        <h3 className="text-xl font-bold text-text-primary mt-1.5">Deliver task: {submittingTask.title}</h3>
                      </div>
                      <button 
                        onClick={() => {
                          setSubmittingTask(null);
                          setFileBase64('');
                          setFileName('');
                          setEvidenceUrl('');
                          setEvidenceNote('');
                        }} 
                        className="p-1 text-text-muted hover:text-text-primary transition-all rounded"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <form onSubmit={handleTaskSubmission} className="space-y-5">
                      {/* Submission Type selector */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Select Submission Type</label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['pdf', 'docx', 'ppt', 'link'] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                setSubType(type);
                                setFileBase64('');
                                setFileName('');
                                setEvidenceUrl('');
                              }}
                              className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border transition-all ${
                                subType === type
                                  ? 'bg-gradient-to-r from-[#090979] to-[#00D4FF] text-white border-transparent'
                                  : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Content Form slots */}
                      {subType === 'link' ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Workspace URL or Reference Link (Required) *</label>
                          <input 
                            type="url"
                            value={evidenceUrl}
                            onChange={(e) => setEvidenceUrl(e.target.value)}
                            placeholder="e.g. GitHub Repository, Google Drive URL, Figma file, Loom Demo video..."
                            className="w-full bg-bg-secondary border border-border rounded-xl p-3 focus:border-[#534AB7] outline-none text-xs text-text-primary placeholder:text-text-muted/50"
                            required
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Upload {subType.toUpperCase()} file (Required) *</label>
                          
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-border hover:border-[#534AB7] rounded-xl p-6 text-center cursor-pointer bg-bg-secondary/40 transition-colors space-y-2"
                          >
                            <FileText className="w-8 h-8 mx-auto text-[#534AB7]" />
                            {fileName ? (
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-[#534AB7] truncate">{fileName}</p>
                                <p className="text-[9px] text-success font-semibold uppercase">Locked and loaded!</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-xs font-bold text-text-primary">Drag-and-drop or click to browse</p>
                                <p className="text-[9px] text-text-muted mt-0.5">Supports PDF, DOCX, or PPT up to 800 KB</p>
                              </div>
                            )}
                          </div>

                          <input 
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept={
                              subType === 'pdf' ? '.pdf' :
                              subType === 'docx' ? '.docx,.doc' :
                              '.ppt,.pptx'
                            }
                            className="hidden"
                          />
                        </div>
                      )}

                      {/* Comment Message */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">
                          Notes / Submission Comment (Optional)
                        </label>
                        <textarea
                          rows={3}
                          value={evidenceNote}
                          onChange={(e) => setEvidenceNote(e.target.value)}
                          placeholder="Provide any description or context to guide your mentor through your deliverables..."
                          className="w-full bg-bg-secondary border border-border rounded-xl p-3 focus:border-[#534AB7] outline-none text-xs text-text-primary placeholder:text-text-muted/50"
                        />
                      </div>

                      {/* Controls */}
                      <div className="flex gap-4 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSubmittingTask(null);
                            setFileBase64('');
                            setFileName('');
                            setEvidenceUrl('');
                            setEvidenceNote('');
                          }}
                          className="flex-1 py-3 text-[10px] font-bold tracking-widest uppercase text-text-muted hover:text-text-primary border border-transparent hover:border-border rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingEvidence}
                          className="flex-1 py-3 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl font-bold text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                        >
                          {isSubmittingEvidence ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Submit deliverables
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Cancel Mentorship modal confirmation */}
            <AnimatePresence>
              {showCancelConfirm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-bg-primary/80 backdrop-blur-md">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-bg-primary border border-error/20 p-12 max-w-md w-full rounded-[2.5rem] shadow-2xl"
                  >
                    <div className="text-center space-y-8">
                      <div className="w-16 h-16 bg-error/10 rounded-full border border-error/20 flex items-center justify-center text-error mx-auto animate-pulse">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <div className="space-y-4">
                        <h2 className="text-3xl font-bold text-text-primary">End Mentorship?</h2>
                        <p className="text-[10px] text-text-secondary font-bold uppercase leading-relaxed tracking-widest">
                          YOU ARE ABOUT TO END YOUR MENTORSHIP CONNECTION WITH <span className="text-text-primary">{profile?.role === 'mentor' ? selectedConn.menteeName.toUpperCase() : selectedConn.mentorName.toUpperCase()}</span>. YOU CAN ALWAYS RECONNECT LATER THROUGH THE MENTOR NETWORK.
                        </p>
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowCancelConfirm(false)}
                          className="flex-1 py-3 text-[10px] font-bold text-text-muted hover:text-text-primary transition-all tracking-[0.2em]"
                        >
                          CANCEL
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelMentorship}
                          disabled={cancelling}
                          className="flex-1 py-3 bg-error text-white rounded-xl font-bold text-[10px] tracking-[0.2em] hover:brightness-110 transition-all flex items-center justify-center gap-2"
                        >
                          {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                          CONCLUDE CONNECTION
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-10 group">
            <div className="relative">
              <div className="absolute -inset-8 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-1000" />
              <div className="w-24 h-24 bg-bg-secondary rounded-[2rem] border border-border flex items-center justify-center text-text-muted/20 group-hover:text-primary group-hover:scale-110 transition-all duration-700 relative z-10 shadow-sm">
                <MessageSquare className="w-10 h-10" />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-bold text-text-primary tracking-tight">Mentorship Workspace</h3>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] max-w-xs mx-auto">SELECT A CONVERSATION FROM THE SIDEBAR TO ACTIVATE CHAT, ROADMAP TASKS, AND 1-ON-1 SCHEDULING.</p>
            </div>
          </div>
        )}
      </div>

      {showInstructionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-primary border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-base text-text-primary tracking-tight">Mentee Workspace Guide</h4>
            </div>
            
            <p className="text-xs text-text-secondary leading-relaxed">
              Select an assigned task, click <strong>"Submit Task Deliverable"</strong>, attach your document (PDF, Word, or presentation) or provide the project URL, and click submit. Your mentor will review and grade your draft out of 100!
            </p>

            <div className="pt-2">
              <button
                type="button"
                id="btn-ok-workspace-instructions"
                onClick={() => {
                  setShowInstructionModal(false);
                  setHasSeenInstruction(true);
                }}
                className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequestMeetingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-primary border border-border rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative text-left">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Plus className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-base text-text-primary">Request 1-on-1 Meeting</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestMeetingModal(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-bg-secondary transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSession} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Meeting Type *</label>
                <select 
                  value={schedType}
                  onChange={(e: any) => setSchedType(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 focus:border-primary outline-none text-xs text-text-primary"
                >
                  <option value="1-on-1 call">1-on-1 call</option>
                  <option value="Code review">Code review</option>
                  <option value="CV review">CV review</option>
                  <option value="Mock interview">Mock interview</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Select Date *</label>
                  <input 
                    type="date" 
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 focus:border-primary outline-none text-xs text-text-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Select Time *</label>
                  <input 
                    type="time" 
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 focus:border-primary outline-none text-xs text-text-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Meeting Duration</label>
                <select 
                  value={schedDuration}
                  onChange={(e: any) => setSchedDuration(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 focus:border-primary outline-none text-xs text-text-primary"
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">💡 Project Ideas, Doubts & Agenda *</label>
                <textarea
                  rows={3}
                  value={schedDoubts}
                  onChange={(e) => setSchedDoubts(e.target.value)}
                  placeholder="Share what project ideas or queries you want to discuss beforehand so your mentor is informed..."
                  className="w-full bg-bg-secondary border border-border rounded-xl p-3 focus:border-primary outline-none text-xs text-text-primary"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestMeetingModal(false)}
                  className="w-1/3 py-3 border border-border hover:bg-bg-secondary text-text-primary rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScheduling}
                  className="w-2/3 bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary/20"
                >
                  {isScheduling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Confirm Meeting Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXAM TAKING MODAL */}
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

  // Helper template for task reviews history
  function taskHistoryPrompt(task: any, taskReview: any) {
    if (task.status === 'Done') {
      return (
        <div className="space-y-2 mt-4 p-4 bg-success-light/10 border border-success/15 rounded-xl text-left">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success animate-pulse" />
            <span className="text-[10px] tracking-wider font-bold text-success uppercase">AWARDS RECEIVED: Verified Comp (+20 XP)</span>
          </div>
          {taskReview && (
            <div className="space-y-1.5 pt-1 text-[11px] leading-relaxed">
              <p className="text-text-secondary font-bold font-mono text-[9px] uppercase tracking-widest text-[9px]">Mentor Feedback Audit Note:</p>
              <p className="text-text-secondary font-sans italic">"{taskReview.feedback || 'Aesthetic output.'}"</p>
            </div>
          )}
        </div>
      );
    }

    if (task.status === 'Under Review') {
      return (
        <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-center gap-2 text-amber-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-bold text-[10px] tracking-wider uppercase">WAITING FOR MENTOR VERIFICATION</span>
        </div>
      );
    }

    // Task is active - show Submit Evidence button
    return (
      <div className="flex gap-2.5 pt-2">
        <button
          onClick={() => setSubmittingTask(task)}
          className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-[10px] font-bold tracking-widest uppercase rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" /> Submit Complete Evidence
        </button>
      </div>
    );
  }
}
