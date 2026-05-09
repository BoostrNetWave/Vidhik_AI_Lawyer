import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

interface User {
    id: string;
    userId: string;
    email: string;
    fullName: string;
    role: string;
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
            const savedToken = localStorage.getItem('lawyer_token');
            const savedUser = localStorage.getItem('lawyer_user');

            if (savedToken && savedUser) {
                try {
                    // Verify token with backend
                    const response = await api.get('/auth/me');
                    if (response.data && response.data.user) {
                        setToken(savedToken);
                        setUser(JSON.parse(savedUser));
                    } else {
                        throw new Error('Invalid token response');
                    }
                } catch (err) {
                    console.error('Token verification failed:', err);
                    localStorage.removeItem('lawyer_token');
                    localStorage.removeItem('lawyer_user');
                    setToken(null);
                    setUser(null);
                }
            }
            setLoading(false);
        };

        verifyToken();
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('lawyer_token', newToken);
        localStorage.setItem('lawyer_user', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('lawyer_token');
        localStorage.removeItem('lawyer_user');
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
