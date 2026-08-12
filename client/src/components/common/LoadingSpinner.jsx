import React from 'react';

export const LoadingSpinner = ({ size = 'md', text = 'Loading IT360 LMS...' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className={`${sizeClasses[size]} border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin`} />
      {text && <p className="text-sm text-slate-400 font-medium tracking-wide animate-pulse">{text}</p>}
    </div>
  );
};

export const FullScreenLoader = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="inline-flex items-center space-x-3 text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/25">
          IT
        </div>
        <span>IT360 LMS</span>
      </div>
      <LoadingSpinner size="lg" text="Authenticating enterprise portal..." />
    </div>
  </div>
);
