
import React, { useState, useCallback } from 'react';
import { Book } from '../types';
import { Spinner, DownloadIcon, UploadIcon, TrashIcon, PdfFileIcon } from './icons';
import { useDropzone } from 'react-dropzone';

interface FormatConverterToolProps {
  books: Book[];
}

type TargetFormat = 'txt' | 'md' | 'json' | 'csv' | 'html';

const FormatConverterTool: React.FC<FormatConverterToolProps> = ({ books }) => {
    const [source, setSource] = useState<'library' | 'upload'>('library');
    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [targetFormat, setTargetFormat] = useState<TargetFormat>('txt');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setUploadedFile(acceptedFiles[0]);
            setError(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    } as any);

    const bookFromLibrary = books.find(b => b.id === selectedBookId);
    const bookToProcess = source === 'library' ? bookFromLibrary : uploadedFile ? {
        title: uploadedFile.name,
    } : null;

    const getPromptForFormat = (format: TargetFormat, title: string): string => {
        switch (format) {
            case 'md':
                return `You are an AI conversion tool. Convert the content from a document titled "${title}" into well-structured Markdown. Use headings, lists, bold, and italics where appropriate. Do not add any commentary or explanatory text outside of the direct conversion.`;
            case 'json':
                return `You are an AI extraction tool. Analyze the content of the document titled "${title}" and convert its key information into a structured JSON format. Identify main sections, key points, and any tabular data. If the content isn't structured, create a JSON object with a 'content' key holding the text. Output only the raw JSON.`;
            case 'csv':
                return `You are an AI extraction tool. Analyze the content of the document titled "${title}" for any tabular data. Convert the first table you find into a comma-separated values (CSV) format. Include a header row. If no clear table is found, return a single line: "No tabular data found."`;
            case 'html':
                return `You are an AI conversion tool. Convert the content from a document titled "${title}" into semantic HTML. Use appropriate tags like <h1>, <p>, <ul>, <li>, etc. Do not include <html>, <head>, or <body> tags, only the content markup.`;
            case 'txt':
            default:
                return `You are an AI extraction tool. Your task is to provide the plain text content from a document titled "${title}". Provide the text in a clean, readable format, preserving paragraphs. Do not add any commentary, just the extracted text.`;
        }
    };

    const handleConvert = async () => {
        if (!bookToProcess) {
            setError("Please select or upload a book.");
            return;
        }
        setError(null);
        setIsLoading(true);

        try {
            const res = await fetch("/api/gemini/convert-format", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ format: targetFormat, bookTitle: bookToProcess.title })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Server responded with ${res.status}`);
            }

            const data = await res.json().catch(() => ({}));
            const textContent = data.textContent || "";
            if (!textContent) throw new Error("No text content returned from conversion service.");
            
            const formatDetails = {
                txt: { mime: 'text/plain;charset=utf-8', ext: 'txt' },
                md: { mime: 'text/markdown;charset=utf-8', ext: 'md' },
                json: { mime: 'application/json;charset=utf-8', ext: 'json' },
                csv: { mime: 'text/csv;charset=utf-8', ext: 'csv' },
                html: { mime: 'text/html;charset=utf-8', ext: 'html' }
            };

            const details = formatDetails[targetFormat];
            const blob = new Blob([textContent], { type: details.mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${bookToProcess.title.replace('.pdf', '')}.${details.ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (err: any) {
            console.error("Failed to convert file:", err);
            setError(err.message || "An error occurred during the conversion.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Select a document and a target format. The AI will intelligently convert the content. Quality may vary based on the document's structure.</p>
            
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
                        <label htmlFor="book-select-convert" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select a Book</label>
                        <select
                            id="book-select-convert"
                            value={selectedBookId}
                            onChange={e => {
                                setSelectedBookId(e.target.value)
                                setError(null);
                            }}
                            className="w-full pl-3 pr-8 py-2 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            disabled={books.length === 0}
                        >
                            <option value="">{books.length > 0 ? 'Choose a book...' : 'No books available'}</option>
                            {books.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}
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
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{uploadedFile.name}</span>
                               </div>
                               <button onClick={() => setUploadedFile(null)} className="p-1 rounded-full text-slate-400 hover:bg-red-500/10 hover:text-red-500 flex-shrink-0 ml-2">
                                   <TrashIcon className="w-4 h-4"/>
                               </button>
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label htmlFor="target-format" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Format</label>
                    <select
                        id="target-format"
                        value={targetFormat}
                        onChange={e => setTargetFormat(e.target.value as TargetFormat)}
                        className="w-full pl-3 pr-8 py-2 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="txt">Plain Text (.txt)</option>
                        <option value="md">Markdown (.md)</option>
                        <option value="json">JSON (.json)</option>
                        <option value="csv">CSV (.csv)</option>
                        <option value="html">HTML (.html)</option>
                    </select>
                </div>
            </div>

            {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
            
            <button
                onClick={handleConvert}
                disabled={isLoading || !bookToProcess}
                className="w-full mt-6 flex justify-center items-center px-4 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed"
            >
                {isLoading ? <Spinner /> : <><DownloadIcon className="w-5 h-5 mr-2" /> Convert to .{targetFormat}</>}
            </button>
        </div>
    );
};

export default FormatConverterTool;
