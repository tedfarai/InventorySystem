import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { InventoryBackend } from './inventoryBackend';

test('hashes credentials, issues revocable sessions, and enforces transactional roles', async () => {
  const previousPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const directory = await mkdtemp(path.join(os.tmpdir(), 'inventory-backend-test-'));
  process.env.INITIAL_ADMIN_PASSWORD = 'temporary-test-password';

  try {
    const backend = await InventoryBackend.open(path.join(directory, 'inventory.sqlite'));
    const adminSession = await backend.login('ADM001', 'temporary-test-password', 'test');
    assert.equal(backend.getSession(adminSession.token)?.IssuerID, 'ADM001');
    await assert.rejects(backend.login('ADM001', 'incorrect-password', 'test'), /Invalid user ID or password/);

    await backend.addUser({
      IssuerID: 'STAFF001',
      IssuerName: 'Test Staff',
      Role: 'Staff',
      Active: true,
    }, 'another-test-password');
    const staffSession = await backend.login('STAFF001', 'another-test-password', 'test');
    const staff = backend.getSession(staffSession.token)!;
    const state = backend.getState();
    const changedStock = state.state.stockItems.map((item, index) =>
      index === 0 ? { ...item, Qty: item.Qty + 1 } : item
    );
    await assert.rejects(
      backend.commitState(staff, state.revision, { ...state.state, stockItems: changedStock }),
      /cannot modify stock/,
    );

    const managerState = backend.getState();
    const managerStock = managerState.state.stockItems.map((item, index) =>
      index === 0 ? { ...item, Qty: item.Qty + 1 } : item
    );
    const committed = await backend.commitState(adminSession.user, managerState.revision, {
      ...managerState.state,
      stockItems: managerStock,
    });
    assert.equal(committed.revision, managerState.revision + 1);
    await assert.rejects(
      backend.commitState(adminSession.user, managerState.revision, managerState.state),
      /Inventory changed on the server/,
    );

    await backend.logout(adminSession.token);
    assert.equal(backend.getSession(adminSession.token), null);
  } finally {
    if (previousPassword === undefined) delete process.env.INITIAL_ADMIN_PASSWORD;
    else process.env.INITIAL_ADMIN_PASSWORD = previousPassword;
    await rm(directory, { recursive: true, force: true });
  }
});
