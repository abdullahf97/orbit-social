"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Observes a sentinel element and flips to true once it enters the viewport.
 *
 * Returns a callback ref rather than taking one: list pages render their
 * sentinel only after the first page of data arrives, so a `useRef` would
 * still be null when the effect ran and the observer would never attach.
 * A callback ref re-runs the effect the moment the node mounts.
 */
export function useInView<T extends Element>(
  options: { rootMargin?: string; threshold?: number } = {},
): [(node: T | null) => void, boolean] {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);

  const ref = useCallback((next: T | null) => setNode(next), []);

  useEffect(() => {
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setInView(true), 0);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      {
        rootMargin: options.rootMargin ?? "400px 0px",
        threshold: options.threshold ?? 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, options.rootMargin, options.threshold]);

  return [ref, inView];
}
