import React, { useState, useMemo } from 'react';
import {
  BellRing,
  BellOff,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Database,
  Play,
  RotateCcw,
  ShieldCheck,
  Loader2,
  X,
  CalendarClock,
  Archive,
} from 'lucide-react';
import { BackupSnapshot, AdminUser } from '../../types';
import { DraggableResizableModal } from '../common/DraggableResizableModal';
import {
  BackupReminderSettings,
  DEFAULT_BACKUP_REMINDER_SETTINGS,
  clampIntervalDays,
  evaluateBackupReminderStatus,
} from '../../utils/backupReminders';

interface BackupRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BackupReminderSettings;
  onUpdateSettings: (next: BackupReminderSettings) => void;
  backups: BackupSnapshot[];
  currentUser: AdminUser | null;
  onTriggerManualBackup: (note: string) => Promise<BackupSnapshot | void>;
  onCheckReminderNow: () => void;
  onOpenBackupVault?: () => void;
}

const PRESET_DAYS = [1, 3, 7, 14, 30] as const;

export const BackupRemindersModal: React.FC<BackupRemindersModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  backups,
  currentUser,
  onTriggerManualBackup,
  onCheckReminderNow,
  onOpenBackupVault,
}) => {
  const [customMemo, setCustomMemo] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const evaluation = useMemo(
    () => evaluateBackupReminderStatus(backups, settings),
    [backups, settings]
  );

  if (!isOpen) return null;

  const isSuperiorAdmin = currentUser?.IssuerID === 'ADM001';

  const handleToggleEnabled = () => {
    onUpdateSettings({
      ...settings,
      enabled: !settings.enabled,
      snoozedUntil: null,
    });
  };

  const handleIntervalChange = (days: number) => {
    onUpdateSettings({
      ...settings,
      intervalDays: clampIntervalDays(days),
    });
  };

  const handleSnooze24h = () => {
    onUpdateSettings({
      ...settings,
      snoozedUntil: Date.now() + 24 * 60 * 60 * 1000,
    });
  };

  const handleClearSnooze = () => {
    onUpdateSettings({
      ...settings,
      snoozedUntil: null,
    });
  };

  const handleResetDefaults = () => {
    onUpdateSettings({ ...DEFAULT_BACKUP_REMINDER_SETTINGS });
    setLocalFeedback({ type: 'success', text: 'Restored default 7-day backup reminder policy.' });
  };

  const handleRunManualBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBackingUp) return;
    setIsBackingUp(true);
    setLocalFeedback(null);
    try {
      const memo = customMemo.trim() || 'Manual Backup (Triggered from Backup Reminders Settings)';
      const snap = await onTriggerManualBackup(memo);
      setCustomMemo('');
      setLocalFeedback({
        type: 'success',
        text: snap
          ? `Backup snapshot ${snap.id} created successfully (${snap.timestamp}).`
          : 'Manual SQLite backup snapshot saved successfully.',
      });
    } catch (err: any) {
      setLocalFeedback({
        type: 'error',
        text: err?.message || 'Failed to create manual backup snapshot.',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const statusTone = !settings.enabled
    ? 'neutral'
    : evaluation.isOverdue
    ? 'warning'
    : 'healthy';

  return (
    <DraggableResizableModal
      isOpen={isOpen}
      onClose={onClose}
      modalId="backup-reminders-settings-modal"
      initialWidth={640}
      initialHeight={580}
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden flex flex-col my-auto"
    >
      {/* Header */}
      <div
        data-drag-handle="true"
        className="bg-slate-900 dark:bg-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <BellRing className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate">Backup Reminders Settings</h2>
            <p className="text-[11px] text-slate-400 truncate">
              Configure overdue snapshot alerts and run immediate manual SQLite backups
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          aria-label="Close Backup Reminders Settings"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
        {/* Live Backup Health Banner */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            statusTone === 'healthy'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70'
              : statusTone === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/70'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                statusTone === 'healthy'
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                  : statusTone === 'warning'
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {statusTone === 'healthy' && <CheckCircle2 className="w-5 h-5" />}
              {statusTone === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {statusTone === 'neutral' && <BellOff className="w-5 h-5" />}
            </div>
            <div className="space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                <span>
                  {statusTone === 'healthy'
                    ? 'Backup Schedule Healthy'
                    : statusTone === 'warning'
                    ? `Backup Overdue (${evaluation.thresholdDays}-Day Policy)`
                    : 'Backup Reminders Disabled'}
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {backups.length} Snapshot{backups.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 opacity-75" />
                  Last backup:{' '}
                  <strong className="font-mono">
                    {evaluation.latestBackup ? evaluation.latestBackup.timestamp : 'None'}
                  </strong>
                </span>
                <span className="font-semibold">({evaluation.formattedAge})</span>
              </div>
            </div>
          </div>

          {evaluation.isSnoozed && (
            <button
              type="button"
              onClick={handleClearSnooze}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            >
              Clear 24h Snooze
            </button>
          )}
        </div>

        {/* Enable/Disable Toggle & Interval Configuration */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Automatic Overdue Backup Reminder Toast</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Notify with a quick-action toast when no backup snapshot has been created within the selected window.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              onClick={handleToggleEnabled}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                settings.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
              title={settings.enabled ? 'Disable Backup Reminders' : 'Enable Backup Reminders'}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  settings.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="backup-reminder-interval-input"
                className="font-bold text-slate-800 dark:text-slate-200"
              >
                Remind me if no backup exists in the last:
              </label>
              <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                {settings.intervalDays} day{settings.intervalDays === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PRESET_DAYS.map((day) => {
                const isSelected = settings.intervalDays === day;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={!settings.enabled}
                    onClick={() => handleIntervalChange(day)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer disabled:opacity-50 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {day === 7 ? '7 Days (Default)' : `${day} Day${day === 1 ? '' : 's'}`}
                  </button>
                );
              })}

              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  id="backup-reminder-interval-input"
                  type="number"
                  min={1}
                  max={90}
                  disabled={!settings.enabled}
                  value={settings.intervalDays}
                  onChange={(e) => handleIntervalChange(Number(e.target.value) || 7)}
                  className="w-16 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-center disabled:opacity-50"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">days</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCheckReminderNow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-[11px] transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Check Reminder Status Now</span>
              </button>

              {settings.enabled && evaluation.isOverdue && !evaluation.isSnoozed && (
                <button
                  type="button"
                  onClick={handleSnooze24h}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-[11px] transition cursor-pointer"
                >
                  Snooze 24h
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Default (7d)</span>
            </button>
          </div>
        </div>

        {/* Immediate Manual Backup Action Panel */}
        <form
          onSubmit={handleRunManualBackup}
          className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Trigger Immediate Manual Backup</span>
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Creates a full SQLite point-in-time snapshot right now and resets the reminder countdown.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customMemo}
              onChange={(e) => setCustomMemo(e.target.value)}
              placeholder="Optional backup memo (e.g. Weekly Inventory Snapshot)"
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={isBackingUp}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer disabled:opacity-60 shrink-0"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Backup...</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Backup Now</span>
                </>
              )}
            </button>
          </div>

          {localFeedback && (
            <div
              className={`p-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-2 border ${
                localFeedback.type === 'success'
                  ? 'bg-emerald-100/80 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-100/80 dark:bg-rose-900/50 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
              }`}
            >
              {localFeedback.type === 'success' ? (
                <ShieldCheck className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{localFeedback.text}</span>
            </div>
          )}
        </form>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        {isSuperiorAdmin && onOpenBackupVault ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenBackupVault();
            }}
            className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
          >
            Open Full Backup &amp; Recovery Vault →
          </button>
        ) : (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Settings saved locally on this workstation
          </span>
        )}

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:opacity-90 transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </DraggableResizableModal>
  );
};
