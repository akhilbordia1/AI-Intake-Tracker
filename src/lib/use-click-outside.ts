"use client";

import { useEffect, type RefObject } from "react";

export function useClickOutside<T extends HTMLElement>(ref: RefObject<T | null>, onOutsideClick: () => void, active = true) {
  useEffect(() => {
    if (!active) return;

    function handlePointerDown(event: PointerEvent) {
      const node = ref.current;
      if (!node || node.contains(event.target as Node)) return;
      onOutsideClick();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [active, onOutsideClick, ref]);
}
