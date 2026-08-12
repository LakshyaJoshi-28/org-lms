import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { getDepartments, updateOrgProfile } from '../../services/api';
import { Building2, Briefcase, Sparkles, Check } from 'lucide-react';

export const ProfileCompleteModal = ({ isOpen, onClose }) => {
  const { refreshUser } = useAuth();
  const { addToast } = useNotification();

  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [availableJobRoles, setAvailableJobRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getDepartments().then(res => {
        setDepartments(res.data.data.departments || []);
      }).catch(console.error);
    }
  }, [isOpen]);

  const handleDeptChange = (e) => {
    const dId = e.target.value;
    setDepartmentId(dId);
    setJobRole('');
    const selected = departments.find(d => d._id === dId);
    setAvailableJobRoles(selected ? selected.jobRoles || [] : []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!departmentId || !jobRole) {
      addToast('error', 'Please select both Department and Job Role');
      return;
    }

    setSubmitting(true);
    try {
      await updateOrgProfile({ departmentId, jobRole });
      await refreshUser();
      addToast('success', 'Profile completed! Mandatory & role-based courses have been assigned to your dashboard.');
      onClose();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to complete profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Complete Employee Profile Setup" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
          <div className="flex items-center space-x-2 font-bold text-indigo-300 text-sm">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Welcome to IT360 LMS!</span>
          </div>
          <p className="text-slate-300">
            Select your assigned Department and Job Role. This automatically dispatches your mandatory compliance and role-specific training courses.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Department</label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <select
                value={departmentId}
                onChange={handleDeptChange}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
              >
                <option value="">Choose Department</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id} className="bg-slate-900 text-white">{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Job Role</label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <select
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                required
                disabled={!departmentId}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
              >
                <option value="">Choose Job Role</option>
                {availableJobRoles.map(r => (
                  <option key={r} value={r} className="bg-slate-900 text-white">{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {submitting ? 'Setting Up...' : 'Complete Profile & Dispatch Courses'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
