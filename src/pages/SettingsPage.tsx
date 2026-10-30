import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Palette, 
  Lock, 
  Trash2, 
  Check, 
  AlertTriangle, 
  Moon, 
  Sun, 
  Eye, 
  MessageSquare,
  X 
} from 'lucide-react';

interface SettingsPageProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  accentColor: string;
  onChangeAccentColor: (color: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  darkMode,
  onToggleDarkMode,
  accentColor,
  onChangeAccentColor,
}) => {
  const { user, profile, settings, updateSettingsData, deleteUserAccount, sendPasswordReset } = useAuth();

  const [whoCanMessage, setWhoCanMessage] = useState(settings?.whoCanMessage || 'everyone');
  const [whoCanSeeOnline, setWhoCanSeeOnline] = useState(settings?.whoCanSeeOnline || 'everyone');
  const [readReceipts, setReadReceipts] = useState(settings?.readReceipts ?? true);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const accentColors = [
    { name: 'Indigo', hex: '#6366F1' },
    { name: 'Emerald', hex: '#10B981' },
    { name: 'Rose', hex: '#F43F5E' },
    { name: 'Amber', hex: '#F59E0B' },
    { name: 'Sky', hex: '#0EA5E9' },
  ];

  const handleSavePrivacy = async () => {
    if (!user) {
      alert('Please sign in to save personal privacy settings.');
      return;
    }
    try {
      await updateSettingsData({
        whoCanMessage,
        whoCanSeeOnline,
        readReceipts,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update privacy settings:', err);
    }
  };

  const handleResetPassword = async () => {
    if (user?.email) {
      await sendPasswordReset(user.email);
      alert(`Password reset link sent to ${user.email}`);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationInput !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await deleteUserAccount();
    } catch (err) {
      console.error('Account deletion error:', err);
      alert('Could not delete account. If you logged in a long time ago, please re-authenticate first.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full space-y-6 pb-20 select-none">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Settings & Privacy
            </h2>
            <p className="text-xs text-slate-400">
              Manage your profile privacy, theme, and account preferences
            </p>
          </div>
        </div>

        {savedSuccess && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200">
            <Check className="w-3.5 h-3.5" />
            Saved!
          </span>
        )}
      </div>

      {/* Privacy Settings Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          <Shield className="w-4 h-4 text-indigo-500" />
          <span>Privacy & Security Controls</span>
        </div>

        {/* Who can message */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Who Can Send Direct Messages
            </label>
            <p className="text-[11px] text-slate-400">
              Control who can start direct chats with you
            </p>
          </div>
          <select
            value={whoCanMessage}
            onChange={(e) => setWhoCanMessage(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="everyone">Everyone</option>
            <option value="friends">Friends Only</option>
            <option value="nobody">Nobody</option>
          </select>
        </div>

        {/* Online Visibility */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Online Status & Last Seen
            </label>
            <p className="text-[11px] text-slate-400">
              Show when you are actively connected to Nexus
            </p>
          </div>
          <select
            value={whoCanSeeOnline}
            onChange={(e) => setWhoCanSeeOnline(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="everyone">Everyone</option>
            <option value="friends">Friends Only</option>
            <option value="nobody">Nobody</option>
          </select>
        </div>

        {/* Read Receipts */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Read Receipts (Double Blue Checks)
            </label>
            <p className="text-[11px] text-slate-400">
              Let other participants see when you have read their messages
            </p>
          </div>
          <button
            onClick={() => setReadReceipts(!readReceipts)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              readReceipts ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                readReceipts ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>

        <button
          onClick={handleSavePrivacy}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
        >
          Save Privacy Preferences
        </button>
      </div>

      {/* Appearance & Accent Color */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          <Palette className="w-4 h-4 text-emerald-500" />
          <span>Appearance & Themes</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Interface Mode
            </label>
            <p className="text-[11px] text-slate-400">
              Toggle between light and dark theme
            </p>
          </div>
          <button
            onClick={onToggleDarkMode}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
            Brand Accent Color
          </label>
          <div className="flex items-center gap-3">
            {accentColors.map((color) => (
              <button
                key={color.name}
                onClick={() => onChangeAccentColor(color.hex)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                  accentColor === color.hex ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : ''
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              >
                {accentColor === color.hex && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Account & Deletion Policy */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          <Lock className="w-4 h-4 text-amber-500" />
          <span>Account & Security</span>
        </div>

        <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
          <p><span className="font-semibold text-slate-400">Email:</span> {user?.email || 'Guest'}</p>
          <p><span className="font-semibold text-slate-400">User ID:</span> <span className="font-mono text-[11px]">{user?.uid || 'Not signed in'}</span></p>
        </div>

        <div className="pt-2 flex flex-wrap gap-3">
          <button
            onClick={handleResetPassword}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
          >
            Send Password Reset Link
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Account
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold">Delete Account & Data</h3>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 mb-4 leading-relaxed">
              <p className="font-bold text-slate-900 dark:text-white">
                Data Deletion and Retention Policy:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400">
                <li>Your profile and login credentials will be immediately deactivated and removed.</li>
                <li>Your private settings and active sessions will be revoked.</li>
                <li>Messages already delivered to group conversations remain anonymized to prevent broken chat logs for other members.</li>
                <li>This action is irreversible.</li>
              </ul>
              <p className="pt-2">
                To confirm permanent deletion, type <span className="font-mono font-bold text-rose-600">DELETE</span> below:
              </p>
            </div>

            <input
              type="text"
              value={deleteConfirmationInput}
              onChange={(e) => setDeleteConfirmationInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationInput !== 'DELETE' || isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 transition-all active:scale-95"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
