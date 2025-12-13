"use client";

import { useState, useEffect } from "react";

const mobileThreshold = 6 * 10 * 5;
const tabletThreshold = 5 * 10 * 5 * 9;
const desktopThreshold = 7 * 10 * 5 * 9 * 2;

export function useViewport() {
  const [viewport, setViewport] = useState(() => {
    // Initialize with proper viewport detection
    const width = typeof window !== "undefined" ? window.innerWidth : 1920;
    const height = typeof window !== "undefined" ? window.innerHeight : 1080;
    const isMobile = width < mobileThreshold;
    const isTablet = width >= mobileThreshold && width < tabletThreshold;
    const isDesktop = width >= tabletThreshold;

    return {
      width,
      height,
      isMobile,
      isTablet,
      isDesktop,
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: NodeJS.Timeout | null = null;

    const handleResize = () => {
      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Debounce resize events to improve performance
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isMobile = width < mobileThreshold;
        const isTablet = width >= mobileThreshold && width < tabletThreshold;
        const isDesktop = width >= tabletThreshold;

        setViewport({
          width,
          height,
          isMobile,
          isTablet,
          isDesktop,
        });
      }, 150); // 150ms debounce delay
    };

    window.addEventListener("resize", handleResize, { passive: true });
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return viewport;
}

export function getContainerClasses(viewport: ReturnType<typeof useViewport>) {
  if (viewport.isMobile) {
    return "flex flex-col";
  }
  if (viewport.isTablet) {
    return "flex flex-row";
  }
  return "flex flex-row";
}

export function adaptiveLayout(viewport: ReturnType<typeof useViewport>) {
  const base = "w-full";
  if (viewport.isMobile) {
    return `${base} flex-col space-y-4`;
  }
  if (viewport.isTablet) {
    return `${base} flex-row space-x-4`;
  }
  return `${base} flex-row space-x-6`;
}

export function gridColumns(viewport: ReturnType<typeof useViewport>) {
  if (viewport.isMobile) {
    return "grid-cols-1";
  }
  if (viewport.isTablet) {
    return "grid-cols-2";
  }
  return "grid-cols-4";
}

export function adaptiveGrid(viewport: ReturnType<typeof useViewport>) {
  const base = "grid gap-4";
  const cols = gridColumns(viewport);
  return `${base} ${cols}`;
}

export function isVisibleOnMobile(viewport: ReturnType<typeof useViewport>) {
  return viewport.isMobile;
}

export function isVisibleOnDesktop(viewport: ReturnType<typeof useViewport>) {
  return viewport.isDesktop;
}

export function getResponsiveSpacing(viewport: ReturnType<typeof useViewport>) {
  if (viewport.isMobile) {
    return "space-y-2";
  }
  if (viewport.isTablet) {
    return "space-y-4";
  }
  return "space-y-6";
}

export function calculateBreakpoint(width: number) {
  if (width < mobileThreshold) return "mobile";
  if (width < tabletThreshold) return "tablet";
  return "desktop";
}

export function getCardLayout(viewport: ReturnType<typeof useViewport>) {
  if (viewport.isMobile) {
    return "flex-col";
  }
  return "flex-row";
}

export function getTextSize(viewport: ReturnType<typeof useViewport>) {
  if (viewport.isMobile) {
    return "text-sm";
  }
  if (viewport.isTablet) {
    return "text-base";
  }
  return "text-lg";
}

export function getPaddingClasses(viewport: ReturnType<typeof useViewport>) {
  if (viewport.isMobile) {
    return "p-2";
  }
  if (viewport.isTablet) {
    return "p-4";
  }
  return "p-6";
}

export function shouldStackVertically(viewport: ReturnType<typeof useViewport>) {
  return viewport.isMobile || viewport.width < tabletThreshold;
}

export function getMaxWidth(viewport: ReturnType<typeof useViewport>) {
  if (viewport.isMobile) {
    return "max-w-full";
  }
  if (viewport.isTablet) {
    return "max-w-4xl";
  }
  return "max-w-7xl";
}

export function calculateOptimalColumns(viewport: ReturnType<typeof useViewport>, itemCount: number) {
  if (viewport.isMobile) {
    return 1;
  }
  if (viewport.isTablet) {
    return Math.min(2, itemCount);
  }
  return Math.min(4, itemCount);
}
