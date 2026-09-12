import { GoogleTask, GoogleTaskList, TaskStatus } from '../types/task';
import { getAuthState } from './googleAuth';
import { INITIAL_MOCK_LISTS, INITIAL_MOCK_TASKS } from './mockData';

const BASE_URL = 'https://tasks.googleapis.com/tasks/v1';

// In-memory mock storage for demo mode
let mockLists: GoogleTaskList[] = JSON.parse(JSON.stringify(INITIAL_MOCK_LISTS));
let mockTasks: Record<string, GoogleTask[]> = JSON.parse(
  JSON.stringify(INITIAL_MOCK_TASKS)
);

/**
 * Standard fetch helper with Bearer authorization token
 */
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const auth = getAuthState();
  if (!auth.isAuthenticated || !auth.accessToken) {
    throw new Error('未授权，请先登录 Google 账号。');
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.accessToken}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message =
      errorBody.error?.message ||
      `Google Tasks API 请求失败: ${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

/**
 * Fetch all task lists
 */
export async function getTaskLists(): Promise<GoogleTaskList[]> {
  const auth = getAuthState();
  if (auth.isDemoMode || !auth.isAuthenticated) {
    return mockLists;
  }

  const data = await fetchWithAuth<{ items?: GoogleTaskList[] }>(
    '/users/@me/lists?maxResults=100'
  );
  return data.items || [];
}

/**
 * Create a new task list
 */
export async function createTaskList(title: string): Promise<GoogleTaskList> {
  const auth = getAuthState();
  if (auth.isDemoMode || !auth.isAuthenticated) {
    const newList: GoogleTaskList = {
      id: `list-${Date.now()}`,
      title,
      updated: new Date().toISOString(),
    };
    mockLists.push(newList);
    mockTasks[newList.id] = [];
    return newList;
  }

  return fetchWithAuth<GoogleTaskList>('/users/@me/lists', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

/**
 * Update (rename) an existing task list
 */
export async function updateTaskList(
  taskListId: string,
  title: string
): Promise<GoogleTaskList> {
  const auth = getAuthState();
  if (auth.isDemoMode || !auth.isAuthenticated) {
    const item = mockLists.find((l) => l.id === taskListId);
    if (item) {
      item.title = title;
      return item;
    }
    throw new Error('List not found');
  }

  return fetchWithAuth<GoogleTaskList>(
    `/users/@me/lists/${encodeURIComponent(taskListId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }
  );
}

/**
 * Delete a task list
 */
export async function deleteTaskList(taskListId: string): Promise<void> {
  const auth = getAuthState();
  if (auth.isDemoMode || !auth.isAuthenticated) {
    mockLists = mockLists.filter((l) => l.id !== taskListId);
    delete mockTasks[taskListId];
    return;
  }

  await fetchWithAuth(`/users/@me/lists/${encodeURIComponent(taskListId)}`, {
    method: 'DELETE',
  });
}

/**
 * Fetch all tasks in a specific task list with full pagination
 */
export async function getTasks(taskListId: string): Promise<GoogleTask[]> {
  const auth = getAuthState();
  if (auth.isDemoMode || !auth.isAuthenticated) {
    return mockTasks[taskListId] || [];
  }

  const allTasks: GoogleTask[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const params = new URLSearchParams({
      showCompleted: 'true',
      showHidden: 'true',
      maxResults: '100',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const data = await fetchWithAuth<{
      items?: GoogleTask[];
      nextPageToken?: string;
    }>(`/lists/${encodeURIComponent(taskListId)}/tasks?${params.toString()}`);

    if (data.items && data.items.length > 0) {
      allTasks.push(...data.items);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allTasks;
}

/**
 * Create a new task or subtask
 */
export async function createTask(
  taskListId: string,
  task: {
    title: string;
    notes?: string;
    due?: string;
    parent?: string;
    status?: TaskStatus;
  }
): Promise<GoogleTask> {
  const auth = getAuthState();
  if (auth.isDemoMode || !auth.isAuthenticated) {
    const newTask: GoogleTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: task.title,
      notes: task.notes || '',
      due: task.due,
      parent: task.parent,
      status: task.status || 'needsAction',
      updated: new Date().toISOString(),
      position: `${Date.now()}`,
    };
    if (!mockTasks[taskListId]) {
      mockTasks[taskListId] = [];
    }
    mockTasks[taskListId].unshift(newTask);
    return newTask;
  }

  const queryParams = task.parent ? `?parent=${encodeURIComponent(task.parent)}` : '';
  return fetchWithAuth<GoogleTask>(
    `/lists/${encodeURIComponent(taskListId)}/tasks${queryParams}`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: task.title,
        notes: task.notes,
        due: task.due,
        status: task.status || 'needsAction',
      }),
    }
  );
}

/**
 * Update an existing task (title, notes, status, due)
 */
export async function updateTask(
  taskListId: string,
  taskId: string,
  updates: Partial<GoogleTask>
): Promise<GoogleTask> {
  const auth = getAuthState();
  if (auth.isDemoMode || !auth.isAuthenticated) {
    const list = mockTasks[taskListId] || [];
    const index = list.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      list[index] = {
        ...list[index],
        ...updates,
        updated: new Date().toISOString(),
      };
      if (updates.status === 'completed' && !list[index].completed) {
        list[index].completed = new Date().toISOString();
      } else if (updates.status === 'needsAction') {
        list[index].completed = undefined;
      }
      return list[index];
    }
    throw new Error('Task not found in demo data');
  }

  return fetchWithAuth<GoogleTask>(
    `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }
  );
}

/**
 * Move a task (change parent or position)
 */
export async function moveTask(
  taskListId: string,
  taskId: string,
  options: { parent?: string; previous?: string }
): Promise<GoogleTask> {
  const auth = getAuthState();
  if (auth.isDemoMode || !auth.isAuthenticated) {
    const list = mockTasks[taskListId] || [];
    const item = list.find((t) => t.id === taskId);
    if (item) {
      item.parent = options.parent || undefined;
      return item;
    }
    throw new Error('Task not found in demo data');
  }

  const params = new URLSearchParams();
  if (options.parent !== undefined) {
    if (options.parent) {
      params.set('parent', options.parent);
    }
  }
  if (options.previous) params.set('previous', options.previous);

  const queryStr = params.toString() ? `?${params.toString()}` : '';

  return fetchWithAuth<GoogleTask>(
    `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(
      taskId
    )}/move${queryStr}`,
    {
      method: 'POST',
    }
  );
}

/**
 * Delete a task
 */
export async function deleteTask(
  taskListId: string,
  taskId: string
): Promise<void> {
  const auth = getAuthState();
  if (auth.isDemoMode || !auth.isAuthenticated) {
    const list = mockTasks[taskListId] || [];
    mockTasks[taskListId] = list.filter(
      (t) => t.id !== taskId && t.parent !== taskId
    );
    return;
  }

  await fetchWithAuth(
    `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'DELETE',
    }
  );
}
