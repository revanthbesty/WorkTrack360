import { afterEach, describe, expect, it, vi } from 'vitest';
import { workItemsApi } from './workItems';

const item = {
  id: '2dbdc0f5-8d3e-4f1b-a46a-85b67f15f210',
  key: 'WT-TEST123',
  title: 'Test work item',
  description: null,
  status: 'Open',
  priority: 'Medium',
  team_id: null,
  due_at: null,
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('workItemsApi', () => {
  it('does not make a request without an access token', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(workItemsApi.list('')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends bearer authentication and bounded pagination for list requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([item]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await workItemsApi.list('test-access-token', 500, -3);
    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/work-items?limit=100&offset=0');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer test-access-token');
    expect(init.credentials).toBe('omit');
  });

  it('posts JSON when creating a work item', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(item), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await workItemsApi.create('test-access-token', { title: 'Test work item' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(String(init.body))).toEqual({ title: 'Test work item' });
  });

  it('patches a work-item status and returns the updated record', async () => {
    const updated = { ...item, status: 'In progress' };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await workItemsApi.update('test-access-token', item.id, { status: 'In progress' });
    expect(result.status).toBe('In progress');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`/api/v1/work-items/${item.id}`);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ status: 'In progress' });
  });

  it('returns a safe permission message for forbidden responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('private server detail', { status: 403 })),
    );

    await expect(workItemsApi.update('test-access-token', item.id, { title: 'Change' }))
      .rejects.toMatchObject({
        name: 'ApiError',
        status: 403,
        message: 'You do not have permission to perform this action.',
      });
  });
});
