import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

// Auth Pages
import { Login } from '../pages/auth/Login';
import { EmployeeRegister } from '../pages/auth/EmployeeRegister';
import { OrgSetup } from '../pages/auth/OrgSetup';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { Departments } from '../pages/admin/Departments';
import { UsersManager } from '../pages/admin/UsersManager';
import { CategoriesManager } from '../pages/admin/CategoriesManager';
import { AssignTraining } from '../pages/admin/AssignTraining';
import { Reports as AdminReports } from '../pages/admin/Reports';
import { AuditLogs } from '../pages/admin/AuditLogs';

// Instructor Pages
import { InstructorDashboard } from '../pages/instructor/InstructorDashboard';
import { MyTrainings as InstructorTrainings } from '../pages/instructor/MyTrainings';
import { CourseBuilder } from '../pages/instructor/CourseBuilder';
import { SubmissionsReviewer } from '../pages/instructor/SubmissionsReviewer';
import { DeadlineManager } from '../pages/instructor/DeadlineManager';

// Employee Pages
import { EmployeeDashboard } from '../pages/employee/EmployeeDashboard';
import { MyTrainings as EmployeeTrainings } from '../pages/employee/MyTrainings';
import { TrainingPlayer } from '../pages/employee/TrainingPlayer';
import { EmployeeFeedback } from '../pages/employee/EmployeeFeedback';
import { MyReport } from '../pages/employee/MyReport';

const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Admin') return <Navigate to="/admin" replace />;
  if (user.role === 'Instructor') return <Navigate to="/instructor" replace />;
  return <Navigate to="/employee" replace />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register-employee" element={<EmployeeRegister />} />
        <Route path="/setup-org" element={<OrgSetup />} />
      </Route>

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
        <Route element={<MainLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/departments" element={<Departments />} />
          <Route path="/admin/users" element={<UsersManager />} />
          <Route path="/admin/categories" element={<CategoriesManager />} />
          <Route path="/admin/assign" element={<AssignTraining />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
        </Route>
      </Route>

      {/* Protected Instructor Routes */}
      <Route element={<ProtectedRoute allowedRoles={['Instructor']} />}>
        <Route element={<MainLayout />}>
          <Route path="/instructor" element={<InstructorDashboard />} />
          <Route path="/instructor/trainings" element={<InstructorTrainings />} />
          <Route path="/instructor/course-builder/new" element={<CourseBuilder />} />
          <Route path="/instructor/course-builder/:id" element={<CourseBuilder />} />
          <Route path="/instructor/submissions" element={<SubmissionsReviewer />} />
          <Route path="/instructor/deadlines" element={<DeadlineManager />} />
        </Route>
      </Route>

      {/* Protected Employee Routes */}
      <Route element={<ProtectedRoute allowedRoles={['Employee']} />}>
        <Route element={<MainLayout />}>
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route path="/employee/my-trainings" element={<EmployeeTrainings />} />
          <Route path="/employee/feedback" element={<EmployeeFeedback />} />
          <Route path="/employee/player/:assignmentId" element={<TrainingPlayer />} />
          <Route path="/employee/report" element={<MyReport />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};
