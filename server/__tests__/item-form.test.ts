import { zodResolver } from "@hookform/resolvers/zod";
import { expect, it } from "vitest";
import { itemSchema } from "../../client/src/lib/itemFormSchema";

const resolve = zodResolver(itemSchema);
const options = { fields: {}, shouldUseNativeValidation: false };
const item = { name: "Fixture", type: "TOP", category: "Shirt", color: "Blue" } as const;

it("applies the item editor's default tags to valid values", async () => {
  const result = await resolve(item, undefined, options);
  expect(result).toEqual({ values: { ...item, tags: [] }, errors: {} });
});

it("preserves the item editor's required-field messages", async () => {
  const result = await resolve({ ...item, name: "", color: "" }, undefined, options);
  expect(result.values).toEqual({});
  expect(result.errors.name?.message).toBe("Name is required");
  expect(result.errors.color?.message).toBe("Color is required");
});
