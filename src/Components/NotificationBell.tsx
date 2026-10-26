import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Bell, 
    Briefcase, 
    Video, 
    Calendar, 
    LifeBuoy, 
    ShieldCheck, 
    Clock, 
    ExternalLink, 
    CheckCheck,
    X,
    Loader2
} from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

export interface INotification {
    _id: string;
    userId: string;
    userRole: string;
    title: string;
    message: string;
    type: 'case' | 'consultation' | 'credit' | 'support' | 'system';
    link?: string;
    metadata?: Record<string, any>;
    read: boolean;
    createdAt: string;
}

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<INotification[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { success } = useToast();

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.get('/notifications');
            if (res.data?.success && Array.isArray(res.data.notifications)) {
                setNotifications(res.data.notifications);
            }
        } catch (err) {
            console.warn('[NotificationBell] Could not load alerts:', err);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        // Live polling every 20 seconds for updates
        const interval = setInterval(fetchNotifications, 20000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Handle outside click to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleNotificationClick = async (notif: INotification) => {
        // Optimistically mark as read
        if (!notif.read) {
            setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
            api.patch(`/notifications/${notif._id}/read`).catch(console.error);
        }

        setIsOpen(false);

        if (notif.link) {
            navigate(notif.link);
        } else if (notif.type === 'case') {
            navigate('/cases');
        } else if (notif.type === 'consultation') {
            navigate('/consultations');
        } else if (notif.type === 'support') {
            navigate('/support');
        }
    };

    const handleMarkAllRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            await api.post('/notifications/mark-all-read');
            success('All notifications marked as read');
        } catch (err) {
            console.error(err);
        }
    };

    const getIconInfo = (type: string) => {
        switch (type) {
            case 'case':
                return {
                    icon: Briefcase,
                    color: 'text-indigo-600',
                    bgColor: 'bg-indigo-50 border-indigo-200'
                };
            case 'consultation':
                return {
                    icon: Video,
                    color: 'text-violet-600',
                    bgColor: 'bg-violet-50 border-violet-200'
                };
            case 'support':
                return {
                    icon: LifeBuoy,
                    color: 'text-sky-600',
                    bgColor: 'bg-sky-50 border-sky-200'
                };
            default:
                return {
                    icon: ShieldCheck,
                    color: 'text-emerald-600',
                    bgColor: 'bg-emerald-50 border-emerald-200'
                };
        }
    };

    const formatRelativeTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMin = Math.floor(diffMs / (1000 * 60));
            const diffHour = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHour / 24);

            if (diffMin < 1) return 'Just now';
            if (diffMin < 60) return `${diffMin}m ago`;
            if (diffHour < 24) return `${diffHour}h ago`;
            if (diffDay < 7) return `${diffDay}d ago`;
            return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            {/* Bell Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`relative h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                    isOpen 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Notifications"
                aria-label="View notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in-50">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-150">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm tracking-tight">Lawyer Notifications</span>
                            {unreadCount > 0 && (
                                <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-primary font-bold hover:underline cursor-pointer transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification items */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                            <div className="py-10 px-4 text-center space-y-2">
                                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-700">All caught up!</p>
                                <p className="text-[11px] text-slate-400">No pending alerts for your cases or consultation sessions.</p>
                            </div>
                        ) : (
                            notifications.slice(0, 8).map((item) => {
                                const { icon: ItemIcon, color, bgColor } = getIconInfo(item.type);
                                return (
                                    <div
                                        key={item._id}
                                        onClick={() => handleNotificationClick(item)}
                                        className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                                            !item.read ? 'bg-primary/[0.035] hover:bg-primary/[0.07]' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${bgColor}`}>
                                            <ItemIcon className={`h-4 w-4 ${color}`} />
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-1">
                                                <p className={`text-xs truncate ${!item.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                    {item.title}
                                                </p>
                                                {!item.read && (
                                                    <span className="h-1.5 w-1.5 bg-primary rounded-full shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                                {item.message}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-0.5 font-medium">
                                                <Clock className="w-3 h-3" />
                                                <span>{formatRelativeTime(item.createdAt)}</span>
                                                <span className="text-primary font-bold ml-auto flex items-center gap-0.5">
                                                    View <ExternalLink className="w-2.5 h-2.5" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs px-4">
                        <span className="text-[11px] text-slate-400 font-medium">
                            Live sync active
                        </span>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                navigate('/cases');
                            }}
                            className="text-xs font-bold text-primary hover:underline"
                        >
                            View Case Alerts →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
