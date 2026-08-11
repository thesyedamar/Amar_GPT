import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Book, ChatMessage, Quiz, QuizResult } from '../types';
import {
  generateSummaryStream,
  generateQuiz,
  generateChatStream,
  generateAudioSummary,
  generatePodcastTranscript,
  generatePodcastAudio,
} from '../services/geminiService';
import {
  ArrowLeftIcon,
  BookIcon,
  QuizIcon,
  ChatBubbleIcon,
  Spinner,
  SendIcon,
  UserAvatarIcon,
  SparklesIcon,
  PodcastIcon,
  ClockIcon,
} from '../components/icons';
import { AIAvatar } from '../components/AIAvatar';
import { useIsMounted } from '../components/hooks';
import { getFile } from '../lib/fileStorage';

declare const marked: any;

interface BookDetailPageProps {
  book: Book;
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  onBack: () => void;
}

type ActiveTab = 'summary' | 'quiz' | 'chat' | 'podcast';
type PodcastStyle = 'casual' | 'deep' | 'drill';

const fileToBase64 = (file: any): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file || !(file instanceof Blob)) {
            reject(new Error("Parameter 1 is not of type 'Blob'."));
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const TabButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-5 py-3 rounded-lg font-sans font-medium text-xs sm:text-sm tracking-tight transition-all duration-150 ${
      isActive
        ? 'bg-[#151515] text-white shadow-sm'
        : 'text-[#6E6D6A] hover:bg-[#F3F2EE] hover:text-[#151515]'
    }`}
  >
    <div className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-400'}`}>{icon}</div>
    <span>{label}</span>
  </button>
);

const ModernAudioPlayer: React.FC<{ src: string; title: string; subtitle: string }> = ({ src, title, subtitle }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const setAudioData = () => setDuration(audio.duration);
        const setAudioTime = () => setCurrentTime(audio.currentTime);
        audio.addEventListener('loadeddata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', () => setIsPlaying(false));
        return () => {
            audio.removeEventListener('loadeddata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
        };
    }, [src]);
    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        setCurrentTime(time);
        if (audioRef.current) audioRef.current.currentTime = time;
    };
    const togglePlaybackRate = () => {
        const rates = [1, 1.25, 1.5, 2];
        const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
        setPlaybackRate(nextRate);
        if (audioRef.current) audioRef.current.playbackRate = nextRate;
    };
    const formatTime = (time: number) => {
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };
    return (
        <div className="bg-white border border-[#E9E7E0] rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                <audio ref={audioRef} src={src} preload="metadata" />
                <div className="w-20 h-20 bg-neutral-50 border border-[#E9E7E0] rounded-lg flex items-center justify-center flex-shrink-0 relative">
                    <PodcastIcon className="w-10 h-10 text-neutral-600 relative z-10" />
                    {isPlaying && (
                        <div className="absolute bottom-2 flex items-end space-x-0.5">
                            <div className="w-1 h-3 bg-[#151515] rounded-full animate-pulse"></div>
                            <div className="w-1 h-5 bg-[#151515] rounded-full animate-pulse delay-75"></div>
                            <div className="w-1 h-4 bg-[#151515] rounded-full animate-pulse delay-150"></div>
                        </div>
                    )}
                </div>
                <div className="flex-1 w-full text-center sm:text-left space-y-4">
                    <div>
                        <div className="flex items-center justify-center sm:justify-start space-x-2 text-[#6E6D6A] font-mono text-[9px] uppercase tracking-widest mb-1">
                            {isPlaying && <span className="flex h-1.5 w-1.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#151515]"></span></span>}
                            <span>{isPlaying ? 'ACTIVE STREAM' : 'PAUSED'}</span>
                        </div>
                        <h3 className="text-xl font-sans font-semibold text-[#151515]">{title}</h3>
                        <p className="text-neutral-400 font-sans text-xs mt-1">{subtitle}</p>
                    </div>
                    <div className="space-y-2">
                        <div className="w-full bg-neutral-100 rounded-full h-1.5 relative overflow-hidden">
                             <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                             <div className="bg-[#151515] h-full shadow-sm transition-all duration-100" style={{ width: `${(currentTime / (duration || 100)) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start space-x-4 pt-1">
                        <button onClick={togglePlay} className="w-12 h-12 bg-[#151515] text-white rounded-lg shadow-sm flex items-center justify-center hover:bg-neutral-800 transition-colors">
                            {isPlaying ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                        </button>
                        <button onClick={togglePlaybackRate} className="px-4 py-2.5 bg-white border border-[#D5D3CC] text-[#151515] rounded-lg text-[10px] font-mono hover:bg-neutral-50 transition-all">{playbackRate}X Speed</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BookDetailPage: React.FC<BookDetailPageProps> = ({ book, setBooks, onBack }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
    const [summary, setSummary] = useState(book.summary || '');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState('');
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [quizTopic, setQuizTopic] = useState('');
    const [isQuizLoading, setIsQuizLoading] = useState(false);
    const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
    const [quizScore, setQuizScore] = useState<number | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [podcastTranscript, setPodcastTranscript] = useState('');
    const [podcastAudioUrl, setPodcastAudioUrl] = useState('');
    const [isPodcastLoading, setIsPodcastLoading] = useState(false);
    const [podcastStyle, setPodcastStyle] = useState<PodcastStyle>('casual');
    const [podcastStep, setPodcastStep] = useState<'idle' | 'scripting' | 'synthesizing'>('idle');
    const isMounted = useIsMounted();
    const summaryStarted = useRef<string | null>(null);

    const [cachedBase64, setCachedBase64] = useState<string | null>(null);

    const getBase64 = async () => {
      const startTime = Date.now();
      if (cachedBase64) {
        return cachedBase64;
      }
      let file = book.file;
      if (!file) {
          file = (await getFile(book.id)) as File;
      }
      if (!file) {
          throw new Error("Study material file not found locally. Please re-upload the PDF.");
      }
      const b64 = await fileToBase64(file);
      setCachedBase64(b64);
      return b64;
    };

    const clearExpiredFileUri = async () => {
        console.log("[BookDetailPage] Clearing expired fileUri in state and Firestore.");
        if (auth.currentUser) {
            try {
                const bookRef = doc(db, 'users', auth.currentUser.uid, 'books', book.id);
                await updateDoc(bookRef, { geminiFileUri: "" });
            } catch (err) {
                console.error("Failed to clear geminiFileUri in Firestore:", err);
            }
        }
        setBooks(prevBooks => prevBooks.map(b => b.id === book.id ? { ...b, geminiFileUri: "" } : b));
        book.geminiFileUri = "";
    };

    useEffect(() => {
        const initSummary = async () => {
             await new Promise(resolve => setTimeout(resolve, 500));
             if (!isMounted.current) return;

             if (!book.summary && !isSummaryLoading && summaryStarted.current !== book.id) {
                summaryStarted.current = book.id;
                setIsSummaryLoading(true);
                try {
                    let base64Data = "";
                    if (!book.geminiFileUri) {
                        base64Data = await getBase64();
                    }
                    
                    let stream;
                    try {
                        stream = generateSummaryStream(book.id, book.title, base64Data, book.geminiFileUri);
                        let streamedText = "";
                        for await (const chunk of stream) {
                            if (!isMounted.current) break;
                            streamedText += chunk;
                            setSummary(streamedText);
                        }
                        if (isMounted.current) {
                            setSummary(streamedText);
                            if (auth.currentUser) {
                                const bookRef = doc(db, 'users', auth.currentUser.uid, 'books', book.id);
                                updateDoc(bookRef, { summary: streamedText }).catch(err => 
                                    handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}/books/${book.id}`)
                                );
                            }
                            setIsSummaryLoading(false);
                        }
                    } catch (innerErr: any) {
                        if (innerErr.message?.includes("FILE_EXPIRED") && book.geminiFileUri) {
                            await clearExpiredFileUri();
                            base64Data = await getBase64();
                            stream = generateSummaryStream(book.id, book.title, base64Data, "");
                            let streamedText = "";
                            for await (const chunk of stream) {
                                if (!isMounted.current) break;
                                streamedText += chunk;
                                setSummary(streamedText);
                            }
                            if (isMounted.current) {
                                setSummary(streamedText);
                                if (auth.currentUser) {
                                    const bookRef = doc(db, 'users', auth.currentUser.uid, 'books', book.id);
                                    updateDoc(bookRef, { summary: streamedText }).catch(err => 
                                        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}/books/${book.id}`)
                                    );
                                }
                            }
                        } else {
                            throw innerErr;
                        }
                        setIsSummaryLoading(false);
                    }
                } catch (error) {
                    setIsSummaryLoading(false);
                }
            }
        };
        initSummary();
    }, [book.id, book.geminiFileUri, isMounted]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isChatLoading]);

    const handleRegenerateSummary = async () => {
        if (isSummaryLoading) return;
        setIsSummaryLoading(true);
        setSummary('');
        setAudioUrl('');
        summaryStarted.current = book.id;
        try {
            let base64Data = "";
            if (!book.geminiFileUri) {
                base64Data = await getBase64();
            }
            
            try {
                const stream = generateSummaryStream(book.id, book.title, base64Data, book.geminiFileUri);
                let streamedText = "";
                for await (const chunk of stream) {
                    if (!isMounted.current) break;
                    streamedText += chunk;
                    setSummary(streamedText);
                }
                if (isMounted.current) {
                    setSummary(streamedText);
                    if (auth.currentUser) {
                        const bookRef = doc(db, 'users', auth.currentUser.uid, 'books', book.id);
                        await updateDoc(bookRef, { summary: streamedText });
                    }
                    setBooks(prevBooks => prevBooks.map(b => b.id === book.id ? { ...b, summary: streamedText } : b));
                }
            } catch (innerErr: any) {
                if (innerErr.message?.includes("FILE_EXPIRED") && book.geminiFileUri) {
                    await clearExpiredFileUri();
                    base64Data = await getBase64();
                    const stream = generateSummaryStream(book.id, book.title, base64Data, "");
                    let streamedText = "";
                    for await (const chunk of stream) {
                        if (!isMounted.current) break;
                        streamedText += chunk;
                        setSummary(streamedText);
                    }
                    if (isMounted.current) {
                        setSummary(streamedText);
                        if (auth.currentUser) {
                            const bookRef = doc(db, 'users', auth.currentUser.uid, 'books', book.id);
                            await updateDoc(bookRef, { summary: streamedText });
                        }
                        setBooks(prevBooks => prevBooks.map(b => b.id === book.id ? { ...b, summary: streamedText } : b));
                    }
                } else {
                    throw innerErr;
                }
            }
        } catch (error) {
            console.error("Failed to regenerate summary:", error);
        } finally {
            if (isMounted.current) {
                setIsSummaryLoading(false);
            }
        }
    };

    const handleGenerateAudio = async () => {
        if (!summary || isAudioLoading) return;
        setIsAudioLoading(true);
        const url = await generateAudioSummary(summary);
        if(isMounted.current) {
            setAudioUrl(url);
            setIsAudioLoading(false);
        }
    };

    const handleGeneratePodcast = async () => {
        if (isPodcastLoading) return;
        setIsPodcastLoading(true);
        setPodcastStep('scripting');
        setPodcastAudioUrl('');
        try {
            let base64Data = "";
            if (!book.geminiFileUri) {
                base64Data = await getBase64();
            }
            
            let transcript;
            try {
                transcript = await generatePodcastTranscript(book.title, base64Data, podcastStyle, book.geminiFileUri);
            } catch (innerErr: any) {
                if (innerErr.message?.includes("FILE_EXPIRED") && book.geminiFileUri) {
                    console.log("[BookDetailPage] Podcast file reference expired, clearing and retrying...");
                    await clearExpiredFileUri();
                    base64Data = await getBase64();
                    transcript = await generatePodcastTranscript(book.title, base64Data, podcastStyle, "");
                } else {
                    throw innerErr;
                }
            }

            if (isMounted.current && transcript) {
                setPodcastTranscript(transcript);
                setPodcastStep('synthesizing');
                const audioUrl = await generatePodcastAudio(transcript);
                if (isMounted.current) {
                    setPodcastAudioUrl(audioUrl);
                    setPodcastStep('idle');
                    setIsPodcastLoading(false);
                }
            }
        } catch (error) {
            setIsPodcastLoading(false);
            setPodcastStep('idle');
        }
    };

    const handleGenerateQuiz = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quizTopic.trim() || isQuizLoading) return;
        setIsQuizLoading(true);
        setCurrentQuiz(null);
        setQuizScore(null);
        try {
            let base64Data = "";
            if (!book.geminiFileUri) {
                base64Data = await getBase64();
            }
            
            let newQuiz;
            try {
                newQuiz = await generateQuiz(book.id, book.title, base64Data, quizTopic, book.geminiFileUri);
            } catch (innerErr: any) {
                if (innerErr.message?.includes("FILE_EXPIRED") && book.geminiFileUri) {
                    console.log("[BookDetailPage] Quiz file reference expired, clearing and retrying...");
                    await clearExpiredFileUri();
                    base64Data = await getBase64();
                    newQuiz = await generateQuiz(book.id, book.title, base64Data, quizTopic, "");
                } else {
                    throw innerErr;
                }
            }

            if (isMounted.current && newQuiz) {
                setCurrentQuiz(newQuiz);
                setQuizAnswers(new Array(newQuiz.questions.length).fill(''));
                setIsQuizLoading(false);
            }
        } catch (error) {
            console.error("Quiz generation failed:", error);
            setIsQuizLoading(false);
        }
    };

    const handleAnswerChange = (idx: number, val: string) => {
        const n = [...quizAnswers]; n[idx] = val; setQuizAnswers(n);
    };
    
    const handleSubmitQuiz = async () => {
        if (!currentQuiz || !auth.currentUser) return;
        let score = 0;
        currentQuiz.questions.forEach((q, idx) => { if (q.answer === quizAnswers[idx]) score++; });
        const pct = (score / currentQuiz.questions.length) * 100;
        setQuizScore(pct);
        
        try {
            const bookRef = doc(db, 'users', auth.currentUser.uid, 'books', book.id);
            const result: QuizResult = { 
                quizId: currentQuiz.id, 
                quizTitle: currentQuiz.title, 
                score: pct, 
                date: new Date().toLocaleDateString() 
            };
            await updateDoc(bookRef, {
                quizHistory: arrayUnion(result)
            });
        } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}/books/${book.id}`);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim()) return;
        const currentInput = userInput;
        const newMessages: ChatMessage[] = [...chatMessages, { sender: 'user', text: currentInput }];
        setChatMessages(newMessages);
        setUserInput('');
        setIsChatLoading(true);
        
        try {
            let base64Data = "";
            if (!book.geminiFileUri) {
                base64Data = await getBase64();
            }
            const history = chatMessages.slice(-6).map(m => ({sender: m.sender, text: m.text}));
            
            let stream;
            let botMessageText = "";
            setChatMessages(prev => [...prev, { sender: 'bot', text: "" }]);

            try {
                stream = generateChatStream(currentInput, book.title, base64Data, history, book.geminiFileUri);
                for await (const chunk of stream) {
                    if (!isMounted.current) break;
                    botMessageText += chunk;
                    
                    let cleanText = botMessageText;
                    let sourceText = "";
                    const sourceMarker = botMessageText.match(/(===SOURCE===|SOURCE:)/i);
                    
                    if (sourceMarker) {
                        const index = sourceMarker.index!;
                        let rawClean = botMessageText.substring(0, index).trim();
                        let rawSource = botMessageText.substring(index + sourceMarker[0].length).trim();
                        
                        rawClean = rawClean.replace(/\s*(\*\*|__)\s*$/, '');
                        rawSource = rawSource.replace(/^\s*(\*\*|__)\s*/, '').replace(/\s*(\*\*|__)\s*$/, '');
                        
                        cleanText = rawClean;
                        sourceText = rawSource;
                    }

                    setChatMessages(prev => {
                        const next = [...prev];
                        next[next.length - 1] = { 
                            ...next[next.length - 1], 
                            text: cleanText,
                            source: sourceText
                        };
                        return next;
                    });
                }
            } catch (innerErr: any) {
                if (innerErr.message?.includes("FILE_EXPIRED") && book.geminiFileUri) {
                    console.log("[BookDetailPage] Chat file reference expired, clearing and retrying...");
                    await clearExpiredFileUri();
                    base64Data = await getBase64();
                    
                    botMessageText = ""; // reset text
                    stream = generateChatStream(currentInput, book.title, base64Data, history, "");
                    for await (const chunk of stream) {
                        if (!isMounted.current) break;
                        botMessageText += chunk;
                        
                        let cleanText = botMessageText;
                        let sourceText = "";
                        const sourceMarker = botMessageText.match(/(===SOURCE===|SOURCE:)/i);
                        
                        if (sourceMarker) {
                            const index = sourceMarker.index!;
                            let rawClean = botMessageText.substring(0, index).trim();
                            let rawSource = botMessageText.substring(index + sourceMarker[0].length).trim();
                            
                            rawClean = rawClean.replace(/\s*(\*\*|__)\s*$/, '');
                            rawSource = rawSource.replace(/^\s*(\*\*|__)\s*/, '').replace(/\s*(\*\*|__)\s*$/, '');
                            
                            cleanText = rawClean;
                            sourceText = rawSource;
                        }

                        setChatMessages(prev => {
                            const next = [...prev];
                            next[next.length - 1] = { 
                                ...next[next.length - 1], 
                                text: cleanText,
                                source: sourceText
                            };
                            return next;
                        });
                    }
                } else {
                    throw innerErr;
                }
            }
            setIsChatLoading(false);
        } catch (error: any) {
             console.error("Chat message failed:", error);
             setChatMessages(prev => {
                 const next = [...prev];
                 if (next[next.length - 1]?.sender === 'bot' && !next[next.length - 1]?.text) {
                     next[next.length - 1] = { sender: 'bot', text: `Error encountered: ${error.message || "Failed to generate response."}` };
                 } else {
                     next.push({ sender: 'bot', text: `Error encountered: ${error.message || "Failed to generate response."}` });
                 }
                 return next;
             });
             setIsChatLoading(false);
        }
    };

    return (
        <div className="space-y-10 pt-4">
            <div className="bg-white border border-[#E9E7E0] rounded-xl p-8 shadow-sm">
                <div className="space-y-6">
                    <button onClick={onBack} className="flex items-center text-[10px] font-mono text-neutral-400 hover:text-black uppercase tracking-wider transition-all group">
                        <ArrowLeftIcon className="mr-2 group-hover:-translate-x-1.5 transition-transform w-4 h-4" /> Back to Library
                    </button>
                    <div className="space-y-4">
                        <h1 className="text-3xl md:text-5xl font-display font-normal text-[#151515] tracking-tight leading-tight">
                            {book.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-4 pt-1">
                            <div className="flex items-center px-3 py-1.5 bg-neutral-50 border border-[#E9E7E0] rounded">
                                <BookIcon className="w-3.5 h-3.5 text-neutral-500 mr-2" />
                                <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">{book.pages} Pages</span>
                            </div>
                            <div className="flex items-center px-3 py-1.5 bg-neutral-50 border border-[#E9E7E0] rounded">
                                <ClockIcon className="w-3.5 h-3.5 text-neutral-500 mr-2" />
                                <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
                                    {new Date(book.uploadedDate).toLocaleDateString(undefined, { 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center px-3 py-1.5 bg-[#151515] text-white rounded">
                                <SparklesIcon className="w-3.5 h-3.5 mr-2" />
                                <span className="text-[10px] font-mono uppercase tracking-wider">AI Analysis Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap h-auto gap-2 p-1.5 bg-[#FAF9F6] rounded-xl border border-[#E9E7E0] w-fit">
                <TabButton icon={<BookIcon />} label="SUMMARY" isActive={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
                <TabButton icon={<PodcastIcon />} label="PODCAST" isActive={activeTab === 'podcast'} onClick={() => setActiveTab('podcast')} />
                <TabButton icon={<QuizIcon />} label="QUIZZES" isActive={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} />
                <TabButton icon={<ChatBubbleIcon />} label="CHAT" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
            </div>

            <div className="bg-white border border-[#E9E7E0] rounded-xl overflow-hidden shadow-sm min-h-[500px] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9E7E0] bg-[#FAF9F6]">
                    <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${activeTab === 'summary' ? 'bg-[#151515]' : activeTab === 'podcast' ? 'bg-amber-600' : activeTab === 'quiz' ? 'bg-emerald-600' : 'bg-blue-600'}`}></div>
                        <h2 className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                            {activeTab} VIEW
                        </h2>
                    </div>
                </div>

                <div className="p-6 sm:p-8 flex-1">
                    {activeTab === 'summary' && (
                    <div className="animate-in fade-in duration-200 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <h2 className="text-xl sm:text-2xl font-display font-medium text-[#151515]">Study Summary</h2>
                            {summary && (
                                <button
                                    onClick={handleRegenerateSummary}
                                    disabled={isSummaryLoading}
                                    className="inline-flex items-center justify-center rounded-lg font-sans font-semibold px-4 py-2 text-xs bg-white border border-[#E9E7E0] hover:bg-neutral-50 hover:border-neutral-400 text-[#151515] disabled:opacity-40 transition-all self-start sm:self-auto shadow-sm"
                                >
                                    {isSummaryLoading ? (
                                        <Spinner className="w-3.5 h-3.5 mr-2 animate-spin text-neutral-500" />
                                    ) : (
                                        <SparklesIcon className="w-3.5 h-3.5 mr-2 text-neutral-500" />
                                    )}
                                    {isSummaryLoading ? 'Regenerating...' : 'Regenerate Summary'}
                                </button>
                            )}
                        </div>
                        {isSummaryLoading && !summary && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <Spinner className="w-10 h-10 text-neutral-400 animate-spin mb-4" />
                                <p className="text-xs font-sans text-neutral-400 uppercase tracking-widest font-semibold">
                                    Analyzing literature materials...
                                </p>
                            </div>
                        )}
                        {summary && (
                            <>
                                <div className="prose prose-neutral max-w-none text-[#151515] font-sans text-sm sm:text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(summary) : summary }} />
                                <div className="mt-10 pt-8 border-t border-[#E9E7E0]">
                                    <h3 className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-4">SPEECH GENERATION</h3>
                                    {!audioUrl ? (
                                        <button onClick={handleGenerateAudio} disabled={isAudioLoading} className="inline-flex items-center justify-center rounded-lg font-sans font-semibold px-6 py-3.5 text-xs bg-[#151515] text-white hover:bg-neutral-800 disabled:opacity-40 transition-colors">
                                            {isAudioLoading ? <Spinner className="w-4 h-4 mr-2.5 animate-spin" /> : <PodcastIcon className="w-4 h-4 mr-2.5" />}
                                            {isAudioLoading ? 'Synthesizing...' : 'Convert to Audio Guide'}
                                        </button>
                                    ) : (
                                        <ModernAudioPlayer src={audioUrl} title={`Audio Guide: ${book.title}`} subtitle="AI Study Companion Representation" />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'podcast' && (
                    <div className="animate-in fade-in duration-200">
                        <div className="flex flex-col items-center justify-center py-4">
                            {!podcastAudioUrl && !isPodcastLoading && (
                                <div className="max-w-2xl w-full space-y-8">
                                    <div className="text-center space-y-4">
                                        <div className="w-16 h-16 bg-neutral-50 border border-[#E9E7E0] rounded-xl flex items-center justify-center mx-auto">
                                            <PodcastIcon className="w-8 h-8 text-neutral-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl sm:text-2xl font-display font-medium text-[#151515]">AI Study Podcast</h2>
                                            <p className="text-[#6E6D6A] font-sans text-xs mt-2">Generate a lively back-and-forth discussion segment covering key themes of your document.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">PODCAST STYLE CODES</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {(['casual', 'deep', 'drill'] as PodcastStyle[]).map((s) => (
                                                <button 
                                                    key={s} 
                                                    onClick={() => setPodcastStyle(s)} 
                                                    className={`p-5 rounded-lg border text-left transition-all duration-150 ${
                                                        podcastStyle === s 
                                                            ? 'border-black bg-neutral-50' 
                                                            : 'border-[#E9E7E0] bg-white hover:border-neutral-400'
                                                    }`}
                                                >
                                                    <h4 className="font-sans font-semibold text-sm text-[#151515] capitalize mb-1">
                                                        {s === 'casual' && 'Coffee Conversation'}
                                                        {s === 'deep' && 'Deep Dive'}
                                                        {s === 'drill' && 'Exam Review'}
                                                    </h4>
                                                    <p className="text-[10px] font-sans text-[#6E6D6A] leading-relaxed">
                                                        {s === 'casual' && 'Relaxed, intuitive dialog and clear summaries.'}
                                                        {s === 'deep' && 'Technical analysis and comprehensive proof breakdowns.'}
                                                        {s === 'drill' && 'Fast-paced definition checks and key facts.'}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={handleGeneratePodcast} className="w-full py-4 bg-[#151515] text-white rounded-lg text-sm font-sans font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center">
                                        <SparklesIcon className="w-4 h-4 mr-2" /> Produce Podcast Guide
                                    </button>
                                </div>
                            )}
                            {isPodcastLoading && (
                                <div className="space-y-6 text-center py-10">
                                    <div className="w-16 h-16 bg-neutral-50 border border-[#E9E7E0] rounded-xl flex items-center justify-center mx-auto">
                                        <div className="flex items-end space-x-1">
                                            <div className="w-1 h-5 bg-[#151515] rounded-full animate-pulse"></div>
                                            <div className="w-1 h-8 bg-[#151515] rounded-full animate-pulse delay-75"></div>
                                            <div className="w-1 h-6 bg-[#151515] rounded-full animate-pulse delay-150"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-sans font-semibold text-[#151515]">
                                            {podcastStep === 'scripting' ? 'Drafting Conversation Script...' : 'Synthesizing Host Voices...'}
                                        </h3>
                                        <p className="text-neutral-400 font-sans text-xs mt-1.5 max-w-xs mx-auto">
                                            Generals of study content are being assembled by Gemini.
                                        </p>
                                    </div>
                                </div>
                            )}
                            {podcastAudioUrl && !isPodcastLoading && (
                                <div className="w-full max-w-3xl space-y-8 animate-in fade-in duration-200">
                                    <ModernAudioPlayer src={podcastAudioUrl} title={`Podcast discussion: ${book.title}`} subtitle={`${podcastStyle.toUpperCase()} DISCUSSION`} />
                                    <div className="bg-[#FAF9F6] border border-[#E9E7E0] p-6 rounded-xl">
                                        <h4 className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-6">STUDIOUS DISCUSSION TRANSCRIPT</h4>
                                        <div className="space-y-6 max-h-[350px] overflow-y-auto pr-3 scrollbar-thin text-xs">
                                            {podcastTranscript.split('\n').filter(l => l.includes(':')).map((line, i) => {
                                                const [sp, ...tx] = line.split(':'); const t = tx.join(':').trim(); const isA = sp.trim() === 'Alex';
                                                return (
                                                    <div key={i} className={`flex flex-col ${isA ? 'items-start' : 'items-end'}`}>
                                                        <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">{sp}</span>
                                                        <div className={`p-4 rounded-lg leading-relaxed text-sm max-w-[85%] ${isA ? 'bg-white border border-[#E9E7E0] text-[#151515]' : 'bg-[#151515] text-white'}`}>
                                                            <p className="font-sans font-medium">"{t}"</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex justify-center">
                                        <button onClick={() => { setPodcastAudioUrl(''); setPodcastTranscript(''); }} className="text-[10px] font-mono text-neutral-400 hover:text-black uppercase tracking-wider transition-colors pt-2">
                                            Configure New Broadcast
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'quiz' && (
                    <div className="animate-in fade-in duration-200 space-y-6">
                         <h2 className="text-xl sm:text-2xl font-display font-medium text-[#151515]">Cognitive Check</h2>
                         {quizScore === null ? (
                            <div className="space-y-8">
                                <form onSubmit={handleGenerateQuiz} className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <input 
                                            type="text" 
                                            value={quizTopic} 
                                            onChange={e => setQuizTopic(e.target.value)} 
                                            placeholder="Enter concept to generate assessment questions mapping..." 
                                            className="clay-input" 
                                        />
                                    </div>
                                    <button type="submit" disabled={isQuizLoading || !quizTopic.trim()} className="px-6 py-3.5 bg-[#151515] text-white font-sans font-semibold text-xs rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center disabled:opacity-40">
                                        {isQuizLoading ? <Spinner className="mr-2 w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4 mr-2" />}
                                        Create Quiz
                                    </button>
                                </form>
                                {currentQuiz && (
                                    <div className="space-y-8 pb-8">
                                        {currentQuiz.questions.map((q, qIndex) => (
                                            <div key={qIndex} className="p-6 bg-[#FAF9F6]/50 border border-[#E9E7E0] rounded-xl hover:bg-neutral-50 transition-colors duration-150">
                                                <p className="font-sans font-semibold text-sm sm:text-base text-[#151515] mb-4">
                                                    <span className="text-neutral-400 font-mono mr-3">{qIndex + 1}.</span> {q.question}
                                                </p>
                                                <div className="grid grid-cols-1 gap-2.5">
                                                    {q.options.map((option, oIndex) => (
                                                        <label key={oIndex} className={`flex items-center p-3.5 rounded-lg border cursor-pointer transition-all ${quizAnswers[qIndex] === option ? 'border-black bg-neutral-50 shadow-sm' : 'border-[#E9E7E0] bg-white hover:border-neutral-400'}`}>
                                                            <input type="radio" name={`q${qIndex}`} value={option} checked={quizAnswers[qIndex] === option} onChange={() => handleAnswerChange(qIndex, option)} className="peer hidden" />
                                                            <div className="w-4 h-4 rounded-full border border-neutral-300 mr-3 flex items-center justify-center peer-checked:bg-black peer-checked:border-black transition-colors">
                                                                {quizAnswers[qIndex] === option && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                                            </div>
                                                            <span className="text-xs font-sans font-medium text-[#151515]">{option}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={handleSubmitQuiz} className="w-full py-4 bg-[#151515] text-white rounded-lg text-sm font-sans font-semibold hover:bg-neutral-800 transition-colors">
                                            Submit Quiz & Update Profile
                                        </button>
                                    </div>
                                )}
                            </div>
                         ) : (
                            <div className="text-center py-16 space-y-6">
                                <div className="w-28 h-28 mx-auto rounded-full border border-[#E9E7E0] flex items-center justify-center text-3xl font-display font-medium text-[#151515] bg-[#FAF9F6]">
                                    {quizScore.toFixed(0)}%
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-lg font-sans font-semibold text-[#151515]">Quiz Analyzed</h3>
                                    <p className="text-neutral-400 font-sans text-xs">
                                        {quizScore >= 80 ? "Sufficient performance demonstrated." : "Review reference and conduct correction reassessment."}
                                    </p>
                                </div>
                                <button onClick={() => { setCurrentQuiz(null); setQuizScore(null); setQuizTopic(''); }} className="px-6 py-3 bg-white border border-[#D5D3CC] text-[#151515] font-sans font-semibold text-xs rounded-lg hover:bg-neutral-50 transition-colors">
                                    New Evaluation
                                </button>
                            </div>
                          )}
                    </div>
                )}
                
                {activeTab === 'chat' && (
                    <div className="h-[520px] flex flex-col animate-in fade-in duration-200">
                       <div className="flex-grow overflow-y-auto mb-6 pr-2 space-y-6 scrollbar-thin">
                           {chatMessages.length === 0 && (
                             <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                 <div className="w-12 h-12 bg-neutral-50 border border-[#E9E7E0] rounded-xl flex items-center justify-center mb-4 text-neutral-400">
                                     <ChatBubbleIcon className="w-5 h-5" />
                                 </div>
                                 <h3 className="font-display font-medium text-lg text-[#151515]">Reference Sandbox</h3>
                                 <p className="text-neutral-400 font-sans text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
                                     Submit requests or contextual questions mapped strictly to your uploaded documents.
                                 </p>
                             </div>  
                           )}
                           {chatMessages.map((msg, index) => (
                               <div key={index} className="animate-in fade-in duration-100">
                                   {msg.sender === 'user' ? (
                                       <div className="flex items-start justify-end gap-3.5">
                                           <div className="max-w-[80%] p-4 bg-[#151515] text-white font-sans text-xs sm:text-sm rounded-lg shadow-sm">
                                               {msg.text}
                                           </div>
                                           <div className="w-8 h-8 bg-neutral-50 border border-[#E9E7E0] rounded-lg flex-shrink-0 flex items-center justify-center">
                                               <UserAvatarIcon className="w-4 h-4 text-neutral-600" />
                                           </div>
                                       </div>
                                   ) : (
                                       <div className="flex items-start gap-3.5">
                                           <div className="w-8 h-8 bg-white border border-[#E9E7E0] rounded-lg flex-shrink-0 flex items-center justify-center">
                                               <AIAvatar />
                                           </div>
                                           <div className="flex-1 space-y-3 min-w-0">
                                               <div className="p-4 sm:p-5 bg-neutral-50/50 border border-[#E9E7E0] rounded-lg prose prose-neutral max-w-none text-[#151515] font-sans text-xs sm:text-sm leading-relaxed" 
                                                    dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(msg.text || (isChatLoading && index === chatMessages.length - 1 ? (cachedBase64 && cachedBase64.length > 5000000 ? '*Streaming Large document references...*' : 'Thinking...') : '')) : (msg.text || 'Thinking...') }} 
                                               />
                                               {msg.source && (
                                                   <div className="inline-flex items-center space-x-2 px-3 py-1 bg-neutral-50 border border-[#E9E7E0] rounded text-[9px] font-mono text-neutral-500">
                                                       <span className="w-1 h-1 rounded-full bg-neutral-400"></span>
                                                       <span>Source: {msg.source}</span>
                                                   </div>
                                               )}
                                           </div>
                                       </div>
                                   )}
                               </div>
                           ))}
                           <div ref={chatEndRef} />
                       </div>
                       <form onSubmit={handleSendMessage} className="relative flex-shrink-0">
                            <div className="relative flex items-center gap-3">
                                <input 
                                    type="text" 
                                    value={userInput} 
                                    onChange={(e) => setUserInput(e.target.value)} 
                                    placeholder="Search details or query formulas in document..." 
                                    className="clay-input" 
                                    disabled={isChatLoading} 
                                />
                                <button type="submit" className="px-5 py-3.5 bg-[#151515] text-white font-sans font-medium text-xs rounded-lg hover:bg-neutral-800 disabled:opacity-40 transition-colors flex Items-center justify-center flex-shrink-0" disabled={isChatLoading || !userInput.trim()}>
                                    <SendIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default BookDetailPage;
