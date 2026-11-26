import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  authApi,
  clearInMemorySessionForTest,
  inventoryApi,
  InventoryApiError,
  isSessionAuthenticated,
} from '../../api/inventoryApi';
import { RealtimeSyncService } from '../../db/realtimeSyncService';

const originalFetch = globalThis.fetch;
const originalNavigator = globalThis.navigator;

afterEach(() => {
  clearInMemorySessionForTest();
  globalThis.fetch = originalFetch;
  Object.defineProperty(globalThis, 'navigator', {
    value: originalNavigator,
    configurable: true,
    writable: true,
  });
});

describe('In-memory Bearer auth and RealtimeSyncService 401 resilience', () => {
  it('sends Authorization Bearer token after setup/login even without cookies and clears it on logout or 401', async () => {
    const capturedHeaders: Array<{ url: string; auth: string | null }> = [];
    let allowCommit = true;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const headers = new Headers(init?.headers);
      capturedHeaders.push({ url, auth: headers.get('Authorization') });

      if (url === '/api/auth/setup') {
        return new Response(
          JSON.stringify({
            user: { IssuerID: 'ADM001', IssuerName: 'Rachel Pickard', Role: 'Procurement Manager', Active: true },
            token: 'mem-token-setup-123',
            expiresAt: Date.now() + 60_000,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url === '/api/state' && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            revision: 1,
            state: {
              stockItems: [],
              movementLogs: [],
              admins: [],
              departments: [],
              managers: [],
              issuedDocs: [],
              receivedDocs: [],
              adjustmentDocs: [],
              adjustmentRequests: [],
              backups: [],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url === '/api/state' && init?.method === 'PUT') {
        if (!allowCommit || headers.get('Authorization') !== 'Bearer mem-token-setup-123') {
          return new Response(JSON.stringify({ error: 'Authentication required.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({
            revision: 2,
            state: {
              stockItems: [],
              movementLogs: [],
              admins: [],
              departments: [],
              managers: [],
              issuedDocs: [],
              receivedDocs: [],
              adjustmentDocs: [],
              adjustmentRequests: [],
              backups: [],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url === '/api/auth/logout') {
        return new Response(null, { status: 204 });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }) as typeof fetch;

    const user = await authApi.setupInitialAdmin({
      issuerName: 'Rachel Pickard',
      role: 'Procurement Manager',
      password: 'very-strong-password-123',
    });
    assert.equal(user.IssuerID, 'ADM001');
    assert.equal(isSessionAuthenticated(), true);

    inventoryApi.setRevision(1);
    const committed = await inventoryApi.commitState({
      stockItems: [],
      movementLogs: [],
      admins: [],
      departments: [],
      managers: [],
      issuedDocs: [],
      receivedDocs: [],
      adjustmentDocs: [],
      adjustmentRequests: [],
      backups: [],
    });
    assert.equal(committed.revision, 2);
    assert.equal(
      capturedHeaders.find((h) => h.url === '/api/state')?.auth,
      'Bearer mem-token-setup-123'
    );

    // Server returns 401 (e.g. expired session) -> clears session state
    allowCommit = false;
    await assert.rejects(
      () =>
        inventoryApi.commitState({
          stockItems: [],
          movementLogs: [],
          admins: [],
          departments: [],
          managers: [],
          issuedDocs: [],
          receivedDocs: [],
          adjustmentDocs: [],
          adjustmentRequests: [],
          backups: [],
        }),
      (err: unknown) => err instanceof InventoryApiError && err.status === 401
    );
    assert.equal(isSessionAuthenticated(), false);

    await authApi.logout();
    assert.equal(isSessionAuthenticated(), false);
  });

  it('skips PUT /api/state when unauthenticated and handles server 401 without unhandled rejections', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });

    let putAttempts = 0;
    let getStateAttempts = 0;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/state' && init?.method === 'PUT') {
        putAttempts += 1;
        return new Response(JSON.stringify({ error: 'Authentication required.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url === '/api/state') {
        getStateAttempts += 1;
        return new Response(
          JSON.stringify({
            revision: 3,
            state: {
              stockItems: [],
              movementLogs: [],
              admins: [],
              departments: [],
              managers: [],
              issuedDocs: [],
              receivedDocs: [],
              adjustmentDocs: [],
              adjustmentRequests: [],
              backups: [],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    }) as typeof fetch;

    const service = new RealtimeSyncService();
    let authRequiredTriggered = false;
    (service as unknown as { onAuthRequiredCb?: () => void }).onAuthRequiredCb = () => {
      authRequiredTriggered = true;
    };

    // When unauthenticated, commitServerState returns false without hitting PUT /api/state
    service.setAuthenticated(false);
    const unauthResult = await (
      service as unknown as { commitServerState: () => Promise<boolean> }
    ).commitServerState();
    assert.equal(unauthResult, false);
    assert.equal(putAttempts, 0);

    // When authenticated client encounters an unexpected server 401, handle gracefully without throwing
    inventoryApi.setRevision(3);
    service.setAuthenticated(true);
    const expiredResult = await (
      service as unknown as { commitServerState: () => Promise<boolean> }
    ).commitServerState();
    assert.equal(expiredResult, false);
    assert.equal(putAttempts, 1);
    assert.equal(getStateAttempts, 0);
    assert.equal(authRequiredTriggered, true);

    // Subsequent drain while unauthenticated stays a no-op
    const drained = await service.drainPendingMutations();
    assert.equal(drained, 0);
    assert.equal(putAttempts, 1);
  });

  it('authApi.getUsersStatus distinguishes needsSetup from protected user directory without throwing or clearing auth', async () => {
    let mode: 'setup' | 'restricted_401' | 'restricted_403' | 'admin_200' = 'setup';
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/auth/login') {
        return new Response(
          JSON.stringify({
            user: { IssuerID: 'MGR001', IssuerName: 'Manager One', Role: 'Manager', Active: true },
            token: 'mgr-token-123',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url === '/api/auth/users') {
        if (mode === 'setup') {
          return new Response(JSON.stringify({ users: [], needsSetup: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (mode === 'restricted_401') {
          return new Response(JSON.stringify({ error: 'Authentication required.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (mode === 'restricted_403') {
          return new Response(JSON.stringify({ error: 'Only the superior administrator may perform this action.' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({
            users: [{ IssuerID: 'ADM001', IssuerName: 'Rachel Pickard', Role: 'Procurement Manager', Active: true }],
            needsSetup: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    }) as typeof fetch;

    assert.deepEqual(await authApi.getUsersStatus(), {
      users: [],
      needsSetup: true,
      directoryRestricted: false,
    });

    mode = 'restricted_401';
    assert.deepEqual(await authApi.getUsersStatus(), {
      users: [],
      needsSetup: false,
      directoryRestricted: true,
    });

    // Simulate signed-in non-ADM001 user hitting 403 on /api/auth/users; session must remain intact
    await authApi.login('MGR001', 'some-password-123');
    assert.equal(isSessionAuthenticated(), true);
    mode = 'restricted_403';
    assert.deepEqual(await authApi.getUsersStatus(), {
      users: [],
      needsSetup: false,
      directoryRestricted: true,
    });
    assert.equal(isSessionAuthenticated(), true);

    mode = 'admin_200';
    const adminStatus = await authApi.getUsersStatus();
    assert.equal(adminStatus.needsSetup, false);
    assert.equal(adminStatus.directoryRestricted, false);
    assert.equal(adminStatus.users.length, 1);
    assert.equal(adminStatus.users[0].IssuerID, 'ADM001');
  });

  it('RealtimeSyncService.initialize skips GET /api/state when unauthenticated and handles 401 on refreshServerState cleanly', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });

    let getStateAttempts = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/state') {
        getStateAttempts += 1;
        return new Response(JSON.stringify({ error: 'Authentication required.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    }) as typeof fetch;

    const service = new RealtimeSyncService();
    let authRequiredCount = 0;
    const observedAdmins: unknown[] = [];
    const observedBackups: unknown[] = [];
    try {
      service.setAuthenticated(false);
      await service.initialize({
        onAdminsChange: (admins) => observedAdmins.push(admins),
        onBackupsChange: (backups) => observedBackups.push(backups),
        onAuthRequired: () => {
          authRequiredCount += 1;
        },
      });
      assert.equal(getStateAttempts, 0);
      assert.equal(authRequiredCount, 0);
      assert.deepEqual(observedAdmins.at(-1), []);
      assert.deepEqual(observedBackups.at(-1), []);

      // Simulate session expiring mid-session during background refreshServerState
      service.setAuthenticated(true);
      await (service as unknown as { refreshServerState: () => Promise<void> }).refreshServerState();
      assert.equal(getStateAttempts, 1);
      assert.equal(authRequiredCount, 1);
      assert.deepEqual(observedAdmins.at(-1), []);
      assert.deepEqual(observedBackups.at(-1), []);
    } finally {
      service.cleanup();
    }
  });
});
