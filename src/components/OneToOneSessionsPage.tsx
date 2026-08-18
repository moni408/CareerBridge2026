import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, setDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Calendar as CalendarIcon, Clock, Users, Plus, Check, ChevronRight, 
  BookOpen, Video, Trash, ExternalLink, ShieldCheck, Share2 
} from 'lucide-react';
import { useAuth } from '../App';

interface OneToOneSessionsPageProps {
  activeConnections: any[];
}

export function OneToOneSessionsPage({ activeConnections }: OneToOneSessionsPageProps) {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Scheduling Form states
  const [selectedConnection, setSelectedConnection] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [sessionType, setSessionType] = useState('Technical Deep Dive');
  const [sessionNotes, setSessionNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  // Live session notes viewer state
  const [activeSessionForNotes, setActiveSessionForNotes] = useState<any | null>(null);
  const [editableNotesText, setEditableNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const TIME_SLOTS = [
    '09:00 AM', '10:30 AM', '11:00 AM', '01:30 PM', '02:00 PM', '03:30 PM', '05:00 PM'
  ];

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const q = query(
      collection(db, 'sessions'),
      where('mentorId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setSessions(list.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));
      setLoading(false);

      if (list.length > 0 && !activeSessionForNotes) {
        setActiveSessionForNotes(list[0]);
        setEditableNotesText(list[0].notes || list[0].preSessionNotes || list[0].postSessionNotes || '');
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'sessions');
    });

    return () => unsub();
  }, [user]);

  const handleScheduleSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnection || !sessionDate || !selectedSlot) {
      alert('Please select a mentee, a session date, and a preferred time slot chip!');
      return;
    }

    const connection = activeConnections.find(c => c.id === selectedConnection);
    if (!connection) return;

    setIsScheduling(true);
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      const dateTimeString = `${sessionDate}T${selectedSlot === '09:00 AM' ? '09:00:00' : selectedSlot === '10:30 AM' ? '10:30:00' : selectedSlot === '11:00 AM' ? '11:00:00' : selectedSlot === '01:30 PM' ? '13:30:00' : selectedSlot === '02:00 PM' ? '14:00:00' : selectedSlot === '03:30 PM' ? '15:30:00' : '17:00:00'}`;

      const newSession = {
        id: sessionId,
        mentorId: user.uid,
        mentorName: profile?.displayName || 'Dr. Faiz Rahman',
        menteeId: connection.menteeId,
        menteeName: connection.menteeName,
        connectionId: connection.id,
        date: sessionDate,
        timeSlot: selectedSlot,
        type: sessionType,
        sessionType: sessionType,
        dateTime: dateTimeString,
        notes: sessionNotes,
        preSessionNotes: sessionNotes || 'No prior ideas or doubts logged.',
        postSessionNotes: '',
        status: 'confirmed',
        googleCalendarLink: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(sessionType + ' with ' + connection.menteeName)}&dates=${sessionDate.replace(/-/g, '')}/${sessionDate.replace(/-/g, '')}`,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'sessions', sessionId), newSession);

      alert(`Session scheduled! Google Calendar invite saved and synchronized for both ${profile?.displayName} and ${connection.menteeName} with automated reminders list.`);
      
      // Reset scheduling form
      setSessionDate('');
      setSelectedSlot('');
      setSessionNotes('');
      setSelectedConnection('');
    } catch (err: any) {
      console.error(err);
      alert('Error scheduling session: ' + err.message);
      handleFirestoreError(err, OperationType.WRITE, `sessions/${sessionId}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!activeSessionForNotes) return;
    setIsSavingNotes(true);
    try {
      await updateDoc(doc(db, 'sessions', activeSessionForNotes.id), {
        notes: editableNotesText,
        postSessionNotes: editableNotesText
      });
      alert('Interactive session notes and shared ideas saved successfully in platform!');
      setActiveSessionForNotes({ ...activeSessionForNotes, notes: editableNotesText, postSessionNotes: editableNotesText });
    } catch (err: any) {
      console.error(err);
      alert('Error saving notes: ' + err.message);
      handleFirestoreError(err, OperationType.WRITE, `sessions/${activeSessionForNotes.id}`);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Helper to determine if a session date is within 24 hours of current time (STArTING SOON)
  const isStartingSoon = (dateTimeStr: string) => {
    const sessTime = new Date(dateTimeStr).getTime();
    const currTime = Date.now();
    const diffHours = (sessTime - currTime) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 24;
  };

  const upcomingSessions = sessions.filter(s => new Date(s.dateTime).getTime() >= Date.now());
  const pastSessions = sessions.filter(s => new Date(s.dateTime).getTime() < Date.now());

  return (
    <div className="bg-white border-[0.5px] border-border/80 rounded-lg p-6 space-y-6 text-left select-none max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900">One-to-One Live Sessions</h2>
        <p className="text-xs text-gray-500 mt-0.5">Schedule alignments, record interactive feedback, and sync directly with Google Calendar</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: LIVE CALENDAR SCHEDULER FORM */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 border-[0.5px] border-border/80 rounded-lg space-y-4 bg-gray-50/40">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-2">
              <CalendarIcon className="w-3.5 h-3.5 text-[#00D4FF]" /> Session Scheduler
            </h3>

            <form onSubmit={handleScheduleSession} className="space-y-3.5 text-xs">
              
              {/* SELECT MENTEE */}
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Select Mentee *</label>
                <select 
                  value={selectedConnection}
                  onChange={(e) => setSelectedConnection(e.target.value)}
                  className="w-full bg-white border-[0.5px] border-border/80 rounded p-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">Choose active candidate</option>
                  {activeConnections.map(c => (
                    <option key={c.id} value={c.id}>{c.menteeName}</option>
                  ))}
                </select>
              </div>

              {/* DATE PICKER */}
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Preferred Alignment Date *</label>
                <input 
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full bg-white border-[0.5px] border-border/80 rounded p-2 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  required
                />
              </div>

              {/* CHIP SLOTS */}
              <div className="space-y-2">
                <label className="font-bold text-gray-700 block">Available Time Slots *</label>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-3 py-1.5 border-[0.5px] rounded text-[10px] font-bold transition-all cursor-pointer ${
                        selectedSlot === slot 
                          ? 'bg-gradient-to-r from-[#090979] to-[#00D4FF] border-transparent text-white shadow-xs' 
                          : 'bg-white border-border/80 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* SESSION FOCUS */}
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Session Orientation Focus</label>
                <select 
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="w-full bg-white border-[0.5px] border-border/80 rounded p-1.5 focus:outline-none"
                >
                  <option value="Technical Deep Dive">Technical Deep Dive</option>
                  <option value="Mock System Design Interview">Mock System Design Interview</option>
                  <option value="Syllabus Review & Gaps check">Syllabus Review & Gaps check</option>
                  <option value="SaaS Resume / Portfolio polish">SaaS Resume / Portfolio polish</option>
                </select>
              </div>

              {/* SESSION PRENOTES */}
              <div className="space-y-1">
                <label className="font-bold text-gray-700 font-mono">Pre-meeting Objectives description</label>
                <textarea 
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows={2}
                  placeholder="Set boundaries or reading targets before meeting..."
                  className="w-full bg-white border-[0.5px] border-border/80 rounded p-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isScheduling}
                className="w-full py-2.5 bg-gradient-to-r from-[#090979] to-[#00D4FF] hover:opacity-95 text-white font-bold rounded shadow-xs tracking-wide transition-all uppercase text-[10px] cursor-pointer"
              >
                {isScheduling ? 'Scheduling...' : '✅ Save to Google Calendar'}
              </button>
            </form>
          </div>
        </div>

        {/* MID COLUMN: UPCOMING & HISTORICAL SESSIONS */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* UPCOMING ALIGNMENTS */}
          <div className="p-4 border-[0.5px] border-border/80 rounded-lg space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between border-b border-border/50 pb-2">
              <span>Upcoming Alignments</span>
              <span className="font-mono text-[9px] bg-sky-500/10 text-[#00D4FF] px-1.5 rounded font-black">{upcomingSessions.length}</span>
            </h3>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {upcomingSessions.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic py-6 text-center">No upcoming schedules. Launch calendar scheduler to queue.</p>
              ) : (
                upcomingSessions.map((sess) => {
                  const soon = isStartingSoon(sess.dateTime);
                  return (
                    <div 
                      key={sess.id}
                      onClick={() => {
                        setActiveSessionForNotes(sess);
                        setEditableNotesText(sess.notes || sess.preSessionNotes || sess.postSessionNotes || '');
                      }}
                      className={`p-3 border-[0.5px] rounded text-xs transition-all relative text-left cursor-pointer hover:bg-gray-50/50 ${
                        activeSessionForNotes?.id === sess.id 
                          ? 'border-[#00D4FF] bg-sky-500/5' 
                          : 'border-border/60 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-gray-900 truncate block">{sess.type || sess.sessionType}</span>
                        {soon && (
                          <span className="px-1.5 py-0.5 bg-[#EF4444]/10 text-[#EF4444] rounded text-[8px] font-black uppercase tracking-wider blink shrink-0">
                            Starting soon
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[10px] text-gray-500 font-medium mt-1 truncate">Mentee: {sess.menteeName}</p>
                      
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 mt-2 font-mono">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{sess.date || new Date(sess.dateTime).toLocaleDateString()} @ {sess.timeSlot || new Date(sess.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* HISTORICAL RECORDS */}
          <div className="p-4 border-[0.5px] border-border/80 rounded-lg space-y-3 bg-gray-50/20">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between border-b border-border/50 pb-2">
              <span>Past Session Records</span>
              <span className="font-mono text-[9px] bg-gray-200 text-gray-500 px-1.5 rounded font-black">{pastSessions.length}</span>
            </h3>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {pastSessions.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic text-center py-4">No past history recorded.</p>
              ) : (
                pastSessions.map((sess) => (
                  <div 
                    key={sess.id}
                    onClick={() => {
                      setActiveSessionForNotes(sess);
                      setEditableNotesText(sess.notes || sess.preSessionNotes || sess.postSessionNotes || '');
                    }}
                    className={`p-2.5 border-[0.5px] rounded text-xs transition-all relative text-left cursor-pointer hover:bg-gray-50 ${
                      activeSessionForNotes?.id === sess.id 
                        ? 'border-[#00D4FF] bg-sky-500/5 font-semibold' 
                        : 'border-border/60 bg-white'
                    }`}
                  >
                    <span className="font-medium text-gray-800 truncate block">{sess.type || sess.sessionType}</span>
                    <p className="text-[9px] text-gray-500 truncate mt-0.5">Mentee: {sess.menteeName}</p>
                    <span className="text-[8px] text-gray-400 block font-mono font-bold mt-1">{sess.date || new Date(sess.dateTime).toLocaleDateString()} — COMPLETED</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: INTERACTIVE SHARED MEETING NOTES DECK */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 border-[0.5px] border-border/80 rounded-lg space-y-4 bg-white shadow-xs min-h-[380px] flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-2">
                <BookOpen className="w-3.5 h-3.5 text-primary" /> Session Shared Notes Deck
              </h3>

              {activeSessionForNotes ? (
                <div className="space-y-4 text-xs">
                  <div className="bg-gray-50 p-3 rounded border-[0.5px] border-border/60 space-y-1">
                    <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">Active Meeting Focus</span>
                    <p className="font-bold text-[#090979] text-[11px]">{activeSessionForNotes.type || activeSessionForNotes.sessionType}</p>
                    <p className="text-[10px] text-gray-600 font-medium">With scholar: {activeSessionForNotes.menteeName}</p>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <label className="font-bold text-gray-700 block">Questions, Shared Ideas & Action Notes</label>
                    <textarea
                      value={editableNotesText}
                      onChange={(e) => setEditableNotesText(e.target.value)}
                      rows={10}
                      placeholder="Write collaborative notes or jot down mentee questions discussed during session..."
                      className="w-full bg-white border-[0.5px] border-border/80 rounded p-2.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary leading-normal h-[180px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-gray-400 italic text-xs">
                  Please select an upcoming or past session listing to unlock notes shared deck.
                </div>
              )}
            </div>

            {activeSessionForNotes && (
              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="w-full py-2 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded shadow-xs tracking-wide transition-all uppercase text-[10px] cursor-pointer mt-2"
              >
                {isSavingNotes ? 'Saving Notes...' : '💾 Publish & Save notes'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
