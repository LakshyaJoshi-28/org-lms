import React, { useEffect, useState } from 'react';
import {
  getTrainings,
  getDepartments,
  getEmployees,
  assignTraining,
  getAllAssignments,
  createAutoRule,
  getAutoRules,
  deactivateAutoRule,
  reactivateAutoRule
} from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../context/NotificationContext';
import { formatAssignmentType, formatDate } from '../../utils/formatters';
import {
  Zap,
  Target,
  UserPlus,
  BookOpen,
  Building2,
  Calendar,
  Check,
  Users,
  Search,
  CheckSquare,
  Square,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Power,
  Layers,
  Sparkles
} from 'lucide-react';

export const AssignTraining = () => {
  const { addToast } = useNotification();

  // Active Tab: 'auto' | 'targeted'
  const [activeTab, setActiveTab] = useState('auto');

  // Common Data State
  const [trainings, setTrainings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [existingAssignments, setExistingAssignments] = useState([]);
  const [autoRules, setAutoRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab 1: Auto-Assignment Form & Modal State
  const [autoTrainingId, setAutoTrainingId] = useState('');
  const [autoDeadlineDays, setAutoDeadlineDays] = useState(30);
  const [submittingAuto, setSubmittingAuto] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [submittingRuleAction, setSubmittingRuleAction] = useState(false);

  // Tab 2: Targeted Assignment Form State
  const [targetedTrainingId, setTargetedTrainingId] = useState('');
  const [targetMode, setTargetMode] = useState('dept_role'); // 'dept_role' | 'individual'
  const [departmentId, setDepartmentId] = useState('');
  const [jobRole, setJobRole] = useState('ALL_ROLES');
  const [availableJobRoles, setAvailableJobRoles] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [customDeadline, setCustomDeadline] = useState('');
  const [submittingTargeted, setSubmittingTargeted] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [tRes, dRes, eRes, aRes, rRes] = await Promise.all([
        getTrainings(),
        getDepartments(),
        getEmployees(),
        getAllAssignments(),
        getAutoRules()
      ]);

      const published = (tRes.data.data.trainings || []).filter(
        t => t.status === 'published' && t.isPublished === true
      );
      setTrainings(published);
      setDepartments(dRes.data.data.departments || []);
      setEmployees(eRes.data.data.employees || []);
      setExistingAssignments(aRes.data.data.assignments || []);
      setAutoRules(rRes.data.data.rules || []);
    } catch (err) {
      addToast('error', 'Failed to load assignment engine data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Dynamically compute available job roles whenever departmentId, departments, or employees change
  useEffect(() => {
    if (!departmentId) {
      setAvailableJobRoles([]);
      return;
    }

    const selectedDept = departments.find(d => String(d._id) === String(departmentId));
    const deptJobRoles = selectedDept?.jobRoles || [];

    const empJobRoles = employees
      .filter(emp => {
        const empDeptId = typeof emp.departmentId === 'object' ? emp.departmentId?._id : emp.departmentId;
        return String(empDeptId) === String(departmentId) && emp.jobRole;
      })
      .map(emp => emp.jobRole);

    const combined = Array.from(new Set([...deptJobRoles, ...empJobRoles])).filter(Boolean);
    setAvailableJobRoles(combined);
  }, [departmentId, departments, employees]);

  // Department selection handler
  const handleDeptChange = (e) => {
    const dId = e.target.value;
    setDepartmentId(dId);
    setJobRole('ALL_ROLES');
  };

  // Filter employees for Department + Job Role match count
  const matchedDeptRoleEmployees = employees.filter(emp => {
    if (!departmentId) return false;
    const empDeptId = typeof emp.departmentId === 'object' ? emp.departmentId?._id : emp.departmentId;
    if (String(empDeptId) !== String(departmentId)) return false;
    if (jobRole && jobRole !== 'ALL_ROLES' && emp.jobRole !== jobRole) return false;
    return true;
  });

  // Filter individual employees by search term
  const filteredEmployeesForSelection = employees.filter(emp => {
    const term = employeeSearch.toLowerCase();
    const matchesName = emp.name.toLowerCase().includes(term);
    const matchesEmail = emp.email.toLowerCase().includes(term);
    const matchesDept = emp.departmentId?.name?.toLowerCase().includes(term);
    const matchesRole = emp.jobRole?.toLowerCase().includes(term);
    return matchesName || matchesEmail || matchesDept || matchesRole;
  });

  // Individual employee checkbox handlers
  const handleToggleEmployee = (id) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]
    );
  };

  const handleSelectAllEmployees = () => {
    const visibleIds = filteredEmployeesForSelection.map(e => e._id);
    setSelectedEmployeeIds(Array.from(new Set([...selectedEmployeeIds, ...visibleIds])));
  };

  const handleClearEmployeeSelection = () => {
    setSelectedEmployeeIds([]);
  };

  // SUBMIT TAB 1: Auto Assignment
  const handleAutoSubmit = async (e) => {
    e.preventDefault();
    if (!autoTrainingId) {
      addToast('error', 'Please select a published training course');
      return;
    }

    setSubmittingAuto(true);
    try {
      const res = await createAutoRule({
        trainingId: autoTrainingId,
        customDeadlineDays: Number(autoDeadlineDays) || 30
      });
      addToast('success', res.data.message || 'Auto-assignment rule configured!');
      setAutoTrainingId('');
      setAutoDeadlineDays(30);
      fetchAllData();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to create auto-assignment rule');
    } finally {
      setSubmittingAuto(false);
    }
  };

  // Modal Handlers for Deactivate & Reactivate Auto Rule
  const handleOpenDeactivateModal = (rule) => {
    setSelectedRule(rule);
    setShowDeactivateModal(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!selectedRule) return;
    setSubmittingRuleAction(true);
    try {
      await deactivateAutoRule(selectedRule._id);
      addToast('success', 'Auto-assignment rule deactivated');
      setShowDeactivateModal(false);
      setSelectedRule(null);
      fetchAllData();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to deactivate rule');
    } finally {
      setSubmittingRuleAction(false);
    }
  };

  const handleOpenReactivateModal = (rule) => {
    setSelectedRule(rule);
    setShowReactivateModal(true);
  };

  const handleConfirmReactivate = async () => {
    if (!selectedRule) return;
    setSubmittingRuleAction(true);
    try {
      const res = await reactivateAutoRule(selectedRule._id);
      addToast('success', res.data.message || 'Auto-assignment rule reactivated!');
      setShowReactivateModal(false);
      setSelectedRule(null);
      fetchAllData();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to reactivate rule');
    } finally {
      setSubmittingRuleAction(false);
    }
  };

  // SUBMIT TAB 2: Targeted Assignment
  const handleTargetedSubmit = async (e) => {
    e.preventDefault();
    if (!targetedTrainingId) {
      addToast('error', 'Please select a published training course');
      return;
    }

    if (targetMode === 'dept_role') {
      if (!departmentId) {
        addToast('error', 'Please select a Department');
        return;
      }
      if (matchedDeptRoleEmployees.length === 0) {
        addToast('error', 'No active employees match the selected department and job role criteria');
        return;
      }
    } else {
      if (selectedEmployeeIds.length === 0) {
        addToast('error', 'Please select at least one employee from the list');
        return;
      }
    }

    setSubmittingTargeted(true);
    try {
      const payload = {
        trainingId: targetedTrainingId,
        assignmentType: targetMode === 'dept_role' ? 'dept_role' : 'specific',
        departmentId: targetMode === 'dept_role' ? departmentId : undefined,
        jobRole: targetMode === 'dept_role' ? (jobRole || 'ALL_ROLES') : undefined,
        employeeIds: targetMode === 'individual' ? selectedEmployeeIds : undefined,
        customDeadline: customDeadline || null
      };

      const res = await assignTraining(payload);
      addToast('success', res.data.message || 'Training assigned successfully!');

      // Reset Form
      setTargetedTrainingId('');
      setDepartmentId('');
      setJobRole('ALL_ROLES');
      setSelectedEmployeeIds([]);
      setCustomDeadline('');
      setEmployeeSearch('');

      fetchAllData();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to dispatch assignment');
    } finally {
      setSubmittingTargeted(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading Training Assignment Engine..." />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
          <Zap className="w-3.5 h-3.5 mr-1.5" /> Enterprise Dispatch Center
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Training Assignment Engine
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure compulsory organization-wide auto-assignments or dispatch targeted course assignments to departments, roles, and individual employees.
        </p>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex space-x-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('auto')}
          className={`flex items-center px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'auto'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 mr-2 text-amber-400" />
          TAB 1 — AUTO ASSIGNMENT
          {autoRules.filter(r => r.status === 'active').length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
              {autoRules.filter(r => r.status === 'active').length} Active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('targeted')}
          className={`flex items-center px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'targeted'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Target className="w-4 h-4 mr-2 text-indigo-400" />
          TAB 2 — TARGETED ASSIGNMENT
        </button>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Selected Tab Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* ================================================== */}
          {/* TAB 1: AUTO ASSIGNMENT */}
          {/* ================================================== */}
          {activeTab === 'auto' && (
            <div className="space-y-6 animate-fade-in">
              {/* Explanation Card */}
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-amber-600 dark:text-amber-400 text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Compulsory Organization Auto-Assignment</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Automatically assign compulsory compliance training (e.g. POSH, Workplace Ethics, InfoSec, Company Policies) to <strong>ALL existing employees immediately</strong>, and to <strong>ALL future employees</strong> when they register and complete their profile.
                </p>
              </div>

              {/* Configure Auto Assignment Form */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center">
                  <ShieldCheck className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Configure New Auto-Assignment Rule
                </h3>

                {trainings.length === 0 ? (
                  <EmptyState
                    icon={AlertTriangle}
                    title="No Published Trainings Available"
                    description="You must publish at least one training course before configuring an auto-assignment rule."
                  />
                ) : (
                  <form onSubmit={handleAutoSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Select Published Training <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={autoTrainingId}
                        onChange={(e) => setAutoTrainingId(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                      >
                        <option value="">Choose Compulsory Published Training</option>
                        {trainings.map(t => (
                          <option key={t._id} value={t._id} className="bg-slate-900 text-white">
                            {t.title} ({t.category?.name || 'General'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Completion Deadline (Days from Assignment)
                      </label>
                      <input
                        type="number"
                        value={autoDeadlineDays}
                        onChange={(e) => setAutoDeadlineDays(e.target.value)}
                        required
                        min={1}
                        max={365}
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Employees will receive this exact deadline window starting from when the training is assigned to them.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingAuto}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white shadow-lg shadow-amber-500/25 transition-all inline-flex items-center justify-center"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {submittingAuto ? 'Enabling Auto-Assignment...' : 'Enable Compulsory Auto-Assignment'}
                    </button>
                  </form>
                )}
              </div>

              {/* Configured Auto Assignments Section */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center justify-between">
                  <span>Currently Configured Auto Assignments</span>
                  <span className="text-xs text-slate-400 font-normal">({autoRules.length} Rules)</span>
                </h3>

                {autoRules.length === 0 ? (
                  <EmptyState
                    icon={Zap}
                    title="No Auto Assignments Configured"
                    description="Configure an auto-assignment rule above to automatically assign compulsory courses to all employees."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-950/60 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">Training Course</th>
                          <th className="p-3">Coverage</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Created Date</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {autoRules.map((rule) => (
                          <tr key={rule._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                              {rule.trainingId?.title || 'Training Course'}
                              <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">
                                {rule.trainingId?.category?.name || 'Compulsory'}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-slate-600 dark:text-slate-400">
                              {rule.coverageCount || 0} Employees
                            </td>
                             <td className="p-3">
                              {rule.status === 'active' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  ✓ Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                                  ○ Deactivated Rule
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-500">
                              {new Date(rule.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-right">
                              {rule.status === 'active' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeactivateModal(rule)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-colors inline-flex items-center cursor-pointer"
                                >
                                  <Power className="w-3.5 h-3.5 mr-1 text-rose-500" /> Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReactivateModal(rule)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-colors inline-flex items-center cursor-pointer"
                                >
                                  <Zap className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Reactivate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 2: TARGETED ASSIGNMENT */}
          {/* ================================================== */}
          {activeTab === 'targeted' && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-6 animate-fade-in">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center">
                <Target className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Dispatch Targeted Training
              </h3>

              {trainings.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="No Published Trainings Available"
                  description="You must publish at least one training course before dispatching targeted assignments."
                />
              ) : (
                <form onSubmit={handleTargetedSubmit} className="space-y-6">
                  {/* STEP 1: Select Training */}
                  <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
                    <label className="block text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      STEP 1 — Select Published Training <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={targetedTrainingId}
                      onChange={(e) => setTargetedTrainingId(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    >
                      <option value="">Select Published Training Course</option>
                      {trainings.map(t => (
                        <option key={t._id} value={t._id} className="bg-slate-900 text-white">
                          {t.title} ({t.category?.name || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* STEP 2: Assignment Target */}
                  <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
                    <label className="block text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      STEP 2 — Choose Assignment Target <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Option A Card */}
                      <div
                        onClick={() => setTargetMode('dept_role')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          targetMode === 'dept_role'
                            ? 'bg-indigo-500/10 border-indigo-600 dark:border-indigo-500 shadow-md'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center">
                            <Building2 className="w-4 h-4 mr-2 text-indigo-500" />
                            Option A: Department & Job Role Match
                          </span>
                          <input
                            type="radio"
                            name="targetMode"
                            checked={targetMode === 'dept_role'}
                            onChange={() => setTargetMode('dept_role')}
                          />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Assign this training to all employees matching a selected department and job role.
                        </p>
                      </div>

                      {/* Option B Card */}
                      <div
                        onClick={() => setTargetMode('individual')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          targetMode === 'individual'
                            ? 'bg-indigo-500/10 border-indigo-600 dark:border-indigo-500 shadow-md'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center">
                            <Users className="w-4 h-4 mr-2 text-purple-500" />
                            Option B: Select Individual Employees
                          </span>
                          <input
                            type="radio"
                            name="targetMode"
                            checked={targetMode === 'individual'}
                            onChange={() => setTargetMode('individual')}
                          />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Select one or more specific employees from a searchable multi-select list.
                        </p>
                      </div>
                    </div>

                    {/* STEP 3: Configure Target Fields */}
                    {targetMode === 'dept_role' ? (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Select Department <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={departmentId}
                              onChange={handleDeptChange}
                              required={targetMode === 'dept_role'}
                              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm cursor-pointer"
                            >
                              <option value="">Choose Department</option>
                              {departments.map(d => (
                                <option key={d._id} value={d._id} className="bg-slate-900 text-white">{d.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Select Job Role <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={jobRole}
                              onChange={(e) => setJobRole(e.target.value)}
                              required={targetMode === 'dept_role'}
                              disabled={!departmentId}
                              className={`w-full px-4 py-2.5 rounded-xl glass-input text-sm ${
                                !departmentId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              {!departmentId ? (
                                <option value="">Select Department First</option>
                              ) : (
                                <>
                                  <option value="ALL_ROLES">All Job Roles in Department</option>
                                  {availableJobRoles.map(r => (
                                    <option key={r} value={r} className="bg-slate-900 text-white">{r}</option>
                                  ))}
                                </>
                              )}
                            </select>
                          </div>
                        </div>

                        {departmentId && (
                          <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                            matchedDeptRoleEmployees.length > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}>
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-2" />
                              Matched Employees in Organization:
                            </span>
                            <span className="font-bold text-sm">{matchedDeptRoleEmployees.length} Employees</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Option B: Individual Employees Selection Card */
                      <div className="space-y-3 pt-2">
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center">
                              <Users className="w-4 h-4 mr-1.5 text-indigo-500" />
                              Select Employees ({selectedEmployeeIds.length} Selected)
                            </h4>

                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={handleSelectAllEmployees}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30"
                              >
                                Select All Filtered
                              </button>
                              <button
                                type="button"
                                onClick={handleClearEmployeeSelection}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700"
                              >
                                Clear Selection
                              </button>
                            </div>
                          </div>

                          {/* Search Input */}
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                              type="text"
                              value={employeeSearch}
                              onChange={(e) => setEmployeeSearch(e.target.value)}
                              placeholder="Search employees by name, email, department, or job role..."
                              className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs"
                            />
                          </div>

                          {/* Employee List with Checkboxes */}
                          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                            {filteredEmployeesForSelection.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-6">No matching employees found.</p>
                            ) : (
                              filteredEmployeesForSelection.map((emp) => {
                                const isSelected = selectedEmployeeIds.includes(emp._id);
                                return (
                                  <div
                                    key={emp._id}
                                    onClick={() => handleToggleEmployee(emp._id)}
                                    className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                      isSelected ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleEmployee(emp._id)}
                                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                      />
                                      <img
                                        src={emp.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}`}
                                        alt={emp.name}
                                        className="w-8 h-8 rounded-lg object-cover bg-slate-800 border border-slate-700"
                                      />
                                      <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100">{emp.name}</p>
                                        <p className="text-[11px] text-slate-500">{emp.email}</p>
                                      </div>
                                    </div>

                                    <div className="text-right text-[11px]">
                                      <p className="font-semibold text-indigo-600 dark:text-indigo-300">
                                        {emp.departmentId?.name || 'No Dept'}
                                      </p>
                                      <p className="text-slate-400">{emp.jobRole || 'No Role'}</p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* STEP 3: Completion Deadline */}
                  <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
                    <label className="block text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      STEP 3 — Custom Completion Deadline (Optional)
                    </label>
                    <input
                      type="date"
                      value={customDeadline}
                      onChange={(e) => setCustomDeadline(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    />
                    <p className="text-[11px] text-slate-500">
                      If left blank, the default deadline (30 days) will be automatically applied.
                    </p>
                  </div>

                  {/* STEP 4: Dispatch Button */}
                  <button
                    type="submit"
                    disabled={submittingTargeted}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 transition-all inline-flex items-center justify-center cursor-pointer"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {submittingTargeted ? 'Dispatching Training Assignment...' : 'Dispatch Training Assignment'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Side Column (Desktop): RECENT ASSIGNMENTS */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 max-h-[850px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-purple-500" /> Recent Assignments
            </h3>
            <span className="text-xs text-slate-400 font-normal">({existingAssignments.length})</span>
          </div>

          {existingAssignments.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No Dispatched Assignments"
              description="Dispatched training assignments will appear here in real time."
            />
          ) : (
            <div className="space-y-3">
              {existingAssignments.slice(0, 15).map((a) => (
                <div
                  key={a._id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2 transition-all hover:border-indigo-500/40"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm line-clamp-1">
                        {a.trainingId?.title || 'Training Course'}
                      </h4>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                        {a.trainingId?.categoryId?.name || 'Category'}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      a.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                      a.status === 'Overdue' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30' :
                      'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                    }`}>
                      {a.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Target Type:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/10 dark:bg-indigo-950/50 text-[10px] border border-indigo-500/20">
                        {formatAssignmentType(a.assignmentType)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 pt-0.5">
                      <img
                        src={a.employeeId?.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${a.employeeId?.name}`}
                        alt={a.employeeId?.name}
                        className="w-5 h-5 rounded-md object-cover border border-slate-700 bg-slate-800"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200">{a.employeeId?.name || 'Employee'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center font-medium">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                      Deadline: <strong className="text-slate-900 dark:text-slate-100 ml-1">{formatDate(a.deadline)}</strong>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDate(a.createdAt || a.assignedDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL: DEACTIVATE AUTO-ASSIGNMENT */}
      {showDeactivateModal && selectedRule && (
        <Modal
          isOpen={showDeactivateModal}
          onClose={() => !submittingRuleAction && setShowDeactivateModal(false)}
          title="Deactivate Auto-Assignment?"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
              <span className="font-bold text-rose-600 dark:text-rose-400 uppercase text-[10px] tracking-wider">
                Compulsory Training Rule
              </span>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {selectedRule.trainingId?.title || 'Training Course'}
              </h4>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Future eligible employees will no longer receive this training automatically while this rule is inactive.
            </p>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={submittingRuleAction}
                onClick={() => setShowDeactivateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingRuleAction}
                onClick={handleConfirmDeactivate}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-500/20 cursor-pointer inline-flex items-center"
              >
                <Power className="w-3.5 h-3.5 mr-1.5" />
                {submittingRuleAction ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMATION MODAL: REACTIVATE AUTO-ASSIGNMENT */}
      {showReactivateModal && selectedRule && (
        <Modal
          isOpen={showReactivateModal}
          onClose={() => !submittingRuleAction && setShowReactivateModal(false)}
          title="Reactivate Auto-Assignment?"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-wider">
                Compulsory Training Rule
              </span>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {selectedRule.trainingId?.title || 'Training Course'}
              </h4>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will reactivate automatic assignment for this training for future eligible employees.
            </p>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={submittingRuleAction}
                onClick={() => setShowReactivateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingRuleAction}
                onClick={handleConfirmReactivate}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20 cursor-pointer inline-flex items-center"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                {submittingRuleAction ? 'Reactivating...' : 'Reactivate'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
