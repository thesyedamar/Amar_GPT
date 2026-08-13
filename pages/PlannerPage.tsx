import React, { useState } from 'react';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Book, TodoItem } from '../types';
import { generateStudyPlan } from '../services/geminiService';
import { PlannerIcon, SparklesIcon, Spinner, TrashIcon, PlusIcon, BookIcon, ClockIcon } from '../components/icons';
import { getFile } from '../lib/fileStorage';

interface PlannerPageProps {
  books: Book[];
  todos: TodoItem[];
  setTodos: React.Dispatch<React.SetStateAction<TodoItem[]>>;
}

const fileToBase64 = (file: any): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file || !(file instanceof Blob)) {
            reject(new Error("Parameter 1 is not of type 'Blob'."));
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = error => reject(error);
    });
};

const PlannerPage: React.FC<PlannerPageProps> = ({ books, todos, setTodos }) => {
    const [selectedBook, setSelectedBook] = useState<string>('');
    const [goal, setGoal] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [manualTaskText, setManualTaskText] = useState('');
    const [manualTaskBookId, setManualTaskBookId] = useState('');
    const [manualTaskDueDate, setManualTaskDueDate] = useState('');

    const handleGeneratePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBook || !goal) return;
        
        const book = books.find(b => b.id === selectedBook);
        if (!book) return;

        setIsLoading(true);
        setErrorMsg(null);
        try {
            let file = book.file;
            if (!file) {
                file = (await getFile(book.id)) as File;
            }

            let base64Data = "";
            if (file) {
                try {
                    base64Data = await fileToBase64(file);
                } catch (e) {
                    console.warn("Could not read local file for base64:", e);
                }
            }

            const planTasks = await generateStudyPlan(book.title, base64Data, goal);
            
            const newTodos: TodoItem[] = planTasks.map((task, index) => ({
                ...task,
                id: `todo-${Date.now()}-${index}`,
                completed: false,
                dueDate: new Date(task.dueDate || Date.now()).toISOString(),
            }));
            
            if (auth.currentUser) {
                for (const todo of newTodos) {
                    const todoRef = doc(db, 'users', auth.currentUser.uid, 'todos', todo.id);
                    await setDoc(todoRef, { ...todo, userId: auth.currentUser.uid });
                }
            }
        } catch (error) {
            console.error("Failed to generate plan:", error);
            setErrorMsg("Failed to generate plan. Please try again.");
        } finally {
            setIsLoading(false);
            setGoal('');
        }
    };

    const handleManualAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualTaskText.trim() || !manualTaskBookId || !manualTaskDueDate || !auth.currentUser) return;

        const book = books.find(b => b.id === manualTaskBookId);
        if (!book) return;

        const newTodo: TodoItem = {
            id: `todo-manual-${Date.now()}`,
            text: manualTaskText.trim(),
            completed: false,
            subject: book.title,
            dueDate: new Date(manualTaskDueDate).toISOString(),
        };

        try {
            const todoRef = doc(db, 'users', auth.currentUser.uid, 'todos', newTodo.id);
            await setDoc(todoRef, { ...newTodo, userId: auth.currentUser.uid });
            
            setManualTaskText('');
            setManualTaskBookId('');
            setManualTaskDueDate('');
        } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${auth.currentUser.uid}/todos/${newTodo.id}`);
        }
    };
    
    const toggleTodo = async (id: string) => {
        if (!auth.currentUser) return;
        const todo = todos.find(t => t.id === id);
        if (!todo) return;

        try {
            const todoRef = doc(db, 'users', auth.currentUser.uid, 'todos', id);
            await updateDoc(todoRef, { completed: !todo.completed });
        } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}/todos/${id}`);
        }
    };

    const deleteTodo = async (id: string) => {
        if (!auth.currentUser) return;

        try {
            const todoRef = doc(db, 'users', auth.currentUser.uid, 'todos', id);
            await deleteDoc(todoRef);
        } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `users/${auth.currentUser.uid}/todos/${id}`);
        }
    };

    return (
        <div className="space-y-10 pt-4">
            <div className="relative border-b border-[#E9E7E0] pb-8">
                <h1 className="text-4xl md:text-5xl font-display font-normal text-[#151515] tracking-tight">
                    Task Planner
                </h1>
                <p className="text-[#6E6D6A] font-mono text-[10px] uppercase tracking-[0.2em] mt-1.5">
                    KNOWLEDGE ROADMAP & ASSIGNMENTS
                </p>
            </div>

            {errorMsg && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-xs font-sans font-medium text-red-700">
                    {errorMsg}
                </div>
            )}
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-1 space-y-8">
                    {/* AI Plan Generator Card */}
                    <div className="bg-white border border-[#E9E7E0] rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-[#FAF9F6] border-b border-[#E9E7E0] px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xs font-mono font-medium text-neutral-500 uppercase tracking-wider flex items-center">
                                <SparklesIcon className="mr-2 text-neutral-400 w-4 h-4" /> 
                                AI Plan Generator
                            </h2>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleGeneratePlan} className="space-y-5">
                                <div>
                                    <label htmlFor="book-select-ai" className="block text-xs font-sans font-semibold text-neutral-700 tracking-tight mb-2">Select Study Material</label>
                                    <select 
                                        id="book-select-ai"
                                        value={selectedBook} 
                                        onChange={e => setSelectedBook(e.target.value)}
                                        className="clay-input appearance-none cursor-pointer"
                                        disabled={books.length === 0}
                                    >
                                        <option value="">{books.length > 0 ? 'Choose a book...' : 'No documents available'}</option>
                                        {books.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="goal" className="block text-xs font-sans font-semibold text-neutral-700 tracking-tight mb-2">Study Goal</label>
                                    <textarea
                                        id="goal"
                                        rows={3}
                                        value={goal}
                                        onChange={e => setGoal(e.target.value)}
                                        placeholder="e.g., 'Prepare for midterm exam'"
                                        className="clay-input resize-none"
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={isLoading || !selectedBook || !goal}
                                    className="w-full py-3 bg-[#151515] text-white rounded-lg text-sm font-sans font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-40 flex items-center justify-center shadow-sm"
                                >
                                    {isLoading ? <Spinner className="mr-2 w-4 h-4 animate-spin" /> : <PlannerIcon className="w-4 h-4 mr-2" />}
                                    {isLoading ? 'Generating Plan...' : 'Generate AI Plan'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Manual Task Creator Card */}
                    <div className="bg-white border border-[#E9E7E0] rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-[#FAF9F6] border-b border-[#E9E7E0] px-6 py-4">
                            <h2 className="text-xs font-mono font-medium text-neutral-500 uppercase tracking-wider flex items-center">
                                <PlusIcon className="w-4 h-4 mr-2 text-neutral-400" />
                                Add Custom Task
                            </h2>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleManualAddTask} className="space-y-5">
                                <div>
                                    <label htmlFor="task-text" className="block text-xs font-sans font-semibold text-neutral-700 tracking-tight mb-2">Task Description</label>
                                    <input
                                        id="task-text"
                                        type="text"
                                        value={manualTaskText}
                                        onChange={e => setManualTaskText(e.target.value)}
                                        placeholder="e.g., 'Read Chapter 3'"
                                        className="clay-input"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="book-select-manual" className="block text-xs font-sans font-semibold text-neutral-700 tracking-tight mb-2">Related Book</label>
                                    <select 
                                        id="book-select-manual"
                                        value={manualTaskBookId} 
                                        onChange={e => setManualTaskBookId(e.target.value)}
                                        className="clay-input appearance-none cursor-pointer"
                                        disabled={books.length === 0}
                                    >
                                        <option value="">{books.length > 0 ? 'Select a book...' : 'No books available'}</option>
                                        {books.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="due-date" className="block text-xs font-sans font-semibold text-neutral-700 tracking-tight mb-2">Due Date</label>
                                    <input
                                        id="due-date"
                                        type="date"
                                        value={manualTaskDueDate}
                                        onChange={e => setManualTaskDueDate(e.target.value)}
                                        className="clay-input"
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={!manualTaskText.trim() || !manualTaskBookId || !manualTaskDueDate}
                                    className="w-full py-3 bg-white border border-[#D5D3CC] text-neutral-800 rounded-lg text-sm font-sans font-semibold hover:bg-neutral-50 transition-colors disabled:opacity-40 flex items-center justify-center shadow-sm"
                                >
                                    <PlusIcon className="w-4 h-4 mr-2 text-neutral-600" />
                                    Add Task
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-2">
                    <div className="bg-white border border-[#E9E7E0] rounded-xl overflow-hidden shadow-sm min-h-[480px] flex flex-col">
                        <div className="bg-[#FAF9F6] border-b border-[#E9E7E0] px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xs font-mono font-medium text-neutral-500 uppercase tracking-wider">
                                STUDY ASSIGNMENTS
                            </h2>
                            <span className="px-2.5 py-0.5 bg-[#FAF9F6] border border-[#E9E7E0] rounded-md text-[10px] font-mono text-neutral-600 shadow-sm">
                                {todos.length} Active
                            </span>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            {todos.length > 0 ? (
                                <ul className="space-y-4">
                                    {todos.map(todo => (
                                        <li 
                                            key={todo.id} 
                                            className="group flex items-start p-4 bg-white border border-[#E9E7E0] hover:border-neutral-400 rounded-xl transition-all duration-150"
                                        >
                                            <div className="flex items-center h-5 mr-4">
                                                <input 
                                                    type="checkbox" 
                                                    checked={todo.completed} 
                                                    onChange={() => toggleTodo(todo.id)} 
                                                    className="w-4 h-4 rounded border-[#D5D3CC] text-[#151515] focus:ring-black accent-[#151515] cursor-pointer" 
                                                />
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <p className={`text-xs sm:text-sm font-sans font-medium text-neutral-800 ${todo.completed ? 'line-through text-neutral-400' : ''}`}>
                                                    {todo.text}
                                                </p>
                                                <div className="flex flex-wrap items-center mt-2.5 gap-3 text-[10px]">
                                                    <div className="inline-flex items-center px-2 py-0.5 bg-[#FAF9F7] border border-[#E9E7E0] rounded text-neutral-600">
                                                        <BookIcon className="w-3 h-3 text-neutral-400 mr-1.5" />
                                                        <span className="truncate max-w-[150px] font-sans font-medium">{todo.subject}</span>
                                                    </div>
                                                    <div className="inline-flex items-center px-2 py-0.5 bg-[#FAF9F7] border border-[#E9E7E0] rounded text-neutral-600">
                                                        <ClockIcon className="w-3 h-3 text-neutral-400 mr-1.5" />
                                                        <span className="font-mono text-neutral-500">{new Date(todo.dueDate).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => deleteTodo(todo.id)} 
                                                className="ml-3 p-2 bg-[#FAF9F7] border border-[#E9E7E0] hover:border-red-200 rounded-lg text-neutral-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-12 h-12 bg-neutral-50 border border-[#E9E7E0] rounded-xl flex items-center justify-center mb-4 text-neutral-400">
                                        <PlannerIcon className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-display font-medium text-[#151515]">No Assignments Outstanding</h3>
                                    <p className="max-w-xs text-xs font-sans text-neutral-400 mt-2 leading-relaxed">
                                        Your checklist is clear. Let Gemini generate dynamic plans or add manual tasks.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlannerPage;
