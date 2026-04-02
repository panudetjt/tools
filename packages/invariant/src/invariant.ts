/**
 * Invariant utilities for type-safe assertions.
 * Use these to narrow types and prevent "Object is possibly 'undefined'" errors.
 *
 * @module invariant
 * @public
 */

/**
 * Custom error class for invariant failures.
 * Distinguishes assertion errors from other runtime errors.
 */
export class InvariantError extends Error {
  constructor(message: string) {
    super(`Invariant violation: ${message}`);
    this.name = "InvariantError";
  }
}

/**
 * Asserts that a condition is truthy. Throws an error if not.
 * Useful for runtime checks with type narrowing.
 *
 * @public
 *
 * @example
 * ```ts
 * invariant(user !== null, "User must be logged in");
 * // user is now narrowed to non-null
 * ```
 */
type InvariantFunction = (
  condition: unknown,
  message: string
) => asserts condition;

export const invariant: InvariantFunction = (condition, message) => {
  // oxlint-disable-next-line typescript-eslint/strict-boolean-expressions
  if (!condition) {
    throw new InvariantError(message);
  }
};

/**
 * Asserts that a value is not null or undefined.
 * Returns the value with narrowed type for chaining.
 *
 * @example
 * ```ts
 * const user = assertExists(users.find(u => u.id === 1), "User not found");
 * // user is now User, not User | undefined
 * ```
 */
export const assertExists = <T>(
  value: T | null | undefined,
  message: string
): T => {
  if (value === null || value === undefined) {
    throw new InvariantError(message);
  }
  return value;
};

/**
 * Type guard that checks if a value is not null or undefined.
 * Returns a boolean for use in conditionals.
 *
 * @public
 *
 * @example
 * ```ts
 * if (isPresent(maybeValue)) {
 *   // maybeValue is now narrowed to non-null
 * }
 * ```
 */
export const isPresent = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

/**
 * Type guard for filtering null/undefined from arrays.
 *
 * @public
 *
 * @example
 * ```ts
 * const users = [user1, null, user2, undefined].filter(isDefined);
 * // users is User[], not (User | null | undefined)[]
 * ```
 */
export const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

/**
 * Asserts that a value is never (exhaustiveness checking).
 * Use in switch statements to ensure all cases are handled.
 *
 * @public
 *
 * @example
 * ```ts
 * switch (status) {
 *   case "pending": return "...";
 *   case "done": return "...";
 *   default: assertNever(status);
 * }
 * ```
 */
export const assertNever = (value: never): never => {
  throw new InvariantError(`Unexpected value: ${String(value)}`);
};
