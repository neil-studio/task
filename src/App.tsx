import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleTaskList, KanbanViewMode, TaskTreeNode, TaskStatus } from './types/task';
import { AuthState } from './types/auth';
import { getAuthState, subscribeAuth } from './services/googleAuth';
import {
  getTaskLists,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from './services/googleTasksApi';
import { buildTaskTree } from './utils/taskTree';
import { Header } from './components/Header';
import { TagFilterBar } from './components/TagFilterBar';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskEditModal } from './components/TaskEditModal';
import { SettingsModal } from './components/SettingsModal';

export function App() {
  const [authState, setAuthState] = useState<AuthState>(getAuthState());
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [tasksByList, setTasksByList] = useState<Record<string, TaskTreeNode[]>>({});
  const [viewMode, setViewMode] = useState<KanbanViewMode>('status');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskTreeNode | null>(null);
  const [parentTaskIdForNew, setParentTaskIdForNew] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Keep a ref to taskLists to prevent unnecessary effect triggers
  const taskListsRef = useRef(taskLists);
  taskListsRef.current = taskLists;

  // Subscribe to auth changes
  useEffect(() => {
    return subscribeAuth((newState) => {
      setAuthState(newState);
    });
  }, []);

  // Fetch all task lists (runs on auth change or manual full refresh)
  const loadLists = useCallback(async () => {
    try {
      setIsLoading(true);
      const lists = await getTaskLists();
      setTaskLists(lists);

      setSelectedListId((prevSelected) => {
        // If previous selection is still valid, keep it!
        if (prevSelected && lists.some((l) => l.id === prevSelected)) {
          return prevSelected;
        }
        // Otherwise default to the first list
        return lists.length > 0 ? lists[0].id : '';
      });
    } catch (err) {
      console.error('Failed to load task lists', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load lists on mount or when auth state changes
  useEffect(() => {
    loadLists();
  }, [loadLists, authState.isAuthenticated, authState.isDemoMode]);

  // Fetch tasks for specific list IDs without modifying selectedListId
  const loadTasksForLists = useCallback(async (listIds: string[]) => {
    if (listIds.length === 0) return;
    try {
      setIsLoading(true);
      const results = await Promise.all(
        listIds.map(async (id) => {
          const rawTasks = await getTasks(id);
          return { id, tree: buildTaskTree(rawTasks) };
        })
      );

      setTasksByList((prev) => {
        const next = { ...prev };
        for (const res of results) {
          next[res.id] = res.tree;
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load tasks whenever selectedListId or viewMode changes
  useEffect(() => {
    if (taskLists.length === 0) return;

    if (viewMode === 'status') {
      if (selectedListId) {
        loadTasksForLists([selectedListId]);
      }
    } else {
      // In list mode, load tasks for all lists
      const allIds = taskLists.map((l) => l.id);
      loadTasksForLists(allIds);
    }
  }, [selectedListId, viewMode, taskLists, loadTasksForLists]);

  // Full manual refresh
  const handleFullRefresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const lists = await getTaskLists();
      setTaskLists(lists);

      const targetListId =
        selectedListId && lists.some((l) => l.id === selectedListId)
          ? selectedListId
          : lists[0]?.id || '';

      if (viewMode === 'status' && targetListId) {
        const raw = await getTasks(targetListId);
        setTasksByList((prev) => ({
          ...prev,
          [targetListId]: buildTaskTree(raw),
        }));
      } else if (viewMode === 'list') {
        const results = await Promise.all(
          lists.map(async (l) => ({
            id: l.id,
            tree: buildTaskTree(await getTasks(l.id)),
          }))
        );
        const map: Record<string, TaskTreeNode[]> = {};
        results.forEach((r) => {
          map[r.id] = r.tree;
        });
        setTasksByList(map);
      }
    } catch (err) {
      console.error('Refresh error', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedListId, viewMode]);

  // Compute available tags with frequencies across all visible tasks
  const availableTags = useMemo(() => {
    const counts: Record<string, number> = {};
    const currentTasks =
      viewMode === 'status'
        ? tasksByList[selectedListId] || []
        : Object.values(tasksByList).flat();

    const countFromNode = (node: TaskTreeNode) => {
      node.tags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
      node.children.forEach(countFromNode);
    };

    currentTasks.forEach(countFromNode);

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [tasksByList, selectedListId, viewMode]);

  // Tag filter handlers
  const handleToggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  const handleClearTags = () => {
    setSelectedTags([]);
  };

  // Toggle task / subtask status
  const handleToggleStatus = async (
    taskListId: string,
    taskId: string,
    currentStatus: 'needsAction' | 'completed'
  ) => {
    const nextStatus: TaskStatus =
      currentStatus === 'completed' ? 'needsAction' : 'completed';

    // Optimistic UI update
    setTasksByList((prev) => {
      const listTasks = prev[taskListId] || [];
      const updateRecursive = (nodes: TaskTreeNode[]): TaskTreeNode[] => {
        return nodes.map((n) => {
          if (n.id === taskId) {
            return {
              ...n,
              status: nextStatus,
              completed:
                nextStatus === 'completed' ? new Date().toISOString() : undefined,
            };
          }
          if (n.children.length > 0) {
            const updatedChildren = updateRecursive(n.children);
            const compCount = updatedChildren.filter(
              (c) => c.status === 'completed'
            ).length;
            return {
              ...n,
              children: updatedChildren,
              completedSubtaskCount: compCount,
            };
          }
          return n;
        });
      };
      return {
        ...prev,
        [taskListId]: updateRecursive(listTasks),
      };
    });

    try {
      await updateTask(taskListId, taskId, { status: nextStatus });
    } catch (err) {
      console.error('Failed to update task status', err);
      loadTasksForLists([taskListId]);
    }
  };

  // Move task status via drag and drop
  const handleMoveTaskStatus = async (
    taskListId: string,
    taskId: string,
    destStatus: 'todo' | 'in_progress' | 'completed'
  ) => {
    const listTasks = tasksByList[taskListId] || [];
    const task = listTasks.find((t) => t.id === taskId);
    if (!task) return;

    let nextStatus: TaskStatus = 'needsAction';
    let nextTitle = task.title;

    if (destStatus === 'completed') {
      nextStatus = 'completed';
    } else if (destStatus === 'in_progress') {
      nextStatus = 'needsAction';
      if (!/#(doing|wip|in-progress|进行中)/i.test(nextTitle)) {
        nextTitle = `${nextTitle} #doing`;
      }
    } else {
      // todo
      nextStatus = 'needsAction';
      nextTitle = nextTitle
        .replace(/(?:^|\s)#(doing|wip|in-progress|进行中)/gi, '')
        .trim();
    }

    // Optimistic update
    setTasksByList((prev) => {
      const raw = prev[taskListId] || [];
      const updated = raw.map((t) => {
        if (t.id === taskId) {
          const combined = `${nextTitle} ${t.notes || ''}`;
          return {
            ...t,
            title: nextTitle,
            status: nextStatus,
            tags: combined.match(/(?:^|\s)#([a-zA-Z0-9_\u4e00-\u9fa5-]+)/g)?.map((s) => s.trim().slice(1)) || [],
          };
        }
        return t;
      });
      return { ...prev, [taskListId]: updated };
    });

    try {
      await updateTask(taskListId, taskId, {
        status: nextStatus,
        title: nextTitle,
      });
    } catch (err) {
      console.error('Failed to move task status', err);
      loadTasksForLists([taskListId]);
    }
  };

  // Move task between different lists
  const handleMoveTaskList = async (
    sourceListId: string,
    destListId: string,
    taskId: string
  ) => {
    const sourceTasks = tasksByList[sourceListId] || [];
    const task = sourceTasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update
    setTasksByList((prev) => ({
      ...prev,
      [sourceListId]: (prev[sourceListId] || []).filter((t) => t.id !== taskId),
      [destListId]: [task, ...(prev[destListId] || [])],
    }));

    try {
      await deleteTask(sourceListId, taskId);
      await createTask(destListId, {
        title: task.title,
        notes: task.notes,
        due: task.due,
        status: task.status,
      });
      loadTasksForLists([sourceListId, destListId]);
    } catch (err) {
      console.error('Failed to move task across lists', err);
      loadTasksForLists([sourceListId, destListId]);
    }
  };

  // Add inline subtask
  const handleAddSubtask = async (
    taskListId: string,
    parentTaskId: string,
    title: string
  ) => {
    const created = await createTask(taskListId, {
      title,
      parent: parentTaskId,
      status: 'needsAction',
    });

    // Append to local state
    setTasksByList((prev) => {
      const listTasks = prev[taskListId] || [];
      const appendRecursive = (nodes: TaskTreeNode[]): TaskTreeNode[] => {
        return nodes.map((n) => {
          if (n.id === parentTaskId) {
            const newNode: TaskTreeNode = {
              ...created,
              children: [],
              subtaskCount: 0,
              completedSubtaskCount: 0,
              tags: [],
              cleanTitle: title,
              isExpanded: true,
            };
            const nextChildren = [...n.children, newNode];
            return {
              ...n,
              children: nextChildren,
              subtaskCount: nextChildren.length,
            };
          }
          if (n.children.length > 0) {
            return { ...n, children: appendRecursive(n.children) };
          }
          return n;
        });
      };
      return {
        ...prev,
        [taskListId]: appendRecursive(listTasks),
      };
    });
  };

  // Save (create or update) task from modal
  const handleSaveTask = async (params: {
    id?: string;
    taskListId: string;
    title: string;
    notes?: string;
    due?: string;
    parent?: string;
    status?: TaskStatus;
  }) => {
    if (params.id) {
      // Update
      await updateTask(params.taskListId, params.id, {
        title: params.title,
        notes: params.notes,
        due: params.due,
        status: params.status,
      });
    } else {
      // Create
      await createTask(params.taskListId, {
        title: params.title,
        notes: params.notes,
        due: params.due,
        parent: params.parent,
        status: params.status,
      });
    }
    loadTasksForLists([params.taskListId]);
  };

  // Delete task
  const handleDeleteTask = async (taskListId: string, taskId: string) => {
    setTasksByList((prev) => {
      const listTasks = prev[taskListId] || [];
      const removeRecursive = (nodes: TaskTreeNode[]): TaskTreeNode[] => {
        return nodes
          .filter((n) => n.id !== taskId)
          .map((n) => ({
            ...n,
            children: removeRecursive(n.children),
          }));
      };
      return {
        ...prev,
        [taskListId]: removeRecursive(listTasks),
      };
    });

    try {
      await deleteTask(taskListId, taskId);
    } catch (err) {
      console.error('Failed to delete task', err);
      loadTasksForLists([taskListId]);
    }
  };

  // Quick add from column
  const handleQuickAdd = (columnId: string, mode: KanbanViewMode) => {
    setTaskToEdit(null);
    setParentTaskIdForNew(null);
    if (mode === 'list') {
      setSelectedListId(columnId);
    }
    setIsTaskModalOpen(true);
  };

  const currentRootTasks = tasksByList[selectedListId] || [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Header */}
      <Header
        taskLists={taskLists}
        selectedListId={selectedListId}
        onSelectListId={(id) => {
          setSelectedListId(id);
        }}
        viewMode={viewMode}
        onChangeViewMode={(mode) => {
          setViewMode(mode);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLoading={isLoading}
        onRefresh={handleFullRefresh}
        onOpenNewTask={() => {
          setTaskToEdit(null);
          setParentTaskIdForNew(null);
          setIsTaskModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        authState={authState}
      />

      {/* Tag filter bar */}
      <TagFilterBar
        availableTags={availableTags}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        onClearTags={handleClearTags}
      />

      {/* Main Kanban Board Container */}
      <main className="flex-1 flex flex-col">
        <KanbanBoard
          viewMode={viewMode}
          taskLists={taskLists}
          selectedListId={selectedListId}
          tasksByList={tasksByList}
          searchQuery={searchQuery}
          selectedTags={selectedTags}
          onToggleStatus={handleToggleStatus}
          onEditTask={(listId, task) => {
            setSelectedListId(listId);
            setTaskToEdit(task);
            setIsTaskModalOpen(true);
          }}
          onDeleteTask={handleDeleteTask}
          onAddSubtask={handleAddSubtask}
          onQuickAdd={handleQuickAdd}
          onMoveTaskStatus={handleMoveTaskStatus}
          onMoveTaskList={handleMoveTaskList}
          onTagClick={(tag) => handleToggleTag(tag)}
        />
      </main>

      {/* Task Edit / Create Modal */}
      <TaskEditModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
          setParentTaskIdForNew(null);
        }}
        taskLists={taskLists}
        initialTaskListId={selectedListId || (taskLists[0]?.id ?? '')}
        taskToEdit={taskToEdit}
        parentTaskId={parentTaskIdForNew}
        rootTasksInList={currentRootTasks}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
      />

      {/* Settings & Auth Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        authState={authState}
        onAuthStateChange={() => {
          setAuthState(getAuthState());
          loadLists();
        }}
      />
    </div>
  );
}

export default App;
