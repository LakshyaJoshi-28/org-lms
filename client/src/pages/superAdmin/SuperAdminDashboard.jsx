import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import {
  Building2,
  Plus,
  Users,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Shield,
  Layers,
  Award,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const SuperAdminDashboard = () => {
  const { addToast } = useNotification();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Server-side pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrgs, setTotalOrgs] = useState(0);

  // Platform-wide aggregate stats
  const [platformStats, setPlatformStats] = useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalPlatformUsers: 0
  });

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    description: '',
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchOrganizations = async (pageNum = page, searchVal = searchTerm) => {
    const targetPage = (typeof pageNum === 'number' && !isNaN(pageNum)) ? pageNum : page;
    const targetSearch = typeof searchVal === 'string' ? searchVal : searchTerm;
    setLoading(true);
    try {
      const res = await api.get(`/super-admin/organizations?page=${targetPage}&limit=${limit}&search=${encodeURIComponent(targetSearch)}`);
      setOrganizations(res.data.data.organizations || []);
      if (res.data.data.pagination) {
        setPage(res.data.data.pagination.page);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotalOrgs(res.data.data.pagination.total);
      }
      if (res.data.data.stats) {
        setPlatformStats(res.data.data.stats);
      }
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations(1, searchTerm);
  }, [searchTerm]);

  // Lock background body scroll when any modal is open
  useEffect(() => {
    if (showCreateModal || showEditModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCreateModal, showEditModal]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/super-admin/organizations', createForm);
      addToast('success', 'Organization and initial Org Admin created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        code: '',
        description: '',
        adminName: '',
        adminEmail: '',
        adminPassword: ''
      });
      fetchOrganizations();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrg) return;
    setSubmitting(true);
    try {
      await api.put(`/super-admin/organizations/${selectedOrg.id}`, editForm);
      addToast('success', 'Organization updated successfully!');
      setShowEditModal(false);
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to update organization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (org) => {
    const orgId = org.id || org._id;
    const currentStatus = String(org.status || 'ACTIVE').toUpperCase();
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      setOrganizations(prev => prev.map(o => (o.id === orgId || o._id === orgId) ? { ...o, status: newStatus } : o));
      await api.put(`/super-admin/organizations/${orgId}/status`, { status: newStatus });
      addToast('success', `Organization status set to ${newStatus}`);
      fetchOrganizations();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to update organization status');
      fetchOrganizations();
    }
  };

  const openEditModal = (org) => {
    setSelectedOrg(org);
    setEditForm({
      name: org.name || '',
      code: org.code || '',
      description: org.description || ''
    });
    setShowEditModal(true);
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = organizations.reduce((acc, o) => acc + (o.userCount || 0), 0);
  const activeOrgs = organizations.filter(o => o.status === 'ACTIVE').length;

  return (
    <div className="space-y-8 animate-fade-in p-2 sm:p-6">
      {/* Top Header & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <Shield className="w-8 h-8 text-indigo-400" />
            <h1 className="text-3xl font-black text-white tracking-tight">Super Admin Platform Console</h1>
          </div>
          <p className="text-xs text-slate-400">
            Manage multi-tenant organizations, provision initial organization administrators, and monitor platform activity.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Organization</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 flex items-center justify-between hover:border-blue-500/30 transition-all shadow-lg">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Organizations</p>
            <h3 className="text-3xl font-black text-white mt-1">{platformStats.totalOrganizations || totalOrgs || organizations.length}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Across entire LMS platform</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 flex items-center justify-between hover:border-emerald-500/30 transition-all shadow-lg">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Organizations</p>
            <h3 className="text-3xl font-black text-emerald-400 mt-1">{platformStats.activeOrganizations}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Currently operational tenants</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 flex items-center justify-between hover:border-indigo-500/30 transition-all shadow-lg">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Platform Users</p>
            <h3 className="text-3xl font-black text-indigo-400 mt-1">{platformStats.totalPlatformUsers}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Active users across all orgs</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Organization Table Header & Filter */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by organization name or code..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => fetchOrganizations()}
            className="py-2.5 px-4 rounded-xl glass-input text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh List</span>
          </button>
        </div>

        {/* Organizations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 rounded-l-2xl">Organization Name</th>
                <th className="px-6 py-4">Org Code</th>
                <th className="px-6 py-4">Users Count</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right rounded-r-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-500 text-xs">
                    Loading organizations data...
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-500 text-xs">
                    No organizations found matching your search query.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div>{org.name}</div>
                        {org.description && <div className="text-xs font-normal text-slate-400">{org.description}</div>}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-300">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                        {org.code}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-200">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{org.userCount || 0} members</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {String(org.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3.5 h-3.5 mr-1" /> INACTIVE
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(org)}
                        className="p-2 rounded-xl glass-input hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(org)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          String(org.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        {String(org.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Footer */}
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-800/80 gap-4">
            <div className="text-xs text-slate-400 font-medium">
              Showing page <span className="font-bold text-white">{page}</span> of{' '}
              <span className="font-bold text-white">{totalPages}</span> ({totalOrgs} total organizations)
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => fetchOrganizations(page - 1)}
                className="py-2 px-3 rounded-xl glass-input text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-bold text-indigo-400">
                {page} / {totalPages}
              </div>

              <button
                disabled={page >= totalPages || loading}
                onClick={() => fetchOrganizations(page + 1)}
                className="py-2 px-3 rounded-xl glass-input text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition-all cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE ORGANIZATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 flex justify-center items-start pt-8 sm:pt-14 animate-fade-in">
          <div className="relative glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-xl my-4 space-y-6 max-h-[85vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <Building2 className="w-6 h-6 text-indigo-400" />
                <h3 className="text-xl font-black text-white">Create New Organization</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">1. Organization Details</h4>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Organization Name *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                    placeholder="Acme Corporation"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Org Code (Optional)</label>
                    <input
                      type="text"
                      value={createForm.code}
                      onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                      placeholder="ACME-101"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Description</label>
                    <input
                      type="text"
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      placeholder="IT & Technology Services"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    />
                  </div>
                </div>

                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 pt-2">2. Initial Organization Admin Account</h4>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Org Admin Full Name *</label>
                  <input
                    type="text"
                    value={createForm.adminName}
                    onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                    required
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Admin Email Address *</label>
                    <input
                      type="email"
                      value={createForm.adminEmail}
                      onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                      required
                      placeholder="admin@acme.com"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Admin Password *</label>
                    <input
                      type="password"
                      value={createForm.adminPassword}
                      onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating Organization...' : 'Provision Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ORGANIZATION MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 flex justify-center items-start pt-8 sm:pt-14 animate-fade-in">
          <div className="relative glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-lg my-4 space-y-6 max-h-[85vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <Edit2 className="w-6 h-6 text-indigo-400" />
                <h3 className="text-xl font-black text-white">Edit Organization Details</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Organization Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Organization Code</label>
                <input
                  type="text"
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
