import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, Scale, Star, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '../Components/ui/button';
import { Input } from '../Components/ui/input';
import { Label } from '../Components/ui/label';
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
        setError('');
        setLoading(true);

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
        <div className="flex min-h-screen w-full font-sans bg-zinc-50">
            {/* Left - Branding Panel */}
            <div className="hidden lg:flex lg:w-5/12 bg-zinc-950 relative overflow-hidden items-center justify-center p-12 select-none">
                {/* Decorative glows */}
                <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-zinc-800/20 to-transparent blur-3xl pointer-events-none" />
                <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-zinc-800/30 blur-[100px] pointer-events-none" />
                <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full bg-zinc-800/30 blur-[100px] pointer-events-none" />
                
                {/* Dots grid pattern */}
                <div 
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                        backgroundSize: '24px 24px'
                    }}
                />

                <div className="relative z-10 text-white max-w-md">
                    <Link to="/" className="inline-flex items-center gap-2 mb-10 transition-transform duration-300 hover:scale-105">
                        <Scale className="h-8 w-8 text-zinc-300" />
                        <span className="font-display text-2xl font-bold tracking-tight">Vidhik <span className="text-zinc-400">AI</span></span>
                    </Link>
                    
                    <h2 className="font-display text-4xl font-extrabold mb-6 leading-tight">
                        Advanced Practice Space for Lawyers
                    </h2>
                    <p className="text-slate-300/85 text-sm leading-relaxed mb-10">
                        Manage consultations, review documents, research precedents, and collaborate efficiently in a secure environment built for the modern legal professional.
                    </p>
                    
                    {/* Premium Card Testimonial */}
                    <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-2xl p-6 border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                        <div className="flex gap-1 mb-4">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                            ))}
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed mb-4 italic">
                            "Vidhik AI has completely transformed our approach to legal research. The document automation is incredibly accurate and fast."
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold shadow-md">
                                RK
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Rajesh Kumar</p>
                                <p className="text-xs text-slate-400">Corporate Legal Advisor</p>
                            </div>
                        </div>
                    </div>

                    {/* Security Badge */}
                    <div className="flex items-center gap-6 mt-10 text-slate-400/80 text-xs">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            <span>AES-256 Bit Encrypted</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            <span>ISO 27001 Certified</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right - Form Container */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 bg-zinc-50 relative overflow-hidden">
                {/* Dots grid pattern for Right Panel */}
                <div 
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, #18181b 1px, transparent 0)`,
                        backgroundSize: '20px 20px'
                    }}
                />

                <div className="w-full max-w-md relative z-10">
                    {/* Small Logo for mobile view */}
                    <div className="text-center mb-8 lg:hidden">
                        <Link to="/" className="inline-flex items-center gap-2">
                            <Scale className="h-7 w-7 text-primary" />
                            <span className="font-display text-xl font-bold tracking-tight text-slate-900">
                                Vidhik <span className="text-primary">AI</span>
                            </span>
                        </Link>
                    </div>

                    <div className="bg-white/60 backdrop-blur-3xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-3xl p-8 sm:p-10 w-full relative">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 font-display">
                                Welcome Back
                            </h2>
                            <p className="mt-2.5 text-sm text-slate-500">
                                Sign in to access your lawyer admin workspace.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-secondary border border-border rounded-lg p-3.5 flex items-start gap-2.5 text-primary text-sm">
                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <p className="leading-normal font-medium">{error}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                                    <Input 
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@company.com" 
                                        autoComplete="email" 
                                        className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900/10 focus-visible:ring-zinc-900/10 focus-visible:border-zinc-900 transition-all rounded-lg"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className="pl-10 pr-10 h-11 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900/10 focus-visible:ring-zinc-900/10 focus-visible:border-zinc-900 transition-all rounded-lg"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">
                                            {showPassword ? "Hide password" : "Show password"}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="checkbox" 
                                        id="remember" 
                                        className="rounded border-slate-300 text-zinc-900 focus:ring-zinc-900"
                                    />
                                    <Label htmlFor="remember" className="text-xs font-semibold text-slate-500 cursor-pointer select-none">
                                        Remember me
                                    </Label>
                                </div>
                                <Link
                                    to="/forgot-password"
                                    className="text-xs font-semibold text-zinc-900 hover:text-zinc-600 transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={loading} 
                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold h-11 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <span>Sign in</span>
                                )}
                            </Button>
                        </form>

                        <div className="mt-8 text-center text-sm text-zinc-500 border-t border-zinc-100 pt-6">
                            Don't have an account?{" "}
                            <Link to="/signup" className="font-semibold text-zinc-900 hover:text-zinc-600 transition-colors">
                                Sign up
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
