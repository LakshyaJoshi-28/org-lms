import React, { useEffect, useState } from 'react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../context/NotificationContext';
import { Building2, Plus, Edit2, Trash2, Briefcase, Check, X, Tag } from 'lucide-react';

export const Departments = () => {
  const { addToast } = useNotification();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [jobRoles, setJobRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchDepts = async () => {
    try {
      setLoading(true);
      const res = await getDepartments();
      setDepartments(res.data.data.departments || []);
    } catch (err) {
      addToast('error', 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setName('');
    setDescription('');
    setJobRoles([]);
    setRoleInput('');
    setShowModal(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setJobRoles(dept.jobRoles || []);
    setRoleInput('');
    setShowModal(true);
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    if (roleInput.trim() && !jobRoles.includes(roleInput.trim())) {
      setJobRoles([...jobRoles, roleInput.trim()]);
      setRoleInput('');
    }
  };

  const handleRoleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRole(e);
    }
  };

  const handleRemoveRole = (roleToRemove) => {
    setJobRoles(jobRoles.filter(r => r !== roleToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('error', 'Department name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (editingDept) {
        const targetId = editingDept._id || editingDept.id;
        const res = await updateDepartment(targetId, { name: name.trim(), description: description.trim(), jobRoles });
        const updated = res.data?.data?.department;
        if (updated) {
          setDepartments(prev => prev.map(d => (d._id === targetId || d.id === targetId) ? updated : d));
        } else {
          fetchDepts();
        }
        addToast('success', 'Department updated successfully');
      } else {
        const res = await createDepartment({ name: name.trim(), description: description.trim(), jobRoles });
        const created = res.data?.data?.department;
        if (created) {
          setDepartments(prev => [...prev, created]);
        } else {
          fetchDepts();
        }
        addToast('success', 'Department created successfully');
      }
      setShowModal(false);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this department?')) return;
    try {
      await deleteDepartment(id);
      setDepartments(prev => prev.filter(d => d._id !== id && d.id !== id));
      addToast('success', 'Department deactivated');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to deactivate department');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Departments & Job Roles</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define organizational departments and job roles for automated training assignment.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Department
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading departments..." />
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Departments Created"
          description="Create your first department to organize employees and map job roles."
          action={
            <button onClick={openCreateModal} className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white">
              Create Department
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {departments.map((d) => (
            <div key={d._id} className="p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 space-y-4 relative flex flex-col justify-between transition-all hover:shadow-lg">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{d.name}</h3>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(d)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Department"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(d._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      title="Deactivate Department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {d.description || 'No department description provided.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                  <Briefcase className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                  Mapped Job Roles ({d.jobRoles?.length || 0}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(!d.jobRoles || d.jobRoles.length === 0) ? (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">No job roles mapped yet.</span>
                  ) : (
                    d.jobRoles.map((role) => (
                      <span key={role} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-[11px] font-medium text-slate-700 dark:text-slate-200">
                        {role}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingDept ? 'Edit Department Details' : 'Create New Department'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Engineering, Human Resources, Finance"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of department scope and responsibilities..."
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mapped Job Roles
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={handleRoleKeyDown}
                placeholder="e.g. Frontend Engineer, Full Stack Developer"
                className="flex-1 px-4 py-2.5 rounded-xl glass-input text-sm"
              />
              <button
                type="button"
                onClick={handleAddRole}
                className="px-4 py-2.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold transition-colors cursor-pointer"
              >
                Add Role
              </button>
            </div>

            <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 min-h-[52px]">
              {jobRoles.length === 0 ? (
                <span className="text-xs text-slate-400 dark:text-slate-500 italic p-1">No job roles added yet. Type a role above and click 'Add Role'.</span>
              ) : (
                jobRoles.map((role) => (
                  <span key={role} className="inline-flex items-center px-3 py-1 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                    <Tag className="w-3 h-3 mr-1 text-indigo-500" />
                    {role}
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role)}
                      className="ml-2 text-indigo-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Remove Role"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 transition-all inline-flex items-center cursor-pointer"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {submitting ? 'Saving Department...' : editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
