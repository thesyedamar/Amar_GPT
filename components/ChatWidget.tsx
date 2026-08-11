import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatBubbleIcon, CloseIcon, SendIcon, UserAvatarIcon } from './icons';
import { AIAvatar } from './AIAvatar';
import { generateWidgetChatResponse } from '../services/geminiService';
import { useIsMounted } from './hooks';

declare const marked: any;

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

interface ChatWidgetProps {
    isEmbedded?: boolean;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ isEmbedded = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: 'Hi! I can help you navigate AmarGPT. Ask me anything about the platform!' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMounted = useIsMounted();

  const toggleChat = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: Message = { sender: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Prepare history
    const history = messages.map(m => ({ sender: m.sender, text: m.text }));
    const responseText = await generateWidgetChatResponse(userMsg.text, history);

    if (isMounted.current) {
        setMessages(prev => [...prev, { sender: 'bot', text: responseText }]);
        setIsLoading(false);
    }
  };

  // If embedded, we rely on the parent container (App.tsx widget mode div) for positioning context
  // otherwise, we use fixed positioning for the main app.
  const containerClasses = isEmbedded 
    ? "relative flex flex-col items-end" 
    : "fixed bottom-6 right-6 z-50 flex flex-col items-end";

  return (
    <div className={containerClasses}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 w-80 sm:w-96 bg-white/80 backdrop-blur-xl rounded-[32px] shadow-clayCard border border-white/40 overflow-hidden flex flex-col max-h-[550px]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-clay-accent to-clay-accent-secondary p-6 flex justify-between items-center text-white">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <ChatBubbleIcon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-black text-sm uppercase tracking-widest">AmarGPT Assistant</h3>
              </div>
              <button onClick={toggleChat} className="p-2 bg-white/20 rounded-lg hover:bg-white/40 transition-colors">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto bg-transparent min-h-[350px] max-h-[450px] scrollbar-thin">
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`flex max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>
                       <div className="flex-shrink-0 w-8 h-8 bg-white rounded-xl shadow-clayButton flex items-center justify-center border border-white/40">
                           {msg.sender === 'user' ? <UserAvatarIcon className="w-4 h-4 text-clay-accent" /> : <AIAvatar />}
                       </div>
                       <div 
                         className={`px-4 py-3 rounded-[20px] text-sm font-sans font-medium leading-relaxed ${
                           msg.sender === 'user' 
                             ? 'bg-clay-accent text-white rounded-br-none shadow-clayButton' 
                             : 'bg-white text-foreground rounded-bl-none shadow-clayCard border border-white/40'
                         }`}
                       >
                         {msg.sender === 'bot' ? (
                            <div className="prose prose-sm max-w-none text-inherit" dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(msg.text) : msg.text }} />
                         ) : (
                            msg.text
                         )}
                       </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                   <div className="flex justify-start animate-pulse">
                     <div className="flex items-end gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-white rounded-xl shadow-clayButton flex items-center justify-center"><AIAvatar /></div>
                        <div className="bg-white p-4 rounded-[20px] rounded-bl-none border border-white/40 shadow-clayCard">
                            <div className="flex space-x-1.5">
                                <div className="w-2 h-2 bg-clay-accent/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-clay-accent/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-clay-accent/40 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                     </div>
                   </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="p-4 bg-white/40 border-t border-white/20">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask for help..."
                  className="clay-input py-3 text-sm"
                />
                <button 
                    type="submit" 
                    disabled={!inputValue.trim() || isLoading}
                    className="w-12 h-12 clay-button clay-button-primary shadow-clayButton flex-shrink-0"
                >
                  <SendIcon className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.05, y: -5 }}
        whileTap={{ scale: 0.95 }}
        className="w-16 h-16 bg-gradient-to-br from-clay-accent to-clay-accent-secondary text-white rounded-[24px] shadow-clayButton flex items-center justify-center focus:outline-none border-2 border-white"
      >
        {isOpen ? <CloseIcon className="w-6 h-6" /> : <ChatBubbleIcon className="w-6 h-6" />}
      </motion.button>
    </div>
  );
};

export default ChatWidget;
