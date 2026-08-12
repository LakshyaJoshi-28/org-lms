import React, { useEffect, useState } from 'react';
import { getAuditLogs } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../context/NotificationContext';
import { formatAuditAction, formatTargetEntity, formatAuditDate } from '../../utils/formatters';
import {
  ShieldAlert,
  Search,
  Filter,
  RotateCw,
  PauseCircle,
  PlusCircle,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  Calendar,
  LogIn,
  FileCheck2,
  Zap,
  UserCheck,
  Building2,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';

export const AuditLogs = () => {
  const { addToast } = useNotification();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [actionCategory, setActionCategory] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [targetFilter, setTargetFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await getAuditLogs();
      setLogs(res.data.data.auditLogs || []);
    } catch (err) {
      addToast('error', 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter Logic
  const filteredLogs = logs.filter((log) => {
    const formattedAction = formatAuditAction(log.action).toLowerCase();
    const rawAction = (log.action || '').toLowerCase();
    const details = (log.details || '').toLowerCase();
    const userName = (log.userName || log.userId?.name || '').toLowerCase();
    const userEmail = (log.userId?.email || '').toLowerCase();
    const targetType = (log.targetType || '').toLowerCase();
    const formattedTarget = formatTargetEntity(log.targetType).toLowerCase();
    const searchTerm = search.toLowerCase();

    // 1. Search Query Match
    const matchesSearch =
      !search ||
      formattedAction.includes(searchTerm) ||
      rawAction.includes(searchTerm) ||
      details.includes(searchTerm) ||
      userName.includes(searchTerm) ||
      userEmail.includes(searchTerm) ||
      targetType.includes(searchTerm) ||
      formattedTarget.includes(searchTerm);

    if (!matchesSearch) return false;

    // 2. Action Category Filter
    if (actionCategory !== 'ALL') {
      if (actionCategory === 'CREATE' && !rawAction.includes('CREATE') && !rawAction.includes('REGISTER')) return false;
      if (actionCategory === 'UPDATE' && !rawAction.includes('UPDATE') && !rawAction.includes('EXTEND')) return false;
      if (actionCategory === 'ASSIGN' && !rawAction.includes('ASSIGN')) return false;
      if (actionCategory === 'DEACTIVATE_LOCK' && !rawAction.includes('DEACTIVATE') && !rawAction.includes('LOCK')) return false;
      if (actionCategory === 'REACTIVATE_UNLOCK' && !rawAction.includes('REACTIVATE') && !rawAction.includes('UNLOCK')) return false;
      if (actionCategory === 'REVIEW_SUBMIT' && !rawAction.includes('REVIEW') && !rawAction.includes('SUBMIT')) return false;
      if (actionCategory === 'SECURITY' && !rawAction.includes('LOGIN')) return false;
    }

    // 3. Role Filter
    const userRole = log.userRole || log.userId?.role || '';
    if (roleFilter !== 'ALL' && userRole.toLowerCase() !== roleFilter.toLowerCase()) {
      return false;
    }

    // 4. Target Entity Filter
    if (targetFilter !== 'ALL' && log.targetType !== targetFilter) {
      return false;
    }

    // 5. Date Filter
    if (dateFilter !== 'ALL') {
      const logDate = new Date(log.timestamp || log.createdAt);
      const now = new Date();
      if (dateFilter === 'TODAY') {
        if (logDate.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === '7DAYS') {
        const diffDays = (now - logDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (dateFilter === '30DAYS') {
        const diffDays = (now - logDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      }
    }

    return true;
  });

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, actionCategory, roleFilter, targetFilter, dateFilter]);

  // Pagination Slice
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getActionBadgeProps = (action) => {
    const raw = String(action || '').toUpperCase();
    if (raw.includes('REACTIVATE') || raw.includes('UNLOCK')) {
      return {
        icon: RotateCw,
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      };
    }
    if (raw.includes('DEACTIVATE') || raw.includes('LOCK')) {
      return {
        icon: PauseCircle,
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      };
    }
    if (raw.includes('CREATE') || raw.includes('REGISTER') || raw.includes('SETUP')) {
      return {
        icon: PlusCircle,
        badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
      };
    }
    if (raw.includes('UPDATE') || raw.includes('EXTEND')) {
      return {
        icon: Edit3,
        badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
      };
    }
    if (raw.includes('DELETE') || raw.includes('FAILED')) {
      return {
        icon: Trash2,
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      };
    }
    if (raw.includes('ASSIGN')) {
      return {
        icon: Zap,
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      };
    }
    if (raw.includes('REVIEW') || raw.includes('SUBMIT')) {
      return {
        icon: FileCheck2,
        badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
      };
    }
    if (raw.includes('LOGIN')) {
      return {
        icon: LogIn,
        badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
      };
    }
    return {
      icon: ShieldCheck,
      badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
    };
  };

  const openDetailModal = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> Immutable Enterprise Audit Trail
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Security & Organization Audit Logs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable system logs tracking administrative actions, user updates, training changes, and security events.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar Controls */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit logs by action, user, or details..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl glass-input text-xs"
            />
          </div>

          {/* Action Category Filter */}
          <div>
            <select
              value={actionCategory}
              onChange={(e) => setActionCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl glass-input text-xs cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">Create & Register</option>
              <option value="UPDATE">Update & Extend</option>
              <option value="ASSIGN">Assign & Dispatch</option>
              <option value="DEACTIVATE_LOCK">Deactivate & Lock</option>
              <option value="REACTIVATE_UNLOCK">Reactivate & Unlock</option>
              <option value="REVIEW_SUBMIT">Review & Submit</option>
              <option value="SECURITY">Security & Login</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl glass-input text-xs cursor-pointer"
            >
              <option value="ALL">All User Roles</option>
              <option value="Admin">Admin</option>
              <option value="Instructor">Instructor</option>
              <option value="Employee">Employee</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl glass-input text-xs cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="7DAYS">Last 7 Days</option>
              <option value="30DAYS">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <LoadingSpinner text="Fetching immutable audit logs..." />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No Audit Events Found"
          description="No administrative or security audit events matched your search and filter criteria."
        />
      ) : (
        <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950/60 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Action Event</th>
                  <th className="p-4">Performed By</th>
                  <th className="p-4">Target Entity</th>
                  <th className="p-4">Event Details</th>
                  <th className="p-4">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedLogs.map((log) => {
                  const { icon: ActionIcon, badgeClass } = getActionBadgeProps(log.action);
                  const humanAction = formatAuditAction(log.action);
                  const humanTarget = formatTargetEntity(log.targetType);
                  const formattedTimestamp = formatAuditDate(log.timestamp || log.createdAt);

                  return (
                    <tr
                      key={log._id}
                      onClick={() => openDetailModal(log)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      {/* Action Event Column */}
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${badgeClass}`}>
                          <ActionIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                          {humanAction}
                        </span>
                      </td>

                      {/* Performed By Column */}
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <img
                            src={log.userId?.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${log.userName}`}
                            alt={log.userName}
                            className="w-6 h-6 rounded-lg object-cover bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                          />
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-slate-100">{log.userName || log.userId?.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{log.userRole || log.userId?.role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Target Entity Column */}
                      <td className="p-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
                          {humanTarget}
                        </span>
                      </td>

                      {/* Event Details Column */}
                      <td className="p-4 text-slate-600 dark:text-slate-300 max-w-md truncate">
                        {log.details || 'No additional details logged.'}
                      </td>

                      {/* Timestamp Column */}
                      <td className="p-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {formattedTimestamp}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500">
              Showing <strong className="text-slate-800 dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, totalItems)}</strong> of{' '}
              <strong className="text-slate-800 dark:text-slate-200">{totalItems}</strong> events
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </button>

              <span className="px-3 py-1.5 rounded-xl font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG DETAIL MODAL */}
      {showModal && selectedLog && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Audit Log Details">
          <div className="space-y-5">
            {/* Header Action Banner */}
            {(() => {
              const { icon: ActionIcon, badgeClass } = getActionBadgeProps(selectedLog.action);
              return (
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${badgeClass}`}>
                  <div className="flex items-center space-x-2.5">
                    <ActionIcon className="w-5 h-5" />
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {formatAuditAction(selectedLog.action)}
                      </h4>
                      <p className="text-[10px] opacity-80 font-mono uppercase tracking-wider">{selectedLog.action}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/40 dark:bg-slate-900/40">
                    Immutable Record
                  </span>
                </div>
              );
            })()}

            {/* Performed By User Info */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Performed By User
              </label>
              <div className="flex items-center space-x-3">
                <img
                  src={selectedLog.userId?.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedLog.userName}`}
                  alt={selectedLog.userName}
                  className="w-10 h-10 rounded-xl object-cover bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {selectedLog.userName || selectedLog.userId?.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedLog.userId?.email || 'Registered User'} • <strong className="text-indigo-600 dark:text-indigo-400">{selectedLog.userRole || selectedLog.userId?.role}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Target Entity & Target Resource ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Target Entity</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {formatTargetEntity(selectedLog.targetType)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Target ID</p>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                  {selectedLog.targetId ? String(selectedLog.targetId) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Event Description Details */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Audit Event Description
              </label>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {selectedLog.details || 'No detailed description logged.'}
              </div>
            </div>

            {/* Date & Time Information */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Exact Timestamp</span>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {new Date(selectedLog.timestamp || selectedLog.createdAt).toLocaleString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                })}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                ISO: {new Date(selectedLog.timestamp || selectedLog.createdAt).toISOString()}
              </p>
            </div>

            {/* System Audit Event Metadata */}
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center font-mono">
                <Info className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> Event ID: {selectedLog._id}
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">Verified Log</span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
