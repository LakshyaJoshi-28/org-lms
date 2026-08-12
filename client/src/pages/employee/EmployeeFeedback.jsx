import React, { useEffect, useState } from 'react';
import { getMyFeedback } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../context/NotificationContext';
import { formatDate } from '../../utils/formatters';
import {
  MessageSquare,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Code2,
  Download,
  Sparkles,
  User,
  BookOpen,
  Award
} from 'lucide-react';

export const EmployeeFeedback = () => {
  const { addToast } = useNotification();
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const res = await getMyFeedback();
      setFeedbackList(res.data.data.submissions || []);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to fetch instructor feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div>
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> Instructor Evaluation Hub
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Feedback</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          View feedback and evaluation provided by your instructors for submitted assignments.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading instructor feedback..." />
      ) : feedbackList.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No Feedback Yet"
          description="Your instructors haven't reviewed any submitted assignments yet. Once an instructor reviews an assignment, the feedback will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {feedbackList.map((sub) => {
            const assign = sub.assignmentId || {};
            const training = assign.trainingId || {};
            const instructor = sub.reviewedBy || training.createdBy || {};
            const isLongFeedback = sub.feedback && sub.feedback.length > 180;

            return (
              <div
                key={sub._id}
                className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-4 flex flex-col justify-between hover:border-purple-500/30 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  {/* Top Bar: Training Category & Grade */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                        {training.title || 'Training Course'}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-1">
                        {assign.title || 'Project Assignment'}
                      </h3>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-600 text-white shadow-md shadow-purple-500/20 flex-shrink-0">
                      ✓ Grade: {sub.grade || 'Good'}
                    </span>
                  </div>

                  {/* Instructor Info & Review Date */}
                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    <div className="flex items-center space-x-2">
                      <img
                        src={instructor.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${instructor.name || 'Instructor'}`}
                        alt={instructor.name || 'Instructor'}
                        className="w-7 h-7 rounded-lg object-cover bg-slate-200 dark:bg-slate-800"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Instructor: {instructor.name || 'Instructor'}
                      </span>
                    </div>

                    <span className="font-mono text-[11px]">
                      Reviewed: {formatDate(sub.reviewedAt || sub.updatedAt)}
                    </span>
                  </div>

                  {/* Submission Link / Asset */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                      Submission Type: {sub.submissionType === 'github' ? 'GitHub Repository' : 'Uploaded File'}
                    </span>

                    {sub.submissionType === 'github' && sub.githubUrl && (
                      <a
                        href={sub.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-600 dark:text-purple-400 font-mono font-bold text-[11px] hover:underline flex items-center"
                      >
                        <Code2 className="w-3.5 h-3.5 mr-1" /> View Repo <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}

                    {sub.submissionType === 'file' && sub.fileUrl && (
                      <a
                        href={sub.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[11px] hover:underline flex items-center"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> View File <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </div>

                  {/* Instructor Written Feedback */}
                  <div className="space-y-1 pt-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center">
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> Instructor Feedback:
                    </p>

                    {sub.feedback ? (
                      <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-slate-800 dark:text-slate-200 leading-relaxed italic">
                        "{isLongFeedback ? `${sub.feedback.slice(0, 180)}...` : sub.feedback}"
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                        No written feedback was provided.
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Action for Modal */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => openDetailModal(sub)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 text-slate-700 dark:text-slate-300 transition-all cursor-pointer inline-flex items-center"
                  >
                    {isLongFeedback ? 'Read Full Feedback' : 'View Full Evaluation'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL FEEDBACK DETAIL MODAL */}
      {showModal && selectedItem && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Assignment Evaluation & Feedback">
          <div className="space-y-5">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    {selectedItem.assignmentId?.trainingId?.title || 'Training Course'}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {selectedItem.assignmentId?.title || 'Project Assignment'}
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-600 text-white shadow-md shadow-purple-500/20">
                  ✓ Grade: {selectedItem.grade || 'Good'}
                </span>
              </div>
            </div>

            {/* Dates & Instructor details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="text-slate-400 font-medium">Instructor</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center">
                  <User className="w-3.5 h-3.5 mr-1 text-purple-500" />
                  {selectedItem.reviewedBy?.name || selectedItem.assignmentId?.trainingId?.createdBy?.name || 'Instructor'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="text-slate-400 font-medium">Submission Date</p>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatDate(selectedItem.submittedAt)}
                </p>
              </div>
            </div>

            {/* Submission Link */}
            {selectedItem.submissionType === 'github' && selectedItem.githubUrl && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-500">Submitted Repository:</span>
                <a
                  href={selectedItem.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-600 dark:text-purple-400 font-mono font-bold hover:underline flex items-center"
                >
                  <Code2 className="w-3.5 h-3.5 mr-1" /> {selectedItem.githubUrl} <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            )}

            {selectedItem.submissionType === 'file' && selectedItem.fileUrl && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-500">Submitted File:</span>
                <a
                  href={selectedItem.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 font-mono font-bold hover:underline flex items-center"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> View File <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            )}

            {/* Complete Written Feedback */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Instructor Written Feedback
              </label>

              {selectedItem.feedback ? (
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-slate-800 dark:text-slate-200 leading-relaxed italic whitespace-pre-wrap">
                  "{selectedItem.feedback}"
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                  No written feedback was provided.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
