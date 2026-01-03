import type { Category } from '@/lib/mockData';

const HIDDEN_CATEGORY_KEYS = new Set(['colares', 'pulseiras', 'brincos']);

const getCategoryKey = (category: Pick<Category, 'slug' | 'name'>) =>
  (category.slug || category.name || '').trim().toLowerCase();

export const isHiddenCategoryKey = (value: string) =>
  HIDDEN_CATEGORY_KEYS.has(value.trim().toLowerCase());

export const isHiddenCategory = (category: Pick<Category, 'slug' | 'name'>) =>
  HIDDEN_CATEGORY_KEYS.has(getCategoryKey(category));

export const filterVisibleCategories = (categories: Category[]) =>
  categories.filter((category) => !isHiddenCategory(category));
