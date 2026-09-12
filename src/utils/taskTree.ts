import { GoogleTask, TaskTreeNode } from '../types/task';
import { extractTags, stripTagsFromTitle } from './tagParser';

/**
 * Builds a tree structure from flat Google Tasks list using the `parent` field.
 * Calculates subtask completion metrics and parses tags.
 */
export function buildTaskTree(tasks: GoogleTask[]): TaskTreeNode[] {
  const taskMap = new Map<string, TaskTreeNode>();
  const rootTasks: TaskTreeNode[] = [];

  // Step 1: Initialize all TaskTreeNodes
  for (const task of tasks) {
    const combinedText = `${task.title || ''} ${task.notes || ''}`;
    const tags = extractTags(combinedText);
    const cleanTitle = stripTagsFromTitle(task.title || '') || (task.title || '');

    taskMap.set(task.id, {
      ...task,
      children: [],
      subtaskCount: 0,
      completedSubtaskCount: 0,
      tags,
      cleanTitle,
      isExpanded: true, // default expanded
    });
  }

  // Step 2: Establish parent-child relationships
  for (const task of tasks) {
    const node = taskMap.get(task.id)!;
    if (task.parent && taskMap.has(task.parent)) {
      const parentNode = taskMap.get(task.parent)!;
      parentNode.children.push(node);
    } else {
      rootTasks.push(node);
    }
  }

  // Step 3: Compute subtask counts for parent tasks
  for (const [, node] of taskMap) {
    if (node.children.length > 0) {
      node.subtaskCount = node.children.length;
      node.completedSubtaskCount = node.children.filter(
        (child) => child.status === 'completed'
      ).length;
    }
  }

  // Step 4: Sort by position if available, maintaining task list order
  const sortFn = (a: TaskTreeNode, b: TaskTreeNode) => {
    if (a.position && b.position) {
      return a.position.localeCompare(b.position);
    }
    return 0;
  };

  rootTasks.sort(sortFn);
  for (const root of rootTasks) {
    if (root.children.length > 0) {
      root.children.sort(sortFn);
    }
  }

  return rootTasks;
}

/**
 * Helper to compute progress percentage and label
 */
export function getTaskProgress(task: TaskTreeNode): {
  hasSubtasks: boolean;
  completed: number;
  total: number;
  percentage: number;
  label: string;
} {
  const total = task.subtaskCount;
  const completed = task.completedSubtaskCount;
  const hasSubtasks = total > 0;
  const percentage = hasSubtasks ? Math.round((completed / total) * 100) : 0;
  const label = `${completed}/${total}`;

  return {
    hasSubtasks,
    completed,
    total,
    percentage,
    label,
  };
}
