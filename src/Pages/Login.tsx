import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, Eye, EyeOff, Shield, Sparkles, Scale, Star, ShieldCheck, Check } from 'lucide-react';
import logo from '../assets/logo.jpeg';
import { Button } from '../Components/ui/button';
import { Input } from '../Components/ui/input';
import { Label } from '../Components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../Components/ui/card';
import { Badge } from '../Components/ui/badge';
import api from '../lib/api';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Login form submitted');
        setError('');
        setLoading(true);

        // Basic validation
        if (!email.trim()) {
            setError('Email is required');
            setLoading(false);
            return;
        }
        if (!password.trim()) {
            setError('Password is required');
            setLoading(false);
            return;
        }

        try {
            const response = await api.post('/auth/login', { 
                email: email.trim(), 
                password: password.trim() 
            });
            
            if (response.data && response.data.token) {
                const { token, user } = response.data;
                login(token, user);
                
                setTimeout(() => {
                    navigate(from, { replace: true });
                }, 100);
            }
            
        } catch (err: any) {
            console.error('Login error:', err);
            
            // Check if account is not verified
            if (err.response?.status === 403 && err.response?.data?.isVerified === false) {
                const unverifiedEmail = err.response.data.email || email.trim();
                localStorage.setItem('pending_verification_email', unverifiedEmail);
                navigate('/verify-otp', { 
                    state: { email: unverifiedEmail },
                    replace: true 
                });
                return;
            }
            
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full font-sans bg-slate-50">
            {/* Left - Branding Panel */}
            <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#020617] relative overflow-hidden items-center justify-center p-12 select-none">
                {/* Decorative glows */}
                <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-violet-500/10 to-transparent blur-3xl pointer-events-none" />
                <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
                <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-[100px] pointer-events-none" />
                
                {/* Dots grid pattern */}
                <div 
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                        backgroundSize: '24px 24px'
                    }}
                />

                <div className="relative z-10 text-white max-w-md">
                    <div className="inline-flex items-center gap-3 mb-10">
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center overflow-hidden p-1 shadow-md">
                            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-display text-2xl font-bold tracking-tight text-white">Vidhik <span className="text-violet-400">AI</span></span>
                    </div>
                    
                    <h2 className="font-display text-4xl font-extrabold mb-6 leading-tight">
                        Advanced Practice Space for Lawyers
                    </h2>
                    <p className="text-slate-300/85 text-sm leading-relaxed mb-10">
                        Manage consultations, review documents, research precedents, and collaborate efficiently in a secure environment built for the modern legal professional.
                    </p>
                    
                    {/* Features checklist */}
                    <div className="space-y-4 mb-10 bg-white/[0.02] backdrop-blur-md rounded-2xl p-6 border border-white/[0.06] shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                                <Check className="h-3 w-3" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-white">AI Case Law Analyzer</h4>
                                <p className="text-xs text-slate-400 leading-normal">Parse filings and identify precedents in minutes.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                                <Check className="h-3 w-3" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-white">Automated Booking Calendar</h4>
                                <p className="text-xs text-slate-400 leading-normal">Sync consultations and track billable meetings.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                                <Check className="h-3 w-3" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-white">Encrypted Portal</h4>
                                <p className="text-xs text-slate-400 leading-normal">Client communication protected by enterprise-grade security.</p>
                            </div>
                        </div>
                    </div>

                    {/* Trust badges */}
                    <div className="flex items-center gap-6 mt-10 text-slate-400/80 text-xs">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            <span>SOC 2 Compliant</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            <span>HIPAA Ready</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right - Form Container */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 bg-[#FAFAFC] relative overflow-hidden">
                {/* Decorative glows on the right panel */}
                <div className="absolute top-0 right-0 -z-10 w-[300px] h-[300px] rounded-full bg-violet-200/30 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -z-10 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
                
                {/* Dots grid pattern for Right Panel */}
                <div 
                    className="absolute inset-0 opacity-[0.015] pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, #7C3AED 1px, transparent 0)`,
                        backgroundSize: '20px 20px'
                    }}
                />

                <div className="w-full max-w-md">
                    {/* Small Logo for mobile view */}
                    <div className="text-center mb-8 lg:hidden">
                        <div className="inline-flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center overflow-hidden p-0.5 border border-slate-100 shadow-sm">
                                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="font-display text-xl font-bold tracking-tight text-slate-900">
                                Vidhik <span className="text-violet-600">AI</span>
                            </span>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-md border border-slate-100 shadow-[0_20px_50px_-12px_rgba(124,58,237,0.08)] rounded-2xl p-8 sm:p-10 w-full relative">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display flex items-center justify-center gap-2">
                                Welcome Back
                            </h2>
                            <p className="mt-2.5 text-sm text-slate-500">
                                Sign in to access your lawyer admin workspace.
                            </p>
                        </div>

                        <form className="space-y-5" onSubmit={handleSubmit}>
                            {error && (
                                <div className="bg-rose-50 border border-rose-100 rounded-lg p-3.5 flex items-start gap-2.5 text-rose-700 text-sm animate-shake">
                                    <AlertCircle className="h-4.5 w-4.5 mt-0.5 flex-shrink-0 text-rose-500" />
                                    <p className="leading-normal font-medium">{error}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    Email address
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 transition-all rounded-lg"
                                        placeholder="Enter your email address"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 h-11 bg-slate-50/50 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 transition-all rounded-lg"
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none flex items-center justify-center"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember"
                                        name="remember"
                                        type="checkbox"
                                        className="h-4.5 w-4.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                    />
                                    <label htmlFor="remember" className="ml-2 text-xs font-semibold text-slate-500 cursor-pointer select-none">
                                        Remember me
                                    </label>
                                </div>
                                <button
                                    type="button"
                                    className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold h-11 rounded-lg flex items-center justify-center transition-all duration-300 shadow-[0_10px_20px_-5px_rgba(124,58,237,0.3)] hover:shadow-[0_15px_25px_-5px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Signing in...
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Sparkles className="h-4 w-4" />
                                        Sign In
                                    </div>
                                )}
                            </Button>
                        </form>

                        <div className="mt-8 text-center text-sm text-slate-500 border-t border-slate-100 pt-6">
                            <p>
                                Don't have an account?{" "}
                                <Link
                                    to="/signup"
                                    className="font-semibold text-violet-600 hover:text-violet-700 transition-colors inline-flex items-center gap-0.5 group"
                                >
                                    Create lawyer account
                                    <span className="transform transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
