import React, { useEffect, useState } from 'react';
import { getInstructorDashboardReports } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  FileCheck2,
  Clock,
  Plus,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Activity,
  CheckCircle2,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export const InstructorDashboard = () => {
  const { addToast } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await getInstructorDashboardReports();
      if (res.data && res.data.data) {
        setData(res.data.data);
        if (isManualRefresh) {
          addToast('success', 'Instructor Studio data updated!');
        }
      } else {
        throw new Error('Invalid dashboard payload');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load instructor metrics';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const stats = data?.stats || {};
  const myTrainings = data?.myTrainings || [];
  const pendingSubmissions = data?.pendingSubmissions || [];
  const overdueEmployees = data?.overdueEmployees || [];
  const recentActivity = data?.recentActivity || [];

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Quick Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Instructor Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Instructor Studio
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage your trainings, monitor learner progress, and review assignments.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <Link
            to="/instructor/trainings"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Training
          </Link>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Failed to Load Dashboard Data</h4>
              <p className="text-xs opacity-90">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchDashboard(false)}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs shadow hover:bg-rose-500 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Instructor Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center space-x-4 transition-all hover:shadow-lg">
          <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Created Trainings</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.createdTrainings || 0}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center space-x-4 transition-all hover:shadow-lg">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Enrolled</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalEnrolled || 0}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center space-x-4 transition-all hover:shadow-lg">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Reviews</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.pendingReviews || 0}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center space-x-4 transition-all hover:shadow-lg">
          <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue</p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.overdueEnrollments || 0}</h3>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Training Overview & Pending Reviews */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Training Overview */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                My Training Overview
              </h3>
              <Link
                to="/instructor/trainings"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
              >
                View All Trainings <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {myTrainings.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No Trainings Created"
                description="You haven't created any training courses yet."
                action={
                  <Link to="/instructor/trainings" className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white">
                    Create Training
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Training Name</th>
                      <th className="p-3 text-center">Enrolled</th>
                      <th className="p-3 text-center">Completed</th>
                      <th className="p-3 text-center">In Progress</th>
                      <th className="p-3 text-center">Pending</th>
                      <th className="p-3 text-right">Completion %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {myTrainings.slice(0, 5).map((t) => (
                      <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{t.title}</td>
                        <td className="p-3 text-center font-semibold">{t.enrolledCount}</td>
                        <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{t.completedCount}</td>
                        <td className="p-3 text-center font-semibold text-indigo-600 dark:text-indigo-400">{t.inProgressCount}</td>
                        <td className="p-3 text-center font-semibold text-slate-400">{t.pendingCount}</td>
                        <td className="p-3 text-right font-extrabold text-blue-600 dark:text-blue-400">
                          {t.completionRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pending Assignment Reviews */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center">
                <FileCheck2 className="w-5 h-5 mr-2 text-amber-500" />
                Pending Assignment Reviews ({pendingSubmissions.length})
              </h3>
              <Link
                to="/instructor/submissions"
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center"
              >
                View All Reviews <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {pendingSubmissions.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">You're all caught up!</h4>
                <p className="text-xs text-slate-500">No submissions currently need review.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingSubmissions.map((sub) => (
                  <div
                    key={sub._id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs transition-all hover:border-amber-500/40"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={sub.employeeAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${sub.employeeName}`}
                        alt={sub.employeeName}
                        className="w-8 h-8 rounded-lg object-cover bg-slate-800 border border-slate-700"
                      />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{sub.employeeName}</p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          {sub.assignmentTitle} • <span className="text-slate-500">{sub.trainingTitle}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                        Submitted: {formatDate(sub.submittedAt)}
                      </span>
                      <Link
                        to="/instructor/submissions"
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-[11px] shadow-sm hover:from-amber-600 hover:to-orange-600 transition-colors inline-flex items-center"
                      >
                        Review
                        <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions, Deadline Alerts & Recent Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider text-[11px]">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                to="/instructor/trainings"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-500/20 transition-colors"
              >
                <span>+ Create Training Course</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                to="/instructor/submissions"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs hover:bg-amber-500/20 transition-colors"
              >
                <span>Review Assignments</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                to="/instructor/deadlines"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-500/20 transition-colors"
              >
                <span>Manage Deadlines</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Deadline Alerts */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-rose-600 dark:text-rose-400 text-sm flex items-center">
                <Clock className="w-4 h-4 mr-1.5" /> Deadline Alerts
              </h3>
              <Link to="/instructor/deadlines" className="text-[11px] font-bold text-rose-500 hover:underline">
                Manage Deadlines
              </Link>
            </div>

            {overdueEmployees.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-1">No active deadline alerts for your courses.</p>
            ) : (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
                  <span className="font-semibold">{stats.overdueEnrollments} Overdue Enrollments</span>
                  <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-bold text-[10px]">Action Needed</span>
                </div>
                {overdueEmployees.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{item.employeeName}</p>
                      <p className="text-[10px] text-slate-400">{item.trainingTitle}</p>
                    </div>
                    <span className="text-rose-500 font-bold">{item.daysOverdue}d overdue</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center">
              <Activity className="w-4 h-4 mr-1.5 text-indigo-500" /> Recent Activity
            </h3>

            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-1">No recent activity recorded.</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.slice(0, 5).map((act) => (
                  <div key={act.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs space-y-0.5">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">{act.title}</p>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">{act.description}</p>
                    <span className="text-[9px] text-slate-400 block font-mono">{formatDate(act.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
