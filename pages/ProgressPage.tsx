import React from 'react';
import { Book } from '../types';
import { ProgressIcon, CheckCircleIcon, QuizIcon } from '../components/icons';

interface ProgressPageProps {
  books: Book[];
}

const ProgressPage: React.FC<ProgressPageProps> = ({ books }) => {
    const allQuizHistory = books.flatMap(b => b.quizHistory || []);
    const averageScore = allQuizHistory.length > 0
        ? allQuizHistory.reduce((sum, result) => sum + result.score, 0) / allQuizHistory.length
        : 0;
    
    return (
        <div className="space-y-10 pt-4">
            <div className="relative border-b border-[#E9E7E0] pb-8">
                <h1 className="text-4xl md:text-5xl font-display font-normal text-[#151515] tracking-tight">
                    Analytics Dashboard
                </h1>
                <p className="text-[#6E6D6A] font-mono text-[10px] uppercase tracking-[0.2em] mt-1.5">
                    LEARNING PROGRESS & METRICS
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Quizzes Taken */}
                <div className="bg-white border border-[#E9E7E0] p-6 rounded-xl shadow-sm flex items-center group">
                    <div className="w-12 h-12 bg-neutral-50 border border-[#E9E7E0] rounded-lg flex items-center justify-center mr-5 text-[#151515] transition-colors duration-200 group-hover:bg-[#151515] group-hover:text-white">
                        <QuizIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-0.5">Quizzes Taken</p>
                        <p className="text-3xl font-display font-normal text-[#151515]">{allQuizHistory.length}</p>
                    </div>
                </div>

                {/* Card 2: Average Score */}
                <div className="bg-white border border-[#E9E7E0] p-6 rounded-xl shadow-sm flex items-center group">
                    <div className="w-12 h-12 bg-neutral-50 border border-[#E9E7E0] rounded-lg flex items-center justify-center mr-5 text-emerald-800 transition-colors duration-200 group-hover:bg-[#1E3E26] group-hover:text-white">
                        <CheckCircleIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-0.5">Average Score</p>
                        <p className="text-3xl font-display font-normal text-[#151515]">{averageScore.toFixed(1)}%</p>
                    </div>
                </div>

                {/* Card 3: Study Streak */}
                <div className="bg-white border border-[#E9E7E0] p-6 rounded-xl shadow-sm flex items-center group">
                    <div className="w-12 h-12 bg-neutral-50 border border-[#E9E7E0] rounded-lg flex items-center justify-center mr-5 text-neutral-600 transition-colors duration-200 group-hover:bg-[#4A4947] group-hover:text-white">
                        <ProgressIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-0.5">Current Streak</p>
                        <p className="text-3xl font-display font-normal text-[#151515]">1 Day</p>
                    </div>
                </div>
            </div>
            
            {/* Recent Quizzes List Card */}
            <div className="bg-white border border-[#E9E7E0] rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[350px]">
                <div className="bg-[#FAF9F6] border-b border-[#E9E7E0] px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xs font-mono font-medium text-neutral-500 uppercase tracking-wider">
                        EVALUATION HISTORY
                    </h2>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                    {allQuizHistory.length > 0 ? (
                        <ul className="space-y-4">
                            {allQuizHistory.slice(-5).reverse().map((result, index) => (
                                <li key={index} className="flex justify-between items-center p-4 bg-white border border-[#E9E7E0] rounded-xl">
                                    <div>
                                        <p className="text-xs sm:text-sm font-sans font-semibold text-[#151515]">{result.quizTitle}</p>
                                        <p className="text-[10px] font-mono text-neutral-400 mt-1 uppercase tracking-wide">Date: {result.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xl sm:text-2xl font-display font-normal leading-none ${result.score >= 80 ? 'text-emerald-700 font-semibold' : result.score >= 50 ? 'text-neutral-800' : 'text-neutral-500'}`}>
                                            {result.score.toFixed(0)}%
                                        </p>
                                        <span className="text-[9px] font-mono text-neutral-400 mt-1 block uppercase tracking-wider">Score</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-12 h-12 bg-neutral-50 border border-[#E9E7E0] rounded-xl flex items-center justify-center mb-4 text-neutral-400">
                                <QuizIcon className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-display font-medium text-[#151515]">No Evaluation Data</h3>
                            <p className="max-w-xs text-xs font-sans text-neutral-400 mt-2 leading-relaxed">
                                Your record history is currently empty. Complete a book quiz to update performance metrics maps.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProgressPage;
