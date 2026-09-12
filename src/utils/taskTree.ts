import { GoogleTask, TaskTreeNode } from '../types/task';
import { extractTags, stripTagsFromTitle } from './tagParser';

/**
 * Builds a tree structure from flat Google Tasks list using the `parent` field
 * and smart hierarchy detection.
 */
export function buildTaskTree(tasks: GoogleTask[]): TaskTreeNode[] {
  const taskMap = new Map<string, TaskTreeNode>();
  const nodes: TaskTreeNode[] = [];

  // Step 1: Initialize all TaskTreeNodes
  for (const task of tasks) {
    const combinedText = `${task.title || ''} ${task.notes || ''}`;
    const tags = extractTags(combinedText);
    const cleanTitle = stripTagsFromTitle(task.title || '') || (task.title || '');

    const node: TaskTreeNode = {
      ...task,
      children: [],
      subtaskCount: 0,
      completedSubtaskCount: 0,
      tags,
      cleanTitle,
      isExpanded: true,
    };

    taskMap.set(task.id, node);
    nodes.push(node);
  }

  // Sort nodes by position first to maintain user's visual sequence in Google Tasks
  nodes.sort((a, b) => {
    if (a.position && b.position) {
      return a.position.localeCompare(b.position);
    }
    return 0;
  });

  const rootTasks: TaskTreeNode[] = [];
  let previousRootTask: TaskTreeNode | null = null;

  // Step 2: Establish parent-child relationships
  for (const node of nodes) {
    // 2.1 Native Google Tasks parent relationship
    if (node.parent && taskMap.has(node.parent)) {
      const parentNode = taskMap.get(node.parent)!;
      parentNode.children.push(node);
      continue;
    }

    // 2.2 Smart pattern detection: if title starts with ↳, ->, or indented dashes and has a preceding task
    const rawTitle = (node.title || '').trimStart();
    const hasSubtaskPrefix =
      rawTitle.startsWith('↳') ||
      rawTitle.startsWith('->') ||
      rawTitle.startsWith('-->') ||
      (node.title || '').startsWith('    ');

    if (hasSubtaskPrefix && previousRootTask) {
      // Clean up the prefix for clean visual display
      node.cleanTitle = node.cleanTitle
        .replace(/^(↳|->|-->|\s{2,})\s*/, '')
        .trim();
      node.parent = previousRootTask.id;
      previousRootTask.children.push(node);
      continue;
    }

    // Otherwise it's a top-level root task
    rootTasks.push(node);
    previousRootTask = node;
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
