import React, { useState, useRef, useEffect } from 'react';
import { Book, ChatMessage } from '../types';
import { generateGlobalChatStream } from '../services/geminiService';
import { SparklesIcon, SendIcon, UserAvatarIcon, ChatBubbleIcon } from '../components/icons';
import { AIAvatar } from '../components/AIAvatar';
import { useIsMounted } from './hooks';

declare const marked: any;

interface GlobalChatProps {
    books: Book[];
}

const GlobalChat: React.FC<GlobalChatProps> = ({ books }) => {
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    
    const chatEndRef = useRef<HTMLDivElement>(null);
    const isMounted = useIsMounted();

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isChatLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || books.length === 0) return;

        const currentInput = userInput;
        const newMessages: ChatMessage[] = [...chatMessages, { sender: 'user', text: currentInput }];
        setChatMessages(newMessages);
        setUserInput('');
        setIsChatLoading(true);

        const bookTitles = books.map(b => b.title);
        const history = chatMessages.slice(-6).map(m => ({ sender: m.sender, text: m.text }));
        const stream = generateGlobalChatStream(currentInput, bookTitles, history);
        
        let botText = "";
        setChatMessages(prev => [...prev, { sender: 'bot', text: "" }]);

        for await (const chunk of stream) {
            if (!isMounted.current) break;
            botText += chunk;
            setChatMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], text: botText };
                return next;
            });
        }
        setIsChatLoading(false);
    };

    return (
        <div className="flex flex-col h-[480px] relative">
            <div className="flex-grow overflow-y-auto mb-4 pr-2 space-y-6 scrollbar-thin">
                {chatMessages.length === 0 && !isChatLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <div className="flex items-center justify-center h-16 w-16 mx-auto bg-[#FAF9F6] border border-[#E9E7E0] rounded-xl shadow-sm mb-6 text-neutral-400">
                          <ChatBubbleIcon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-display font-medium text-[#151515] tracking-tight">Active Dialog</h3>
                      <p className="max-w-xs text-xs font-sans text-neutral-400 mt-2 leading-relaxed">Submit query questions mapping references across your literature stacks.</p>
                  </div>
                )}
                {chatMessages.map((msg, index) => (
                    <div key={index} className="animate-in fade-in duration-150">
                        {msg.sender === 'user' ? (
                            <div className="flex items-start justify-end gap-3.5">
                                <div className="max-w-[80%] p-4 bg-[#151515] text-white font-sans text-xs sm:text-sm rounded-lg shadow-sm">
                                    {msg.text}
                                </div>
                                <div className="w-8 h-8 bg-neutral-100 border border-[#E9E7E0] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    <UserAvatarIcon className="w-4 h-4 text-neutral-600" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3.5">
                                <div className="w-8 h-8 bg-white border border-[#E9E7E0] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    <AIAvatar />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="p-4 sm:p-5 bg-neutral-50/50 border border-[#E9E7E0] rounded-lg prose prose-slate max-w-none text-neutral-800 font-sans text-xs sm:text-sm leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(msg.text || (isChatLoading && index === chatMessages.length - 1 ? 'Thinking...' : '')) : (msg.text || 'Thinking...') }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} className="flex items-center mt-auto flex-shrink-0 gap-3">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={books.length > 0 ? "Ask anything about your workspace literature..." : "Upload books to start chatting"}
                        className="clay-input"
                        disabled={isChatLoading || books.length === 0}
                    />
                </div>
                <button 
                    type="submit" 
                    className="px-5 py-3 bg-[#151515] text-white font-sans font-medium text-xs sm:text-sm rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40" 
                    disabled={isChatLoading || !userInput.trim()}
                >
                    <SendIcon className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
};

export default GlobalChat;
