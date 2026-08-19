import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  FolderKanban,
  UserPlus,
  BarChart3,
  ShieldAlert,
  BookOpen,
  FileCheck2,
  Clock,
  GraduationCap,
  MessageSquare
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();

  if (!user) return null;

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/departments', label: 'Departments & Roles', icon: Building2 },
    { to: '/admin/users', label: 'Users Directory & Status', icon: Users },
    { to: '/admin/categories', label: 'Training Categories', icon: FolderKanban },
    { to: '/admin/assign', label: 'Assign Training Engine', icon: UserPlus },
    { to: '/admin/reports', label: 'Org Reports & Analytics', icon: BarChart3 },
    { to: '/admin/audit-logs', label: 'Security Audit Logs', icon: ShieldAlert }
  ];

  const instructorLinks = [
    { to: '/instructor', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/instructor/trainings', label: 'My Trainings & Syllabus', icon: BookOpen },
    { to: '/instructor/submissions', label: 'Assignment Submissions', icon: FileCheck2 },
    { to: '/instructor/deadlines', label: 'Overdue & Lock Controls', icon: Clock }
  ];

  const employeeLinks = [
    { to: '/employee', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/employee/my-trainings', label: 'My Assigned Trainings', icon: GraduationCap },
    { to: '/employee/feedback', label: 'Feedback', icon: MessageSquare },
    { to: '/employee/report', label: 'Personal Report & Stats', icon: BarChart3 }
  ];

  const superAdminLinks = [
    { to: '/super-admin', label: 'Organizations Console', icon: Building2, end: true }
  ];

  const links =
    user.role === 'SuperAdmin' ? superAdminLinks :
    user.role === 'Admin' ? adminLinks :
    user.role === 'Instructor' ? instructorLinks :
    employeeLinks;

  return (
    <aside className="w-64 glass-panel bg-white/70 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800/80 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between transition-colors">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Navigation Menu
          </p>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 mr-3" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center">
        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">IT360 Enterprise LMS</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Version 1.0 • MERN Architecture</p>
      </div>
    </aside>
  );
};
