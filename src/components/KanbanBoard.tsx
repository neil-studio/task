import React from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import {
  GoogleTaskList,
  KanbanColumnDef,
  KanbanViewMode,
  TaskTreeNode,
} from '../types/task';
import { hasInProgressTag } from '../utils/tagParser';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  viewMode: KanbanViewMode;
  taskLists: GoogleTaskList[];
  selectedListId: string;
  tasksByList: Record<string, TaskTreeNode[]>;
  searchQuery: string;
  selectedTags: string[];
  onToggleStatus: (
    taskListId: string,
    taskId: string,
    currentStatus: 'needsAction' | 'completed'
  ) => void;
  onEditTask: (taskListId: string, task: TaskTreeNode) => void;
  onDeleteTask: (taskListId: string, taskId: string) => void;
  onAddSubtask: (
    taskListId: string,
    parentTaskId: string,
    title: string
  ) => Promise<void>;
  onQuickAdd: (columnId: string, viewMode: KanbanViewMode) => void;
  onMoveTaskStatus: (
    taskListId: string,
    taskId: string,
    destinationStatus: 'todo' | 'in_progress' | 'completed'
  ) => void;
  onMoveTaskList: (
    sourceListId: string,
    destListId: string,
    taskId: string
  ) => void;
  onTagClick?: (tag: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  viewMode,
  taskLists,
  selectedListId,
  tasksByList,
  searchQuery,
  selectedTags,
  onToggleStatus,
  onEditTask,
  onDeleteTask,
  onAddSubtask,
  onQuickAdd,
  onMoveTaskStatus,
  onMoveTaskList,
  onTagClick,
}) => {
  // Filter task by query & tag
  const filterTask = (task: TaskTreeNode): boolean => {
    // 1. Tag filter: must match all selected tags
    if (selectedTags.length > 0) {
      const hasAllTags = selectedTags.every((st) =>
        task.tags.some((t) => t.toLowerCase() === st.toLowerCase())
      );
      if (!hasAllTags) return false;
    }

    // 2. Search query: match title or notes
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (task.title || '').toLowerCase().includes(q);
      const matchNotes = (task.notes || '').toLowerCase().includes(q);
      const matchSubtasks = task.children.some(
        (c) =>
          (c.title || '').toLowerCase().includes(q) ||
          (c.notes || '').toLowerCase().includes(q)
      );
      if (!matchTitle && !matchNotes && !matchSubtasks) return false;
    }

    return true;
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    if (viewMode === 'status') {
      const destColId = destination.droppableId as
        | 'todo'
        | 'in_progress'
        | 'completed';
      onMoveTaskStatus(selectedListId, draggableId, destColId);
    } else {
      // List mode: moving from one list to another
      const sourceListId = source.droppableId;
      const destListId = destination.droppableId;
      if (sourceListId !== destListId) {
        onMoveTaskList(sourceListId, destListId, draggableId);
      }
    }
  };

  // Build columns based on viewMode
  let columns: { column: KanbanColumnDef; tasks: TaskTreeNode[] }[] = [];

  if (viewMode === 'status') {
    const allCurrentTasks = (tasksByList[selectedListId] || []).filter(
      filterTask
    );

    const todoTasks = allCurrentTasks.filter(
      (t) => t.status === 'needsAction' && !hasInProgressTag(t.tags)
    );
    const inProgressTasks = allCurrentTasks.filter(
      (t) => t.status === 'needsAction' && hasInProgressTag(t.tags)
    );
    const completedTasks = allCurrentTasks.filter(
      (t) => t.status === 'completed'
    );

    columns = [
      {
        column: {
          id: 'todo',
          title: '待办 (To Do)',
          type: 'status',
          status: 'todo',
          color: 'bg-slate-400',
          badgeBg: 'bg-slate-200/80',
          badgeText: 'text-slate-700',
        },
        tasks: todoTasks,
      },
      {
        column: {
          id: 'in_progress',
          title: '进行中 (In Progress)',
          type: 'status',
          status: 'in_progress',
          color: 'bg-amber-500',
          badgeBg: 'bg-amber-100',
          badgeText: 'text-amber-800',
        },
        tasks: inProgressTasks,
      },
      {
        column: {
          id: 'completed',
          title: '已完成 (Done)',
          type: 'status',
          status: 'completed',
          color: 'bg-emerald-500',
          badgeBg: 'bg-emerald-100',
          badgeText: 'text-emerald-800',
        },
        tasks: completedTasks,
      },
    ];
  } else {
    // List mode
    columns = taskLists.map((list) => {
      const listTasks = (tasksByList[list.id] || []).filter(filterTask);
      return {
        column: {
          id: list.id,
          title: list.title,
          type: 'list',
          listId: list.id,
          color: 'bg-blue-500',
          badgeBg: 'bg-blue-100',
          badgeText: 'text-blue-800',
        },
        tasks: listTasks,
      };
    });
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto p-4 lg:p-8">
        <div className="flex items-start gap-5 min-w-max pb-4">
          {columns.map(({ column, tasks }) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasks}
              onToggleStatus={(taskId, status) => {
                const listId =
                  viewMode === 'status' ? selectedListId : column.listId!;
                onToggleStatus(listId, taskId, status);
              }}
              onEditTask={(task) => {
                const listId =
                  viewMode === 'status' ? selectedListId : column.listId!;
                onEditTask(listId, task);
              }}
              onDeleteTask={(taskId) => {
                const listId =
                  viewMode === 'status' ? selectedListId : column.listId!;
                onDeleteTask(listId, taskId);
              }}
              onAddSubtask={async (parentTaskId, title) => {
                const listId =
                  viewMode === 'status' ? selectedListId : column.listId!;
                await onAddSubtask(listId, parentTaskId, title);
              }}
              onQuickAdd={(colId) => onQuickAdd(colId, viewMode)}
              onTagClick={onTagClick}
            />
          ))}
        </div>
      </div>
    </DragDropContext>
  );
};
