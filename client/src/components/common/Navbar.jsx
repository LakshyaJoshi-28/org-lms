import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { ProfileModal } from '../profile/ProfileModal';
import { ChangePasswordModal } from '../profile/ChangePasswordModal';
import { Bell, User, KeyRound, LogOut, CheckCheck, Sparkles, Building, Sun, Moon } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotification();
  const { isDark, toggleTheme } = useTheme();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const roleColors = {
    SuperAdmin: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-300',
    Admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300',
    Instructor: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300',
    Employee: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300'
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-16 glass-panel bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between transition-colors">
        {/* Left: Branding & Org Name */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="flex items-center">
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white font-heading">
              IT360 <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm ml-0.5">LMS</span>
            </span>
          </div>

          {user?.organizationId && (
            <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 text-xs text-slate-700 dark:text-slate-300">
              <Building className="w-3.5 h-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" />
              <span>{user.organizationId.name}</span>
            </div>
          )}
        </div>

        {/* Right: Theme Toggle, Role Badge, Notifications & Profile Dropdown */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus:outline-none"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>

          {/* Role Badge */}
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${roleColors[user?.role] || 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
            {user?.role === 'Admin' ? 'Org Admin' : user?.role}
          </span>

          {/* Notifications Bell */}
          {user?.role !== 'SuperAdmin' && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                  setShowUserDropdown(false);
                }}
                className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus:outline-none"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-indigo-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden z-50 animate-fade-in">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Notifications</h4>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5 mr-1" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        No notifications available
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id || n._id}
                          onClick={() => markAsRead(n.id || n._id)}
                          className={`p-3.5 text-xs transition-colors cursor-pointer ${
                            !n.isRead ? 'bg-indigo-50 dark:bg-indigo-950/20 border-l-2 border-indigo-600 dark:border-indigo-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-80'
                          }`}
                        >
                          <h5 className="font-semibold text-slate-900 dark:text-slate-200 mb-0.5">{n.title}</h5>
                          <p className="text-slate-600 dark:text-slate-300 mb-1">{n.message}</p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-center">
                    <button
                      onClick={() => {
                        setShowNotifDropdown(false);
                        const path = user?.role === 'Admin' ? '/admin/notifications' :
                                     user?.role === 'Instructor' ? '/instructor/notifications' :
                                     '/employee/notifications';
                        window.location.href = path;
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer py-1"
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowNotifDropdown(false);
              }}
              className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus:outline-none border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50"
            >
              <img
                src={user?.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
                alt={user?.name}
                className="w-8 h-8 rounded-xl object-cover border border-indigo-500/30 bg-slate-100 dark:bg-slate-800"
              />
              <span className="hidden sm:inline font-semibold text-xs text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                {user?.name}
              </span>
            </button>

            {/* Profile Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-60 glass-panel bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/60 p-2 z-50 animate-fade-in space-y-1">
                <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 mb-1">
                  <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                </div>

                <button
                  onClick={() => {
                    setShowProfileModal(true);
                    setShowUserDropdown(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <User className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Account Settings
                </button>

                <button
                  onClick={() => {
                    setShowPassModal(true);
                    setShowUserDropdown(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <KeyRound className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                  Change Password
                </button>

                <div className="pt-1 border-t border-slate-200 dark:border-slate-800 mt-1">
                  <button
                    onClick={logout}
                    className="w-full flex items-center px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <ChangePasswordModal isOpen={showPassModal} onClose={() => setShowPassModal(false)} />
    </>
  );
};
