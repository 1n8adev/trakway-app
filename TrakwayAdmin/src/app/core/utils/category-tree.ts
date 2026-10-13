import { CategoryOption } from '../models/category.model';

export interface FlatCategoryOption {
  id: number;
  name: string;
  depth: number;
  is_active: boolean;
}

// Flattens the nested tree into dropdown rows (with depth for indentation).
// Skips `excludeId` and its whole branch, since a category can't move under itself.
export function flattenCategoryTree(nodes: CategoryOption[], excludeId: number | null = null, depth = 0): FlatCategoryOption[] {
  const rows: FlatCategoryOption[] = [];
  for (const node of nodes) {
    if (node.id === excludeId) continue;
    rows.push({ id: node.id, name: node.name, depth, is_active: node.is_active });
    rows.push(...flattenCategoryTree(node.children ?? [], excludeId, depth + 1));
  }
  return rows;
}
