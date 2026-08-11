import React from 'react';
import { Book, TodoItem } from '../types';
import GlobalChat from '../components/GlobalChat';
import { BookIcon, ClockIcon } from '../components/icons';

interface DashboardPageProps {
  books: Book[];
  todos: TodoItem[];
  onSelectBook: (bookId: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ books, todos, onSelectBook }) => {
  const recentBooks = books.slice(-3).reverse();
  const upcomingTodos = todos.filter(t => !t.completed).slice(0, 5);

  return (
    <div className="space-y-10 pt-4">
      <div className="relative">
        <h1 className="text-4xl md:text-5xl font-display font-normal text-[#151515] tracking-tight">
          Workspace Overview
        </h1>
        <p className="text-[#6E6D6A] font-mono text-[10px] uppercase tracking-[0.2em] mt-1.5">
          LITERATURE EXPLORATION MANAGER
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <div className="bg-white border border-[#E9E7E0] rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 bg-[#FAF9F6] border-b border-[#E9E7E0]">
                <div className="flex items-center space-x-2">
                    <div className="flex space-x-1.5">
                        <div className="w-2 h-2 rounded-full bg-neutral-200 border border-neutral-300"></div>
                        <div className="w-2 h-2 rounded-full bg-neutral-200 border border-neutral-300"></div>
                        <div className="w-2 h-2 rounded-full bg-neutral-200 border border-neutral-300"></div>
                    </div>
                    <div className="h-4 w-[1px] bg-[#E9E7E0] mx-2"></div>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">AI Dialogue Sandbox</span>
                </div>
            </div>
            <div className="p-6">
                <GlobalChat books={books} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-8">
          {/* Recently Added Widget */}
          <div className="bg-white border border-[#E9E7E0] rounded-xl shadow-sm hover:border-[#D5D3CC] transition-colors duration-200 flex flex-col group/widget">
            <div className="bg-[#FAF9F6] border-b border-[#E9E7E0] px-6 py-4 flex justify-between items-center">
                <h2 className="text-xs font-mono font-medium text-neutral-500 uppercase tracking-wider flex items-center">
                    <BookIcon className="w-4 h-4 mr-2 text-neutral-400" />
                    RECENT DOCUMENTS
                </h2>
                <span className="px-2.5 py-0.5 bg-[#FAF9F6] border border-[#E9E7E0] rounded-md text-[10px] font-mono text-neutral-600 shadow-sm">{recentBooks.length}</span>
            </div>
            <div className="p-6">
                {recentBooks.length > 0 ? (
                  <ul className="space-y-3">
                    {recentBooks.map(book => (
                       <li 
                        key={book.id} 
                        onClick={() => onSelectBook(book.id)} 
                        className="group/item flex items-center p-3 bg-white border border-[#E9E7E0] rounded-lg cursor-pointer transition-all hover:bg-neutral-50 hover:border-neutral-400"
                      >
                        <div className="w-8 h-8 bg-neutral-50 border border-[#E9E7E0] text-neutral-600 rounded flex items-center justify-center mr-3 group-hover/item:bg-[#151515] group-hover/item:text-white transition-colors">
                            <BookIcon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-sans font-medium text-[#151515] truncate group-hover/item:text-[#151515]">{book.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs font-sans font-normal text-neutral-400 py-3 italic">No documents found.</p>
                )}
            </div>
          </div>
          
          {/* Upcoming Tasks Widget */}
          <div className="bg-white border border-[#E9E7E0] rounded-xl shadow-sm hover:border-[#D5D3CC] transition-colors duration-200 flex flex-col group/widget">
            <div className="bg-[#FAF9F6] border-b border-[#E9E7E0] px-6 py-4 flex justify-between items-center">
                <h2 className="text-xs font-mono font-medium text-neutral-500 uppercase tracking-wider flex items-center">
                    <ClockIcon className="w-4 h-4 mr-2 text-neutral-400" />
                    TASKS
                </h2>
                <span className="px-2.5 py-0.5 bg-[#FAF9F6] border border-[#E9E7E0] rounded-md text-[10px] font-mono text-neutral-600 shadow-sm">{upcomingTodos.length}</span>
            </div>
            <div className="p-6">
                {upcomingTodos.length > 0 ? (
                  <ul className="space-y-4">
                    {upcomingTodos.map(todo => (
                      <li key={todo.id} className="flex items-start group/todo">
                        <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-sans font-medium text-[#151515] line-clamp-2">{todo.text}</p>
                          <p className="text-[10px] font-mono text-neutral-400 mt-1 uppercase tracking-wide">Deadline: {new Date(todo.dueDate).toLocaleDateString()}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs font-sans font-normal text-neutral-400 py-3 italic">No tasks outstanding.</p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
