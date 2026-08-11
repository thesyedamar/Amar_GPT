export interface Book {
  id: string;
  title: string;
  file?: File;
  storagePath?: string;
  downloadUrl?: string;
  geminiFileUri?: string;
  pages: number;
  uploadedDate: string;
  summary?: string;
  quizzes?: Quiz[];
  quizHistory?: QuizResult[];
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  subject: string;
  dueDate: string;
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  source?: string;
}

export interface QuizResult {
  quizId: string;
  quizTitle: string;
  score: number; // percentage
  date: string;
}
