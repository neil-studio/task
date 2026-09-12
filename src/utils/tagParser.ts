export interface TagInfo {
  name: string;
  bg: string;
  text: string;
  border: string;
}

// Preset modern pastel palettes for consistent tag badges
const TAG_PALETTES = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
];

/**
 * Parses all #tags from a text string (supports English, numbers, Chinese, underscores, hyphens).
 */
export function extractTags(text?: string): string[] {
  if (!text) return [];
  // Match #tag while avoiding double hashes or trailing symbols
  const regex = /(?:^|\s)#([a-zA-Z0-9_\u4e00-\u9fa5-]+)/g;
  const tags: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const tag = match[1].trim();
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}

/**
 * Returns a cleaned-up title by stripping trailing or inline #tags (optional display helper).
 */
export function stripTagsFromTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/(?:^|\s)#[a-zA-Z0-9_\u4e00-\u9fa5-]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Deterministically generates a beautiful color scheme for any tag name using string hashing.
 */
export function getTagStyle(tagName: string): TagInfo {
  // Special predefined tags
  const lower = tagName.toLowerCase();
  if (['doing', 'in-progress', '进行中', 'wip'].includes(lower)) {
    return {
      name: tagName,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-300',
    };
  }
  if (['urgent', 'p0', '紧急', '高优'].includes(lower)) {
    return {
      name: tagName,
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-300',
    };
  }
  if (['done', '已完成'].includes(lower)) {
    return {
      name: tagName,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-300',
    };
  }

  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TAG_PALETTES.length;
  const palette = TAG_PALETTES[index];

  return {
    name: tagName,
    bg: palette.bg,
    text: palette.text,
    border: palette.border,
  };
}

/**
 * Checks if a task has an in-progress tag.
 */
export function hasInProgressTag(tags: string[]): boolean {
  const inProgressKeywords = ['doing', 'wip', 'in-progress', '进行中'];
  return tags.some((t) => inProgressKeywords.includes(t.toLowerCase()));
}
