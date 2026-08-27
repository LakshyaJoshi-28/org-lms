import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import {
  Building2,
  Plus,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Edit3,
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Building,
  Mail,
  Lock,
  User,
  FileText,
  Hash,
  X,
  Layers,
  Activity,
  ArrowUpRight
} from 'lucide-react';

export const SuperAdminDashboard = () => {
  const { addToast } = useNotification();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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
    const targetPage = typeof pageNum === 'number' && !isNaN(pageNum) ? pageNum : page;
    const targetSearch = typeof searchVal === 'string' ? searchVal : searchTerm;
    setLoading(true);
    try {
      const res = await api.get(
        `/super-admin/organizations?page=${targetPage}&limit=${limit}&search=${encodeURIComponent(targetSearch)}`
      );
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
      setOrganizations((prev) =>
        prev.map((o) => (o.id === orgId || o._id === orgId ? { ...o, status: newStatus } : o))
      );
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

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.code.toLowerCase().includes(searchTerm.toLowerCase());
    const orgStatus = String(org.status || 'ACTIVE').toUpperCase();
    if (statusFilter === 'ACTIVE') return matchesSearch && orgStatus === 'ACTIVE';
    if (statusFilter === 'INACTIVE') return matchesSearch && orgStatus === 'INACTIVE';
    return matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in p-2 sm:p-6 max-w-7xl mx-auto">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-900/10 via-slate-900/5 to-indigo-900/10 dark:from-slate-900/90 dark:via-blue-950/40 dark:to-slate-900/90 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-4 h-4" />
              <span>Super Admin Management Suite</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-heading">
              Platform Governance Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Provision multi-tenant client organizations, manage administrative roles, monitor global system utilization, and govern access across the IT360 LMS platform.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Provision New Organization</span>
            </button>
          </div>
        </div>
      </div>

      {/* Platform Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Total Organizations */}
        <div className="rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 p-6 transition-all hover:shadow-xl hover:border-blue-500/30 flex items-center justify-between group bg-white/70 dark:bg-slate-900/70">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>Total Organizations</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {platformStats.totalOrganizations || totalOrgs || organizations.length}
              </h3>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                Tenants
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Provisioned LMS enterprise tenants
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Active Organizations */}
        <div className="rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 p-6 transition-all hover:shadow-xl hover:border-emerald-500/30 flex items-center justify-between group bg-white/70 dark:bg-slate-900/70">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>Active Organizations</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {platformStats.activeOrganizations}
              </h3>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Operational
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Currently active and operational orgs
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total Platform Users */}
        <div className="rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 p-6 transition-all hover:shadow-xl hover:border-indigo-500/30 flex items-center justify-between group bg-white/70 dark:bg-slate-900/70">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>Total Platform Users</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {platformStats.totalPlatformUsers}
              </h3>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                Global
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Registered users across all tenants
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Organizations Directory & Control Panel */}
      <div className="rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-lg overflow-hidden space-y-4">
        {/* Controls Toolbar */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search organization by name or code..."
                className="w-full pl-10 pr-9 py-2 rounded-xl glass-input text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filter Toggle */}
            <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800/70 p-1 border border-slate-300/50 dark:border-slate-700/50 text-xs font-bold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold hidden lg:inline">
              Showing <span className="text-slate-900 dark:text-white font-bold">{filteredOrgs.length}</span> orgs
            </span>

            <button
              onClick={() => fetchOrganizations()}
              className="py-2 px-3.5 rounded-xl glass-input text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center space-x-2 transition-all cursor-pointer border border-slate-200 dark:border-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Organizations Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="text-[11px] uppercase bg-slate-100/70 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Organization Name</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Members</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Fetching organization directory...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        No Organizations Found
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                        No tenant organizations match your current search query or filter criteria.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const isActive = String(org.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
                  const orgId = org.id || org._id;

                  return (
                    <tr
                      key={orgId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Organization Name & Details */}
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                            {org.name ? org.name.substring(0, 2).toUpperCase() : 'OG'}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                              {org.name}
                            </div>
                            <div className="text-xs font-normal text-slate-500 dark:text-slate-400 line-clamp-1">
                              {org.description || 'Enterprise Tenant'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider">
                          {org.code}
                        </span>
                      </td>

                      {/* Users Count */}
                      <td className="px-6 py-4 font-bold text-xs text-slate-700 dark:text-slate-300">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                          <Users className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                          <span>{org.userCount || 0} members</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                            INACTIVE
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {new Date(org.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(org)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center"
                          title="Edit Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(org)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center border ${
                            isActive
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Footer */}
        {totalPages > 0 && (
          <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Showing page <span className="font-bold text-slate-900 dark:text-white">{page}</span> of{' '}
              <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span> ({totalOrgs} total organizations)
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => fetchOrganizations(page - 1)}
                className="py-1.5 px-3 rounded-xl glass-input text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition-all cursor-pointer border border-slate-200 dark:border-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {page} / {totalPages}
              </div>

              <button
                disabled={page >= totalPages || loading}
                onClick={() => fetchOrganizations(page + 1)}
                className="py-1.5 px-3 rounded-xl glass-input text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition-all cursor-pointer border border-slate-200 dark:border-slate-800"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PROVISION NEW ORGANIZATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm p-4 sm:p-6 flex justify-center items-start pt-8 sm:pt-14 animate-fade-in">
          <div className="relative glass-panel bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl my-4 space-y-6 max-h-[85vh] overflow-y-auto z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Provision New Organization
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Create client tenant and assign initial Organization Admin.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <Building className="w-4 h-4" />
                  <span>1. Organization Information</span>
                </div>

                {/* Org Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Organization Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      required
                      placeholder="Acme Corporation"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Code & Description Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Org Code (Optional)
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={createForm.code}
                        onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                        placeholder="ACME-101"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Description
                    </label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={createForm.description}
                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                        placeholder="IT & Managed Services"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <User className="w-4 h-4" />
                  <span>2. Initial Organization Admin Credentials</span>
                </div>

                {/* Admin Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Org Admin Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={createForm.adminName}
                      onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                      required
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Admin Email & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Admin Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        value={createForm.adminEmail}
                        onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                        required
                        placeholder="admin@acme.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Admin Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        value={createForm.adminPassword}
                        onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                        required
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/25 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Provisioning...' : 'Provision Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ORGANIZATION DETAILS MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm p-4 sm:p-6 flex justify-center items-start pt-8 sm:pt-14 animate-fade-in">
          <div className="relative glass-panel bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg my-4 space-y-6 max-h-[85vh] overflow-y-auto z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Edit Organization Details
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update tenant profile information and unique code.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Organization Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Organization Code *
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg cursor-pointer disabled:opacity-50 transition-all"
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
