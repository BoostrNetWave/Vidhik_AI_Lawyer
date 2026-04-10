import React, { useState } from "react";
import { Save, Bell, Shield, Globe, Mail, Phone, MapPin, Loader2, Eye, EyeOff } from "lucide-react";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

interface GeneralSettings {
    siteName: string;
    supportEmail: string;
    contactPhone: string;
    address: string;
}

interface NotificationSettings {
    newBooking: boolean;
    paymentSuccess: boolean;
    systemUpdates: boolean;
    marketingEmails: boolean;
}

export default function SettingsPage() {
    const { success, error, info } = useToast();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<"general" | "notifications" | "security">("general");
    const [saving, setSaving] = useState<boolean>(false);

    // Form States
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
        siteName: "Vidhik AI",
        supportEmail: "support@vidhik.ai",
        contactPhone: "+91 98765 43210",
        address: "Legal Tower, MG Road, Bangalore, India",
    });

    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        newBooking: true,
        paymentSuccess: true,
        systemUpdates: false,
        marketingEmails: false,
    });

    const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

    const userId = user?.userId;

    // Fetch data on mount
    React.useEffect(() => {
        if (!userId) return;

        const fetchSettings = async () => {
            try {
                const res = await api.get(`/settings/${userId}`);
                if (res.data) {
                    if (res.data.general) setGeneralSettings(res.data.general);
                    if (res.data.notifications) setNotificationSettings(res.data.notifications);
                }
            } catch (err) {
                console.error("Failed to fetch settings:", err);
                error("Failed to load settings.");
            }
        };
        fetchSettings();
    }, [userId]);


    const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setGeneralSettings({ ...generalSettings, [e.target.name]: e.target.value });
    };

    const handleToggle = (key: keyof NotificationSettings) => {
        setNotificationSettings({ ...notificationSettings, [key]: !notificationSettings[key] });
        saveNotifications({ ...notificationSettings, [key]: !notificationSettings[key] });
    };

    const saveNotifications = async (updatedNotifs: NotificationSettings) => {
        try {
            await api.put(`/settings/${userId}`, {
                general: generalSettings,
                notifications: updatedNotifs,
                userId
            });
            info("Notification settings updated");
        } catch (err) {
            console.error("Failed to save notifications:", err);
            error("Failed to update notification settings");
        }
    };

    const handlePasswordUpdate = async () => {
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            error("Please fill in all password fields");
            return;
        }
        if (passwords.new !== passwords.confirm) {
            error("New passwords do not match");
            return;
        }
        if (passwords.new.length < 6) {
            error("Password must be at least 6 characters");
            return;
        }

        setSaving(true);
        try {
            await api.post('/profile/password', {
                userId,
                currentPassword: passwords.current,
                newPassword: passwords.new
            });
            success("Password updated successfully!");
            setPasswords({ current: "", new: "", confirm: "" });
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.message || "Failed to update password");
        } finally {
            setSaving(false);
        }
    };

    const saveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/settings/${userId}`, {
                general: generalSettings,
                notifications: notificationSettings,
                userId
            });
            success("Settings updated successfully!");
        } catch (err) {
            console.error(err);
            error("Failed to update settings");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-screen font-sans">
            <header className="px-8 py-6 border-b bg-white sticky top-0 z-20 shadow-sm backdrop-blur-md bg-white/90">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Admin Settings</h1>
                <p className="text-slate-500 text-sm mt-1 font-medium">Configure global platform parameters and preferences</p>
            </header>

            <main className="flex-1 p-8 animate-in fade-in duration-500">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Settings Tabs */}
                    <div className="bg-slate-100 p-1.5 rounded-xl inline-flex w-auto border border-slate-200/50 shadow-inner">
                        <button
                            onClick={() => setActiveTab("general")}
                            className={`px-6 py-2 rounded-lg transition-all text-sm font-bold flex items-center ${activeTab === "general" ? "bg-white text-primary shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <Globe className="w-4 h-4 mr-2" />
                            General
                        </button>
                        <button
                            onClick={() => setActiveTab("notifications")}
                            className={`px-6 py-2 rounded-lg transition-all text-sm font-bold flex items-center ${activeTab === "notifications" ? "bg-white text-primary shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <Bell className="w-4 h-4 mr-2" />
                            Notifications
                        </button>
                        <button
                            onClick={() => setActiveTab("security")}
                            className={`px-6 py-2 rounded-lg transition-all text-sm font-bold flex items-center ${activeTab === "security" ? "bg-white text-primary shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Security
                        </button>
                    </div>

                    {/* General Settings */}
                    <div className={`${activeTab === "general" ? "block" : "hidden"} space-y-6`}>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-900">Platform Information</h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">Basic details for the Vidhik AI admin panel.</p>
                            </div>
                            <form onSubmit={saveSettings} className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Site Title</label>
                                        <div className="relative">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                name="siteName"
                                                value={generalSettings.siteName}
                                                onChange={handleGeneralChange}
                                                className="w-full rounded-xl border border-slate-100 bg-slate-50/50 pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Support Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                name="supportEmail"
                                                value={generalSettings.supportEmail}
                                                onChange={handleGeneralChange}
                                                className="w-full rounded-xl border border-slate-100 bg-slate-50/50 pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Contact Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                name="contactPhone"
                                                value={generalSettings.contactPhone}
                                                onChange={handleGeneralChange}
                                                className="w-full rounded-xl border border-slate-100 bg-slate-50/50 pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Office Address</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                name="address"
                                                value={generalSettings.address}
                                                onChange={handleGeneralChange}
                                                className="w-full rounded-xl border border-slate-100 bg-slate-50/50 pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-sans"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="bg-primary hover:bg-primary/90 text-white text-sm font-bold py-3 px-10 rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Notifications Settings */}
                    <div className={`${activeTab === "notifications" ? "block" : "hidden"} space-y-6`}>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-900">Email Notifications</h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">Control which events trigger automated emails.</p>
                            </div>
                            <div className="p-6 divide-y divide-slate-50">
                                <div className="py-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-900">New Booking Alerts</p>
                                        <p className="text-xs text-slate-500">Receive an email whenever a client books a session.</p>
                                    </div>
                                    <button
                                        onClick={() => handleToggle("newBooking")}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${notificationSettings.newBooking ? "bg-primary" : "bg-slate-200"}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationSettings.newBooking ? "left-7" : "left-1"}`}></span>
                                    </button>
                                </div>
                                <div className="py-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-900">Payment Confirmations</p>
                                        <p className="text-xs text-slate-500">Get notified for every successful transaction.</p>
                                    </div>
                                    <button
                                        onClick={() => handleToggle("paymentSuccess")}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${notificationSettings.paymentSuccess ? "bg-primary" : "bg-slate-200"}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationSettings.paymentSuccess ? "left-7" : "left-1"}`}></span>
                                    </button>
                                </div>
                                <div className="py-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-900">System Updates</p>
                                        <p className="text-xs text-slate-500">Emails about maintenance and platform news.</p>
                                    </div>
                                    <button
                                        onClick={() => handleToggle("systemUpdates")}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${notificationSettings.systemUpdates ? "bg-primary" : "bg-slate-200"}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationSettings.systemUpdates ? "left-7" : "left-1"}`}></span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Settings */}
                    <div className={`${activeTab === "security" ? "block" : "hidden"} space-y-6`}>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-900">Account Security</h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">Manage your administrator password and access.</p>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Current Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.current ? "text" : "password"}
                                                value={passwords.current}
                                                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                                className="w-full rounded-xl border border-slate-100 bg-slate-50/50 pl-4 pr-10 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-sans"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                            >
                                                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPasswords.new ? "text" : "password"}
                                                    value={passwords.new}
                                                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                                    className="w-full rounded-xl border border-slate-100 bg-slate-50/50 pl-4 pr-10 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-sans"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                                >
                                                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Confirm New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPasswords.confirm ? "text" : "password"}
                                                    value={passwords.confirm}
                                                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                                    className="w-full rounded-xl border border-slate-100 bg-slate-50/50 pl-4 pr-10 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-sans"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                                >
                                                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={handlePasswordUpdate}
                                        disabled={saving}
                                        className="bg-slate-900 hover:bg-black text-white text-sm font-bold py-3 px-10 rounded-xl transition-all shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50 flex items-center"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Update Password"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
