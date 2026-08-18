import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { sendCrossRoleEmailNotification } from '../services/emailService';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDocs, orderBy } from 'firebase/firestore';
import { 
  Send, Paperclip, Share2, Clipboard, ChevronRight, X, 
  ExternalLink, File, FileText, Search, User, Globe 
} from 'lucide-react';
import { useAuth } from '../App';

interface MentorMessagingPageProps {
  activeConnections: any[];
}

export function MentorMessagingPage({ activeConnections }: MentorMessagingPageProps) {
  const { user, profile } = useAuth();
  const [selectedConnection, setSelectedConnection] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [currentTasks, setCurrentTasks] = useState<any[]>([]);
  
  // File attachments state
  const [pendingFile, setPendingFile] = useState<any | null>(null);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showShareTaskMenu, setShowShareTaskMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingFile]);

  // Set first connection by default if available
  useEffect(() => {
    if (activeConnections.length > 0 && !selectedConnection) {
      setSelectedConnection(activeConnections[0]);
    }
  }, [activeConnections, selectedConnection]);

  // Sync messages in real-time
  useEffect(() => {
    if (!user || !selectedConnection) return;

    // Filter messages for current connection inside the mentorship_connections subcollection
    const q = query(
      collection(db, `mentorship_connections/${selectedConnection.id}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `mentorship_connections/${selectedConnection.id}/messages`);
    });

    // Load active connection tasks to allow "Share task link"
    const tasksQ = query(
      collection(db, 'tasks'),
      where('connId', '==', selectedConnection.id)
    );
    getDocs(tasksQ).then((snapshot) => {
      setCurrentTasks(snapshot.docs.map(doc => doc.data()));
    }).catch((err) => {
      handleFirestoreError(err, OperationType.GET, 'tasks');
    });

    return () => unsub();
  }, [user, selectedConnection]);

  // Helper detect link in string and make mock preview
  const parseLinkPreview = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    if (!match) return null;

    const url = match[0];
    if (url.includes('github.com')) {
      return {
        url,
        title: 'GitHub: Repository Home Page',
        description: 'Collaborative cloud container, branching code directories and repository commits.',
        domain: 'github.com'
      };
    }
    if (url.includes('figma.com')) {
      return {
        url,
        title: 'Figma Design System Deck',
        description: 'Interactive low fidelity wireframe screens and vector frames preview UI.',
        domain: 'figma.com'
      };
    }
    return {
      url,
      title: 'Platform Web Link Info',
      description: 'Educational URL resources matching selected training curricula guides.',
      domain: new URL(url).hostname
    };
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessageText.trim() && !pendingFile) return;

    setSendingMsg(true);
    try {
      const parsedPreview = parseLinkPreview(newMessageText);
      const msgData: any = {
        connectionId: selectedConnection.id,
        mentorId: user.uid,
        menteeId: selectedConnection.menteeId,
        text: newMessageText,
        senderId: user.uid,
        senderName: profile?.displayName || 'Dr. Faiz Rahman',
        senderRole: 'mentor',
        createdAt: serverTimestamp(),
        timestamp: Date.now()
      };

      if (parsedPreview) {
        msgData.linkPreview = parsedPreview;
      }

      if (pendingFile) {
        msgData.attachment = {
          name: pendingFile.name,
          size: pendingFile.size,
          type: pendingFile.type
        };
        // Set standard fields for compatibility with MentorshipSpace rendering
        msgData.fileName = pendingFile.name;
        msgData.fileType = pendingFile.type;
        msgData.fileUrl = 'data:text/plain;base64,TW9jayBmaWxlIGF0dGFjaG1lbnQgY29udGVudCBmb3IgZGVtb25zdHJhdGlvbi4=';
      }

      await addDoc(collection(db, `mentorship_connections/${selectedConnection.id}/messages`), msgData);

      // Dispatch EmailJS alert
      sendCrossRoleEmailNotification({
        senderId: user?.uid,
        senderName: profile?.displayName || 'Mentor',
        senderRole: 'mentor',
        recipientId: selectedConnection.menteeId,
        recipientName: selectedConnection.menteeName || 'Student',
        recipientRole: 'student',
        subject: `New Message from Mentor ${profile?.displayName || 'Mentor'}`,
        category: 'message',
        message: msgData.text,
        actionUrl: window.location.origin
      }).catch(e => console.warn('Email dispatch failed:', e));

      setNewMessageText('');
      setPendingFile(null);
    } catch (err: any) {
      console.error(err);
      alert('Error sending message');
      handleFirestoreError(err, OperationType.WRITE, `mentorship_connections/${selectedConnection.id}/messages`);
    } finally {
      setSendingMsg(false);
    }
  };

  // Mock folder files select
  const triggerMockFileAttach = () => {
    const fileNames = ['Module_Review_Blueprint.docx', 'Verification_Cert.png', 'Vite_Performance_Metrics.pdf'];
    const rIdx = Math.floor(Math.random() * fileNames.length);
    setPendingFile({
      name: fileNames[rIdx],
      size: '254 KB',
      type: fileNames[rIdx].endsWith('png') ? 'image/png' : 'application/pdf'
    });
  };

  const handleShareTask = async (task: any) => {
    setSendingMsg(true);
    try {
      const msgData = {
        connectionId: selectedConnection.id,
        mentorId: user.uid,
        menteeId: selectedConnection.menteeId,
        text: `Share Task: Verification request dispatched for "${task.title}"`,
        senderId: user.uid,
        senderName: profile?.displayName || 'Dr. Faiz Rahman',
        senderRole: 'mentor',
        createdAt: serverTimestamp(),
        timestamp: Date.now(),
        taskShare: {
          id: task.id,
          title: task.title,
          description: task.description || '',
          status: task.status || 'To Do'
        }
      };

      await addDoc(collection(db, `mentorship_connections/${selectedConnection.id}/messages`), msgData);
      setShowShareTaskMenu(false);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, `mentorship_connections/${selectedConnection.id}/messages`);
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="bg-white border-[0.5px] border-border/80 rounded-lg p-0 flex h-[580px] text-left select-none max-w-5xl mx-auto overflow-hidden">
      
      {/* LEFT PANEL: ACTIVE CONVERSATIONS */}
      <div className="w-64 border-r-[0.5px] border-border/70 flex flex-col bg-gray-50/50">
        <div className="p-4 border-b-[0.5px] border-border/60">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Active Conversations</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Real-time chat with your active mentees</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeConnections.length === 0 ? (
            <p className="text-[10px] text-gray-400 italic p-6 text-center">No current active conversations.</p>
          ) : (
            activeConnections.map((conn) => {
              const isSelected = selectedConnection?.id === conn.id;
              return (
                <div
                  key={conn.id}
                  onClick={() => setSelectedConnection(conn)}
                  className={`p-4 border-b-[0.5px] border-border/40 cursor-pointer transition-all flex items-center justify-between text-xs ${
                    isSelected ? 'bg-white border-l-[3px] border-[#534AB7]' : 'hover:bg-gray-100/40'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-gray-900">{conn.menteeName}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium truncate max-w-[160px]">Active connection</p>
                  </div>
                  
                  <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-xs shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: CHAT THREAD */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConnection ? (
          <>
            {/* ACTIVE CHAT HEADER */}
            <div className="p-4 border-b-[0.5px] border-border/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{selectedConnection.menteeName}</h3>
                <p className="text-[10px] text-gray-400">Direct Message Thread · Secure Channel</p>
              </div>

              {/* SHARE TASK MENU CONTROLLER */}
              <div className="relative">
                <button
                  onClick={() => setShowShareTaskMenu(!showShareTaskMenu)}
                  className="px-3 py-1.5 border-[0.5px] border-border rounded text-[10px] hover:bg-gray-50 flex items-center gap-1 cursor-pointer font-bold bg-white text-gray-700 uppercase"
                >
                  <Share2 className="w-3.5 h-3.5 text-gray-500" /> Share task link
                </button>

                {showShareTaskMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border-[0.5px] border-border rounded-md shadow-lg w-56 p-2 z-30 max-h-48 overflow-y-auto">
                    <span className="text-[9px] text-gray-400 font-extrabold uppercase p-1.5 block border-b border-border mb-1 mb-1.5">Select task to share</span>
                    {currentTasks.length === 0 ? (
                      <p className="text-[9px] text-gray-400 italic p-1.5">No tasks available in workspace</p>
                    ) : (
                      currentTasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleShareTask(t)}
                          className="w-full text-left p-1.5 hover:bg-gray-50 text-[10px] text-gray-700 rounded block truncate"
                          title={t.title}
                        >
                          {t.title} ({t.status})
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* MESSAGE CONTAINER */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/30">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                  <User className="w-8 h-8 text-gray-300" />
                  <p className="text-[11px] text-gray-400 italic">No messages in this chat yet. Say hello to {selectedConnection.menteeName}!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMentorSender = msg.senderRole === 'mentor' || msg.senderId === user.uid;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[70%] space-y-1 text-xs ${
                        isMentorSender ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <span className="text-[9px] text-gray-400 font-medium">
                        {isMentorSender ? 'You' : (msg.senderName || selectedConnection.menteeName)}
                      </span>
                      
                      <div 
                        className={`p-3 rounded-lg border-[0.5px] ${
                          isMentorSender 
                            ? 'bg-primary text-white border-primary/40' 
                            : 'bg-white border-border/80 text-gray-800 shadow-3xs'
                        }`}
                      >
                        {/* Task Share bubble */}
                        {msg.taskShare && (
                          <div className={`p-2.5 border-[0.5px] rounded mb-2 space-y-1 ${
                            isMentorSender ? 'bg-primary-hover/50 border-white/20' : 'bg-gray-50 border-border'
                          }`}>
                            <div className={`flex items-center gap-1.5 font-bold text-[10.5px] ${
                              isMentorSender ? 'text-white' : 'text-[#534AB7]'
                            }`}>
                              <Clipboard className="w-3.5 h-3.5" /> Direct Task Link
                            </div>
                            <p className={`font-bold text-[10px] truncate ${
                              isMentorSender ? 'text-white' : 'text-gray-900'
                            }`}>{msg.taskShare.title}</p>
                            <span className="text-[8px] bg-amber-500/20 text-yellow-300 px-1.5 py-0.5 rounded font-mono font-black border border-yellow-300/30 uppercase">
                              Status: {msg.taskShare.status}
                            </span>
                          </div>
                        )}

                        {/* File Attachment from Mentee or Mentor workspace (fileUrl style) */}
                        {msg.fileUrl && (
                          <div className={`p-2.5 border-[0.5px] rounded mb-2 space-y-2 ${
                            isMentorSender ? 'bg-primary-hover/50 border-white/20' : 'bg-gray-50 border-border'
                          }`}>
                            <div className="flex items-center gap-2">
                              <FileText className={`w-5 h-5 ${isMentorSender ? 'text-white/80' : 'text-[#534AB7]'}`} />
                              <div className="text-left">
                                <p className={`font-bold text-[10px] ${isMentorSender ? 'text-white' : 'text-gray-900'}`}>{msg.fileName}</p>
                                {msg.fileType && <span className={`text-[8px] block font-mono ${isMentorSender ? 'text-white/60' : 'text-gray-400'}`}>{msg.fileType}</span>}
                              </div>
                            </div>
                            {msg.fileType?.startsWith('image/') && (
                              <img 
                                src={msg.fileUrl} 
                                alt={msg.fileName} 
                                className="max-h-[150px] max-w-full rounded border object-contain shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <a 
                              href={msg.fileUrl} 
                              download={msg.fileName}
                              className={`text-[9px] font-bold hover:underline ${isMentorSender ? 'text-white' : 'text-[#534AB7]'}`}
                            >
                              Download Material
                            </a>
                          </div>
                        )}

                        {/* File Attachment bubble Preview (attachment style) */}
                        {msg.attachment && !msg.fileUrl && (
                          <div className={`p-2.5 border-[0.5px] rounded mb-2 flex items-center gap-2 ${
                            isMentorSender ? 'bg-primary-hover/50 border-white/20' : 'bg-gray-50 border-border'
                          }`}>
                            <FileText className={`w-5 h-5 ${isMentorSender ? 'text-white/80' : 'text-gray-400'}`} />
                            <div className="text-left">
                              <p className={`font-bold text-[10px] ${isMentorSender ? 'text-white' : 'text-gray-900'}`}>{msg.attachment.name}</p>
                              <span className={`text-[8px] block font-mono ${isMentorSender ? 'text-white/60' : 'text-gray-400'}`}>{msg.attachment.size}</span>
                            </div>
                          </div>
                        )}

                        {/* TEXT CONTENT */}
                        <p className="leading-relaxed text-left break-all">{msg.text}</p>

                        {/* Link Preview Card */}
                        {msg.linkPreview && (
                          <div className={`mt-2.5 p-2 border-[0.5px] rounded flex flex-col text-left space-y-1 ${
                            isMentorSender ? 'bg-primary-hover/50 border-white/25' : 'bg-gray-50 border-border/80'
                          }`}>
                            <div className={`flex items-center gap-1 text-[9px] font-mono ${
                              isMentorSender ? 'text-white/60' : 'text-gray-400'
                            }`}>
                              <Globe className={`w-3.5 h-3.5 ${isMentorSender ? 'text-white/60' : 'text-gray-400'}`} />
                              <span>{msg.linkPreview.domain}</span>
                            </div>
                            <p className={`font-bold text-[10px] truncate ${isMentorSender ? 'text-white' : 'text-gray-900'}`}>{msg.linkPreview.title}</p>
                            <p className={`text-[9px] leading-normal truncate ${isMentorSender ? 'text-white/80' : 'text-gray-500'}`}>{msg.linkPreview.description}</p>
                            <a 
                              href={msg.linkPreview.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className={`text-[9px] font-bold inline-flex items-center gap-0.5 hover:underline ${
                                isMentorSender ? 'text-yellow-300' : 'text-[#534AB7]'
                              }`}
                            >
                              Open resource <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </div>
                      
                      <span className="text-[8px] text-gray-400 font-mono">
                        {msg.createdAt ? (
                          msg.createdAt.toDate 
                            ? msg.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                            : (typeof msg.createdAt === 'string' 
                                ? new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                                : new Date(msg.createdAt.seconds ? msg.createdAt.seconds * 1000 : msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                              )
                        ) : 'Just now'}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT CONTROLLER AREA */}
            <div className="p-4 border-t-[0.5px] border-border/60 space-y-2 relative bg-white">
              
              {/* File Attachment Indicator */}
              {pendingFile && (
                <div className="p-2 bg-gray-50 border-[0.5px] border-border/50 rounded flex items-center justify-between text-xs animate-fade-in mb-3">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <File className="w-4 h-4 text-[#534AB7]" />
                    <span className="font-medium text-[11px]">{pendingFile.name} (Ready to upload)</span>
                  </div>
                  <button 
                    onClick={() => setPendingFile(null)}
                    className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-2 text-xs">
                {/* ATTACH BUTTON */}
                <button
                  type="button"
                  onClick={triggerMockFileAttach}
                  title="Attach mock file"
                  className="p-2.5 border-[0.5px] border-border rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 shrink-0 cursor-pointer"
                >
                  <Paperclip className="w-4 h-4 text-gray-500" />
                </button>

                <input 
                  type="text" 
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type real-time message text... (try typing figma.com or github.com to preview)"
                  className="flex-1 bg-gray-50 border-[0.5px] border-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />

                <button
                  type="submit"
                  disabled={sendingMsg}
                  className="p-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg shrink-0 cursor-pointer font-bold"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
            <User className="w-10 h-10 text-gray-200" />
            <p className="text-xs text-gray-400">Select or schedule a connected mentee conversation to unlock chat boards.</p>
          </div>
        )}
      </div>

    </div>
  );
}
