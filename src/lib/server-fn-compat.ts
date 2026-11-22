"use client";

import { useCallback } from "react";

// Server actions replace createServerFn. Callers used `fn({ data })`; this keeps that call shape.
// The returned function is stable across renders, so it is safe in effect dependency lists.
export function useServerFn<I, O>(fn: (input: I) => Promise<O>) {
  return useCallback(
    (opts: { data: I } | I) => {
      const input = opts && typeof opts === "object" && "data" in opts ? (opts as { data: I }).data : (opts as I);
      return fn(input);
    },
    [fn],
  );
}
