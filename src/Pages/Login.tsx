import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, Eye, EyeOff, Shield, Sparkles } from 'lucide-react';
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
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-secondary/30 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
                    <CardHeader className="space-y-6 text-center pb-8">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-xl shadow-primary/10 border border-slate-100 overflow-hidden p-2">
                            <img src={logo} alt="VidhikAI Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
                                Welcome back
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                                Sign in to your Vidhik AI account
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="mx-auto bg-secondary text-primary border-primary/10">
                            <Shield className="mr-1 h-3 w-3" />
                            Secure Authentication
                        </Badge>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700 text-sm">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    Email address
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 h-11"
                                    placeholder="Enter your email"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-gray-400" />
                                    Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 h-11 pr-12"
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md p-1"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember"
                                        name="remember"
                                        type="checkbox"
                                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                    />
                                    <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                                        Remember me
                                    </label>
                                </div>
                                <button
                                    type="button"
                                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Signing in...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4" />
                                        Sign in
                                    </div>
                                )}
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="pt-8">
                        <div className="text-center space-y-4">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">or</span>
                                </div>
                            </div>
                            
                            <p className="text-sm text-gray-600">
                                Don't have an account?{" "}
                                <Link
                                    to="/signup"
                                    className="font-medium text-primary hover:text-primary/80 transition-all duration-200 inline-flex items-center gap-1 hover:gap-2 group"
                                >
                                    Create a new account
                                    <span className="transform transition-transform duration-200 group-hover:translate-x-1">→</span>
                                </Link>
                            </p>
                            
                            <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-2">
                                <span>Secure login</span>
                                <span>•</span>
                                <span>Encrypted data</span>
                                <span>•</span>
                                <span>Privacy first</span>
                            </div>
                        </div>
                    </CardFooter>
                </Card>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-500">
                        © 2024 Vidhik AI. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
