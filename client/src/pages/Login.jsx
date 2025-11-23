import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Scissors, Heart, Sparkles, Eye, EyeOff, Loader } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const url = import.meta.env.VITE_API_URL;

  // Form validation
  const validateForm = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!password) {
      setError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${url}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Ensure we have the required data structure
      if (!data.token || !data.user) {
        throw new Error('Invalid response from server');
      }

      // Store token separately for API calls
      localStorage.setItem('token', data.token);

      // Dispatch login success with proper data structure
      dispatch(loginSuccess({
        token: data.token,
        user: data.user
      }));

      // Navigate based on user role
      const userRole = data.user.role;
      switch (userRole) {
        case 'admin':
          navigate('/admin');
          break;
        case 'manager':
          navigate('/manager');
          break;
        case 'user':
          navigate('/user');
          break;
        default:
          navigate('/unauthorized');
      }

    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-50 to-purple-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating paw prints */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-8 h-8 text-orange-200/30 animate-bounce" style={{ animationDelay: '0s' }}>
          🐾
        </div>
        <div className="absolute top-40 right-32 w-6 h-6 text-pink-200/40 animate-bounce" style={{ animationDelay: '2s' }}>
          🐾
        </div>
        <div className="absolute bottom-32 left-1/4 w-7 h-7 text-purple-200/30 animate-bounce" style={{ animationDelay: '1s' }}>
          🐾
        </div>
        <div className="absolute bottom-20 right-20 w-5 h-5 text-orange-200/40 animate-bounce" style={{ animationDelay: '3s' }}>
          🐾
        </div>
      </div>

      <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-orange-100 overflow-hidden">
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400"></div>

        {/* Header with grooming theme */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full mb-4 shadow-lg">
            <Scissors className="w-8 h-8 text-white" />
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-300" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Petpalooza Grooming
          </h1>
          <p className="text-gray-600">Welcome back to your grooming studio</p>
          <div className="flex justify-center items-center mt-2 space-x-2">
            <Heart className="w-4 h-4 text-pink-400 fill-current" />
            <span className="text-sm text-gray-500">Making pets beautiful since 2020</span>
            <Heart className="w-4 h-4 text-pink-400 fill-current" />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center">
              <div className="w-4 h-4 text-red-500 mr-2 mb-1.5">⚠️</div>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email input */}
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-orange-400 group-focus-within:text-orange-500 transition-colors" />
              </div>
              <input
                type="email"
                placeholder="your@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-300 hover:border-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-orange-400 group-focus-within:text-orange-500 transition-colors" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-300 hover:border-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-orange-500 transition-colors disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-400 to-pink-400 text-white font-semibold py-4 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-200 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span className="relative z-10 flex items-center justify-center space-x-2">
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Scissors className="w-5 h-5" />
                  <span>Start Grooming Session</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </span>
            {!isLoading && (
              <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            )}
          </button>
        </form>

        {/* Demo Credentials (Remove in production) */}
        {/* <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <p className="text-xs text-blue-800 font-medium mb-2">Demo Credentials:</p>
          <div className="text-xs text-blue-700 space-y-1">
            <div>Admin: admin@petshop.com / password123</div>
            <div>Manager: manager@petshop.com / password123</div>
            <div>User: user@petshop.com / password123</div>
          </div>
        </div> */}

        {/* Bottom pet icons */}
        <div className="flex justify-center space-x-4 mt-6 text-2xl opacity-60">
          <span className="animate-pulse">🐶</span>
          <span className="animate-pulse" style={{ animationDelay: '0.5s' }}>🐱</span>
          <span className="animate-pulse" style={{ animationDelay: '1s' }}>🐰</span>
          <span className="animate-pulse" style={{ animationDelay: '1.5s' }}>🐹</span>
        </div>

        {/* Decorative corner elements */}
        <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full opacity-20 blur-sm"></div>
        <div className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full opacity-20 blur-sm"></div>
      </div>
    </div>
  );
};

export default Login;