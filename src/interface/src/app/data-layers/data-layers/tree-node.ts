import { DataLayer } from '@types';

/**
 * A tree node that can either be a "category" node (with children)
 * or a "leaf" node representing a single DataItem (via `item`).
 */
export interface TreeNode {
  name: string;
  children?: TreeNode[];
  item?: DataLayer;
}

/**
 * Builds a nested TreeNode structure from an array of DataItems,
 * using each item's `path` array to define the category nesting.
 */
export function buildPathTree(items: DataLayer[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const item of items) {
    // Provide a default array if `item.path` is nullish
    const path = item.path ?? [];
    let currentLevel = root;

    // Walk through each name in the `path` array
    for (const categoryName of path) {
      // Try to find an existing node at this level
      let existing = currentLevel.find(
        (node) => node.name === categoryName && !node.item
      );

      // If not found, create a new category node
      if (!existing) {
        existing = { name: categoryName, children: [] };
        currentLevel.push(existing);
      }

      // Descend into the children of this category
      if (!existing.children) {
        existing.children = [];
      }
      currentLevel = existing.children;
    }

    // After walking the path, add a leaf node for the DataItem
    currentLevel.push({ name: item.name, item });
  }

  return root;
}
