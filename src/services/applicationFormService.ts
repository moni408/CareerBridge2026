import { db } from '../lib/firebase';
import { sendCrossRoleEmailNotification } from './emailService';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  JobForm, 
  FormField, 
  JobApplication, 
  ApplicationStatus, 
  InterviewDetails, 
  InternalNote, 
  TimelineEvent 
} from '../types/applicationForms';

const FORMS_COLLECTION = 'job_forms';
const APPLICATIONS_COLLECTION = 'job_applications';

// Default starter questions for new forms
export const DEFAULT_FORM_FIELDS: FormField[] = [
  {
    id: 'field-1',
    type: 'short_answer',
    label: 'Full Legal Name',
    placeholder: 'e.g. Alex Johnson',
    required: true,
  },
  {
    id: 'field-2',
    type: 'email',
    label: 'Email Address',
    placeholder: 'alex.johnson@university.edu',
    required: true,
  },
  {
    id: 'field-3',
    type: 'phone',
    label: 'Phone Number',
    placeholder: '+1 (555) 019-2834',
    required: true,
  },
  {
    id: 'field-4',
    type: 'file_upload',
    label: 'Upload CV / Resume',
    helperText: 'PDF or Word document up to 10MB',
    required: true,
    acceptedFileTypes: ['.pdf', '.docx'],
    maxFileSizeMb: 10,
  },
  {
    id: 'field-5',
    type: 'paragraph',
    label: 'Why are you excited about this role and company?',
    placeholder: 'Describe your relevant experience and what drives your passion...',
    required: true,
  },
  {
    id: 'field-6',
    type: 'multiple_choice',
    label: 'What is your current work authorization status?',
    required: true,
    options: [
      'Citizen / Permanent Resident',
      'Requires Visa Sponsorship now or in future',
      'Student Visa (OPT / CPT)',
      'Other'
    ],
  },
  {
    id: 'field-7',
    type: 'dropdown',
    label: 'Years of hands-on technical experience',
    required: false,
    options: ['0 - 1 years (Graduate)', '1 - 3 years', '3 - 5 years', '5+ years'],
  },
  {
    id: 'field-8',
    type: 'checkboxes',
    label: 'Core Technologies & Frameworks you excel in',
    required: false,
    options: ['React / TypeScript', 'Node.js / Express', 'Python / Django', 'PostgreSQL / SQL', 'Docker / Kubernetes', 'Cloud (AWS / GCP / Azure)'],
  }
];

// Sample default form template generator
export function createDefaultJobForm(jobId: string, jobInfo?: { title?: string; company?: string; location?: string; type?: string; salary?: string }): JobForm {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  return {
    id: `form-${jobId}`,
    jobId: jobId,
    title: jobInfo?.title ? `${jobInfo.title} Application Form` : 'Standard Job Application Form',
    description: 'Please complete all required fields and submit your latest CV. Our engineering recruiting team reviews applications on a rolling basis.',
    jobRoleChip: jobInfo?.title || 'Software Engineering Role',
    companyName: jobInfo?.company || 'Enterprise Corporate Partner',
    location: jobInfo?.location || 'Remote / Hybrid',
    jobType: jobInfo?.type || 'Full-time',
    salary: jobInfo?.salary || '$80k - $110k',
    fields: [...DEFAULT_FORM_FIELDS],
    settings: {
      deadline: futureDate.toISOString().split('T')[0],
      acceptResponses: true,
      allowedCvTypes: ['PDF', 'DOCX'],
      maxCvSizeBytes: 10 * 1024 * 1024,
      confirmationMessage: 'Thank you for submitting your application! Our technical recruiting team will review your profile and contact you regarding next steps.',
      oneResponsePerStudent: true,
      shareableSlug: `apply-${jobId.slice(0, 8)}`,
    },
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Sample Seed Applications for demo / immediate rich testing
export function getSampleApplicationsForJob(jobId: string): JobApplication[] {
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  return [
    {
      id: `app-sample-1-${jobId}`,
      jobId,
      jobTitle: 'Senior Full Stack Engineer',
      companyName: 'Acme Technologies',
      formId: `form-${jobId}`,
      studentId: 'student-101',
      studentName: 'Ayesha Siddika',
      studentEmail: 'ayesha.siddika@university.edu',
      studentPhone: '+1 (555) 234-5678',
      studentAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      studentSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'GraphQL'],
      appliedAt: daysAgo(2),
      matchPercentage: 94,
      cvUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      cvFileName: 'Ayesha_Siddika_Resume.pdf',
      cvFileSize: 1420000,
      status: 'Shortlisted',
      answers: [
        { fieldId: 'field-1', fieldLabel: 'Full Legal Name', fieldType: 'short_answer', value: 'Ayesha Siddika' },
        { fieldId: 'field-2', fieldLabel: 'Email Address', fieldType: 'email', value: 'ayesha.siddika@university.edu' },
        { fieldId: 'field-3', fieldLabel: 'Phone Number', fieldType: 'phone', value: '+1 (555) 234-5678' },
        { fieldId: 'field-5', fieldLabel: 'Why are you excited about this role and company?', fieldType: 'paragraph', value: 'I have led 3 full-stack React & Node projects during my final year and contributed to open source microservices. Your architecture matches my technical stack perfectly.' },
        { fieldId: 'field-6', fieldLabel: 'What is your current work authorization status?', fieldType: 'multiple_choice', value: 'Citizen / Permanent Resident' },
        { fieldId: 'field-7', fieldLabel: 'Years of hands-on technical experience', fieldType: 'dropdown', value: '1 - 3 years' },
        { fieldId: 'field-8', fieldLabel: 'Core Technologies & Frameworks you excel in', fieldType: 'checkboxes', value: ['React / TypeScript', 'Node.js / Express', 'PostgreSQL / SQL', 'Docker / Kubernetes'] }
      ],
      notes: [
        {
          id: 'note-1',
          author: 'Senior Technical Recruiter',
          text: 'Outstanding match score (94%). Strong TypeScript & PostgreSQL experience shown in GitHub portfolio.',
          createdAt: daysAgo(1),
        }
      ],
      timeline: [
        { id: 'tl-1', event: 'Application Submitted', description: 'Student completed form with 100% required fields', timestamp: daysAgo(2), type: 'applied' },
        { id: 'tl-2', event: 'Profile Reviewed by Recruiter', description: 'Recruiter opened CV & answers', timestamp: daysAgo(1), type: 'viewed' },
        { id: 'tl-3', event: 'Moved to Shortlisted', description: 'Marked for technical screening', timestamp: daysAgo(1), type: 'shortlisted' }
      ]
    },
    {
      id: `app-sample-2-${jobId}`,
      jobId,
      jobTitle: 'Senior Full Stack Engineer',
      companyName: 'Acme Technologies',
      formId: `form-${jobId}`,
      studentId: 'student-102',
      studentName: 'Michael Chen',
      studentEmail: 'michael.chen@tech.edu',
      studentPhone: '+1 (555) 876-5432',
      studentAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      studentSkills: ['Python', 'Django', 'React', 'AWS', 'Docker'],
      appliedAt: daysAgo(4),
      matchPercentage: 88,
      cvUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      cvFileName: 'Michael_Chen_CV_2026.pdf',
      cvFileSize: 980000,
      status: 'Interview',
      interviewDetails: {
        id: 'int-102',
        date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '14:00',
        mode: 'Online',
        linkOrAddress: 'https://meet.google.com/abc-defg-hij',
        interviewerName: 'David Miller (Engineering Manager)',
        message: 'Looking forward to discussing your backend cloud pipeline projects!',
        studentResponse: 'Accepted',
        scheduledAt: daysAgo(1),
      },
      answers: [
        { fieldId: 'field-1', fieldLabel: 'Full Legal Name', fieldType: 'short_answer', value: 'Michael Chen' },
        { fieldId: 'field-2', fieldLabel: 'Email Address', fieldType: 'email', value: 'michael.chen@tech.edu' },
        { fieldId: 'field-3', fieldLabel: 'Phone Number', fieldType: 'phone', value: '+1 (555) 876-5432' },
        { fieldId: 'field-5', fieldLabel: 'Why are you excited about this role and company?', fieldType: 'paragraph', value: 'I built automated cloud deployment pipelines and REST APIs during my internship at AWS. Excited to bring cloud scalability to your team.' },
        { fieldId: 'field-6', fieldLabel: 'What is your current work authorization status?', fieldType: 'multiple_choice', value: 'Student Visa (OPT / CPT)' },
        { fieldId: 'field-7', fieldLabel: 'Years of hands-on technical experience', fieldType: 'dropdown', value: '0 - 1 years (Graduate)' },
        { fieldId: 'field-8', fieldLabel: 'Core Technologies & Frameworks you excel in', fieldType: 'checkboxes', value: ['Python / Django', 'Docker / Kubernetes', 'Cloud (AWS / GCP / Azure)'] }
      ],
      notes: [
        {
          id: 'note-2',
          author: 'Lead Architect',
          text: 'Good background in Docker and cloud deployments. Technical interview scheduled.',
          createdAt: daysAgo(1),
        }
      ],
      timeline: [
        { id: 'tl-1', event: 'Application Submitted', description: 'Application received', timestamp: daysAgo(4), type: 'applied' },
        { id: 'tl-2', event: 'Shortlisted', description: 'Recruiter shortlisted profile', timestamp: daysAgo(2), type: 'shortlisted' },
        { id: 'tl-3', event: 'Technical Interview Scheduled', description: 'Online Google Meet session set for 14:00', timestamp: daysAgo(1), type: 'interview_scheduled' }
      ]
    },
    {
      id: `app-sample-3-${jobId}`,
      jobId,
      jobTitle: 'Senior Full Stack Engineer',
      companyName: 'Acme Technologies',
      formId: `form-${jobId}`,
      studentId: 'student-103',
      studentName: 'Sophia Patel',
      studentEmail: 'sophia.patel@eng.university.edu',
      studentPhone: '+1 (555) 345-6789',
      studentAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      studentSkills: ['Java', 'Spring Boot', 'SQL', 'Microservices'],
      appliedAt: daysAgo(1),
      matchPercentage: 79,
      cvUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      cvFileName: 'Sophia_Patel_Software_Engine.pdf',
      cvFileSize: 1150000,
      status: 'New',
      answers: [
        { fieldId: 'field-1', fieldLabel: 'Full Legal Name', fieldType: 'short_answer', value: 'Sophia Patel' },
        { fieldId: 'field-2', fieldLabel: 'Email Address', fieldType: 'email', value: 'sophia.patel@eng.university.edu' },
        { fieldId: 'field-3', fieldLabel: 'Phone Number', fieldType: 'phone', value: '+1 (555) 345-6789' },
        { fieldId: 'field-5', fieldLabel: 'Why are you excited about this role and company?', fieldType: 'paragraph', value: 'Eager to apply enterprise Java backend principles and database query optimization.' },
        { fieldId: 'field-6', fieldLabel: 'What is your current work authorization status?', fieldType: 'multiple_choice', value: 'Citizen / Permanent Resident' },
        { fieldId: 'field-7', fieldLabel: 'Years of hands-on technical experience', fieldType: 'dropdown', value: '0 - 1 years (Graduate)' }
      ],
      notes: [],
      timeline: [
        { id: 'tl-1', event: 'Application Submitted', description: 'Application completed', timestamp: daysAgo(1), type: 'applied' }
      ]
    }
  ];
}

// Service Methods for Forms
export async function getJobForm(jobId: string, jobInfo?: any): Promise<JobForm> {
  try {
    const docRef = doc(db, FORMS_COLLECTION, jobId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as JobForm;
    }
  } catch (err) {
    console.warn("Firestore fetch error for form, using local memory:", err);
  }

  // Check localStorage fallback
  const localSaved = localStorage.getItem(`form_${jobId}`);
  if (localSaved) {
    try {
      return JSON.parse(localSaved);
    } catch (e) {
      // ignore
    }
  }

  return createDefaultJobForm(jobId, jobInfo);
}

export async function saveJobForm(form: JobForm): Promise<void> {
  const updatedForm = { ...form, updatedAt: new Date().toISOString() };
  localStorage.setItem(`form_${form.jobId}`, JSON.stringify(updatedForm));

  try {
    const docRef = doc(db, FORMS_COLLECTION, form.jobId);
    await setDoc(docRef, updatedForm);
  } catch (err) {
    console.warn("Could not persist form to Firestore, saved locally:", err);
  }
}

// Service Methods for Applications
export async function getApplicationsForJob(jobId: string): Promise<JobApplication[]> {
  let list: JobApplication[] = [];

  try {
    const q = query(collection(db, APPLICATIONS_COLLECTION), where('jobId', '==', jobId));
    const snap = await getDocs(q);
    list = snap.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication));
  } catch (err) {
    console.warn("Firestore fetch applications error:", err);
  }

  // Check localStorage for any newly submitted applications in this session
  const localAppsRaw = localStorage.getItem(`apps_${jobId}`);
  if (localAppsRaw) {
    try {
      const localApps: JobApplication[] = JSON.parse(localAppsRaw);
      const existingIds = new Set(list.map(a => a.id));
      for (const app of localApps) {
        if (!existingIds.has(app.id)) {
          list.push(app);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (list.length === 0) {
    list = getSampleApplicationsForJob(jobId);
  }

  return list;
}

export async function submitApplication(appData: Omit<JobApplication, 'id' | 'appliedAt' | 'notes' | 'timeline'>): Promise<JobApplication> {
  const newApp: JobApplication = {
    ...appData,
    id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    appliedAt: new Date().toISOString(),
    status: 'New',
    notes: [],
    timeline: [
      {
        id: `tl-${Date.now()}`,
        event: 'Application Submitted',
        description: 'Completed application form and uploaded CV',
        timestamp: new Date().toISOString(),
        type: 'applied'
      }
    ]
  };

  // Save to localStorage
  const existingLocalRaw = localStorage.getItem(`apps_${appData.jobId}`) || '[]';
  try {
    const existing: JobApplication[] = JSON.parse(existingLocalRaw);
    existing.unshift(newApp);
    localStorage.setItem(`apps_${appData.jobId}`, JSON.stringify(existing));
  } catch (e) {
    // ignore
  }

  // Also store in general student apps
  const studentKey = `student_apps_${appData.studentId}`;
  const studentLocalRaw = localStorage.getItem(studentKey) || '[]';
  try {
    const studentApps: JobApplication[] = JSON.parse(studentLocalRaw);
    studentApps.unshift(newApp);
    localStorage.setItem(studentKey, JSON.stringify(studentApps));
  } catch (e) {
    // ignore
  }

  // Save to Firestore
  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, newApp.id);
    await setDoc(docRef, newApp);
  } catch (err) {
    console.warn("Could not save application to Firestore, stored locally:", err);
  }

  // Dispatch EmailJS Notification to Industry Recruiter / Employer
  try {
    sendCrossRoleEmailNotification({
      senderId: newApp.studentId,
      senderName: newApp.studentName,
      senderRole: 'student',
      senderEmail: newApp.studentEmail,
      recipientId: newApp.companyName.toLowerCase().replace(/\s+/g, '-'),
      recipientName: newApp.companyName,
      recipientRole: 'industry',
      subject: `New Application Received: ${newApp.studentName} applied for ${newApp.jobTitle}`,
      category: 'application',
      message: `Candidate ${newApp.studentName} (${newApp.studentEmail}) submitted an application for "${newApp.jobTitle}" at ${newApp.companyName} with a ${newApp.matchPercentage}% qualification match score.`,
      actionUrl: window.location.origin
    }).catch(e => console.warn('Email notify error:', e));
  } catch (e) {
    console.warn('Email dispatch failed:', e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('job-application-submitted'));
  }

  return newApp;
}

export async function updateApplicationStatus(
  appId: string, 
  jobId: string, 
  newStatus: ApplicationStatus, 
  timelineDescription?: string
): Promise<void> {
  const updatePayload = {
    status: newStatus,
    updatedAt: new Date().toISOString()
  };

  // Update in localStorage
  let studentIdToNotify = '';
  let studentNameToNotify = 'Student Candidate';
  let jobTitleToNotify = 'Job Position';
  let companyNameToNotify = 'Industry Partner';

  const existingLocalRaw = localStorage.getItem(`apps_${jobId}`) || '[]';
  try {
    const existing: JobApplication[] = JSON.parse(existingLocalRaw);
    const target = existing.find(a => a.id === appId);
    if (target) {
      target.status = newStatus;
      studentIdToNotify = target.studentId;
      studentNameToNotify = target.studentName;
      jobTitleToNotify = target.jobTitle;
      companyNameToNotify = target.companyName;

      target.timeline.unshift({
        id: `tl-${Date.now()}`,
        event: `Status changed to ${newStatus}`,
        description: timelineDescription || `Recruiter updated candidate status to ${newStatus}`,
        timestamp: new Date().toISOString(),
        type: newStatus === 'Shortlisted' ? 'shortlisted' : newStatus === 'Rejected' ? 'rejected' : newStatus === 'Interview' ? 'interview_scheduled' : 'viewed'
      });
      localStorage.setItem(`apps_${jobId}`, JSON.stringify(existing));

      // Also update student personal cache
      if (studentIdToNotify) {
        const studentKey = `student_apps_${studentIdToNotify}`;
        const sRaw = localStorage.getItem(studentKey);
        if (sRaw) {
          try {
            const sApps: JobApplication[] = JSON.parse(sRaw);
            const sTarget = sApps.find(a => a.id === appId);
            if (sTarget) {
              sTarget.status = newStatus;
              localStorage.setItem(studentKey, JSON.stringify(sApps));
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    // ignore
  }

  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, appId);
    await updateDoc(docRef, updatePayload);
  } catch (err) {
    console.warn("Could not update application in Firestore:", err);
  }

  // Dispatch local events for real-time reactivity
  if (typeof window !== 'undefined') {
    if (newStatus === 'Interview') {
      window.dispatchEvent(new CustomEvent('interview-scheduled', { detail: { appId, jobId, studentId: studentIdToNotify, status: newStatus } }));
    }
    window.dispatchEvent(new CustomEvent('job-application-updated', { detail: { appId, jobId, studentId: studentIdToNotify, status: newStatus } }));
    window.dispatchEvent(new Event('storage'));
  }

  // Dispatch EmailJS Notification to Student regarding status update
  if (studentIdToNotify) {
    sendCrossRoleEmailNotification({
      senderName: companyNameToNotify,
      senderRole: 'industry',
      recipientId: studentIdToNotify,
      recipientName: studentNameToNotify,
      recipientRole: 'student',
      subject: `Application Status Update: ${newStatus} for ${jobTitleToNotify}`,
      category: 'application',
      message: `${companyNameToNotify} updated your application status for "${jobTitleToNotify}" to: ${newStatus.toUpperCase()}.${timelineDescription ? ` Note: ${timelineDescription}` : ''}`,
      actionUrl: window.location.origin
    }).catch(e => console.warn('Email notify status update error:', e));
  }
}

export async function addApplicationNote(appId: string, jobId: string, text: string, author: string): Promise<InternalNote> {
  const newNote: InternalNote = {
    id: `note-${Date.now()}`,
    author,
    text,
    createdAt: new Date().toISOString()
  };

  // Update in localStorage
  const existingLocalRaw = localStorage.getItem(`apps_${jobId}`) || '[]';
  try {
    const existing: JobApplication[] = JSON.parse(existingLocalRaw);
    const target = existing.find(a => a.id === appId);
    if (target) {
      if (!target.notes) target.notes = [];
      target.notes.unshift(newNote);
      localStorage.setItem(`apps_${jobId}`, JSON.stringify(existing));
    }
  } catch (e) {
    // ignore
  }

  return newNote;
}

export async function scheduleInterview(appId: string, jobId: string, details: Omit<InterviewDetails, 'id' | 'scheduledAt'>): Promise<InterviewDetails> {
  const fullDetails: InterviewDetails = {
    ...details,
    id: `int-${Date.now()}`,
    scheduledAt: new Date().toISOString()
  };

  // Update localStorage
  let studentId = '';
  const existingLocalRaw = localStorage.getItem(`apps_${jobId}`) || '[]';
  try {
    const existing: JobApplication[] = JSON.parse(existingLocalRaw);
    const target = existing.find(a => a.id === appId);
    if (target) {
      target.status = 'Interview';
      target.interviewDetails = fullDetails;
      studentId = target.studentId;
      target.timeline.unshift({
        id: `tl-${Date.now()}`,
        event: 'Interview Scheduled',
        description: `${details.mode} interview set for ${details.date} at ${details.time}`,
        timestamp: new Date().toISOString(),
        type: 'interview_scheduled'
      });
      localStorage.setItem(`apps_${jobId}`, JSON.stringify(existing));

      if (studentId) {
        const studentKey = `student_apps_${studentId}`;
        const sRaw = localStorage.getItem(studentKey);
        if (sRaw) {
          try {
            const sApps: JobApplication[] = JSON.parse(sRaw);
            const sTarget = sApps.find(a => a.id === appId);
            if (sTarget) {
              sTarget.status = 'Interview';
              sTarget.interviewDetails = fullDetails;
              localStorage.setItem(studentKey, JSON.stringify(sApps));
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    // ignore
  }

  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, appId);
    await updateDoc(docRef, {
      status: 'Interview',
      interviewDetails: fullDetails
    });
  } catch (err) {
    console.warn("Could not persist interview to Firestore:", err);
  }

  // Dispatch events for real-time reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('interview-scheduled', { detail: { appId, jobId, studentId, details: fullDetails } }));
    window.dispatchEvent(new CustomEvent('job-application-updated', { detail: { appId, jobId, studentId, status: 'Interview' } }));
    window.dispatchEvent(new Event('storage'));
  }

  return fullDetails;
}

export async function getStudentApplications(studentId: string, studentEmail?: string): Promise<JobApplication[]> {
  let list: JobApplication[] = [];

  try {
    const q = query(collection(db, APPLICATIONS_COLLECTION), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    list = snap.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication));
  } catch (err) {
    console.warn("Firestore fetch student applications error:", err);
  }

  // Merge with localStorage student applications
  const studentKey = `student_apps_${studentId}`;
  const studentLocalRaw = localStorage.getItem(studentKey) || '[]';
  try {
    const localApps: JobApplication[] = JSON.parse(studentLocalRaw);
    const existingIds = new Set(list.map(a => a.id));
    for (const app of localApps) {
      if (!existingIds.has(app.id)) {
        list.push(app);
      }
    }
  } catch (e) {
    // ignore
  }

  // Also check all job application lists in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('apps_') && !key.startsWith('apps_sample')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const jobApps: JobApplication[] = JSON.parse(raw);
          const existingIds = new Set(list.map(a => a.id));
          for (const app of jobApps) {
            if (!existingIds.has(app.id) && (app.studentId === studentId || studentId === 'student-guest')) {
              list.push(app);
            }
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return list;
}

export async function hasStudentAppliedAnyJob(studentId: string): Promise<boolean> {
  const apps = await getStudentApplications(studentId);
  return apps.filter(a => !a.withdrawn).length > 0;
}

export async function respondToInterviewInvite(appId: string, jobId: string, response: 'Accepted' | 'Declined' | 'Reschedule Requested', note?: string): Promise<void> {
  const existingLocalRaw = localStorage.getItem(`apps_${jobId}`) || '[]';
  try {
    const existing: JobApplication[] = JSON.parse(existingLocalRaw);
    const target = existing.find(a => a.id === appId);
    if (target && target.interviewDetails) {
      target.interviewDetails.studentResponse = response;
      target.interviewDetails.studentResponseNote = note;
      target.timeline.unshift({
        id: `tl-${Date.now()}`,
        event: `Interview ${response}`,
        description: note || `Candidate ${response.toLowerCase()} the interview invite.`,
        timestamp: new Date().toISOString(),
        type: response === 'Accepted' ? 'interview_scheduled' : 'viewed'
      });
      localStorage.setItem(`apps_${jobId}`, JSON.stringify(existing));
    }
  } catch (e) {
    // ignore
  }

  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, appId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.interviewDetails) {
        await updateDoc(docRef, {
          'interviewDetails.studentResponse': response,
          'interviewDetails.studentResponseNote': note || ''
        });
      }
    }
  } catch (err) {
    console.warn("Could not respond to interview invite in Firestore:", err);
  }
}

export async function withdrawApplication(appId: string, jobId: string, studentId: string): Promise<void> {
  // Update in localStorage
  const existingLocalRaw = localStorage.getItem(`apps_${jobId}`) || '[]';
  try {
    const existing: JobApplication[] = JSON.parse(existingLocalRaw);
    const updated = existing.filter(a => a.id !== appId);
    localStorage.setItem(`apps_${jobId}`, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }

  const studentKey = `student_apps_${studentId}`;
  const studentLocalRaw = localStorage.getItem(studentKey) || '[]';
  try {
    const studentApps: JobApplication[] = JSON.parse(studentLocalRaw);
    const updated = studentApps.filter(a => a.id !== appId);
    localStorage.setItem(studentKey, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }

  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, appId);
    await updateDoc(docRef, {
      status: 'Rejected',
      withdrawn: true,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Could not withdraw application in Firestore:", err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('job-application-submitted'));
  }
}

/**
 * Real-time subscription to student's applications & interviews across Firestore and local storage.
 */
export function subscribeStudentApplications(
  studentId: string,
  studentEmail: string | undefined,
  callback: (apps: JobApplication[]) => void
): () => void {
  let isSubscribed = true;
  let currentFirestoreApps: JobApplication[] = [];

  const compileAndNotify = () => {
    if (!isSubscribed) return;

    const appMap = new Map<string, JobApplication>();
    currentFirestoreApps.forEach(a => appMap.set(a.id, a));

    // Check student-specific local storage
    const studentKey = `student_apps_${studentId}`;
    try {
      const studentLocalRaw = localStorage.getItem(studentKey);
      if (studentLocalRaw) {
        const localApps: JobApplication[] = JSON.parse(studentLocalRaw);
        localApps.forEach(app => {
          if (!appMap.has(app.id)) {
            appMap.set(app.id, app);
          } else {
            const existing = appMap.get(app.id)!;
            if (app.status === 'Interview' || app.interviewDetails) {
              existing.status = app.status;
              existing.interviewDetails = app.interviewDetails;
            }
          }
        });
      }
    } catch (e) {}

    // Check all apps_ keys in localStorage (for immediate cross-role demo in same browser)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('apps_') && !key.startsWith('apps_sample')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const jobApps: JobApplication[] = JSON.parse(raw);
            jobApps.forEach(app => {
              const isMatch = (app.studentId === studentId) ||
                Boolean(studentEmail && app.studentEmail && app.studentEmail.toLowerCase() === studentEmail.toLowerCase());
              if (isMatch) {
                if (!appMap.has(app.id)) {
                  appMap.set(app.id, app);
                } else {
                  const existing = appMap.get(app.id)!;
                  if (app.status === 'Interview' || app.interviewDetails) {
                    existing.status = app.status;
                    existing.interviewDetails = app.interviewDetails;
                  }
                }
              }
            });
          }
        }
      }
    } catch (e) {}

    const allApps = Array.from(appMap.values()).filter(a => !a.withdrawn);
    callback(allApps);
  };

  // Initial notify
  compileAndNotify();

  // Firestore onSnapshot
  let unsubFirestore = () => {};
  try {
    const q = query(collection(db, APPLICATIONS_COLLECTION), where('studentId', '==', studentId));
    unsubFirestore = onSnapshot(q, (snapshot) => {
      currentFirestoreApps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication));
      compileAndNotify();
    }, (err) => {
      console.warn("Firestore listener for student applications error:", err);
      compileAndNotify();
    });
  } catch (err) {
    console.warn("Could not create Firestore listener:", err);
  }

  const handleLocalChange = () => {
    compileAndNotify();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('interview-scheduled', handleLocalChange);
    window.addEventListener('job-application-updated', handleLocalChange);
    window.addEventListener('job-application-submitted', handleLocalChange);
    window.addEventListener('storage', handleLocalChange);
  }

  return () => {
    isSubscribed = false;
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener('interview-scheduled', handleLocalChange);
      window.removeEventListener('job-application-updated', handleLocalChange);
      window.removeEventListener('job-application-submitted', handleLocalChange);
      window.removeEventListener('storage', handleLocalChange);
    }
  };
}
