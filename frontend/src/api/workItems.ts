export type WorkItemStatus =
  | 'Open'
  | 'In progress'
  | 'Needs review'
  | 'Blocked'
  | 'Resolved'
  | 'Closed';

export type WorkItemPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface WorkItem {
  id: string;
  key: string;
  title: string;
  description: string | null;
  product: string | null;
  category: string | null;
  requester: string | null;
  owner: string | null;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  team_id: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkItemInput {
  title: string;
  description?: string | null;
  product?: string | null;
  category?: string | null;
  requester?: string | null;
  owner?: string | null;
  team_id?: string | null;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  due_at?: string | null;
}

export interface UpdateWorkItemInput {
  title?: string;
  description?: string | null;
  team_id?: string | null;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  due_at?: string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
// Prefer same-origin routing in production. Set VITE_API_BASE_URL only when the API
// intentionally has a separate origin and CORS has been configured for that exact origin.
const apiBaseUrl = (configuredBaseUrl || '').replace(/\/+$/, '');

async function request<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  if (!accessToken.trim()) {
    throw new ApiError('Sign-in is required to access work items.', 401);
  }

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
    ...init,
    headers,
    credentials: 'omit',
  });

  if (!response.ok) {
    const messageByStatus: Record<number, string> = {
      401: 'Your session is missing or expired. Sign in again.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested work item was not found.',
      429: 'Too many requests. Please wait and try again.',
    };
    throw new ApiError(
      messageByStatus[response.status] ??
        (response.status >= 500
          ? 'The service is temporarily unavailable. Please try again later.'
          : `Request failed with status ${response.status}.`),
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Access tokens are passed by the caller and are never persisted by this module. */
export const workItemsApi = {
  list(accessToken: string, limit = 50, offset = 0): Promise<WorkItem[]> {
    const params = new URLSearchParams({
      limit: String(Math.min(100, Math.max(1, Math.trunc(limit)))),
      offset: String(Math.max(0, Math.trunc(offset))),
    });
    return request<WorkItem[]>(`/work-items?${params.toString()}`, accessToken);
  },

  get(accessToken: string, id: string): Promise<WorkItem> {
    return request<WorkItem>(`/work-items/${encodeURIComponent(id)}`, accessToken);
  },

  create(accessToken: string, input: CreateWorkItemInput): Promise<WorkItem> {
    return request<WorkItem>('/work-items', accessToken, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(
    accessToken: string,
    id: string,
    input: UpdateWorkItemInput,
  ): Promise<WorkItem> {
    return request<WorkItem>(`/work-items/${encodeURIComponent(id)}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};
