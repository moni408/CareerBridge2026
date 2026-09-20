import React from 'react';
import { 
  LayoutDashboard, FileUp, Briefcase, Users, LogOut, 
  User as UserIcon, Sparkles, MessageSquare, Bell, Search, 
  ChevronRight, ChevronLeft, ShieldCheck, Target, Calendar, ClipboardCheck, 
  Award, TrendingUp, Settings, Star, Building2, GraduationCap, ChevronDown, FileText,
  Trophy
} from 'lucide-react';
import { useAuth } from '../App';
import { motion } from 'motion/react';
import { ThemeToggle } from './ThemeToggle';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { getStudentApplications } from '../services/applicationFormService';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  setView: (view: any) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function Layout({ children, currentView, setView, searchQuery, setSearchQuery }: LayoutProps) {
  const { profile, signOut, user, isAdminMode, setIsAdminMode } = useAuth();
  const currentRole = profile?.role || 'graduate';
  const [pendingReviewsCount, setPendingReviewsCount] = React.useState<number>(0);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [showNotifications, setShowNotifications] = React.useState<boolean>(false);
  const [isResumeOpen, setIsResumeOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (currentView === 'upload' || currentView === 'generator') {
      setIsResumeOpen(true);
    }
  }, [currentView]);
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
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

  React.useEffect(() => {
    if (!user || currentRole !== 'mentor') return;
    try {
      const q = query(
        collection(db, 'submissions'),
        where('status', '==', 'UNDER_REVIEW')
      );
      const unsub = onSnapshot(q, (snapshot) => {
        setPendingReviewsCount(snapshot.size);
      });
      return unsub;
    } catch (e) {
      console.error(e);
    }
  }, [user, currentRole]);

  React.useEffect(() => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', user.uid)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setNotifications(list);
      });
      return unsub;
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = async () => {
    try {
      const unreads = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreads.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true }))
      );
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const toggleReadStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: !currentStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const [hasAppliedJobs, setHasAppliedJobs] = React.useState<boolean>(false);

  React.useEffect(() => {
    let active = true;
    const checkAppliedStatus = async () => {
      const studentId = user?.uid || 'student-guest';
      try {
        const apps = await getStudentApplications(studentId);
        const activeApps = apps.filter(a => !a.withdrawn);
        if (active) {
          setHasAppliedJobs(activeApps.length > 0);
        }
      } catch (err) {
        console.error("Error checking student applications:", err);
      }
    };

    checkAppliedStatus();

    const handleAppSubmitted = () => {
      checkAppliedStatus();
    };

    window.addEventListener('job-application-submitted', handleAppSubmitted);
    window.addEventListener('storage', handleAppSubmitted);

    return () => {
      active = false;
      window.removeEventListener('job-application-submitted', handleAppSubmitted);
      window.removeEventListener('storage', handleAppSubmitted);
    };
  }, [user]);

  // Graduate-specific navigation lists
  const graduateWorkspaceItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Resume', icon: FileUp },
    { id: 'skill-audit', label: 'Skill Audit', icon: Target },
  ];

  const graduateNetworkItems = [
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    ...(hasAppliedJobs ? [{ id: 'my-applications', label: 'My Applications', icon: FileText }] : []),
    { id: 'mentors', label: 'Mentors', icon: Users },
    { id: 'chat', label: 'Sessions', icon: MessageSquare },
  ];

  // Mentor-specific navigation lists
  const mentorWorkspaceItems = [
    { id: 'mentor-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'mentor-leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'mentor-requests', label: 'Requests', icon: Bell },
    { id: 'mentor-mentees', label: 'My mentees', icon: Users },
    { id: 'mentor-workspace', label: 'Workspace', icon: ClipboardCheck },
    { id: 'mentor-sessions', label: 'Sessions', icon: Calendar },
    { id: 'mentor-messaging', label: 'Messaging', icon: MessageSquare },
    { id: 'mentor-reputation', label: 'Achievements', icon: Award },
  ];

  const mentorNetworkItems: any[] = [];

  // Industry-specific navigation lists
  const industryWorkspaceItems = [
    { id: 'industry-dashboard', label: 'Console', icon: LayoutDashboard },
    { id: 'industry-talents', label: 'Candidate Pool', icon: Users },
    { id: 'industry-jobs', label: 'Positions Manager', icon: Briefcase },
    { id: 'industry-academic-sessions', label: 'Academic Sessions', icon: GraduationCap }
  ];

  // University-specific navigation lists
  const universityWorkspaceItems = [
    { id: 'university-dashboard', label: 'Academic Console', icon: LayoutDashboard },
    { id: 'profile', label: 'Our Profile', icon: UserIcon },
    { id: 'university-students', label: 'Student Index', icon: Users },
    { id: 'university-curriculum', label: 'Curriculum Sprints', icon: GraduationCap }
  ];

  const adminMenuItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-verifications', label: 'Verifications', icon: ShieldCheck },
    { id: 'admin-users', label: 'Users', icon: Users },
    { id: 'admin-jobs', label: 'Jobs Moderation', icon: Briefcase },
  ];

  // Assemble appropriate navigation structures
  let navigationGroups: any[] = [];
  
  if (isAdminMode) {
    navigationGroups = [
      {
        title: 'ADMIN MENU',
        items: adminMenuItems
      }
    ];
  } else if (currentRole === 'mentor') {
    navigationGroups = [
      {
        title: 'WORKSPACE',
        items: mentorWorkspaceItems
      },
      {
        title: 'NETWORK',
        items: mentorNetworkItems
      },
      {
        title: 'ACCOUNT',
        items: [
          { id: 'profile', label: 'My Profile', icon: UserIcon }
        ]
      }
    ];
  } else if (currentRole === 'industry') {
    navigationGroups = [
      {
        title: 'ENTERPRISE HUB',
        items: industryWorkspaceItems
      },
      {
        title: 'ACCOUNT',
        items: [
          { id: 'profile', label: 'My Profile', icon: UserIcon }
        ]
      }
    ];
  } else if (currentRole === 'university') {
    navigationGroups = [
      {
        title: 'UNIVERSITY HUB',
        items: universityWorkspaceItems
      },
      {
        title: 'ACCOUNT',
        items: [
          { id: 'profile', label: 'Our Profile', icon: UserIcon }
        ]
      }
    ];
  } else {
    // default to graduate
    navigationGroups = [
      {
        title: 'WORKSPACE',
        items: graduateWorkspaceItems
      },
      {
        title: 'NETWORK',
        items: graduateNetworkItems
      },
      {
        title: 'ACCOUNT',
        items: [
          { id: 'profile', label: 'My Profile', icon: UserIcon }
        ]
      }
    ];
  }

  return (
    <div className="min-h-screen bg-bg-primary flex font-sans text-text-primary selection:bg-primary-light selection:text-primary">
      {/* Sidebar */}
      <aside className={`bg-white border-r border-[#E4EAF4] flex flex-col sticky top-0 h-screen z-30 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-56'}`}>
        <div className="p-4 pb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-xs shrink-0">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-[16px] tracking-tight text-[#0B1533] whitespace-nowrap">CareerBridge</span>
            )}
          </div>
          <button 
            onClick={toggleSidebar} 
            className="p-1 text-[#8A99B5] hover:text-[#0B1533] hover:bg-[#EEF3FF] rounded-lg transition-all hidden md:block cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Switch Option for Admin Profile */}
        {(profile?.role === 'admin' || profile?.email === 'ayeshasiddikamoni408@gmail.com') && !isCollapsed && (
          <div className="px-3 mb-4 shrink-0">
            <div className="bg-[#EEF3FF] p-1 rounded-xl border border-[#E4EAF4] flex gap-1 shadow-2xs">
              <button
                id="btn-switch-graduate"
                onClick={() => {
                  setIsAdminMode(false);
                  setView('dashboard');
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold tracking-wider uppercase transition-all duration-150 cursor-pointer ${
                  !isAdminMode 
                    ? 'bg-white text-[#1B2A8F] shadow-xs' 
                    : 'text-[#5A6B8C] hover:text-[#0B1533]'
                }`}
              >
                Graduate
              </button>
              <button
                id="btn-switch-admin"
                onClick={() => {
                  setIsAdminMode(true);
                  setView('admin-dashboard');
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold tracking-wider uppercase transition-all duration-150 cursor-pointer ${
                  isAdminMode 
                    ? 'bg-white text-[#1B2A8F] shadow-xs' 
                    : 'text-[#5A6B8C] hover:text-[#0B1533]'
                }`}
              >
                Admin
              </button>
            </div>
          </div>
        )}

        <nav className="flex-1 px-2.5 space-y-4 overflow-y-auto custom-scrollbar">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {isCollapsed ? (
                <div className="border-t border-[#E4EAF4] my-3 mx-1" />
              ) : (
                <h3 className="px-3 text-[11px] font-medium tracking-wider text-[#8A99B5] mb-2 uppercase">
                  {group.title}
                </h3>
              )}
              {group.items.map((item: any) => {
                if (item.hasSubmenu) {
                  const isChildActive = item.subItems.some((sub: any) => sub.id === currentView);
                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        onClick={() => {
                          if (isCollapsed) {
                            setView(item.subItems[0].id);
                          } else {
                            setIsResumeOpen(prev => !prev);
                            setView(item.subItems[0].id);
                          }
                        }}
                        title={isCollapsed ? item.label : undefined}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 group text-[13px] font-medium relative cursor-pointer ${
                          isChildActive
                            ? 'bg-[#EEF3FF] text-[#1B2A8F] font-semibold'
                            : 'text-[#5A6B8C] hover:text-[#0B1533] hover:bg-[#EEF3FF]'
                        } ${isCollapsed ? 'justify-center' : ''}`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isChildActive && (
                            <motion.div 
                              layoutId="sidebar-accent"
                              className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-gradient-brand rounded-r-full" 
                            />
                          )}
                          <item.icon className={`w-[18px] h-[18px] stroke-[1.75] shrink-0 transition-colors ${isChildActive ? 'text-[#1B2A8F]' : 'text-[#8A99B5] group-hover:text-[#0B1533]'}`} />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>
                        {!isCollapsed && (
                          <ChevronRight className={`w-3.5 h-3.5 text-[#8A99B5] transition-transform duration-150 ${isResumeOpen ? 'rotate-90 text-[#1B2A8F]' : ''}`} />
                        )}
                      </button>

                      {/* Submenu items */}
                      {isResumeOpen && !isCollapsed && (
                        <div className="ml-4 pl-2.5 border-l border-[#E4EAF4] space-y-0.5 pt-0.5">
                          {item.subItems.map((sub: any) => (
                            <button
                              key={sub.id}
                              onClick={() => setView(sub.id)}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-150 text-[12px] font-medium cursor-pointer ${
                                currentView === sub.id
                                  ? 'bg-[#EEF3FF] text-[#1B2A8F] font-semibold'
                                  : 'text-[#8A99B5] hover:text-[#0B1533] hover:bg-[#EEF3FF]'
                              }`}
                            >
                              <sub.icon className={`w-3.5 h-3.5 shrink-0 ${currentView === sub.id ? 'text-[#1B2A8F]' : 'text-[#8A99B5]'}`} />
                              <span className="truncate">{sub.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                const hasItemBadge = (item.id === 'mentor-requests' && pendingReviewsCount > 0) || (item.id === 'notifications' && unreadCount > 0) || (item.id === 'admin-verifications' && unreadCount > 0);
                const itemBadgeCount = item.id === 'mentor-requests' ? pendingReviewsCount : unreadCount;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'admin') {
                        setIsAdminMode(true);
                        setView('admin-dashboard');
                      } else {
                        setView(item.id);
                      }
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 group text-[13px] font-medium relative cursor-pointer ${
                      currentView === item.id
                        ? 'bg-[#EEF3FF] text-[#1B2A8F] font-semibold'
                        : 'text-[#5A6B8C] hover:text-[#0B1533] hover:bg-[#EEF3FF]'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                  >
                    {currentView === item.id && (
                      <motion.div 
                        layoutId="sidebar-accent"
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-gradient-brand rounded-r-full" 
                      />
                    )}
                    <item.icon className={`w-[18px] h-[18px] stroke-[1.75] shrink-0 transition-colors ${currentView === item.id ? 'text-[#1B2A8F]' : 'text-[#8A99B5] group-hover:text-[#0B1533]'}`} />
                    {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                    
                    {!isCollapsed && hasItemBadge && (
                      <span className="bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 text-white font-mono font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs animate-pulse shrink-0">
                        {itemBadgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-border bg-bg-primary/30">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-4">
              <div 
                className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shadow-sm ring-2 ring-primary/20"
                title={profile?.displayName || 'User profile'}
              >
                {profile?.displayName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
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
              {currentRole === 'mentor' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shadow-sm ring-2 ring-primary/20">
                      {profile?.displayName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'DR'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{profile?.displayName || 'Dr. Rahman'}</p>
                      <p className="text-[11px] text-text-muted truncate">
                        {profile?.title || profile?.company || 'Industry Mentor'}
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary bg-primary/10 border border-primary/25 rounded-full px-3 py-1 uppercase tracking-wider">
                    <Star className="w-3.5 h-3.5 text-primary fill-current" />
                    Rank: {profile?.rankLevel || 'Expert Mentor'}
                  </div>
                </div>
              ) : currentRole === 'industry' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1B2A8F]/10 text-[#1B2A8F] flex items-center justify-center font-bold text-sm shadow-xs ring-2 ring-[#1B2A8F]/20">
                      {profile?.company?.[0]?.toUpperCase() || 'EP'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{profile?.company || 'Enterprise Partner'}</p>
                      <p className="text-[11px] text-text-muted truncate">Industry Associate</p>
                    </div>
                  </div>
                </div>
              ) : currentRole === 'university' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-emerald-500/20">
                      {profile?.university?.[0]?.toUpperCase() || 'UI'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{profile?.university || 'University Rep'}</p>
                      <p className="text-[11px] text-text-muted truncate">Academic Rep</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-bg-secondary rounded-xl border border-border flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-sm shadow-sm ring-2 ring-background">
                      {profile?.displayName?.[0] || 'U'}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-accent rounded-full border-2 border-background flex items-center justify-center">
                      <Sparkles className="w-2 h-2 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{profile?.displayName?.split(' ')[0]}</p>
                    <div className="flex items-center gap-1.5 opacity-60">
                      <Target className="w-3 h-3 text-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-wider truncate">7 Day Streak</span>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={signOut}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-bold tracking-widest text-text-muted hover:text-error hover:bg-error-light rounded-lg transition-all border border-transparent hover:border-error/10 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                SIGN OUT
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <header className={`h-14 sm:h-16 px-6 sm:px-8 flex shrink-0 justify-between items-center sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-md border-b border-border ${isAdminMode ? 'hidden' : ''}`}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 eyebrow text-text-muted">
              <span className="hover:text-text-primary transition-colors cursor-pointer text-[10px]">CAREER</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-primary text-[10px] font-bold tracking-widest">{currentView.toUpperCase()}</span>
            </div>

            {/* LEFT CORNER NOTIFICATION SUMMARY BADGE */}
            {(unreadCount > 0 || (currentRole === 'mentor' && pendingReviewsCount > 0)) && (
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 text-white font-mono font-black text-[10px] rounded-full shadow-sm hover:opacity-95 transition-all cursor-pointer animate-pulse shrink-0"
                title="Click to view notifications"
              >
                <Bell className="w-3 h-3 text-white animate-bounce" />
                <span>
                  {unreadCount > 0 ? `${unreadCount} NEW` : `${pendingReviewsCount} QUEUED`}
                </span>
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 relative">
              <ThemeToggle />
              
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-all relative cursor-pointer" 
                  title="Notification Center"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 ? (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 text-white font-mono font-black text-[10px] min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center border-2 border-bg-primary shadow-md animate-pulse">
                      {unreadCount}
                    </span>
                  ) : currentRole === 'mentor' && pendingReviewsCount > 0 ? (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-mono font-black text-[10px] min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center border-2 border-bg-primary shadow-md animate-pulse">
                      {pendingReviewsCount}
                    </span>
                  ) : null}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl p-4 space-y-3 z-50 text-left">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-primary" /> Notification Hub
                      </span>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {currentRole === 'mentor' && pendingReviewsCount > 0 && (
                        <div className="p-2 bg-primary-light/50 border border-primary/10 rounded-lg text-xs space-y-1 mb-2">
                          <p className="font-semibold text-text-primary">Evaluation Task Queue</p>
                          <p className="text-[10px] text-text-secondary leading-normal">
                            You have <span className="font-extrabold text-primary">{pendingReviewsCount}</span> active graduate submissions awaiting feedback score.
                          </p>
                          <button
                            onClick={() => {
                              setView('mentor-dashboard');
                              setShowNotifications(false);
                            }}
                            className="text-[10px] text-[#534AB7] hover:underline font-black uppercase tracking-wider block pt-1"
                          >
                            Open Dashboard &raquo;
                          </button>
                        </div>
                      )}

                      {notifications.length === 0 ? (
                        <p className="text-[10px] text-text-muted italic py-6 text-center">No alerts in your history cache.</p>
                      ) : (
                        notifications.map((notif, idx) => (
                          <div 
                            key={notif.id ? `${notif.id}-${idx}` : `notif-${idx}`}
                            className={`p-2 rounded-lg border text-xs space-y-1 relative transition-all ${
                              notif.isRead 
                                ? 'bg-bg-secondary/40 border-border/40 text-text-muted' 
                                : 'bg-primary-light/20 border-primary/10 text-text-secondary font-medium'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-bold text-text-primary text-[10.5px]">
                                {notif.title || 'System Notification'}
                              </span>
                              {!notif.isRead && (
                                <button 
                                  onClick={() => toggleReadStatus(notif.id, notif.isRead)}
                                  className="p-0.5 text-primary hover:text-[#534AB7] rounded hover:bg-bg-tertiary shrink-0"
                                  title="Mark as read"
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] leading-relaxed text-text-secondary">
                              {notif.message || notif.text}
                            </p>
                            <span className="text-[9px] text-text-muted block font-mono">
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : 'Just now'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative group/profile">
              <button 
                className={`flex items-center gap-2 p-1 border rounded-full transition-all bg-bg-tertiary shadow-sm ${currentView === 'profile' ? 'border-primary' : 'border-border hover:border-primary'}`}
              >
                <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-xs ring-2 ring-background">
                  {profile?.displayName?.[0] || 'U'}
                </div>
              </button>
              
              {/* Dropdown */}
              <div className="absolute right-0 top-full pt-2 opacity-0 translate-y-2 pointer-events-none group-hover/profile:opacity-100 group-hover/profile:translate-y-0 group-hover/profile:pointer-events-auto transition-all duration-300 z-50">
                <div className="w-48 bg-bg-primary border border-border rounded-lg shadow-lg p-2 space-y-1">
                  <button 
                    onClick={() => setView('profile')}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-primary hover:bg-primary-light rounded-md transition-all"
                  >
                    <UserIcon className="w-4 h-4" />
                    MY PROFILE
                  </button>
                  <button 
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-text-muted hover:text-error hover:bg-error-light rounded-md transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    SIGN OUT
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className={`flex-1 relative z-10 ${currentView === 'chat' ? 'flex flex-col h-full overflow-hidden' : 'overflow-y-auto'}`}>
          <div className={`${currentView === 'chat' ? 'flex-1 flex flex-col h-full' : isAdminMode ? 'w-full px-5 py-5 sm:px-8 sm:py-6' : 'w-full max-w-[1600px] mx-auto px-5 py-5 sm:px-8 sm:py-6'}`}>
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className={currentView === 'chat' ? 'flex-1 flex flex-col h-full' : ''}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
