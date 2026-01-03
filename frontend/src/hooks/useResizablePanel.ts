import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing resizable panels
 * @param initialHeight - Initial height of the panel in pixels
 * @param minHeight - Minimum height allowed (default: 200)
 * @param maxHeight - Maximum height allowed (default: window.innerHeight - 100)
 * @returns Object containing height, isResizing state, and resize handlers
 */
export function useResizablePanel(
  initialHeight: number = 600,
  minHeight: number = 200,
  maxHeight?: number
) {
  const [height, setHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    setStartY(e.clientY);
    setStartHeight(height);
    e.preventDefault();
  }, [height]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const delta = e.clientY - startY;
    const newHeight = startHeight + delta;
    const max = maxHeight || window.innerHeight - 100;
    
    setHeight(Math.max(minHeight, Math.min(max, newHeight)));
  }, [isResizing, startY, startHeight, minHeight, maxHeight]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return {
    height,
    isResizing,
    handleMouseDown,
    setHeight
  };
}
