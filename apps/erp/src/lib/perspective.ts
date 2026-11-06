"use client";

import { useEffect, useState, useCallback } from "react";

const PERSPECTIVE_KEY = "uap_active_perspective";

export function getStoredPerspective(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PERSPECTIVE_KEY);
  } catch {
    return null;
  }
}

export function setStoredPerspective(role: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (role) {
      localStorage.setItem(PERSPECTIVE_KEY, role);
    } else {
      localStorage.removeItem(PERSPECTIVE_KEY);
    }
    window.dispatchEvent(new CustomEvent("uap:perspective-change", { detail: role }));
  } catch (err) {
    console.error("Failed to set perspective:", err);
  }
}

export function usePerspective(defaultRole: string = "super_admin"): [string, (role: string) => void] {
  const [perspective, setPerspectiveState] = useState<string>(() => {
    return getStoredPerspective() || defaultRole;
  });

  useEffect(() => {
    // Synchronize on mount if stored
    const stored = getStoredPerspective();
    if (stored && stored !== perspective) {
      setPerspectiveState(stored);
    }

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      setPerspectiveState(customEvent.detail || defaultRole);
    };

    window.addEventListener("uap:perspective-change", handler);
    window.addEventListener("storage", (e) => {
      if (e.key === PERSPECTIVE_KEY) {
        setPerspectiveState(e.newValue || defaultRole);
      }
    });

    return () => {
      window.removeEventListener("uap:perspective-change", handler);
    };
  }, [defaultRole]);

  const setPerspective = useCallback((role: string) => {
    setPerspectiveState(role);
    setStoredPerspective(role);
  }, []);

  return [perspective, setPerspective];
}
