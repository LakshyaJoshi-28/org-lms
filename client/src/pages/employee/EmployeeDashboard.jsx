import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyAssignments, getMyReport } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ProfileCompleteModal } from './ProfileCompleteModal';
import { formatDate } from '../../utils/formatters';
import {
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Clock,
  Play,
  Sparkles,
  User,
  Calendar,
  Activity,
  Layers,
  ArrowRight,
  HelpCircle,
  FileCheck2
} from 'lucide-react';

export const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyReport()
      .then(res => setReportData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading your learner workspace..." />;

  const overview = reportData?.overview || {};
  const assignments = reportData?.assignments || [];
  const quizAttempts = reportData?.quizAttempts || [];
  const assignmentSubmissions = reportData?.assignmentSubmissions || [];

  const now = new Date();

  // Calculate stats dynamically from single source of truth
  const total = overview.totalAssigned || assignments.length;
  const completed = overview.completedCourses !== undefined ? overview.completedCourses : assignments.filter(a => a.status === 'Completed' || a.progressPercentage === 100).length;
  const overdue = overview.overdueAssignments !== undefined ? overview.overdueAssignments : assignments.filter(a => a.status === 'Overdue' || (new Date(a.deadline) < now && a.status !== 'Completed')).length;
  const inProgress = overview.inProgressAssignments !== undefined ? overview.inProgressAssignments : assignments.filter(a => (a.status === 'In Progress' || a.progressPercentage > 0) && a.status !== 'Completed' && !overdue).length;
  const notStarted = overview.notStartedAssignments !== undefined ? overview.notStartedAssignments : Math.max(0, total - completed - inProgress - overdue);
  const overallProgress = overview.overallProgress || 0;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Profile Complete Modal for First Login */}
      <ProfileCompleteModal isOpen={!user?.isProfileComplete} onClose={() => {}} />

      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-900/60 via-indigo-900/50 to-slate-900 border border-blue-500/20 shadow-2xl space-y-2">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Learner Workspace
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-xs sm:text-sm text-slate-300">
          Track your assigned courses, training progress, deadlines, and skill development.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Assigned Courses</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{total}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completed}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">In Progress</p>
            <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{inProgress}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Not Started</p>
            <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300">{notStarted}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue</p>
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">{overdue}</h3>
          </div>
        </div>
      </div>

      {/* Overall Learning Progress Progress Bar */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex justify-between items-center text-sm font-bold">
          <span className="text-slate-900 dark:text-white flex items-center">
            <Activity className="w-4 h-4 mr-2 text-blue-500" /> Overall Learning Progress
          </span>
          <span className="text-blue-600 dark:text-blue-400 font-extrabold">{overallProgress}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-700 shadow"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Assigned Trainings Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Assigned Trainings</h2>
          <Link to="/employee/my-trainings" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center">
            View All Courses <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {assignments.length === 0 ? (
          <EmptyState icon={BookOpen} title="No Courses Assigned" description="You have no active training courses assigned to your profile." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((a) => {
              const isOverdue = a.status === 'Overdue' || (new Date(a.deadline) < now && a.status !== 'Completed');

              let statusLabel = 'Not Started';
              let badgeStyle = 'bg-blue-500 text-white';

              if (a.status === 'Completed' || a.progressPercentage === 100) {
                statusLabel = 'Completed';
                badgeStyle = 'bg-emerald-500 text-white';
              } else if (isOverdue) {
                statusLabel = 'Overdue';
                badgeStyle = 'bg-rose-500 text-white';
              } else if (a.status === 'In Progress' || a.progressPercentage > 0) {
                statusLabel = 'In Progress';
                badgeStyle = 'bg-indigo-600 text-white';
              }

              return (
                <div key={a._id} className="rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all">
                  <div>
                    <div className="relative h-44 bg-slate-900">
                      {a.thumbnailUrl ? (
                        <img src={a.thumbnailUrl} alt={a.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-blue-950 via-slate-900 to-indigo-950 text-blue-400 font-bold text-base p-4 text-center">
                          {a.title}
                        </div>
                      )}

                      <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow ${badgeStyle}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">{a.category || 'Course Training'}</span>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base line-clamp-1">{a.title}</h3>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{a.description}</p>

                      <div className="flex items-center text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Instructor: <strong className="ml-1 text-slate-700 dark:text-slate-300">{a.instructorName || 'Instructor'}</strong>
                      </div>

                      <div className="space-y-1 pt-2">
                        <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <span>Progress</span>
                          <span className="text-blue-600 dark:text-blue-400">{a.progressPercentage || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${a.progressPercentage || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Due: {formatDate(a.deadline)}
                    </span>
                    <button
                      onClick={() => navigate(`/employee/player/${a._id}`)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center cursor-pointer ${
                        statusLabel === 'Completed'
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      {statusLabel === 'Completed' ? 'Review Training' : statusLabel === 'In Progress' ? 'Resume Learning' : 'Start Learning'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity Timeline */}
      {(quizAttempts.length > 0 || assignmentSubmissions.length > 0) && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center">
            <Activity className="w-4 h-4 mr-2 text-indigo-500" /> Recent Learning Activity
          </h3>
          <div className="space-y-3">
            {quizAttempts.slice(0, 2).map((att) => (
              <div key={att._id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Attempted {att.quizTitle}</p>
                    <p className="text-slate-500">Score: {att.percentage}% • {att.passed ? 'PASSED ✓' : 'FAILED ✕'}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">{formatDate(att.createdAt)}</span>
              </div>
            ))}

            {assignmentSubmissions.slice(0, 2).map((sub) => (
              <div key={sub._id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Submitted {sub.assignmentTitle}</p>
                    <p className="text-slate-500">Format: {sub.submissionType === 'github' ? 'GitHub Link' : 'File Upload'} • Status: {sub.status}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">{formatDate(sub.submittedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
