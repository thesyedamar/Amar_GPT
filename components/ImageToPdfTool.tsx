import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Spinner, UploadIcon, TrashIcon } from './icons';
declare const PDFLib: any;

const ImageToPdfTool: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'));
        setFiles(prev => [...prev, ...imageFiles]);
        setError(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/jpeg': [], 'image/png': [] },
        multiple: true
    } as any);

    const removeFile = (fileToRemove: File) => {
        setFiles(prev => prev.filter(file => file !== fileToRemove));
    };

    const handleCreatePdf = async () => {
        if (files.length === 0) {
            setError("Please upload at least one image.");
            return;
        }
        setError(null);
        setIsLoading(true);

        try {
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.create();

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                let image;
                if (file.type === 'image/jpeg') {
                    image = await pdfDoc.embedJpg(arrayBuffer);
                } else if (file.type === 'image/png') {
                    image = await pdfDoc.embedPng(arrayBuffer);
                } else {
                    continue; // Skip unsupported file types
                }
                
                const page = pdfDoc.addPage();
                const { width, height } = page.getSize();
                // Add a 25-point margin on all sides
                const scaled = image.scaleToFit(width - 50, height - 50);

                page.drawImage(image, {
                    x: (width - scaled.width) / 2,
                    y: (height - scaled.height) / 2,
                    width: scaled.width,
                    height: scaled.height,
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `images-to-pdf-${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setFiles([]); // Clear files after successful creation
        } catch (err) {
            console.error("Failed to create PDF from images:", err);
            setError("An error occurred while creating the PDF. One or more images may be corrupt or in an unsupported format.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Upload one or more JPG or PNG images. They will be added to a new PDF, one image per page, and scaled to fit.</p>

            <div {...getRootProps()} className={`p-6 border-2 border-dashed rounded-lg cursor-pointer text-center transition-colors mb-4 ${isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'}`}>
                <input {...getInputProps()} />
                <UploadIcon className="mx-auto w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Drag & drop images here</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">or click to select files</p>
            </div>

            {files.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-2 mb-4">
                    {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-md bg-slate-100 dark:bg-slate-800">
                           <div className="flex items-center truncate min-w-0">
                                <img src={URL.createObjectURL(file)} alt={file.name} className="w-8 h-8 object-cover rounded-sm mr-3 flex-shrink-0"/>
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</span>
                           </div>
                           <button onClick={() => removeFile(file)} className="p-1 rounded-full text-slate-400 hover:bg-red-500/10 hover:text-red-500 flex-shrink-0 ml-2">
                               <TrashIcon className="w-4 h-4"/>
                           </button>
                        </div>
                    ))}
                </div>
            )}

            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
            <button
                onClick={handleCreatePdf}
                disabled={isLoading || files.length === 0}
                className="w-full flex justify-center items-center px-4 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed"
            >
                {isLoading ? <Spinner /> : `Create PDF from ${files.length} Image(s)`}
            </button>
        </div>
    );
};

export default ImageToPdfTool;
