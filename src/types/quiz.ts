export type QuestionType = 'multiple_choice' | 'short_answer' | 'long_answer';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  title: string; // Question prompt/title
  options?: string[]; // For multiple_choice (e.g. ['Option 1', 'Option 2'])
  correctAnswer?: string; // Correct answer option or key
  points?: number; // Marks/points allocated for this question
}

export interface QuizSubmissionAnswer {
  questionId: string;
  questionTitle: string;
  type: QuestionType;
  answer: string;
}

export interface ExamSessionState {
  sessionId: string;
  sessionType: 'practical' | 'quiz';
  title: string;
  questionText?: string;
  questions?: QuizQuestion[];
  endTime: string;
  timeRemainingSeconds: number;
}
