import React from "react";
import { X, AlertTriangle, Trash2, CheckCircle } from "lucide-react";

interface ConfirmModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "success";
    loading?: boolean;
}

export default function ConfirmModal({
    visible,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "danger",
    loading = false
}: ConfirmModalProps) {
    if (!visible) return null;

    const getTypeStyles = () => {
        switch (type) {
            case "danger":
                return {
                    icon: <Trash2 size={24} />,
                    iconBg: "bg-red-50 border-red-100",
                    iconColor: "text-red-600",
                    confirmBtn: "bg-red-600 hover:bg-red-700 shadow-red-100",
                    ring: "ring-red-100"
                };
            case "warning":
                return {
                    icon: <AlertTriangle size={24} />,
                    iconBg: "bg-orange-50 border-orange-100",
                    iconColor: "text-orange-600",
                    confirmBtn: "bg-orange-600 hover:bg-orange-700 shadow-orange-100",
                    ring: "ring-orange-100"
                };
            case "success":
                return {
                    icon: <CheckCircle size={24} />,
                    iconBg: "bg-green-50 border-green-100",
                    iconColor: "text-green-600",
                    confirmBtn: "bg-green-600 hover:bg-green-700 shadow-green-100",
                    ring: "ring-green-100"
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            ></div>

            <div className="bg-white rounded-3xl w-full max-w-md relative shadow-2xl shadow-slate-900/30 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl ${styles.iconBg} border flex items-center justify-center ${styles.iconColor}`}>
                            {styles.icon}
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                        disabled={loading}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    <p className="text-slate-600 leading-relaxed">{message}</p>
                </div>

                {/* Actions */}
                <div className="px-8 pb-8 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        disabled={loading}
                        className={`flex-1 px-6 py-3 rounded-xl ${styles.confirmBtn} text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Processing...
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
