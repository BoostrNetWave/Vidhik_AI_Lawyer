import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import logo from '../assets/logo.jpeg';
import { Button } from '../Components/ui/button';
import { Input } from '../Components/ui/input';
import { Label } from '../Components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../Components/ui/card';
import api from '../lib/api';

const Signup: React.FC = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const validateForm = () => {
        if (!fullName.trim()) {
            setError('Full name is required');
            return false;
        }
        if (fullName.trim().length < 2) {
            setError('Full name must be at least 2 characters');
            return false;
        }
        if (!email.trim()) {
            setError('Email is required');
            return false;
        }
        if (!email.includes('@') || !email.includes('.')) {
            setError('Please enter a valid email address');
            return false;
        }
        if (!password.trim()) {
            setError('Password is required');
            return false;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return false;
        }
        
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setError('');
        setLoading(true);
        setSuccess(false);

        try {
            const response = await api.post('/auth/register', { 
                email: email.trim(), 
                fullName: fullName.trim(), 
                password: password.trim() 
            });
            
            if (response.data && response.data.token) {
                const { token, user } = response.data;
                login(token, user);
                setSuccess(true);
                
                setTimeout(() => {
                    navigate('/', { replace: true });
                }, 1500);
            }
            
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-secondary/30 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="shadow-xl border-0">
                    <CardHeader className="space-y-1 text-center pb-6">
                        <div className="flex justify-center mb-4">
                            <div className="bg-white p-2 rounded-2xl shadow-xl shadow-primary/10 border border-slate-100 h-20 w-20 overflow-hidden">
                                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold text-gray-900">
                            Create Account
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                            Join the legal admin portal
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3 text-red-700 text-sm">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}
                            
                            {success && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3 text-green-700 text-sm">
                                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                                    <p>Account created successfully! Redirecting to dashboard...</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                                    Full Name
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="fullName"
                                        name="fullName"
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="pl-10 border-gray-300 focus:border-primary focus:ring-primary"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                    Email address
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 border-gray-300 focus:border-primary focus:ring-primary"
                                        placeholder="admin@legal.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 border-gray-300 focus:border-primary focus:ring-primary"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                            >
                                {loading ? 'Creating account...' : 'Create Account'}
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="pt-6">
                        <div className="text-center w-full">
                            <Link
                                to="/login"
                                className="font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                Already have an account? Sign in
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

export default Signup;
