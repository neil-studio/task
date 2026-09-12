import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Subscribe to auth changes
  useEffect(() => {
    return subscribeAuth((newState) => {
      setAuthState(newState);
    });
  }, []);

  // Fetch task lists & tasks
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const lists = await getTaskLists();
      setTaskLists(lists);

      if (lists.length > 0) {
        const currentListId =
          selectedListId && lists.some((l) => l.id === selectedListId)
            ? selectedListId
            : lists[0].id;
        setSelectedListId(currentListId);

        // In 'list' mode, fetch all lists; in 'status' mode, fetch current selected list
        const listsToFetch =
          viewMode === 'list' ? lists : lists.filter((l) => l.id === currentListId);

        const tasksMap: Record<string, TaskTreeNode[]> = {};
        await Promise.all(
          listsToFetch.map(async (list) => {
            const rawTasks = await getTasks(list.id);
            tasksMap[list.id] = buildTaskTree(rawTasks);
          })
        );

        setTasksByList((prev) => ({ ...prev, ...tasksMap }));
      } else {
        setTasksByList({});
      }
    } catch (err) {
      console.error('Failed to load tasks data', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedListId, viewMode]);

  // Initial load or auth change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      // Revert on error
      fetchData();
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
      fetchData();
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
      // In Google Tasks API, moving across lists is done by recreating or move
      await deleteTask(sourceListId, taskId);
      await createTask(destListId, {
        title: task.title,
        notes: task.notes,
        due: task.due,
        status: task.status,
      });
      fetchData();
    } catch (err) {
      console.error('Failed to move task across lists', err);
      fetchData();
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
    fetchData();
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
      fetchData();
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
          fetchData();
        }}
        viewMode={viewMode}
        onChangeViewMode={(mode) => {
          setViewMode(mode);
          fetchData();
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLoading={isLoading}
        onRefresh={fetchData}
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
          fetchData();
        }}
      />
    </div>
  );
}

export default App;
