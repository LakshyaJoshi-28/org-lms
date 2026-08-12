import React, { useEffect, useState } from 'react';
import { getFullOrgReport } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { formatDate, formatAssignmentType } from '../../utils/formatters';
import {
  exportEmployeeProgressReport,
  exportDepartmentComplianceReport,
  exportTrainingAnalyticsReport,
  exportOverdueReport,
  exportFullOrgReport
} from '../../utils/exportReports';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Users,
  BookOpen,
  Award,
  TrendingUp,
  AlertCircle,
  Download,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  UserCheck,
  ShieldAlert,
  Zap,
  Tag,
  Briefcase,
  FileSpreadsheet,
  PieChart
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

export const Reports = () => {
  const { addToast } = useNotification();
  const { isDark } = useTheme();

  // State Data
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Active Main Tab: 'overview' | 'departments' | 'employees' | 'trainings' | 'overdue' | 'compliance'
  const [activeTab, setActiveTab] = useState('overview');

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTraining, setSelectedTraining] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Expandable Department Accordion state: map of deptId -> boolean
  const [expandedDepts, setExpandedDepts] = useState({});
  // Expandable Role Accordion state: map of deptId_role -> boolean
  const [expandedRoles, setExpandedRoles] = useState({});

  // Modals state
  const [selectedEmpModal, setSelectedEmpModal] = useState(null);
  const [selectedTrainingModal, setSelectedTrainingModal] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const fetchReports = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await getFullOrgReport();
      if (res.data && res.data.data) {
        setReportData(res.data.data);
        if (isManualRefresh) {
          addToast('success', 'Full organization reports refreshed!');
        }
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load organization report analytics';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const toggleDeptExpand = (dId) => {
    setExpandedDepts(prev => ({ ...prev, [dId]: !prev[dId] }));
  };

  const toggleRoleExpand = (key) => {
    setExpandedRoles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Safe references
  const overview = reportData?.overview || {};
  const departmentAnalytics = reportData?.departmentAnalytics || [];
  const employeeAnalytics = reportData?.employeeAnalytics || [];
  const trainingAnalytics = reportData?.trainingAnalytics || [];
  const overdueReport = reportData?.overdueReport || [];
  const mandatoryAnalytics = reportData?.mandatoryAnalytics || [];
  const complianceLeaderboard = reportData?.complianceLeaderboard || [];

  // Filtered Employee List
  const filteredEmployees = employeeAnalytics.filter(emp => {
    const term = search.toLowerCase();
    const matchesSearch = !search || (
      emp.name.toLowerCase().includes(term) ||
      emp.email.toLowerCase().includes(term) ||
      emp.departmentName.toLowerCase().includes(term) ||
      emp.jobRole.toLowerCase().includes(term)
    );

    const matchesDept = !selectedDept || String(emp.departmentId) === String(selectedDept);
    const matchesRole = !selectedRole || emp.jobRole === selectedRole;
    const matchesStatus = !selectedStatus || (
      selectedStatus === 'Completed' ? emp.completed > 0 :
      selectedStatus === 'In Progress' ? emp.inProgress > 0 :
      selectedStatus === 'Pending' ? emp.pending > 0 :
      selectedStatus === 'Overdue' ? emp.overdue > 0 : true
    );

    return matchesSearch && matchesDept && matchesRole && matchesStatus;
  });

  // Filtered Overdue Items
  const filteredOverdue = overdueReport.filter(item => {
    const term = search.toLowerCase();
    const matchesSearch = !search || (
      item.employeeName.toLowerCase().includes(term) ||
      item.trainingTitle.toLowerCase().includes(term) ||
      item.departmentName.toLowerCase().includes(term)
    );
    const matchesDept = !selectedDept || item.departmentName === selectedDept;
    return matchesSearch && matchesDept;
  });

  // Filtered Training Analytics
  const filteredTrainings = trainingAnalytics.filter(t => {
    const term = search.toLowerCase();
    const matchesSearch = !search || t.title.toLowerCase().includes(term) || t.categoryName.toLowerCase().includes(term);
    const matchesCourse = !selectedTraining || String(t._id) === String(selectedTraining);
    return matchesSearch && matchesCourse;
  });

  // Prepare Recharts Data for Department Compliance
  const deptChartData = departmentAnalytics.map(d => ({
    name: d.departmentName,
    complianceRate: d.complianceRate,
    completed: d.completed,
    totalAssigned: d.totalAssigned
  }));

  if (loading) return <LoadingSpinner text="Generating comprehensive LMS reports & analytics..." />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Enterprise Analytics Suite
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Organizational Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor training progress, department compliance, employee performance, and organizational learning.
          </p>
        </div>

        <div className="flex items-center space-x-3 relative">
          <button
            onClick={() => fetchReports(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Reports'}
          </button>

          {/* Export Report Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
              <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-64 glass-panel bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-fade-in space-y-1">
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
                  Download CSV / Excel
                </p>
                <button
                  onClick={() => { exportFullOrgReport(reportData); setShowExportMenu(false); }}
                  className="w-full flex items-center px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2.5 text-indigo-500" />
                  Full Organization Summary
                </button>
                <button
                  onClick={() => { exportDepartmentComplianceReport(departmentAnalytics); setShowExportMenu(false); }}
                  className="w-full flex items-center px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Building2 className="w-4 h-4 mr-2.5 text-purple-500" />
                  Department Compliance Report
                </button>
                <button
                  onClick={() => { exportEmployeeProgressReport(filteredEmployees); setShowExportMenu(false); }}
                  className="w-full flex items-center px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Users className="w-4 h-4 mr-2.5 text-emerald-500" />
                  Employee Progress Report
                </button>
                <button
                  onClick={() => { exportTrainingAnalyticsReport(trainingAnalytics); setShowExportMenu(false); }}
                  className="w-full flex items-center px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <BookOpen className="w-4 h-4 mr-2.5 text-blue-500" />
                  Training Completion Report
                </button>
                <button
                  onClick={() => { exportOverdueReport(overdueReport); setShowExportMenu(false); }}
                  className="w-full flex items-center px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                >
                  <Clock className="w-4 h-4 mr-2.5 text-rose-500" />
                  Overdue Trainings Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Failed to Load Compliance Analytics</h4>
              <p className="text-xs opacity-90">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchReports(false)}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs shadow hover:bg-rose-500 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Overview Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4.5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Employees</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{overview.totalEmployees || 0}</h3>
          </div>
        </div>

        <div className="p-4.5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Departments</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{overview.totalDepartments || 0}</h3>
          </div>
        </div>

        <div className="p-4.5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Assigned</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{overview.totalAssignments || 0}</h3>
          </div>
        </div>

        <div className="p-4.5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Completed</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{overview.completedAssignments || 0}</h3>
          </div>
        </div>

        <div className="p-4.5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Compliance Rate</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{overview.overallComplianceRate || 0}%</h3>
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, department, role..."
            className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-3 py-2 rounded-xl glass-input text-xs"
        >
          <option value="">All Departments</option>
          {departmentAnalytics.map(d => (
            <option key={d.departmentId} value={d.departmentId} className="bg-slate-900 text-white">{d.departmentName}</option>
          ))}
        </select>

        <select
          value={selectedTraining}
          onChange={(e) => setSelectedTraining(e.target.value)}
          className="px-3 py-2 rounded-xl glass-input text-xs"
        >
          <option value="">All Training Courses</option>
          {trainingAnalytics.map(t => (
            <option key={t._id} value={t._id} className="bg-slate-900 text-white">{t.title}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 rounded-xl glass-input text-xs"
        >
          <option value="">All Statuses</option>
          <option value="Completed">Completed</option>
          <option value="In Progress">In Progress</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
        </select>

        <button
          onClick={() => { setSearch(''); setSelectedDept(''); setSelectedRole(''); setSelectedTraining(''); setSelectedStatus(''); }}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* Main Specialized Tabs Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'overview', label: 'Overview', icon: PieChart },
          { id: 'departments', label: 'Department Analytics', icon: Building2 },
          { id: 'employees', label: 'Employee Progress', icon: Users, badge: filteredEmployees.length },
          { id: 'trainings', label: 'Training Analytics', icon: BookOpen, badge: filteredTrainings.length },
          { id: 'overdue', label: 'Overdue Report', icon: Clock, badge: filteredOverdue.length },
          { id: 'compliance', label: 'Compliance Leaderboard', icon: Award }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {t.label}
              {t.badge !== undefined && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === t.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ================================================== */}
      {/* TAB 1: OVERVIEW & CHARTS */}
      {/* ================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Department Compliance Bar Chart */}
            <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Department Compliance %
                </h3>
                <span className="text-xs text-slate-500">Real-Time Aggregation</span>
              </div>

              {deptChartData.length === 0 ? (
                <EmptyState icon={Building2} title="No Department Data" description="Create departments to view compliance chart." />
              ) : (
                <div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
                      <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} unit="%" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                          borderColor: isDark ? '#334155' : '#cbd5e1',
                          borderRadius: '12px',
                          color: isDark ? '#f8fafc' : '#0f172a'
                        }}
                        formatter={(value) => [`${value}%`, 'Compliance Rate']}
                      />
                      <Bar dataKey="complianceRate" fill="#6366f1" radius={[6, 6, 0, 0]}>
                        {deptChartData.map((entry, index) => (
                          <Cell key={`c-${index}`} fill={entry.complianceRate >= 80 ? '#10b981' : entry.complianceRate >= 50 ? '#6366f1' : '#f59e0b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Status Breakdown Summary */}
            <div className="p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                Training Status Distribution
              </h3>

              <div className="space-y-4 pt-2">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Completed Trainings</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{overview.completedAssignments || 0}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">In Progress</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{overview.inProgressAssignments || 0}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Pending / Unstarted</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{overview.pendingAssignments || 0}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Overdue Trainings</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{overview.overdueAssignments || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* TAB 2: DEPARTMENT ANALYTICS DRILL-DOWN */}
      {/* ================================================== */}
      {activeTab === 'departments' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
              Department Wise Drill-Down Compliance
            </h3>
            <span className="text-xs text-slate-500">Expand to view Job Roles & Employees</span>
          </div>

          {departmentAnalytics.length === 0 ? (
            <EmptyState icon={Building2} title="No Departments Found" description="No active departments in your organization." />
          ) : (
            <div className="space-y-4">
              {departmentAnalytics.map((dept) => {
                const isDeptExpanded = expandedDepts[dept.departmentId];

                return (
                  <div key={dept.departmentId} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden transition-all">
                    {/* Department Header Accordion Bar */}
                    <div
                      onClick={() => toggleDeptExpand(dept.departmentId)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {isDeptExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{dept.departmentName}</h4>
                          <p className="text-[11px] text-slate-500">
                            {dept.totalEmployees} Employees • {dept.totalRoles} Roles • {dept.totalAssigned} Trainings Assigned
                          </p>
                        </div>
                      </div>

                      {/* Stat Metrics Badges */}
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          {dept.completed} Completed
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
                          {dept.inProgress} In Progress
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                          {dept.pending} Pending
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                          {dept.overdue} Overdue
                        </span>
                        <div className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-extrabold shadow-sm">
                          {dept.complianceRate}% Compliance
                        </div>
                      </div>
                    </div>

                    {/* Department Drill-Down Section */}
                    {isDeptExpanded && (
                      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 space-y-4 animate-fade-in">
                        {dept.totalAssigned === 0 && (
                          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                            No training assignments have been made for this department yet.
                          </div>
                        )}

                        {/* Job Roles Hierarchy */}
                        <div className="space-y-3">
                          {dept.roles.map((role) => {
                            const roleKey = `${dept.departmentId}_${role.jobRole}`;
                            const isRoleExpanded = expandedRoles[roleKey];

                            return (
                              <div key={roleKey} className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 p-3 space-y-3">
                                <div
                                  onClick={() => toggleRoleExpand(roleKey)}
                                  className="flex items-center justify-between cursor-pointer text-xs"
                                >
                                  <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-slate-200">
                                    <Briefcase className="w-4 h-4 text-purple-500" />
                                    <span>{role.jobRole}</span>
                                    <span className="text-[10px] text-slate-400 font-normal">({role.totalEmployees} Employees)</span>
                                  </div>

                                  <div className="flex items-center space-x-3 font-semibold">
                                    <span className="text-emerald-500">{role.completed} Completed</span>
                                    <span className="text-indigo-500">{role.inProgress} In Progress</span>
                                    <span className="text-rose-500">{role.overdue} Overdue</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{role.complianceRate}%</span>
                                  </div>
                                </div>

                                {/* Employees in Role */}
                                {isRoleExpanded && (
                                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 animate-fade-in">
                                    {role.employees.length === 0 ? (
                                      <p className="text-xs text-slate-400 italic p-1">No employees assigned to this role.</p>
                                    ) : (
                                      role.employees.map((emp) => (
                                        <div
                                          key={emp._id}
                                          onClick={() => {
                                            const fullEmp = employeeAnalytics.find(e => String(e._id) === String(emp._id));
                                            if (fullEmp) setSelectedEmpModal(fullEmp);
                                          }}
                                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs cursor-pointer hover:border-indigo-500/50 transition-all"
                                        >
                                          <div className="flex items-center space-x-3">
                                            <img
                                              src={emp.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}`}
                                              alt={emp.name}
                                              className="w-7 h-7 rounded-lg object-cover bg-slate-800 border border-slate-700"
                                            />
                                            <div>
                                              <p className="font-bold text-slate-900 dark:text-slate-100">{emp.name}</p>
                                              <p className="text-[10px] text-slate-400">{emp.email}</p>
                                            </div>
                                          </div>

                                          <div className="flex items-center space-x-4">
                                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                                              Progress: <strong className="text-indigo-600 dark:text-indigo-400">{emp.overallProgress}%</strong>
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              emp.complianceStatus === 'Fully Compliant' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                              emp.complianceStatus === 'At Risk' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                              'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                            }`}>
                                              {emp.complianceStatus}
                                            </span>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================== */}
      {/* TAB 3: EMPLOYEE PROGRESS TABLE */}
      {/* ================================================== */}
      {activeTab === 'employees' && (
        <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800/80 p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
              Employee Training Progress ({filteredEmployees.length})
            </h3>
            <span className="text-xs text-slate-500">Click employee row to view full profile & assignments</span>
          </div>

          {filteredEmployees.length === 0 ? (
            <EmptyState icon={Users} title="No Employees Found" description="No employees match your active filters." />
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Department & Role</th>
                    <th className="p-3.5 text-center">Assigned</th>
                    <th className="p-3.5 text-center">Completed</th>
                    <th className="p-3.5 text-center">In Progress</th>
                    <th className="p-3.5 text-center">Overdue</th>
                    <th className="p-3.5 text-center">Overall Progress</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredEmployees.map((emp) => (
                    <tr
                      key={emp._id}
                      onClick={() => setSelectedEmpModal(emp)}
                      className="hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-3">
                        <img
                          src={emp.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}`}
                          alt={emp.name}
                          className="w-8 h-8 rounded-lg object-cover bg-slate-800 border border-slate-700"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{emp.name}</p>
                          <p className="text-[10px] text-slate-400">{emp.email}</p>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{emp.departmentName}</p>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400">{emp.jobRole}</p>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-900 dark:text-slate-200">{emp.totalAssigned}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{emp.completed}</td>
                      <td className="p-3.5 text-center font-semibold text-indigo-600 dark:text-indigo-400">{emp.inProgress}</td>
                      <td className="p-3.5 text-center font-semibold text-rose-600 dark:text-rose-400">{emp.overdue}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${emp.overallProgress}%` }} />
                          </div>
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">{emp.overallProgress}%</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.complianceStatus === 'Fully Compliant' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                          emp.complianceStatus === 'At Risk' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
                          'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {emp.complianceStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================== */}
      {/* TAB 4: TRAINING ANALYTICS */}
      {/* ================================================== */}
      {activeTab === 'trainings' && (
        <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800/80 p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
              Training Completion Analytics ({filteredTrainings.length})
            </h3>
            <span className="text-xs text-slate-500">Click course row to view enrolled employee roster</span>
          </div>

          {filteredTrainings.length === 0 ? (
            <EmptyState icon={BookOpen} title="No Trainings Found" description="No training courses match your active filter." />
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Training Title</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-center">Mandatory</th>
                    <th className="p-3.5 text-center">Enrolled</th>
                    <th className="p-3.5 text-center">Completed</th>
                    <th className="p-3.5 text-center">In Progress</th>
                    <th className="p-3.5 text-center">Overdue</th>
                    <th className="p-3.5 text-right">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredTrainings.map((t) => (
                    <tr
                      key={t._id}
                      onClick={() => setSelectedTrainingModal(t)}
                      className="hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">{t.title}</td>
                      <td className="p-3.5 font-semibold text-indigo-600 dark:text-indigo-400">{t.categoryName}</td>
                      <td className="p-3.5 text-center">
                        {t.isMandatory ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Compulsory</span>
                        ) : (
                          <span className="text-slate-400">Standard</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold">{t.totalAssigned}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{t.completed}</td>
                      <td className="p-3.5 text-center font-semibold text-indigo-600 dark:text-indigo-400">{t.inProgress}</td>
                      <td className="p-3.5 text-center font-semibold text-rose-600 dark:text-rose-400">{t.overdue}</td>
                      <td className="p-3.5 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                        {t.completionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================== */}
      {/* TAB 5: OVERDUE TRAININGS REPORT */}
      {/* ================================================== */}
      {activeTab === 'overdue' && (
        <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800/80 p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-rose-600 dark:text-rose-400 text-base flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Overdue Training Assignments ({filteredOverdue.length})
            </h3>
            <span className="text-xs text-slate-500">Immediate Administrative Action Required</span>
          </div>

          {filteredOverdue.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No Overdue Trainings 🎉" description="All employees are currently on schedule with their assigned training courses." />
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Department & Job Role</th>
                    <th className="p-3.5">Training Course</th>
                    <th className="p-3.5">Deadline</th>
                    <th className="p-3.5 text-center">Days Overdue</th>
                    <th className="p-3.5 text-center">Current Progress</th>
                    <th className="p-3.5 text-right">Assigned By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredOverdue.map((item, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/30 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                        {item.employeeName}
                        <span className="block text-[10px] text-slate-400 font-normal">{item.employeeEmail}</span>
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{item.departmentName}</p>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400">{item.jobRole}</p>
                      </td>
                      <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400">{item.trainingTitle}</td>
                      <td className="p-3.5 font-mono text-slate-500">{formatDate(item.deadline)}</td>
                      <td className="p-3.5 text-center font-extrabold text-rose-600 dark:text-rose-400">
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                          {item.daysOverdue} Days
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold">{item.currentProgress}%</td>
                      <td className="p-3.5 text-right font-medium text-slate-500">{item.assignedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================== */}
      {/* TAB 6: COMPLIANCE LEADERBOARD & MANDATORY COURSES */}
      {/* ================================================== */}
      {activeTab === 'compliance' && (
        <div className="space-y-6 animate-fade-in">
          {/* Department Compliance Leaderboard */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center">
                <Award className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Department Compliance Rankings Leaderboard
              </h3>
              <span className="text-xs text-slate-500 font-medium">Ranked by Real Compliance %</span>
            </div>

            {complianceLeaderboard.length === 0 ? (
              <EmptyState icon={Building2} title="No Departments Found" description="No active departments in your organization." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {complianceLeaderboard.map((d, index) => (
                  <div
                    key={d.departmentId}
                    className={`p-4.5 rounded-2xl border transition-all ${
                      d.status === 'Fully Compliant' ? 'bg-emerald-500/10 border-emerald-500/30' :
                      d.status === 'Needs Attention' ? 'bg-indigo-500/10 border-indigo-500/30' :
                      d.status === 'At Risk' ? 'bg-rose-500/10 border-rose-500/30' :
                      'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                    } space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-500 dark:text-slate-400 font-mono">Rank #{index + 1}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        d.status === 'Fully Compliant' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                        d.status === 'Needs Attention' ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30' :
                        d.status === 'At Risk' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30' :
                        'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {d.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{d.departmentName}</h4>
                      <p className="text-[11px] text-slate-500 font-medium pt-0.5">
                        {d.totalEmployees} Active Employees • {d.totalAssigned} Trainings
                      </p>
                    </div>

                    <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                      <span className="text-xs text-slate-500 font-semibold">{d.completed} / {d.totalAssigned} Completed</span>
                      <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{d.complianceRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mandatory / Auto-Assigned Training Performance */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center">
                <Zap className="w-5 h-5 mr-2 text-amber-500" />
                Compulsory & Auto-Assigned Training Compliance ({mandatoryAnalytics.length})
              </h3>
              <span className="text-xs text-slate-500">Click training card for employee drill-down roster</span>
            </div>

            {mandatoryAnalytics.length === 0 ? (
              <EmptyState icon={Zap} title="No Compulsory Rules Configured" description="No active mandatory auto-assignments are configured." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mandatoryAnalytics.map((m) => (
                  <div
                    key={m.trainingId}
                    onClick={() => setSelectedTrainingModal(m)}
                    className="p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 transition-all cursor-pointer space-y-3 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{m.trainingTitle}</h4>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                            Auto Rule
                          </span>
                        </div>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{m.categoryName} • Deadline {m.customDeadlineDays} days</span>
                      </div>
                      <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{m.complianceRate}%</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                      <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50">
                        <span className="block text-[10px] text-slate-500">Assigned</span>
                        <strong className="text-slate-900 dark:text-white">{m.totalAssigned}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50">
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Completed</span>
                        <strong className="text-emerald-600 dark:text-emerald-400">{m.completed}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50">
                        <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Progress</span>
                        <strong className="text-indigo-600 dark:text-indigo-400">{m.inProgress}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50">
                        <span className="block text-[10px] text-rose-600 dark:text-rose-400 font-semibold">Overdue</span>
                        <strong className="text-rose-600 dark:text-rose-400">{m.overdue}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-amber-700 dark:text-amber-300 font-medium pt-1">
                      <span>Click to view employee progress roster</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAILED EMPLOYEE PROFILE MODAL */}
      {selectedEmpModal && (
        <Modal
          isOpen={Boolean(selectedEmpModal)}
          onClose={() => setSelectedEmpModal(null)}
          title={`Employee Learning Profile — ${selectedEmpModal.name}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <img
                src={selectedEmpModal.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedEmpModal.name}`}
                alt={selectedEmpModal.name}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-700 bg-slate-800"
              />
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-lg">{selectedEmpModal.name}</h4>
                <p className="text-xs text-slate-500">{selectedEmpModal.email}</p>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {selectedEmpModal.departmentName} • {selectedEmpModal.jobRole}
                </p>
              </div>
            </div>

            {/* Assigned Courses List */}
            <div className="space-y-3">
              <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Assigned Training Courses ({selectedEmpModal.assignments.length})
              </h5>

              {selectedEmpModal.assignments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No courses currently assigned.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedEmpModal.assignments.map((a) => (
                    <div key={a.assignmentId} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h6 className="font-bold text-slate-900 dark:text-slate-100">{a.trainingTitle}</h6>
                          {a.isMandatory && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Compulsory</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">Deadline: {formatDate(a.deadline)}</p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 block">{a.progressPercentage}%</span>
                          <span className={`text-[10px] font-semibold ${
                            a.status === 'Completed' ? 'text-emerald-500' :
                            a.status === 'Overdue' ? 'text-rose-500' : 'text-indigo-400'
                          }`}>{a.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* DETAILED TRAINING ROSTER MODAL */}
      {selectedTrainingModal && (
        <Modal
          isOpen={Boolean(selectedTrainingModal)}
          onClose={() => setSelectedTrainingModal(null)}
          title={`Course Enrollment Roster — ${selectedTrainingModal.title}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-base">{selectedTrainingModal.title}</p>
                <p className="text-indigo-600 dark:text-indigo-400 font-semibold">{selectedTrainingModal.categoryName}</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 block">{selectedTrainingModal.completionRate}%</span>
                <span className="text-[10px] text-slate-400">Completion Rate</span>
              </div>
            </div>

            <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Enrolled Employees ({selectedTrainingModal.enrolledEmployees.length})
            </h5>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl">
              {selectedTrainingModal.enrolledEmployees.map((e) => (
                <div key={e.assignmentId} className="p-3 text-xs flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{e.employeeName}</p>
                    <p className="text-[10px] text-slate-400">{e.departmentName} • {e.jobRole}</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{e.progressPercentage}%</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      e.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      e.status === 'Overdue' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                      'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    }`}>{e.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
