import { describe, it, expect, beforeAll } from 'vitest';

const BASE = process.env.TEST_URL || 'http://localhost:3777';
const ADMIN = { 'X-Admin-Token': 'swarm-admin-dev', 'Content-Type': 'application/json' };
let agentKey = '';

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts);
  return { status: res.status, data: await res.json() };
}

describe('Health', () => {
  it('GET /api/health', async () => {
    const { status, data } = await api('/api/health');
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
  });
});

describe('Admin - Agents', () => {
  it('POST create agent', async () => {
    const { status, data } = await api('/api/v1/admin/agents', {
      method: 'POST', headers: ADMIN,
      body: JSON.stringify({ id: 'test-agent', name: 'Test' }),
    });
    expect(status).toBe(200);
    expect(data.apiKey).toBeTruthy();
    agentKey = data.apiKey;
  });

  it('GET list agents', async () => {
    const { status, data } = await api('/api/v1/admin/agents', { headers: ADMIN });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('Auth', () => {
  it('401 without key', async () => {
    const { status } = await api('/api/v1/profile');
    expect(status).toBe(401);
  });

  it('401 with bad key', async () => {
    const { status } = await api('/api/v1/profile', {
      headers: { Authorization: 'Bearer bad-key' },
    });
    expect(status).toBe(401);
  });
});

describe('Profile', () => {
  it('PATCH update', async () => {
    const { status } = await api('/api/v1/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${agentKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ layer: 'test', entries: { foo: 'bar' } }),
    });
    expect(status).toBe(200);
  });

  it('GET read', async () => {
    const { status, data } = await api('/api/v1/profile', {
      headers: { Authorization: `Bearer ${agentKey}` },
    });
    expect(status).toBe(200);
    expect(data.test?.foo?.value).toBe('bar');
  });

  it('DELETE entry', async () => {
    const { status } = await api('/api/v1/profile', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${agentKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ layer: 'test', key: 'foo' }),
    });
    expect(status).toBe(200);
  });
});

describe('Memory', () => {
  let memContent = `test-memory-${Date.now()}`;

  it('POST write', async () => {
    const { status } = await api('/api/v1/memory', {
      method: 'POST',
      headers: { Authorization: `Bearer ${agentKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: memContent, tags: ['test'] }),
    });
    expect(status).toBe(200);
  });

  it('GET search', async () => {
    const { status, data } = await api(`/api/v1/memory?tag=test`, {
      headers: { Authorization: `Bearer ${agentKey}` },
    });
    expect(status).toBe(200);
    expect(data.length).toBeGreaterThan(0);
  });
});

describe('Settings', () => {
  it('GET settings', async () => {
    const { status, data } = await api('/api/v1/admin/settings', { headers: ADMIN });
    expect(status).toBe(200);
    expect(data.embedding).toBeDefined();
  });
});

describe('Cleanup', () => {
  it('POST cleanup', async () => {
    const { status, data } = await api('/api/v1/admin/cleanup', {
      method: 'POST', headers: ADMIN,
    });
    expect(status).toBe(200);
    expect(typeof data.removed).toBe('number');
  });
});

describe('Cleanup - Agent', () => {
  it('DELETE test agent', async () => {
    const { status } = await api('/api/v1/admin/agents/test-agent', {
      method: 'DELETE', headers: ADMIN,
    });
    expect(status).toBe(200);
  });
});
