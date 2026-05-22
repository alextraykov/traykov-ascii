import { clsx, type ClassValue } from 'clsx';

/**
 * Combines class names conditionally.
 * Replacement for tailwind-merge - we use clsx only since we're not using Tailwind.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Creates a slot-based component props type.
 * Used for polymorphic components that can render as different elements.
 */
export type AsChildProps<T extends React.ElementType> = {
  asChild?: boolean;
} & React.ComponentPropsWithoutRef<T>;

/**
 * Type-safe object keys helper
 */
export function objectKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Generates a unique ID for accessibility purposes.
 */
let idCounter = 0;
export function generateId(prefix = 'pave'): string {
  return `${prefix}-${++idCounter}`;
}
