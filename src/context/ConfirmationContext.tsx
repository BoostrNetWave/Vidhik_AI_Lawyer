import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
    onConfirm: () => void;
}

interface ConfirmationContextType {
    confirm: (options: ConfirmationOptions) => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmationOptions | null>(null);

    const confirm = (opts: ConfirmationOptions) => {
        setOptions(opts);
        setIsOpen(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        setTimeout(() => setOptions(null), 300); // Clear after animation
    };

    const handleConfirm = () => {
        if (options?.onConfirm) {
            options.onConfirm();
        }
        setIsOpen(false);
        setTimeout(() => setOptions(null), 300);
    };

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            {isOpen && options && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={handleCancel}
                    />
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-full shrink-0 ${options.type === 'info' ? 'bg-primary/10 text-primary' : 'bg-red-100 text-red-600'}`}>
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-slate-900">{options.title}</h3>
                                    <p className="text-sm text-primary leading-relaxed font-medium">{options.message}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 px-6 flex justify-end gap-3 border-t border-slate-100">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm font-bold bg-primary/10 border-primary/20 text-primary hover:bg-slate-200/50 rounded-lg transition-colors"
                            >
                                {options.cancelText || 'Cancel'}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-md transition-all active:scale-95 ${options.type === 'info'
                                        ? 'bg-primary hover:bg-primary/90 shadow-primary/20'
                                        : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                    }`}
                            >
                                {options.confirmText || 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmationContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmationProvider');
    }
    return context;
};
