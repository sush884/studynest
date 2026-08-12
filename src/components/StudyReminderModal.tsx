import React, { useState, useEffect } from 'react';
import { BellRing, Clock, X, Check } from 'lucide-react';
import { api } from '../services/api';

interface StudyReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudyReminderModal: React.FC<StudyReminderModalProps> = ({ isOpen, onClose }) => {
  const [enabled, setEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getReminderSettings().then((settings) => {
        setEnabled(settings.enabled);
        setReminderTime(settings.reminderTime || '20:00');
      });

      if ('Notification' in window) {
        setPermissionGranted(Notification.permission === 'granted');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      const res = await Notification.requestPermission();
      setPermissionGranted(res === 'granted');
      if (res === 'granted') {
        setEnabled(true);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateReminderSettings(enabled, reminderTime);
      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to save reminder settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full border border-pink-200 shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Daily Study Reminders</h3>
            <p className="text-xs text-slate-500">Never break your study streak</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Toggle enable */}
          <div className="p-4 bg-pink-50/60 rounded-2xl border border-pink-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Enable Daily Reminders</span>
              <span className="text-[11px] text-slate-500 block">
                Receive notifications when it's time to study
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!enabled && !permissionGranted) {
                  handleRequestPermission();
                } else {
                  setEnabled(!enabled);
                }
              }}
              className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                enabled ? 'bg-pink-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Time Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-pink-500" />
              Reminder Time
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              disabled={!enabled}
              className="w-full px-4 py-2.5 bg-slate-50 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500 disabled:opacity-50 font-bold"
            />
          </div>

          {/* Browser Permission Prompt */}
          {!permissionGranted && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
              <span>Browser notifications required</span>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-2.5 py-1 bg-amber-500 text-white font-bold rounded-lg text-[10px] hover:bg-amber-600 shrink-0 ml-2"
              >
                Allow
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 justify-center">
              <Check className="w-4 h-4" /> Reminder settings saved!
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
