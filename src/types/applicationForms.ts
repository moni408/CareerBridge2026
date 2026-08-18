export type FieldType = 
  | 'short_answer'
  | 'paragraph'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'number'
  | 'date'
  | 'email'
  | 'phone'
  | 'file_upload'
  | 'section_break';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  helperText?: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For multiple_choice, checkboxes, dropdown
  acceptedFileTypes?: string[]; // For file_upload
  maxFileSizeMb?: number;
}

export interface FormSettings {
  deadline: string; // ISO or YYYY-MM-DD
  acceptResponses: boolean;
  allowedCvTypes: string[]; // e.g. ['pdf', 'docx']
  maxCvSizeBytes: number; // e.g. 5242880 for 5MB
  confirmationMessage: string;
  oneResponsePerStudent: boolean;
  shareableSlug?: string;
}

export interface JobForm {
  id: string;
  jobId: string;
  title: string;
  description: string;
  jobRoleChip: string;
  companyName: string;
  location?: string;
  jobType?: string;
  salary?: string;
  fields: FormField[];
  settings: FormSettings;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationAnswer {
  fieldId: string;
  fieldLabel: string;
  fieldType: FieldType;
  value: any; // string | string[] | number | boolean
}

export type ApplicationStatus = 
  | 'New'
  | 'Under Review'
  | 'Shortlisted'
  | 'Interview'
  | 'Offer'
  | 'Rejected';

export interface InternalNote {
  id: string;
  author: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  event: string;
  description?: string;
  timestamp: string;
  type: 'applied' | 'viewed' | 'shortlisted' | 'interview_scheduled' | 'rejected' | 'offer';
}

export interface InterviewDetails {
  id: string;
  date: string;
  time: string;
  mode: 'Online' | 'In-person' | 'Phone';
  linkOrAddress: string;
  interviewerName: string;
  message?: string;
  studentResponse?: 'Accepted' | 'Declined' | 'Reschedule Requested';
  studentResponseNote?: string;
  scheduledAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  formId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  studentAvatar?: string;
  studentSkills?: string[];
  appliedAt: string;
  matchPercentage: number;
  cvUrl?: string;
  cvFileName?: string;
  cvFileSize?: number;
  answers: ApplicationAnswer[];
  status: ApplicationStatus;
  notes: InternalNote[];
  timeline: TimelineEvent[];
  interviewDetails?: InterviewDetails;
  withdrawn?: boolean;
}
