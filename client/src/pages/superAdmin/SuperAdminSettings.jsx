import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { updateProfile, updateProfilePicture, resetProfilePicture, changePassword } from '../../services/api';
import {
  User,
  Mail,
  ShieldCheck,
  Upload,
  RefreshCw,
  KeyRound,
  Check,
  Save,
  Sparkles,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

export const SuperAdminSettings = () => {
  const { user, setUser } = useAuth();
  const { addToast } = useNotification();

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resetAvatarPending, setResetAvatarPending] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  // Clean up Object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle local file selection for instant preview
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('error', 'Image size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setResetAvatarPending(false);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Handle local avatar reset selection
  const handleResetAvatarSelect = () => {
    setSelectedFile(null);
    setResetAvatarPending(true);
    const defaultDicebear = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'Super Admin')}`;
    setPreviewUrl(defaultDicebear);
  };

  // Save Profile Details & Avatar
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    const isNameChanged = name.trim() !== (user?.name || '');
    const hasImageToUpload = !!selectedFile;
    const hasResetPending = resetAvatarPending;

    if (!isNameChanged && !hasImageToUpload && !hasResetPending) {
      addToast('info', 'No changes to save');
      return;
    }

    setSavingProfile(true);
    let latestUser = user;

    try {
      // 1. Handle Profile Picture update or reset
      if (hasImageToUpload) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const picRes = await updateProfilePicture(formData);
        if (picRes?.data?.data?.user) {
          latestUser = picRes.data.data.user;
        }
      } else if (hasResetPending) {
        const resetRes = await resetProfilePicture();
        if (resetRes?.data?.data?.user) {
          latestUser = resetRes.data.data.user;
        }
      }

      // 2. Handle Name update
      if (isNameChanged) {
        const profileRes = await updateProfile({ name: name.trim() });
        if (profileRes?.data?.data?.user) {
          latestUser = profileRes.data.data.user;
        }
      }

      // 3. Update Auth Context directly without triggering getMe()
      setUser(latestUser);
      setSelectedFile(null);
      setPreviewUrl(null);
      setResetAvatarPending(false);

      addToast('success', 'Account settings saved successfully!');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to save account settings');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      addToast('error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      addToast('error', 'New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('error', 'New passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      addToast('success', 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const currentDisplayAvatar =
    previewUrl ||
    user?.profilePicture ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'SuperAdmin'}`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden glass-panel bg-gradient-to-r from-rose-900/40 via-slate-900/60 to-indigo-950/40 p-6 sm:p-8 rounded-3xl border border-rose-500/20 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-5 text-center md:text-left">
            <div className="relative">
              <img
                src={currentDisplayAvatar}
                alt={user?.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-rose-500/50 shadow-xl bg-slate-950"
              />
              <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white rounded-full shadow-lg border border-rose-400/30">
                Super Admin
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight flex items-center justify-center md:justify-start gap-2">
                <span>{user?.name || 'Super Admin'}</span>
                <Sparkles className="w-5 h-5 text-rose-400 animate-pulse" />
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">{user?.email}</p>
              <div className="mt-2 flex items-center justify-center md:justify-start gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  System Platform Owner
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400 font-medium">Access Control</p>
              <p className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                Unrestricted Access
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Account Profile Settings */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xl space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Profile & Identity</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage your public profile name and avatar image
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Profile Picture Upload & Preview */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                  Profile Picture
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <div className="relative group">
                    <img
                      src={currentDisplayAvatar}
                      alt="Avatar Preview"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-lg bg-slate-900"
                    />
                    {(previewUrl || selectedFile || resetAvatarPending) && (
                      <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[9px] font-extrabold uppercase bg-amber-500 text-slate-950 rounded-full shadow">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Upload a square image (JPEG, PNG, GIF up to 5MB). Changes will apply when you click <span className="font-bold text-indigo-600 dark:text-indigo-400">Save Changes</span>.
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                      <label className="cursor-pointer inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition-colors">
                        <Upload className="w-3.5 h-3.5 mr-2" />
                        Choose Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>

                      {(user?.isCustomAvatar || previewUrl) && (
                        <button
                          type="button"
                          onClick={handleResetAvatarSelect}
                          className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-2" />
                          Reset to Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Email Address (Read-only) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Email Address <span className="text-slate-400 text-[10px] font-normal">(Primary System Email)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* System Role (Read-only) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Assigned Platform Role
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-rose-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value="SuperAdmin (Highest Authority)"
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-xs font-medium text-rose-600 dark:text-rose-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Submit Save Profile */}
              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Profile Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Security & Password Change */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xl space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Security & Auth</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update Super Admin account password
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Check className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Submit Update Password */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25 transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {savingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 mr-2" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
