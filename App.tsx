import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, onSnapshot, query, where, doc, setDoc, getDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType } from './lib/firebase';
import { Book, TodoItem } from './types';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import BookListPage from './pages/BookListPage';
import BookDetailPage from './pages/BookDetailPage';
import PlannerPage from './pages/PlannerPage';
import ProgressPage from './pages/ProgressPage';
import ToolsPage from './pages/ToolsPage';
import LandingPage from './pages/LandingPage';
import ChatWidget from './components/ChatWidget';
import AuthModal from './components/AuthModal';
import Logo from './components/Logo';
import { SunIcon, MoonIcon, Spinner } from './components/icons';
import ErrorBoundary from './components/ErrorBoundary';

type View = 'dashboard' | 'books' | 'book-detail' | 'planner' | 'progress' | 'tools';

const App: React.FC = () => {
    const [user, loading, error] = useAuthState(auth);
    const [view, setView] = useState<View>('dashboard');
    const [books, setBooks] = useState<Book[]>([]);
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
    
    const [isWidgetMode, setIsWidgetMode] = useState(false);
    const [isFirestoreOffline, setIsFirestoreOffline] = useState(false);

    useEffect(() => {
        const testConnection = async () => {
            try {
                // Attempt to fetch a non-existent doc from server to test connection
                await getDocFromServer(doc(db, 'system', 'connection-test'));
                setIsFirestoreOffline(false);
            } catch (error: any) {
                if (error?.message?.includes('the client is offline') || error?.code === 'unavailable') {
                    console.error("Firestore is offline. This usually indicates a configuration issue or network problem.");
                    setIsFirestoreOffline(true);
                }
            }
        };
        testConnection();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'widget') {
            setIsWidgetMode(true);
            document.body.style.backgroundColor = 'transparent';
            document.documentElement.style.backgroundColor = 'transparent';
        }
    }, []);

    // Sync user profile to Firestore
    useEffect(() => {
        if (user) {
            const userRef = doc(db, 'users', user.uid);
            getDoc(userRef).then((docSnap) => {
                if (!docSnap.exists()) {
                    setDoc(userRef, {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        createdAt: new Date().toISOString()
                    }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
                }
            });
        }
    }, [user]);

    // Sync Books from Firestore
    useEffect(() => {
        if (!user) {
            setBooks([]);
            return;
        }

        const booksRef = collection(db, 'users', user.uid, 'books');
        const unsubscribe = onSnapshot(booksRef, (snapshot) => {
            const booksData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Book));
            setBooks(booksData);
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/books`));

        return () => unsubscribe();
    }, [user]);

    // Sync Todos from Firestore
    useEffect(() => {
        if (!user) {
            setTodos([]);
            return;
        }

        const todosRef = collection(db, 'users', user.uid, 'todos');
        const unsubscribe = onSnapshot(todosRef, (snapshot) => {
            const todosData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TodoItem));
            setTodos(todosData);
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/todos`));

        return () => unsubscribe();
    }, [user]);

    const handleLogin = (mode: 'login' | 'signup' = 'login') => {
        setAuthModalMode(mode);
        setIsAuthModalOpen(true);
    };

    const handleLogout = async () => {
        try {
            await logout();
            setView('dashboard');
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    const handleSelectBook = (bookId: string) => {
        setSelectedBookId(bookId);
        setView('book-detail');
    };

    const handleBackToList = () => {
        setSelectedBookId(null);
        setView('books');
    };

    const selectedBook = books.find(b => b.id === selectedBookId);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-4 border-accent/20 rounded-[32px] animate-pulse"></div>
                    <div className="absolute inset-2 border-2 border-accent rounded-[24px] animate-spin [animation-duration:1s]"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-[10px] text-accent animate-pulse uppercase tracking-widest">Loading</span>
                    </div>
                </div>
                <p className="mt-8 font-sans font-bold text-xs text-clay-accent uppercase tracking-[0.4em] animate-pulse">
                    Connecting to AI Assistant...
                </p>
                {isFirestoreOffline && (
                    <div className="mt-8 p-4 bg-clay-accent-secondary/10 border border-clay-accent-secondary/20 rounded-2xl max-w-md text-center">
                        <p className="text-xs font-sans font-bold text-clay-accent-secondary uppercase tracking-widest">
                            Firestore Connection Error
                        </p>
                        <p className="text-[10px] font-sans font-medium text-muted mt-2 leading-relaxed">
                            We're having trouble reaching the database. This might be due to a configuration issue or your network.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    if (isWidgetMode) {
        return (
            <div className="min-h-screen bg-transparent flex items-end justify-end p-4">
                <ChatWidget isEmbedded={true} />
            </div>
        );
    }

    if (!user) {
        return (
            <>
                <LandingPage onLogin={handleLogin} isLoggingIn={isLoggingIn} />
                <AuthModal 
                    isOpen={isAuthModalOpen} 
                    onClose={() => setIsAuthModalOpen(false)} 
                    initialMode={authModalMode} 
                />
                <ChatWidget />
            </>
        );
    }

    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <DashboardPage books={books} todos={todos} onSelectBook={handleSelectBook} />;
            case 'books':
                return <BookListPage books={books} setBooks={setBooks} onSelectBook={handleSelectBook} />;
            case 'book-detail':
                return selectedBook ? <BookDetailPage book={selectedBook} setBooks={setBooks} onBack={handleBackToList} /> : <BookListPage books={books} setBooks={setBooks} onSelectBook={handleSelectBook} />;
            case 'planner':
                return <PlannerPage books={books} todos={todos} setTodos={setTodos} />;
            case 'progress':
                return <ProgressPage books={books} />;
            case 'tools':
                return <ToolsPage books={books} />;
            default:
                return <DashboardPage books={books} todos={todos} onSelectBook={handleSelectBook} />;
        }
    };

    return (
        <ErrorBoundary>
            <div className="flex flex-col md:flex-row h-screen bg-background text-foreground relative overflow-hidden">
                {/* Minimal Background Framing */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#E9E7E0] to-transparent"></div>
                </div>

                <header className="md:hidden flex items-center justify-between px-6 py-4 bg-background/95 backdrop-blur-md border-b border-[#E9E7E0]/10 sticky top-0 z-50">
                    <Logo />
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2.5 bg-white border border-[#E9E7E0]/15 rounded-lg shadow-sm text-foreground active:bg-neutral-50"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                </header>

                <Sidebar 
                    currentView={view} 
                    setView={setView} 
                    isOpen={isSidebarOpen} 
                    onClose={() => setIsSidebarOpen(false)}
                    user={user}
                    onLogout={handleLogout}
                />

                <main className="flex-1 overflow-y-auto relative p-4 sm:p-6 lg:p-10 max-w-full">
                    <div className="hidden md:block absolute top-8 right-10 z-20">
                        <div className="flex items-center space-x-3 bg-white p-2.5 px-4 rounded-lg shadow-sm border border-[#E9E7E0]">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-sans font-semibold text-foreground tracking-tight">{user.displayName || 'STUDENT'}</span>
                                <span className="text-[10px] font-mono text-[#6E6D6A] uppercase tracking-wider">AI Assistant Online</span>
                            </div>
                            <div className="w-8 h-8 rounded border border-[#E9E7E0] overflow-hidden">
                                <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto pt-24 md:pt-12">
                        {renderView()}
                    </div>
                </main>
                
                <ChatWidget />
            </div>
        </ErrorBoundary>
    );
};

export default App;
