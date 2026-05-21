import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../Components/ui/button';
import { Input } from '../Components/ui/input';
import { Label } from '../Components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../Components/ui/card';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.jpeg';

const VerifyOTP: React.FC = () => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [timer, setTimer] = useState(60);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const email = location.state?.email || localStorage.getItem('pending_verification_email');

    useEffect(() => {
        if (!email) {
            navigate('/signup');
        }
    }, [email, navigate]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
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
            const response = await api.post('/auth/verify-otp', { email, otp });
            const { token, user } = response.data;
            
            // Clean up
            localStorage.removeItem('pending_verification_email');
            
            // Login user
            login(token, user);
            
            // Redirect to dashboard
            navigate('/', { replace: true });
        } catch (err: any) {
            console.error('OTP verification error:', err);
            setError(err.response?.data?.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;

        setError('');
        setResending(true);

        try {
            await api.post('/auth/resend-otp', { email });
            setTimer(60);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to resend OTP');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-secondary/30 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="shadow-xl border-0 overflow-hidden">
                    <div className="h-2 bg-primary w-full" />
                    <CardHeader className="space-y-1 text-center pb-6 pt-8">
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-primary/10 rounded-full blur-lg animate-pulse" />
                                <div className="relative bg-white p-2 rounded-2xl shadow-xl shadow-primary/10 border border-slate-100 h-24 w-24 overflow-hidden flex items-center justify-center">
                                    <ShieldCheck className="w-12 h-12 text-primary" />
                                </div>
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold text-gray-900">
                            Verify Email
                        </CardTitle>
                        <CardDescription className="text-gray-600 px-4">
                            We've sent a 6-digit verification code to <span className="font-semibold text-primary">{email}</span>
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3 text-red-700 text-sm animate-shake">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="space-y-4 text-center">
                                <Label htmlFor="otp" className="text-sm font-medium text-gray-700 block">
                                    Enter 6-digit Code
                                </Label>
                                <Input
                                    id="otp"
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="text-center text-3xl tracking-[0.5em] font-bold h-16 border-2 focus:border-primary focus:ring-primary/20 bg-slate-50/50"
                                    autoFocus
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading || otp.length !== 6}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="h-5 w-5 animate-spin" />
                                        <span>Verifying...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-lg">
                                        <span>Verify Account</span>
                                        <ArrowRight className="h-5 w-5" />
                                    </div>
                                )}
                            </Button>
                        </form>

                        <div className="text-center space-y-4">
                            <p className="text-sm text-gray-500">
                                Didn't receive the code?
                            </p>
                            <button
                                onClick={handleResend}
                                disabled={timer > 0 || resending}
                                className={`text-sm font-semibold transition-colors flex items-center justify-center gap-2 mx-auto ${
                                    timer > 0 || resending 
                                    ? 'text-gray-400 cursor-not-allowed' 
                                    : 'text-primary hover:text-primary/80'
                                }`}
                            >
                                {resending ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : timer > 0 ? (
                                    `Resend code in ${timer}s`
                                ) : (
                                    'Resend Verification Code'
                                )}
                            </button>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-slate-50/50 py-6 border-t border-slate-100">
                        <div className="text-center w-full">
                            <Link
                                to="/signup"
                                className="text-sm text-gray-500 hover:text-primary transition-colors flex items-center justify-center gap-1"
                            >
                                <ArrowRight className="h-4 w-4 rotate-180" />
                                Back to Registration
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

export default VerifyOTP;
