import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrainings, updateTraining, deleteTraining } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { useNotification } from '../../context/NotificationContext';
import { BookOpen, Plus, Edit3, Trash2, Layers, CheckCircle2, FileCode, Clock } from 'lucide-react';

export const MyTrainings = () => {
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getTrainings();
      setTrainings(res.data.data.trainings || []);
    } catch (err) {
      addToast('error', 'Failed to load trainings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTogglePublish = async (t) => {
    const newStatus = t.status === 'published' ? 'draft' : 'published';
    try {
      await updateTraining(t._id, { status: newStatus });
      addToast('success', `Course status changed to ${newStatus}`);
      fetchData();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this training course?')) return;
    try {
      await deleteTraining(id);
      addToast('success', 'Training course deleted');
      fetchData();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to delete training');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Training Courses Studio</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create, manage, and publish your organization training courses, syllabus sections, quizzes, and assignments.
          </p>
        </div>
        <button
          onClick={() => navigate('/instructor/course-builder/new')}
          className="inline-flex items-center px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create New Training
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading training courses..." />
      ) : trainings.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Trainings Created"
          description="Create your first training course to start adding sections, lectures, quizzes, and project assignments."
          action={
            <button
              onClick={() => navigate('/instructor/course-builder/new')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white cursor-pointer"
            >
              Create Training
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainings.map((t) => (
            <div key={t._id} className="rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between transition-all hover:shadow-xl">
              <div>
                <div className="relative h-44 bg-slate-900">
                  {t.thumbnailUrl ? (
                    <img src={t.thumbnailUrl} alt={t.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-blue-950 via-slate-900 to-indigo-950 text-blue-400 font-bold text-lg p-4 text-center">
                      {t.title}
                    </div>
                  )}

                  <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow ${
                    t.status === 'published' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {t.status}
                  </span>

                  {t.isMandatory && (
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white">
                      Mandatory
                    </span>
                  )}
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      {t.categoryId?.name || 'General Category'}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base line-clamp-1">{t.title}</h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{t.description || 'No description provided.'}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="flex items-center">
                      <Layers className="w-3.5 h-3.5 mr-1 text-indigo-500" /> {t.sections?.length || 0} Sections
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-amber-500" /> {t.durationDays || 30} Days
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => navigate(`/instructor/course-builder/${t._id}`)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 border border-blue-500/30 transition-colors inline-flex items-center cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 mr-1" />
                  Edit & Course Builder
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleTogglePublish(t)}
                    title={t.status === 'published' ? 'Unpublish to Draft' : 'Publish Course'}
                    className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      t.status === 'published' ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-amber-500 hover:bg-amber-500/10'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/instructor/course-builder/${t._id}`)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(t._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
