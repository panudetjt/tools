import { describe, it, expect } from "bun:test";

import {
  invariant,
  assertExists,
  isPresent,
  isDefined,
  InvariantError,
  assertNever,
} from "./invariant";

describe(invariant, () => {
  it.each([
    { description: "true", value: true },
    { description: "1", value: 1 },
    { description: "string", value: "value" },
    { description: "object", value: {} },
  ])("does not throw when condition is $description", ({ value }) => {
    expect(() => {
      invariant(value, "Should not throw");
    }).not.toThrow();
  });

  it.each([
    { description: "false", value: false },
    { description: "null", value: null },
    { description: "undefined", value: undefined },
    { description: "0", value: 0 },
    { description: "empty string", value: "" },
  ])("throws InvariantError when condition is $description", ({ value }) => {
    expect(() => {
      invariant(value, "Condition failed");
    }).toThrow(InvariantError);
  });

  it("includes message in error", () => {
    expect(() => {
      invariant(false, "Custom error message");
    }).toThrow("Invariant violation: Custom error message");
  });

  it("narrows type", () => {
    const value: string | undefined = "test";
    invariant(value, "Value must exist");
    // TypeScript now knows value is string
    expect(value).toHaveLength(4);
  });
});

describe(assertExists, () => {
  it.each([
    { description: "string", value: "value" },
    { description: "number", value: 42 },
    { description: "0", value: 0 },
    { description: "empty string", value: "" },
    { description: "false", value: false },
  ])("returns value when $description", ({ value }) => {
    expect(assertExists(value, "Should not throw")).toBe(value);
  });

  it("throws when null", () => {
    expect(() => assertExists(null, "Value required")).toThrow(InvariantError);
  });

  it("throws when undefined", () => {
    expect(() => {
      assertExists(undefined, "Value required");
    }).toThrow(InvariantError);
  });

  it("narrow type from union", () => {
    const items: (string | undefined)[] = ["a", undefined, "b"];
    const [first] = items;
    const result = assertExists(first, "First item required");
    // result is string, not string | undefined
    expect(typeof result).toBe("string");
  });
});

describe(isPresent, () => {
  it.each([
    { description: "string", value: "value" },
    { description: "0", value: 0 },
    { description: "empty string", value: "" },
    { description: "false", value: false },
    { description: "object", value: {} },
  ])("returns true for $description", ({ value }) => {
    expect(isPresent(value)).toBeTruthy();
  });

  it.each([
    { description: "null", value: null },
    { description: "undefined", value: undefined },
  ])("returns false for $description", ({ value }) => {
    expect(isPresent(value)).toBeFalsy();
  });

  it("works as type guard", () => {
    const value: number | undefined = 5;
    // oxlint-disable-next-line jest/no-conditional-in-test
    if (isPresent(value)) {
      // TypeScript knows value is number
      // oxlint-disable-next-line jest/no-conditional-expect
      expect(value.toFixed(2)).toBe("5.00");
    }
  });
});

describe(isDefined, () => {
  it("filters null/undefined from arrays", () => {
    const items: (number | null | undefined)[] = [1, null, 2, undefined, 3];
    const filtered = items.filter(isDefined);
    expect(filtered).toStrictEqual([1, 2, 3]);
    // TypeScript knows filtered is number[]
  });
});

describe(InvariantError, () => {
  it("has correct name", () => {
    const error = new InvariantError("test");
    expect(error.name).toBe("InvariantError");
  });

  it("includes prefix in message", () => {
    const error = new InvariantError("something went wrong");
    expect(error.message).toBe("Invariant violation: something went wrong");
  });
});

describe(assertNever, () => {
  it("always throws", () => {
    // We need to cast to never to test
    expect(() => assertNever("unexpected" as never)).toThrow(InvariantError);
  });
});
