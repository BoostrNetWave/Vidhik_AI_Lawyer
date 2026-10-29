import { useParams, useNavigate } from 'react-router-dom';
import { getFileUrl, isImageFile, isPdfFile, getFileName } from '../lib/fileUtils';
import { Download, ArrowLeft, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';

export default function DocumentViewPage() {
    const { filename } = useParams<{ filename: string }>();
    const navigate = useNavigate();

    const cleanFilename = filename ? decodeURIComponent(filename) : '';
    const fileUrl = getFileUrl(cleanFilename);
    const displayName = getFileName(cleanFilename);
    const isImg = isImageFile(cleanFilename);
    const isPdf = isPdfFile(cleanFilename);

    const handleDownload = async () => {
        try {
            const res = await fetch(fileUrl);
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = displayName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch {
            window.open(fileUrl, '_blank');
        }
    };

    if (!cleanFilename) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
                <FileText className="w-16 h-16 text-slate-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Document Specified</h2>
                <button
                    onClick={() => navigate(-1)}
                    className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Top Bar */}
            <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                        title="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                        {isImg ? (
                            <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : isPdf ? (
                            <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : (
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                        )}
                        <span className="font-extrabold text-sm truncate max-w-[200px] sm:max-w-md text-white" title={displayName}>
                            {displayName}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title="Open Raw File"
                    >
                        <ExternalLink size={14} />
                        <span className="hidden sm:inline">Open Raw</span>
                    </a>
                    <button
                        onClick={handleDownload}
                        className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                        title="Download Document"
                    >
                        <Download size={14} />
                        <span>Download</span>
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#0a0f1d] relative">
                {isImg ? (
                    <div className="max-w-5xl max-h-[85vh] flex items-center justify-center">
                        <img
                            src={fileUrl}
                            alt={displayName}
                            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-800/80 bg-black/40"
                        />
                    </div>
                ) : isPdf ? (
                    <iframe
                        src={fileUrl}
                        title={displayName}
                        className="w-full h-[calc(100vh-80px)] rounded-2xl border border-slate-800 shadow-2xl bg-white"
                    />
                ) : (
                    <div className="text-center p-8 bg-slate-900/60 border border-slate-800 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                            <FileText size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-white text-base truncate" title={displayName}>
                                {displayName}
                            </h3>
                            <p className="text-xs text-slate-400">
                                This file type cannot be previewed inline in browser.
                            </p>
                        </div>
                        <button
                            onClick={handleDownload}
                            className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-colors"
                        >
                            <Download size={16} />
                            Download Document
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}

