import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock, Mail, AlertCircle, Eye, EyeOff, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function AdminLogin() {
  // Step: 'credentials' or 'verify'
  const [step, setStep] = useState('credentials');
  
  // Credentials step
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // 2FA step
  const [userId, setUserId] = useState(null);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Common
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const codeInputRefs = useRef([]);

  // Redirect if already logged in
  if (user) {
    navigate('/admin');
    return null;
  }

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle code input
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1); // Only keep last digit
    setVerificationCode(newCode);
    
    // Auto-focus next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace in code input
  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste in code input
  const handleCodePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      setVerificationCode(pastedData.split(''));
      codeInputRefs.current[5]?.focus();
    }
  };

  // Step 1: Submit credentials
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      if (data.requiresTwoFactor) {
        // 2FA required - move to verification step
        setUserId(data.userId);
        setStep('verify');
        setMessage(data.message || 'Verification code sent to your email');
        setResendCooldown(30);
      } else if (data.token) {
        // Direct login (2FA disabled)
        await login(email, password);
        navigate('/admin');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 2FA code
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }
      
      if (data.token) {
        // Save token and redirect
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/admin'; // Full refresh to update auth state
      }
    } catch (err) {
      setError(err.message || 'Invalid verification code');
      setVerificationCode(['', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/resend-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }
      
      setMessage('New verification code sent to your email');
      setResendCooldown(data.waitSeconds || 30);
      setVerificationCode(['', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Go back to credentials step
  const handleBackToCredentials = () => {
    setStep('credentials');
    setVerificationCode(['', '', '', '', '', '']);
    setError('');
    setMessage('');
    setUserId(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-500/5 rounded-full blur-[100px]" />
      </div>
      
      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 mb-4 shadow-lg shadow-orange-500/30">
            {step === 'credentials' ? <Crown size={32} className="text-white" /> : <Shield size={32} className="text-white" />}
          </div>
          <h1 className="text-3xl font-bold text-white">
            {step === 'credentials' ? 'Admin Panel' : 'Verify Your Identity'}
          </h1>
          <p className="text-gray-400 mt-2">
            {step === 'credentials' 
              ? 'Sign in to manage your deals' 
              : `Enter the code sent to ${email}`
            }
          </p>
        </div>
        
        {/* Credentials Form */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700">
            {error && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="your@email.com" 
                    required 
                    className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Enter your password" 
                    required 
                    className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/25"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock size={18} />
                    Sign In
                  </>
                )}
              </button>
            </div>
          </form>
        )}
        
        {/* 2FA Verification Form */}
        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700">
            {error && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            
            {message && (
              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-6">
                <Shield size={18} />
                <span>{message}</span>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Code Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4 text-center">
                  Enter 6-digit verification code
                </label>
                <div className="flex gap-2 justify-center" onPaste={handleCodePaste}>
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => codeInputRefs.current[index] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      className="w-12 h-14 bg-gray-900 border border-gray-700 text-white text-center text-2xl font-bold rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
              </div>
              
              {/* Verify Button */}
              <button 
                type="submit" 
                disabled={loading || verificationCode.join('').length !== 6} 
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/25"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Shield size={18} />
                    Verify & Sign In
                  </>
                )}
              </button>
              
              {/* Resend Code */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  className="text-gray-400 hover:text-orange-400 transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  {resendCooldown > 0 
                    ? `Resend code in ${resendCooldown}s` 
                    : 'Resend verification code'
                  }
                </button>
              </div>
              
              {/* Back Button */}
              <button
                type="button"
                onClick={handleBackToCredentials}
                className="w-full text-gray-400 hover:text-white transition-colors py-2"
              >
                ← Back to login
              </button>
            </div>
          </form>
        )}
        
        <p className="text-center text-gray-500 text-sm mt-6">
          <a href="/" className="hover:text-orange-400 transition-colors">← Back to homepage</a>
        </p>
      </div>
    </div>
  );
}
