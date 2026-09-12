export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
  selfLink?: string;
}

export type TaskStatus = 'needsAction' | 'completed';

export interface GoogleTask {
  id: string;
  title: string;
  updated?: string;
  parent?: string;
  position?: string;
  notes?: string;
  status: TaskStatus;
  due?: string;
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
  links?: Array<{
    type: string;
    description: string;
    link: string;
  }>;
}

export interface TaskTreeNode extends GoogleTask {
  children: TaskTreeNode[];
  subtaskCount: number;
  completedSubtaskCount: number;
  tags: string[];
  cleanTitle: string;
  isExpanded?: boolean;
}

export type KanbanViewMode = 'status' | 'list';

export type KanbanStatus = 'todo' | 'in_progress' | 'completed';

export interface KanbanColumnDef {
  id: string;
  title: string;
  type: 'status' | 'list';
  status?: KanbanStatus;
  listId?: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}
