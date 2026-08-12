import React, { useEffect, useState } from 'react';
import { getInstructorSubmissions, getTrainings, reviewSubmission } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../context/NotificationContext';
import { formatDate } from '../../utils/formatters';
import {
  FileCheck2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  BookOpen,
  Code2,
  Download,
  Filter,
  Check
} from 'lucide-react';

export const SubmissionsReviewer = () => {
  const { addToast } = useNotification();
  const [trainings, setTrainings] = useState([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState('all');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'submitted' | 'reviewed'

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [grade, setGrade] = useState('Good'); // 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement' | 'Poor'
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getTrainings()
      .then(res => {
        setTrainings(res.data.data.trainings || []);
      })
      .catch(console.error);
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await getInstructorSubmissions(selectedTrainingId);
      setSubmissions(res.data.data.submissions || []);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to fetch instructor submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [selectedTrainingId]);

  const openReviewModal = (sub) => {
    setActiveSubmission(sub);
    setGrade(sub.grade || 'Good');
    setFeedback(sub.feedback || '');
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!activeSubmission) return;

    setSubmitting(true);
    try {
      await reviewSubmission(activeSubmission._id, {
        grade,
        feedback
      });
      addToast('success', 'Assignment evaluated & grade saved successfully!');
      setShowReviewModal(false);
      fetchSubmissions();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to review submission');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (filterStatus === 'submitted') return sub.status === 'submitted';
    if (filterStatus === 'reviewed') return sub.status === 'reviewed';
    return true;
  });

  const totalCount = submissions.length;
  const pendingCount = submissions.filter(s => s.status === 'submitted').length;
  const reviewedCount = submissions.filter(s => s.status === 'reviewed').length;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> Instructor Evaluation Hub
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Project Submissions & Grading Studio</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review employee code repositories, evaluate project submissions, assign qualitative grades, and provide feedback.
          </p>
        </div>

        {/* Training Filter Dropdown */}
        <div className="max-w-xs w-full">
          <select
            value={selectedTrainingId}
            onChange={(e) => setSelectedTrainingId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl glass-input text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="all" className="bg-white dark:bg-slate-900">All Trainings</option>
            {trainings.map(t => (
              <option key={t._id} value={t._id} className="bg-white dark:bg-slate-900">{t.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Submissions</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{totalCount}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Reviews</p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Reviewed Submissions</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{reviewedCount}</h3>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {[
            { key: 'all', label: `All (${totalCount})` },
            { key: 'submitted', label: `Pending Review (${pendingCount})` },
            { key: 'reviewed', label: `Reviewed (${reviewedCount})` }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === f.key
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Table / Cards */}
      {loading ? (
        <LoadingSpinner text="Loading project submissions..." />
      ) : filteredSubmissions.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="No Submissions Found"
          description="There are no project submissions under the selected filter criteria."
        />
      ) : (
        <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950/60 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Training & Assignment</th>
                  <th className="p-4">Submission Details</th>
                  <th className="p-4">Submitted Date</th>
                  <th className="p-4">Status & Grade</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {filteredSubmissions.map((sub) => {
                  const emp = sub.employeeId || {};
                  const assign = sub.assignmentId || {};
                  const trainingTitle = assign.trainingId?.title || 'Training Course';

                  return (
                    <tr key={sub._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={emp.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.name || 'User'}`}
                            alt={emp.name || 'User'}
                            className="w-9 h-9 rounded-xl object-cover bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{emp.name || 'Employee'}</p>
                            <p className="text-[11px] text-slate-500">{emp.email || ''}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 space-y-0.5">
                        <p className="font-bold text-blue-600 dark:text-blue-400 text-xs">{trainingTitle}</p>
                        <p className="text-slate-700 dark:text-slate-300 font-semibold">{assign.title || 'Project Assignment'}</p>
                      </td>

                      <td className="p-4 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-block mb-1">
                          {sub.submissionType === 'github' ? 'GitHub Repo' : 'File Upload'}
                        </span>

                        {sub.submissionType === 'github' && sub.githubUrl && (
                          <div>
                            <a
                              href={sub.githubUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-xs text-purple-600 dark:text-purple-400 font-mono font-bold hover:underline"
                            >
                              <Code2 className="w-3.5 h-3.5 mr-1" />
                              Open GitHub Repository <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                        )}

                        {sub.submissionType === 'file' && sub.fileUrl && (
                          <div>
                            <a
                              href={sub.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold hover:underline"
                            >
                              <Download className="w-3.5 h-3.5 mr-1" />
                              Download / View File <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(sub.submittedAt)}
                      </td>

                      <td className="p-4 space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          sub.status === 'reviewed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {sub.status === 'reviewed' ? '✓ Reviewed' : 'Pending Review'}
                        </span>

                        {sub.status === 'reviewed' && (
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Grade: <span className="text-purple-600 dark:text-purple-400">{sub.grade || 'Good'}</span>
                          </p>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => openReviewModal(sub)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center cursor-pointer ${
                            sub.status === 'reviewed'
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
                              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-500/20'
                          }`}
                        >
                          <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
                          {sub.status === 'reviewed' ? 'View Review' : 'Review Submission'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title="Evaluate Assignment Submission">
          <form onSubmit={handleReviewSubmit} className="space-y-5">
            {/* Employee & Assignment Header */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{activeSubmission?.employeeId?.name}</h4>
                  <p className="text-xs text-slate-500">{activeSubmission?.employeeId?.email}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  {activeSubmission?.submissionType === 'github' ? 'GitHub Link' : 'File Upload'}
                </span>
              </div>

              <div className="pt-2 text-xs space-y-1">
                <p className="text-slate-600 dark:text-slate-300">
                  Assignment: <strong>{activeSubmission?.assignmentId?.title}</strong>
                </p>

                {activeSubmission?.submissionType === 'github' && activeSubmission?.githubUrl && (
                  <a
                    href={activeSubmission.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-600 dark:text-purple-400 font-mono underline font-bold flex items-center hover:opacity-80 pt-1"
                  >
                    <Code2 className="w-3.5 h-3.5 mr-1.5" /> {activeSubmission.githubUrl} <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}

                {activeSubmission?.submissionType === 'file' && activeSubmission?.fileUrl && (
                  <a
                    href={activeSubmission.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 font-mono underline font-bold flex items-center hover:opacity-80 pt-1"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> View File: {activeSubmission.fileUrl} <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>
            </div>

            {/* Qualitative Grade Dropdown */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Qualitative Grade <span className="text-rose-500">*</span>
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-bold text-slate-900 dark:text-slate-100"
              >
                <option value="Excellent" className="bg-white dark:bg-slate-900">Excellent - Outstanding execution</option>
                <option value="Good" className="bg-white dark:bg-slate-900">Good - Solid implementation with minor improvements</option>
                <option value="Satisfactory" className="bg-white dark:bg-slate-900">Satisfactory - Meets basic requirements</option>
                <option value="Needs Improvement" className="bg-white dark:bg-slate-900">Needs Improvement - Requires revision</option>
                <option value="Poor" className="bg-white dark:bg-slate-900">Poor - Incomplete or incorrect submission</option>
              </select>
            </div>

            {/* Feedback Textarea */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Instructor Feedback (Optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                placeholder="Write constructive qualitative feedback for the employee explaining the evaluation..."
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
              >
                {submitting ? 'Saving Review...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
