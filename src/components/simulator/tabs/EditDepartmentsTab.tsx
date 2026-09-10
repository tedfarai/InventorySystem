import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  UserCheck,
  UserPlus,
  Users,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { Department, Manager } from '../../../types';

interface EditDepartmentsTabProps {
  departments: Department[];
  onAddDepartment: (dept: Department) => void;
  onUpdateDepartment: (dept: Department) => void;
  onDeleteDepartment: (deptId: string) => void;
  managers?: Manager[];
  onAddManager?: (mgr: Manager) => void;
  onUpdateManager?: (mgr: Manager) => void;
  onDeleteManager?: (mgrId: string) => void;
}

export const EditDepartmentsTab: React.FC<EditDepartmentsTabProps> = ({
  departments,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  managers = [],
  onAddManager,
  onUpdateManager,
  onDeleteManager,
}) => {
  const [activeDirectoryTab, setActiveDirectoryTab] = useState<'departments' | 'managers'>('departments');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [isAddingManager, setIsAddingManager] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingManagerId, setEditingManagerId] = useState<string | null>(null);

  // New Department Form State
  const generateNextDeptId = () => {
    const nums = departments
      .map((d) => parseInt(d.DeptID.replace('DEPT-', ''), 10))
      .filter((n) => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 101;
    return `DEPT-${nextNum}`;
  };

  const [newDept, setNewDept] = useState<Department>({
    DeptID: generateNextDeptId(),
    DeptName: '',
    DeptHeadName: '',
    DeptHeadEmail: '',
  });

  // Edit Department Form State
  const [editDeptForm, setEditDeptForm] = useState<Department>({
    DeptID: '',
    DeptName: '',
    DeptHeadName: '',
    DeptHeadEmail: '',
  });

  // New Manager Form State
  const generateNextManagerId = () => {
    const nums = managers
      .map((m) => parseInt(m.ManagerID.replace('MGR-', ''), 10))
      .filter((n) => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `MGR-${String(nextNum).padStart(3, '0')}`;
  };

  const [newManager, setNewManager] = useState<Manager>({
    ManagerID: generateNextManagerId(),
    ManagerName: '',
    Email: '',
  });

  // Edit Manager Form State
  const [editManagerForm, setEditManagerForm] = useState<Manager>({
    ManagerID: '',
    ManagerName: '',
    Email: '',
  });

  // Feedback Banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Department Handlers
  const handleStartAddDept = () => {
    setNewDept({
      DeptID: generateNextDeptId(),
      DeptName: '',
      DeptHeadName: '',
      DeptHeadEmail: '',
    });
    setIsAddingDept(true);
    setIsAddingManager(false);
    setEditingDeptId(null);
    setEditingManagerId(null);
    setActiveDirectoryTab('departments');
  };

  const handleCreateDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.DeptName.trim() || !newDept.DeptHeadName.trim() || !newDept.DeptHeadEmail.trim()) {
      showFeedback('error', 'Please fill in all department fields.');
      return;
    }

    if (departments.some((d) => d.DeptID.toLowerCase() === newDept.DeptID.trim().toLowerCase())) {
      showFeedback('error', `Department ID ${newDept.DeptID} already exists.`);
      return;
    }

    onAddDepartment({
      DeptID: newDept.DeptID.trim().toUpperCase(),
      DeptName: newDept.DeptName.trim(),
      DeptHeadName: newDept.DeptHeadName.trim(),
      DeptHeadEmail: newDept.DeptHeadEmail.trim(),
    });

    showFeedback('success', `Department "${newDept.DeptName}" created successfully!`);
    setIsAddingDept(false);
  };

  const handleStartEditDept = (dept: Department) => {
    setEditingDeptId(dept.DeptID);
    setEditDeptForm({ ...dept });
    setIsAddingDept(false);
    setIsAddingManager(false);
  };

  const handleUpdateDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeptForm.DeptName.trim() || !editDeptForm.DeptHeadName.trim() || !editDeptForm.DeptHeadEmail.trim()) {
      showFeedback('error', 'Department fields cannot be empty.');
      return;
    }

    onUpdateDepartment({
      DeptID: editDeptForm.DeptID,
      DeptName: editDeptForm.DeptName.trim(),
      DeptHeadName: editDeptForm.DeptHeadName.trim(),
      DeptHeadEmail: editDeptForm.DeptHeadEmail.trim(),
    });

    showFeedback('success', `Department details for ${editDeptForm.DeptID} updated!`);
    setEditingDeptId(null);
  };

  const handleDeleteDept = (dept: Department) => {
    if (window.confirm(`Are you sure you want to delete department ${dept.DeptID} — "${dept.DeptName}"?`)) {
      onDeleteDepartment(dept.DeptID);
      showFeedback('success', `Department ${dept.DeptID} deleted successfully.`);
    }
  };

  // Manager Handlers
  const handleStartAddManager = () => {
    setNewManager({
      ManagerID: generateNextManagerId(),
      ManagerName: '',
      Email: '',
    });
    setIsAddingManager(true);
    setIsAddingDept(false);
    setEditingDeptId(null);
    setEditingManagerId(null);
    setActiveDirectoryTab('managers');
  };

  const handleCreateManagerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManager.ManagerName.trim() || !newManager.Email.trim()) {
      showFeedback('error', 'Please fill in Manager Full Name and Email Address.');
      return;
    }

    if (managers.some((m) => m.ManagerID.toLowerCase() === newManager.ManagerID.trim().toLowerCase())) {
      showFeedback('error', `Manager ID ${newManager.ManagerID} already exists.`);
      return;
    }

    if (onAddManager) {
      onAddManager({
        ManagerID: newManager.ManagerID.trim().toUpperCase(),
        ManagerName: newManager.ManagerName.trim(),
        Email: newManager.Email.trim(),
      });
      showFeedback('success', `Manager "${newManager.ManagerName}" created successfully!`);
      setIsAddingManager(false);
    }
  };

  const handleStartEditManager = (mgr: Manager) => {
    setEditingManagerId(mgr.ManagerID);
    setEditManagerForm({ ...mgr });
    setIsAddingDept(false);
    setIsAddingManager(false);
  };

  const handleUpdateManagerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editManagerForm.ManagerName.trim() || !editManagerForm.Email.trim()) {
      showFeedback('error', 'Manager details cannot be empty.');
      return;
    }

    if (onUpdateManager) {
      onUpdateManager({
        ManagerID: editManagerForm.ManagerID,
        ManagerName: editManagerForm.ManagerName.trim(),
        Email: editManagerForm.Email.trim(),
      });
      showFeedback('success', `Manager record for ${editManagerForm.ManagerID} updated!`);
      setEditingManagerId(null);
    }
  };

  const handleDeleteManager = (mgr: Manager) => {
    if (window.confirm(`Are you sure you want to delete Manager ${mgr.ManagerID} — "${mgr.ManagerName}"?`)) {
      if (onDeleteManager) {
        onDeleteManager(mgr.ManagerID);
        showFeedback('success', `Manager ${mgr.ManagerID} deleted successfully.`);
      }
    }
  };

  const filteredDepartments = departments.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.DeptID.toLowerCase().includes(q) ||
      d.DeptName.toLowerCase().includes(q) ||
      d.DeptHeadName.toLowerCase().includes(q) ||
      d.DeptHeadEmail.toLowerCase().includes(q)
    );
  });

  const filteredManagers = managers.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.ManagerID.toLowerCase().includes(q) ||
      m.ManagerName.toLowerCase().includes(q) ||
      m.Email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header Info & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-200 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-300 dark:border-slate-700">
        <div>
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-500" />
            Edit Departments Dialogue — Department & Manager Master Directory
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Register and manage company departments and authorized managers for stock requisitions.
          </p>
        </div>

        {/* Action Buttons: Create New Department & Create New Manager side-by-side */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleStartAddDept}
            disabled={isAddingDept}
            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Department</span>
          </button>

          <button
            onClick={handleStartAddManager}
            disabled={isAddingManager}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow transition disabled:opacity-50 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create New Manager</span>
          </button>
        </div>
      </div>

      {/* Directory Tab Selector */}
      <div className="flex items-center space-x-2 border-b border-slate-300 dark:border-slate-700 pb-1">
        <button
          onClick={() => setActiveDirectoryTab('departments')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeDirectoryTab === 'departments'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Departments Directory ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveDirectoryTab('managers')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeDirectoryTab === 'managers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Managers Directory ({managers.length})</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
              : 'bg-rose-950/80 border-rose-700 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CREATE NEW DEPARTMENT FORM PANEL */}
      {/* ========================================================================= */}
      {isAddingDept && (
        <form
          onSubmit={handleCreateDeptSubmit}
          className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl border-2 border-emerald-500/60 space-y-3 animate-in fade-in zoom-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              [CREATE] Add New Department Record
            </h4>
            <button
              type="button"
              onClick={() => setIsAddingDept(false)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dept ID (System Code)
              </label>
              <input
                type="text"
                required
                value={newDept.DeptID}
                onChange={(e) => setNewDept({ ...newDept, DeptID: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Research & Development"
                value={newDept.DeptName}
                onChange={(e) => setNewDept({ ...newDept, DeptName: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department Head Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Arthur Pendelton"
                value={newDept.DeptHeadName}
                onChange={(e) => setNewDept({ ...newDept, DeptHeadName: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department Head Email
              </label>
              <input
                type="email"
                required
                placeholder="e.g. arthur.pendelton@company.com"
                value={newDept.DeptHeadEmail}
                onChange={(e) => setNewDept({ ...newDept, DeptHeadEmail: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddingDept(false)}
              className="px-3 py-1.5 bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs hover:bg-slate-400 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded shadow"
            >
              Save Department
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 2. CREATE NEW MANAGER FORM PANEL */}
      {/* ========================================================================= */}
      {isAddingManager && (
        <form
          onSubmit={handleCreateManagerSubmit}
          className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl border-2 border-blue-500/60 space-y-3 animate-in fade-in zoom-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              [CREATE] Add New Manager Record (Direct Stock Requisition)
            </h4>
            <button
              type="button"
              onClick={() => setIsAddingManager(false)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-200 flex items-start space-x-2">
            <UserCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Manager Direct Requisitions:</strong> Managers are individual authorized requestors who request and are issued stock directly. They do not operate as departments and do not require department heads.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Manager ID (System Code)
              </label>
              <input
                type="text"
                required
                value={newManager.ManagerID}
                onChange={(e) => setNewManager({ ...newManager, ManagerID: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Manager Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. David Sterling"
                value={newManager.ManagerName}
                onChange={(e) => setNewManager({ ...newManager, ManagerName: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="e.g. david.sterling@company.com"
                value={newManager.Email}
                onChange={(e) => setNewManager({ ...newManager, Email: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddingManager(false)}
              className="px-3 py-1.5 bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs hover:bg-slate-400 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded shadow"
            >
              Save Manager Record
            </button>
          </div>
        </form>
      )}

      {/* SEARCH BAR */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder={
              activeDirectoryTab === 'departments'
                ? 'Search departments or heads...'
                : 'Search managers by name or email...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          {activeDirectoryTab === 'departments' ? (
            <>Total Departments: <strong className="text-emerald-500">{departments.length}</strong></>
          ) : (
            <>Total Managers: <strong className="text-blue-500">{managers.length}</strong></>
          )}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 3. DEPARTMENTS DIRECTORY TABLE */}
      {/* ========================================================================= */}
      {activeDirectoryTab === 'departments' && (
        <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm max-h-[340px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-300 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Dept ID</th>
                <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Department Name</th>
                <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Dept Head</th>
                <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Dept Head Email</th>
                <th className="p-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {filteredDepartments.map((dept) => {
                const isEditing = editingDeptId === dept.DeptID;

                if (isEditing) {
                  return (
                    <tr key={dept.DeptID} className="bg-emerald-50/50 dark:bg-emerald-950/30">
                      <td className="p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800">
                        {editDeptForm.DeptID}
                      </td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                        <input
                          type="text"
                          value={editDeptForm.DeptName}
                          onChange={(e) => setEditDeptForm({ ...editDeptForm, DeptName: e.target.value })}
                          className="w-full p-1 bg-white dark:bg-slate-800 border border-emerald-500 rounded text-xs"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                        <input
                          type="text"
                          value={editDeptForm.DeptHeadName}
                          onChange={(e) => setEditDeptForm({ ...editDeptForm, DeptHeadName: e.target.value })}
                          className="w-full p-1 bg-white dark:bg-slate-800 border border-emerald-500 rounded text-xs"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                        <input
                          type="email"
                          value={editDeptForm.DeptHeadEmail}
                          onChange={(e) => setEditDeptForm({ ...editDeptForm, DeptHeadEmail: e.target.value })}
                          className="w-full p-1 bg-white dark:bg-slate-800 border border-emerald-500 rounded text-xs font-mono"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={handleUpdateDeptSubmit}
                            title="Save Changes"
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingDeptId(null)}
                            title="Cancel Edit"
                            className="p-1 bg-slate-600 hover:bg-slate-500 text-white rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={dept.DeptID} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <td className="p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800">
                      {dept.DeptID}
                    </td>
                    <td className="p-2.5 font-bold border-r border-slate-200 dark:border-slate-800">
                      {dept.DeptName}
                    </td>
                    <td className="p-2.5 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                      {dept.DeptHeadName}
                    </td>
                    <td className="p-2.5 font-mono text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                      {dept.DeptHeadEmail}
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleStartEditDept(dept)}
                          title="Edit Department Details"
                          className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDept(dept)}
                          title="Delete Department"
                          className="p-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDepartments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 italic text-xs">
                    No departments found matching "{searchQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MANAGERS DIRECTORY TABLE */}
      {/* ========================================================================= */}
      {activeDirectoryTab === 'managers' && (
        <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm max-h-[340px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-300 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Manager ID</th>
                <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Manager Full Name</th>
                <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Email Address</th>
                <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Requisition Category</th>
                <th className="p-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {filteredManagers.map((mgr) => {
                const isEditing = editingManagerId === mgr.ManagerID;

                if (isEditing) {
                  return (
                    <tr key={mgr.ManagerID} className="bg-blue-50/50 dark:bg-blue-950/30">
                      <td className="p-2 font-mono font-bold text-blue-600 dark:text-blue-400 border-r border-slate-200 dark:border-slate-800">
                        {editManagerForm.ManagerID}
                      </td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                        <input
                          type="text"
                          value={editManagerForm.ManagerName}
                          onChange={(e) => setEditManagerForm({ ...editManagerForm, ManagerName: e.target.value })}
                          className="w-full p-1 bg-white dark:bg-slate-800 border border-blue-500 rounded text-xs"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                        <input
                          type="email"
                          value={editManagerForm.Email}
                          onChange={(e) => setEditManagerForm({ ...editManagerForm, Email: e.target.value })}
                          className="w-full p-1 bg-white dark:bg-slate-800 border border-blue-500 rounded text-xs font-mono"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[11px]">
                        Manager Direct
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={handleUpdateManagerSubmit}
                            title="Save Changes"
                            className="p-1 bg-blue-600 hover:bg-blue-500 text-white rounded"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingManagerId(null)}
                            title="Cancel Edit"
                            className="p-1 bg-slate-600 hover:bg-slate-500 text-white rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={mgr.ManagerID} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400 border-r border-slate-200 dark:border-slate-800">
                      {mgr.ManagerID}
                    </td>
                    <td className="p-2.5 font-bold border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span>{mgr.ManagerName}</span>
                    </td>
                    <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                      {mgr.Email}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 dark:border-slate-800">
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded font-mono text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                        Individual Manager
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleStartEditManager(mgr)}
                          title="Edit Manager Details"
                          className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteManager(mgr)}
                          title="Delete Manager Record"
                          className="p-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredManagers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 italic text-xs">
                    No manager records found matching "{searchQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
