import { useEffect } from 'react';

/**
 * Shows the browser's native "Leave site?" confirmation dialog
 * when the user tries to close/reload the tab while there are unsaved changes.
 *
 * Usage:
 *   useUnsavedChanges(formDirty);
 */
export function useUnsavedChanges(hasUnsavedChanges: boolean) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages but returnValue must be set
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);
}
