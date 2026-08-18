import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyAssignments } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';
import { GraduationCap, Play, Lock, CheckCircle2, Clock, Layers, Sparkles } from 'lucide-react';

export const MyTrainings = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'in_progress' | 'completed' | 'overdue'

  useEffect(() => {
    getMyAssignments()
      .then(res => setAssignments(res.data.data.assignments || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();

  const filtered = assignments.filter(a => {
    const isOverdue = a.status === 'Overdue' || (new Date(a.deadline) < now && a.status !== 'Completed');
    if (filter === 'completed') return a.status === 'Completed';
    if (filter === 'overdue') return isOverdue;
    if (filter === 'in_progress') return a.status === 'In Progress' || a.status === 'Assigned';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Employee Learning Hub
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">My Assigned Trainings</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access your courses, interactive video lessons, quizzes, downloadable PDF resources, and project assignments.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Trainings' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
            { key: 'overdue', label: 'Overdue' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === f.key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading assigned trainings..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No Trainings Found"
          description="You currently have no training courses under this filter category."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((a) => {
            const t = a.trainingId;
            if (!t) return null;

            const isOverdue = a.status === 'Overdue' || (new Date(a.deadline) < now && a.status !== 'Completed');
            const totalSubSections = t.sections?.reduce((acc, sec) => acc + (sec.subSections?.length || 0), 0) || 0;

            let statusLabel = 'Not Started';
            let badgeStyle = 'bg-blue-500 text-white';

            if (a.status === 'Completed') {
              statusLabel = 'Completed';
              badgeStyle = 'bg-emerald-500 text-white';
            } else if (isOverdue) {
              statusLabel = 'Overdue';
              badgeStyle = 'bg-rose-500 text-white';
            } else if (a.status === 'In Progress' || (a.progressPercentage || 0) > 0) {
              statusLabel = 'In Progress';
              badgeStyle = 'bg-indigo-600 text-white';
            }

            const isLocked = a.isLocked || a.lockStatus?.isLocked || a.status === 'Locked';

            return (
              <div
                key={a._id}
                className="rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between transition-all hover:shadow-xl"
              >
                <div>
                  <div className="relative h-44 bg-slate-900">
                    {t.thumbnailUrl ? (
                      <img src={t.thumbnailUrl} alt={t.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-blue-950 via-slate-900 to-indigo-950 text-blue-400 font-bold text-base p-4 text-center">
                        {t.title}
                      </div>
                    )}

                    <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow ${badgeStyle}`}>
                      {statusLabel}
                    </span>

                    {isLocked ? (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow bg-rose-600 text-white flex items-center border border-rose-400/30">
                        <Lock className="w-3 h-3 mr-1" /> LOCKED
                      </span>
                    ) : t.isMandatory ? (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white shadow">
                        Compulsory
                      </span>
                    ) : null}
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {t.categoryId?.name || 'Training Course'}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base line-clamp-1">{t.title}</h3>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{t.description}</p>

                    {/* Progress Bar & SubSections Count */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span>{totalSubSections} Lessons Total</span>
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
                  <span className={`text-[11px] font-bold flex items-center ${isOverdue ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    Due: {formatDate(a.deadline)}
                  </span>

                  <button
                    onClick={() => navigate(`/employee/player/${a._id}`)}
                    disabled={isLocked}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center cursor-pointer ${
                      isLocked
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                        : a.status === 'Completed'
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20'
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5 mr-1.5" /> Locked
                      </>
                    ) : a.status === 'Completed' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Review Training
                      </>
                    ) : (a.progressPercentage || 0) > 0 ? (
                      <>
                        <Play className="w-3.5 h-3.5 mr-1.5" /> Resume Learning
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 mr-1.5" /> Start Learning
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
