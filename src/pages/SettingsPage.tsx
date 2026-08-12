import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import {
  Settings,
  Save,
  Check,
  LogOut,
  ShieldCheck,
  Download,
  Trash2,
  Bell,
  Clock,
  Globe,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface SettingsPageProps {
  user: User;
  onUserUpdated: (updatedUser: User) => void;
  onLogout?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onUserUpdated, onLogout }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio || '');

  // Preferences State
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState(60);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  // Notification Toggles
  const [notifGroupMessages, setNotifGroupMessages] = useState(true);
  const [notifMentions, setNotifMentions] = useState(true);
  const [notifReminders, setNotifReminders] = useState(true);
  const [notifAchievements, setNotifAchievements] = useState(true);

  // Status
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Account Deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateProfile(name, email, bio);
      onUserUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      await api.exportUserData();
    } catch (err) {
      console.error('Failed to export data:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput.trim().toUpperCase() !== 'DELETE') return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAccount();
      if (onLogout) onLogout();
      window.location.href = '/';
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 select-none pb-24 md:pb-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-pink-600" />
          <span>Account & Preferences</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Manage your StudyNest profile, daily target preferences, notification settings, and data exports.
        </p>
      </div>

      {/* 1. PROFILE SETTINGS */}
      <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl bg-white border border-pink-200 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-pink-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-pink-600" />
            <span>Profile Information</span>
          </h3>
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> Changes saved!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-1">Bio / Learning Goal Statement</label>
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="e.g. Building daily study habits in Python & Web Development"
            className="w-full px-4 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 font-medium"
          />
        </div>

        <div className="pt-2 flex justify-between items-center">
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all ml-auto"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>

      {/* 2. STUDY PREFERENCES & TIMEZONE */}
      <div className="p-6 rounded-3xl bg-white border border-pink-200 shadow-2xs space-y-5">
        <h3 className="text-sm font-black text-slate-900 border-b border-pink-100 pb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>Study Target & Timezone</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">Default Daily Target (Minutes)</label>
            <select
              value={dailyTargetMinutes}
              onChange={(e) => setDailyTargetMinutes(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-pink-500"
            >
              <option value={15}>15 Minutes / day (Casual)</option>
              <option value={30}>30 Minutes / day (Steady)</option>
              <option value={45}>45 Minutes / day (Focused)</option>
              <option value={60}>60 Minutes / day (Recommended)</option>
              <option value={90}>90 Minutes / day (Intensive)</option>
              <option value={120}>120 Minutes / day (Deep Learning)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-500" /> Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-pink-500"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">Eastern Time (US & Canada)</option>
              <option value="America/Chicago">Central Time (US & Canada)</option>
              <option value="America/Denver">Mountain Time (US & Canada)</option>
              <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
              <option value="Europe/London">London (GMT / BST)</option>
              <option value="Europe/Paris">Paris / Berlin (CET)</option>
              <option value="Asia/Kolkata">India Standard Time (IST)</option>
              <option value="Asia/Singapore">Singapore (SGT)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Australia/Sydney">Sydney (AEST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. NOTIFICATION PREFERENCES */}
      <div className="p-6 rounded-3xl bg-white border border-pink-200 shadow-2xs space-y-4">
        <h3 className="text-sm font-black text-slate-900 border-b border-pink-100 pb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          <span>Notification Preferences</span>
        </h3>

        <div className="space-y-3">
          {[
            { id: 'group', label: 'Group Chat Messages', state: notifGroupMessages, set: setNotifGroupMessages, desc: 'Real-time messages from study group members' },
            { id: 'mentions', label: 'Group Mentions & Invites', state: notifMentions, set: setNotifMentions, desc: 'Direct mentions or group invite notifications' },
            { id: 'reminders', label: 'Daily Study Reminders', state: notifReminders, set: setNotifReminders, desc: 'Timely reminders when today’s target is pending' },
            { id: 'achievements', label: 'Achievements & Level-Ups', state: notifAchievements, set: setNotifAchievements, desc: 'Celebratory notifications for unlocking badges & XP milestones' },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-pink-50/30 border border-pink-100">
              <div>
                <p className="text-xs font-black text-slate-900">{item.label}</p>
                <p className="text-[10px] text-slate-500 font-medium">{item.desc}</p>
              </div>

              <button
                type="button"
                onClick={() => item.set(!item.state)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  item.state ? 'bg-pink-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    item.state ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. DATA EXPORT */}
      <div className="p-6 rounded-3xl bg-white border border-pink-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export Personal Data</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Download a complete JSON archive of your study plans, video watch logs, notes, achievements, and statistics.
            </p>
          </div>

          <button
            onClick={handleExportData}
            disabled={exporting}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Exporting...' : 'Export JSON Data'}</span>
          </button>
        </div>
      </div>

      {/* 5. DANGER ZONE: ACCOUNT DELETION */}
      <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-rose-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Danger Zone: Delete Account</span>
            </h3>
            <p className="text-xs text-rose-700 font-medium">
              Permanently delete your StudyNest account and all associated study plans, history, and notes.
            </p>
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition shrink-0"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-rose-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">Are you absolutely sure?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                This action <strong className="text-rose-600">cannot be undone</strong>. This will permanently delete your StudyNest account, all study plans, notes, streaks, and remove you from study groups.
              </p>
            </div>

            {deleteError && (
              <p className="p-2.5 rounded-xl bg-rose-50 text-rose-800 text-xs font-bold text-center border border-rose-200">
                {deleteError}
              </p>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Type <span className="font-mono font-black text-rose-600">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2.5 bg-rose-50/50 border border-rose-200 rounded-xl text-xs font-mono font-black text-slate-900 focus:outline-none focus:border-rose-500 text-center"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmInput('');
                  setDeleteError(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmInput.trim().toUpperCase() !== 'DELETE' || deleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl font-black text-xs transition shadow-md"
              >
                {deleting ? 'Deleting...' : 'Confirm Permanent Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
