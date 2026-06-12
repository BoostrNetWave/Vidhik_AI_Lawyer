import React, { useState, useEffect } from "react";
import { Zap, Check, Loader2, Briefcase, FileText, Percent, RefreshCw, AlertCircle } from "lucide-react";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

interface PlanLimit {
    activeCases: number;
    blogsPerWeek: number;
    commissionPercent: number;
}

interface Plan {
    name: string;
    priceMonthly: number | string;
    priceYearly: number | string;
    desc: string;
    features: string[];
    gradient: string;
    popular?: boolean;
    iconName?: string;
    limits: PlanLimit;
}

interface SubscriptionStats {
    subscription: string;
    plans: Plan[];
    usage: {
        activeCases: number;
        blogsThisWeek: number;
    };
    limits: PlanLimit;
}

export default function SubscriptionPage() {
    const { success, error, info } = useToast();
    const { user, login } = useAuth();
    const [stats, setStats] = useState<SubscriptionStats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);

    const fetchSubscriptionData = async () => {
        try {
            setLoading(true);
            const response = await api.get("/dashboard/subscription");
            if (response.data && response.data.success) {
                setStats(response.data.data);
            }
        } catch (err: any) {
            console.error("Failed to fetch subscription stats:", err);
            error("Failed to load subscription details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscriptionData();
    }, []);

    const handleUpgrade = async (planName: string) => {
        if (!user) return;
        try {
            setUpdatingPlan(planName);
            const response = await api.put(`/profile/${user.userId}`, {
                subscription: planName
            });
            
            if (response.data) {
                success(`Successfully upgraded to the ${planName} plan!`);
                
                // Update the AuthContext and localStorage
                const updatedUser = { ...user, subscription: planName };
                // Retrieve the auth token to pass to login
                const token = localStorage.getItem('lawyer_auth_token') || localStorage.getItem('vidhik_auth_token') || '';
                login(token, updatedUser);

                // Re-fetch stats
                await fetchSubscriptionData();
            }
        } catch (err: any) {
            console.error("Failed to upgrade plan:", err);
            error(err.response?.data?.message || "Failed to upgrade subscription plan.");
        } finally {
            setUpdatingPlan(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-slate-500 font-semibold">Loading subscription plans & quotas...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center min-h-[50vh] gap-3">
                <AlertCircle className="h-12 w-12 text-slate-400" />
                <h3 className="font-bold text-lg text-slate-800">No subscription data found</h3>
                <p className="text-sm text-slate-500 max-w-sm">There was an issue loading the subscription data from the central database.</p>
                <button onClick={fetchSubscriptionData} className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md">
                    <RefreshCw className="h-3 w-3" /> Retry Sync
                </button>
            </div>
        );
    }

    const { subscription, plans, usage, limits } = stats;

    return (
        <div className="flex flex-col flex-1 min-h-screen font-sans">
            <header className="px-8 py-6 border-b bg-white sticky top-0 z-20 shadow-sm backdrop-blur-md bg-white/90 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display flex items-center gap-2">
                        <Zap className="h-6 w-6 text-primary" />
                        Chamber Quotas & Subscription
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Configure active plan limits, blog postings, and payout commissions</p>
                </div>
                <button 
                    onClick={fetchSubscriptionData}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Sync Plan
                </button>
            </header>

            <main className="flex-1 p-8 animate-in fade-in duration-500 space-y-10">
                {/* Current Plan Overview Card & Progress Gauges */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                        <div className="space-y-1">
                            <span className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[10px] font-bold tracking-widest uppercase inline-block">
                                Active Chamber Plan
                            </span>
                            <h2 className="text-3xl font-black text-slate-900 capitalize mt-2">{subscription} Plan</h2>
                            <p className="text-sm text-slate-500">Monitor your active resource caps and platform rates below.</p>
                        </div>
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-150 text-xs font-bold uppercase tracking-wider">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Active & Vetted
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
                        {/* 1. Case Capacity */}
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
                                    <Briefcase className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active Case Capacity</p>
                                    <p className="text-lg font-bold text-slate-800 mt-0.5">
                                        {usage.activeCases} / {limits.activeCases >= 999999 ? "∞" : limits.activeCases} Cases
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className={`h-2 rounded-full transition-all duration-500 ${
                                            limits.activeCases >= 999999 ? "w-0 bg-purple-600" :
                                            (usage.activeCases / limits.activeCases >= 0.8) ? "bg-red-500" : "bg-purple-600"
                                        }`}
                                        style={{ width: `${limits.activeCases >= 999999 ? 100 : Math.min((usage.activeCases / limits.activeCases) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold block text-right">
                                    {limits.activeCases >= 999999 ? "Unlimited capacity" : `${limits.activeCases - usage.activeCases} slots remaining`}
                                </span>
                            </div>
                        </div>

                        {/* 2. Blog Posts */}
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Weekly Blog Posts</p>
                                    <p className="text-lg font-bold text-slate-800 mt-0.5">
                                        {usage.blogsThisWeek} / {limits.blogsPerWeek >= 999999 ? "∞" : limits.blogsPerWeek} Articles
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className={`h-2 rounded-full transition-all duration-500 ${
                                            limits.blogsPerWeek >= 999999 ? "w-0 bg-blue-600" :
                                            (usage.blogsThisWeek / limits.blogsPerWeek >= 0.8) ? "bg-red-500" : "bg-blue-600"
                                        }`}
                                        style={{ width: `${limits.blogsPerWeek >= 999999 ? 100 : Math.min((usage.blogsThisWeek / limits.blogsPerWeek) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold block text-right">
                                    {limits.blogsPerWeek >= 999999 ? "Unlimited postings" : `${Math.max(limits.blogsPerWeek - usage.blogsThisWeek, 0)} posts remaining this week`}
                                </span>
                            </div>
                        </div>

                        {/* 3. Commission */}
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                                    <Percent className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Platform Commission</p>
                                    <p className="text-lg font-bold text-slate-800 mt-0.5">
                                        {limits.commissionPercent}% Per Booking
                                    </p>
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-400 leading-normal font-medium">
                                The platform service charge deducted from consultation payouts. Higher plans receive lower commission rates.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription Tiers Selection */}
                <div className="space-y-6">
                    <div className="text-left">
                        <h3 className="text-xl font-bold text-slate-900">Choose a Plan</h3>
                        <p className="text-sm text-slate-500">Select the plan that fits your practice scale. Upgrades take effect immediately.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {plans.map((plan) => {
                            const isCurrent = plan.name.toLowerCase() === subscription.toLowerCase();
                            const isEnterprise = plan.name.toLowerCase() === 'enterprise';
                            
                            // Pricing Text
                            const priceMonthly = typeof plan.priceMonthly === 'number' 
                                ? `₹${plan.priceMonthly.toLocaleString()}`
                                : plan.priceMonthly;
                                
                            return (
                                <div 
                                    key={plan.name}
                                    className={`bg-white rounded-2xl border ${
                                        isCurrent ? "border-primary shadow-lg ring-1 ring-primary/20 scale-[1.01]" : "border-slate-200"
                                    } overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-300 relative`}
                                >
                                    {plan.popular && (
                                        <span className="absolute top-3 right-3 bg-primary text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-widest shadow-sm">
                                            Popular
                                        </span>
                                    )}
                                    
                                    <div className="p-6 space-y-6">
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-lg text-slate-900 capitalize">{plan.name}</h4>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-slate-900">{priceMonthly}</span>
                                                {typeof plan.priceMonthly === 'number' && (
                                                    <span className="text-xs font-semibold text-slate-400">/mo</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed min-h-[32px]">{plan.desc}</p>
                                        </div>

                                        <ul className="space-y-2 pt-2 border-t border-slate-100">
                                            {plan.features.map((feature: string, fIdx: number) => (
                                                <li key={fIdx} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                                                    <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="p-6 pt-0">
                                        <button
                                            disabled={isCurrent || updatingPlan !== null}
                                            onClick={() => {
                                                if (isEnterprise) {
                                                    info("Please contact support at support@vidhik.ai to set up an Enterprise membership.");
                                                } else {
                                                    handleUpgrade(plan.name);
                                                }
                                            }}
                                            className={`w-full py-3 rounded-xl text-xs font-bold transition-all ${
                                                isCurrent 
                                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" 
                                                    : "bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow active:scale-[0.98]"
                                            } flex items-center justify-center`}
                                        >
                                            {updatingPlan === plan.name ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                            ) : isCurrent ? (
                                                "Current Active Plan"
                                            ) : isEnterprise ? (
                                                "Contact Sales"
                                            ) : (
                                                `Upgrade to ${plan.name}`
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
