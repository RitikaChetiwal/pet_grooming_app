import React from 'react';
import { Shield, ArrowLeft, Home, Lock, AlertTriangle } from 'lucide-react';

const NotAuthorized = () => {
  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    // Navigate to home page
    console.log('Navigate to home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-50 to-purple-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-orange-200 rounded-full opacity-20 blur-xl animate-pulse"></div>
        <div className="absolute top-1/3 right-10 w-32 h-32 bg-pink-200 rounded-full opacity-20 blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-purple-200 rounded-full opacity-20 blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        
        {/* Floating paw prints */}
        <div className="absolute top-20 right-1/4 text-4xl text-orange-200/30 animate-bounce" style={{animationDelay: '0s'}}>🐾</div>
        <div className="absolute bottom-40 right-20 text-3xl text-pink-200/40 animate-bounce" style={{animationDelay: '1.5s'}}>🐾</div>
        <div className="absolute top-1/2 left-20 text-3xl text-purple-200/30 animate-bounce" style={{animationDelay: '3s'}}>🐾</div>
      </div>

      <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg text-center border border-orange-100 overflow-hidden">
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400"></div>
        
        {/* Main icon and alert */}
        <div className="mb-8">
          <div className="relative inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full mb-6 border-4 border-orange-200">
            <Shield className="w-12 h-12 text-orange-500" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
          </div>
          
          <div className="space-y-2 mb-6">
            <h1 className="text-4xl font-bold text-gray-800 flex items-center justify-center gap-2">
              <span>🚫</span>
              <span>Oops!</span>
            </h1>
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
              Access Denied
            </h2>
          </div>
        </div>

        {/* Message section */}
        <div className="mb-8 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
            <div className="flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-orange-500 mr-2" />
              <span className="font-semibold text-orange-800">Restricted Area</span>
            </div>
            <p className="text-gray-700 leading-relaxed">
              You don't have permission to access this grooming station. This area might be restricted to senior groomers or administrators only.
            </p>
          </div>
          
          <div className="text-gray-600">
            <p className="mb-2">🐕 Don't worry, even the best groomers need proper clearance!</p>
            <p className="text-sm">Contact your salon manager if you believe this is an error.</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleGoBack}
              className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Go Back</span>
            </button>
            
            <button
              onClick={handleGoHome}
              className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-400 to-pink-400 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-200"
            >
              <Home className="w-5 h-5" />
              <span>Go Home</span>
            </button>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">Need help? Contact support:</p>
            <div className="flex justify-center space-x-6 text-sm">
              <a href="mailto:support@pawspa.com" className="text-orange-600 hover:text-orange-700 font-medium transition-colors">
                📧 Email Support
              </a>
              <a href="tel:+1234567890" className="text-pink-600 hover:text-pink-700 font-medium transition-colors">
                📞 Call Help
              </a>
            </div>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="flex justify-center items-center space-x-3 text-2xl">
            <span className="animate-pulse">🐶</span>
            <span className="text-gray-400">•</span>
            <span className="animate-pulse" style={{animationDelay: '0.5s'}}>😿</span>
            <span className="text-gray-400">•</span>
            <span className="animate-pulse" style={{animationDelay: '1s'}}>🔒</span>
            <span className="text-gray-400">•</span>
            <span className="animate-pulse" style={{animationDelay: '1.5s'}}>🐱</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Even pets respect boundaries! 🐾</p>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-6 right-6 w-12 h-12 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full opacity-30 blur-sm"></div>
        <div className="absolute bottom-6 left-6 w-8 h-8 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full opacity-30 blur-sm"></div>
      </div>
    </div>
  );
};

export default NotAuthorized;