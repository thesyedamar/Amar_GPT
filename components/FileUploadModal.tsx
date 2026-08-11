import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Book } from '../types';
import { CloseIcon, CloudUploadIcon, Spinner, CheckCircleIcon, PdfFileIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../lib/firebase';
import { storeFile } from '../lib/fileStorage';

import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker path using Vite's local worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: (book: Book) => void;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({ isOpen, onClose, onFileUpload }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [timeLeft, setTimeLeft] = useState('');
    const uploadStartTime = useRef<number | null>(null);
    const hasCalledUpload = useRef(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            hasCalledUpload.current = false;
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    } as any);

    const handleClose = () => {
        setFile(null);
        setIsSuccess(false);
        setIsUploading(false);
        setUploadError(null);
        setUploadProgress(0);
        setTimeLeft('');
        uploadStartTime.current = null;
        hasCalledUpload.current = false;
        onClose();
    };

    useEffect(() => {
        if (file && !isUploading && !isSuccess && !hasCalledUpload.current && auth.currentUser) {
            setIsUploading(true);
            setUploadProgress(0);
            setTimeLeft('');
            uploadStartTime.current = Date.now();
            hasCalledUpload.current = true;

            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            // Use absolute path to ensure correct routing regardless of page URL
            xhr.open('POST', '/api/upload', true);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    setUploadProgress(progress);

                    if (uploadStartTime.current) {
                        const elapsedTime = Date.now() - uploadStartTime.current;
                        if (progress > 0) {
                            const totalTime = (elapsedTime / progress) * 100;
                            const remainingTime = Math.max(0, totalTime - elapsedTime);
                            const remainingSeconds = Math.ceil(remainingTime / 1000);
                            setTimeLeft(remainingSeconds > 1 ? `${remainingSeconds}s left` : 'Almost done...');
                        }
                    }
                }
            };

            xhr.onload = async () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    setTimeLeft('Finalizing...');
                    
                    try {
                        // Count pages in background
                        let pageCount = 0;
                        try {
                            const arrayBuffer = await file.arrayBuffer();
                            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                            pageCount = pdf.numPages;
                        } catch (err) {
                            console.error("Error counting PDF pages:", err);
                            pageCount = 0;
                        }

                        const newBook: Book = {
                            id: `book-${Date.now()}`,
                            title: file.name.replace('.pdf', ''),
                            geminiFileUri: response.fileUri,
                            pages: pageCount,
                            uploadedDate: new Date().toISOString(),
                            processingStatus: 'completed',
                            file: file
                        };

                        await storeFile(newBook.id, file);
                        onFileUpload(newBook);
                        setIsUploading(false);
                        setIsSuccess(true);
                        setTimeout(handleClose, 500);
                    } catch (err) {
                        console.error("Error finalizing upload:", err);
                        setUploadError('Error finalizing analysis. Please try again.');
                        setIsUploading(false);
                        hasCalledUpload.current = false;
                    }
                } else {
                    console.error("Upload failed with status:", xhr.status);
                    let errorMsg = 'Upload failed. Please try again.';
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        errorMsg = errorResponse.error || errorMsg;
                    } catch (e) {}

                    console.warn("[Upload] Server upload failed, falling back to local client storage:", errorMsg);
                    try {
                        let pageCount = 0;
                        try {
                            const arrayBuffer = await file.arrayBuffer();
                            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                            pageCount = pdf.numPages;
                        } catch (err) {
                            console.error("Error counting PDF pages:", err);
                        }

                        const newBook: Book = {
                            id: `book-${Date.now()}`,
                            title: file.name.replace('.pdf', ''),
                            geminiFileUri: "",
                            pages: pageCount,
                            uploadedDate: new Date().toISOString(),
                            processingStatus: 'completed',
                            file: file
                        };

                        await storeFile(newBook.id, file);
                        onFileUpload(newBook);
                        setIsUploading(false);
                        setIsSuccess(true);
                        setTimeout(handleClose, 500);
                    } catch (fallbackErr) {
                        setUploadError(errorMsg);
                        setIsUploading(false);
                        hasCalledUpload.current = false;
                    }
                }
            };

            xhr.onerror = () => {
                console.error("[Upload] XHR Network Error", xhr);
                setIsUploading(false);
                hasCalledUpload.current = false;
                setUploadError('Upload failed due to network error. This can happen if the file is too large (max 100MB) or if your connection is unstable.');
            };

            xhr.send(formData);
        }
    }, [file]);


    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-white/90 backdrop-blur-xl rounded-[40px] shadow-clayCard w-full max-w-md relative overflow-hidden border border-white/40"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 right-0 p-6 font-display font-black text-[10px] text-clay-accent/20 uppercase tracking-[0.5em]">
                            UPLOAD MODULE
                        </div>

                        <button 
                            onClick={handleClose} 
                            className="absolute top-6 left-6 p-3 bg-white rounded-2xl shadow-clayCard text-clay-accent hover:scale-110 active:scale-90 transition-all z-10"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>
                        
                        <div className="p-10 pt-24">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-display font-black text-foreground uppercase tracking-widest clay-text-gradient">
                                    Upload PDF
                                </h2>
                                <p className="text-muted font-sans font-bold text-[10px] uppercase tracking-[0.3em] mt-2">
                                    Document Upload
                                </p>
                            </div>

                            {!file && (
                                <div 
                                    {...getRootProps()} 
                                    className={`group p-12 rounded-[32px] border-4 border-dashed cursor-pointer text-center transition-all duration-500 ${
                                        isDragActive 
                                            ? 'border-clay-accent bg-clay-accent/5 shadow-clayCard -translate-y-1' 
                                            : 'border-clay-accent/10 bg-[#EFEBF5] shadow-clayPressed hover:bg-white hover:border-clay-accent/30 hover:shadow-clayCard hover:-translate-y-1'
                                    }`}
                                >
                                    <input {...getInputProps()} />
                                    <div className="w-20 h-20 bg-white rounded-[24px] shadow-clayCard flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-500">
                                        <CloudUploadIcon className="w-10 h-10 text-clay-accent" />
                                    </div>
                                    <p className="font-display font-black text-sm text-foreground uppercase tracking-widest">Drop PDF Here</p>
                                    <p className="text-[10px] font-sans font-bold text-muted mt-4 uppercase tracking-[0.2em]">or click to browse files</p>
                                </div>
                            )}

                            {file && !isSuccess && (
                                <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="w-24 h-24 bg-white rounded-[32px] shadow-clayCard flex items-center justify-center mx-auto mb-8">
                                        <PdfFileIcon className="w-10 h-10 text-clay-accent" />
                                    </div>
                                    <p className="font-display font-black text-base text-foreground truncate uppercase tracking-wider px-4">{file.name}</p>
                                    <div className="flex items-center justify-center space-x-4 mt-3">
                                        <span className="text-[10px] font-sans font-black text-clay-accent/40 uppercase tracking-widest bg-white px-4 py-1.5 rounded-full shadow-clayCard">
                                            {Math.round(file.size / 1024)} KB
                                        </span>
                                    </div>
                                    
                                    {uploadError && (
                                        <div className="mt-8 p-6 bg-clay-accent-secondary/5 border-2 border-clay-accent-secondary/20 rounded-[24px] text-center animate-in shake-in duration-300">
                                            <p className="text-[11px] font-sans font-black text-clay-accent-secondary uppercase tracking-widest leading-relaxed">
                                                {uploadError}
                                            </p>
                                            <button 
                                                onClick={() => {
                                                    setFile(null);
                                                    setUploadError(null);
                                                    hasCalledUpload.current = false;
                                                }}
                                                className="mt-4 px-6 py-2 bg-white text-clay-accent-secondary rounded-xl shadow-clayCard text-[10px] font-sans font-black uppercase hover:scale-105 transition-all"
                                            >
                                                Try Another
                                            </button>
                                        </div>
                                    )}

                                    {file && !isSuccess && !uploadError && (
                                        <div className="mt-12 w-full text-left bg-white/40 p-8 rounded-[32px] shadow-clayCard">
                                        <div className="flex justify-between items-center text-[10px] font-sans font-black text-clay-accent uppercase tracking-[0.3em] mb-4">
                                            <span className="flex items-center">
                                                {isUploading && <span className="flex h-2 w-2 relative mr-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-clay-accent opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-clay-accent"></span></span>}
                                                {isUploading ? `UPLOADING... ${uploadProgress}%` : 'PROCESSING...'}
                                            </span>
                                            <span>{timeLeft}</span>
                                        </div>
                                        <div className="w-full bg-[#EFEBF5] rounded-full h-4 shadow-clayPressed overflow-hidden">
                                            <div 
                                                className="bg-clay-accent h-full shadow-clayCard transition-all duration-100 ease-linear" 
                                                style={{ width: `${uploadProgress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    )}
                                </div>
                            )}

                            {isSuccess && (
                                <div className="text-center flex flex-col items-center py-6 animate-in zoom-in duration-500">
                                    <div className="w-24 h-24 bg-clay-success rounded-[32px] shadow-clayCard flex items-center justify-center mb-10">
                                        <CheckCircleIcon className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-display font-black text-foreground uppercase tracking-widest">Upload Complete</h3>
                                    <p className="text-xs font-sans font-bold text-muted mt-4 uppercase tracking-widest leading-relaxed max-w-[240px]">
                                        Document successfully added to your library.
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FileUploadModal;