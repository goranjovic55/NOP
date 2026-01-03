import { useState, useEffect, useRef, RefObject } from 'react';

/**
 * Custom hook for managing dropdown visibility with click-outside detection
 * @param initialState - Initial visibility state (default: false)
 * @returns Tuple of [isOpen, setIsOpen, dropdownRef]
 */
export function useDropdown(initialState = false): [boolean, (open: boolean) => void, RefObject<HTMLDivElement>] {
  const [isOpen, setIsOpen] = useState(initialState);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return [isOpen, setIsOpen, dropdownRef];
}

/**
 * Custom hook for managing multiple dropdowns with click-outside detection
 * @param count - Number of dropdowns to manage
 * @returns Array of [isOpen, setIsOpen, ref] tuples for each dropdown
 */
export function useDropdowns(count: number) {
  const dropdowns = Array.from({ length: count }, () => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    return { isOpen, setIsOpen, ref };
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      dropdowns.forEach(({ ref, setIsOpen }) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return dropdowns;
}
