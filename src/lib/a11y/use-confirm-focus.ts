"use client";

import { useEffect, useRef } from "react";

// A "Delete"-style button that swaps itself for a confirm/cancel step
// unmounts itself in the process, so the browser drops focus to <body> with
// no cue for a keyboard or screen-reader user. Attach the returned ref to
// the step's Cancel/Keep control (the safe, reversible default) and this
// moves focus onto it as soon as `active` (the confirming flag) turns true.
export function useConfirmFocus<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (active) ref.current?.focus();
  }, [active]);
  return ref;
}
