import React, { useState, useCallback } from 'react';
import { Book } from '../types';
import { Spinner, UploadIcon, TrashIcon, PdfFileIcon } from './icons';
import { useDropzone } from 'react-dropzone';
declare const PDFLib: any;

interface SplitToolProps {
  books: Book[];
}

// Helper to parse page ranges like "1-3, 5, 8-10"
const parsePageRanges = (rangeStr: string, maxPages: number): number[] => {
    const pages = new Set<number>();
    if (!rangeStr) return [];
    
    const parts = rangeStr.split(',');
    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(s => parseInt(s.trim(), 10));
            if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let i = start; i <= end; i++) {
                    if (i > 0 && i <= maxPages) pages.add(i);
                }
            }
        } else {
            const page = parseInt(part.trim(), 10);
            if (!isNaN(page) && page > 0 && page <= maxPages) {
                pages.add(page);
            }
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
};


const SplitTool: React.FC<SplitToolProps> = ({ books }) => {
    const [source, setSource] = useState<'library' | 'upload'>('library');
    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const [uploadedFile, setUploadedFile] = useState<{ file: File, pages: number } | null>(null);
    const [pageRange, setPageRange] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            setIsLoading(true);
            setError(null);
            try {
                const { PDFDocument } = PDFLib;
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                setUploadedFile({ file, pages: pdf.getPageCount() });
            } catch (err) {
                setError("Could not read the PDF file. It may be corrupt.");
                setUploadedFile(null);
            } finally {
                setIsLoading(false);
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: handleFileUpload,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    } as any);
    
    const bookFromLibrary = books.find(b => b.id === selectedBookId);

    const bookToSplit = source === 'library' ? bookFromLibrary : uploadedFile ? {
        title: uploadedFile.file.name,
        file: uploadedFile.file,
        pages: uploadedFile.pages,
    } : null;

    const handleSplit = async () => {
        if (!bookToSplit) {
            setError("Please select or upload a book.");
            return;
        }

        const pagesToExtract = parsePageRanges(pageRange, bookToSplit.pages);
        if (pagesToExtract.length === 0) {
            setError(`Please enter a valid page range (e.g., 1-3, 5, 8-10) within 1-${bookToSplit.pages}.`);
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            const { PDFDocument } = PDFLib;
            const arrayBuffer = await bookToSplit.file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            
            const newPdf = await PDFDocument.create();
            const pageIndices = pagesToExtract.map(p => p - 1);
            
            const copiedPages = await newPdf.copyPages(pdf, pageIndices);
            copiedPages.forEach(page => newPdf.addPage(page));
            
            const newPdfBytes = await newPdf.save();

            const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${bookToSplit.title.replace('.pdf', '')}-split.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to split PDF:", err);
            setError("An error occurred while splitting the PDF. Please check the page range and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Select a book or upload a file, then specify the pages you want to extract into a new PDF.</p>
            
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4 text-sm font-medium">
                <button
                    onClick={() => setSource('library')}
                    className={`w-1/2 py-1.5 rounded-md transition-colors ${source === 'library' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                >
                    From Library
                </button>
                <button
                    onClick={() => setSource('upload')}
                    className={`w-1/2 py-1.5 rounded-md transition-colors ${source === 'upload' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                >
                    Upload File
                </button>
            </div>
            
            <div className="space-y-4">
                 {source === 'library' && (
                    <div>
                        <label htmlFor="book-select-split" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select a Book</label>
                        <select
                            id="book-select-split"
                            value={selectedBookId}
                            onChange={e => {
                                setSelectedBookId(e.target.value);
                                setPageRange('');
                                setError(null);
                            }}
                            className="w-full pl-3 pr-8 py-2 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            disabled={books.length === 0}
                        >
                            <option value="">{books.length > 0 ? 'Choose a book...' : 'No books available'}</option>
                            {books.map(book => <option key={book.id} value={book.id}>{book.title} ({book.pages} pages)</option>)}
                        </select>
                    </div>
                )}
                {source === 'upload' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Upload a PDF</label>
                        {!uploadedFile ? (
                             <div {...getRootProps()} className={`p-6 border-2 border-dashed rounded-lg cursor-pointer text-center transition-colors ${isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'}`}>
                                <input {...getInputProps()} />
                                <UploadIcon className="mx-auto w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
                                <p className="font-semibold text-slate-700 dark:text-slate-300">Drop a PDF here</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">or click to select a file</p>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 rounded-md bg-slate-100 dark:bg-slate-800">
                               <div className="flex items-center truncate min-w-0">
                                    <PdfFileIcon className="w-8 h-8 mr-3 flex-shrink-0" />
                                    <div className="truncate">
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{uploadedFile.file.name}</span>
                                        <p className="text-xs text-slate-500">{uploadedFile.pages} pages</p>
                                    </div>
                               </div>
                               <button onClick={() => setUploadedFile(null)} className="p-1 rounded-full text-slate-400 hover:bg-red-500/10 hover:text-red-500 flex-shrink-0 ml-2">
                                   <TrashIcon className="w-4 h-4"/>
                               </button>
                            </div>
                        )}
                    </div>
                )}
                 <div>
                    <label htmlFor="page-range" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pages or Range</label>
                    <input
                        id="page-range"
                        type="text"
                        value={pageRange}
                        onChange={e => setPageRange(e.target.value)}
                        placeholder="e.g., 1-5, 8, 10-12"
                        className="w-full pl-3 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={!bookToSplit}
                    />
                </div>
            </div>
            {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
            <button
                onClick={handleSplit}
                disabled={isLoading || !bookToSplit || !pageRange}
                className="w-full mt-6 flex justify-center items-center px-4 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed"
            >
                {isLoading ? <Spinner /> : 'Split PDF'}
            </button>
        </div>
    );
};

// Fix: Added a default export to make the component importable.
export default SplitTool;
