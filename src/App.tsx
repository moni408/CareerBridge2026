import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, signInWithGoogle, logout, OperationType, handleFirestoreError } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CVUpload } from './components/CVUpload';
import { Recommendations } from './components/Recommendations';
import { MentorList } from './components/MentorList';
import { CollaborationHub } from './components/CollaborationHub';
import { CVGenerator } from './components/CVGenerator';
import { MentorshipSpace } from './components/MentorshipSpace';
import { Profile } from './components/Profile';
import { AdminPanel } from './components/Admin/AdminPanel';
import { JobBoard } from './components/JobBoard';
import { SkillAudit } from './components/SkillAudit';
import { MentorSection } from './components/MentorSection';
import { MentorMenteesWorkspace } from './components/MentorMenteesWorkspace';
import { MyMenteesOverview } from './components/MyMenteesOverview';
import { IndustrySection } from './components/IndustrySection';
import { UniversitySection } from './components/UniversitySection';
import { StudentApplicationsList } from './components/ApplicationForms/StudentApplicationsList';
import { StudentApplyForm } from './components/ApplicationForms/StudentApplyForm';
import { PendingVerificationScreen } from './components/PendingVerification';
import { DevSchemaConsole } from './components/DevSchemaConsole';
import { Loader2, User as UserIcon, Users, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: any | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setView: (view: any) => void;
  view: string;
  isAdminMode: boolean;
  setIsAdminMode: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return localStorage.getItem('isAdminMode') === 'true';
  });

  const handleSetAdminMode = (val: boolean) => {
    setIsAdminMode(val);
    localStorage.setItem('isAdminMode', String(val));
  };

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const isSigningUpSpecialRole = sessionStorage.getItem('is_signing_up_special_role') === 'true';
        if (isSigningUpSpecialRole) {
          setLoading(false);
          return;
        }

        const profileRef = doc(db, 'users', firebaseUser.uid);
        if (profileUnsubscribe) profileUnsubscribe();
        
        try {
          const docSnap = await getDoc(profileRef);
          if (!docSnap.exists()) {
            const defaultProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || 'Candidate',
              role: firebaseUser.email === 'ayeshasiddikamoni408@gmail.com' ? 'admin' : 'graduate',
              skills: [],
              education: [],
              experience: [],
              goals: [],
              readinessScore: 0,
              profileAnalyzed: false,
              createdAt: new Date().toISOString(),
            };
            await setDoc(profileRef, defaultProfile);
            setProfile(defaultProfile);
            if (defaultProfile.role === 'admin' || firebaseUser.email === 'ayeshasiddikamoni408@gmail.com') {
              const savedAdminMode = localStorage.getItem('isAdminMode') === 'true';
              if (savedAdminMode) {
                setView('admin-dashboard');
              } else {
                setView('dashboard');
              }
            }
          } else {
            const data = docSnap.data();
            setProfile(data);
            if (data?.role === 'admin' || firebaseUser.email === 'ayeshasiddikamoni408@gmail.com') {
              const savedAdminMode = localStorage.getItem('isAdminMode') === 'true';
              if (savedAdminMode) {
                setView('admin-dashboard');
              } else {
                setView('dashboard');
              }
            } else if (data?.role === 'mentor') {
              setView('mentor-dashboard');
            } else if (data?.role === 'industry') {
              setView('industry-dashboard');
            } else if (data?.role === 'university') {
              setView('university-dashboard');
            }
          }
        } catch (err) {
          // Log as a silent info/warning message rather than a console.error assertion
          console.warn("Offline state detected during initial profile retrieve, falling back to local simulation:", err);
          // High-fidelity resilient offline default profile fallback to prevent user blocker
          const defaultProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Candidate',
            role: firebaseUser.email === 'ayeshasiddikamoni408@gmail.com' ? 'admin' : 'graduate',
            skills: [],
            education: [],
            experience: [],
            goals: [],
            readinessScore: 0,
            profileAnalyzed: false,
            createdAt: new Date().toISOString(),
          };
          setProfile(defaultProfile);
          if (defaultProfile.role === 'admin' || firebaseUser.email === 'ayeshasiddikamoni408@gmail.com') {
            const savedAdminMode = localStorage.getItem('isAdminMode') === 'true';
            if (savedAdminMode) {
              setView('admin-dashboard');
            } else {
              setView('dashboard');
            }
          }
        }
        
        // Dynamic resilient real-time listener. This handles offline/reconnecting state seamlessly.
        profileUnsubscribe = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        });
      } else {
        setProfile(null);
        if (profileUnsubscribe) profileUnsubscribe();
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  // Automatic cleanup of admin-posted jobs
  useEffect(() => {
    let active = true;
    const cleanAdminJobs = async () => {
      try {
        const jobsCol = collection(db, 'jobs');
        const snap = await getDocs(jobsCol);
        if (!active) return;
        for (const d of snap.docs) {
          const data = d.data();
          const isLegacyOrAdmin = !data.postedBy || 
                                  data.postedBy === 'admin' || 
                                  data.company === 'CareerBridge' ||
                                  data.company === 'MentorCorp';
          if (isLegacyOrAdmin) {
            await deleteDoc(doc(db, 'jobs', d.id));
            console.log(`Deleted admin-posted job: ${d.id}`);
          }
        }
      } catch (err) {
        console.warn('Silent notice: cleanup of older admin jobs bypassed (non-admin or empty results)', err);
      }
    };
    cleanAdminJobs();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (profile?.role === 'mentor' && (view === 'dashboard' || view === 'reputation' || view === 'mentees-workspace')) {
      setView('mentor-dashboard');
    } else if (profile?.role === 'industry' && (view === 'dashboard' || view.startsWith('mentor-') || view.startsWith('university-'))) {
      setView('industry-dashboard');
    } else if (profile?.role === 'university' && (view === 'dashboard' || view.startsWith('mentor-') || view.startsWith('industry-'))) {
      setView('university-dashboard');
    }
  }, [profile, view]);

  const selectRole = async (role: 'graduate' | 'mentor') => {
    if (!user) return;
    const profileRef = doc(db, 'users', user.uid);
    const newProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.email === 'ayeshasiddikamoni408@gmail.com' ? 'admin' : role,
      skills: [],
      education: [],
      experience: [],
      goals: [],
      readinessScore: 0,
      profileAnalyzed: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(profileRef, newProfile);
    setProfile(newProfile);

    if (role === 'mentor') {
      await setDoc(doc(db, 'mentors', user.uid), {
        uid: user.uid,
        name: user.displayName,
        expertise: [],
        bio: '',
        rating: 5.0,
        available: true,
        industry: 'Tech'
      });
    }
  };

  const signIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error('Sign in failed', err);
      }
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await logout();
      setView('dashboard');
    } catch (err) {
      console.error('Sign out failed', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary transition-colors duration-500">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="eyebrow text-text-muted">Loading_CareerBridge</p>
        </div>
      </div>
    );
  }

  const isSigningUpSpecialRole = sessionStorage.getItem('is_signing_up_special_role') === 'true';

  if (!user || isSigningUpSpecialRole) {
    return <Auth onSignIn={signIn} />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary transition-colors duration-500">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="eyebrow text-text-muted font-sans uppercase tracking-[0.2em] text-[10px]">Loading_Profile_Vitals</p>
        </div>
      </div>
    );
  }

  const isPendingVerification = profile && 
    (profile.role === 'mentor' || profile.role === 'industry' || profile.role === 'university') && 
    !profile.verified && 
    profile.verificationStatus !== 'verified' && 
    profile.email !== 'ayeshasiddikamoni408@gmail.com';

  if (isPendingVerification) {
    return <PendingVerificationScreen profile={profile} onSignOut={signOut} />;
  }

  if (profile?.role === 'university') {
    return (
      <ErrorBoundary>
        <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, setView, view, isAdminMode: false, setIsAdminMode: handleSetAdminMode }}>
          <UniversitySection />
        </AuthContext.Provider>
      </ErrorBoundary>
    );
  }

  const isUserAdmin = profile?.role === 'admin' || profile?.email === 'ayeshasiddikamoni408@gmail.com';

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, setView, view, isAdminMode: isUserAdmin ? isAdminMode : false, setIsAdminMode: handleSetAdminMode }}>
        <Layout currentView={view} setView={setView} searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
          {view === 'dashboard' && (
            profile?.role === 'mentor' ? (
              <MentorSection />
            ) : profile?.role === 'industry' ? (
              <IndustrySection />
            ) : profile?.role === 'university' ? (
              <UniversitySection />
            ) : (
              <Dashboard setView={setView} currentView={view} />
            )
          )}
          {(view === 'upload' || view === 'generator') && <CVUpload setView={setView} />}
          {view === 'chat' && <MentorshipSpace />}
          {view === 'profile' && <Profile />}
          {view === 'admin' && <AdminPanel initialTab="dashboard" />}
          {view === 'admin-dashboard' && <AdminPanel initialTab="dashboard" />}
          {view === 'admin-verifications' && <AdminPanel initialTab="verifications" />}
          {view === 'admin-users' && <AdminPanel initialTab="users" />}
          {view === 'admin-jobs' && <AdminPanel initialTab="jobs" />}
          {view === 'jobs' && <JobBoard searchQuery={searchQuery} />}
          {view === 'my-applications' && <StudentApplicationsList onSelectJobForForm={(jobId) => setView(`student-apply:${jobId}`)} />}
          {view.startsWith('student-apply') && (
            <StudentApplyForm
              jobId={view.split(':')[1] || 'default-job'}
              onBack={() => setView('jobs')}
              onNavigateToMyApplications={() => setView('my-applications')}
            />
          )}
          {view === 'mentors' && <MentorList setView={setView} searchQuery={searchQuery} />}
          {view === 'skill-audit' && <SkillAudit />}
          {view === 'dev-console' && <DevSchemaConsole />}

          {/* Dedicated Mentor Views */}
          {view.startsWith('mentor-') && <MentorSection />}
          {view === 'messages' && <MentorMenteesWorkspace initialTab="chat" embeddedTab="chat" />}

          {/* Dedicated Industry and University Views */}
          {(view.startsWith('industry-') || view === 'academic-sessions') && <IndustrySection />}
          {view.startsWith('university-') && <UniversitySection />}
        </Layout>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}
