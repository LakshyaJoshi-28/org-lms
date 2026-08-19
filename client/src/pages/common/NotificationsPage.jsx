import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  CheckCheck,
  CheckCircle,
  XCircle,
  BookOpen,
  FileCheck2,
  Clock,
  UserPlus,
  Lock,
  Unlock,
  Award,
  AlertCircle,
  Sparkles
} from 'lucide-react';

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotification();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const getNotifIcon = (type) => {
    switch (type) {
      case 'NEW_EMPLOYEE_REGISTERED':
      case 'INSTRUCTOR_ADDED':
        return <UserPlus className="w-5 h-5 text-purple-400" />;
      case 'NEW_TRAINING_CREATED':
      case 'TRAINING_ASSIGNED':
        return <BookOpen className="w-5 h-5 text-blue-400" />;
      case 'ASSIGNMENT_SUBMITTED':
      case 'ASSIGNMENT_REVIEWED':
      case 'INSTRUCTOR_FEEDBACK':
        return <FileCheck2 className="w-5 h-5 text-indigo-400" />;
      case 'QUIZ_PASSED':
      case 'TRAINING_COMPLETED':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'QUIZ_FAILED':
        return <XCircle className="w-5 h-5 text-rose-400" />;
      case 'DEADLINE_EXTENDED':
        return <Clock className="w-5 h-5 text-amber-400" />;
      case 'TRAINING_LOCKED':
        return <Lock className="w-5 h-5 text-rose-400" />;
      case 'TRAINING_UNLOCKED':
        return <Unlock className="w-5 h-5 text-emerald-400" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-400" />;
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      markAsRead(n.id || n._id);
    }

    const role = user?.role;
    const entityType = n.relatedEntity?.entityType || n.relatedEntityType;
    const entityId = n.relatedEntity?.entityId || n.relatedEntityId;

    if (role === 'Admin') {
      if (entityType === 'Training') navigate('/admin/categories');
      else if (entityType === 'AssignmentSubmission') navigate('/admin/reports');
      else navigate('/admin');
    } else if (role === 'Instructor') {
      if (entityType === 'AssignmentSubmission') navigate('/instructor/submissions');
      else if (entityType === 'TrainingAssignment' || n.type === 'DEADLINE_EXTENDED') navigate('/instructor/deadlines');
      else navigate('/instructor/trainings');
    } else if (role === 'Employee') {
      if (entityType === 'AssignmentSubmission' || n.type === 'INSTRUCTOR_FEEDBACK') navigate('/employee/feedback');
      else navigate('/employee/my-trainings');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <Bell className="w-8 h-8 text-indigo-400" />
            <h1 className="text-3xl font-black text-white tracking-tight">Notifications Center</h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time updates, activity alerts, and operational notifications for your LMS account.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="py-2.5 px-4 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'glass-panel text-slate-400 hover:text-white'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'unread'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'glass-panel text-slate-400 hover:text-white'
          }`}
        >
          Unread Only ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 space-y-3">
            <Sparkles className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">No notifications found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {filter === 'unread' ? "You've read all your notifications!" : "You don't have any notifications right now."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id || n._id}
              onClick={() => handleNotificationClick(n)}
              className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer flex items-start space-x-4 hover:border-indigo-500/40 hover:shadow-lg ${
                !n.isRead
                  ? 'border-indigo-500/50 bg-indigo-950/20 shadow-indigo-500/5'
                  : 'border-slate-800/80 opacity-80'
              }`}
            >
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex-shrink-0 mt-0.5">
                {getNotifIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-sm font-bold text-white truncate">{n.title}</h4>
                  <span className="text-[10px] text-slate-500 flex-shrink-0">
                    {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-2">{n.message}</p>

                <div className="flex items-center space-x-2">
                  {!n.isRead && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Unread
                    </span>
                  )}
                  {n.type === 'ASSIGNMENT_SUBMITTED' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Action Required
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
