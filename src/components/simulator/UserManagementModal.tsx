import React, { useState } from 'react';
import { Shield, Lock, Crown, UserPlus, Edit2, Trash2, CheckCircle, XCircle, AlertTriangle, KeyRound } from 'lucide-react';
import { AdminUser } from '../../types';
import { DraggableResizableModal } from '../common/DraggableResizableModal';

interface UserManagementModalProps {
  currentUser: AdminUser | null;
  admins: AdminUser[];
  onAddAdmin?: (admin: AdminUser) => void;
  onUpdateAdmin?: (admin: AdminUser) => void;
  onDeleteAdmin?: (issuerId: string) => void;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  currentUser,
  admins,
  onAddAdmin,
  onUpdateAdmin,
  onDeleteAdmin,
  onClose,
}) => {
  // Check if current user is Rachel Pickard (Superior Admin)
  const isSuperiorAdmin = currentUser && currentUser.IssuerID === 'ADM001';

  // Form State for Adding / Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AdminUser>({
    IssuerID: '',
    IssuerName: '',
    Role: 'Procurement Assistant',
    SecretPassword: '',
    Active: true,
  });

  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isSuperiorAdmin) {
    return (
      <DraggableResizableModal
        onClose={onClose}
        modalId="user-management-access-denied"
        className="bg-slate-900 rounded-2xl shadow-2xl border-2 border-rose-600/80 w-full max-w-lg overflow-hidden my-auto"
      >
        {/* Access Denied Header */}
        <div
          data-drag-handle="true"
          className="bg-rose-950 text-white px-4 py-3 flex items-center justify-between border-b border-rose-800 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-rose-400" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-rose-200">
              Security Violation — Access Denied
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-rose-300 hover:text-white text-xs font-bold px-2 py-1 rounded hover:bg-rose-900 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5 text-center flex-1 min-h-0 overflow-y-auto">
          <div className="w-16 h-16 rounded-full bg-rose-950/80 border-2 border-rose-500/50 flex items-center justify-center mx-auto text-rose-400 shadow-lg">
            <AlertTriangle className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">Insufficient Admin Authorization</h3>
            <p className="text-xs text-rose-200 leading-relaxed font-mono bg-rose-950/60 p-3.5 rounded-xl border border-rose-800 text-left">
              Access Denied: Only Rachel Pickard (Procurement Manager / Superior Admin) has permission to perform User Management and Credential CRUD operations.
            </p>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            Current Session User: <strong className="text-slate-200">{currentUser ? currentUser.IssuerName : 'Guest'}</strong> ({currentUser ? currentUser.Role : 'Unauthorized'})
          </div>

          <div className="pt-2 flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      </DraggableResizableModal>
    );
  }

  // Handle Edit Click
  const handleStartEdit = (admin: AdminUser) => {
    setEditingId(admin.IssuerID);
    setFormData({ ...admin });
    setFormError('');
    setSuccessMsg('');
  };

  // Handle Cancel Edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      IssuerID: '',
      IssuerName: '',
      Role: 'Procurement Assistant',
      SecretPassword: '',
      Active: true,
    });
    setFormError('');
  };

  // Handle Submit Form (Create or Update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!formData.IssuerID.trim() || !formData.IssuerName.trim() || !formData.SecretPassword.trim()) {
      setFormError('Please fill in Work ID, User Name, and Secret Password.');
      return;
    }

    if (editingId) {
      // Update existing
      if (onUpdateAdmin) {
        onUpdateAdmin(formData);
        setSuccessMsg(`User '${formData.IssuerName}' updated successfully.`);
      }
      setEditingId(null);
    } else {
      // Check duplicate ID
      if (admins.some((a) => a.IssuerID.toLowerCase() === formData.IssuerID.trim().toLowerCase())) {
        setFormError(`Issuer Work ID '${formData.IssuerID}' already exists.`);
        return;
      }
      if (onAddAdmin) {
        onAddAdmin({ ...formData, IssuerID: formData.IssuerID.trim().toUpperCase() });
        setSuccessMsg(`New user '${formData.IssuerName}' created successfully.`);
      }
    }

    // Reset Form
    setFormData({
      IssuerID: '',
      IssuerName: '',
      Role: 'Procurement Assistant',
      SecretPassword: '',
      Active: true,
    });
  };

  // Toggle Active/Blocked Status
  const handleToggleActive = (admin: AdminUser) => {
    if (admin.IssuerID === 'ADM001') {
      setFormError("Rachel Pickard (Superior Admin) account cannot be deactivated.");
      return;
    }
    if (onUpdateAdmin) {
      onUpdateAdmin({ ...admin, Active: !admin.Active });
      setSuccessMsg(`Status for '${admin.IssuerName}' changed to ${!admin.Active ? 'Active' : 'Blocked'}.`);
    }
  };

  // Delete User
  const handleDelete = (admin: AdminUser) => {
    if (admin.IssuerID === 'ADM001') {
      setFormError("Rachel Pickard (Superior Admin) account cannot be deleted.");
      return;
    }
    if (confirm(`Are you sure you want to delete user '${admin.IssuerName}' (${admin.IssuerID})?`)) {
      if (onDeleteAdmin) {
        onDeleteAdmin(admin.IssuerID);
        setSuccessMsg(`User '${admin.IssuerName}' deleted from system.`);
      }
    }
  };

  return (
    <DraggableResizableModal
      onClose={onClose}
      modalId="user-management-modal"
      className="bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-amber-500/80 w-full max-w-4xl overflow-hidden my-auto"
    >
      {/* Superior Admin Header */}
      <div
        data-drag-handle="true"
        className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center space-x-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <span className="font-mono text-xs font-bold tracking-wide text-amber-300">
            frmUserManagement — Superior Admin Credentials & Privilege CRUD
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded hover:bg-slate-800 cursor-pointer"
        >
          ✕ Close
        </button>
      </div>

      {/* UserForm Body */}
      <div className="p-6 space-y-5 flex-1 min-h-0 overflow-y-auto">
          {/* Superior Admin Banner */}
          <div className="flex items-center justify-between bg-amber-950/40 border border-amber-500/40 p-3.5 rounded-xl text-amber-200">
            <div className="flex items-center space-x-3">
              <Crown className="w-7 h-7 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-300">Superior Admin Control Mode</h4>
                <p className="text-[11px] text-amber-200/80">
                  Logged in as <strong>Rachel Pickard</strong> (Procurement Manager). Full CRUD authority granted over <code className="bg-slate-900 px-1 rounded text-amber-300 font-mono">Admin_Config</code> credentials.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-amber-500/40 shrink-0">
              <Shield className="w-3.5 h-3.5" /> Full Privilege
            </span>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add / Edit Form */}
          <form onSubmit={handleSubmit} className="bg-slate-200 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-300 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-amber-500" />
                <span>{editingId ? `Edit User Credentials: ${editingId}` : 'Add New Authorized User'}</span>
              </h4>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-slate-500 hover:text-slate-300 underline"
                >
                  Cancel Editing
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Work ID (IssuerID)
                </label>
                <input
                  type="text"
                  value={formData.IssuerID}
                  onChange={(e) => setFormData({ ...formData, IssuerID: e.target.value })}
                  placeholder="e.g. ADM008"
                  disabled={!!editingId}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.IssuerName}
                  onChange={(e) => setFormData({ ...formData, IssuerName: e.target.value })}
                  placeholder="e.g. John Smith"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Role
                </label>
                <select
                  value={formData.Role}
                  onChange={(e) => setFormData({ ...formData, Role: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Procurement Manager">Procurement Manager</option>
                  <option value="Procurement Supervisor">Procurement Supervisor</option>
                  <option value="Procurement Assistant">Procurement Assistant</option>
                  <option value="Administrator">Administrator</option>
                  <option value="Master Inventory Controller">Master Inventory Controller</option>
                  <option value="Inventory Controller">Inventory Controller</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Secret Password
                </label>
                <input
                  type="password"
                  value={formData.SecretPassword}
                  onChange={(e) => setFormData({ ...formData, SecretPassword: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.Active}
                  onChange={(e) => setFormData({ ...formData, Active: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Account Active Status</span>
              </label>

              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow transition"
              >
                {editingId ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>

          {/* User Directory Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2 font-mono uppercase">
              Admin_Config Table 1: User Directory ({admins.length} Accounts)
            </h4>
            <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-800 text-slate-300 font-mono text-[11px] uppercase border-b border-slate-700">
                  <tr>
                    <th className="p-2.5 border-r border-slate-700">Work ID</th>
                    <th className="p-2.5 border-r border-slate-700">User Name</th>
                    <th className="p-2.5 border-r border-slate-700">Role</th>
                    <th className="p-2.5 border-r border-slate-700">Password</th>
                    <th className="p-2.5 border-r border-slate-700 text-center">Status</th>
                    <th className="p-2.5 text-center">CRUD Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {admins.map((adm) => {
                    const isSuperior = adm.IssuerID === 'ADM001';
                    return (
                      <tr key={adm.IssuerID} className="hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
                        <td className="p-2.5 font-mono font-bold text-amber-600 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800">
                          {adm.IssuerID}
                        </td>
                        <td className="p-2.5 font-bold border-r border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span>{adm.IssuerName}</span>
                            {isSuperior && (
                              <span className="inline-flex items-center gap-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-amber-500/30">
                                <Crown className="w-3 h-3 text-amber-500" /> Superior Admin
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                          {adm.Role}
                        </td>
                        <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold border-r border-slate-200 dark:border-slate-800">
                          {adm.SecretPassword}
                        </td>
                        <td className="p-2.5 text-center border-r border-slate-200 dark:border-slate-800">
                          <button
                            onClick={() => handleToggleActive(adm)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              adm.Active
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {adm.Active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span>{adm.Active ? 'Active' : 'Blocked'}</span>
                          </button>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleStartEdit(adm)}
                              className="p-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200"
                              title="Edit User"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isSuperior && (
                              <button
                                onClick={() => handleDelete(adm)}
                                className="p-1 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </DraggableResizableModal>
  );
};
