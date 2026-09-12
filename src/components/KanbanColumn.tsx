import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { KanbanColumnDef, TaskTreeNode } from '../types/task';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  column: KanbanColumnDef;
  tasks: TaskTreeNode[];
  onToggleStatus: (taskId: string, currentStatus: 'needsAction' | 'completed') => void;
  onEditTask: (task: TaskTreeNode) => void;
  onDeleteTask: (taskId: string) => void;
  onAddSubtask: (parentTaskId: string, title: string) => Promise<void>;
  onQuickAdd: (columnId: string) => void;
  onTagClick?: (tag: string) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  onToggleStatus,
  onEditTask,
  onDeleteTask,
  onAddSubtask,
  onQuickAdd,
  onTagClick,
}) => {
  return (
    <div className="flex-1 min-w-[300px] max-w-[380px] bg-slate-100/70 rounded-2xl flex flex-col border border-slate-200/80 max-h-[calc(100vh-140px)]">
      {/* Column Header */}
      <div className="p-3.5 pb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
          <h3 className="font-bold text-slate-800 text-sm">{column.title}</h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${column.badgeBg} ${column.badgeText}`}
          >
            {tasks.length}
          </span>
        </div>

        {/* Quick add button in this column */}
        <button
          type="button"
          onClick={() => onQuickAdd(column.id)}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-md transition-colors"
          title="在此栏快速添加任务"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Droppable Card Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2.5 overflow-y-auto transition-colors rounded-b-2xl ${
              snapshot.isDraggingOver
                ? 'bg-blue-50/60 ring-2 ring-blue-400/40'
                : ''
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onToggleStatus={onToggleStatus}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onAddSubtask={onAddSubtask}
                onTagClick={onTagClick}
              />
            ))}
            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 p-4 text-center">
                <span>暂无任务</span>
                <button
                  type="button"
                  onClick={() => onQuickAdd(column.id)}
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  点击添加任务
                </button>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};
