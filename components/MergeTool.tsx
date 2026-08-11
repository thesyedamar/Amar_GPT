import React, { useState, useCallback } from 'react';
import { Book } from '../types';
import { Spinner, UploadIcon, TrashIcon, PdfFileIcon } from './icons';
import { useDropzone } from 'react-dropzone';
// pdf-lib will be available globally from the script tag in index.html
declare const PDFLib: any;

interface MergeToolProps {
  books: Book[];
}

const MergeTool: React.FC<MergeToolProps> = ({ books }) => {
    const [source, setSource] = useState<'library' | 'upload'>('library');
    const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
        setUploadedFiles(prev => [...prev, ...pdfFiles]);
        setError(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
    } as any);

    const removeUploadedFile = (fileToRemove: File) => {
        setUploadedFiles(prev => prev.filter(file => file !== fileToRemove));
    };

    const handleToggleBook = (bookId: string) => {
        setSelectedBookIds(prev =>
            prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
        );
    };

    const handleMerge = async () => {
        setError(null);
        setIsLoading(true);

        try {
            const { PDFDocument } = PDFLib;
            const mergedPdf = await PDFDocument.create();

            if (source === 'library') {
                 if (selectedBookIds.length < 2) {
                    setError("Please select at least two books to merge.");
                    setIsLoading(false);
                    return;
                }
                const selectedBooks = selectedBookIds.map(id => books.find(b => b.id === id)).filter(Boolean) as Book[];
                for (const book of selectedBooks) {
                    const arrayBuffer = await book.file.arrayBuffer();
                    const pdf = await PDFDocument.load(arrayBuffer);
                    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                    copiedPages.forEach((page) => mergedPdf.addPage(page));
                }
            } else { // source === 'upload'
                if (uploadedFiles.length < 2) {
                    setError("Please upload at least two PDF files to merge.");
                    setIsLoading(false);
                    return;
                }
                for (const file of uploadedFiles) {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await PDFDocument.load(arrayBuffer);
                    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                    copiedPages.forEach((page) => mergedPdf.addPage(page));
                }
            }
            
            const mergedPdfBytes = await mergedPdf.save();
            
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `merged-document-${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error("Failed to merge PDFs:", err);
            setError("An error occurred while merging the PDFs. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const itemsToMergeCount = source === 'library' ? selectedBookIds.length : uploadedFiles.length;

    return (
        <div className="space-y-6">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest leading-relaxed">
                &gt; Select books from your library or upload new files to merge into a single PDF.
            </p>
            
            <div className="flex bg-muted/30 border border-border cyber-chamfer-sm p-1 text-[10px] font-mono font-bold uppercase tracking-widest">
                <button
                    onClick={() => setSource('library')}
                    className={`flex-1 py-2 transition-all ${source === 'library' ? 'bg-accent text-background shadow-neon' : 'text-muted-foreground hover:text-white'}`}
                >
                    [My Library]
                </button>
                <button
                    onClick={() => setSource('upload')}
                    className={`flex-1 py-2 transition-all ${source === 'upload' ? 'bg-accent text-background shadow-neon' : 'text-muted-foreground hover:text-white'}`}
                >
                    [Upload Files]
                </button>
            </div>

            {source === 'library' && (
                <div className="max-h-60 overflow-y-auto border border-border bg-muted/10 cyber-chamfer-sm p-2 space-y-2 scrollbar-thin">
                    {books.length > 0 ? books.map(book => (
                        <label key={book.id} className={`flex items-center p-3 border transition-all cursor-pointer ${selectedBookIds.includes(book.id) ? 'bg-accent/10 border-accent shadow-neon-sm' : 'bg-muted/30 border-border hover:border-accent/50'}`}>
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={selectedBookIds.includes(book.id)}
                                    onChange={() => handleToggleBook(book.id)}
                                    className="sr-only"
                                />
                                <div className={`w-4 h-4 border flex items-center justify-center transition-all ${selectedBookIds.includes(book.id) ? 'bg-accent border-accent' : 'border-border bg-transparent'}`}>
                                    {selectedBookIds.includes(book.id) && <div className="w-2 h-2 bg-background"></div>}
                                </div>
                            </div>
                            <span className="ml-4 text-xs font-mono font-bold text-white uppercase tracking-wider truncate">{book.title}</span>
                        </label>
                    )) : (
                        <p className="text-[10px] font-mono text-center text-muted-foreground py-8 uppercase tracking-widest">&gt; Library is empty.</p>
                    )}
                </div>
            )}

            {source === 'upload' && (
                <div className="space-y-4">
                    <div {...getRootProps()} className={`p-8 border-2 border-dashed cyber-chamfer cursor-pointer text-center transition-all ${isDragActive ? 'border-accent bg-accent/10 shadow-neon' : 'border-border bg-muted/30 hover:border-accent/50'}`}>
                        <input {...getInputProps()} />
                        <UploadIcon className="mx-auto w-10 h-10 text-accent/40 mb-4" />
                        <p className="font-mono text-xs font-bold text-white uppercase tracking-widest">&gt; Drop PDF Files</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-2 uppercase tracking-widest">or click to select files</p>
                    </div>
                    
                    {uploadedFiles.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border border-border bg-muted/10 cyber-chamfer-sm p-2 space-y-2 scrollbar-thin">
                            {uploadedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 border border-border cyber-chamfer-sm">
                                   <div className="flex items-center truncate min-w-0">
                                        <PdfFileIcon className="w-6 h-6 mr-3 text-accent/60 flex-shrink-0" />
                                        <span className="text-[10px] font-mono text-white uppercase tracking-wider truncate">{file.name}</span>
                                   </div>
                                   <button onClick={() => removeUploadedFile(file)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                                       <TrashIcon className="w-4 h-4"/>
                                   </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="p-3 bg-destructive/10 border border-destructive cyber-chamfer-sm text-[10px] font-mono text-destructive uppercase tracking-widest">
                    [ERROR]: {error}
                </div>
            )}

            <button
                onClick={handleMerge}
                disabled={isLoading || itemsToMergeCount < 2}
                className="w-full h-12 bg-accent text-background cyber-chamfer font-display font-black uppercase tracking-[0.2em] shadow-neon hover:brightness-110 transition-all disabled:opacity-30 disabled:shadow-none flex items-center justify-center"
            >
                {isLoading ? <Spinner /> : `Merge ${itemsToMergeCount} Files`}
            </button>
        </div>
    );
};

// Fix: Added a default export to make the component importable.
export default MergeTool;