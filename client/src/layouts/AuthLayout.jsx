import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ToastContainer } from '../components/common/Toast';
import { ShieldCheck, Layers, GraduationCap } from 'lucide-react';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans text-slate-100 overflow-x-hidden animate-fade-in">
      <ToastContainer />

      {/* Left Column: IT360 LMS Enterprise Branding & Value Highlights */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-hidden">
        {/* Subtle Background Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Branding */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-2xl tracking-tight text-white">
              IT360 <span className="text-blue-500 font-bold">LMS</span>
            </span>
          </Link>
        </div>

        {/* Center Content / Enterprise Value Proposition */}
        <div className="relative z-10 my-12 lg:my-0 space-y-8 max-w-xl">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.15] tracking-tight">
              Empower Your Workforce with Smart Learning & Compliance
            </h1>

            <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
              IT360 LMS delivers automated training assignments, interactive video courses, knowledge assessments, project evaluations, and real-time department analytics for modern enterprises.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 space-y-2 shadow-sm hover:border-slate-700 transition-all">
              <div className="flex items-center space-x-2.5 text-blue-400 font-bold text-sm">
                <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Layers className="w-4 h-4 text-blue-400" />
                </div>
                <span>Automated Assignment</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Department & job-role based automated course dispatching and enrollment workflows.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 space-y-2 shadow-sm hover:border-slate-700 transition-all">
              <div className="flex items-center space-x-2.5 text-indigo-400 font-bold text-sm">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                </div>
                <span>Compliance & Deadlines</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Smart automated reminders, deadline extension controls, and audit logs.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Tagline Replacement */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80">
          <p className="text-xs font-semibold text-slate-400 leading-relaxed tracking-wide">
            “Empowering organizations to build skills, improve performance, and stay compliant.”
          </p>
        </div>
      </div>

      {/* Right Column: Dynamic Auth Form Container */}
      <div className="lg:w-1/2 p-6 sm:p-12 lg:p-16 flex items-center justify-center bg-slate-950">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
