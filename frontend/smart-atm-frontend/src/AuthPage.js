import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

const AuthPage = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const API_BASE = 'http://localhost:5000/api';

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Validation
        if (!email || !password) {
            setMessage({ type: 'error', text: 'Please fill in all fields' });
            return;
        }

        if (!validateEmail(email)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address' });
            return;
        }

        if (!isLogin) {
            if (password.length < 6) {
                setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
                return;
            }
            if (password !== confirmPassword) {
                setMessage({ type: 'error', text: 'Passwords do not match' });
                return;
            }
        }

        setLoading(true);

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const body = isLogin 
                ? { email, password }
                : { name, email, password };
            
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                if (isLogin) {
                    // Store token and user info
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setMessage({ type: 'success', text: 'Login successful!' });
                    setTimeout(() => onLogin(data.token, data.user), 1000);
                } else {
                    setMessage({
                        type: 'success',
                        text: data.message || 'Registration successful! Your account is pending administrator approval.',
                    });
                    // Clear form
                    setName('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    // Switch to login after 5 seconds
                    setTimeout(() => setIsLogin(true), 5000);
                }
            } else {
                setMessage({ type: 'error', text: data.error || 'An error occurred' });
            }
        } catch (error) {
            console.error('Auth error:', error);
            setMessage({ type: 'error', text: 'Failed to connect to server' });
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (!email || !validateEmail(email)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address' });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage({ type: 'success', text: data.message });
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to resend verification email' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-md w-full">
                {/* Logo/Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Smart ATM System</h1>
                    <p className="text-gray-600 mt-2">Cash Optimization Platform</p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Toggle Tabs */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => {
                                setIsLogin(true);
                                setMessage({ type: '', text: '' });
                            }}
                            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                                isLogin
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => {
                                setIsLogin(false);
                                setMessage({ type: '', text: '' });
                            }}
                            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                                !isLogin
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Message Display */}
                    {message.text && (
                        <div
                            className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
                                message.type === 'success'
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-red-50 text-red-800 border border-red-200'
                            }`}
                        >
                            {message.type === 'success' ? (
                                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            )}
                            <span className="text-sm">{message.text}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name - Only for Registration */}
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Your full name"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password (Register only) */}
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : isLogin ? 'Login' : 'Create Account'}
                        </button>
                    </form>

                    {/* Resend Verification Link */}
                    {isLogin && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={handleResendVerification}
                                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                disabled={loading}
                            >
                                Didn't receive verification email?
                            </button>
                        </div>
                    )}

                    {/* Info Text */}
                    <div className="mt-6 text-center text-sm text-gray-600">
                        {isLogin ? (
                            <p>
                                Don't have an account?{' '}
                                <button
                                    onClick={() => setIsLogin(false)}
                                    className="text-blue-600 font-semibold hover:underline"
                                >
                                    Register here
                                </button>
                            </p>
                        ) : (
                            <p>
                                Already have an account?{' '}
                                <button
                                    onClick={() => setIsLogin(true)}
                                    className="text-blue-600 font-semibold hover:underline"
                                >
                                    Login here
                                </button>
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-sm text-gray-600">
                    <p>Secure access to ATM cash optimization</p>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
