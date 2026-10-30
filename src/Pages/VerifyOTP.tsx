import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, RefreshCw, AlertCircle, Loader2, ArrowLeft, Star } from 'lucide-react';
import { Button } from '../Components/ui/button';
import { Input } from '../Components/ui/input';
import { Label } from '../Components/ui/label';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const VerifyOTP: React.FC = () => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [timer, setTimer] = useState(60);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const email = location.state?.email || localStorage.getItem('pending_verification_email') || '';

    useEffect(() => {
        if (!email) {
            navigate('/signup');
        }
    }, [email, navigate]);

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/verify-otp', { email, otp: otp.trim() });
            const { token, user } = response.data;
            
            // Clean up
            localStorage.removeItem('pending_verification_email');
            
            // Login user
            login(token, user);
            
            // Redirect to dashboard
            navigate('/', { replace: true });
        } catch (err: any) {
            console.error('OTP verification error:', err);
            setError(err.response?.data?.message || 'Verification failed. Please check the code and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0 || resending) return;

        setError('');
        setResending(true);

        try {
            await api.post('/auth/resend-otp', { email });
            setTimer(60);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to resend verification code');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full font-sans bg-zinc-50">
            {/* Left - Branding Panel */}
            <div className="hidden lg:flex lg:w-5/12 bg-zinc-950 relative overflow-hidden items-center justify-center p-12 select-none border-r border-zinc-800/80">
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
                    <Link to="/" className="inline-flex items-center mb-10 transition-transform duration-300 hover:scale-105 bg-white px-4 py-2 rounded-2xl shadow-sm border border-white/20">
                        <img src={logo} alt="Vidhik AI" className="h-8 w-auto object-contain" />
                    </Link>
                    
                    <h2 className="font-display text-4xl font-extrabold mb-6 leading-tight">
                        Security First Practice Space
                    </h2>
                    <p className="text-slate-300/85 text-sm leading-relaxed mb-10">
                        We authenticate all advocate credentials with rigorous verification standards to safeguard case confidentiality and uphold professional ethics.
                    </p>
                    
                    {/* Premium Card Testimonial */}
                    <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-2xl p-6 border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                        <div className="flex gap-1 mb-4">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                            ))}
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed mb-4 italic">
                            "The platform's verification protocol gives us absolute confidence that all sensitive briefs remain strictly confidential."
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
                        <Link to="/" className="inline-flex items-center">
                            <img src={logo} alt="Vidhik AI" className="h-9 w-auto object-contain" />
                        </Link>
                    </div>

                    <div className="bg-white/60 backdrop-blur-3xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-3xl p-8 sm:p-10 w-full relative">
                        <div className="text-center mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mx-auto mb-4 shadow-md">
                                <ShieldCheck className="w-7 h-7" />
                            </div>
                            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 font-display">
                                Verify Email
                            </h2>
                            <p className="mt-2.5 text-sm text-slate-500 leading-relaxed">
                                Enter the 6-digit verification code sent to
                            </p>
                            <p className="font-bold text-zinc-900 text-sm mt-0.5 break-all">
                                {email}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-5 bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-rose-700 text-xs font-semibold animate-in fade-in">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <p className="leading-normal">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center block">
                                    6-Digit Verification Code
                                </Label>
                                <Input 
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="123456" 
                                    autoComplete="one-time-code" 
                                    maxLength={6}
                                    className="h-14 text-center tracking-[0.4em] font-mono text-2xl font-bold bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900/10 focus-visible:ring-zinc-900/10 focus-visible:border-zinc-900 transition-all rounded-xl"
                                    required
                                />
                            </div>

                            <Button 
                                type="submit" 
                                disabled={loading || otp.length !== 6} 
                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold h-11 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying Code...
                                    </>
                                ) : (
                                    <span>Verify & Continue</span>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-5 text-xs text-slate-500">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resending || timer > 0}
                                className="font-semibold text-zinc-900 hover:text-zinc-600 transition-colors inline-flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                                {timer > 0 ? `Resend code in ${timer}s` : 'Resend code'}
                            </button>

                            <Link to="/login" className="font-semibold text-zinc-900 hover:text-zinc-600 transition-colors inline-flex items-center gap-1">
                                <ArrowLeft className="w-3.5 h-3.5" /> Back to login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyOTP;
