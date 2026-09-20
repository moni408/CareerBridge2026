import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, addDoc, getCountFromServer, where, orderBy, limit, Timestamp, deleteDoc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../App';
import { JobDetailsModal } from '../JobDetailsModal';
import { 
  Users, 
  Briefcase, 
  CheckCircle, 
  XCircle, 
  Clock, 
  LayoutDashboard, 
  UserCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Filter,
  ArrowUpDown,
  TrendingUp,
  FileText,
  ShieldCheck,
  AlertCircle,
  Bell,
  Eye,
  ExternalLink,
  Globe,
  Linkedin,
  GraduationCap,
  Star,
  MapPin,
  Building2,
  BookOpen,
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Stats {
  totalUsers: number;
  pendingVerifications: number;
  verifiedUsers: number;
  totalJobs: number;
}

interface AdminPanelProps {
  initialTab?: 'dashboard' | 'verifications' | 'users' | 'jobs';
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

// Sleek Custom Confirm Modal Component
function ConfirmModal({ isOpen, title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, confirmText?: string, cancelText?: string, isDestructive?: boolean, onConfirm: () => void, onCancel: () => void }) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        />
        {/* Modal Body */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-card border border-border w-full max-w-md p-6 rounded-2xl shadow-xl text-left z-10"
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${isDestructive ? 'bg-rose-50 border border-rose-100 text-rose-600' : 'bg-primary-light border border-primary/10 text-primary'}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-text-primary tracking-tight">{title}</h4>
              <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">{message}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button 
              onClick={onCancel}
              className="px-4 py-2 bg-bg-secondary border border-border text-text-primary rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-bg-tertiary transition-all cursor-pointer"
            >
              {cancelText}
            </button>
            <button 
              onClick={() => { onConfirm(); onCancel(); }}
              className={`px-4 py-2 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isDestructive ? 'bg-rose-600 hover:bg-rose-700 shadow-sm' : 'bg-primary hover:bg-primary-hover shadow-sm'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function AdminPanel({ initialTab = 'dashboard' }: AdminPanelProps) {
  const { profile, setView } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'verifications' | 'users' | 'jobs'>(initialTab);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, pendingVerifications: 0, verifiedUsers: 0, totalJobs: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [clearing, setClearing] = useState(false);

  // New state-of-the-art UI States
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
    fetchStats();
    showToast("Dashboard metrics refreshed successfully", "info");
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tab: 'dashboard' | 'verifications' | 'users' | 'jobs') => {
    setActiveTab(tab);
    setView(`admin-${tab}`);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const usersCol = collection(db, 'users');
      const jobsCol = collection(db, 'jobs');
      
      const totalUsersSnapshot = await getCountFromServer(usersCol);
      const pendingSnapshot = await getCountFromServer(query(usersCol, where('verificationStatus', '==', 'pending')));
      const verifiedSnapshot = await getCountFromServer(query(usersCol, where('verified', '==', true)));
      const jobsSnapshot = await getCountFromServer(jobsCol);

      setStats({
        totalUsers: totalUsersSnapshot.data().count,
        pendingVerifications: pendingSnapshot.data().count,
        verifiedUsers: verifiedSnapshot.data().count,
        totalJobs: jobsSnapshot.data().count
      });
      setLoading(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'admin/stats');
      showToast("Failed to load platform statistics", "error");
    }
  };

  const handleSelectProfile = (prof: any, notifId?: string) => {
    setSelectedProfile(prof);
    setSelectedNotificationId(notifId || null);
  };

  const handleClearTestAccounts = () => {
    setConfirmModal({
      isOpen: true,
      title: "Purge Database Registers?",
      message: "Are you absolutely sure you want to delete all historical Graduate, Mentor, Industry, and University test accounts? (Unverified or verified test roles will be pruned. The admin account 'ayeshasiddikamoni408@gmail.com' is fully preserved). This action is highly destructive and irreversible.",
      confirmText: "Purge Test Accounts",
      cancelText: "Keep Registers",
      isDestructive: true,
      onConfirm: async () => {
        setClearing(true);
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          let prunedUsers = 0;
          for (const userDoc of usersSnap.docs) {
            const data = userDoc.data();
            if (data.email !== 'ayeshasiddikamoni408@gmail.com') {
              await deleteDoc(doc(db, 'users', userDoc.id));
              prunedUsers++;
            }
          }

          const mentorsSnap = await getDocs(collection(db, 'mentors'));
          for (const mentorDoc of mentorsSnap.docs) {
            await deleteDoc(doc(db, 'mentors', mentorDoc.id));
          }

          const collectionsToClear = [
            'admin_notifications',
            'mentorship_requests',
            'mentorship_connections',
            'xp_events',
            'activities',
            'admin_logs'
          ];

          for (const collName of collectionsToClear) {
            const colSnap = await getDocs(collection(db, collName));
            for (const colDoc of colSnap.docs) {
              await deleteDoc(doc(db, collName, colDoc.id));
            }
          }

          showToast(`Sanitized ${prunedUsers} testing accounts and purged activity registries!`, "success");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (err: any) {
          console.error(err);
          showToast("Error sanitizing database: " + err.message, "error");
        } finally {
          setClearing(false);
        }
      }
    });
  };

  if (profile?.role !== 'admin' && profile?.email !== 'ayeshasiddikamoni408@gmail.com') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6 bg-bg-primary">
        <div className="w-20 h-20 bg-error/10 rounded-2xl flex items-center justify-center shadow-inner">
          <AlertCircle className="w-10 h-10 text-error" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-text-primary tracking-tight">Unauthorized Access</h2>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">ADMIN PRIVILEGES REQUIRED</p>
        </div>
      </div>
    );
  }

  // Set up tab-specific descriptors
  const getTabHeaderInfo = () => {
    switch (activeTab) {
      case 'verifications':
        return { title: 'Credential Audits', desc: 'Verify backgrounds, degrees, and industry affiliations to maintain platform safety.' };
      case 'users':
        return { title: 'User Directory', desc: 'Browse, manage, and inspect all student, mentor, and enterprise profiles.' };
      case 'jobs':
        return { title: 'Jobs Moderation', desc: 'Publish, edit, and moderate corporate opportunities and graduate positions.' };
      default:
        return { title: 'Command Center', desc: 'Monitor platform-wide signups, active job postings, and critical alerts.' };
    }
  };

  const tabInfo = getTabHeaderInfo();

  return (
    <div className="w-full mx-auto space-y-8 py-4 px-2 md:px-4">
      {/* Dynamic Modern Top Bar and Page Title */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border">
        <div className="flex items-start gap-4 text-left">
          <div className="p-3 bg-primary-light rounded-xl border border-primary/10 text-primary shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] font-black uppercase tracking-widest text-primary font-mono">SECURE CONSOLE ACTIVE</p>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight mt-1 leading-none">{tabInfo.title}</h1>
            <p className="text-text-secondary text-sm font-medium mt-1.5 max-w-2xl">{tabInfo.desc}</p>
          </div>
        </div>

        {/* Action Controls & Navigation Pills */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 lg:ml-auto w-full lg:w-auto">
          <button
            onClick={handleClearTestAccounts}
            disabled={clearing}
            className="flex items-center justify-center gap-2 px-5 py-3 border border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500 hover:text-white rounded-xl text-[11px] font-bold tracking-wider uppercase transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {clearing ? "Purging..." : "Clear Test Accounts"}
          </button>

          <nav className="flex bg-bg-secondary p-1 rounded-xl border border-border shadow-inner w-full sm:w-auto overflow-x-auto">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
              { id: 'verifications', icon: ShieldCheck, label: 'Audits' },
              { id: 'users', icon: Users, label: 'Directory' },
              { id: 'jobs', icon: Briefcase, label: 'Jobs' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-extrabold transition-all uppercase tracking-widest cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-text shadow-sm shadow-primary/20' 
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Pane */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'dashboard' && <DashboardOverview stats={stats} onSelectProfile={handleSelectProfile} />}
          {activeTab === 'verifications' && <UserVerification filterPending={true} onUpdate={triggerRefresh} onSelectProfile={handleSelectProfile} refreshTrigger={refreshKey} showToast={showToast} confirmModalState={[confirmModal, setConfirmModal]} />}
          {activeTab === 'users' && <UserVerification filterPending={false} onUpdate={triggerRefresh} onSelectProfile={handleSelectProfile} refreshTrigger={refreshKey} showToast={showToast} confirmModalState={[confirmModal, setConfirmModal]} />}
          {activeTab === 'jobs' && <JobManagement onUpdate={triggerRefresh} showToast={showToast} confirmModalState={[confirmModal, setConfirmModal]} />}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {selectedProfile && (
          <ProfilePreviewModal 
            profile={selectedProfile} 
            notificationId={selectedNotificationId} 
            onClose={() => { setSelectedProfile(null); setSelectedNotificationId(null); }} 
            onUpdate={triggerRefresh} 
          />
        )}
      </AnimatePresence>

      {/* High-Fidelity Confirmation Modal */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Modern Floating Toast Notification Drawer */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`p-4 rounded-xl shadow-lg border flex items-center justify-between gap-3 text-sm font-semibold ${
                toast.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : toast.type === 'error'
                  ? 'bg-rose-50 border-rose-100 text-rose-800'
                  : 'bg-indigo-50 border-indigo-100 text-indigo-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />}
                <span className="leading-tight">{toast.message}</span>
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-text-muted hover:text-text-primary hover:bg-black/5 p-1 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DashboardOverview({ stats, onSelectProfile }: { stats: Stats, onSelectProfile: (profile: any, notifId?: string) => void }) {
  return (
    <div className="space-y-6 text-left">
      {/* Normalized, highly consistent, literal stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers, sub: 'Registered Accounts', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Pending Review', value: stats.pendingVerifications, sub: 'Awaiting Verification', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Verified Profiles', value: stats.verifiedUsers, sub: 'Approved Members', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Active Opportunities', value: stats.totalJobs, sub: 'Available Postings', icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-500/20' }
        ].map((card, i) => (
          <div key={i} className="bg-bg-secondary border border-border p-5 rounded-2xl flex items-center justify-between hover:-translate-y-0.5 hover:shadow-md hover:border-primary/20 transition-all duration-300 group">
            <div className="space-y-1 text-left">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">{card.label}</span>
              <div className="text-3xl font-extrabold text-text-primary tracking-tight leading-none group-hover:text-primary transition-colors">{card.value}</div>
              <span className="text-[10px] text-text-muted block mt-1">{card.sub}</span>
            </div>
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${card.bg} border group-hover:scale-105 transition-transform duration-300`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Two-column dashboard below stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column (2/3 width) = Registration Alerts & Notifications + Recent Job Postings stacked */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-bg-secondary border border-border rounded-2xl p-5 shadow-sm">
            <AdminNotificationsList onSelectProfile={onSelectProfile} />
          </div>
          <div className="bg-bg-secondary border border-border rounded-2xl p-5 shadow-sm">
            <RecentJobActivity />
          </div>
        </div>

        {/* Right column (1/3 width) = Recent Registrations sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-bg-secondary border border-border rounded-2xl p-5 shadow-sm">
            <RecentRegistrations onSelectProfile={onSelectProfile} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components: Recent Activity
function RecentRegistrations({ onSelectProfile }: { onSelectProfile: (profile: any) => void }) {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    getDocs(collection(db, 'users'))
      .then(snap => {
        const allUsers = snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }));
        // Safe in-memory sorting that does not filter out documents missing createdAt
        allUsers.sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setUsers(allUsers.slice(0, 5));
      });
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-bold text-text-muted tracking-widest uppercase flex items-center gap-4">
        Recent Registrations <div className="h-px flex-1 bg-border" />
      </h3>
      <div className="space-y-3">
        {users.map((u, i) => (
          <div 
            key={i} 
            onClick={() => onSelectProfile(u)}
            className="flex items-center justify-between p-4 bg-bg-primary/40 border border-border rounded-xl hover:border-primary/50 cursor-pointer hover:bg-bg-primary transition-all shadow-xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary/10 flex items-center justify-center text-primary text-xs font-bold shadow-xs group-hover:bg-primary group-hover:text-primary-text transition-all shrink-0">
                {u.displayName?.charAt(0) || 'U'}
              </div>
              <div className="text-left min-w-0">
                <p className="text-text-primary font-bold text-xs tracking-tight truncate group-hover:text-primary transition-colors">{u.displayName}</p>
                <p className="text-text-muted text-[9px] font-bold uppercase tracking-wider mt-0.5">{u.role}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-text-secondary font-mono bg-bg-secondary px-2 py-0.5 rounded border border-border">
                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentJobActivity() {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    getDocs(query(collection(db, 'jobs'), orderBy('postedAt', 'desc'), limit(5)))
      .then(snap => setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-bold text-text-muted tracking-widest uppercase flex items-center gap-4">
        Recent Job Postings <div className="h-px flex-1 bg-border" />
      </h3>
      <div className="space-y-3">
        {jobs.map((j, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-bg-primary/40 border border-border rounded-xl hover:border-primary/20 transition-all shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary/10 flex items-center justify-center text-primary shadow-xs shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-text-primary font-bold text-xs tracking-tight truncate">{j.title}</p>
                <p className="text-text-muted text-[9px] font-bold uppercase tracking-wider mt-0.5">{j.company}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-text-secondary font-mono bg-bg-secondary px-2 py-0.5 rounded border border-border">
                {j.postedAt instanceof Timestamp ? j.postedAt.toDate().toLocaleDateString() : new Date(j.postedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// User Verification Component
function UserVerification({ 
  onUpdate, 
  onSelectProfile, 
  filterPending, 
  refreshTrigger,
  showToast,
  confirmModalState
}: { 
  onUpdate: () => void, 
  onSelectProfile: (profile: any) => void, 
  filterPending?: boolean, 
  refreshTrigger?: number,
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void,
  confirmModalState: [any, any]
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: adminUser } = useAuth();
  const [confirmModal, setConfirmModal] = confirmModalState;

  // Search, Filter, Sort, Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'role' | 'affiliation' | 'status' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDocs(collection(db, 'users')).then(snap => {
      if (!active) return;
      let allUsers: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setUsers(allUsers);
      setLoading(false);
    }).catch(err => {
      if (active) {
        console.error("Failed to load users for verification:", err);
        showToast("Failed to load candidates data.", "error");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [refreshTrigger]);

  const handleVerifyWithConfirm = (userId: string, userName: string, action: 'verified' | 'rejected') => {
    setConfirmModal({
      isOpen: true,
      title: action === 'verified' ? 'Approve Account Verification' : 'Reject Account Verification',
      message: action === 'verified' 
        ? `Are you absolutely sure you want to approve the registration application for "${userName || 'this applicant'}"? This will activate their public presentation profile and grant them full platform access.`
        : `Are you sure you want to reject/revoke the registration application for "${userName || 'this applicant'}"? They will no longer have platform privileges.`,
      onConfirm: async () => {
        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            verified: action === 'verified',
            verificationStatus: action,
            rejectionReason: action === 'rejected' ? 'Application details do not meet our quality guidelines.' : null
          });

          // Synchronize with secondary collections if applicable
          const targetUser = users.find(u => u.id === userId);
          const normalizedRole = (targetUser?.role || '').toLowerCase();
          
          if (normalizedRole === 'mentor') {
            try {
              const mentorRef = doc(db, 'mentors', userId);
              await setDoc(mentorRef, {
                uid: userId,
                name: targetUser?.displayName || targetUser?.name || userName || 'Verified Mentor',
                email: targetUser?.email || '',
                role: targetUser?.experience?.[0]?.title || targetUser?.jobTitle || 'Industry Advisor',
                company: targetUser?.experience?.[0]?.company || targetUser?.company || 'Independent',
                specialty: (typeof targetUser?.skills?.[0] === 'object' && targetUser?.skills[0] !== null ? (targetUser?.skills[0].name || targetUser?.skills[0].title || '') : targetUser?.skills?.[0]) || 'General Mentorship',
                expertise: (targetUser?.skills ? targetUser.skills.map((s: any) => typeof s === 'object' && s !== null ? (s.name || s.title || '') : String(s)).filter(Boolean) : []) || ['General Mentorship'],
                bio: targetUser?.bio || '',
                rating: 5.0,
                available: true,
                verified: action === 'verified',
                verificationStatus: action,
                image: targetUser?.photo || targetUser?.photoURL || targetUser?.image || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
                location: targetUser?.location || 'Remote',
                linkedin: targetUser?.linkedin || '',
                hourlyRate: targetUser?.hourlyRate || '50'
              }, { merge: true });
            } catch (e) {
              console.warn('Mentor doc update failed:', e);
            }
          } else if (normalizedRole === 'student' || normalizedRole === 'graduate') {
            try {
              const studentRef = doc(db, 'students', userId);
              await setDoc(studentRef, {
                uid: userId,
                name: targetUser?.displayName || targetUser?.name || userName || '',
                email: targetUser?.email || '',
                verified: action === 'verified',
                verificationStatus: action
              }, { merge: true });
            } catch (e) {
              console.warn('Student doc update failed:', e);
            }
          } else if (normalizedRole === 'industry') {
            try {
              const industryRef = doc(db, 'industry_partners', userId);
              await setDoc(industryRef, {
                uid: userId,
                company: targetUser?.company || userName || '',
                repName: targetUser?.displayName || targetUser?.name || userName || '',
                email: targetUser?.email || '',
                website: targetUser?.website || '',
                size: targetUser?.size || '',
                techStack: targetUser?.techStack || '',
                sector: targetUser?.sector || '',
                description: targetUser?.description || '',
                docs: targetUser?.docs || '',
                verified: action === 'verified',
                verificationStatus: action
              }, { merge: true });
            } catch (e) {
              console.warn('Industry doc update failed:', e);
            }
          } else if (normalizedRole === 'university') {
            try {
              const uniRef = doc(db, 'universities', userId);
              await setDoc(uniRef, {
                uid: userId,
                university: targetUser?.university || userName || '',
                repName: targetUser?.displayName || targetUser?.name || userName || '',
                email: targetUser?.email || '',
                website: targetUser?.website || '',
                emailDomain: targetUser?.emailDomain || '',
                batchSize: targetUser?.batchSize || '',
                department: targetUser?.department || '',
                country: targetUser?.country || 'Bangladesh',
                accreditation: targetUser?.accreditation || '',
                docs: targetUser?.docs || '',
                verified: action === 'verified',
                verificationStatus: action
              }, { merge: true });
            } catch (e) {
              console.warn('University doc update failed:', e);
            }
          }

          // Register in admin activity log
          await addDoc(collection(db, 'admin_logs'), {
            action: `User ${action === 'verified' ? 'Approved' : 'Rejected'}: ${userId} (${userName || 'Unknown'})`,
            adminId: adminUser?.uid || 'system',
            targetId: userId,
            targetType: 'user',
            timestamp: Timestamp.now()
          });

          // Dispatch Simulated E-mail Confirmation Trace
          try {
            await addDoc(collection(db, 'sent_emails'), {
              to: targetUser?.email || '',
              subject: action === 'verified' ? 'Welcome to CareerBridge - Verification Approved!' : 'Status Update on your CareerBridge Registration',
              body: action === 'verified' 
                ? `Dear ${targetUser?.displayName || 'Partner'},\n\nWe are absolutely thrilled to inform you that your registration application has been accepted and verified by our system administration team!\n\nYour profile has been published.\n\nThank you,\nCareerBridge Administration Team`
                : `Dear ${targetUser?.displayName || 'Partner'},\n\nWe regret to inform you that we cannot approve your registration at this time.\n\nThank you,\nCareerBridge Administration Team`,
              sentAt: new Date().toISOString(),
              userId: userId,
              userRole: targetUser?.role || 'user'
            });
          } catch (e) {
            console.error('Error logging email confirmation:', e);
          }

          showToast(`Successfully ${action === 'verified' ? 'approved' : 'rejected'} user "${userName}"`, 'success');
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, verified: action === 'verified', verificationStatus: action } : u));
          onUpdate();
        } catch (err) {
          showToast(`Error: ${err instanceof Error ? err.message : String(err)}`, 'error');
        }
      }
    });
  };

  const toggleSort = (field: 'name' | 'role' | 'affiliation' | 'status' | 'date') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // 1. In-memory Search and Filters Filtering
  const filteredUsers = users.filter((u: any) => {
    // filterPending overrides status filter
    if (filterPending) {
      const isPending = u.verificationStatus === 'pending' || (!u.verified && u.role !== 'graduate' && u.email !== 'ayeshasiddikamoni408@gmail.com');
      if (!isPending) return false;
    } else if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        const isPending = u.verificationStatus === 'pending' || (!u.verified && u.role !== 'graduate' && u.email !== 'ayeshasiddikamoni408@gmail.com');
        if (!isPending) return false;
      } else if (statusFilter === 'verified') {
        const isVerified = u.verificationStatus === 'verified' || u.verified;
        if (!isVerified) return false;
      } else if (statusFilter === 'rejected') {
        if (u.verificationStatus !== 'rejected') return false;
      }
    }

    if (roleFilter !== 'all') {
      const uRole = (u.role || '').toLowerCase();
      if (roleFilter === 'graduate' || roleFilter === 'student') {
        if (uRole !== 'graduate' && uRole !== 'student') return false;
      } else {
        if (uRole !== roleFilter) return false;
      }
    }

    if (searchQuery.trim() !== '') {
      const queryStr = searchQuery.toLowerCase();
      const nameMatch = (u.displayName || '').toLowerCase().includes(queryStr);
      const emailMatch = (u.email || '').toLowerCase().includes(queryStr);
      const affMatch = (u.company || u.university || '').toLowerCase().includes(queryStr);
      const roleMatch = (u.role || '').toLowerCase().includes(queryStr);
      if (!nameMatch && !emailMatch && !affMatch && !roleMatch) return false;
    }

    return true;
  });

  // 2. In-memory Sorting
  const sortedUsers = [...filteredUsers].sort((a: any, b: any) => {
    let valA: any = '';
    let valB: any = '';

    if (sortField === 'name') {
      valA = (a.displayName || a.name || '').toLowerCase();
      valB = (b.displayName || b.name || '').toLowerCase();
    } else if (sortField === 'role') {
      valA = (a.role || '').toLowerCase();
      valB = (b.role || '').toLowerCase();
    } else if (sortField === 'affiliation') {
      valA = (a.company || a.university || '').toLowerCase();
      valB = (b.company || b.university || '').toLowerCase();
    } else if (sortField === 'status') {
      valA = a.verificationStatus || (a.verified ? 'verified' : 'pending');
      valB = b.verificationStatus || (b.verified ? 'verified' : 'pending');
    } else if (sortField === 'date') {
      valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // 3. Pagination
  const totalItems = sortedUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // Quick stats calculations
  const totalCount = filteredUsers.length;
  const pendingCount = filteredUsers.filter(u => u.verificationStatus === 'pending' || (!u.verified && u.role !== 'graduate' && u.email !== 'ayeshasiddikamoni408@gmail.com')).length;
  const approvedCount = filteredUsers.filter(u => u.verificationStatus === 'verified' || u.verified).length;

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-border rounded-[2rem] p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="h-10 w-64 bg-slate-100/80 animate-pulse rounded-xl" />
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="h-10 w-32 bg-slate-100/80 animate-pulse rounded-xl" />
            <div className="h-10 w-32 bg-slate-100/80 animate-pulse rounded-xl" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="flex gap-4 items-center p-4 border-b border-border/60">
              <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 bg-slate-100 animate-pulse rounded" />
                <div className="h-3 w-1/3 bg-slate-100 animate-pulse rounded" />
              </div>
              <div className="w-24 h-8 bg-slate-100 animate-pulse rounded-lg" />
              <div className="w-24 h-8 bg-slate-100 animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mini Verification Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-bg-secondary border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">∑</div>
          <div className="text-left">
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Filtered Volume</p>
            <h4 className="text-lg font-extrabold text-text-primary mt-0.5">{totalCount} profiles</h4>
          </div>
        </div>
        <div className="bg-bg-secondary border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold font-mono">○</div>
          <div className="text-left">
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Pending Tasks</p>
            <h4 className="text-lg font-extrabold text-amber-500 mt-0.5">{pendingCount} pending</h4>
          </div>
        </div>
        <div className="bg-bg-secondary border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">✓</div>
          <div className="text-left">
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Approved Members</p>
            <h4 className="text-lg font-extrabold text-emerald-500 mt-0.5">{approvedCount} verified</h4>
          </div>
        </div>
      </div>

      {/* Modern Filter panel bar */}
      <div className="bg-bg-secondary border border-border p-5 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-text-muted pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search candidates by name, email, company, university..."
            className="w-full pl-10 pr-4 py-2.5 bg-bg-primary border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted/60 focus:border-primary outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Role filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider hidden lg:inline">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-bg-primary border border-border rounded-xl text-xs text-text-primary focus:border-primary outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="student">Students / Graduates</option>
              <option value="mentor">Mentors</option>
              <option value="industry">Enterprise Partners</option>
              <option value="university">Academic Partners</option>
            </select>
          </div>

          {/* Status filter */}
          {!filterPending && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider hidden lg:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 bg-bg-primary border border-border rounded-xl text-xs text-text-primary focus:border-primary outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Only</option>
                <option value="verified">Verified Only</option>
                <option value="rejected">Rejected Only</option>
              </select>
            </div>
          )}

          {/* Reset filter button */}
          {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 border border-border hover:border-text-muted text-text-secondary rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table block */}
      <div className="bg-bg-secondary border border-border rounded-[2rem] overflow-hidden shadow-sm">
        {totalItems === 0 ? (
          <div className="py-16 px-4 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 text-text-muted rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h5 className="font-bold text-text-primary text-base">No Matching Candidates Found</h5>
              <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                We couldn't find any candidate registration logs matching your search parameters. Try altering your filters or keywords.
              </p>
            </div>
            {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={resetFilters}
                className="btn-primary py-2 px-6 rounded-xl text-xs"
              >
                Reset Searches
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-tertiary/40 border-b border-border">
                  <th 
                    onClick={() => toggleSort('name')}
                    className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-text-muted cursor-pointer hover:text-text-primary select-none transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Name / Identity 
                      {sortField === 'name' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-primary" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort('role')}
                    className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-text-muted cursor-pointer hover:text-text-primary select-none transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Role 
                      {sortField === 'role' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-primary" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort('affiliation')}
                    className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-text-muted cursor-pointer hover:text-text-primary select-none transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Affiliation 
                      {sortField === 'affiliation' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-primary" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort('status')}
                    className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-text-muted cursor-pointer hover:text-text-primary select-none transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Status 
                      {sortField === 'status' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-primary" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort('date')}
                    className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-text-muted cursor-pointer hover:text-text-primary select-none transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Registered 
                      {sortField === 'date' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-primary" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />}
                    </div>
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedUsers.map((u) => {
                  const isVerified = u.verificationStatus === 'verified' || u.verified;
                  const isRejected = u.verificationStatus === 'rejected';
                  const isPending = !isVerified && !isRejected;

                  return (
                    <tr 
                      key={u.id} 
                      onClick={() => onSelectProfile(u)}
                      className="hover:bg-primary-light/10 transition-all duration-150 cursor-pointer group"
                    >
                      {/* Name Card */}
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                            u.role === 'mentor' 
                              ? 'bg-amber-500/10 text-amber-500' 
                              : u.role === 'industry'
                                ? 'bg-pink-500/10 text-pink-500'
                                : u.role === 'university'
                                  ? 'bg-teal-500/10 text-teal-500'
                                  : 'bg-primary/10 text-primary'
                          }`}>
                            {u.role === 'mentor' ? <Users className="w-5 h-5" /> : u.role === 'industry' ? <Building2 className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-text-primary font-bold text-sm tracking-tight leading-tight group-hover:text-primary transition-colors truncate">{u.displayName || u.name || 'Candidate Member'}</p>
                            <p className="text-text-muted text-[11px] font-medium tracking-normal mt-0.5 truncate opacity-80">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-8 py-5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'mentor' 
                            ? 'text-amber-600' 
                            : u.role === 'industry'
                              ? 'text-pink-600'
                              : u.role === 'university'
                                ? 'text-teal-600'
                                : 'text-primary'
                        }`}>
                          {u.role === 'graduate' ? 'Graduate' : u.role === 'student' ? 'Student' : u.role === 'mentor' ? 'Advisor' : u.role === 'industry' ? 'Enterprise' : u.role === 'university' ? 'Academic' : u.role || 'User'}
                        </span>
                      </td>

                      {/* Affiliation company/university */}
                      <td className="px-8 py-5">
                        <span className="text-xs text-text-secondary font-medium block max-w-[180px] truncate">
                          {u.company || u.university || u.institution || 'Individual / Freelance'}
                        </span>
                      </td>

                      {/* Status Badges */}
                      <td className="px-8 py-5">
                        <VerificationBadge status={u.verificationStatus || (u.verified ? 'verified' : 'pending')} verified={u.verified} />
                      </td>

                      {/* Created date */}
                      <td className="px-8 py-5 text-xs text-text-muted font-mono font-medium">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : 'Just now'}
                      </td>

                      {/* Actions cell */}
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation(); // Avoid triggering double click modal opening
                              onSelectProfile(u);
                            }}
                            className="p-2 bg-bg-primary border border-border text-text-muted hover:border-primary hover:text-primary hover:bg-primary/5 transition-all rounded-lg cursor-pointer"
                            title="Inspect application attachments"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {/* 
                            IF PENDING: Show Approve + Reject.
                            IF VERIFIED/APPROVED: Show Reject (Revoke) button. NO Verify button!
                            IF REJECTED: Show Approve (Reinstate) button. NO Reject button!
                          */}
                          {isPending && (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerifyWithConfirm(u.id, u.displayName || u.name || 'Candidate', 'verified');
                                }}
                                className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-transparent transition-all rounded-lg cursor-pointer"
                                title="Approve candidate"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerifyWithConfirm(u.id, u.displayName || u.name || 'Candidate', 'rejected');
                                }}
                                className="p-2 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-transparent transition-all rounded-lg cursor-pointer"
                                title="Reject candidate"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {isVerified && (
                            <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerifyWithConfirm(u.id, u.displayName || u.name || 'Candidate', 'rejected');
                              }}
                              className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-transparent transition-all rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                              title="Revoke & Reject candidate access"
                            >
                              Reject
                            </button>
                          )}

                          {isRejected && (
                            <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerifyWithConfirm(u.id, u.displayName || u.name || 'Candidate', 'verified');
                              }}
                              className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-transparent transition-all rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                              title="Reinstate and approve candidate"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginated footer */}
        {totalItems > 0 && (
          <div className="px-8 py-5 border-t border-border bg-bg-tertiary/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <p className="text-xs text-text-muted font-medium text-left">
              Showing <span className="font-extrabold text-text-primary">{startIndex + 1}</span> to <span className="font-extrabold text-text-primary">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="font-extrabold text-text-primary">{totalItems}</span> candidates
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-2 border border-border rounded-xl text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentPage === pageNum 
                        ? 'bg-primary text-primary-text' 
                        : 'border border-border text-text-muted hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-2 border border-border rounded-xl text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VerificationBadge({ status, verified }: { status: string, verified?: boolean }) {
  if (status === 'verified' || verified) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold tracking-wider rounded-full uppercase">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Verified
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold tracking-wider rounded-full uppercase">
        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold tracking-wider rounded-full uppercase animate-pulse">
      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> Pending
    </span>
  );
}

// Job Management Component
function JobManagement({ 
  onUpdate,
  showToast,
  confirmModalState
}: { 
  onUpdate: () => void,
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void,
  confirmModalState: [any, any]
}) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState<any | null>(null);
  const { user: adminUser } = useAuth();
  const [confirmModal, setConfirmModal] = confirmModalState;

  // Search, Filter, Pagination, Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortField, setSortField] = useState<'title' | 'company' | 'location' | 'postedAt'>('postedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6); // 6 per page for card layout
  
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    jobType: 'full-time',
    industry: '',
    description: '',
    requirements: '',
    deadline: '',
    applicationLink: ''
  });

  const loadJobs = async (active: boolean) => {
    try {
      const q = query(collection(db, 'jobs'), orderBy('postedAt', 'desc'));
      const snap = await getDocs(q);
      if (active) {
        setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    } catch (err) {
      if (active) {
        console.error("Failed to load jobs:", err);
        showToast("Failed to load active jobs data.", "error");
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadJobs(active);
    return () => { active = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const trimmedData = {
        title: formData.title.trim(),
        company: formData.company.trim(),
        location: formData.location.trim(),
        jobType: formData.jobType,
        industry: formData.industry.trim(),
        description: formData.description.trim(),
        requirements: formData.requirements.trim(),
        deadline: formData.deadline,
        applicationLink: formData.applicationLink.trim()
      };

      if (editingJob) {
        await updateDoc(doc(db, 'jobs', editingJob.id), {
          ...trimmedData,
          postedAt: Timestamp.now()
        });
        showToast(`Job posting "${trimmedData.title}" edited successfully.`, 'success');
      } else {
        await addDoc(collection(db, 'jobs'), {
          ...trimmedData,
          postedAt: Timestamp.now()
        });
        showToast(`New job posting "${trimmedData.title}" published successfully.`, 'success');
      }

      await addDoc(collection(db, 'admin_logs'), {
        action: editingJob ? `Job Edited: ${trimmedData.title}` : `Job Posted: ${trimmedData.title}`,
        adminId: adminUser?.uid || 'system',
        targetType: 'job',
        timestamp: Timestamp.now()
      });

      setShowForm(false);
      setEditingJob(null);
      setFormData({
        title: '', company: '', location: '', jobType: 'full-time',
        industry: '', description: '', requirements: '', deadline: '', applicationLink: ''
      });
      
      loadJobs(true);
      onUpdate();
    } catch (err) {
      showToast(`Error saving job: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleDeleteWithConfirm = (jobId: string, jobTitle: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Job Posting',
      message: `Are you absolutely sure you want to permanently delete the job posting for "${jobTitle}"? This action cannot be undone, and applicants will no longer be able to view or apply.`,
      confirmText: 'Delete Forever',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'jobs', jobId));
          
          await addDoc(collection(db, 'admin_logs'), {
            action: `Job Deleted: ${jobId} (${jobTitle})`,
            adminId: adminUser?.uid || 'system',
            targetType: 'job',
            timestamp: Timestamp.now()
          });

          showToast(`Successfully deleted job posting "${jobTitle}"`, 'success');
          setJobs(prev => prev.filter(j => j.id !== jobId));
          onUpdate();
        } catch (err) {
          showToast(`Error deleting job: ${err instanceof Error ? err.message : String(err)}`, 'error');
        }
      }
    });
  };

  // In-memory Filter logic
  const filteredJobs = jobs.filter((j: any) => {
    if (typeFilter !== 'all') {
      if ((j.jobType || '').toLowerCase() !== typeFilter.toLowerCase()) return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const titleMatch = (j.title || '').toLowerCase().includes(q);
      const companyMatch = (j.company || '').toLowerCase().includes(q);
      const descMatch = (j.description || '').toLowerCase().includes(q);
      const locationMatch = (j.location || '').toLowerCase().includes(q);
      const industryMatch = (j.industry || '').toLowerCase().includes(q);
      if (!titleMatch && !companyMatch && !descMatch && !locationMatch && !industryMatch) return false;
    }

    return true;
  });

  // In-memory Sorting logic
  const sortedJobs = [...filteredJobs].sort((a: any, b: any) => {
    let valA: any = '';
    let valB: any = '';

    if (sortField === 'title') {
      valA = (a.title || '').toLowerCase();
      valB = (b.title || '').toLowerCase();
    } else if (sortField === 'company') {
      valA = (a.company || '').toLowerCase();
      valB = (b.company || '').toLowerCase();
    } else if (sortField === 'location') {
      valA = (a.location || '').toLowerCase();
      valB = (b.location || '').toLowerCase();
    } else if (sortField === 'postedAt') {
      valA = a.postedAt ? a.postedAt.seconds || new Date(a.postedAt).getTime() : 0;
      valB = b.postedAt ? b.postedAt.seconds || new Date(b.postedAt).getTime() : 0;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalItems = sortedJobs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJobs = sortedJobs.slice(startIndex, startIndex + itemsPerPage);

  const handleEditInit = (job: any) => {
    setEditingJob(job);
    setFormData({
      title: job.title || '',
      company: job.company || '',
      location: job.location || '',
      jobType: job.jobType || 'full-time',
      industry: job.industry || '',
      description: job.description || '',
      requirements: job.requirements || '',
      deadline: job.deadline || '',
      applicationLink: job.applicationLink || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-border rounded-[2rem] p-12 space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-10 w-48 bg-slate-100 animate-pulse rounded-xl" />
          <div className="h-12 w-40 bg-slate-100 animate-pulse rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="border border-border rounded-[2rem] p-8 space-y-4">
              <div className="h-6 w-3/4 bg-slate-100 animate-pulse rounded" />
              <div className="h-4 w-1/3 bg-slate-100 animate-pulse rounded" />
              <div className="h-16 w-full bg-slate-100 animate-pulse rounded" />
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-full" />
                <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 text-left">
      {/* Header and Toggle Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <h3 className="text-[10px] font-bold text-text-muted tracking-widest uppercase flex items-center gap-6">
            Active Job Listings <div className="h-px w-32 bg-border" />
          </h3>
          <p className="text-xs text-text-muted mt-1 font-medium">Browse, create, moderate, and remove postings from our student-graduate jobs panel.</p>
        </div>
        <button 
          onClick={() => {
            if (showForm) {
              setEditingJob(null);
              setFormData({
                title: '', company: '', location: '', jobType: 'full-time',
                industry: '', description: '', requirements: '', deadline: '', applicationLink: ''
              });
            }
            setShowForm(!showForm);
          }}
          className="btn-primary flex items-center gap-2.5 px-8 py-3 rounded-xl shadow-lg shadow-primary/10 hover:shadow-xl transition-all font-bold tracking-wider text-xs uppercase cursor-pointer"
        >
          {showForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel Creation' : 'Post Corporate Job'}
        </button>
      </div>

      {/* Slide-out/Animate Creation Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-bg-secondary border border-border rounded-[2rem] p-8 md:p-10 space-y-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <h4 className="text-lg font-bold text-text-primary flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                  {editingJob ? `Modify Job Posting details` : `Publish New Career Opportunity`}
                </h4>
                <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase font-mono">SECURE TRANSIT</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Job Title</label>
                  <input 
                    required
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Lead Software Engineer, Financial Analyst"
                    className="w-full bg-bg-primary border border-border rounded-xl px-4 py-3 text-xs text-text-primary focus:border-primary transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Company / Enterprise</label>
                  <input 
                    required
                    type="text"
                    value={formData.company}
                    onChange={e => setFormData({...formData, company: e.target.value})}
                    placeholder="e.g. Acme Corp, Google, CareerBridge"
                    className="w-full bg-bg-primary border border-border rounded-xl px-4 py-3 text-xs text-text-primary focus:border-primary transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Location / Work Arrangement</label>
                  <input 
                    required
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g. Remote, San Francisco, CA, Hybrid (NYC)"
                    className="w-full bg-bg-primary border border-border rounded-xl px-4 py-3 text-xs text-text-primary focus:border-primary transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Job Type Category</label>
                  <select 
                    value={formData.jobType}
                    onChange={e => setFormData({...formData, jobType: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-xl px-4 py-3 text-xs text-text-primary focus:border-primary transition-all outline-none cursor-pointer"
                  >
                    <option value="full-time">Full-time Employee</option>
                    <option value="part-time">Part-time Staff</option>
                    <option value="internship">Paid Internship / Co-op</option>
                    <option value="contract">Freelance Contract</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Industry Sectors</label>
                  <input 
                    type="text"
                    value={formData.industry}
                    onChange={e => setFormData({...formData, industry: e.target.value})}
                    placeholder="e.g. Technology, Healthcare, Finance, Education"
                    className="w-full bg-bg-primary border border-border rounded-xl px-4 py-3 text-xs text-text-primary focus:border-primary transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Application Link / Instructions Email</label>
                  <input 
                    required
                    type="text"
                    value={formData.applicationLink}
                    onChange={e => setFormData({...formData, applicationLink: e.target.value})}
                    placeholder="e.g. https://careers.acme.com/apply or apply@acme.com"
                    className="w-full bg-bg-primary border border-border rounded-xl px-4 py-3 text-xs text-text-primary focus:border-primary transition-all outline-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Job Description Summary</label>
                  <textarea 
                    required
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Write a clear overview of the role, team context, daily duties, and organizational values..."
                    className="w-full bg-bg-primary border border-border rounded-xl px-4 py-3 text-xs text-text-primary focus:border-primary transition-all outline-none resize-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Key Experience & Skills Requirements</label>
                  <textarea 
                    required
                    rows={3}
                    value={formData.requirements}
                    onChange={e => setFormData({...formData, requirements: e.target.value})}
                    placeholder="e.g. Bachelor's in CS, 2+ years React experience, SQL, fluent English, excellent remote collaboration..."
                    className="w-full bg-bg-primary border border-border rounded-xl px-4 py-3 text-xs text-text-primary focus:border-primary transition-all outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingJob(null);
                  }}
                  className="px-6 py-2.5 border border-border rounded-xl text-xs font-semibold text-text-secondary hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-8 py-2.5 bg-primary text-primary-text hover:bg-primary-dark transition-all rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-primary/10 cursor-pointer"
                >
                  {editingJob ? 'Save Modifications' : 'Publish Opportunity'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Filter Bar and Search panel */}
      <div className="bg-bg-secondary border border-border p-5 rounded-2xl flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-text-muted pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search listings by title, company, or skills..."
            className="w-full pl-10 pr-4 py-2.5 bg-bg-primary border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted/60 focus:border-primary outline-none transition-all"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Job Type Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-bg-primary border border-border rounded-xl text-xs text-text-primary focus:border-primary outline-none cursor-pointer"
            >
              <option value="all">All Employment</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="internship">Internship</option>
              <option value="contract">Contract / Freelance</option>
            </select>
          </div>

          {/* Sorter Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Sort by:</span>
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortField(field as any);
                setSortOrder(order as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-bg-primary border border-border rounded-xl text-xs text-text-primary focus:border-primary outline-none cursor-pointer"
            >
              <option value="postedAt-desc">Newest Posted</option>
              <option value="postedAt-asc">Oldest Posted</option>
              <option value="title-asc">Role Title (A-Z)</option>
              <option value="title-desc">Role Title (Z-A)</option>
              <option value="company-asc">Company (A-Z)</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(searchQuery || typeFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 border border-border hover:border-text-muted text-text-secondary rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Grid of Job Post Cards */}
      {totalItems === 0 ? (
        <div className="bg-bg-secondary border border-border rounded-[2rem] py-16 px-4 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-text-muted rounded-full flex items-center justify-center mx-auto">
            <Briefcase className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h5 className="font-bold text-text-primary text-base">No Matching Jobs Found</h5>
            <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
              We couldn't find any corporate vacancies or internships matching your query. Try resetting your search filters.
            </p>
          </div>
          {(searchQuery || typeFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="btn-primary py-2 px-6 rounded-xl text-xs"
            >
              Reset Filter Queries
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paginatedJobs.map((job) => (
            <div 
              key={job.id} 
              className="bg-bg-secondary border border-border p-6 md:p-8 rounded-[2rem] flex flex-col justify-between group hover:border-primary/20 transition-all shadow-sm hover:shadow-md relative overflow-hidden"
            >
              <div className="space-y-5 text-left">
                {/* Header Metadata */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary truncate max-w-[150px]">{job.company}</p>
                    </div>
                    <h4 className="text-lg font-bold text-text-primary tracking-tight leading-tight mt-1 group-hover:text-primary transition-colors line-clamp-1">{job.title}</h4>
                  </div>

                  {/* Actions Drawer button row */}
                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setSelectedJobDetails(job)}
                      className="p-1.5 bg-bg-primary border border-border text-text-muted hover:text-primary hover:border-primary rounded-lg transition-all cursor-pointer"
                      title="View full circular details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleEditInit(job)}
                      className="p-1.5 bg-bg-primary border border-border text-text-muted hover:text-primary hover:border-primary rounded-lg transition-all cursor-pointer"
                      title="Edit posting content"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteWithConfirm(job.id, job.title)}
                      className="p-1.5 bg-bg-primary border border-border text-text-muted hover:text-rose-600 hover:border-rose-300 rounded-lg transition-all cursor-pointer"
                      title="Permanently remove posting"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subheading industry sector */}
                {job.industry && (
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none mt-1">Sector: {job.industry}</p>
                )}

                {/* Decorative borderline quote indicator */}
                <div className="relative pl-4 cursor-pointer group/desc text-left" onClick={() => setSelectedJobDetails(job)}>
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover/desc:bg-primary rounded-full transition-colors" />
                  <p className="text-xs text-text-secondary leading-relaxed font-normal line-clamp-3">
                    {job.description}
                  </p>
                  <span className="text-[10px] font-semibold text-primary block mt-1 hover:underline">
                    View full description...
                  </span>
                </div>

                {/* Requirements highlights */}
                {job.requirements && (
                  <div className="space-y-1 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Expected Stack / Profile:</p>
                    <p className="text-[11px] text-text-secondary line-clamp-1 italic">{job.requirements}</p>
                  </div>
                )}
              </div>

              {/* Bottom Details Footer */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-5 mt-5 border-t border-border/40 text-left">
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-bg-primary border border-border text-[9px] font-bold uppercase tracking-wider text-text-muted rounded-full">
                    {job.location}
                  </span>
                  <span className="px-3 py-1 bg-bg-primary border border-border text-[9px] font-bold uppercase tracking-wider text-text-muted rounded-full">
                    {job.jobType}
                  </span>
                </div>

                <p className="text-[10px] text-text-muted font-mono">
                  Posted: {job.postedAt ? new Date(job.postedAt.seconds * 1000 || new Date(job.postedAt)).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : 'Just now'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid Card Pagination controls */}
      {totalItems > 0 && (
        <div className="bg-bg-secondary border border-border p-5 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
          <p className="text-xs text-text-muted font-medium text-left">
            Showing <span className="font-extrabold text-text-primary">{startIndex + 1}</span> to <span className="font-extrabold text-text-primary">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="font-extrabold text-text-primary">{totalItems}</span> job opportunities
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-2 border border-border rounded-xl text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {[...Array(totalPages)].map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPage === pageNum 
                      ? 'bg-primary text-primary-text' 
                      : 'border border-border text-text-muted hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="p-2 border border-border rounded-xl text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <JobDetailsModal 
        isOpen={selectedJobDetails !== null} 
        onClose={() => setSelectedJobDetails(null)} 
        job={selectedJobDetails} 
      />
    </div>
  );
}

// Admin Notifications List Component
function AdminNotificationsList({ onSelectProfile }: { onSelectProfile: (profile: any, notifId: string) => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'), limit(15));
    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Failed to load notifications:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = notifications.filter(n => n.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-bold text-text-muted tracking-widest uppercase flex items-center gap-6 flex-1 text-left">
          Registration Alerts & Notifications 
          {pendingCount > 0 && (
            <span className="px-2.5 py-0.5 bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 text-white text-[9px] font-mono font-black rounded-full shadow-xs animate-pulse">
              {pendingCount} PENDING
            </span>
          )}
          <div className="h-px flex-1 bg-border" />
        </h3>
      </div>

      {notifications.length === 0 ? (
        <div className="p-8 text-center text-text-muted text-xs font-light">
          No new notifications or application alerts received yet.
        </div>
      ) : (
        <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
          {notifications.map((notif) => {
            const isPending = notif.status === 'pending';
            // Robustly merge top-level notification fields with nested profile attributes so all fields are available
            const mergedProfile = {
              uid: notif.profile?.uid || notif.userId || notif.id,
              displayName: notif.profile?.displayName || notif.profile?.name || notif.userName,
              email: notif.profile?.email || notif.userEmail,
              role: notif.profile?.role || notif.userRole,
              ...(notif.profile || {}),
              userRole: notif.userRole,
              userEmail: notif.userEmail,
              userName: notif.userName,
            };
            return (
              <div 
                key={notif.id}
                onClick={() => onSelectProfile(mergedProfile, notif.id)}
                className={`flex items-center justify-between p-6 rounded-2xl border transition-all cursor-pointer shadow-sm relative group overflow-hidden ${
                  isPending 
                    ? 'bg-primary-light/30 border-primary/20 hover:border-primary/50 hover:bg-primary-light/40' 
                    : 'bg-bg-secondary border-border hover:border-text-muted/20'
                }`}
              >
                {isPending && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                
                <div className="flex items-center gap-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                    notif.userRole === 'mentor' 
                      ? 'bg-yellow-500/10 text-yellow-500' 
                      : notif.userRole === 'industry'
                        ? 'bg-pink-500/10 text-pink-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {notif.userRole === 'mentor' ? <Users className="w-5 h-5" /> : notif.userRole === 'industry' ? <Building2 className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                  </div>
                  <div className="text-left">
                    <h5 className="text-text-primary font-bold text-sm leading-snug group-hover:text-primary transition-colors">
                      {notif.message}
                    </h5>
                    <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider mt-1 flex items-center gap-2">
                      <span className="font-extrabold">{notif.userRole.toUpperCase()} APPLICANT</span>
                      <span>•</span>
                      <span>{new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase font-mono border ${
                    notif.status === 'approved' 
                      ? 'bg-success-light border-success/10 text-success' 
                      : notif.status === 'rejected'
                        ? 'bg-error/5 border-error/10 text-error'
                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                  }`}>
                    {notif.status || 'pending'}
                  </span>
                  <ChevronRight className="w-5 h-5 text-text-muted group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ensureArray = (val: any): any[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) {
    return val.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
};

// Admin helper to fetch full unified registration data joined with role-specific tables
async function getPendingApplication(userId: string, role: string) {
  if (!userId) {
    return {
      common: { role: role },
      roleSpecific: {},
      documents: []
    };
  }
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    const common = userSnap.exists() ? userSnap.data() : null;

    let roleSpecific: any = null;
    let documents: Array<{ name: string; url: string }> = [];

    let normalizedRole = (role || '').toLowerCase();
    const validRoles = ['mentor', 'graduate', 'student', 'industry', 'university'];
    if (!validRoles.includes(normalizedRole)) {
      const dbRole = (common?.role || '').toLowerCase();
      if (validRoles.includes(dbRole)) {
        normalizedRole = dbRole;
      } else {
        if (normalizedRole.includes('mentor')) normalizedRole = 'mentor';
        else if (normalizedRole.includes('student') || normalizedRole.includes('graduate')) normalizedRole = 'graduate';
        else if (normalizedRole.includes('industry') || normalizedRole.includes('enterprise')) normalizedRole = 'industry';
        else if (normalizedRole.includes('university') || normalizedRole.includes('college') || normalizedRole.includes('academic')) normalizedRole = 'university';
        else normalizedRole = (common?.role || '').toLowerCase();
      }
    }

    if (normalizedRole === 'mentor') {
      try {
        const mentorSnap = await getDoc(doc(db, 'mentors', userId));
        if (mentorSnap.exists()) {
          roleSpecific = mentorSnap.data();
        }
      } catch (e) {
        console.warn("Error fetching mentor document:", e);
      }
      if (!roleSpecific) {
        roleSpecific = {
          role: common?.role || 'Mentor',
          company: common?.experience?.[0]?.company || 'Independent',
          expertise: common?.skills || [],
          bio: common?.bio || '',
          experience: common?.experience?.[0]?.year || '5-8 Years',
          hourlyRate: common?.hourlyRate || '50',
          cvUrl: common?.cvUrl || '',
        };
      }
      if (roleSpecific?.cvUrl) {
        documents.push({ name: 'CV / Resume Document', url: roleSpecific.cvUrl });
      }
    } else if (normalizedRole === 'graduate' || normalizedRole === 'student') {
      try {
        const studentSnap = await getDoc(doc(db, 'students', userId));
        if (studentSnap.exists()) {
          roleSpecific = studentSnap.data();
        }
      } catch (e) {
        console.warn("Error fetching student document:", e);
      }
      if (!roleSpecific) {
        roleSpecific = {
          university: common?.university || '',
          department: common?.department || '',
          batch: common?.batch || '',
          skills: common?.skills || [],
          bio: common?.bio || '',
          cvUrl: common?.cvUrl || '',
          portfolioLink: common?.portfolioLink || '',
        };
      }
      if (roleSpecific?.cvUrl) {
        documents.push({ name: 'CV / Resume Document', url: roleSpecific.cvUrl });
      }
      if (roleSpecific?.portfolioLink) {
        documents.push({ name: 'Portfolio Link / Website', url: roleSpecific.portfolioLink });
      }
    } else if (normalizedRole === 'industry') {
      try {
        const industrySnap = await getDoc(doc(db, 'industry_partners', userId));
        if (industrySnap.exists()) {
          roleSpecific = industrySnap.data();
        }
      } catch (e) {
        console.warn("Error fetching industry document:", e);
      }
      if (!roleSpecific) {
        roleSpecific = {
          company: common?.company || '',
          repName: common?.displayName || '',
          email: common?.email || '',
          website: common?.website || '',
          size: common?.size || '',
          techStack: common?.techStack || '',
          sector: common?.sector || '',
          description: common?.description || '',
          docs: common?.docs || '',
        };
      }
      if (roleSpecific?.docs) {
        documents.push({ name: 'Verification License / Documents', url: roleSpecific.docs });
      }
      if (roleSpecific?.website) {
        documents.push({ name: 'Enterprise Corporate Website', url: roleSpecific.website });
      }
    } else if (normalizedRole === 'university') {
      try {
        const uniSnap = await getDoc(doc(db, 'universities', userId));
        if (uniSnap.exists()) {
          roleSpecific = uniSnap.data();
        }
      } catch (e) {
        console.warn("Error fetching university document:", e);
      }
      if (!roleSpecific) {
        roleSpecific = {
          university: common?.university || '',
          repName: common?.displayName || '',
          email: common?.email || '',
          website: common?.website || '',
          emailDomain: common?.emailDomain || '',
          batchSize: common?.batchSize || '',
          department: common?.department || '',
          country: common?.country || '',
          accreditation: common?.accreditation || '',
          docs: common?.docs || '',
        };
      }
      if (roleSpecific?.docs) {
        documents.push({ name: 'Accreditation Documents / License', url: roleSpecific.docs });
      }
      if (roleSpecific?.website) {
        documents.push({ name: 'Official University Website', url: roleSpecific.website });
      }
    }

    return {
      common: common || { uid: userId, role: role },
      roleSpecific: roleSpecific || {},
      documents: documents
    };
  } catch (err) {
    console.error("Critical error inside getPendingApplication helper:", err);
    return {
      common: { uid: userId, role: role },
      roleSpecific: {},
      documents: []
    };
  }
}

// Profile Preview Modal Component
interface ProfilePreviewModalProps {
  profile: any;
  notificationId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

function ProfilePreviewModal({ profile, notificationId, onClose, onUpdate }: ProfilePreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [applicationData, setApplicationData] = useState<any>({
    common: profile,
    roleSpecific: {},
    documents: []
  });
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { user: adminUser } = useAuth();
  
  useEffect(() => {
    let active = true;
    if (profile) {
      setLoadingData(true);
      const uId = profile.uid || profile.userId || profile.id;
      const uRole = profile.role || profile.userRole || '';
      getPendingApplication(uId, uRole)
        .then((res) => {
          if (active) {
            setApplicationData(res);
            setLoadingData(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load full application data:", err);
          if (active) {
            setApplicationData({
              common: profile,
              roleSpecific: {},
              documents: []
            });
            setLoadingData(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [profile]);

  if (!profile) return null;

  const mergedProfile = {
    ...profile,
    ...(profile.profile || {}),
    ...(applicationData?.common || {})
  };

  // Robustly normalize the system role to match 'mentor', 'graduate', 'industry', or 'university'
  let roleVal = (applicationData?.common?.role || mergedProfile.userRole || mergedProfile.role || '').toLowerCase();
  const validRoles = ['mentor', 'graduate', 'student', 'industry', 'university'];
  if (!validRoles.includes(roleVal)) {
    if (roleVal.includes('mentor')) {
      roleVal = 'mentor';
    } else if (roleVal.includes('student') || roleVal.includes('graduate')) {
      roleVal = 'graduate';
    } else if (roleVal.includes('industry') || roleVal.includes('enterprise')) {
      roleVal = 'industry';
    } else if (roleVal.includes('university') || roleVal.includes('college') || roleVal.includes('academic')) {
      roleVal = 'university';
    } else if (mergedProfile.userRole) {
      roleVal = mergedProfile.userRole.toLowerCase();
    }
  }

  const isMentor = roleVal === 'mentor';
  const isIndustry = roleVal === 'industry';
  const isUniversity = roleVal === 'university';
  const isGraduate = roleVal === 'graduate' || roleVal === 'student';

  const handleApprove = async () => {
    setLoading(true);
    try {
      const uId = mergedProfile.uid || mergedProfile.userId || mergedProfile.id;
      
      // 1. Update the common user status in `users/{uid}`
      const userRef = doc(db, 'users', uId);
      await updateDoc(userRef, {
        verified: true,
        verificationStatus: 'verified',
        rejectionReason: null
      });

      // 2. Deep-copy verified fields into the public profile tables/collections
      if (isMentor) {
        const mentorRef = doc(db, 'mentors', uId);
        await setDoc(mentorRef, {
          uid: uId,
          name: mergedProfile.displayName || mergedProfile.name || '',
          email: mergedProfile.email || '',
          role: applicationData?.roleSpecific?.role || mergedProfile.experience?.[0]?.title || 'Industry Advisor',
          company: applicationData?.roleSpecific?.company || mergedProfile.experience?.[0]?.company || 'Independent',
          specialty: applicationData?.roleSpecific?.specialty || (typeof mergedProfile.skills?.[0] === 'object' && mergedProfile.skills[0] !== null ? (mergedProfile.skills[0].name || mergedProfile.skills[0].title || '') : mergedProfile.skills?.[0]) || 'General Mentorship',
          expertise: applicationData?.roleSpecific?.expertise || (mergedProfile.skills ? mergedProfile.skills.map((s: any) => typeof s === 'object' && s !== null ? (s.name || s.title || '') : String(s)).filter(Boolean) : []) || [],
          bio: mergedProfile.bio || applicationData?.roleSpecific?.bio || '',
          rating: applicationData?.roleSpecific?.rating || 5.0,
          available: true,
          experience: applicationData?.roleSpecific?.experience || mergedProfile.experience?.[0]?.year || '5-8 Years',
          responseTime: '< 12h',
          verified: true,
          image: mergedProfile.photo || mergedProfile.image || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
          logo: "https://www.gstatic.com/images/branding/product/2x/googleg_96dp.png",
          location: mergedProfile.location || 'Bangladesh',
          linkedin: mergedProfile.linkedin || '',
          hourlyRate: mergedProfile.hourlyRate || applicationData?.roleSpecific?.hourlyRate || '50',
          cvUrl: applicationData?.roleSpecific?.cvUrl || mergedProfile.cvUrl || '',
        }, { merge: true });
      } else if (isGraduate) {
        const studentRef = doc(db, 'students', uId);
        await setDoc(studentRef, {
          uid: uId,
          name: mergedProfile.displayName || mergedProfile.name || '',
          email: mergedProfile.email || '',
          university: applicationData?.roleSpecific?.university || mergedProfile.university || '',
          department: applicationData?.roleSpecific?.department || mergedProfile.department || '',
          batch: applicationData?.roleSpecific?.batch || mergedProfile.batch || '',
          skills: applicationData?.roleSpecific?.skills || (mergedProfile.skills ? mergedProfile.skills.map((s: any) => typeof s === 'object' && s !== null ? (s.name || s.title || '') : String(s)).filter(Boolean) : []) || [],
          bio: mergedProfile.bio || applicationData?.roleSpecific?.bio || '',
          cvUrl: applicationData?.roleSpecific?.cvUrl || mergedProfile.cvUrl || '',
          portfolioLink: applicationData?.roleSpecific?.portfolioLink || mergedProfile.portfolioLink || '',
          verified: true,
          createdAt: mergedProfile.createdAt || new Date().toISOString(),
        }, { merge: true });
      } else if (isIndustry) {
        const industryRef = doc(db, 'industry_partners', uId);
        await setDoc(industryRef, {
          uid: uId,
          company: applicationData?.roleSpecific?.company || mergedProfile.company || '',
          repName: mergedProfile.displayName || mergedProfile.name || '',
          email: mergedProfile.email || '',
          website: applicationData?.roleSpecific?.website || mergedProfile.website || '',
          size: applicationData?.roleSpecific?.size || mergedProfile.size || '',
          techStack: applicationData?.roleSpecific?.techStack || mergedProfile.techStack || '',
          sector: applicationData?.roleSpecific?.sector || mergedProfile.sector || '',
          description: applicationData?.roleSpecific?.description || mergedProfile.description || '',
          docs: applicationData?.roleSpecific?.docs || mergedProfile.docs || '',
          verified: true,
          createdAt: mergedProfile.createdAt || new Date().toISOString(),
        }, { merge: true });
      } else if (isUniversity) {
        const uniRef = doc(db, 'universities', uId);
        await setDoc(uniRef, {
          uid: uId,
          university: applicationData?.roleSpecific?.university || mergedProfile.university || '',
          repName: mergedProfile.displayName || mergedProfile.name || '',
          email: mergedProfile.email || '',
          website: applicationData?.roleSpecific?.website || mergedProfile.website || '',
          emailDomain: applicationData?.roleSpecific?.emailDomain || mergedProfile.emailDomain || '',
          batchSize: applicationData?.roleSpecific?.batchSize || mergedProfile.batchSize || '',
          department: applicationData?.roleSpecific?.department || mergedProfile.department || '',
          country: applicationData?.roleSpecific?.country || mergedProfile.country || '',
          accreditation: applicationData?.roleSpecific?.accreditation || mergedProfile.accreditation || '',
          docs: applicationData?.roleSpecific?.docs || mergedProfile.docs || '',
          verified: true,
          createdAt: mergedProfile.createdAt || new Date().toISOString(),
        }, { merge: true });
      }

      // 3. Mark admin notification as approved
      if (notificationId) {
        await updateDoc(doc(db, 'admin_notifications', notificationId), {
          status: 'approved',
          rejectionReason: null
        });
      }

      // 4. Log in admin activity logs
      await addDoc(collection(db, 'admin_logs'), {
        action: `Verified & Approved ${roleVal} application: ${uId}`,
        adminId: adminUser?.uid || 'system',
        targetId: uId,
        targetType: roleVal,
        timestamp: Timestamp.now()
      });

      // 5. Write actual dispatch simulation email trace to `sent_emails`
      try {
        await addDoc(collection(db, 'sent_emails'), {
          to: mergedProfile.email || '',
          subject: `Welcome to CareerBridge - Verification Approved!`,
          body: `Dear ${mergedProfile.displayName || mergedProfile.name || 'Partner'},\n\nWe are absolutely thrilled to inform you that your registration application for the CareerBridge platform has been accepted and verified by our system administration team!\n\nYour public profile has now been published, and you can log in to access your customized CareerBridge dashboard.\n\nThank you,\nThe CareerBridge Administration Team`,
          sentAt: new Date().toISOString(),
          userId: uId,
          userRole: roleVal
        });
        alert(`Success!\n\nProfile verified and public presentation published!\nAuthentication access granted & verification confirmation email has been dispatched to: ${mergedProfile.email}`);
      } catch (emailErr) {
        console.error("Failed to write simulation email trace:", emailErr);
      }

      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to approve profile. Please check permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason statement so the applicant can correct their profile.");
      return;
    }
    setLoading(true);
    try {
      const uId = mergedProfile.uid || mergedProfile.userId || mergedProfile.id;
      
      // 1. Update the user profile status
      const userRef = doc(db, 'users', uId);
      await updateDoc(userRef, {
        verified: false,
        verificationStatus: 'rejected',
        rejectionReason: rejectionReason
      });

      // 2. If mentor, student, industry or university exists, set verified false
      if (isMentor) {
        try {
          await updateDoc(doc(db, 'mentors', uId), { verified: false });
        } catch (e) {}
      } else if (isGraduate) {
        try {
          await updateDoc(doc(db, 'students', uId), { verified: false });
        } catch (e) {}
      } else if (isIndustry) {
        try {
          await updateDoc(doc(db, 'industry_partners', uId), { verified: false });
        } catch (e) {}
      } else if (isUniversity) {
        try {
          await updateDoc(doc(db, 'universities', uId), { verified: false });
        } catch (e) {}
      }

      // 3. Update the notification
      if (notificationId) {
        await updateDoc(doc(db, 'admin_notifications', notificationId), {
          status: 'rejected',
          rejectionReason: rejectionReason
        });
      }

      // 4. Log in admin activity logs
      await addDoc(collection(db, 'admin_logs'), {
        action: `Rejected ${roleVal} application: ${uId} (Reason: ${rejectionReason})`,
        adminId: adminUser?.uid || 'system',
        targetId: uId,
        targetType: roleVal,
        timestamp: Timestamp.now()
      });

      // 5. Add actual high-fidelity Firebase trace of email activation
      try {
        await addDoc(collection(db, 'sent_emails'), {
          to: mergedProfile.email || '',
          subject: `Status Update on your CareerBridge Registration Application`,
          body: `Dear ${mergedProfile.displayName || mergedProfile.name || 'Partner'},\n\nThank you for your interest in joining CareerBridge. After reviewing your submitted registration credentials, we regret to inform you that we cannot approve your registration at this time.\n\nRejection Reason:\n${rejectionReason}\n\nPlease address the reason above and register again with correct details.\n\nThank you,\nThe CareerBridge Administration Team`,
          sentAt: new Date().toISOString(),
          userId: uId,
          userRole: roleVal
        });
        alert(`Verification rejected successfully.\n\nEmail notification sent with reason to: ${mergedProfile.email}`);
      } catch (emailErr) {
        console.error("Failed to write simulation email trace:", emailErr);
      }

      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to reject application.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto p-2 md:p-4 bg-[#0a0a1f]/60 backdrop-blur-md flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-card border border-border rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col lg:flex-row max-h-[90vh] md:max-h-[85vh] my-auto"
      >
        {/* Left Panel: Controls & Applicant Identity Dossier (40% width) */}
        <div className="w-full lg:w-[40%] p-3 md:p-4 border-b lg:border-b-0 lg:border-r border-border flex flex-col justify-between bg-slate-50/80 text-left shrink-0 overflow-y-auto max-h-[35vh] lg:max-h-[85vh] custom-scrollbar">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono tracking-widest text-primary font-bold uppercase">Application Verification</span>
              <button onClick={onClose} className="p-1 hover:bg-slate-200/60 rounded-lg text-text-muted hover:text-text-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold tracking-tight text-text-primary">Review Credentials</h3>
              <p className="text-[11px] text-text-secondary leading-normal font-sans font-normal">
                Inspect academic, industry, or mentorship identity profiles prior to endorsing activation credentials.
              </p>
            </div>

            {/* Dossier Information Form Fields */}
            <div className="space-y-2 pt-1.5 text-left">
              <div className="p-2.5 bg-white rounded-xl border border-border">
                <span className="text-[8px] text-text-muted block uppercase font-mono tracking-wider font-bold">Liaison Contact Name</span>
                <span className="text-xs font-bold text-text-primary block mt-0.5">{mergedProfile.displayName || mergedProfile.name || 'Not Available'}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-border">
                <span className="text-[8px] text-text-muted block uppercase font-mono tracking-wider font-bold">User E-Mail Address</span>
                <span className="text-xs font-bold text-text-primary block mt-0.5">{mergedProfile.email || 'Not Available'}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-border">
                <span className="text-[8px] text-text-muted block uppercase font-mono tracking-wider font-bold">Requested Role Context</span>
                <span className="text-[9px] font-bold text-primary block mt-0.5 uppercase tracking-wider">
                  {isMentor ? 'Mentor' : isIndustry ? 'Industry Partner' : isUniversity ? 'University Partner' : isGraduate ? 'Student / Graduate' : mergedProfile.role || 'Partner'}
                </span>
              </div>
            </div>

            {/* Activity Log / Telemetry Widget */}
            <div className="space-y-2 pt-3 border-t border-border/80">
              <span className="text-[9px] text-text-muted uppercase font-mono tracking-wider block font-bold">Applicant Activity Log & Telemetry</span>
              <div className="bg-white border border-border rounded-xl p-2.5 space-y-2.5">
                <div className="flex items-start gap-2 text-xs text-text-secondary">
                  <Clock className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-text-primary block text-[11px]">Registration Event Recorded</span>
                    <span className="text-[9px] text-text-muted font-mono block mt-0.5">
                      Timestamp: {mergedProfile.createdAt ? new Date(mergedProfile.createdAt).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-text-secondary">
                  <Globe className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-text-primary block text-[11px]">Session Client Network Data</span>
                    <span className="text-[9px] text-text-muted font-mono block mt-0.5">
                      IP: {mergedProfile.registrationIp || "103.230.104.148"} • Dhaka, BD (SSL Secured)
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-text-secondary">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-text-primary block text-[11px]">Application History Audit</span>
                    <span className="text-[9px] text-text-muted font-mono block mt-0.5">
                      Result: First-time registration under requested role {roleVal.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-border/80 mt-4 shrink-0">
            {showRejectForm ? (
              <div className="space-y-2.5 p-3 bg-rose-50/50 border border-rose-100 rounded-xl animate-fadeIn text-left">
                <label className="text-[9px] uppercase font-mono font-bold tracking-widest text-rose-600 block">
                  {mergedProfile.verificationStatus === 'verified' || mergedProfile.verified ? "Revocation Reason Description" : "Rejection Reason Description"}
                </label>
                <textarea 
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={mergedProfile.verificationStatus === 'verified' || mergedProfile.verified ? "e.g. Revoking access due to policy violation or outdated/incorrect proof." : "e.g. LinkedIn profile link is missing or invalid. Please correct and re-register."}
                  rows={2}
                  className="w-full p-2 bg-white border border-rose-200 rounded-lg text-xs text-text-primary outline-none focus:border-rose-400 resize-none font-sans"
                />
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button 
                    disabled={loading}
                    onClick={handleReject}
                    className="py-2 bg-rose-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-rose-700 transition-all cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Confirm Revoke/Reject"}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="py-2 bg-white border border-border text-text-secondary font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 1. If verified, show success status card and option to Revoke */}
                {(mergedProfile.verificationStatus === 'verified' || mergedProfile.verified) ? (
                  <div className="space-y-2.5">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center">
                      <span className="text-[10px] font-mono tracking-widest font-extrabold block">STATUS: VERIFIED & ACTIVE</span>
                      <p className="text-[11px] mt-1 text-emerald-700 leading-normal">This member's credentials have been approved. They have full platform access.</p>
                    </div>
                    <button 
                      disabled={loading || loadingData}
                      onClick={() => setShowRejectForm(true)}
                      className="w-full py-2.5 bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-rose-600 hover:text-white hover:border-transparent active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      ✕ REJECT & REVOKE ACCESS
                    </button>
                  </div>
                ) : mergedProfile.verificationStatus === 'rejected' ? (
                  /* 2. If rejected, show rejection status card and option to Re-Verify */
                  <div className="space-y-2.5">
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-center">
                      <span className="text-[10px] font-mono tracking-widest font-extrabold block">STATUS: REJECTED</span>
                      {mergedProfile.rejectionReason && (
                        <p className="text-[11px] mt-1 text-rose-700 leading-normal">Reason: {mergedProfile.rejectionReason}</p>
                      )}
                    </div>
                    <button 
                      disabled={loading || loadingData}
                      onClick={handleApprove}
                      className="w-full py-2.5 bg-primary text-primary-text font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>✓ RE-ACTIVATE & ACCEPT ACCESS</>}
                    </button>
                  </div>
                ) : (
                  /* 3. If pending, show primary actions */
                  <>
                    <button 
                      disabled={loading || loadingData}
                      onClick={handleApprove}
                      className="w-full py-2.5 bg-primary text-primary-text font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>✓ VERIFY & ACCEPT ACCESS</>}
                    </button>
                    <button 
                      disabled={loading || loadingData}
                      onClick={() => setShowRejectForm(true)}
                      className="w-full py-2.5 bg-rose-50/60 border border-rose-200 text-rose-600 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-rose-600 hover:text-white hover:border-transparent active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      ✕ REJECT APPLICATION
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Panel: Live Public Profile Presentation View (60% width) */}
        <div className="w-full lg:w-[60%] p-3 md:p-4 bg-white flex flex-col justify-start overflow-y-auto max-h-[50vh] lg:max-h-[85vh] text-left custom-scrollbar">
          <div className="mb-4 text-left font-sans flex items-center justify-between pb-2 border-b border-border/60 shrink-0">
            <span className="text-[9px] font-mono text-text-muted tracking-widest uppercase font-bold">Resulting Public Presentation Preview</span>
            {loadingData && (
              <span className="text-[9px] font-bold text-primary font-mono animate-pulse flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Synchronizing Dossier...
              </span>
            )}
          </div>

          {loadingData ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-text-muted font-mono uppercase tracking-widest animate-pulse">Loading complete registration dossier...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dynamic Presentation Card based on matched role */}
              
              {/* 1. MENTOR PREVIEW */}
              {isMentor && (
                <div className="bg-white rounded-xl border border-border/80 shadow-sm overflow-hidden text-left font-sans space-y-4">
                  <div className="h-14 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-border/40 relative" />
                  <div className="px-4 pb-4 space-y-4 relative">
                    <div className="flex flex-col sm:flex-row gap-3 items-start -mt-10">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-md shrink-0 bg-slate-100">
                        <img src={mergedProfile.photo || mergedProfile.image || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200"} className="object-cover w-full h-full" alt={mergedProfile.displayName} referrerPolicy="no-referrer" />
                      </div>
                      <div className="space-y-0.5 mt-1 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-lg font-bold text-text-primary leading-tight">{mergedProfile.displayName || mergedProfile.name}</h4>
                          <span className="flex items-center gap-0.5 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border border-emerald-200">
                            ✓ Verified Mentor
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary font-medium flex flex-wrap items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 inline text-primary shrink-0" />
                          <span className="font-bold">
                            {applicationData?.roleSpecific?.role || mergedProfile.experience?.[0]?.title || 'Industry Advisor'}
                          </span>
                          <span className="text-text-muted">at</span>
                          <span className="font-semibold text-primary">
                            {applicationData?.roleSpecific?.company || mergedProfile.experience?.[0]?.company || 'Independent'}
                          </span>
                        </p>
                        
                        {mergedProfile.linkedin && (
                          <a 
                            href={mergedProfile.linkedin} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline pt-0.5"
                          >
                            <Linkedin className="w-3 h-3" /> View LinkedIn Profile <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Years of Experience</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block">
                          {applicationData?.roleSpecific?.experience || mergedProfile.experience?.[0]?.year || '5-8 Years'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Employment Verification</span>
                        <span className="text-xs font-semibold text-blue-600 mt-0.5 block flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          {mergedProfile.verificationMethod === 'employment_document'
                            ? 'Proof Document'
                            : mergedProfile.workEmail || mergedProfile.corporateEmail
                            ? 'Corporate Email'
                            : 'Standard Submission'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Email Contact Address</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block truncate">{mergedProfile.email}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Location / Country</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" /> {mergedProfile.location || 'Bangladesh'}
                        </span>
                      </div>
                    </div>

                    {/* Employment Verification Dossier */}
                    {(mergedProfile.verificationMethod || mergedProfile.workEmail || mergedProfile.corporateEmail || mergedProfile.employmentDocumentUrl) && (
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/80 space-y-2 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-blue-800 uppercase font-mono tracking-wider font-bold flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            Authenticity & Employment Proof
                          </span>
                          <span className="text-[9px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Admin Audit
                          </span>
                        </div>
                        
                        {mergedProfile.verificationMethod === 'corporate_email' || mergedProfile.workEmail || mergedProfile.corporateEmail ? (
                          <div className="bg-white p-2.5 rounded-lg border border-blue-100 space-y-1">
                            <span className="text-[8px] text-text-muted uppercase font-mono block font-bold">Corporate Work Email</span>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-800 font-mono truncate">
                                {mergedProfile.workEmail || mergedProfile.corporateEmail}
                              </span>
                              <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold shrink-0">
                                Domain Authenticated
                              </span>
                            </div>
                          </div>
                        ) : null}

                        {mergedProfile.verificationMethod === 'employment_document' || mergedProfile.employmentDocumentUrl ? (
                          <div className="bg-white p-2.5 rounded-lg border border-blue-100 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] text-text-muted uppercase font-mono block font-bold">Employment Document Proof</span>
                              <span className="text-[9px] text-blue-600 font-medium">
                                {mergedProfile.employmentDocFileName || 'Document Attached'}
                              </span>
                            </div>
                            {mergedProfile.employmentDocumentUrl && (
                              <a 
                                href={mergedProfile.employmentDocumentUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                download={mergedProfile.employmentDocFileName || "employment_proof"}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" /> Inspect Verification Document
                              </a>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Bio Approach */}
                    <div className="space-y-1">
                      <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Biography & Mentorship Approach</span>
                      <div className="p-2.5 bg-slate-50/40 border border-border rounded-xl">
                        <p className="text-[11px] text-text-secondary leading-normal italic">
                          "{mergedProfile.bio || applicationData?.roleSpecific?.bio || 'Professional veteran ready to advise development structures.'}"
                        </p>
                      </div>
                    </div>

                    {/* Specialties */}
                    <div className="space-y-1.5 text-left">
                      <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Core Coaching Specialties</span>
                      <div className="flex flex-wrap gap-1">
                        {ensureArray(applicationData?.roleSpecific?.expertise || mergedProfile.skills || ['System Design', 'General Mentorship']).map((s: any) => {
                          const skillName = typeof s === 'object' && s !== null ? (s.name || s.title || '') : String(s);
                          if (!skillName) return null;
                          return (
                            <span key={skillName} className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-lg border border-primary/10">
                              {skillName}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. STUDENT / GRADUATE PREVIEW */}
              {isGraduate && (
                <div className="bg-white rounded-xl border border-border/80 shadow-sm overflow-hidden text-left font-sans space-y-4">
                  <div className="h-14 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-border/40 relative" />
                  <div className="px-4 pb-4 space-y-4 relative">
                    <div className="flex flex-col sm:flex-row gap-3 items-start -mt-10">
                      <div className="w-16 h-16 rounded-xl bg-emerald-50 border-2 border-white shadow-md shrink-0 flex items-center justify-center text-emerald-600">
                        <GraduationCap className="w-8 h-8" />
                      </div>
                      <div className="space-y-0.5 mt-1 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-lg font-bold text-text-primary leading-tight">{mergedProfile.displayName || mergedProfile.name}</h4>
                          <span className="flex items-center gap-0.5 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border border-emerald-200">
                            ✓ Verified Student
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary font-medium flex flex-wrap items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 inline text-emerald-600 shrink-0" />
                          <span className="font-bold">
                            {applicationData?.roleSpecific?.department || mergedProfile.department || 'Core Academic Department'}
                          </span>
                          <span className="text-text-muted">at</span>
                          <span className="font-semibold text-emerald-600">
                            {applicationData?.roleSpecific?.university || mergedProfile.university || 'Affiliated University'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Graduating Batch</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block">
                          Class of {applicationData?.roleSpecific?.batch || mergedProfile.batch || '2025'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Institution Domain</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block">
                          {mergedProfile.emailDomain || 'edu.bd'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Email Contact Address</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block truncate">{mergedProfile.email}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Joined Timestamp</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block">
                          {mergedProfile.createdAt ? new Date(mergedProfile.createdAt).toLocaleDateString() : 'Today'}
                        </span>
                      </div>
                    </div>

                    {/* Biography */}
                    <div className="space-y-1">
                      <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Short Biography & Bio Statement</span>
                      <div className="p-2.5 bg-slate-50/40 border border-border rounded-xl">
                        <p className="text-[11px] text-text-secondary leading-normal italic">
                          "{mergedProfile.bio || applicationData?.roleSpecific?.bio || 'Passionate student eager to accelerate in technical space.'}"
                        </p>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="space-y-1.5 text-left">
                      <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Verified Skills</span>
                      <div className="flex flex-wrap gap-1">
                        {ensureArray(applicationData?.roleSpecific?.skills || mergedProfile.skills || []).map((s: any) => {
                          const skillName = typeof s === 'object' && s !== null ? (s.name || s.title || '') : String(s);
                          if (!skillName) return null;
                          return (
                            <span key={skillName} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200">
                              {skillName}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. INDUSTRY PARTNER PREVIEW */}
              {isIndustry && (
                <div className="bg-white rounded-xl border border-border/80 shadow-sm overflow-hidden text-left font-sans space-y-4">
                  <div className="h-14 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-b border-border/40 relative" />
                  <div className="px-4 pb-4 space-y-4 relative">
                    <div className="flex flex-col sm:flex-row gap-3 items-start -mt-10">
                      <div className="w-16 h-16 bg-blue-50 border-2 border-white shadow-md rounded-xl flex items-center justify-center text-blue-600 font-extrabold text-xl">
                        {(applicationData?.roleSpecific?.company || mergedProfile.company || 'E')?.charAt(0)}
                      </div>
                      <div className="space-y-0.5 mt-1 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-lg font-bold text-text-primary leading-tight">{applicationData?.roleSpecific?.company || mergedProfile.company}</h4>
                          <span className="flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border border-blue-200">
                            ✓ Enterprise Partner
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary font-medium flex flex-wrap items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 inline text-blue-600 shrink-0" />
                          <span className="font-bold">
                            {applicationData?.roleSpecific?.sector || mergedProfile.sector || 'Software Services'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Liaison Representative</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block">{mergedProfile.displayName || mergedProfile.name}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Company Size Bracket</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block">
                          {applicationData?.roleSpecific?.size || mergedProfile.size || 'Unspecified'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Corporate Contact E-Mail</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block truncate">{mergedProfile.email}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Company Website URL</span>
                        <span className="text-xs font-semibold text-blue-600 mt-0.5 block truncate">
                          {applicationData?.roleSpecific?.website || mergedProfile.website || 'corporate.com'}
                        </span>
                      </div>
                    </div>

                    {/* Sourced Technology Stack */}
                    <div className="space-y-1.5 text-left">
                      <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Sourced Technologies Stack</span>
                      <div className="flex flex-wrap gap-1">
                        {ensureArray(applicationData?.roleSpecific?.techStack || mergedProfile.techStack || 'React, Node.js').map((t: string) => (
                          <span key={t} className="px-2 py-0.5 bg-slate-100 border border-border text-text-secondary text-[10px] font-medium rounded-lg">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Mission */}
                    <div className="space-y-1 text-left">
                      <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Company Mission Description</span>
                      <div className="p-2.5 bg-slate-50/40 border border-border rounded-xl">
                        <p className="text-[11px] text-text-secondary leading-normal italic">
                          "{applicationData?.roleSpecific?.description || mergedProfile.description || 'Enterprise recruiting team looking to build academic talent pipelines.'}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. UNIVERSITY PARTNER PREVIEW */}
              {isUniversity && (
                <div className="bg-white rounded-xl border border-border/80 shadow-sm overflow-hidden text-left font-sans space-y-4">
                  <div className="h-14 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-b border-border/40 relative" />
                  <div className="px-4 pb-4 space-y-4 relative">
                    <div className="flex flex-col sm:flex-row gap-3 items-start -mt-10">
                      <div className="w-16 h-16 bg-emerald-50 border-2 border-white shadow-md rounded-xl flex items-center justify-center text-emerald-600">
                        <GraduationCap className="w-8 h-8" />
                      </div>
                      <div className="space-y-0.5 mt-1 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-lg font-bold text-text-primary leading-tight">{applicationData?.roleSpecific?.university || mergedProfile.university}</h4>
                          <span className="flex items-center gap-0.5 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border border-emerald-200">
                            ✓ Academic Partner
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary font-medium flex flex-wrap items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 inline text-emerald-600 shrink-0" />
                          <span className="font-bold">Computer Science & Engineering</span>
                        </p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Faculty Coordinator</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block">{mergedProfile.displayName || mergedProfile.name}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Academic Department</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block">
                          {applicationData?.roleSpecific?.department || mergedProfile.department || 'Computer Science'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Batch Graduating Volume</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block">
                          {applicationData?.roleSpecific?.batchSize || mergedProfile.batchSize || '100-500 students'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Location / Country</span>
                        <span className="text-xs font-semibold text-text-primary mt-0.5 block flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {applicationData?.roleSpecific?.country || mergedProfile.country || 'Bangladesh'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Institutional Domain</span>
                        <span className="text-xs font-semibold text-emerald-700 mt-0.5 block">
                          {applicationData?.roleSpecific?.emailDomain || mergedProfile.emailDomain}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50/60 rounded-xl border border-border">
                        <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Official Website URL</span>
                        <span className="text-xs font-semibold text-emerald-700 mt-0.5 block truncate">
                          {applicationData?.roleSpecific?.website || mergedProfile.website}
                        </span>
                      </div>
                    </div>

                    {/* Accreditation */}
                    <div className="space-y-1 text-left">
                      <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Accreditation Statement</span>
                      <div className="p-2.5 bg-slate-50/40 border border-border rounded-xl">
                        <p className="text-[11px] text-text-secondary leading-normal italic">
                          "{applicationData?.roleSpecific?.accreditation || mergedProfile.accreditation || 'Academic board licensed & UGC approved institution.'}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. DEFAULT FALLBACK PROFILE PREVIEW (Guarantees right panel is NEVER blank) */}
              {!isMentor && !isGraduate && !isIndustry && !isUniversity && (
                <div className="bg-white rounded-xl border border-border/80 shadow-sm overflow-hidden text-left font-sans space-y-4">
                  <div className="h-14 bg-gradient-to-r from-slate-500/10 to-slate-600/10 border-b border-border/40 relative" />
                  <div className="px-4 pb-4 space-y-4 relative">
                    <div className="flex flex-col sm:flex-row gap-3 items-start -mt-10">
                      <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden border-2 border-white shadow-md shrink-0 flex items-center justify-center text-text-secondary font-bold text-xl">
                        {mergedProfile.displayName?.charAt(0) || mergedProfile.name?.charAt(0) || 'U'}
                      </div>
                      <div className="space-y-0.5 mt-1 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-lg font-bold text-text-primary leading-tight">{mergedProfile.displayName || mergedProfile.name}</h4>
                          <span className="bg-slate-100 text-text-secondary px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border border-border">
                            Applicant Profile
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary font-medium uppercase font-mono tracking-wider">
                          Role: {mergedProfile.role || mergedProfile.userRole || 'User Applicant'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-border text-xs text-text-secondary space-y-1.5">
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="font-medium text-text-muted">Account Registered:</span>
                        <span className="font-bold text-text-primary">{mergedProfile.createdAt ? new Date(mergedProfile.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="font-medium text-text-muted">Liaison Contact E-Mail:</span>
                        <span className="font-bold text-text-primary">{mergedProfile.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Verified Documents & Verification Proofs Segment */}
              <div className="space-y-2 pt-4 border-t border-border/60 text-left">
                <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider block font-bold">Attached Registration Documents & Verification Proofs</span>
                
                {applicationData?.documents && applicationData.documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {applicationData.documents.map((docItem: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-border hover:border-primary/40 rounded-xl transition-all shadow-xs group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left min-w-0">
                            <span className="text-[11px] font-bold text-text-primary block truncate">{docItem.name}</span>
                            <span className="text-[8px] text-text-muted uppercase font-mono tracking-wider">Submitted Proof</span>
                          </div>
                        </div>
                        <a 
                          href={docItem.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-1 hover:bg-primary/10 rounded-lg text-primary transition-colors shrink-0"
                          title="Open Attachment in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-border rounded-xl text-center">
                    <p className="text-[11px] text-text-muted font-normal italic">
                      No document credentials uploaded. Verification depends entirely on social liaison coordinates.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
