import React, { useEffect, useState } from 'react';
import { getAdminDashboardReports } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Users,
  GraduationCap,
  BookOpen,
  CheckCircle,
  BarChart3,
  ShieldAlert,
  Award,
  RefreshCw,
  AlertCircle,
  Building2,
  TrendingUp,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

export const AdminDashboard = () => {
  const { isDark } = useTheme();
  const { addToast } = useNotification();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await getAdminDashboardReports();
      if (res.data && res.data.data) {
        setData(res.data.data);
        if (isManualRefresh) {
          addToast('success', 'Dashboard analytics refreshed!');
        }
      } else {
        throw new Error('Invalid response payload');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load organization metrics';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format Recharts data safely from real backend payload
  const departmentPerformance = data?.departmentPerformance || [];
  const quickStats = data?.quickStats || {};
  const recentLogs = data?.recentLogs || [];

  const chartData = departmentPerformance.map((dep) => {
    const rawRate = typeof dep.completionRate === 'string'
      ? parseInt(dep.completionRate.replace('%', ''), 10)
      : Number(dep.completionRate || 0);

    return {
      name: dep.departmentName || 'Dept',
      completionRate: isNaN(rawRate) ? 0 : rawRate,
      completed: dep.completed || 0,
      totalAssigned: dep.totalAssigned || 0,
      totalEmployees: dep.totalEmployees || 0
    };
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner & Refresh Controls */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900/80 via-purple-900/50 to-slate-900 dark:from-indigo-950/80 dark:via-purple-950/60 dark:to-slate-950 border border-indigo-500/30 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs font-semibold">
            <Award className="w-3.5 h-3.5 mr-1.5 text-indigo-300" /> Executive Analytics Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Organization Dashboard</h1>
          <p className="text-xs text-indigo-200/80">
            Real-time compliance tracking, active user counts, and department performance metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3 relative z-10">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-all shadow-lg focus:outline-none"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* ERROR STATE CARD */}
      {error && !loading && (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 space-y-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Failed to Load Dashboard Analytics</h4>
              <p className="text-xs opacity-90">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchDashboardData(false)}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs shadow hover:bg-rose-500 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* SKELETON LOADING STATE */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="p-5 rounded-2xl glass-panel animate-pulse space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-8 w-16 bg-slate-300 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl glass-panel animate-pulse h-80 bg-slate-200/50 dark:bg-slate-800/40" />
            <div className="p-6 rounded-2xl glass-panel animate-pulse h-80 bg-slate-200/50 dark:bg-slate-800/40" />
          </div>
        </div>
      ) : (
        <>
          {/* QUICK STATS METRICS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center space-x-4 transition-all hover:shadow-xl">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Employees</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {quickStats.totalEmployees ?? 0}
                </h3>
              </div>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center space-x-4 transition-all hover:shadow-xl">
              <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Instructors</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {quickStats.totalInstructors ?? 0}
                </h3>
              </div>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center space-x-4 transition-all hover:shadow-xl">
              <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Trainings</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {quickStats.activeTrainings ?? 0}
                </h3>
              </div>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center space-x-4 transition-all hover:shadow-xl">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed Trainings</p>
                <div className="flex items-baseline space-x-2">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    {quickStats.completedTrainings ?? 0}
                  </h3>
                  <span className="text-xs font-bold text-emerald-500">
                    ({quickStats.overallCompletionRate || '0%'})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DEPARTMENT COMPLETION ANALYTICS & RECENT AUDIT LOGS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* DEPARTMENT COMPLETION BAR CHART */}
            <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Department Completion Analytics
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Real Time % Completion
                </span>
              </div>

              {chartData.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No Department Analytics Available"
                  description="Create departments and assign training courses to start tracking department completion rates."
                />
              ) : (
                <div className="space-y-6">
                  {/* Recharts Bar Chart */}
                  <div className="h-64 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                        <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
                        <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} unit="%" domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? '#0f172a' : '#ffffff',
                            borderColor: isDark ? '#334155' : '#cbd5e1',
                            borderRadius: '12px',
                            color: isDark ? '#f8fafc' : '#0f172a',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value) => [`${value}%`, 'Completion Rate']}
                        />
                        <Bar dataKey="completionRate" fill="#6366f1" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.completionRate >= 80 ? '#10b981' : entry.completionRate >= 40 ? '#6366f1' : '#f59e0b'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Department Summary Table */}
                  <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800/80 pt-4">
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                      <thead className="text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                        <tr>
                          <th className="pb-2">Department</th>
                          <th className="pb-2 text-center">Employees</th>
                          <th className="pb-2 text-center">Assigned</th>
                          <th className="pb-2 text-center">Completed</th>
                          <th className="pb-2 text-right">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {departmentPerformance.map((dep) => (
                          <tr key={dep.departmentId}>
                            <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                              {dep.departmentName}
                            </td>
                            <td className="py-2.5 text-center font-medium">{dep.totalEmployees}</td>
                            <td className="py-2.5 text-center font-medium">{dep.totalAssigned}</td>
                            <td className="py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{dep.completed}</td>
                            <td className="py-2.5 text-right font-bold text-indigo-600 dark:text-indigo-400">{dep.completionRate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* RECENT AUDIT LOGS PANEL */}
            <div className="p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Recent Audit Trail
                </h3>
              </div>

              {recentLogs.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No Audit Activities"
                  description="Security and system administrative events will be logged here automatically."
                />
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {recentLogs.map((log) => (
                    <div
                      key={log._id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 text-xs space-y-1 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-600 dark:text-indigo-300">{log.action}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {new Date(log.timestamp || log.createdAt).toLocaleDateString()} {new Date(log.timestamp || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium truncate">{log.details}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <span>By: <strong className="text-slate-800 dark:text-slate-200">{log.userName}</strong></span>
                        <span className="uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-semibold">{log.userRole}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
