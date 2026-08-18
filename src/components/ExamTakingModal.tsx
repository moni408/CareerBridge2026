import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion } from '../types/quiz';
import { 
  Clock, AlertTriangle, CheckCircle2, Lock, FileText, HelpCircle, 
  Send, X, Sparkles, AlertCircle, ShieldAlert, Check, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExamTakingModalProps {
  session: any; // Practical or Quiz session object
  onClose: () => void;
  onSubmitExam: (submissionData: {
    textAnswer?: string;
    quizAnswers?: Record<string, string>;
    formattedSummary: string;
  }, autoSubmitted?: boolean) => Promise<void>;
}

export function ExamTakingModal({
  session,
  onClose,
  onSubmitExam
}: ExamTakingModalProps) {
  const isPractical = session.format === 'practical';
  const isQuiz = session.format === 'quiz';

  // Practical answer state
  const [practicalAnswerText, setPracticalAnswerText] = useState('');

  // Quiz answers map state (questionId -> chosen answer string)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  // Submitting / Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmEndModal, setShowConfirmEndModal] = useState(false);

  // Time remaining tracking
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const endTimeMs = new Date(session.endTime || session.deadline || Date.now() + 1800000).getTime();
  const timeRemainingSeconds = Math.max(0, Math.floor((endTimeMs - nowTime) / 1000));

  const autoSubmittedRef = useRef(false);

  // Live timer tick every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setNowTime(now);

      // AUTO-SUBMIT TRIGGER WHEN TIME EXCEEDS IN THE MIDDLE OF EXAM!
      if (now >= endTimeMs && !autoSubmittedRef.current && !isSubmitting) {
        autoSubmittedRef.current = true;
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTimeMs, isSubmitting]);

  // Handle Auto-submit when time expires
  const handleAutoSubmit = async () => {
    setIsSubmitting(true);
    try {
      const summary = generateSubmissionSummary();
      await onSubmitExam({
        textAnswer: practicalAnswerText,
        quizAnswers,
        formattedSummary: summary
      }, true); // autoSubmitted = true
      
      alert('⏰ Time limit reached! Your exam answers have been automatically saved and submitted.');
      onClose();
    } catch (err) {
      console.error('Failed to auto-submit exam:', err);
      alert('Time limit reached. Attempted auto-submit.');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate clean string representation of answers for storage
  const generateSubmissionSummary = () => {
    if (isPractical) {
      return practicalAnswerText.trim() || '[No answer written before time expired]';
    }

    if (isQuiz) {
      const questionsList: QuizQuestion[] = session.questions || [];
      if (questionsList.length > 0) {
        return questionsList.map((q, idx) => {
          const ans = quizAnswers[q.id] || '[Unanswered]';
          return `Q${idx + 1} (${q.title}): ${ans}`;
        }).join('\n\n');
      }
      return Object.entries(quizAnswers).map(([qId, ans]) => `${qId}: ${ans}`).join('\n') || '[No answers selected]';
    }

    return practicalAnswerText || 'Submitted';
  };

  // Manual End Exam trigger by clicking "End Exam" button
  const handleManualEndExam = async () => {
    // Validate that student wrote something
    if (isPractical && !practicalAnswerText.trim()) {
      alert('Please write your answer/solution before ending the exam.');
      return;
    }

    setShowConfirmEndModal(true);
  };

  const confirmAndSubmit = async () => {
    setShowConfirmEndModal(false);
    setIsSubmitting(true);
    try {
      const summary = generateSubmissionSummary();
      await onSubmitExam({
        textAnswer: practicalAnswerText,
        quizAnswers,
        formattedSummary: summary
      }, false);

      alert('Exam successfully submitted! You have completed this assessment.');
      onClose();
    } catch (err) {
      console.error('Failed to submit exam:', err);
      alert('Error submitting exam answers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format time display hh:mm:ss
  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const isTimeCritical = timeRemainingSeconds < 300; // < 5 mins

  // Questions for Quiz
  const questionsList: QuizQuestion[] = session.questions || [];
  const totalQuestions = questionsList.length || session.questionCount || 5;
  const answeredCount = Object.keys(quizAnswers).filter(k => (quizAnswers[k] || '').trim().length > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border-2 border-border w-full max-w-4xl h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left relative"
      >
        {/* EXAM TOP HEADER BAR */}
        <div className={`p-4 sm:p-5 border-b border-border flex flex-wrap items-center justify-between gap-4 shrink-0 transition-colors ${
          isTimeCritical ? 'bg-error/15 border-error/40' : 'bg-bg-secondary'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 font-mono font-extrabold text-[10px] uppercase rounded-full tracking-wider text-white ${
                isPractical ? 'bg-emerald-600' : 'bg-amber-600'
              }`}>
                {isPractical ? 'PRACTICAL EXAM' : 'QUIZ ASSESSMENT'}
              </span>
              <span className="text-xs font-bold text-text-muted">
                {session.moduleTitle || 'Mentorship Milestone'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-text-primary tracking-tight">
              {session.title}
            </h3>
          </div>

          {/* TIMER DISPLAY */}
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-2xl border font-mono font-black text-sm sm:text-base flex items-center gap-2 ${
              isTimeCritical 
                ? 'bg-error text-white border-error animate-pulse shadow-lg shadow-error/30' 
                : 'bg-card border-border text-primary'
            }`}>
              <Clock className="w-4 h-4" />
              <span>{formatTimer(timeRemainingSeconds)}</span>
            </div>

            <button
              onClick={onClose}
              title="Close (Exam stays active until time ends)"
              className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-tertiary transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TIME CRITICAL WARNING BANNER */}
        {isTimeCritical && (
          <div className="bg-error text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 shrink-0 animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Time limit expiring soon! Answers will automatically save and submit when timer reaches 00:00.</span>
            </div>
          </div>
        )}

        {/* MAIN WRITING / TAKING CONTENT SPACE */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          
          {/* PRACTICAL TASK WRITING SPACE */}
          {isPractical && (
            <div className="space-y-6">
              
              {/* PROBLEM QUESTION STATEMENT BOX */}
              <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-xs uppercase tracking-wider">
                  <FileText className="w-4 h-4" /> Problem Question Statement
                </div>
                <p className="text-sm font-semibold text-text-primary whitespace-pre-wrap leading-relaxed">
                  {session.question || 'Detailed problem prompt...'}
                </p>
              </div>

              {/* FULL WRITING SPACE TEXTAREA */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-text-secondary">
                  <label className="uppercase tracking-wider">Your Full Writing & Solution Space *</label>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Save className="w-3.5 h-3.5" /> Auto-Saving Draft
                    </span>
                    <span>{practicalAnswerText.length} chars</span>
                    <span>{practicalAnswerText.split(/\s+/).filter(Boolean).length} words</span>
                  </div>
                </div>

                <textarea
                  rows={14}
                  value={practicalAnswerText}
                  onChange={(e) => setPracticalAnswerText(e.target.value)}
                  placeholder="Write your complete solution, source code, design architecture, or project explanation here..."
                  className="w-full bg-bg-secondary/70 border border-border rounded-2xl p-4 text-xs sm:text-sm font-mono text-text-primary focus:outline-none focus:border-emerald-500 leading-relaxed custom-scrollbar shadow-inner"
                />
              </div>

            </div>
          )}

          {/* QUIZ TAKING SPACE */}
          {isQuiz && (
            <div className="space-y-6">
              
              {/* QUIZ HEADER INFO */}
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-wrap justify-between items-center gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                    Assessment Questions ({totalQuestions})
                  </p>
                  <p className="text-[11px] text-text-secondary">Select or type your answers below before ending exam.</p>
                </div>
                <div className="px-3 py-1 bg-card border border-border rounded-xl text-xs font-bold font-mono text-text-primary">
                  Progress: {answeredCount}/{totalQuestions} Answered
                </div>
              </div>

              {/* STRUCTURED QUESTIONS RENDER */}
              {questionsList.length > 0 ? (
                <div className="space-y-6">
                  {questionsList.map((q, idx) => {
                    const currentAnswer = quizAnswers[q.id] || '';

                    return (
                      <div key={q.id} className="p-5 bg-bg-secondary/60 border border-border rounded-2xl space-y-4 shadow-xs">
                        <div className="flex justify-between items-start gap-3">
                          <h4 className="font-extrabold text-sm sm:text-base text-text-primary leading-snug">
                            <span className="text-amber-600 font-mono mr-1.5">Q{idx + 1}.</span>
                            {q.title}
                          </h4>
                          <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 shrink-0">
                            {q.points || 5} pts
                          </span>
                        </div>

                        {/* MCQ OPTIONS */}
                        {q.type === 'multiple_choice' && (
                          <div className="space-y-2.5 pl-2">
                            {q.options?.map((opt, optIdx) => {
                              const isSelected = currentAnswer === opt;

                              return (
                                <label
                                  key={optIdx}
                                  onClick={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt })}
                                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-500/15 border-amber-500 text-text-primary font-bold shadow-xs'
                                      : 'bg-card hover:bg-bg-tertiary border-border text-text-secondary'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`quiz_q_${q.id}`}
                                    checked={isSelected}
                                    onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt })}
                                    className="w-4 h-4 accent-amber-500"
                                  />
                                  <span className="w-5 font-mono text-xs font-bold text-text-muted">
                                    {String.fromCharCode(65 + optIdx)}.
                                  </span>
                                  <span className="text-xs sm:text-sm">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* SHORT ANSWER */}
                        {q.type === 'short_answer' && (
                          <input
                            type="text"
                            value={currentAnswer}
                            onChange={(e) => setQuizAnswers({ ...quizAnswers, [q.id]: e.target.value })}
                            placeholder="Type your short answer here..."
                            className="w-full bg-card border border-border rounded-xl p-3 text-xs sm:text-sm font-medium text-text-primary focus:outline-none focus:border-amber-500 font-mono"
                          />
                        )}

                        {/* LONG ANSWER */}
                        {q.type === 'long_answer' && (
                          <textarea
                            rows={4}
                            value={currentAnswer}
                            onChange={(e) => setQuizAnswers({ ...quizAnswers, [q.id]: e.target.value })}
                            placeholder="Type your detailed written answer here..."
                            className="w-full bg-card border border-border rounded-xl p-3 text-xs sm:text-sm font-medium text-text-primary focus:outline-none focus:border-amber-500 font-mono"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* LEGACY UNSTRUCTURED QUIZ TEXT AREA */
                <div className="space-y-3">
                  <p className="text-xs font-bold text-text-secondary whitespace-pre-wrap">{session.quizContent}</p>
                  <textarea
                    rows={10}
                    value={practicalAnswerText}
                    onChange={(e) => setPracticalAnswerText(e.target.value)}
                    placeholder="Type your quiz answers here..."
                    className="w-full bg-bg-secondary border border-border rounded-2xl p-4 text-xs sm:text-sm font-mono text-text-primary focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

            </div>
          )}

        </div>

        {/* BOTTOM ACTION BAR WITH END EXAM BUTTON */}
        <div className="p-4 sm:p-5 bg-bg-secondary border-t border-border flex items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-text-muted font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Answers auto-saved. Click "End Exam" when finished.</span>
          </div>

          <button
            type="button"
            onClick={handleManualEndExam}
            disabled={isSubmitting}
            className={`px-6 py-3 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center gap-2 text-white ${
              isPractical
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Ending Exam...' : 'End Exam'}</span>
          </button>
        </div>

        {/* CONFIRM END EXAM MODAL */}
        <AnimatePresence>
          {showConfirmEndModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
            >
              <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-text-primary uppercase tracking-tight">
                    End & Submit Exam?
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Are you sure you want to finalize and end the exam? Once submitted, you will no longer be able to click "Take Part" or modify your answers.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmEndModal(false)}
                    className="w-1/2 py-2.5 bg-bg-secondary hover:bg-bg-tertiary font-bold text-xs rounded-xl border border-border cursor-pointer text-text-primary"
                  >
                    Cancel / Keep Writing
                  </button>
                  <button
                    type="button"
                    onClick={confirmAndSubmit}
                    className={`w-1/2 py-2.5 font-bold text-xs rounded-xl text-white shadow-md cursor-pointer ${
                      isPractical ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    Yes, End Exam
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
