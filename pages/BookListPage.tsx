import React, { useState } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Book } from '../types';
import FileUploadModal from '../components/FileUploadModal';
import { UploadIcon, TrashIcon, PdfFileIcon } from '../components/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { storeFile, deleteFile } from '../lib/fileStorage';

interface BookListPageProps {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  onSelectBook: (bookId: string) => void;
}

const BookCard: React.FC<{ book: Book, onSelect: () => void, onDelete: () => void }> = ({ book, onSelect, onDelete }) => {
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4 }}
            onClick={onSelect}
            className="group relative bg-white border border-[#E9E7E0] hover:border-neutral-400 p-6 rounded-xl shadow-sm cursor-pointer transition-all duration-200"
        >
            <div className="flex flex-col h-full justify-between">
                <div>
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-neutral-50 border border-[#E9E7E0] rounded-lg text-neutral-600 group-hover:bg-[#151515] group-hover:text-white transition-colors duration-200">
                            <PdfFileIcon className="w-8 h-8" />
                        </div>
                    </div>
                    <h3 className="font-sans font-semibold text-center text-[#151515] truncate px-1 mb-2 text-xs sm:text-sm">{book.title}</h3>
                    <div className="flex items-center justify-center space-x-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${book.processingStatus === 'completed' ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'}`}></div>
                        <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                            {book.processingStatus === 'completed' ? `${book.pages} Pages` : (book.processingStatus === 'failed' ? 'Failed' : 'AI Learning...')}
                        </p>
                    </div>
                </div>
                
                <div className="mt-6">
                     <button
                        onClick={(e) => { e.stopPropagation(); onSelect(); }}
                        className="w-full py-2 bg-neutral-50 hover:bg-[#151515] hover:text-white text-[#151515] border border-[#E9E7E0] rounded-lg text-xs font-sans font-semibold transition-all duration-150"
                    >
                        Open Literature
                    </button>
                </div>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="absolute top-4 right-4 p-2 bg-white border border-[#E9E7E0] rounded-lg shadow-sm text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 active:scale-95"
            >
                <TrashIcon className="w-3.5 h-3.5" />
            </button>
        </motion.div>
    );
}

const BookListPage: React.FC<BookListPageProps> = ({ books, setBooks, onSelectBook }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAddBook = async (book: Book) => {
        if (!auth.currentUser) return;
        
        try {
            const { file, ...bookData } = book;
            const bookWithUserId = { ...bookData, userId: auth.currentUser.uid, fileName: file?.name || '' };
            
            const bookRef = doc(db, 'users', auth.currentUser.uid, 'books', book.id);
            await setDoc(bookRef, bookWithUserId);

            // Store file locally for offline access/previews
            if (file) {
                await storeFile(book.id, file);
            }

            console.log(`[Library] Book added successfully: ${book.title}`);
        } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${auth.currentUser.uid}/books/${book.id}`);
        }
    };

    const handleDeleteBook = async (bookId: string) => {
        if (!auth.currentUser) return;

        try {
            const bookRef = doc(db, 'users', auth.currentUser.uid, 'books', bookId);
            await deleteDoc(bookRef);
            // Also delete from local storage
            await deleteFile(bookId);
        } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `users/${auth.currentUser.uid}/books/${bookId}`);
        }
    };

    return (
        <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-[#E9E7E0] pb-8 pt-4">
                <div className="relative">
                    <h1 className="text-4xl md:text-5xl font-display font-normal text-[#151515] tracking-tight">
                        My Library
                    </h1>
                    <p className="text-[#6E6D6A] font-mono text-[10px] uppercase tracking-[0.2em] mt-1.5">
                        KNOWLEDGE REPOSITORY
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-lg font-sans font-semibold tracking-wide transition-all duration-150 px-6 py-3.5 text-xs bg-[#151515] text-white hover:bg-neutral-800 shadow-sm w-full sm:w-auto"
                >
                    <UploadIcon className="mr-2 w-4 h-4" /> Upload PDF
                </button>
            </div>

            <AnimatePresence mode="popLayout">
                {books.length > 0 ? (
                    <motion.div 
                        layout 
                        className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                    >
                        {books.map(book => (
                            <BookCard 
                                key={book.id} 
                                book={book}
                                onSelect={() => onSelectBook(book.id)}
                                onDelete={() => handleDeleteBook(book.id)}
                            />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-[#E9E7E0] flex flex-col items-center justify-center py-24 px-6 rounded-xl shadow-sm"
                    >
                        <div className="w-16 h-16 bg-[#FAF9F6] border border-[#E9E7E0] rounded-lg flex items-center justify-center mb-6 text-neutral-400">
                            <PdfFileIcon className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-display font-medium text-[#151515] tracking-tight">Library is Empty</h2>
                        <p className="text-neutral-400 mt-2 text-center max-w-xs font-sans text-xs">
                            Your active literature space is empty. Upload reference PDFs to configure your AI assistant.
                        </p>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center justify-center rounded-lg font-sans font-semibold tracking-wide transition-all duration-150 px-6 py-3 mt-8 text-xs bg-white border border-[#D5D3CC] text-[#151515] hover:bg-neutral-50 shadow-sm"
                        >
                            Upload Material
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <FileUploadModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onFileUpload={handleAddBook}
            />
        </div>
    );
};

export default BookListPage;
