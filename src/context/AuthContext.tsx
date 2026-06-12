import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

interface User {
    id: string;
    userId: string;
    email: string;
    fullName: string;
    role: string;
    subscription?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyToken = async () => {
            try {
                const savedToken = localStorage.getItem('lawyer_auth_token') || localStorage.getItem('vidhik_auth_token');
                const savedUser = localStorage.getItem('lawyer_profile_data') || localStorage.getItem('vidhik_user_data');

                if (savedToken && savedUser) {
                    try {
                        // Verify token with backend
                        const response = await api.get('/auth/me');
                        if (response.data && response.data.user) {
                            setToken(savedToken);
                            setUser(response.data.user);
                            localStorage.setItem('lawyer_profile_data', JSON.stringify(response.data.user));
                        } else {
                            throw new Error('Invalid token response');
                        }
                    } catch (err: any) {
                        console.error('Token verification failed:', err);
                        console.log('Error details:', err.response?.data || err.message);
                        
                        // Force logout on 401, but allow 404 or other errors to proceed with saved user data
                        if (err.response?.status === 401) {
                            localStorage.removeItem('lawyer_auth_token');
                            localStorage.removeItem('lawyer_profile_data');
                            localStorage.removeItem('vidhik_auth_token');
                            localStorage.removeItem('vidhik_user_data');
                            setToken(null);
                            setUser(null);
                        } else {
                            // For other errors (like 404 or timeout), still attempt to use saved data
                            try {
                                setToken(savedToken);
                                setUser(JSON.parse(savedUser));
                            } catch (e) {
                                console.error('Failed to parse saved user data:', e);
                            }
                        }
                    }
                }
            } catch (outerErr) {
                console.error('Critical Auth error:', outerErr);
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('lawyer_auth_token', newToken);
        localStorage.setItem('lawyer_profile_data', JSON.stringify(newUser));
        localStorage.setItem('vidhik_auth_token', newToken);
        localStorage.setItem('vidhik_user_data', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('lawyer_auth_token');
        localStorage.removeItem('lawyer_profile_data');
        localStorage.removeItem('vidhik_auth_token');
        localStorage.removeItem('vidhik_user_data');
        window.location.href = '/lawyer/login';
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
