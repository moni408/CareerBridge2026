import React, { useState, useEffect } from 'react';
import { 
  Briefcase, ArrowRight, ChevronLeft, ChevronDown, Sparkles, CheckCircle2, Star, Zap, Mail, Lock, User, AlertCircle, Loader2, Target, Users, BookOpen, Award, TrendingUp, FileUp, FileText, Globe, Linkedin, Github, Twitter, MessageSquare, Clock, ShieldCheck, Cpu, Menu, X, Building2, GraduationCap, Info, Plus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmail, signUpWithEmail, updateAuthProfile, resetPassword, db, logout, withTimeout } from '../lib/firebase';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { sendStudentVerificationEmail, sendCorporateVerificationEmail, getEmailJsConfig, saveEmailJsConfig, resetEmailJsConfigToDefault } from '../services/emailService';
import { ThemeToggle } from './ThemeToggle';
import HeroSection from './HeroSection';

/* ─── Mock Data ─── */
const MENTORS = [
  { 
    name: "Arif Khan", 
    company: "Google", 
    role: "Sr. Software Engineer", 
    specialty: "System Design", 
    rating: 4.9, 
    experience: "8+ Years",
    responseTime: "< 24h",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    logo: "https://www.gstatic.com/images/branding/product/2x/googleg_96dp.png"
  },
  { 
    name: "Tahmina Aktar", 
    company: "bKash", 
    role: "Product Lead", 
    specialty: "Product Strategy", 
    rating: 5.0, 
    experience: "6+ Years",
    responseTime: "< 12h",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/BKash_logo.svg/320px-BKash_logo.svg.png" 
  },
  { 
    name: "Sajid Hasan", 
    company: "BRAC", 
    role: "Data Scientist", 
    specialty: "Machine Learning", 
    rating: 4.8, 
    experience: "5+ Years",
    responseTime: "< 48h",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/BRAC_logo.svg"
  },
  { 
    name: "Maliha Chowdhury", 
    company: "Unilever", 
    role: "Marketing Manager", 
    specialty: "Brand Dev", 
    rating: 4.9, 
    experience: "7+ Years",
    responseTime: "< 24h",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
    logo: "https://upload.wikimedia.org/wikipedia/en/b/b1/Unilever_logo.svg" 
  },
];

const SPECIALTY_CATEGORIES = [
  {
    category: "Technical & Engineering",
    items: ["System Design", "Backend Engineering", "Frontend Engineering", "Machine Learning", "Mobile Development", "Cloud Infrastructure", "DevOps", "Cyber Security", "Data Engineering"]
  },
  {
    category: "Product & Project Management",
    items: ["Product Strategy", "Product Management", "Agile & Scrum", "Roadmapping", "Feature Prioritization", "User Research", "Project Management", "Business Analysis"]
  },
  {
    category: "Design & Creative",
    items: ["UX/UI Design", "User Experience", "Visual Design", "Design Systems", "Prototyping", "Interaction Design", "Brand Identity"]
  },
  {
    category: "Talent, HR & Operations",
    items: ["Recruiting & Sourcing", "Interview Preparation", "Resume Review", "HR & People Operations", "Leadership Coaching", "Career Growth", "Public Speaking", "Negotiation"]
  },
  {
    category: "Business, Marketing & Growth",
    items: ["Business Development", "Startup Growth", "Digital Marketing", "Content Strategy", "Sales & Partnerships", "Financial Modeling", "Operations"]
  }
];

function SectionHeader({ subtitle, title, description, align = 'left' }: { subtitle: string, title: string, description?: string, align?: 'left' | 'center' }) {
  return (
    <div className={`space-y-3 mb-12 ${align === 'center' ? 'text-center max-w-3xl mx-auto' : ''}`}>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex items-center gap-2.5 ${align === 'center' ? 'justify-center' : ''}`}
      >
        <div className="h-[2px] w-6 bg-[#00d4ff] rounded-full" />
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#00d4ff]">{subtitle}</p>
      </motion.div>
      <motion.h2 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[#090979] tracking-[-0.03em] leading-[1.1]"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="text-[#090979]/65 text-[17px] font-normal leading-[1.65] max-w-[65ch] mx-auto"
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}

interface AuthProps {
  onSignIn: () => void;
}

type AuthMode = 'landing' | 'signin' | 'signup' | 'forgot-password';

const formatAuthError = (err: any): string => {
  if (!err) return 'An unexpected error occurred.';
  const code = err.code || '';
  const message = err.message || (typeof err === 'string' ? err : '') || err.toString?.() || '';
  const lowerMsg = message.toLowerCase();

  if (code === 'auth/email-already-in-use' || lowerMsg.includes('email-already-in-use')) {
    return 'This email address is already registered. If you already have an account, please click "LOGIN" at the top right to sign in or use a different email.';
  }
  if (code === 'auth/invalid-email' || lowerMsg.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/weak-password' || lowerMsg.includes('weak-password') || lowerMsg.includes('at least 6 characters')) {
    return 'Password must be at least 6 characters.';
  }
  if (
    code === 'auth/user-not-found' || 
    lowerMsg.includes('user-not-found') || 
    code === 'auth/wrong-password' || 
    lowerMsg.includes('wrong-password') || 
    code === 'auth/invalid-credential' || 
    lowerMsg.includes('invalid-credential')
  ) {
    return 'Incorrect email or password. Please verify your credentials.';
  }
  if (code === 'auth/too-many-requests' || lowerMsg.includes('too-many-requests')) {
    return 'This account has been temporarily locked due to too many failed login attempts. Please try again later or reset your password.';
  }
  return message.replace('Firebase: ', '').replace('Error (', '').replace(').', '');
};

const logAuthError = (err: any) => {
  if (!err) return;
  const code = err.code || '';
  const message = err.message || (typeof err === 'string' ? err : '') || err.toString?.() || '';
  const lowerMsg = message.toLowerCase();

  const isUserAuthWarning = 
    code.includes('auth/') || 
    lowerMsg.includes('auth/') || 
    lowerMsg.includes('user-not-found') || 
    lowerMsg.includes('wrong-password') || 
    lowerMsg.includes('invalid-credential') || 
    lowerMsg.includes('email-already-in-use') ||
    lowerMsg.includes('popup-closed-by-user') ||
    lowerMsg.includes('invalid-email') ||
    lowerMsg.includes('weak-password') ||
    lowerMsg.includes('too-many-requests');

  if (isUserAuthWarning) {
    console.warn("User auth notice (non-fatal):", message || code || err);
  } else {
    console.error(err);
  }
};

export function Auth({ onSignIn }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPendingSuccess, setShowPendingSuccess] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Dedicated landing and onboarding view state pointers
  const [activeSection, setActiveSection] = useState<'main' | 'mentor' | 'industry' | 'university'>('main');
  const [mentorStep, setMentorStep] = useState<number>(0); // 0 = Landing information, 1 = Unified Direct Form
  const [industryStep, setIndustryStep] = useState<number>(0); // 0 = landing information, 1 = registration form
  const [universityStep, setUniversityStep] = useState<number>(0); // 0 = landing information, 1 = registration form

  // Multi-step custom form storage
  const [mentorPhoto, setMentorPhoto] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200');
  const [mentorFirstName, setMentorFirstName] = useState('');
  const [mentorLastName, setMentorLastName] = useState('');
  const [mentorEmail, setMentorEmail] = useState('');
  const [mentorPassword, setMentorPassword] = useState('');
  const [mentorJobTitle, setMentorJobTitle] = useState('');
  const [mentorCompany, setMentorCompany] = useState('');
  const [mentorLocation, setMentorLocation] = useState('Bangladesh');
  const [mentorBio, setMentorBio] = useState('');
  const [mentorSpecialties, setMentorSpecialties] = useState<string[]>(['System Design']);
  const [mentorLinkedin, setMentorLinkedin] = useState('');
  const [mentorExperience, setMentorExperience] = useState('5-8 Years');
  const [mentorRate, setMentorRate] = useState('50');
  const [mentorMotivation, setMentorMotivation] = useState('');
  const [mentorCvUrl, setMentorCvUrl] = useState('');
  const [mentorSignupStep, setMentorSignupStep] = useState<1 | 2 | 3>(1);
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState('');

  // Employment Verification States
  const [verificationMethod, setVerificationMethod] = useState<'corporate_email' | 'employment_document'>('corporate_email');
  const [corporateWorkEmail, setCorporateWorkEmail] = useState('');
  const [employmentDocumentUrl, setEmploymentDocumentUrl] = useState('');
  const [employmentDocFileName, setEmploymentDocFileName] = useState('');

  // Mentor Corporate Email Auto-Verification States
  const [corporateVerificationCode, setCorporateVerificationCode] = useState<string>('');
  const [corporateCodeSent, setCorporateCodeSent] = useState<boolean>(false);
  const [userEnteredCorporateCode, setUserEnteredCorporateCode] = useState<string>('');
  const [corporateVerificationSending, setCorporateVerificationSending] = useState<boolean>(false);
  const [corporateVerificationVerifying, setCorporateVerificationVerifying] = useState<boolean>(false);
  const [corporateVerificationError, setCorporateVerificationError] = useState<string | null>(null);
  const [corporateVerificationSuccess, setCorporateVerificationSuccess] = useState<string | null>(null);
  const [isCorporateEmailVerified, setIsCorporateEmailVerified] = useState<boolean>(false);

  const handleSendCorporateCode = async () => {
    setError(null);
    setCorporateVerificationError(null);
    setCorporateVerificationSuccess(null);

    const emailTrimmed = corporateWorkEmail.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      setCorporateVerificationError("Please enter a valid corporate / work email address.");
      return;
    }

    const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'mail.com', 'icloud.com', 'protonmail.com', 'zoho.com'];
    const emailDomain = emailTrimmed.split('@')[1] || '';
    if (genericDomains.includes(emailDomain)) {
      setCorporateVerificationError("Please enter your official company email domain (e.g. @google.com, not public email services like @gmail.com).");
      return;
    }

    setCorporateVerificationSending(true);
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setCorporateVerificationCode(generatedCode);
    setCorporateCodeSent(true);
    setUserEnteredCorporateCode('');

    try {
      const fullName = `${mentorFirstName} ${mentorLastName}`.trim() || 'Industry Mentor';
      const result = await sendCorporateVerificationEmail({
        mentorName: fullName,
        companyName: mentorCompany.trim() || 'Your Organization',
        corporateEmail: emailTrimmed,
        verificationCode: generatedCode
      });

      if (result.success) {
        setCorporateVerificationSuccess(`Verification code dispatched to ${emailTrimmed}! Check your corporate inbox or spam folder.`);
      } else {
        setCorporateVerificationError(`EmailJS delivery notice: ${result.message}. You can still enter code or retry.`);
      }
    } catch (err: any) {
      setCorporateVerificationError("Could not dispatch verification email. Please check your network and click resend.");
    } finally {
      setCorporateVerificationSending(false);
    }
  };

  const handleVerifyCorporateCode = () => {
    setCorporateVerificationError(null);
    setCorporateVerificationVerifying(true);

    setTimeout(() => {
      const entered = userEnteredCorporateCode.trim();
      if (!entered) {
        setCorporateVerificationError("Please enter the 6-digit verification code sent to your corporate email.");
        setCorporateVerificationVerifying(false);
        return;
      }
      if (entered !== corporateVerificationCode) {
        setCorporateVerificationError("Invalid 6-digit code. Please verify the code in your corporate inbox or spam.");
        setCorporateVerificationVerifying(false);
        return;
      }

      setIsCorporateEmailVerified(true);
      setCorporateVerificationSuccess("Corporate email successfully verified! You have unlocked instant auto-approval with direct login.");
      setCorporateVerificationError(null);
      setCorporateVerificationVerifying(false);
      setError(null);
    }, 400);
  };

  const handleResetCorporateEmail = () => {
    setIsCorporateEmailVerified(false);
    setCorporateCodeSent(false);
    setCorporateVerificationCode('');
    setUserEnteredCorporateCode('');
    setCorporateVerificationSuccess(null);
    setCorporateVerificationError(null);
  };

  const handleEmploymentDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allowed formats: pdf, docx, png, jpeg/jpg
    const allowedExtensions = ['.pdf', '.docx', '.png', '.jpeg', '.jpg'];
    const fileName = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isAllowed) {
      setError("Please upload a valid file format (PDF, DOCX, PNG, or JPEG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit. Please choose a smaller file.");
      return;
    }

    setError(null);
    setEmploymentDocFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setEmploymentDocumentUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const validateStep1 = () => {
    setError(null);
    if (!mentorFirstName.trim() || !mentorLastName.trim()) {
      setError("First name and Last name are required.");
      return false;
    }
    if (!mentorEmail.trim() || !mentorPassword.trim()) {
      setError("Email address and Password are required.");
      return false;
    }
    if (mentorPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    if (!mentorEmail.includes('@')) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!mentorLinkedin.trim()) {
      setError("LinkedIn profile URL is required.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    setError(null);
    if (!mentorJobTitle.trim()) {
      setError("Job Title is required.");
      return false;
    }
    if (!mentorCompany.trim()) {
      setError("Company / Association is required.");
      return false;
    }
    if (verificationMethod === 'corporate_email') {
      if (!corporateWorkEmail.trim() || !corporateWorkEmail.includes('@')) {
        setError("Please enter a valid corporate / work email address.");
        return false;
      }
      const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'mail.com', 'icloud.com', 'protonmail.com', 'zoho.com'];
      const emailDomain = corporateWorkEmail.split('@')[1]?.toLowerCase() || '';
      if (genericDomains.includes(emailDomain)) {
        setError("Please use your official company/corporate email domain, or select 'Prove with employment document'.");
        return false;
      }
      if (!isCorporateEmailVerified) {
        if (!corporateCodeSent) {
          handleSendCorporateCode();
          setError("A 6-digit verification code has been dispatched to your corporate email. Please enter the code and click 'Verify Code' before proceeding to Step 3.");
        } else {
          setError("Please verify your corporate email with the 6-digit verification code before proceeding to Step 3.");
        }
        return false;
      }
    } else if (verificationMethod === 'employment_document') {
      if (!employmentDocumentUrl.trim()) {
        setError("Please upload your proof of employment document (PDF, DOCX, PNG, or JPEG).");
        return false;
      }
    }
    if (!mentorCvUrl.trim()) {
      setError("CV / Document URL is required.");
      return false;
    }
    if (!mentorBio.trim() || mentorBio.trim().length < 20) {
      setError("Please provide a short biography (at least 20 characters).");
      return false;
    }
    return true;
  };

  // Industry multi-step form storage & steps
  const [indCompanyName, setIndCompanyName] = useState('');
  const [indWebsite, setIndWebsite] = useState('');
  const [indRepName, setIndRepName] = useState('');
  const [indEmail, setIndEmail] = useState('');
  const [indPassword, setIndPassword] = useState('');
  const [indSize, setIndSize] = useState('10-50 employees');
  const [indTechStack, setIndTechStack] = useState('React, TypeScript, Node.js');
  const [indSector, setIndSector] = useState('');
  const [indDescription, setIndDescription] = useState('');
  const [indDocs, setIndDocs] = useState('');
  const [indSignupStep, setIndSignupStep] = useState<1 | 2 | 3>(1);

  const validateIndStep1 = (): boolean => {
    setError(null);
    if (!indCompanyName.trim()) {
      setError("Please enter your Company / Organisation name.");
      return false;
    }
    if (!indWebsite.trim()) {
      setError("Please enter your Company Website URL.");
      return false;
    }
    if (!indRepName.trim()) {
      setError("Please enter the Primary HR / Contact Name.");
      return false;
    }
    if (!indEmail.trim() || !indEmail.includes('@')) {
      setError("Please enter a valid work email address.");
      return false;
    }
    if (!indPassword.trim() || indPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    return true;
  };

  const validateIndStep2 = (): boolean => {
    setError(null);
    if (!indTechStack.trim()) {
      setError("Please specify primary tech stacks sourced.");
      return false;
    }
    if (!indSector.trim()) {
      setError("Please enter your Industry Sector.");
      return false;
    }
    if (!indDocs.trim()) {
      setError("Please provide a Verification Documents / License URL.");
      return false;
    }
    return true;
  };

  const validateIndStep3 = (): boolean => {
    setError(null);
    if (!indDescription.trim() || indDescription.trim().length < 10) {
      setError("Please provide a short company description (at least 10 characters).");
      return false;
    }
    return true;
  };

  const handleIndStep1Next = (e: React.MouseEvent) => {
    e.preventDefault();
    if (validateIndStep1()) {
      setIndSignupStep(2);
    }
  };

  const handleIndStep2Next = (e: React.MouseEvent) => {
    e.preventDefault();
    if (validateIndStep2()) {
      setIndSignupStep(3);
    }
  };

  // University multi-step form storage & steps
  const [uniName, setUniName] = useState('');
  const [uniWebsite, setUniWebsite] = useState('');
  const [uniRepName, setUniRepName] = useState('');
  const [uniEmail, setUniEmail] = useState('');
  const [uniPassword, setUniPassword] = useState('');
  const [uniBatchSize, setUniBatchSize] = useState('100-500 students');
  const [uniDepartment, setUniDepartment] = useState('Computer Science & Engineering');
  const [uniEmailDomain, setUniEmailDomain] = useState('');
  const [uniCountry, setUniCountry] = useState('Bangladesh');
  const [uniAccreditation, setUniAccreditation] = useState('');
  const [uniDocs, setUniDocs] = useState('');
  const [uniSignupStep, setUniSignupStep] = useState<1 | 2 | 3>(1);

  const validateUniStep1 = (): boolean => {
    setError(null);
    if (!uniName.trim()) {
      setError("Please enter your University / Institution name.");
      return false;
    }
    if (!uniWebsite.trim()) {
      setError("Please enter your Institutional Website URL.");
      return false;
    }
    if (!uniRepName.trim()) {
      setError("Please enter the Faculty Coordinator / Contact Name.");
      return false;
    }
    if (!uniEmail.trim() || !uniEmail.includes('@')) {
      setError("Please enter a valid institutional email address.");
      return false;
    }
    if (!uniPassword.trim() || uniPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    return true;
  };

  const validateUniStep2 = (): boolean => {
    setError(null);
    if (!uniDepartment.trim()) {
      setError("Please enter your Primary Department / Major.");
      return false;
    }
    if (!uniCountry.trim()) {
      setError("Please enter Campus Country / Location.");
      return false;
    }
    return true;
  };

  const validateUniStep3 = (): boolean => {
    setError(null);
    if (!uniDocs.trim()) {
      setError("Please provide a Verification / Accreditation Document URL.");
      return false;
    }
    return true;
  };

  const handleUniStep1Next = (e: React.MouseEvent) => {
    e.preventDefault();
    if (validateUniStep1()) {
      setUniSignupStep(2);
    }
  };

  const handleUniStep2Next = (e: React.MouseEvent) => {
    e.preventDefault();
    if (validateUniStep2()) {
      setUniSignupStep(3);
    }
  };

  // Student specific signup fields
  const [studentUniversity, setStudentUniversity] = useState('');
  const [studentDepartment, setStudentDepartment] = useState('');
  const [studentBatch, setStudentBatch] = useState('');
  const [studentSkills, setStudentSkills] = useState('');
  const [studentBio, setStudentBio] = useState('');
  const [studentCvUrl, setStudentCvUrl] = useState('');
  const [studentPortfolio, setStudentPortfolio] = useState('');
  const [studentSignupStep, setStudentSignupStep] = useState<1 | 2 | 3>(1);
  const [studentTargetRole, setStudentTargetRole] = useState('');

  // Student 2-Step Security Verification States
  const [studentVerificationPending, setStudentVerificationPending] = useState<boolean>(false);
  const [studentVerificationCode, setStudentVerificationCode] = useState<string>('');
  const [userEnteredCode, setUserEnteredCode] = useState<string>('');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccessNotice, setVerificationSuccessNotice] = useState<string | null>(null);
  const [verificationSending, setVerificationSending] = useState<boolean>(false);
  const [showEmailConfigModal, setShowEmailConfigModal] = useState<boolean>(false);
  const [emailServiceIdInput, setEmailServiceIdInput] = useState<string>(() => getEmailJsConfig().serviceId);
  const [emailTemplateIdInput, setEmailTemplateIdInput] = useState<string>(() => getEmailJsConfig().templateId);
  const [emailPublicKeyInput, setEmailPublicKeyInput] = useState<string>(() => getEmailJsConfig().publicKey);

  const validateStudentStep1 = (): boolean => {
    setError(null);
    if (!name.trim()) {
      setError("Please enter your full name.");
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!password.trim() || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    return true;
  };

  const validateStudentStep2 = (): boolean => {
    setError(null);
    if (!studentUniversity.trim()) {
      setError("Please enter your University / School name.");
      return false;
    }
    if (!studentDepartment.trim()) {
      setError("Please enter your Department / Major.");
      return false;
    }
    if (!studentBatch.trim()) {
      setError("Please enter your Graduation Batch (e.g. 2025).");
      return false;
    }
    return true;
  };

  const validateStudentStep3 = (): boolean => {
    setError(null);
    if (!studentTargetRole.trim()) {
      setError("Please specify your desired Career Path / Target Role.");
      return false;
    }
    if (!studentBio.trim() || studentBio.trim().length < 10) {
      setError("Please provide a short biography (at least 10 characters).");
      return false;
    }
    return true;
  };

  const handleStudentStep1Next = (e: React.MouseEvent) => {
    e.preventDefault();
    if (validateStudentStep1()) {
      setStudentSignupStep(2);
    }
  };

  const handleStudentStep2Next = (e: React.MouseEvent) => {
    e.preventDefault();
    if (validateStudentStep2()) {
      setStudentSignupStep(3);
    }
  };

  // Initiate 2-Step Security Verification via EmailJS for Student Registration
  const handleInitiateStudentVerification = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateStudentStep1() || !validateStudentStep2() || !validateStudentStep3()) {
      return;
    }

    setVerificationSending(true);
    setError(null);
    setVerificationError(null);
    setUserEnteredCode('');

    // Generate 6-digit random security code
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setStudentVerificationCode(generatedCode);

    const emailLower = email.trim().toLowerCase();
    const directLink = `${window.location.origin}?verify_code=${generatedCode}&verify_email=${encodeURIComponent(emailLower)}`;

    try {
      const result = await sendStudentVerificationEmail({
        studentName: name.trim(),
        studentEmail: emailLower,
        verificationCode: generatedCode,
        verificationLink: directLink
      });

      if (!result.success) {
        setVerificationError(`Failed to send verification email: ${result.message}. Please check your email or click resend.`);
      }
      setStudentVerificationPending(true);
    } catch (err: any) {
      console.warn("Verification email notice:", err);
      setVerificationError("Could not dispatch verification email. Please check your internet connection or click Resend.");
      setStudentVerificationPending(true);
    } finally {
      setVerificationSending(false);
    }
  };

  // Resend verification code to student email
  const handleResendStudentVerification = async () => {
    setVerificationSending(true);
    setVerificationError(null);
    setUserEnteredCode('');

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setStudentVerificationCode(newCode);

    const emailLower = email.trim().toLowerCase();
    const directLink = `${window.location.origin}?verify_code=${newCode}&verify_email=${encodeURIComponent(emailLower)}`;

    try {
      const result = await sendStudentVerificationEmail({
        studentName: name.trim(),
        studentEmail: emailLower,
        verificationCode: newCode,
        verificationLink: directLink
      });
      if (!result.success) {
        setVerificationError(`Failed to resend email: ${result.message}`);
      } else {
        setVerificationSuccessNotice(`New 6-digit code has been dispatched to ${emailLower}! Please check your inbox or spam.`);
        setTimeout(() => setVerificationSuccessNotice(null), 7000);
      }
    } catch (err: any) {
      setVerificationError("Failed to resend verification email. Please try again.");
    } finally {
      setVerificationSending(false);
    }
  };

  // Complete student registration once 2-Step Security is confirmed with code matching the email
  const handleCompleteStudentRegistration = async () => {
    const codeToVerify = userEnteredCode.trim();
    if (!codeToVerify) {
      setVerificationError("Please enter the 6-digit security code received in your email.");
      return;
    }

    if (codeToVerify.length !== 6) {
      setVerificationError("The security code must be exactly 6 digits.");
      return;
    }

    if (codeToVerify !== studentVerificationCode) {
      setVerificationError("Invalid 6-digit verification code. Please check the code sent to your email inbox or spam folder.");
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationError(null);

    try {
      const emailLower = email.trim().toLowerCase();
      const emailParts = emailLower.split('@');
      const emailDomain = emailParts[1] || '';

      sessionStorage.setItem('is_signing_up_special_role', 'true');

      const userCredential = await signUpWithEmail(email, password);
      const firebaseUser = userCredential.user;
      await updateAuthProfile(name);

      const isPreApprovedAdmin = emailLower === 'ayeshasiddikamoni408@gmail.com';
      const parsedSkills = studentSkills ? studentSkills.split(',').map(s => s.trim()).filter(Boolean) : (studentTargetRole ? [studentTargetRole.trim()] : []);

      const newProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: name,
        role: 'graduate',
        university: studentUniversity.trim(),
        department: studentDepartment.trim(),
        batch: studentBatch.trim(),
        targetRole: studentTargetRole.trim(),
        skills: parsedSkills,
        bio: studentBio || '',
        cvUrl: studentCvUrl || '',
        portfolioLink: studentPortfolio || '',
        education: studentUniversity.trim() ? [
          {
            school: studentUniversity.trim(),
            degree: `B.Sc. in ${studentDepartment.trim() || 'Software/Core Engineering'}`,
            year: studentBatch.trim() || '2025'
          }
        ] : [],
        experience: [],
        goals: studentTargetRole.trim() ? [studentTargetRole.trim()] : [],
        readinessScore: 0,
        profileAnalyzed: false,
        verified: true,
        verificationStatus: 'verified',
        createdAt: new Date().toISOString(),
        emailDomain: emailDomain,
        security2StepVerified: true
      };

      const profileRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(profileRef, newProfile);

      await setDoc(doc(db, 'students', firebaseUser.uid), {
        uid: firebaseUser.uid,
        name: name,
        email: firebaseUser.email,
        university: studentUniversity.trim(),
        department: studentDepartment.trim(),
        batch: studentBatch.trim(),
        targetRole: studentTargetRole.trim(),
        skills: parsedSkills,
        bio: studentBio || '',
        portfolioLink: studentPortfolio || '',
        verified: true,
        createdAt: new Date().toISOString(),
        security2StepVerified: true
      });

      if (!isPreApprovedAdmin) {
        await addDoc(collection(db, 'admin_notifications'), {
          userId: firebaseUser.uid,
          userName: name,
          userRole: 'graduate',
          userEmail: firebaseUser.email,
          message: `"${name}" auto-registered as Student (2-Step Security Verified via EmailJS)`,
          status: 'verified',
          createdAt: new Date().toISOString(),
          profile: newProfile
        });
      }

      sessionStorage.removeItem('is_signing_up_special_role');
      setStudentVerificationPending(false);
      setSuccess('2-Step Security Verified! Student registration complete.');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      sessionStorage.removeItem('is_signing_up_special_role');
      logAuthError(err);
      setVerificationError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeSection, mentorStep, industryStep, universityStep]);

  const handleRegisterMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!mentorEmail || !mentorPassword) {
        throw new Error('Please fill out all required authentication fields.');
      }
      if (mentorPassword.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      sessionStorage.setItem('is_signing_up_special_role', 'true');
      const userCredential = await signUpWithEmail(mentorEmail, mentorPassword);
      const firebaseUser = userCredential.user;
      
      const fullName = `${mentorFirstName} ${mentorLastName}`.trim();
      await updateAuthProfile(fullName);

      // Generate standard details for public profile preview
      const publicDetails = {
        name: fullName,
        role: mentorJobTitle || 'Software Leader',
        company: mentorCompany || 'Independent Specialist',
        specialties: mentorSpecialties,
        bio: mentorBio,
        location: mentorLocation,
        linkedin: mentorLinkedin,
        hourlyRate: mentorRate,
        verificationMethod,
        workEmail: verificationMethod === 'corporate_email' ? corporateWorkEmail : '',
        corporateEmail: verificationMethod === 'corporate_email' ? corporateWorkEmail : '',
        employmentDocumentUrl: verificationMethod === 'employment_document' ? employmentDocumentUrl : '',
        employmentDocFileName: verificationMethod === 'employment_document' ? employmentDocFileName : '',
        photo: mentorPhoto || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200"
      };

      // Create main user profile
      const userRef = doc(db, 'users', firebaseUser.uid);
      const isPreApprovedAdmin = mentorEmail === 'ayeshasiddikamoni408@gmail.com';
      const isCorporateVerified = verificationMethod === 'corporate_email' && isCorporateEmailVerified;
      const isAutoVerified = isPreApprovedAdmin || isCorporateVerified;

      const newProfile = {
        uid: firebaseUser.uid,
        email: mentorEmail,
        displayName: fullName,
        role: isPreApprovedAdmin ? 'admin' : 'mentor',
        skills: mentorSpecialties,
        education: [],
        experience: [{
          title: mentorJobTitle || 'Industry Advisor',
          company: mentorCompany || 'Independent',
          year: mentorExperience || '5-8 Years'
        }],
        goals: [],
        readinessScore: 0,
        profileAnalyzed: false,
        bio: mentorBio || '',
        location: mentorLocation,
        linkedin: mentorLinkedin,
        hourlyRate: mentorRate,
        verificationMethod,
        workEmail: verificationMethod === 'corporate_email' ? corporateWorkEmail : '',
        corporateEmail: verificationMethod === 'corporate_email' ? corporateWorkEmail : '',
        corporateEmailVerified: isCorporateVerified,
        employmentDocumentUrl: verificationMethod === 'employment_document' ? employmentDocumentUrl : '',
        employmentDocFileName: verificationMethod === 'employment_document' ? employmentDocFileName : '',
        photo: mentorPhoto || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
        cvUrl: mentorCvUrl || '',
        verified: isAutoVerified,
        verificationStatus: isAutoVerified ? 'verified' : 'pending',
        security2StepVerified: isAutoVerified,
        createdAt: new Date().toISOString(),
      };
      await withTimeout(setDoc(userRef, newProfile), 6000, "Registration timed out (network issue or server unavailable). Please try again.");

      // Create mentor specific profile
      await withTimeout(setDoc(doc(db, 'mentors', firebaseUser.uid), {
        uid: firebaseUser.uid,
        name: fullName,
        email: mentorEmail,
        role: mentorJobTitle || 'Industry Advisor',
        company: mentorCompany || 'Independent',
        specialty: mentorSpecialties[0] || 'General Mentorship',
        expertise: mentorSpecialties,
        bio: mentorBio || '',
        rating: 5.0,
        available: true,
        experience: mentorExperience || '5-8 Years',
        responseTime: '< 12h',
        verified: isAutoVerified,
        verificationStatus: isAutoVerified ? 'verified' : 'pending',
        corporateEmailVerified: isCorporateVerified,
        image: mentorPhoto || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
        logo: "https://www.gstatic.com/images/branding/product/2x/googleg_96dp.png",
        location: mentorLocation,
        linkedin: mentorLinkedin,
        hourlyRate: mentorRate,
        verificationMethod,
        workEmail: verificationMethod === 'corporate_email' ? corporateWorkEmail : '',
        corporateEmail: verificationMethod === 'corporate_email' ? corporateWorkEmail : '',
        employmentDocumentUrl: verificationMethod === 'employment_document' ? employmentDocumentUrl : '',
        employmentDocFileName: verificationMethod === 'employment_document' ? employmentDocFileName : '',
        cvUrl: mentorCvUrl || '',
      }), 6000, "Profile setup timed out. Please try again.");

      if (!isPreApprovedAdmin) {
        // Send notification to Admin database
        await withTimeout(addDoc(collection(db, 'admin_notifications'), {
          userId: firebaseUser.uid,
          userName: fullName,
          userRole: 'mentor',
          userEmail: mentorEmail,
          message: isAutoVerified
            ? `"${fullName}" auto-registered as Mentor (Corporate Email Verified: ${corporateWorkEmail} at ${mentorCompany})`
            : `"${fullName}" submitted employment documents to join as Mentor (Pending Admin Review)`,
          status: isAutoVerified ? 'verified' : 'pending',
          createdAt: new Date().toISOString(),
          profile: {
            ...newProfile,
            ...publicDetails
          }
        }), 6000, "Administrative submission timed out. Please try again.");
      }

      if (isAutoVerified) {
        // Auto-verified: Keep session active and launch mentor workspace directly!
        sessionStorage.removeItem('is_signing_up_special_role');
        setSuccess(isPreApprovedAdmin 
          ? 'Pre-approved administrator, launching workspace...' 
          : 'Corporate email verified! Mentor registration completed with direct access. Launching workspace...'
        );
        setTimeout(() => {
          window.location.reload();
        }, 1400);
      } else {
        // Submitted documents: Log out immediately so the session does not auto-gate before profile is approved
        await logout();
        setShowPendingSuccess(true);
      }
    } catch (err: any) {
      sessionStorage.removeItem('is_signing_up_special_role');
      logAuthError(err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterIndustry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateIndStep1() || !validateIndStep2() || !validateIndStep3()) {
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!indEmail || !indPassword) {
        throw new Error('Please fill out all required authentication fields.');
      }
      if (indPassword.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      sessionStorage.setItem('is_signing_up_special_role', 'true');
      const userCredential = await signUpWithEmail(indEmail, indPassword);
      const firebaseUser = userCredential.user;
      await updateAuthProfile(indCompanyName);

      const userRef = doc(db, 'users', firebaseUser.uid);
      const isPreApprovedAdmin = indEmail === 'ayeshasiddikamoni408@gmail.com';
      const newProfile = {
        uid: firebaseUser.uid,
        email: indEmail,
        displayName: indRepName,
        company: indCompanyName,
        website: indWebsite,
        role: isPreApprovedAdmin ? 'admin' : 'industry',
        size: indSize,
        techStack: indTechStack,
        sector: indSector || '',
        description: indDescription || '',
        docs: indDocs || '',
        verified: isPreApprovedAdmin,
        verificationStatus: isPreApprovedAdmin ? 'verified' : 'pending',
        createdAt: new Date().toISOString(),
      };
      await withTimeout(setDoc(userRef, newProfile), 6000, "Registration timed out (network issue or server unavailable). Please try again.");

      // Create industry specific profile
      await withTimeout(setDoc(doc(db, 'industry_partners', firebaseUser.uid), {
        uid: firebaseUser.uid,
        company: indCompanyName,
        repName: indRepName,
        email: indEmail,
        website: indWebsite,
        size: indSize,
        techStack: indTechStack,
        sector: indSector || '',
        description: indDescription || '',
        docs: indDocs || '',
        verified: isPreApprovedAdmin,
        createdAt: new Date().toISOString(),
      }), 6000, "Industry partner profile setup timed out. Please try again.");

      if (!isPreApprovedAdmin) {
        await withTimeout(addDoc(collection(db, 'admin_notifications'), {
          userId: firebaseUser.uid,
          userName: indRepName,
          userRole: 'industry',
          userEmail: indEmail,
          message: `"${indRepName}" of "${indCompanyName}" wants to join as an Industry Partner`,
          status: 'pending',
          createdAt: new Date().toISOString(),
          profile: newProfile
        }), 6000, "Administrative submission timed out. Please try again.");
      }

      if (!isPreApprovedAdmin) {
        // Log out immediately so the session does not auto-gate before profile is approved
        await logout();
        setShowPendingSuccess(true);
      } else {
        sessionStorage.removeItem('is_signing_up_special_role');
        setSuccess('Pre-approved administrator, launching workspace...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      sessionStorage.removeItem('is_signing_up_special_role');
      logAuthError(err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUniStep1() || !validateUniStep2() || !validateUniStep3()) {
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!uniEmail || !uniPassword) {
        throw new Error('Please fill out all required authentication fields.');
      }
      if (uniPassword.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      sessionStorage.setItem('is_signing_up_special_role', 'true');
      const userCredential = await signUpWithEmail(uniEmail, uniPassword);
      const firebaseUser = userCredential.user;
      await updateAuthProfile(uniName);

      const userRef = doc(db, 'users', firebaseUser.uid);
      const isPreApprovedAdmin = uniEmail === 'ayeshasiddikamoni408@gmail.com';
      const domainValue = uniEmailDomain.trim().toLowerCase() || uniEmail.split('@')[1].toLowerCase();
      
      const newProfile = {
        uid: firebaseUser.uid,
        email: uniEmail,
        displayName: uniRepName,
        university: uniName,
        website: uniWebsite,
        emailDomain: domainValue,
        role: isPreApprovedAdmin ? 'admin' : 'university',
        batchSize: uniBatchSize,
        department: uniDepartment,
        country: uniCountry || 'Bangladesh',
        accreditation: uniAccreditation || '',
        docs: uniDocs || '',
        verified: isPreApprovedAdmin,
        verificationStatus: isPreApprovedAdmin ? 'verified' : 'pending',
        createdAt: new Date().toISOString(),
      };
      await withTimeout(setDoc(userRef, newProfile), 6000, "Registration timed out (network issue or server unavailable). Please try again.");

      // Create university specific profile
      await withTimeout(setDoc(doc(db, 'universities', firebaseUser.uid), {
        uid: firebaseUser.uid,
        university: uniName,
        repName: uniRepName,
        email: uniEmail,
        website: uniWebsite,
        emailDomain: domainValue,
        batchSize: uniBatchSize,
        department: uniDepartment,
        country: uniCountry || 'Bangladesh',
        accreditation: uniAccreditation || '',
        docs: uniDocs || '',
        verified: isPreApprovedAdmin,
        createdAt: new Date().toISOString(),
      }), 6000, "University profile setup timed out. Please try again.");

      if (!isPreApprovedAdmin) {
        await withTimeout(addDoc(collection(db, 'admin_notifications'), {
          userId: firebaseUser.uid,
          userName: uniRepName,
          userRole: 'university',
          userEmail: uniEmail,
          message: `"${uniRepName}" of "${uniName}" wants to register as a University Platform`,
          status: 'pending',
          createdAt: new Date().toISOString(),
          profile: newProfile
        }), 6000, "Administrative submission timed out. Please try again.");
      }

      if (!isPreApprovedAdmin) {
        // Log out immediately so the session does not auto-gate before profile is approved
        await logout();
        setShowPendingSuccess(true);
      } else {
        sessionStorage.removeItem('is_signing_up_special_role');
        setSuccess('Pre-approved administrator, launching workspace...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      sessionStorage.removeItem('is_signing_up_special_role');
      logAuthError(err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSignIn();
    } catch (err: any) {
      logAuthError(err);
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signup') {
        setLoading(false);
        await handleInitiateStudentVerification(e);
        return;
      } else if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else if (mode === 'forgot-password') {
        await resetPassword(email);
        setSuccess('Password reset email sent. Please check your inbox.');
      }
    } catch (err: any) {
      sessionStorage.removeItem('is_signing_up_special_role');
      logAuthError(err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary font-sans text-text-primary selection:bg-primary/20 relative noise overflow-x-hidden">
      <AnimatePresence mode="wait">
        {showPendingSuccess ? (
          <motion.div
            key="success-verified-pending"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen flex items-center justify-center p-6 relative"
          >
            {/* Background elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#EC4899]/5 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute inset-0 bg-grid-overlay opacity-5 pointer-events-none" />

            <div className="w-full max-w-xl bg-card border border-border/80 rounded-[2.5rem] p-10 md:p-12 text-center space-y-8 relative z-10 shadow-2xl">
              <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/20 rounded-3xl mx-auto flex items-center justify-center">
                <Clock className="w-10 h-10 text-yellow-500 animate-pulse" />
              </div>

              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight leading-tight">
                  CareerBridge is verifying your profile.<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-600">Please give us some time.</span>
                </h1>
                
                <p className="text-text-muted text-[15px] leading-relaxed max-w-md mx-auto font-light">
                  Thank you for registering! Your application credentials and employment proof have been submitted and are currently in pause until administration verifies your documents.
                </p>
                
                <p className="text-text-muted-foreground text-xs leading-relaxed max-w-md mx-auto">
                  Once the administration team reviews and approves your submission, your account will be activated and you can directly log in to access your full workspace!
                </p>
              </div>

              <div className="pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={async () => {
                    // Fully reset state variables to guarantee fresh landing
                    sessionStorage.removeItem('is_signing_up_special_role');
                    setShowPendingSuccess(false);
                    setMode('landing');
                    setActiveSection('main');
                    setMentorStep(0);
                    setIndustryStep(0);
                    setUniversityStep(0);
                    // Reset field inputs to prevent spillover
                    setMentorEmail('');
                    setMentorPassword('');
                    setIndEmail('');
                    setIndPassword('');
                    setUniEmail('');
                    setUniPassword('');
                  }}
                  className="w-full py-4.5 bg-primary text-primary-text font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/25 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Back to Landing Page
                </button>
              </div>
            </div>
          </motion.div>
        ) : mode === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col relative z-20 min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-500/20"
          >
            {/* Smooth subtle ambient background mesh */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              <div className="absolute top-[-220px] left-1/2 -translate-x-1/2 w-[1200px] h-[650px] bg-[radial-gradient(ellipse_at_top,_rgba(0,212,255,0.08)_0%,_transparent_70%)] blur-[100px] rounded-full" />
            </div>

            {/* Dynamic Top Brand Accent Bar */}
            <div className={`fixed top-0 left-0 right-0 h-[3px] z-[110] transition-all duration-500 bg-gradient-to-r ${
              activeSection === 'industry'
                ? 'from-pink-500 via-[#090979] to-[#00D4FF]'
                : activeSection === 'university'
                  ? 'from-indigo-600 via-[#090979] to-[#00D4FF]'
                  : 'from-[#090979] via-indigo-600 to-[#00D4FF]'
            }`} />

            {/* Sticky Nav - Full-Bleed Bar */}
            <motion.header 
              className={`fixed top-0 left-0 right-0 w-full z-[100] transition-all duration-200 ${
                isScrolled 
                  ? 'bg-[#f8f2fa]/80 backdrop-blur-md border-b border-[#090979]/8' 
                  : 'bg-transparent'
              }`}
            >
              <div className="section-container flex justify-between items-center h-16 sm:h-20">
                
                {/* Brand Logo */}
                <div 
                  onClick={() => { setActiveSection('main'); setMode('landing'); }} 
                  className="flex items-center gap-3 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-tr from-[#090979] via-indigo-600 to-[#00D4FF] shadow-sm">
                    <Briefcase className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[18px] tracking-[-0.02em] text-[#090979]">CareerBridge</span>
                    {activeSection === 'mentor' && (
                      <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-mono font-bold uppercase tracking-wider border border-blue-200/80">Mentors</span>
                    )}
                    {activeSection === 'industry' && (
                      <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 text-[10px] font-mono font-bold uppercase tracking-wider border border-pink-200/80">Industry</span>
                    )}
                    {activeSection === 'university' && (
                      <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold uppercase tracking-wider border border-indigo-200/80">University</span>
                    )}
                  </div>
                </div>

                {/* Navigation Links */}
                <nav className="hidden lg:flex items-center gap-1">
                  {['Features', 'Process', 'Mentors', 'Industry', 'University'].map(link => {
                    const cleanLink = link.toLowerCase();
                    const isActiveLink = (cleanLink === 'mentors' && activeSection === 'mentor') ||
                                         (cleanLink === 'industry' && activeSection === 'industry') ||
                                         (cleanLink === 'university' && activeSection === 'university');

                    return (
                      <button 
                        key={link} 
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (cleanLink === 'mentors') {
                            setActiveSection('mentor');
                            setMentorStep(0);
                          } else if (cleanLink === 'industry') {
                            setActiveSection('industry');
                            setIndustryStep(0);
                          } else if (cleanLink === 'university') {
                            setActiveSection('university');
                            setUniversityStep(0);
                          } else {
                            setActiveSection('main');
                            setTimeout(() => {
                              const id = cleanLink.replace(/\s+/g, '-');
                              const element = document.getElementById(id);
                              element?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }
                        }}
                        className={`text-[14px] font-medium tracking-[0.01em] transition-all px-3.5 py-1.5 rounded-lg cursor-pointer ${
                          isActiveLink 
                            ? 'bg-[#090979] text-white font-semibold' 
                            : 'text-[#090979]/70 hover:text-[#090979] hover:bg-[#090979]/5'
                        }`}
                      >
                        {link}
                      </button>
                    );
                  })}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                  <div className="hidden md:flex items-center gap-2">
                    <ThemeToggle />
                    <button 
                      onClick={() => setMode('signin')} 
                      className="text-[14px] font-semibold tracking-wide text-[#090979] hover:text-[#00d4ff] px-3 py-1.5 transition-colors cursor-pointer"
                    >
                      LOGIN
                    </button>
                    <button 
                      onClick={() => { setActiveSection('main'); setMode('signup'); }} 
                      className="py-2 px-4 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 active:scale-95 transition-all cursor-pointer shadow-sm"
                    >
                      JOIN THE BRIDGE
                    </button>
                  </div>
                  
                  {/* Mobile Menu Toggle */}
                  <div className="flex md:hidden items-center gap-2">
                    <ThemeToggle />
                    <button 
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="p-2 rounded-xl bg-white border border-[#090979]/8 text-[#090979] hover:bg-slate-50 transition-all"
                    >
                      {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Menu Overlay */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="md:hidden bg-white/95 backdrop-blur-2xl border border-slate-200 overflow-hidden mt-2 mx-4 rounded-2xl shadow-xl"
                  >
                    <div className="p-6 flex flex-col gap-3">
                       {['Features', 'Process', 'Mentors', 'Industry', 'University'].map(link => {
                         const cleanLink = link.toLowerCase();
                         const isActiveLink = (cleanLink === 'mentors' && activeSection === 'mentor') ||
                                              (cleanLink === 'industry' && activeSection === 'industry') ||
                                              (cleanLink === 'university' && activeSection === 'university');
                         return (
                          <button 
                            key={link} 
                            onClick={() => {
                              setIsMenuOpen(false);
                              if (cleanLink === 'mentors') {
                                setActiveSection('mentor');
                                setMentorStep(0);
                              } else if (cleanLink === 'industry') {
                                setActiveSection('industry');
                                setIndustryStep(0);
                              } else if (cleanLink === 'university') {
                                setActiveSection('university');
                                setUniversityStep(0);
                              } else {
                                setActiveSection('main');
                                setTimeout(() => {
                                  const id = cleanLink.replace(/\s+/g, '-');
                                  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                              }
                            }}
                            className={`text-left py-2.5 px-4 rounded-xl text-[14px] font-semibold transition-all ${
                              isActiveLink ? 'bg-blue-50 text-[#090979]' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {link}
                          </button>
                        );
                      })}
                      <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col gap-2.5">
                        <button onClick={() => { setIsMenuOpen(false); setMode('signin'); }} className="w-full py-3 text-[14px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl">LOGIN</button>
                        <button onClick={() => { setIsMenuOpen(false); setActiveSection('main'); setMode('signup'); }} className="w-full py-3 text-[14px] font-semibold text-white bg-gradient-to-r from-[#090979] to-[#00D4FF] rounded-xl shadow-md">JOIN THE BRIDGE</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.header>

            {activeSection === 'main' ? (
              <>
                <HeroSection 
                  onSignUp={() => setMode('signup')} 
                  onSignIn={() => setMode('signin')} 
                />

            {/* How It Works with Animated Connectors */}
            <section id="process" className="py-16 md:py-20 relative overflow-hidden bg-[#f8f2fa]">
              <div className="section-container">
                <SectionHeader subtitle="The Protocol" title="How We Bridge the Gap" align="center" description="A data-centric approach to professional evolution, engineered for the global market." />
                
                <div className="grid md:grid-cols-3 gap-8 relative mt-10">
                  {[
                    { step: '01', icon: FileUp, title: "Skill Audit", desc: "Our AI deconstructs your resume into a primitive competency map using global ontologies." },
                    { step: '02', icon: Target, title: "Gap Discovery", desc: "Identify precisely where your profile falls short relative to hyper-growth tech hubs." },
                    { step: '03', icon: Users, title: "Execution Plan", desc: "Execute targeted growth sprints with direct guidance from domain masters." }
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                      className="card-landing p-8 flex flex-col items-start relative group"
                    >
                      <div className="flex items-center justify-between w-full mb-6">
                        <div className="w-12 h-12 rounded-xl bg-[#f1e6f5] flex items-center justify-center text-[#090979]">
                          <item.icon className="w-6 h-6" />
                        </div>
                        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#00d4ff] bg-[#e0f7fc] px-3 py-1 rounded-full">PHASE {item.step}</span>
                      </div>
                      <h3 className="text-xl font-semibold text-[#090979] tracking-[-0.02em] mb-3">{item.title}</h3>
                      <p className="text-[#090979]/65 text-[15px] leading-[1.65]">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* Features Bento Grid */}
            <section id="features" className="py-16 md:py-20 bg-[#f8f2fa]">
              <div className="section-container">
                <SectionHeader subtitle="Core Capabilities" title="The Career Stack" description="Everything you need to navigate the global technology frontier, from audit to offer." />
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-10">
                  {/* Large Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="md:col-span-8 p-8 md:p-10 card-landing flex flex-col justify-between"
                  >
                    <div className="space-y-6">
                      <div className="w-14 h-14 rounded-xl bg-[#090979] text-white flex items-center justify-center shadow-md">
                        <Cpu className="w-7 h-7" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-2xl md:text-3xl font-semibold text-[#090979] tracking-[-0.02em]">Neural Skill <span className="text-[#00d4ff]">Vectoring</span></h3>
                        <p className="text-[16px] text-[#090979]/65 leading-[1.65] max-w-xl">We deconstruct your experience into high-dimensional competency vectors, compared against 1M+ data points from Silicon Valley to Singapore.</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.08em] uppercase text-[#00d4ff] mt-8 hover:gap-3 transition-all cursor-pointer">
                      EXPLORE ENGINE <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                  
                  {/* Small Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    className="md:col-span-4 p-8 card-landing flex flex-col justify-between"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#f1e6f5] text-[#090979] flex items-center justify-center mb-6">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-semibold text-[#090979]">Roadmap Gen</h4>
                      <p className="text-[15px] text-[#090979]/65 leading-[1.65]">Autonomous sequencing of high-impact learning goals tailored to target industries.</p>
                    </div>
                  </motion.div>

                  {/* Network Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="md:col-span-4 p-8 card-landing flex flex-col justify-between"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#e0f7fc] text-[#090979] flex items-center justify-center mb-6">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-semibold text-[#090979]">Industry Network</h4>
                      <p className="text-[15px] text-[#090979]/65 leading-[1.65]">Direct conduits to global tech hubs including mentorship pipelines and high-velocity job sprints.</p>
                    </div>
                  </motion.div>

                  {/* Column 2 */}
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.15 }}
                    className="md:col-span-4 p-8 card-landing flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 rounded-xl bg-[#f1e6f5] text-[#090979] flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                      <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#00d4ff]">DIRECT-ACCESS</span>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-semibold text-[#090979]">Lead Engineering</h4>
                      <p className="text-[15px] text-[#090979]/65 leading-[1.65]">Engage directly with decision-makers and technical architects at frontier companies.</p>
                    </div>
                  </motion.div>

                  {/* Verified Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.2 }}
                    className="md:col-span-4 p-8 card-landing flex flex-col justify-between"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#e0f7fc] text-[#090979] flex items-center justify-center mb-6">
                      <ShieldCheck className="w-6 h-6 text-[#00d4ff]" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-semibold text-[#090979]">Vetted Outcomes</h4>
                      <p className="text-[15px] text-[#090979]/65 leading-[1.65]">Our proprietary feedback protocol ensures every interaction results in verifiable proof of growth.</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* Industry Partners Section */}
            <section id="industry" className="py-16 md:py-20 bg-[#f8f2fa]">
              <div className="section-container">
                <SectionHeader 
                  subtitle="Enterprise Collaboration" 
                  title="Industry Pipelines" 
                  align="center"
                  description="We bridge the gap between classroom and target corporate requirements through active partnerships." 
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="card-landing p-8 space-y-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#f1e6f5] flex items-center justify-center text-[#090979]">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-xl font-semibold text-[#090979]">Direct Recruiter Portal</h4>
                    <p className="text-[#090979]/65 text-[15px] leading-[1.65]">
                      Enterprises access vetted competency matrices and direct portfolio links, bypassing generic recruitment channels.
                    </p>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    className="card-landing p-8 space-y-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#e0f7fc] flex items-center justify-center text-[#090979]">
                      <TrendingUp className="w-6 h-6 text-[#00d4ff]" />
                    </div>
                    <h4 className="text-xl font-semibold text-[#090979]">Vetted Skill Certificates</h4>
                    <p className="text-[#090979]/65 text-[15px] leading-[1.65]">
                      Recruiters filter candidates by verified coding sprint submissions and direct feedback scores from verified senior engineers.
                    </p>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="card-landing p-8 space-y-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#f1e6f5] flex items-center justify-center text-[#090979]">
                      <Zap className="w-6 h-6 text-[#00d4ff]" />
                    </div>
                    <h4 className="text-xl font-semibold text-[#090979]">Rapid Job Sprints</h4>
                    <p className="text-[#090979]/65 text-[15px] leading-[1.65]">
                      Participate in cohort-based hiring drives where partner organizations source qualified engineering talent directly.
                    </p>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* University Hub Section */}
            <section id="university" className="py-16 md:py-20 bg-[#f8f2fa]">
              <div className="section-container">
                <SectionHeader 
                  subtitle="Academic Integration" 
                  title="University Network" 
                  align="center"
                  description="Supercharge university talent programs with active industry alignment and portfolio development tracker systems." 
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="card-landing p-8 flex gap-6 items-start"
                  >
                    <div className="w-12 h-12 shrink-0 rounded-xl bg-[#e0f7fc] flex items-center justify-center text-[#090979]">
                      <GraduationCap className="w-6 h-6 text-[#00d4ff]" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-semibold text-[#090979]">Curriculum Alignment</h4>
                      <p className="text-[#090979]/65 text-[15px] leading-[1.65]">
                        We cooperate with academic departments to blend real-world micro-credentials, APIs, and stack workflows directly into active academic years.
                      </p>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    className="card-landing p-8 flex gap-6 items-start"
                  >
                    <div className="w-12 h-12 shrink-0 rounded-xl bg-[#f1e6f5] flex items-center justify-center text-[#090979]">
                      <Award className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-semibold text-[#090979]">Ambassador Network</h4>
                      <p className="text-[#090979]/65 text-[15px] leading-[1.65]">
                        Empowering on-campus student leaders to run localized training workshops, mock-interview sprints, and technology deep-dives.
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* Premium Mentor Cards */}
            <section id="mentors" className="py-16 md:py-20 bg-[#f8f2fa]">
              <div className="section-container">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
                  <SectionHeader subtitle="The Collective" title="Expert Directory" description="Connect with the minds who already built what you want to build." />
                  <button onClick={() => setMode('signin')} className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#00d4ff] hover:gap-3 transition-all cursor-pointer">
                    <span>ACCESS GLOBAL NETWORK</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {MENTORS.map((m, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                      className="card-landing p-6 flex flex-col justify-between space-y-6"
                    >
                      <div className="space-y-6">
                        <div className="flex justify-between items-start">
                          <img src={m.image} alt={m.name} className="w-16 h-16 rounded-xl object-cover border border-[#090979]/8" />
                          <img src={m.logo} alt={m.company} className="h-6 object-contain opacity-60" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex text-[#00d4ff]">
                              {[...Array(5)].map((_, idx) => <Star key={idx} className="w-3.5 h-3.5 fill-[#00d4ff]" />)}
                            </div>
                            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#090979]/65">{m.rating}</span>
                          </div>
                          <h4 className="text-lg font-semibold text-[#090979]">{m.name}</h4>
                          <p className="text-[13px] font-medium text-[#090979]/65">{m.role}</p>
                        </div>

                        <div className="pt-4 border-t border-[#090979]/8 grid grid-cols-2 gap-4 text-[13px]">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#090979]/45">EXPERIENCE</p>
                            <p className="font-medium text-[#090979]">{m.experience}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#090979]/45">RESPONSE</p>
                            <p className="font-semibold text-[#00d4ff]">INSTANT</p>
                          </div>
                        </div>
                      </div>

                      <button onClick={() => setMode('signin')} className="w-full py-3 rounded-xl bg-[#f1e6f5] hover:bg-[#090979] hover:text-white text-[#090979] font-semibold text-[14px] transition-all cursor-pointer">
                        BOOK SESSION
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section id="pricing" className="py-16 md:py-20 bg-[#f8f2fa]">
              <div className="section-container">
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl p-10 md:p-16 text-white text-center shadow-lg relative overflow-hidden"
                  style={{ background: 'linear-gradient(100deg, #090979 0%, #1b2fb8 45%, #00d4ff 100%)' }}
                >
                  <div className="relative z-10 space-y-8 max-w-3xl mx-auto">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto text-[#00d4ff]">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="space-y-4">
                      <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.1]">Ready to accelerate your journey?</h2>
                      <p className="text-white/80 text-[17px] leading-[1.65]">Join a new generation of high-velocity talent redefining professional frontiers from Bangladesh.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                      <div className="flex-1 relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                        <input type="email" placeholder="ENTER YOUR PRIMARY EMAIL" className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/50 text-[14px] outline-none focus:border-[#00d4ff] transition-all" />
                      </div>
                      <button className="bg-white text-[#090979] px-8 py-3.5 rounded-xl font-semibold text-[14px] tracking-wide hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer">ACTIVATE</button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Compact Footer */}
            <footer className="py-16 px-6 bg-[#f8f2fa] border-t border-[#090979]/8">
              <div className="section-container">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#090979] flex items-center justify-center text-white">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-lg text-[#090979]">CareerBridge</span>
                    </div>
                    <p className="text-[#090979]/65 text-[15px] leading-[1.65]">The neural bridge connecting talent in Bangladesh with global technology ecosystems.</p>
                    <div className="flex gap-3 pt-2">
                      <button className="w-10 h-10 rounded-xl bg-white border border-[#090979]/8 flex items-center justify-center text-[#090979]/65 hover:text-[#090979] hover:border-[#090979]/20 transition-all cursor-pointer">
                        <Linkedin className="w-4 h-4" />
                      </button>
                      <button className="w-10 h-10 rounded-xl bg-white border border-[#090979]/8 flex items-center justify-center text-[#090979]/65 hover:text-[#090979] hover:border-[#090979]/20 transition-all cursor-pointer">
                        <Github className="w-4 h-4" />
                      </button>
                      <button className="w-10 h-10 rounded-xl bg-white border border-[#090979]/8 flex items-center justify-center text-[#090979]/65 hover:text-[#090979] hover:border-[#090979]/20 transition-all cursor-pointer">
                        <Twitter className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#00d4ff]">FRONTIERS</p>
                    <nav className="flex flex-col gap-2.5 text-[15px] text-[#090979]/65">
                      {['Resume Engine', 'Skill Audit', 'Mentor Directory', 'Career Paths', 'Job Sprints'].map(link => (
                        <button key={link} className="hover:text-[#090979] transition-all text-left cursor-pointer">
                          {link}
                        </button>
                      ))}
                    </nav>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#00d4ff]">LOCATION & LEGAL</p>
                    <div className="space-y-2 text-[15px] text-[#090979]/65">
                      <p className="flex items-center gap-2"><Globe className="w-4 h-4 text-[#00d4ff]" /> Dhaka, Bangladesh</p>
                      <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#00d4ff]" /> hq@careerbridge.systems</p>
                    </div>
                    <div className="pt-3 flex gap-4 text-[13px] text-[#090979]/45 font-medium">
                      <button className="hover:text-[#090979] cursor-pointer">Privacy Protocol</button>
                      <span>•</span>
                      <button className="hover:text-[#090979] cursor-pointer">Terms of Service</button>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-[#090979]/8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#090979]/45">
                  <p>© 2026 CAREERBRIDGE SYSTEMS — BUILT FOR THE FUTURE.</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[#090979]/65">SYSTEM OPERATIONAL</span>
                  </div>
                </div>
              </div>
            </footer>
          </>
        ) : activeSection === 'mentor' ? (
              <div className="pt-32 sm:pt-36 pb-20 relative bg-transparent text-slate-900 min-h-screen font-sans selection:bg-[#00D4FF]/20 selection:text-slate-900">
                {mentorStep === 0 ? (
                  <div className="w-full relative  py-6 sm:py-10 px-6 sm:px-10 lg:px-16 transition-all">
                    {/* Soft radial bloom behind headline's top-left */}
                    <div className="absolute top-[-180px] left-[-180px] w-[850px] h-[850px] bg-[radial-gradient(circle_at_20%_20%,_rgba(0,180,255,0.12)_0%,_rgba(9,9,121,0.06)_50%,_transparent_80%)] blur-[80px] pointer-events-none rounded-full" />
                    
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 relative z-10 items-center">
                      
                      {/* Hero Left Column (55% / 7 cols) */}
                      <motion.div 
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="lg:col-span-7 text-left space-y-7"
                      >
                        {/* Eyebrow Pill */}
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.06, ease: "easeOut" }}
                        >
                          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50/90 border border-blue-200/80 text-[#090979] text-[11px] font-mono font-semibold tracking-[0.12em] uppercase shadow-sm">
                            ELITE ADVISOR COHORT
                          </span>
                        </motion.div>

                        {/* Serif Headline with Gradient Text Fill on final word 'leaders.' */}
                        <motion.h1 
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.12, ease: "easeOut" }}
                          className="text-[clamp(44px,5vw,72px)] leading-[1.02] tracking-[-0.02em] font-serif text-slate-900 font-normal"
                        >
                          Shape the next <br className="hidden sm:inline" />
                          generation of tech <span className="bg-gradient-to-r from-[#090979] via-[#0077FF] to-[#00D4FF] bg-clip-text text-transparent font-medium">leaders.</span>
                        </motion.h1>

                        {/* Paragraph */}
                        <motion.p 
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.18, ease: "easeOut" }}
                          className="max-w-[52ch] text-[17px] text-slate-600 leading-[1.65] font-sans"
                        >
                          Deconstruct generic instruction. Join our global mentor network to guide talented developers, verify their real-time competencies, and counter-sign official career-readiness endorsements.
                        </motion.p>

                        {/* Horizontal Row of 3 Capability Chips */}
                        <motion.div 
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.24, ease: "easeOut" }}
                          className="flex flex-wrap items-center gap-3 pt-1"
                        >
                          {[
                            "Counter-sign official credentials",
                            "Live workspace telemetry",
                            "Global portfolio validation"
                          ].map((chipText, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 shadow-sm rounded-xl text-xs font-medium text-slate-800 transition-all hover:border-[#0077FF]/40 hover:shadow-md"
                            >
                              <CheckCircle2 className="w-4 h-4 text-[#0077FF] shrink-0" />
                              <span className="whitespace-nowrap">{chipText}</span>
                            </div>
                          ))}
                        </motion.div>

                        {/* 48px Gap before CTAs */}
                        <motion.div 
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.30, ease: "easeOut" }}
                          className="pt-12 flex flex-wrap items-center gap-4"
                        >
                          <button 
                            onClick={() => {
                              setMentorStep(1);
                              setMentorSignupStep(1);
                            }}
                            className="bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,119,255,0.3)] active:scale-95 text-white px-7 py-4 rounded-xl font-semibold text-[15px] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0077FF]"
                          >
                            Apply to Become a Mentor
                          </button>
                          <button 
                            onClick={() => setActiveSection('main')}
                            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 px-7 py-4 rounded-xl font-semibold text-[15px] shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0077FF]"
                          >
                            Back to Landing Page
                          </button>
                        </motion.div>

                        {/* Small Animated Scroll Cue */}
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4, delay: 0.36, ease: "easeOut" }}
                          className="pt-6 flex items-center gap-2.5 text-xs text-slate-500 font-medium"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0077FF] animate-ping" />
                          <ChevronDown className="w-4 h-4 text-[#0077FF] animate-bounce" />
                          <span>Scroll to explore advisor telemetry & cohort criteria</span>
                        </motion.div>
                      </motion.div>

                      {/* Right Column (45% / 5 cols) - Elevated Credibility Panel */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.20, ease: "easeOut" }}
                        className="lg:col-span-5 relative flex justify-center lg:justify-end"
                      >
                        <div className="w-full bg-white border border-slate-200/90 shadow-[0_10px_35px_-5px_rgba(9,9,121,0.07)] rounded-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl">
                          <div className="space-y-6">
                            <h4 className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">
                              ADVISOR NETWORK METRICS
                            </h4>

                            <div className="divide-y divide-slate-100">
                              {[
                                { label: "Active mentees under guidance", value: "2,450+" },
                                { label: "Skills counter-signed & certified", value: "14,200+" },
                                { label: "Avg. mentee readiness uplift", value: "+34%" },
                                { label: "Tech placement achievement", value: "94.2%" }
                              ].map((stat, idx) => (
                                <div key={idx} className="flex justify-between items-center py-4.5 first:pt-0 last:pb-0">
                                  <span className="text-[13px] text-slate-600 font-sans">
                                    {stat.label}
                                  </span>
                                  <span className="text-[32px] font-bold text-[#0066FF] font-mono tracking-tight leading-none ml-4">
                                    {stat.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>

                    </div>
                  </div>
                ) : (
                  <div className="section-container max-w-2xl mx-auto px-6">
                    <div className="bg-white border border-slate-200/90 shadow-2xl rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden text-left font-sans">
                      <div className="flex items-center justify-between pb-6 border-b border-slate-200 gap-4 mb-6">
                        {mentorSignupStep > 1 ? (
                          <button 
                            type="button" 
                            onClick={() => { setError(null); setMentorSignupStep((prev) => (prev - 1) as 1 | 2 | 3); }}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" /> Back
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            onClick={() => setMentorStep(0)} 
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" /> Back to Overview
                          </button>
                        )}
                        <button 
                          type="button"
                          onClick={() => setMentorStep(0)} 
                          className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                          aria-label="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-center space-y-2 mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-serif">Apply as a Mentor</h2>
                        <p className="text-xs font-medium text-slate-500">
                          Step {mentorSignupStep} of 3 — {
                            mentorSignupStep === 1 
                              ? "Account Credentials & Contact" 
                              : mentorSignupStep === 2 
                                ? "Professional Background" 
                                : "Choose Specialties"
                          }
                        </p>
                        <div className="flex gap-2 justify-center pt-3 px-2">
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${mentorSignupStep >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${mentorSignupStep >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${mentorSignupStep >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                        </div>
                      </div>

                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (mentorSignupStep === 3) {
                          handleRegisterMentor(e);
                        }
                      }} className="space-y-6">
                        {mentorSignupStep === 1 && (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">FIRST NAME</label>
                                <input type="text" required value={mentorFirstName} onChange={(e) => setMentorFirstName(e.target.value)} placeholder="Arif" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-blue-600" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">LAST NAME</label>
                                <input type="text" required value={mentorLastName} onChange={(e) => setMentorLastName(e.target.value)} placeholder="Khan" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-blue-600" />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">EMAIL ADDRESS</label>
                                <input type="email" required value={mentorEmail} onChange={(e) => setMentorEmail(e.target.value)} placeholder="arif.khan@tech.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-blue-600" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">PASSWORD</label>
                                <input type="password" required value={mentorPassword} onChange={(e) => setMentorPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-blue-600" />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">LOCATION</label>
                                <select value={mentorLocation} onChange={(e) => setMentorLocation(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:border-blue-600">
                                  <option value="Bangladesh">Bangladesh</option>
                                  <option value="United States">United States</option>
                                  <option value="United Kingdom">United Kingdom</option>
                                  <option value="Singapore">Singapore</option>
                                  <option value="Canada">Canada</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">LINKEDIN PROFILE URL</label>
                                <input type="url" required value={mentorLinkedin} onChange={(e) => setMentorLinkedin(e.target.value)} placeholder="https://linkedin.com/in/arifkhan" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-blue-600" />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (validateStep1()) {
                                  setMentorSignupStep(2);
                                }
                              }}
                              className="w-full py-4 mt-4 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              Continue to Step 2 <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {mentorSignupStep === 2 && (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">JOB TITLE</label>
                                <input type="text" required value={mentorJobTitle} onChange={(e) => setMentorJobTitle(e.target.value)} placeholder="Senior Engineer, Product Manager..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-blue-600" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">COMPANY / ASSOCIATION</label>
                                <input type="text" required value={mentorCompany} onChange={(e) => setMentorCompany(e.target.value)} placeholder="Google, bKash, BRAC, etc." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-blue-600" />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">YEARS OF EXPERIENCE</label>
                              <select value={mentorExperience} onChange={(e) => setMentorExperience(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:border-blue-600">
                                <option value="1-2 Years">1-2 Years</option>
                                <option value="3-5 Years">3-5 Years</option>
                                <option value="5-8 Years">5-8 Years</option>
                                <option value="8+ Years">8+ Years</option>
                              </select>
                            </div>

                            {/* Prove Your Employment Section */}
                            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                                  <label className="text-[11px] font-mono font-bold text-slate-700 tracking-wider uppercase">
                                    PROVE YOUR EMPLOYMENT
                                  </label>
                                </div>
                                <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                  Authenticity Verification
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                To protect students and ensure all mentors are real industry professionals, please verify your corporate standing.
                              </p>

                              {/* Method Dropdown */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-semibold text-slate-500 tracking-wider uppercase">
                                  VERIFICATION METHOD
                                </label>
                                <select 
                                  value={verificationMethod} 
                                  onChange={(e) => setVerificationMethod(e.target.value as 'corporate_email' | 'employment_document')}
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:border-blue-600 transition-colors cursor-pointer"
                                >
                                  <option value="corporate_email">Prove with corporate email</option>
                                  <option value="employment_document">Prove with employment document</option>
                                </select>
                              </div>

                              {/* Conditional Verification Inputs */}
                              {verificationMethod === 'corporate_email' ? (
                                <div className="space-y-3 pt-1">
                                  {isCorporateEmailVerified ? (
                                    /* Verified Card */
                                    <div className="p-4 bg-emerald-50 border border-emerald-200/90 rounded-xl space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                          <span className="text-xs font-bold text-emerald-800">Corporate Email Verified</span>
                                        </div>
                                        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                                          Instant Approval Active
                                        </span>
                                      </div>
                                      <p className="text-xs font-mono text-emerald-900 break-all">
                                        {corporateWorkEmail}
                                      </p>
                                      <p className="text-[11px] text-emerald-700 leading-relaxed">
                                        Your corporate standing is authenticated. You will bypass manual admin confirmation and can log in directly upon completing signup!
                                      </p>
                                      <div className="pt-1">
                                        <button
                                          type="button"
                                          onClick={handleResetCorporateEmail}
                                          className="text-[11px] text-emerald-700 hover:text-emerald-900 underline font-medium cursor-pointer"
                                        >
                                          Change / Re-verify corporate email
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Input + Send verification code */
                                    <div className="space-y-2.5">
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-mono font-semibold text-slate-500 tracking-wider uppercase flex items-center gap-1.5">
                                          <Mail className="w-3.5 h-3.5 text-blue-600" /> CORPORATE / WORK EMAIL
                                        </label>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                          <input 
                                            type="email" 
                                            required 
                                            value={corporateWorkEmail} 
                                            onChange={(e) => {
                                              setCorporateWorkEmail(e.target.value);
                                              if (corporateCodeSent) {
                                                setCorporateCodeSent(false);
                                                setCorporateVerificationSuccess(null);
                                                setCorporateVerificationError(null);
                                              }
                                            }} 
                                            placeholder="e.g. name@company.com (not personal gmail)" 
                                            className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:border-blue-600 transition-colors" 
                                          />
                                          <button
                                            type="button"
                                            onClick={handleSendCorporateCode}
                                            disabled={corporateVerificationSending || !corporateWorkEmail.trim()}
                                            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                                          >
                                            {corporateVerificationSending ? (
                                              <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span>Sending...</span>
                                              </>
                                            ) : corporateCodeSent ? (
                                              <>
                                                <Mail className="w-3.5 h-3.5" />
                                                <span>Resend Code</span>
                                              </>
                                            ) : (
                                              <>
                                                <Zap className="w-3.5 h-3.5" />
                                                <span>Verify Email</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400">
                                          Must use your active company domain. A 6-digit security code will be sent to verify your corporate identity.
                                        </p>
                                      </div>

                                      {/* Code Verification Box */}
                                      {corporateCodeSent && (
                                        <motion.div
                                          initial={{ opacity: 0, y: -6 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                                              <Lock className="w-3.5 h-3.5 text-blue-600" /> Enter 6-Digit Code
                                            </span>
                                            <span className="text-[10px] font-mono text-blue-700 truncate max-w-[180px]">
                                              Sent to {corporateWorkEmail}
                                            </span>
                                          </div>

                                          <div className="flex gap-2">
                                            <input
                                              type="text"
                                              maxLength={6}
                                              value={userEnteredCorporateCode}
                                              onChange={(e) => setUserEnteredCorporateCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  handleVerifyCorporateCode();
                                                }
                                              }}
                                              placeholder="123456"
                                              className="flex-1 px-3 py-2.5 bg-white border border-blue-200 rounded-lg text-center font-mono font-bold text-base tracking-[0.3em] text-slate-900 outline-none focus:border-blue-600 shadow-inner"
                                            />
                                            <button
                                              type="button"
                                              onClick={handleVerifyCorporateCode}
                                              disabled={corporateVerificationVerifying || userEnteredCorporateCode.length < 6}
                                              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                            >
                                              {corporateVerificationVerifying ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              ) : (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                              )}
                                              <span>Confirm</span>
                                            </button>
                                          </div>

                                          {corporateVerificationError && (
                                            <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                                              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {corporateVerificationError}
                                            </p>
                                          )}

                                          {corporateVerificationSuccess && (
                                            <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {corporateVerificationSuccess}
                                            </p>
                                          )}

                                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-blue-100">
                                            <span>Didn't receive email? Check spam folder or</span>
                                            <button
                                              type="button"
                                              onClick={handleSendCorporateCode}
                                              disabled={corporateVerificationSending}
                                              className="text-blue-600 font-semibold hover:underline cursor-pointer"
                                            >
                                              Click to resend
                                            </button>
                                          </div>
                                        </motion.div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1.5 pt-1">
                                  <label className="text-[10px] font-mono font-semibold text-slate-500 tracking-wider uppercase flex items-center gap-1.5">
                                    <FileUp className="w-3.5 h-3.5 text-blue-600" /> EMPLOYMENT DOCUMENT (PDF, DOCX, PNG, JPEG)
                                  </label>
                                  <div className="relative">
                                    <input 
                                      type="file" 
                                      accept=".pdf,.docx,.png,.jpeg,.jpg"
                                      onChange={handleEmploymentDocUpload}
                                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer bg-white border border-slate-200 rounded-xl p-2"
                                    />
                                  </div>
                                  {employmentDocFileName ? (
                                    <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Attached: {employmentDocFileName}
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-slate-400">
                                      Upload employee badge, offer letter, or work contract proof (Max 5MB). Admin review required before access.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">CV / DOCUMENT URL</label>
                              <input type="url" required value={mentorCvUrl} onChange={(e) => setMentorCvUrl(e.target.value)} placeholder="https://drive.google.com/..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-blue-600" />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">SHORT BIOGRAPHY</label>
                              <textarea rows={3} required value={mentorBio} onChange={(e) => setMentorBio(e.target.value)} placeholder="Provide your mentorship approach..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-blue-600 resize-none font-sans" />
                            </div>

                            <div className="flex gap-3 pt-2">
                              <button 
                                type="button" 
                                onClick={() => setMentorSignupStep(1)} 
                                className="flex-1 py-4 border border-slate-200 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition-all cursor-pointer"
                              >
                                Back
                              </button>
                              <button 
                                type="button" 
                                onClick={() => {
                                  if (validateStep2()) {
                                    setMentorSignupStep(3);
                                  }
                                }} 
                                className="flex-1 py-4 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                              >
                                Continue to Step 3 <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {mentorSignupStep === 3 && (
                          <div className="space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">CHOOSE SPECIALTIES</label>
                              <span className="text-[11px] text-slate-400 font-mono">Tech & Non-Tech Disciplines</span>
                            </div>

                            {/* Active/Selected Specialties bar */}
                            {mentorSpecialties.length > 0 ? (
                              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-500 block">Selected Specialties ({mentorSpecialties.length})</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {mentorSpecialties.map((spec) => (
                                    <span key={spec} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                                      {spec}
                                      <button 
                                        type="button" 
                                        onClick={() => setMentorSpecialties(mentorSpecialties.filter(s => s !== spec))}
                                        className="hover:text-red-500 font-bold text-sm transition-colors cursor-pointer ml-1 leading-none"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs flex items-center gap-2">
                                <Info className="w-4 h-4 shrink-0 text-amber-600" />
                                Please select or add at least one specialty.
                              </div>
                            )}

                            {/* Custom Specialties Input Row */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase block">Add Custom Specialty</label>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={customSpecialtyInput} 
                                  onChange={(e) => setCustomSpecialtyInput(e.target.value)} 
                                  placeholder="Enter any field (e.g. FinTech, Copywriting...)" 
                                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600 text-slate-900"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const trimmed = customSpecialtyInput.trim();
                                      if (trimmed && !mentorSpecialties.includes(trimmed)) {
                                        setMentorSpecialties([...mentorSpecialties, trimmed]);
                                      }
                                      setCustomSpecialtyInput('');
                                    }
                                  }}
                                />
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    const trimmed = customSpecialtyInput.trim();
                                    if (trimmed && !mentorSpecialties.includes(trimmed)) {
                                      setMentorSpecialties([...mentorSpecialties, trimmed]);
                                    }
                                    setCustomSpecialtyInput('');
                                  }}
                                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                >
                                  <Plus className="w-4 h-4" /> Add
                                </button>
                              </div>
                            </div>

                            {/* Specialty Categories Blocks */}
                            <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                              {SPECIALTY_CATEGORIES.map((catObj) => (
                                <div key={catObj.category} className="space-y-2">
                                  <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                                    {catObj.category}
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {catObj.items.map((tech) => {
                                      const isSelected = mentorSpecialties.includes(tech);
                                      return (
                                        <button
                                          key={tech}
                                          type="button"
                                          onClick={() => {
                                            if (isSelected) {
                                              setMentorSpecialties(mentorSpecialties.filter(item => item !== tech));
                                            } else {
                                              setMentorSpecialties([...mentorSpecialties, tech]);
                                            }
                                          }}
                                          className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                            isSelected 
                                              ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                                              : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
                                          }`}
                                        >
                                          {tech}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Verification Summary Banner */}
                            {verificationMethod === 'corporate_email' && isCorporateEmailVerified ? (
                              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-medium">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>
                                  <strong>Instant Direct Access Active:</strong> Corporate email ({corporateWorkEmail}) verified! Your mentor registration will complete immediately with no admin wait.
                                </span>
                              </div>
                            ) : (
                              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-amber-800 text-xs font-medium">
                                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>
                                  <strong>Admin Vetting Required:</strong> Employment proof will be placed in pause for administrator review before your mentor workspace is unlocked.
                                </span>
                              </div>
                            )}

                            <div className="flex gap-3 pt-2">
                              <button 
                                type="button" 
                                onClick={() => setMentorSignupStep(2)} 
                                className="flex-1 py-4 border border-slate-200 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition-all cursor-pointer"
                              >
                                Back
                              </button>
                              <button 
                                type="submit" 
                                disabled={loading || mentorSpecialties.length === 0} 
                                id="mentor-signup-submit-btn"
                                className="flex-1 py-4 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                              >
                                {loading ? (
                                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                ) : verificationMethod === 'corporate_email' && isCorporateEmailVerified ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <Sparkles className="w-4 h-4" /> Complete & Launch Workspace
                                  </span>
                                ) : (
                                  <>Submit Application for Review</>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {error && (
                          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase flex gap-3 text-left border border-red-200">
                            <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                          </div>
                        )}

                        {success && (
                          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold uppercase flex gap-3 text-left border border-emerald-200">
                            <CheckCircle2 className="w-5 h-5 shrink-0" /> {success}
                          </div>
                        )}
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ) : activeSection === 'industry' ? (
              <div className="pt-32 sm:pt-36 pb-20 relative bg-transparent text-slate-900 min-h-screen font-sans selection:bg-pink-500/20 selection:text-slate-900">
                {industryStep === 0 ? (
                  <div className="w-full relative  py-6 sm:py-10 px-6 sm:px-10 lg:px-16 transition-all">
                    {/* Soft radial bloom */}
                    <div className="absolute top-[-180px] left-[-180px] w-[850px] h-[850px] bg-[radial-gradient(circle_at_20%_20%,_rgba(236,72,153,0.12)_0%,_rgba(9,9,121,0.06)_50%,_transparent_80%)] blur-[80px] pointer-events-none rounded-full" />

                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 relative z-10 items-center">
                      <div className="lg:col-span-7 space-y-8 text-left">
                        <div>
                          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-50 border border-pink-200/80 text-pink-700 text-[11px] font-mono font-semibold tracking-[0.12em] uppercase shadow-sm">
                            ENTERPRISE TALENT ACQUISITION
                          </span>
                        </div>

                        <h1 className="text-[clamp(40px,4.5vw,68px)] leading-[1.04] tracking-[-0.02em] font-serif text-slate-900 font-normal">
                          Source high-velocity <br className="hidden sm:inline" />
                          engineering talent in <span className="bg-gradient-to-r from-pink-600 via-indigo-600 to-[#0077FF] bg-clip-text text-transparent font-medium">Bangladesh.</span>
                        </h1>

                        <p className="max-w-[52ch] text-[17px] text-slate-600 leading-[1.65] font-sans">
                          Deconstruct generic recruitment cycles. Gain instant access to peer-reviewed student micro-credentials, verified git repositories, and code quality evaluations.
                        </p>

                        <div className="flex flex-wrap gap-3 pt-2">
                          {[
                            "Access curated candidate matrices directly",
                            "Initiate targeted enterprise cohort coding drives",
                            "Verify technical competency results with raw analytics"
                          ].map((b, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 shadow-sm rounded-xl text-xs font-medium text-slate-800 transition-all hover:border-pink-300 hover:shadow-md"
                            >
                              <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0" />
                              <span className="whitespace-nowrap">{b}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-4">
                          <button 
                            onClick={() => setIndustryStep(1)}
                            className="bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,212,255,0.3)] active:scale-95 text-white px-7 py-4 rounded-xl font-semibold text-[15px] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            Apply for Partner Access
                          </button>
                          <button 
                            onClick={() => setActiveSection('main')}
                            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 px-7 py-4 rounded-xl font-semibold text-[15px] shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-500"
                          >
                            Back to Landing Page
                          </button>
                        </div>
                      </div>

                      <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
                        <div className="w-full bg-white border border-slate-200/90 shadow-[0_10px_35px_-5px_rgba(236,72,153,0.07)] rounded-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl">
                          <div className="space-y-4">
                            <h4 className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">
                              TALENT INDEX READINESS
                            </h4>

                            <div className="space-y-5">
                              {[
                                { lang: "TypeScript / React / Next.js", value: 88 },
                                { lang: "Python / AI & Machine Learning", value: 74 },
                                { lang: "Node.js / Distributed DB", value: 65 }
                              ].map((track) => (
                                <div key={track.lang} className="space-y-2">
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-slate-700 font-sans">{track.lang}</span>
                                    <span className="text-pink-600 font-mono font-bold">{track.value}% ready</span>
                                  </div>
                                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-pink-500 to-indigo-600 rounded-full" style={{ width: `${track.value}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="section-container max-w-2xl mx-auto px-6">
                    <div className="bg-white border border-slate-200/90 shadow-2xl rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden text-left font-sans">
                      <div className="flex items-center justify-between pb-6 border-b border-slate-200 gap-4 mb-6">
                        {indSignupStep > 1 ? (
                          <button 
                            type="button" 
                            onClick={() => { setError(null); setIndSignupStep((prev) => (prev - 1) as 1 | 2 | 3); }}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" /> Back
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            onClick={() => setIndustryStep(0)} 
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" /> Back to Overview
                          </button>
                        )}
                        <button 
                          type="button"
                          onClick={() => setIndustryStep(0)} 
                          className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                          aria-label="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-center space-y-2 mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-serif">Apply as Enterprise Partner</h2>
                        <p className="text-xs font-medium text-slate-500">
                          Step {indSignupStep} of 3 — {
                            indSignupStep === 1 
                              ? "Company Credentials & Contact" 
                              : indSignupStep === 2 
                                ? "Sourcing Specs & Verification" 
                                : "Organization Overview"
                          }
                        </p>
                        <div className="flex gap-2 justify-center pt-3 px-2">
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${indSignupStep >= 1 ? 'bg-pink-600' : 'bg-slate-200'}`} />
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${indSignupStep >= 2 ? 'bg-pink-600' : 'bg-slate-200'}`} />
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${indSignupStep >= 3 ? 'bg-pink-600' : 'bg-slate-200'}`} />
                        </div>
                      </div>

                      <form onSubmit={(e) => {
                        if (indSignupStep === 3) {
                          handleRegisterIndustry(e);
                        } else {
                          e.preventDefault();
                        }
                      }} className="space-y-6">
                        {indSignupStep === 1 && (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">COMPANY / ORGANISATION NAME</label>
                                <input type="text" required value={indCompanyName} onChange={(e) => setIndCompanyName(e.target.value)} placeholder="Tech Solutions Ltd" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-pink-500" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">COMPANY WEBSITE URL</label>
                                <input type="url" required value={indWebsite} onChange={(e) => setIndWebsite(e.target.value)} placeholder="https://techsolutions.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-pink-500" />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">PRIMARY HR / RECRUITER CONTACT NAME</label>
                              <input type="text" required value={indRepName} onChange={(e) => setIndRepName(e.target.value)} placeholder="Ayesha Siddika" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-pink-500" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">WORK EMAIL</label>
                                <input type="email" required value={indEmail} onChange={(e) => setIndEmail(e.target.value)} placeholder="ayesha@techsolutions.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-pink-500" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">PASSWORD</label>
                                <input type="password" required value={indPassword} onChange={(e) => setIndPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-pink-500" />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleIndStep1Next}
                              className="w-full py-4 mt-4 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-md shadow-pink-500/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              Continue to Step 2 <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {indSignupStep === 2 && (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">CURRENT COMPANY SIZE</label>
                                <select value={indSize} onChange={(e) => setIndSize(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:border-pink-500">
                                  <option value="10-50 employees">10-50 employees</option>
                                  <option value="50-250 employees">50-250 employees</option>
                                  <option value="250+ employees">250+ employees</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">PRIMARY TECH STACKS SOURCED</label>
                                <input type="text" required value={indTechStack} onChange={(e) => setIndTechStack(e.target.value)} placeholder="React, TypeScript, Node.js" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-pink-500" />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">INDUSTRY SECTOR</label>
                                <input type="text" required value={indSector} onChange={(e) => setIndSector(e.target.value)} placeholder="Software / E-commerce / Finance" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-pink-500" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">VERIFICATION / LICENSE URL</label>
                                <input type="url" required value={indDocs} onChange={(e) => setIndDocs(e.target.value)} placeholder="https://drive.google.com/..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-pink-500" />
                              </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <button 
                                type="button" 
                                onClick={() => setIndSignupStep(1)} 
                                className="flex-1 py-4 border border-slate-200 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition-all cursor-pointer"
                              >
                                Back
                              </button>
                              <button 
                                type="button" 
                                onClick={handleIndStep2Next} 
                                className="flex-1 py-4 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-md shadow-pink-500/20 flex items-center justify-center gap-2 cursor-pointer"
                              >
                                Continue to Step 3 <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {indSignupStep === 3 && (
                          <div className="space-y-5">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">COMPANY DESCRIPTION & TALENT NEEDS</label>
                              <textarea required value={indDescription} onChange={(e) => setIndDescription(e.target.value)} placeholder="Describe your company and your talent acquisition needs..." rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-pink-500 resize-none font-sans" />
                            </div>

                            <div className="p-4 bg-pink-50/70 border border-pink-100 rounded-xl text-xs text-slate-600 space-y-1">
                              <span className="font-bold text-pink-700 block">Ready for Submission</span>
                              <p>Submitting this application requests access to our candidate directory and verified technical evaluation metrics.</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <button 
                                type="button" 
                                onClick={() => setIndSignupStep(2)} 
                                className="flex-1 py-4 border border-slate-200 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition-all cursor-pointer"
                              >
                                Back
                              </button>
                              <button 
                                type="submit" 
                                disabled={loading} 
                                className="flex-1 py-4 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-md shadow-pink-500/20 cursor-pointer"
                              >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <>Access Candidate Directory</>}
                              </button>
                            </div>
                          </div>
                        )}

                        {error && (
                          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase flex gap-3 text-left border border-red-200">
                            <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                          </div>
                        )}

                        {success && (
                          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold uppercase flex gap-3 text-left border border-emerald-200">
                            <CheckCircle2 className="w-5 h-5 shrink-0" /> {success}
                          </div>
                        )}
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-32 sm:pt-36 pb-20 relative bg-transparent text-slate-900 min-h-screen font-sans selection:bg-indigo-500/20 selection:text-slate-900">
                {universityStep === 0 ? (
                  <div className="w-full relative  py-6 sm:py-10 px-6 sm:px-10 lg:px-16 transition-all">
                    {/* Soft radial bloom */}
                    <div className="absolute top-[-180px] left-[-180px] w-[850px] h-[850px] bg-[radial-gradient(circle_at_20%_20%,_rgba(79,70,229,0.12)_0%,_rgba(9,9,121,0.06)_50%,_transparent_80%)] blur-[80px] pointer-events-none rounded-full" />

                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 relative z-10 items-center">
                      <div className="lg:col-span-7 space-y-8 text-left">
                        <div>
                          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[11px] font-mono font-semibold tracking-[0.12em] uppercase shadow-sm">
                            ACADEMIC INSTITUTION PARTNER
                          </span>
                        </div>

                        <h1 className="text-[clamp(40px,4.5vw,68px)] leading-[1.04] tracking-[-0.02em] font-serif text-slate-900 font-normal">
                          Empower graduation batches <br className="hidden sm:inline" />
                          with modern <span className="bg-gradient-to-r from-[#090979] via-indigo-600 to-[#0077FF] bg-clip-text text-transparent font-medium">engineering credentials.</span>
                        </h1>

                        <p className="max-w-[52ch] text-[17px] text-slate-600 leading-[1.65] font-sans">
                          Embed professional technology sprints directly into active university curriculums. Connect on-campus student ambassadors with direct global recruiter networks.
                        </p>

                        <div className="flex flex-wrap gap-3 pt-2">
                          {[
                            "Deploy verified micro-credentials in regular curriculums",
                            "Track student portfolio evaluations in live dashboards",
                            "Collaborate with active Senior Engineering mentors"
                          ].map((b, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 shadow-sm rounded-xl text-xs font-medium text-slate-800 transition-all hover:border-indigo-300 hover:shadow-md"
                            >
                              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span className="whitespace-nowrap">{b}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-4">
                          <button 
                            onClick={() => setUniversityStep(1)}
                            className="bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,212,255,0.3)] active:scale-95 text-white px-7 py-4 rounded-xl font-semibold text-[15px] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            Verify Academic Department
                          </button>
                          <button 
                            onClick={() => setActiveSection('main')}
                            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 px-7 py-4 rounded-xl font-semibold text-[15px] shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            Back to Landing Page
                          </button>
                        </div>
                      </div>

                      <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
                        <div className="w-full bg-white border border-slate-200/90 shadow-[0_10px_35px_-5px_rgba(79,70,229,0.07)] rounded-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl">
                          <div className="space-y-6">
                            <h4 className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">
                              ACADEMIC NETWORK TELEMETRY
                            </h4>

                            <div className="space-y-4">
                              <div className="flex items-center gap-4 p-5 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
                                <GraduationCap className="w-9 h-9 text-indigo-600 shrink-0" />
                                <div>
                                  <h5 className="text-sm font-bold text-slate-900 font-sans">Active Campus Ambassadors</h5>
                                  <p className="text-xs text-slate-600 mt-0.5">12 departments verified across Dhaka, Chittagong, and Sylhet</p>
                                </div>
                              </div>

                              <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-semibold text-slate-700 font-sans">Automated Student Roster Sync</span>
                                  <span className="font-mono font-bold text-emerald-600">Active</span>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-normal">
                                  Institutional email domains map graduating students directly into curriculum telemetry.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="section-container max-w-2xl mx-auto px-6">
                    <div className="bg-white border border-slate-200/90 shadow-2xl rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden text-left font-sans">
                      <div className="flex items-center justify-between pb-6 border-b border-slate-200 gap-4 mb-6">
                        {uniSignupStep > 1 ? (
                          <button 
                            type="button" 
                            onClick={() => { setError(null); setUniSignupStep((prev) => (prev - 1) as 1 | 2 | 3); }}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" /> Back
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            onClick={() => setUniversityStep(0)} 
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" /> Back to Overview
                          </button>
                        )}
                        <button 
                          type="button"
                          onClick={() => setUniversityStep(0)} 
                          className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                          aria-label="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-center space-y-2 mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-serif">Apply as University Representative</h2>
                        <p className="text-xs font-medium text-slate-500">
                          Step {uniSignupStep} of 3 — {
                            uniSignupStep === 1 
                              ? "Institution Credentials & Contact" 
                              : uniSignupStep === 2 
                                ? "Department & Student Cohort" 
                                : "Verification & Accreditation"
                          }
                        </p>
                        <div className="flex gap-2 justify-center pt-3 px-2">
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${uniSignupStep >= 1 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${uniSignupStep >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${uniSignupStep >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                        </div>
                      </div>

                      <form onSubmit={(e) => {
                        if (uniSignupStep === 3) {
                          handleRegisterUniversity(e);
                        } else {
                          e.preventDefault();
                        }
                      }} className="space-y-6">
                        {uniSignupStep === 1 && (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">UNIVERSITY NAME</label>
                                <input type="text" required value={uniName} onChange={(e) => setUniName(e.target.value)} placeholder="Islamic University of Technology (IUT)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-indigo-600" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">INSTITUTIONAL WEBSITE URL</label>
                                <input type="url" required value={uniWebsite} onChange={(e) => setUniWebsite(e.target.value)} placeholder="https://iut-dhaka.edu" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-indigo-600" />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">FACULTY COORDINATOR / CONTACT NAME</label>
                              <input type="text" required value={uniRepName} onChange={(e) => setUniRepName(e.target.value)} placeholder="Dr. S. Moni" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-indigo-600" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">INSTITUTIONAL EMAIL</label>
                                <input type="email" required value={uniEmail} onChange={(e) => setUniEmail(e.target.value)} placeholder="moni@iut-dhaka.edu" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-indigo-600" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">PASSWORD</label>
                                <input type="password" required value={uniPassword} onChange={(e) => setUniPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-indigo-600" />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleUniStep1Next}
                              className="w-full py-4 mt-4 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              Continue to Step 2 <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {uniSignupStep === 2 && (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">TARGET BATCH SIZE</label>
                                <select value={uniBatchSize} onChange={(e) => setUniBatchSize(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-600">
                                  <option value="50-100 students">50-100 students</option>
                                  <option value="100-500 students">100-500 students</option>
                                  <option value="500+ students">500+ students</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">DEPARTMENT / SPECIALTY DOMAIN</label>
                                <input type="text" required value={uniDepartment} onChange={(e) => setUniDepartment(e.target.value)} placeholder="Computer Science & Engineering" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-indigo-600" />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">CAMPUS COUNTRY / LOCATION</label>
                                <input type="text" required value={uniCountry} onChange={(e) => setUniCountry(e.target.value)} placeholder="Bangladesh" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-indigo-600" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">STUDENT EMAIL DOMAIN (OPTIONAL)</label>
                                <input type="text" value={uniEmailDomain} onChange={(e) => setUniEmailDomain(e.target.value)} placeholder="e.g. iut-dhaka.edu" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-indigo-600" />
                              </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <button 
                                type="button" 
                                onClick={() => setUniSignupStep(1)} 
                                className="flex-1 py-4 border border-slate-200 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition-all cursor-pointer"
                              >
                                Back
                              </button>
                              <button 
                                type="button" 
                                onClick={handleUniStep2Next} 
                                className="flex-1 py-4 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
                              >
                                Continue to Step 3 <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {uniSignupStep === 3 && (
                          <div className="space-y-5">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">ACCREDITATION / VERIFICATION URL</label>
                              <input type="url" required value={uniDocs} onChange={(e) => setUniDocs(e.target.value)} placeholder="https://drive.google.com/..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-indigo-600" />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">ACCREDITATION INFO & OVERVIEW</label>
                              <textarea value={uniAccreditation} onChange={(e) => setUniAccreditation(e.target.value)} placeholder="Provide information regarding your official academic status, licensing, and accreditation..." rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-900 focus:bg-white focus:border-indigo-600 resize-none font-sans" />
                            </div>

                            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-slate-600 space-y-1">
                              <span className="font-bold text-indigo-700 block">Ready for Verification</span>
                              <p>Submitting this form connects your department with active industry mentors and recruiter network pipelines.</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <button 
                                type="button" 
                                onClick={() => setUniSignupStep(2)} 
                                className="flex-1 py-4 border border-slate-200 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition-all cursor-pointer"
                              >
                                Back
                              </button>
                              <button 
                                type="submit" 
                                disabled={loading} 
                                className="flex-1 py-4 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
                              >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <>Verify & Initialize</>}
                              </button>
                            </div>
                          </div>
                        )}

                        {error && (
                          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase flex gap-3 text-left border border-red-200">
                            <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                          </div>
                        )}

                        {success && (
                          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold uppercase flex gap-3 text-left border border-emerald-200">
                            <CheckCircle2 className="w-5 h-5 shrink-0" /> {success}
                          </div>
                        )}
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            
          </motion.div>
        ) : (
          <motion.div key="auth" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="flex min-h-screen items-center justify-center p-4 sm:p-6 relative z-50">
            <div className="max-w-md w-full glass rounded-[2.5rem] p-6 sm:p-8 space-y-5 relative overflow-hidden shadow-2xl max-h-[94vh] overflow-y-auto">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Cpu className="w-28 h-28 text-primary" /></div>
              
              {studentVerificationPending ? (
                <div className="space-y-4 text-center relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                      <ShieldCheck className="w-4 h-4 text-primary" /> 2-Step Security Verification
                    </div>
                    <button type="button" onClick={() => setStudentVerificationPending(false)} className="p-1.5 rounded-full hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer" aria-label="Close">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl mx-auto flex items-center justify-center text-primary shadow-inner">
                    <ShieldCheck className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-text-primary tracking-tight">Enter Email Security Code</h3>
                    <p className="text-xs font-medium text-text-muted">
                      We sent a 6-digit security verification code to your email. Please check your inbox or spam folder.
                    </p>
                  </div>

                  <div className="p-3.5 bg-bg-secondary/80 border border-border rounded-xl text-left space-y-1 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                      <Mail className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate font-mono">{email}</span>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Enter the 6-digit code below to verify your email address and activate your student account.
                    </p>
                  </div>

                  {verificationError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-2 text-left">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {verificationError}
                    </div>
                  )}

                  {verificationSuccessNotice && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-semibold flex items-center gap-2 text-left">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {verificationSuccessNotice}
                    </div>
                  )}

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCompleteStudentRegistration();
                    }}
                    className="space-y-4 pt-1 text-left"
                  >
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider block">
                        6-Digit Security Code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                        autoFocus
                        value={userEnteredCode}
                        onChange={(e) => setUserEnteredCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="• • • • • •"
                        className="w-full py-3.5 px-4 bg-bg-secondary border-2 border-border focus:border-primary rounded-xl text-center font-mono font-bold text-2xl tracking-[0.4em] outline-none shadow-inner text-text-primary transition-all placeholder:tracking-normal placeholder:text-base placeholder:font-sans placeholder:text-text-muted/40"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || userEnteredCode.length !== 6}
                      className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Code...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify & Create Account</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between pt-2 text-xs border-t border-border/40">
                      <button
                        type="button"
                        onClick={() => {
                          setStudentVerificationPending(false);
                          setVerificationError(null);
                        }}
                        className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                      >
                        Change Email / Go Back
                      </button>

                      <button
                        type="button"
                        disabled={verificationSending}
                        onClick={handleResendStudentVerification}
                        className="text-primary hover:underline font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {verificationSending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        <span>Resend Code</span>
                      </button>
                    </div>

                    {/* EmailJS Credentials Quick Check */}
                    <div className="pt-2 border-t border-border/30 text-center">
                      <button
                        type="button"
                        onClick={() => setShowEmailConfigModal(!showEmailConfigModal)}
                        className="text-[11px] text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
                      >
                        <span>⚙️ EmailJS Service Settings</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${showEmailConfigModal ? 'rotate-180' : ''}`} />
                      </button>

                      {showEmailConfigModal && (
                        <div className="mt-2.5 p-3 bg-bg-secondary/90 border border-border rounded-xl text-left space-y-2 text-xs">
                          <p className="text-[11px] text-text-muted">
                            If your service ID or public key changes, you can update it right here without modifying code:
                          </p>
                          <div>
                            <label className="text-[10px] font-bold text-text-muted uppercase">Service ID</label>
                            <input
                              type="text"
                              value={emailServiceIdInput}
                              onChange={(e) => setEmailServiceIdInput(e.target.value.trim())}
                              placeholder="e.g. service_9w5waba"
                              className="w-full px-2.5 py-1.5 bg-bg-primary border border-border rounded-lg text-xs font-mono text-text-primary outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-text-muted uppercase">Template ID</label>
                            <input
                              type="text"
                              value={emailTemplateIdInput}
                              onChange={(e) => setEmailTemplateIdInput(e.target.value.trim())}
                              placeholder="e.g. template_8rzmow8"
                              className="w-full px-2.5 py-1.5 bg-bg-primary border border-border rounded-lg text-xs font-mono text-text-primary outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-text-muted uppercase">Public Key</label>
                            <input
                              type="text"
                              value={emailPublicKeyInput}
                              onChange={(e) => setEmailPublicKeyInput(e.target.value.trim())}
                              placeholder="e.g. yiUQrPN9ZiXdhz3bl"
                              className="w-full px-2.5 py-1.5 bg-bg-primary border border-border rounded-lg text-xs font-mono text-text-primary outline-none focus:border-primary"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                saveEmailJsConfig(emailServiceIdInput, emailTemplateIdInput, emailPublicKeyInput);
                                setVerificationSuccessNotice("EmailJS credentials updated! Click 'Resend Code' now.");
                                setShowEmailConfigModal(false);
                              }}
                              className="flex-1 py-1.5 bg-primary text-white font-bold text-xs rounded-lg shadow cursor-pointer hover:bg-primary/90 transition-colors"
                            >
                              Save Settings
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                resetEmailJsConfigToDefault();
                                setEmailServiceIdInput('service_9w5waba');
                                setEmailTemplateIdInput('template_8rzmow8');
                                setEmailPublicKeyInput('yiUQrPN9ZiXdhz3bl');
                                setVerificationSuccessNotice("Reset to defaults (service_9w5waba / template_8rzmow8). Click 'Resend Code' now.");
                                setShowEmailConfigModal(false);
                              }}
                              className="px-2 py-1.5 bg-bg-primary border border-border text-text-muted hover:text-text-primary text-xs rounded-lg cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  {/* Header Controls */}
                  <div className="flex items-center justify-between z-10 relative">
                    {mode === 'signup' && studentSignupStep > 1 ? (
                      <button type="button" onClick={() => { setError(null); setStudentSignupStep((prev) => (prev - 1) as 1 | 2 | 3); }} className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors cursor-pointer">
                        <ChevronLeft className="w-4 h-4" /> Back
                      </button>
                    ) : (
                      <button type="button" onClick={() => setMode('landing')} className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors cursor-pointer">
                        <ChevronLeft className="w-4 h-4" /> Back to Home
                      </button>
                    )}
                    
                    <button type="button" onClick={() => setMode('landing')} className="p-1.5 rounded-full hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer" aria-label="Close">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title & Progress Bar */}
                  <div className="text-center space-y-2 relative z-10">
                    <div className="space-y-0.5">
                      <h2 className="text-2xl font-bold text-text-primary tracking-[-0.02em]">
                        {mode === 'signin' ? 'Sign in' : mode === 'forgot-password' ? 'Reset Password' : 'Sign up'}
                      </h2>
                      <p className="text-xs font-medium text-text-muted">
                        {mode === 'signup' ? `Step ${studentSignupStep} of 3` : mode === 'signin' ? 'Access your career intelligence hub' : 'Recover your account credentials'}
                      </p>
                    </div>

                    {/* Progress Indicators for Signup */}
                    {mode === 'signup' && (
                      <div className="flex gap-2 justify-center pt-2 px-2">
                        <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${studentSignupStep >= 1 ? 'bg-[#090979]' : 'bg-border/60'}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${studentSignupStep >= 2 ? 'bg-[#090979]' : 'bg-border/60'}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${studentSignupStep >= 3 ? 'bg-[#090979]' : 'bg-border/60'}`} />
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-4 relative z-10">
                    <AnimatePresence mode="wait">
                      {error && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-3.5 glass bg-error-light/10 text-error rounded-xl text-[10px] font-black tracking-widest flex items-center gap-3"><AlertCircle className="w-5 h-5 shrink-0" />{error.toUpperCase()}</motion.div>}
                      {success && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-3.5 glass bg-success-light/10 text-success rounded-xl text-[10px] font-black tracking-widest flex items-center gap-3"><CheckCircle2 className="w-5 h-5 shrink-0" />{success.toUpperCase()}</motion.div>}
                    </AnimatePresence>

                    {mode === 'signup' ? (
                      <div className="space-y-3.5">
                        {/* STEP 1: Basic Info */}
                        {studentSignupStep === 1 && (
                          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                            <div className="space-y-1 text-left">
                              <label className="text-xs font-semibold text-text-secondary ml-0.5">Full name</label>
                              <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ayesha Siddika" className="w-full pl-11 pr-4 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" />
                              </div>
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-xs font-semibold text-text-secondary ml-0.5">Email address</label>
                              <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="personal@mail.com" className="w-full pl-11 pr-4 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" />
                              </div>
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-xs font-semibold text-text-secondary ml-0.5">Password</label>
                              <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="w-full pl-11 pr-4 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" />
                              </div>
                            </div>

                            <button type="button" onClick={handleStudentStep1Next} className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
                              Next <ArrowRight className="w-4 h-4" />
                            </button>
                          </motion.div>
                        )}

                        {/* STEP 2: Education */}
                        {studentSignupStep === 2 && (
                          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                            <div className="space-y-1 text-left">
                              <label className="text-xs font-semibold text-text-secondary ml-0.5">University / School</label>
                              <div className="relative">
                                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted font-bold" />
                                <input type="text" value={studentUniversity} onChange={(e) => setStudentUniversity(e.target.value)} placeholder="e.g. BRAC University" className="w-full pl-11 pr-4 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" />
                              </div>
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-xs font-semibold text-text-secondary ml-0.5">Department / Major</label>
                              <div className="relative">
                                <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input type="text" value={studentDepartment} onChange={(e) => setStudentDepartment(e.target.value)} placeholder="e.g. Computer Science & Engineering" className="w-full pl-11 pr-4 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" />
                              </div>
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-xs font-semibold text-text-secondary ml-0.5">Graduation batch</label>
                              <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input type="text" value={studentBatch} onChange={(e) => setStudentBatch(e.target.value)} placeholder="e.g. 2025" className="w-full pl-11 pr-4 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" />
                              </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                              <button type="button" onClick={() => { setError(null); setStudentSignupStep(1); }} className="px-5 py-3 border border-border rounded-xl text-xs font-bold text-text-muted hover:bg-bg-tertiary transition-colors cursor-pointer">
                                Back
                              </button>
                              <button type="button" onClick={handleStudentStep2Next} className="flex-1 py-3 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
                                Next <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        )}

                        {/* STEP 3: Bio & Career Goals */}
                        {studentSignupStep === 3 && (
                          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                            <div className="space-y-1 text-left">
                              <label className="text-xs font-semibold text-text-secondary ml-0.5">Career path / Targeted role</label>
                              <div className="relative">
                                <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input type="text" value={studentTargetRole} onChange={(e) => setStudentTargetRole(e.target.value)} placeholder="e.g. Full Stack Engineer / ML Specialist" className="w-full pl-11 pr-4 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" />
                              </div>
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-xs font-semibold text-text-secondary ml-0.5">Portfolio website <span className="text-text-muted font-normal">(Optional)</span></label>
                              <div className="relative">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input type="url" value={studentPortfolio} onChange={(e) => setStudentPortfolio(e.target.value)} placeholder="https://portfolio.dev" className="w-full pl-11 pr-4 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" />
                              </div>
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-xs font-semibold text-text-secondary ml-0.5">Short biography</label>
                              <textarea value={studentBio} onChange={(e) => setStudentBio(e.target.value)} placeholder="Describe your career aspirations and key project interests..." rows={3} className="w-full px-4 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none font-sans shadow-inner" />
                            </div>

                            <div className="flex gap-3 pt-1">
                              <button type="button" onClick={() => { setError(null); setStudentSignupStep(2); }} className="px-5 py-3 border border-border rounded-xl text-xs font-bold text-text-muted hover:bg-bg-tertiary transition-colors cursor-pointer">
                                Back
                              </button>
                              <button type="submit" disabled={loading} className="flex-1 py-3 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                                {loading || verificationSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Create Account <ArrowRight className="w-4 h-4" /></>}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 text-left">
                          <label className="text-xs font-semibold text-text-secondary ml-0.5">Email address</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="personal@mail.com" className="w-full pl-11 pr-4 py-3 bg-bg-secondary/60 border border-border rounded-xl text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" />
                          </div>
                        </div>

                        {mode !== 'forgot-password' && (
                          <div className="space-y-2 text-left">
                            <div className="flex justify-between items-center px-0.5">
                              <label className="text-xs font-semibold text-text-secondary">Password</label>
                              {mode === 'signin' && <button type="button" onClick={() => setMode('forgot-password')} className="text-[11px] font-medium text-primary hover:text-primary-dark transition-colors">Forgot?</button>}
                            </div>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-11 pr-4 py-3 bg-bg-secondary/60 border border-border rounded-xl text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" />
                            </div>
                          </div>
                        )}

                        <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white rounded-xl disabled:opacity-50 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer">
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{mode === 'signin' ? 'Login' : 'Recover Password'}<ArrowRight className="w-4 h-4" /></>}
                        </button>
                      </>
                    )}
                  </form>

                  {mode === 'forgot-password' && (
                    <div className="space-y-4">
                      <div className="p-4 glass bg-primary/5 border border-primary/20 rounded-2xl space-y-2 text-left">
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                          <Info className="w-4 h-4 shrink-0" /> Missing Recovery Email?
                        </h4>
                        <ul className="text-[11px] text-text-secondary space-y-1.5 list-disc pl-4 font-medium leading-relaxed">
                          <li>Check your <span className="font-bold text-primary">Spam, Junk, or Promotions</span> folders.</li>
                          <li>Verify your email address spelling.</li>
                        </ul>
                      </div>
                      <button onClick={() => setMode('signin')} className="w-full text-center eyebrow text-text-muted hover:text-primary transition-colors cursor-pointer">BACK TO SIGN IN</button>
                    </div>
                  )}

                  <p className="text-center text-xs text-text-muted pt-3 border-t border-border opacity-80">
                    {mode === 'signup' ? (
                      <>Already have an account? <button type="button" onClick={() => { setError(null); setMode('signin'); setStudentSignupStep(1); }} className="text-primary hover:text-primary-dark transition-colors font-bold cursor-pointer">Sign in</button></>
                    ) : mode === 'signin' ? (
                      <>New user? <button type="button" onClick={() => { setError(null); setMode('signup'); setStudentSignupStep(1); }} className="text-primary hover:text-primary-dark transition-colors font-bold cursor-pointer">Create account</button></>
                    ) : null}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
