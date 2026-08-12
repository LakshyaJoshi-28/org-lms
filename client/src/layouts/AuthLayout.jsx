import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ToastContainer } from '../components/common/Toast';
import { ShieldCheck, Award, Layers, Users, CheckCircle } from 'lucide-react';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans text-slate-100 overflow-x-hidden">
      <ToastContainer />

      {/* Left Column: IT360 LMS Enterprise Branding & Value Highlights */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-hidden">
        {/* Subtle Background Glow Spheres */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-500/30">
              360
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                IT360 <span className="text-indigo-400 font-semibold text-base">LMS</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Enterprise Platform</p>
            </div>
          </Link>
        </div>

        {/* Center Content / SaaS Value Proposition */}
        <div className="relative z-10 my-12 lg:my-0 space-y-8 max-w-lg">
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300">
            <Award className="w-4 h-4 mr-2 text-indigo-400" />
            Next-Gen Organizational Upskilling
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Empower Your Workforce with Smart Learning & Compliance
          </h1>

          <p className="text-slate-400 text-sm leading-relaxed">
            IT360 LMS delivers automated training assignments, interactive video courses, MCQ quizzes, GitHub project evaluations, and real-time department analytics for modern enterprises.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
                <Layers className="w-4 h-4" />
                <span>Automated Assignment</span>
              </div>
              <p className="text-xs text-slate-400">Department & Job-Role based automated course dispatching.</p>
            </div>

            <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
              <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Compliance & Deadlines</span>
              </div>
              <p className="text-xs text-slate-400">Smart reminders, overdue tracking, and instructor controls.</p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span className="flex items-center"><CheckCircle className="w-4 h-4 text-emerald-400 mr-1.5" /> 100% Role-Based</span>
            <span className="flex items-center"><CheckCircle className="w-4 h-4 text-emerald-400 mr-1.5" /> Cloudinary Powered</span>
            <span className="flex items-center"><CheckCircle className="w-4 h-4 text-emerald-400 mr-1.5" /> Security Audited</span>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-500">
          © 2026 IT360 Enterprise Learning Management System. All rights reserved.
        </div>
      </div>

      {/* Right Column: Dynamic Auth Form Container */}
      <div className="lg:w-1/2 p-6 sm:p-12 flex items-center justify-center bg-slate-950">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
