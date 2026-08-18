import React, { useState } from 'react';
import { QuizQuestion, QuestionType } from '../types/quiz';
import { 
  Plus, Trash2, HelpCircle, CheckCircle2, List, AlignLeft, 
  Type, ArrowUp, ArrowDown, Copy, Sparkles, Clock, Send, Eye, X, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoogleQuizBuilderProps {
  quizTitle: string;
  setQuizTitle: (val: string) => void;
  quizStartTime: string;
  setQuizStartTime: (val: string) => void;
  quizEndTime: string;
  setQuizEndTime: (val: string) => void;
  questions: QuizQuestion[];
  setQuestions: React.Dispatch<React.SetStateAction<QuizQuestion[]>>;
  onSubmitQuiz: (e: React.FormEvent) => void;
  isPublishing: boolean;
  onCancel: () => void;
}

export function GoogleQuizBuilder({
  quizTitle,
  setQuizTitle,
  quizStartTime,
  setQuizStartTime,
  quizEndTime,
  setQuizEndTime,
  questions,
  setQuestions,
  onSubmitQuiz,
  isPublishing,
  onCancel
}: GoogleQuizBuilderProps) {
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(questions[0]?.id || null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Add new question
  const handleAddQuestion = (type: QuestionType = 'multiple_choice') => {
    const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newQuestion: QuizQuestion = {
      id: newId,
      type,
      title: 'Untitled Question',
      options: type === 'multiple_choice' ? ['Option 1', 'Option 2', 'Option 3', 'Option 4'] : undefined,
      correctAnswer: type === 'multiple_choice' ? 'Option 1' : undefined,
      points: 5
    };
    setQuestions([...questions, newQuestion]);
    setActiveQuestionId(newId);
  };

  // Remove question
  const handleRemoveQuestion = (id: string) => {
    if (questions.length <= 1) {
      alert('A quiz must contain at least 1 question.');
      return;
    }
    const filtered = questions.filter(q => q.id !== id);
    setQuestions(filtered);
    if (activeQuestionId === id) {
      setActiveQuestionId(filtered[0]?.id || null);
    }
  };

  // Duplicate question
  const handleDuplicateQuestion = (q: QuizQuestion) => {
    const dupId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const duplicated: QuizQuestion = {
      ...q,
      id: dupId,
      title: `${q.title} (Copy)`,
      options: q.options ? [...q.options] : undefined
    };
    const idx = questions.findIndex(item => item.id === q.id);
    const newArr = [...questions];
    newArr.splice(idx + 1, 0, duplicated);
    setQuestions(newArr);
    setActiveQuestionId(dupId);
  };

  // Move question up/down
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const newArr = [...questions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    setQuestions(newArr);
  };

  // Update specific question field
  const handleUpdateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        // If type changed to multiple choice, make sure options exist
        if (updates.type === 'multiple_choice' && (!q.options || q.options.length === 0)) {
          return {
            ...q,
            ...updates,
            options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            correctAnswer: 'Option 1'
          };
        }
        return { ...q, ...updates };
      }
      return q;
    }));
  };

  // Option management for MCQ
  const handleAddOption = (qId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const opts = q.options || [];
        const nextOptNum = opts.length + 1;
        return { ...q, options: [...opts, `Option ${nextOptNum}`] };
      }
      return q;
    }));
  };

  const handleUpdateOption = (qId: string, optIndex: number, val: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const opts = [...(q.options || [])];
        const oldVal = opts[optIndex];
        opts[optIndex] = val;
        // If this was the correct answer, update correctAnswer as well
        let newCorrect = q.correctAnswer;
        if (q.correctAnswer === oldVal) {
          newCorrect = val;
        }
        return { ...q, options: opts, correctAnswer: newCorrect };
      }
      return q;
    }));
  };

  const handleRemoveOption = (qId: string, optIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const opts = (q.options || []).filter((_, idx) => idx !== optIndex);
        return { ...q, options: opts };
      }
      return q;
    }));
  };

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div className="p-5 bg-amber-500/5 border border-amber-500/30 rounded-2xl space-y-6 text-left shadow-sm">
      
      {/* BUILDER HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-500 text-white font-mono font-extrabold text-[10px] uppercase rounded-full tracking-wider">
              GOOGLE QUIZ BUILDER
            </span>
            <span className="text-xs font-bold text-amber-600 font-mono">
              {questions.length} Question{questions.length !== 1 ? 's' : ''} ({totalPoints} Total Pts)
            </span>
          </div>
          <h4 className="text-base font-black text-text-primary tracking-tight">
            Create Multi-Type Quiz Assessment
          </h4>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="px-3.5 py-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-border text-text-primary font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-amber-500" />
            <span>{isPreviewMode ? 'Edit Builder' : 'Student Preview'}</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isPreviewMode ? (
        /* PREVIEW MODE FOR MENTOR */
        <div className="p-6 bg-card border border-border rounded-2xl space-y-6 shadow-inner">
          <div className="border-b border-border pb-4 space-y-2">
            <h3 className="text-xl font-extrabold text-text-primary">{quizTitle || 'Untitled Quiz'}</h3>
            <p className="text-xs text-text-secondary">Student Preview View • {questions.length} Questions ({totalPoints} Points)</p>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-4 bg-bg-secondary/60 border border-border rounded-xl space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h5 className="font-bold text-sm text-text-primary">
                    Q{idx + 1}. {q.title}
                  </h5>
                  <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {q.points || 5} pts
                  </span>
                </div>

                {q.type === 'multiple_choice' && (
                  <div className="space-y-2 pl-2">
                    {q.options?.map((opt, i) => (
                      <div key={i} className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-medium ${
                        q.correctAnswer === opt ? 'bg-success/10 border-success/30 text-success' : 'bg-card border-border text-text-primary'
                      }`}>
                        <div className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[8px] font-bold">
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span>{opt}</span>
                        {q.correctAnswer === opt && <span className="ml-auto text-[9px] font-bold uppercase font-mono">(Answer Key)</span>}
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'short_answer' && (
                  <input
                    type="text"
                    disabled
                    placeholder="Student types single line short answer here..."
                    className="w-full bg-card border border-border rounded-lg p-2.5 text-xs text-text-muted cursor-not-allowed font-mono"
                  />
                )}

                {q.type === 'long_answer' && (
                  <textarea
                    rows={3}
                    disabled
                    placeholder="Student writes detailed long answer / paragraph response here..."
                    className="w-full bg-card border border-border rounded-lg p-2.5 text-xs text-text-muted cursor-not-allowed font-mono"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* BUILDER EDIT MODE */
        <form onSubmit={onSubmitQuiz} className="space-y-6">
          
          {/* QUIZ MAIN META INFO */}
          <div className="p-4 bg-card border border-border rounded-xl space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-text-secondary mb-1">
                Quiz Title *
              </label>
              <input
                type="text"
                required
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g. Node.js & Express Architecture Quiz"
                className="w-full bg-bg-secondary border border-border rounded-xl p-3 text-sm font-bold text-text-primary focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-text-secondary mb-1">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={quizStartTime}
                  onChange={(e) => setQuizStartTime(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-text-secondary mb-1">
                  End Date & Time * (Exam Window)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={quizEndTime}
                  onChange={(e) => setQuizEndTime(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* QUESTIONS LIST */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h5 className="font-extrabold text-xs uppercase tracking-wider text-text-primary flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-500" /> Quiz Questions List
              </h5>

              {/* QUICK ADD BUTTONS */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddQuestion('multiple_choice')}
                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/30 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> MCQ
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('short_answer')}
                  className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Short Ans
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('long_answer')}
                  className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 border border-purple-500/30 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Long Ans
                </button>
              </div>
            </div>

            {questions.map((q, qIndex) => {
              const isActive = activeQuestionId === q.id;

              return (
                <motion.div
                  key={q.id}
                  onClick={() => setActiveQuestionId(q.id)}
                  className={`p-5 rounded-2xl border transition-all space-y-4 ${
                    isActive 
                      ? 'bg-card border-amber-500 shadow-md ring-2 ring-amber-500/20' 
                      : 'bg-card/70 hover:bg-card border-border'
                  }`}
                >
                  {/* QUESTION TOP BAR */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        {qIndex + 1}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Question #{qIndex + 1}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* QUESTION TYPE SELECTOR */}
                      <select
                        value={q.type}
                        onChange={(e) => handleUpdateQuestion(q.id, { type: e.target.value as QuestionType })}
                        className="bg-bg-secondary border border-border text-text-primary text-xs font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
                      >
                        <option value="multiple_choice">Multiple Choice (MCQ)</option>
                        <option value="short_answer">Short Answer</option>
                        <option value="long_answer">Long Answer (Paragraph)</option>
                      </select>

                      {/* POINTS ALLOCATION */}
                      <div className="flex items-center gap-1 bg-bg-secondary border border-border rounded-lg px-2 py-0.5">
                        <span className="text-[10px] font-bold text-text-muted">Pts:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={q.points || 5}
                          onChange={(e) => handleUpdateQuestion(q.id, { points: parseInt(e.target.value) || 1 })}
                          className="w-10 bg-transparent text-xs font-bold text-text-primary text-center focus:outline-none"
                        />
                      </div>

                      {/* MOVE REORDER BUTTONS */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMoveQuestion(qIndex, 'up'); }}
                        disabled={qIndex === 0}
                        className="p-1 hover:bg-bg-tertiary rounded text-text-muted disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMoveQuestion(qIndex, 'down'); }}
                        disabled={qIndex === questions.length - 1}
                        className="p-1 hover:bg-bg-tertiary rounded text-text-muted disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* DUPLICATE BUTTON */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDuplicateQuestion(q); }}
                        title="Duplicate Question"
                        className="p-1.5 hover:bg-bg-tertiary text-text-muted hover:text-text-primary rounded-lg transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* DELETE BUTTON */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveQuestion(q.id); }}
                        title="Delete Question"
                        className="p-1.5 hover:bg-error/10 text-text-muted hover:text-error rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* QUESTION TITLE / PROMPT STATEMENT INPUT */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Question Prompt / Statement *
                    </label>
                    <input
                      type="text"
                      required
                      value={q.title}
                      onChange={(e) => handleUpdateQuestion(q.id, { title: e.target.value })}
                      placeholder="e.g. What is the difference between SQL and NoSQL databases?"
                      className="w-full bg-bg-secondary border border-border rounded-xl p-2.5 text-xs font-semibold text-text-primary focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* MCQ OPTIONS BUILDER */}
                  {q.type === 'multiple_choice' && (
                    <div className="space-y-2.5 pl-2 border-l-2 border-amber-500/30 pt-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-600">
                        Options Choices & Answer Key (Select radio button for correct answer)
                      </label>

                      {q.options?.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            checked={q.correctAnswer === opt}
                            onChange={() => handleUpdateQuestion(q.id, { correctAnswer: opt })}
                            title="Set as correct answer key"
                            className="w-4 h-4 accent-amber-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-text-muted w-5 font-mono">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <input
                            type="text"
                            required
                            value={opt}
                            onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            className="flex-1 bg-bg-secondary border border-border rounded-lg p-2 text-xs font-medium focus:outline-none focus:border-amber-500"
                          />
                          {(q.options?.length || 0) > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(q.id, optIdx)}
                              className="p-1 hover:bg-error/10 text-text-muted hover:text-error rounded transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddOption(q.id)}
                        className="mt-2 text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Option
                      </button>
                    </div>
                  )}

                  {/* SHORT ANSWER PLACEHOLDER PREVIEW */}
                  {q.type === 'short_answer' && (
                    <div className="p-3 bg-bg-secondary rounded-xl border border-dashed border-border text-xs text-text-muted flex items-center gap-2">
                      <Type className="w-4 h-4 text-primary shrink-0" />
                      <span>Student will be provided a single-line text input field to type their answer.</span>
                    </div>
                  )}

                  {/* LONG ANSWER PLACEHOLDER PREVIEW */}
                  {q.type === 'long_answer' && (
                    <div className="p-3 bg-bg-secondary rounded-xl border border-dashed border-border text-xs text-text-muted flex items-center gap-2">
                      <AlignLeft className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>Student will be provided a full multi-line writing area (textarea) to type detailed explanations.</span>
                    </div>
                  )}

                </motion.div>
              );
            })}
          </div>

          {/* ADD QUESTION BAR AT BOTTOM */}
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleAddQuestion('multiple_choice')}
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/30 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add MCQ Question
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('short_answer')}
              className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Short Answer
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('long_answer')}
              className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 border border-purple-500/30 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Long Answer
            </button>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-4 border-t border-amber-500/20 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 py-3 bg-bg-secondary hover:bg-bg-tertiary text-text-primary font-bold text-xs rounded-xl border border-border cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPublishing}
              className="w-2/3 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isPublishing ? 'Publishing Quiz...' : 'Generate & Send Quiz Invitation'}</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
