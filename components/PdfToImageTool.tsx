
import React, { useState, useCallback } from 'react';
import { Book } from '../types';
import { Spinner, DownloadIcon, UploadIcon, TrashIcon, PdfFileIcon } from './icons';
import { useDropzone } from 'react-dropzone';
declare const PDFLib: any;

interface PdfToImageToolProps {
  books: Book[];
}

const PdfToImageTool: React.FC<PdfToImageToolProps> = ({ books }) => {
    const [source, setSource] = useState<'library' | 'upload'>('library');
    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const [uploadedFile, setUploadedFile] = useState<{ file: File, pages: number } | null>(null);
    const [pageNumber, setPageNumber] = useState('1');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

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
                setPageNumber('1');
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
    const bookToProcess = source === 'library' ? bookFromLibrary : uploadedFile ? {
        title: uploadedFile.file.name,
        pages: uploadedFile.pages,
    } : null;

    const handleGenerate = async () => {
        if (!bookToProcess) {
            setError("Please select or upload a book.");
            return;
        }
        const page = parseInt(pageNumber, 10);
        if (isNaN(page) || page < 1 || page > bookToProcess.pages) {
            setError(`Please enter a valid page number between 1 and ${bookToProcess.pages}.`);
            return;
        }

        setError(null);
        setIsLoading(true);
        setImageUrl(null);

        try {
            const prompt = `Generate a high-quality, educational illustration representing the main concepts of page ${page} from a document titled "${bookToProcess.title}". The style should be clean and clear, like a modern textbook diagram or infographic.`;
            
            const res = await fetch("/api/gemini/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, aspectRatio: "4:3" })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Server responded with ${res.status}`);
            }

            const data = await res.json();
            if (data.imageUrl) {
                setImageUrl(data.imageUrl);
            } else {
                throw new Error("No image was returned.");
            }
        } catch (err: any) {
            console.error("Failed to generate image:", err);
            setError(err.message || "An error occurred while generating the image.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Select a document and page number to generate an AI-powered illustration of its content. This is not a direct conversion, but an AI interpretation.</p>
            
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
                 {source === 'library' ? (
                    <div>
                        <label htmlFor="book-select-image" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select a Book</label>
                        <select
                            id="book-select-image"
                            value={selectedBookId}
                            onChange={e => {
                                setSelectedBookId(e.target.value);
                                setPageNumber('1');
                                setError(null);
                                setImageUrl(null);
                            }}
                            className="w-full pl-3 pr-8 py-2 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            disabled={books.length === 0}
                        >
                            <option value="">{books.length > 0 ? 'Choose a book...' : 'No books available'}</option>
                            {books.map(book => <option key={book.id} value={book.id}>{book.title} ({book.pages} pages)</option>)}
                        </select>
                    </div>
                 ) : (
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
                    <label htmlFor="page-number" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Page Number</label>
                    <input
                        id="page-number"
                        type="number"
                        value={pageNumber}
                        onChange={e => setPageNumber(e.target.value)}
                        min="1"
                        max={bookToProcess?.pages}
                        className="w-full pl-3 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={!bookToProcess}
                    />
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={isLoading || !bookToProcess || !pageNumber}
                className="w-full mt-6 flex justify-center items-center px-4 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed"
            >
                {isLoading ? <Spinner /> : 'Generate Image'}
            </button>

            {error && <p className="text-sm text-red-500 mt-4 text-center">{error}</p>}
            
            {imageUrl && !isLoading && (
                <div className="mt-6">
                    <h3 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Generated Image:</h3>
                    <img src={imageUrl} alt="AI generated illustration" className="rounded-lg border border-slate-200 dark:border-slate-700" />
                    <a
                        href={imageUrl}
                        download={`illustration-${bookToProcess?.title.replace('.pdf','')}-p${pageNumber}.png`}
                        className="mt-4 w-full flex justify-center items-center px-4 py-2.5 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-700"
                    >
                       <DownloadIcon className="w-5 h-5 mr-2" /> Download Image
                    </a>
                </div>
            )}
        </div>
    );
};

export default PdfToImageTool;
