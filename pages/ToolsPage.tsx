import React, { useState } from 'react';
import { Book } from '../types';
import { ImageIcon, MergeIcon, SplitIcon, DownloadIcon, ToolsIcon, FileImageIcon } from '../components/icons';
import ToolModal from '../components/ToolModal';
import MergeTool from '../components/MergeTool';
import SplitTool from '../components/SplitTool';
import PdfToImageTool from '../components/PdfToImageTool';
import FormatConverterTool from '../components/FormatConverterTool';
import ImageToPdfTool from '../components/ImageToPdfTool';

interface ToolsPageProps {
  books: Book[];
}

type ToolType = 'merge' | 'split' | 'image' | 'convert' | 'imageToPdf';

const ToolCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    onOpen: () => void;
    disabled?: boolean;
}> = ({ icon, title, description, onOpen, disabled = false }) => {
    return (
        <div className="bg-white border border-[#E9E7E0] hover:border-neutral-400 p-6 rounded-xl shadow-sm flex flex-col justify-between group transition-all duration-200">
            <div>
                <div className="flex items-center space-x-4 mb-4">
                    <div className="w-10 h-10 bg-[#FAF9F7] border border-[#E9E7E0] text-[#151515] flex items-center justify-center rounded-lg group-hover:bg-[#151515] group-hover:text-white transition-colors duration-150">
                        {icon}
                    </div>
                    <h3 className="text-base font-sans font-semibold text-[#151515]">{title}</h3>
                </div>
                <p className="text-[#6E6D6A] text-xs font-sans font-normal leading-relaxed">
                    {description}
                </p>
            </div>
            <button 
                onClick={onOpen}
                disabled={disabled}
                className={`mt-6 w-full py-2.5 font-sans font-semibold text-xs rounded-lg border transition-all duration-150 ${
                    disabled 
                    ? 'bg-neutral-50 text-neutral-400 border-neutral-200 cursor-not-allowed' 
                    : 'bg-[#151515] text-white hover:bg-neutral-800 border-transparent shadow-sm'
                }`}
            >
                {disabled ? 'Coming Soon' : 'Open Tool'}
            </button>
        </div>
    );
};

const ToolsPage: React.FC<ToolsPageProps> = ({ books }) => {
    const [activeTool, setActiveTool] = useState<ToolType | null>(null);

    const toolConfig = {
        merge: { title: 'Merge PDFs', component: <MergeTool books={books} /> },
        split: { title: 'Split PDF', component: <SplitTool books={books} /> },
        imageToPdf: { title: 'Image to PDF', component: <ImageToPdfTool /> },
        image: { title: 'PDF Page to Image (AI)', component: <PdfToImageTool books={books} /> },
        convert: { title: 'Format Converter (AI)', component: <FormatConverterTool books={books} /> },
    };

    const currentTool = activeTool ? toolConfig[activeTool] : null;

    return (
        <div className="space-y-10 pt-4">
            <div className="relative border-b border-[#E9E7E0] pb-8">
                <h1 className="text-4xl md:text-5xl font-display font-normal text-[#151515] tracking-tight">
                    Document Tools
                </h1>
                <p className="text-[#6E6D6A] font-mono text-[10px] uppercase tracking-[0.2em] mt-1.5">
                    KNOWLEDGE & PDF RECONSTITUTION UTILITIES
                </p>
            </div>
      
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ToolCard
                    icon={<MergeIcon className="w-5 h-5" />}
                    title="Merge PDFs"
                    description="Combine multiple uploaded documents into a single PDF file for easier management."
                    onOpen={() => setActiveTool('merge')}
                />
                <ToolCard
                    icon={<SplitIcon className="w-5 h-5" />}
                    title="Split PDF"
                    description="Extract specific pages or chapters from a large document into a new, smaller file."
                    onOpen={() => setActiveTool('split')}
                />
                <ToolCard
                    icon={<FileImageIcon className="w-5 h-5" />}
                    title="Image to PDF"
                    description="Convert one or more images (JPG, PNG) into a single, easy-to-share PDF document."
                    onOpen={() => setActiveTool('imageToPdf')}
                />
                <ToolCard
                    icon={<ImageIcon className="w-5 h-5" />}
                    title="PDF Page to Image"
                    description="Use AI to generate a high-quality illustration based on a specific page's content."
                    onOpen={() => setActiveTool('image')}
                />
                <ToolCard
                    icon={<ToolsIcon className="w-5 h-5" />}
                    title="Format Converter"
                    description="Use AI to extract the text content from a PDF and convert it to a plain text file."
                    onOpen={() => setActiveTool('convert')}
                />
                <ToolCard
                    icon={<DownloadIcon className="w-5 h-5" />}
                    title="Export Data"
                    description="Download your summaries, quizzes, and chat histories for offline access."
                    onOpen={() => {}}
                    disabled={true}
                />
            </div>

            {currentTool && (
                <ToolModal
                    isOpen={!!activeTool}
                    onClose={() => setActiveTool(null)}
                    title={currentTool.title}
                >
                    {currentTool.component}
                </ToolModal>
            )}
        </div>
    );
};

export default ToolsPage;
