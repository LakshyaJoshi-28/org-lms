import React, { useEffect, useState } from 'react';
import { getMyReport } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import {
  GraduationCap,
  CheckCircle2,
  BarChart3,
  Award,
  Download,
  HelpCircle,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Layers,
  Sparkles,
  AlertTriangle,
  FileText,
  ExternalLink,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const MyReport = () => {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuizAttemptId, setExpandedQuizAttemptId] = useState(null);
  const [modalContent, setModalContent] = useState(null); // { title: string, text: string }

  useEffect(() => {
    getMyReport()
      .then(res => setReport(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const emp = report.employee || {};
    const overview = report.overview || {};
    const assignments = report.assignments || [];
    const quizAttempts = report.quizAttempts || [];
    const assignmentSubmissions = report.assignmentSubmissions || [];

    // Header Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Personal Training Report', 14, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 26);

    // Section 1: Employee Details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Information', 14, 34);

    autoTable(doc, {
      startY: 37,
      theme: 'grid',
      head: [['Employee Name', 'Email', 'Department', 'Job Role', 'Organization']],
      body: [[
        emp.name || user?.name || 'N/A',
        emp.email || user?.email || 'N/A',
        emp.department || user?.department?.name || 'Unassigned',
        emp.jobRole || 'Employee',
        emp.organization || 'Organization'
      ]],
      styles: { fontSize: 8 }
    });

    // Section 2: Summary Metrics
    let currentY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Training Summary & Performance Metrics', 14, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      theme: 'grid',
      head: [['Total Assigned', 'Completed', 'In Progress', 'Overdue', 'Overall Progress', 'Avg Quiz Score']],
      body: [[
        overview.totalAssigned || 0,
        overview.completedCourses || 0,
        overview.inProgressAssignments || 0,
        overview.overdueAssignments || 0,
        `${overview.overallProgress || 0}%`,
        `${overview.averageQuizScore || 0}%`
      ]],
      styles: { fontSize: 8 }
    });

    // Section 3: Course Transcript
    currentY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Course Transcript & History', 14, currentY);

    const transcriptRows = assignments.map(a => [
      a.title,
      a.category,
      a.instructorName,
      a.assignedDate ? formatDate(a.assignedDate) : 'N/A',
      a.deadline ? formatDate(a.deadline) : 'N/A',
      `${a.progressPercentage}%`,
      a.status,
      a.quizScore,
      a.assignmentStatus
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      theme: 'striped',
      head: [['Title', 'Category', 'Instructor', 'Assigned', 'Deadline', 'Progress', 'Status', 'Quiz Score', 'Assignment']],
      body: transcriptRows.length > 0 ? transcriptRows : [['No training courses assigned', '', '', '', '', '', '', '', '']],
      styles: { fontSize: 7, cellPadding: 2 }
    });

    // Section 4: Quiz Attempt & Question Breakdown
    quizAttempts.forEach((att) => {
      currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : currentY + 8;
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Quiz: ${att.quizTitle} (Attempt ${att.attemptNumber} • Score: ${att.percentage}% • ${att.passed ? 'PASSED' : 'FAILED'})`, 14, currentY);

      const qAnsRows = (att.answers || []).map((ans, idx) => {
        let selText = ans.selectedAnswerText || '';
        if (!selText) {
          selText = ans.status === 'data_unavailable' ? 'Answer data unavailable' : (ans.status === 'not_answered' ? 'Not Answered' : 'N/A');
        }

        let statusText = 'Incorrect';
        if (ans.isCorrect) statusText = 'Correct';
        else if (ans.status === 'not_answered') statusText = 'Not Answered';
        else if (ans.status === 'data_unavailable') statusText = 'Data Unavailable';

        return [
          `Q${idx + 1}: ${ans.questionText || `Question ${idx + 1}`}`,
          selText,
          ans.correctAnswerText || 'N/A',
          statusText
        ];
      });

      autoTable(doc, {
        startY: currentY + 3,
        theme: 'grid',
        head: [['Question', 'Your Answer', 'Correct Answer', 'Result']],
        body: qAnsRows.length > 0 ? qAnsRows : [['No question answers recorded', '', '', '']],
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 50 },
          2: { cellWidth: 50 },
          3: { cellWidth: 20 }
        }
      });
    });

    // Section 5: Project Assignment Submissions
    currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : currentY + 8;
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Assignment Submissions', 14, currentY);

    const assignRows = assignmentSubmissions.map(s => [
      s.assignmentTitle,
      s.submissionType === 'github' ? 'GitHub Repo' : 'File Upload',
      s.githubUrl || s.fileUrl || 'N/A',
      s.submittedAt ? formatDate(s.submittedAt) : 'N/A',
      s.status
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      theme: 'grid',
      head: [['Assignment Title', 'Submission Type', 'Link / File', 'Date Submitted', 'Status']],
      body: assignRows.length > 0 ? assignRows : [['No assignment submissions recorded', '', '', '', '']],
      styles: { fontSize: 7, cellPadding: 2 }
    });

    doc.save(`Personal_Training_Report_${(emp.name || 'Employee').replace(/\s+/g, '_')}.pdf`);
  };

  if (loading) return <LoadingSpinner text="Compiling your personal training report & stats..." />;

  if (!report) return <EmptyState title="Report Unavailable" description="Unable to load personal training report statistics." />;

  const { overview = {}, assignments = [], quizAttempts = [], assignmentSubmissions = [] } = report;

  // Chart Data Preparation
  const progressChartData = assignments.map(a => ({
    name: a.title.length > 15 ? a.title.slice(0, 15) + '...' : a.title,
    Progress: a.progressPercentage || 0
  }));

  const pieData = [
    { name: 'Completed', value: overview.completedCourses || 0, color: '#10b981' },
    { name: 'In Progress', value: overview.inProgressAssignments || 0, color: '#6366f1' },
    { name: 'Not Started', value: overview.notStartedAssignments || 0, color: '#64748b' },
    { name: 'Overdue', value: overview.overdueAssignments || 0, color: '#f43f5e' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Full Text View Modal for Long Questions / Answers */}
      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{modalContent.title}</h3>
              <button
                onClick={() => setModalContent(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap break-words leading-relaxed">
              {modalContent.text}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalContent(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Employee Performance Hub
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Personal Training Report & Stats</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View your training progress, completion history, quiz performance, and learning activity.
          </p>
        </div>

        <button
          onClick={handleDownloadPDF}
          className="inline-flex items-center px-5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 mr-2" /> Download Report PDF
        </button>
      </div>

      {/* Top Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Assigned</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{overview.totalAssigned || 0}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed Courses</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{overview.completedCourses || 0}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overall Progress</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{overview.overallProgress || 0}%</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Average Quiz Score</p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{overview.averageQuizScore || 0}%</h3>
          </div>
        </div>
      </div>

      {/* Progress Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Progress Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center">
            <BarChart3 className="w-4 h-4 mr-2 text-blue-500" /> Course Progress Breakdown
          </h3>
          {progressChartData.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-12">No training progress recorded yet.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="Progress" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Training Status Distribution Pie Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center">
            <Layers className="w-4 h-4 mr-2 text-indigo-500" /> Status Distribution
          </h3>
          {pieData.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-12">No active training status data.</p>
          ) : (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Course Transcript & History Table */}
      <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 p-6">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Course Transcript & History</h3>

        {assignments.length === 0 ? (
          <EmptyState title="No Course History" description="Your assigned courses and transcript will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950/60 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Training Title</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Instructor</th>
                  <th className="p-3.5">Assigned Date</th>
                  <th className="p-3.5">Deadline</th>
                  <th className="p-3.5">Progress</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Completion Date</th>
                  <th className="p-3.5">Quiz Score</th>
                  <th className="p-3.5 text-right">Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {assignments.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{a.title}</td>
                    <td className="p-3.5 text-blue-600 dark:text-blue-400 font-semibold">{a.category}</td>
                    <td className="p-3.5">{a.instructorName}</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">{formatDate(a.assignedDate)}</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">{formatDate(a.deadline)}</td>
                    <td className="p-3.5 font-bold text-blue-600 dark:text-blue-400">{a.progressPercentage}%</td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        a.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                        a.status === 'Overdue' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
                        'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">{a.completedDate ? formatDate(a.completedDate) : '-'}</td>
                    <td className="p-3.5 font-bold text-amber-500">{a.quizScore}</td>
                    <td className="p-3.5 text-right font-bold text-purple-500">{a.assignmentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quiz Performance & Detailed Attempt History */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center">
            <HelpCircle className="w-4 h-4 mr-2 text-amber-500" /> Quiz Performance & Attempt History
          </h3>
          <p className="text-xs text-slate-500">All quiz attempts, score breakdowns, and question-level evaluation records.</p>
        </div>

        {quizAttempts.length === 0 ? (
          <EmptyState icon={HelpCircle} title="No Quiz Activity" description="You have not attempted any section quizzes yet." />
        ) : (
          <div className="space-y-4">
            {quizAttempts.map((att) => {
              const isExpanded = expandedQuizAttemptId === att._id;

              const answersList = att.answers || [];
              const correctCount = answersList.filter(a => a.isCorrect).length;
              const incorrectCount = answersList.filter(a => !a.isCorrect && a.status === 'incorrect').length;
              const notAnsweredCount = answersList.filter(a => a.status === 'not_answered').length;

              return (
                <div key={att._id} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950/40">
                  {/* Top Accordion Header Bar */}
                  <div
                    onClick={() => setExpandedQuizAttemptId(isExpanded ? null : att._id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{att.quizTitle}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          Attempt {att.attemptNumber}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                        <span>Date: {formatDate(att.createdAt)}</span>
                        <span>•</span>
                        <span>Passing Threshold: {att.passingScorePercent}%</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{correctCount} Correct</span>
                        <span>•</span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">{incorrectCount} Incorrect</span>
                        {notAnsweredCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400 font-bold">{notAnsweredCount} Unanswered</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        att.passed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                        {att.percentage}% ({att.passed ? '✓ PASSED' : '✕ FAILED'})
                      </span>

                      <button className="p-1 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Question Evaluation Breakdown */}
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-slate-900">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">Question Evaluation Breakdown</h4>
                      {answersList.length > 0 ? (
                        <div className="space-y-3">
                          {answersList.map((ans, aIdx) => {
                            const isQuestionLong = (ans.questionText || '').length > 180;
                            const questionDisplay = isQuestionLong ? (ans.questionText || '').slice(0, 180) + '...' : (ans.questionText || `Question ${aIdx + 1}`);

                            let userAnsText = ans.selectedAnswerText;
                            if (!userAnsText) {
                              if (ans.status === 'data_unavailable' || ans.dataUnavailable) userAnsText = 'Answer data unavailable';
                              else if (ans.status === 'not_answered') userAnsText = 'Not Answered';
                              else userAnsText = (ans.options && ans.selectedOptionIndex !== null && ans.selectedOptionIndex !== undefined && ans.options[ans.selectedOptionIndex]) ? ans.options[ans.selectedOptionIndex] : 'Not Answered';
                            }

                            const corrAnsText = ans.correctAnswerText || (ans.options && ans.correctAnswerIndex !== undefined ? ans.options[ans.correctAnswerIndex] : 'N/A');

                            const isUserAnsLong = userAnsText.length > 120;
                            const isCorrAnsLong = corrAnsText.length > 120;
                            const isUserAnsUrl = userAnsText.startsWith('http://') || userAnsText.startsWith('https://');

                            return (
                              <div key={aIdx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                                {/* Question Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug">
                                    <span>Q{aIdx + 1}: {questionDisplay}</span>
                                    {isQuestionLong && (
                                      <button
                                        onClick={() => setModalContent({ title: `Question ${aIdx + 1}`, text: ans.questionText })}
                                        className="ml-2 text-blue-500 font-semibold hover:underline text-[11px] cursor-pointer"
                                      >
                                        [View full question]
                                      </button>
                                    )}
                                  </div>

                                  <span className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider self-start sm:self-auto ${
                                    ans.isCorrect
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                      : ans.status === 'not_answered'
                                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                      : ans.status === 'data_unavailable'
                                      ? 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {ans.isCorrect
                                      ? '✓ Correct'
                                      : ans.status === 'not_answered'
                                      ? '○ Not Answered'
                                      : ans.status === 'data_unavailable'
                                      ? '⚠ Data Unavailable'
                                      : '✕ Incorrect'}
                                  </span>
                                </div>

                                {/* Your Answer vs Correct Answer Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your Answer</p>
                                    <div className={`font-bold ${ans.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : ans.status === 'not_answered' ? 'text-amber-500' : ans.status === 'data_unavailable' ? 'text-slate-400' : 'text-rose-500'}`}>
                                      {isUserAnsUrl ? (
                                        <a href={userAnsText} target="_blank" rel="noreferrer" className="underline font-mono inline-flex items-center hover:opacity-80">
                                          {userAnsText.slice(0, 35)}... <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                      ) : isUserAnsLong ? (
                                        <div>
                                          <span>{userAnsText.slice(0, 120)}...</span>
                                          <button
                                            onClick={() => setModalContent({ title: `Q${aIdx + 1} - Your Answer`, text: userAnsText })}
                                            className="ml-2 text-blue-500 text-[11px] font-semibold hover:underline cursor-pointer block pt-0.5"
                                          >
                                            [View full answer]
                                          </button>
                                        </div>
                                      ) : (
                                        <span>{userAnsText}</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Correct Answer</p>
                                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                      {isCorrAnsLong ? (
                                        <div>
                                          <span>{corrAnsText.slice(0, 120)}...</span>
                                          <button
                                            onClick={() => setModalContent({ title: `Q${aIdx + 1} - Correct Answer`, text: corrAnsText })}
                                            className="ml-2 text-blue-500 text-[11px] font-semibold hover:underline cursor-pointer block pt-0.5"
                                          >
                                            [View full answer]
                                          </button>
                                        </div>
                                      ) : (
                                        <span>{corrAnsText}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No question breakdown recorded for this attempt.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assignment History Section */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center">
            <FileCheck2 className="w-4 h-4 mr-2 text-purple-500" /> Project Assignment History
          </h3>
          <p className="text-xs text-slate-500">Submitted project assignments, URLs, and instructor review status.</p>
        </div>

        {assignmentSubmissions.length === 0 ? (
          <EmptyState icon={FileCheck2} title="No Assignments Submitted" description="Project assignment submissions will appear here." />
        ) : (
          <div className="space-y-3">
            {assignmentSubmissions.map((sub) => (
              <div key={sub._id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{sub.assignmentTitle}</h4>
                  <p className="text-slate-500 pt-0.5">
                    Format: <strong>{sub.submissionType === 'github' ? 'GitHub Repository Link' : 'File Upload'}</strong> • Submitted: {formatDate(sub.submittedAt)}
                  </p>
                  {sub.githubUrl && (
                    <a href={sub.githubUrl} target="_blank" rel="noreferrer" className="text-blue-500 font-mono underline hover:text-blue-400 pt-1 block">
                      {sub.githubUrl}
                    </a>
                  )}
                  {sub.fileUrl && (
                    <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="text-purple-500 font-mono underline hover:text-purple-400 pt-1 block">
                      {sub.fileUrl}
                    </a>
                  )}
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 self-start sm:self-auto">
                  {sub.status === 'reviewed' ? 'Reviewed' : 'Submitted'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
