import type {
  AdjustmentDocument,
  AdminUser,
  BackupSnapshot,
  Department,
  IssuedDocument,
  Manager,
  MovementLogEntry,
  ReceivedDocument,
  StockAdjustmentRequest,
  StockItem,
} from '../types';

export interface InventoryState {
  stockItems: StockItem[];
  movementLogs: MovementLogEntry[];
  admins: AdminUser[];
  departments: Department[];
  managers: Manager[];
  issuedDocs: IssuedDocument[];
  receivedDocs: ReceivedDocument[];
  adjustmentDocs: AdjustmentDocument[];
  adjustmentRequests: StockAdjustmentRequest[];
  backups: BackupSnapshot[];
}

export interface VersionedInventoryState {
  revision: number;
  state: InventoryState;
}

export class InventoryApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'InventoryApiError';
  }
}

let inventoryRevision: number | null = (() => {
  if (typeof localStorage === 'undefined') return null;
  const saved = Number(localStorage.getItem('inventory_revision'));
  return Number.isSafeInteger(saved) && saved >= 0 ? saved : null;
})();

function saveRevision(revision: number): void {
  inventoryRevision = revision;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('inventory_revision', String(revision));
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: 'same-origin',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new InventoryApiError(error instanceof Error ? error.message : 'Inventory server is unreachable.', 0);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new InventoryApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export const authApi = {
  async listUsers(): Promise<AdminUser[]> {
    const result = await request<{ users: AdminUser[] }>('/api/auth/users');
    return result.users;
  },
  async getSession(): Promise<AdminUser | null> {
    try {
      const result = await request<{ user: AdminUser }>('/api/auth/session');
      return result.user;
    } catch (error) {
      if (error instanceof InventoryApiError && error.status === 401) return null;
      throw error;
    }
  },
  async setupInitialAdmin(params: {
    issuerId?: string;
    issuerName: string;
    role?: string;
    password: string;
  }): Promise<AdminUser> {
    const result = await request<{ user: AdminUser }>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return result.user;
  },
  async login(issuerId: string, password: string): Promise<AdminUser> {
    const result = await request<{ user: AdminUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ issuerId, password }),
    });
    return result.user;
  },
  async logout(): Promise<void> {
    await request<void>('/api/auth/logout', { method: 'POST' });
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request<void>('/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
  async createUser(user: Pick<AdminUser, 'IssuerID' | 'IssuerName' | 'Role'>, password: string): Promise<AdminUser> {
    const result = await request<{ user: AdminUser }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        issuerId: user.IssuerID,
        issuerName: user.IssuerName,
        role: user.Role,
        password,
      }),
    });
    return result.user;
  },
  async updateUser(user: AdminUser): Promise<AdminUser> {
    const result = await request<{ user: AdminUser }>(`/api/admin/users/${encodeURIComponent(user.IssuerID)}`, {
      method: 'PATCH',
      body: JSON.stringify({ issuerName: user.IssuerName, role: user.Role, active: user.Active }),
    });
    return result.user;
  },
  async deleteUser(issuerId: string): Promise<void> {
    await request<void>(`/api/admin/users/${encodeURIComponent(issuerId)}`, { method: 'DELETE' });
  },
  async resetPassword(issuerId: string, password: string): Promise<void> {
    await request<void>(`/api/admin/users/${encodeURIComponent(issuerId)}/password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
};

export const inventoryApi = {
  async getState(): Promise<VersionedInventoryState> {
    const result = await request<VersionedInventoryState>('/api/state');
    saveRevision(result.revision);
    return result;
  },
  async commitState(state: InventoryState): Promise<VersionedInventoryState> {
    if (inventoryRevision === null) await this.getState();
    const result = await request<VersionedInventoryState>('/api/state', {
      method: 'PUT',
      body: JSON.stringify({ expectedRevision: inventoryRevision, state }),
    });
    saveRevision(result.revision);
    return result;
  },
  async importState(state: Partial<InventoryState>): Promise<VersionedInventoryState> {
    const result = await request<VersionedInventoryState>('/api/state/import', {
      method: 'POST',
      body: JSON.stringify({ state }),
    });
    saveRevision(result.revision);
    return result;
  },
  setRevision(revision: number): void {
    saveRevision(revision);
  },
};
