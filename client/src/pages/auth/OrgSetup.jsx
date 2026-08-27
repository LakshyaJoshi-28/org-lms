import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Building, User, Mail, Lock, Shield, ArrowRight } from 'lucide-react';

export const OrgSetup = () => {
  const { setupOrganization } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setupOrganization({ orgName, orgCode, adminName, adminEmail, adminPassword });
      addToast('success', 'Organization and Admin setup completed successfully!');
      navigate('/admin');
    } catch (err) {
      addToast('error', err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 animate-fade-in">
      <div className="space-y-2">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-300">
          <Shield className="w-3.5 h-3.5 mr-1.5" /> Initial Organization Setup
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Create Organization</h2>
        <p className="text-xs text-slate-400">
          Initialize your Organization LMS workspace and initial Organization Admin account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Organization Name</label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                placeholder="Acme Corporation"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Org Code </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                placeholder="ACME100"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm uppercase tracking-widest font-mono"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800">
          <p className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">Initial Organization Admin</p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Admin Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                  placeholder="System Administrator"
                  className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Admin Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  placeholder="admin@company.com"
                  className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Admin Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center space-x-2"
        >
          {loading ? (
            <span>Setting up Organization...</span>
          ) : (
            <>
              <span>Initialize Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-slate-800/80 text-center text-xs">
        <p className="text-slate-400">
          Already set up?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
};
