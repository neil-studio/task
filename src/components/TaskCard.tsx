import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { TaskTreeNode } from '../types/task';
import { getTagStyle } from '../utils/tagParser';
import { getTaskProgress } from '../utils/taskTree';
import { SubtaskList } from './SubtaskList';

interface TaskCardProps {
  task: TaskTreeNode;
  index: number;
  onToggleStatus: (taskId: string, currentStatus: 'needsAction' | 'completed') => void;
  onEditTask: (task: TaskTreeNode) => void;
  onDeleteTask: (taskId: string) => void;
  onAddSubtask: (parentTaskId: string, title: string) => Promise<void>;
  onTagClick?: (tag: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  index,
  onToggleStatus,
  onEditTask,
  onDeleteTask,
  onAddSubtask,
  onTagClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  const isCompleted = task.status === 'completed';
  const progress = getTaskProgress(task);

  // Format due date if exists
  const formattedDue = task.due
    ? new Date(task.due).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      })
    : null;
  const isOverdue =
    task.due && !isCompleted && new Date(task.due).getTime() < Date.now();

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group relative bg-white rounded-xl p-3.5 border transition-all mb-3 select-none ${
            snapshot.isDragging
              ? 'shadow-xl ring-2 ring-blue-500/50 border-blue-400 rotate-1'
              : 'border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md'
          } ${isCompleted ? 'bg-slate-50/70 border-slate-200 opacity-80' : ''}`}
        >
          {/* Top Bar: Drag handle, Checkbox, Title & Actions */}
          <div className="flex items-start gap-2">
            {/* Drag Handle */}
            <div
              {...provided.dragHandleProps}
              className="mt-0.5 text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing p-0.5"
              title="按住拖拽任务"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            {/* Complete Checkbox */}
            <button
              type="button"
              onClick={() => onToggleStatus(task.id, task.status)}
              className={`mt-0.5 w-4 h-4 rounded-md flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                isCompleted
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-slate-300 hover:border-blue-500 bg-white shadow-2xs'
              }`}
            >
              {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            {/* Task Title */}
            <div className="flex-1 min-w-0">
              <h4
                className={`text-sm font-semibold leading-snug break-words transition-all ${
                  isCompleted
                    ? 'line-through text-slate-400 font-normal'
                    : 'text-slate-800'
                }`}
              >
                {task.cleanTitle || task.title}
              </h4>

              {/* Task Notes / Description */}
              {task.notes && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {task.notes}
                </p>
              )}
            </div>

            {/* Menu trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 text-xs">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEditTask(task);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>编辑</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsExpanded(true);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>添加子任务</span>
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDeleteTask(task.id);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>删除</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tags list */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5 ml-6">
              {task.tags.map((tag) => {
                const style = getTagStyle(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(tag);
                    }}
                    className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border transition-all hover:brightness-95 cursor-pointer ${style.bg} ${style.text} ${style.border}`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}

          {/* Metadata Bar (Due date, Progress stats) */}
          <div className="flex items-center justify-between gap-2 mt-2.5 ml-6 text-xs text-slate-500">
            {/* Due date */}
            {formattedDue && (
              <div
                className={`flex items-center gap-1 font-medium text-[11px] ${
                  isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'
                }`}
                title={isOverdue ? '已逾期' : '截止日期'}
              >
                <Calendar className="w-3 h-3" />
                <span>{formattedDue}</span>
              </div>
            )}

            {/* Mother task progress bar & count */}
            {progress.hasSubtasks && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 hover:text-blue-600 transition-colors ml-auto cursor-pointer"
              >
                <span className="font-semibold">{progress.label}</span>
                <span className="text-[10px] text-slate-400">
                  ({progress.percentage}%)
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )}
          </div>

          {/* Progress Bar Line */}
          {progress.hasSubtasks && (
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  progress.percentage === 100
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          )}

          {/* Subtask Tree (Foldable) */}
          {progress.hasSubtasks && isExpanded && (
            <SubtaskList
              subtasks={task.children}
              onToggleStatus={onToggleStatus}
              onAddSubtask={(title) => onAddSubtask(task.id, title)}
              onDeleteSubtask={onDeleteTask}
            />
          )}
        </div>
      )}
    </Draggable>
  );
};
