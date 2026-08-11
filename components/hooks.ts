import { useRef, useEffect } from 'react';

/**
 * A custom hook that returns a ref object with a `current` property
 * that is `true` when the component is mounted and `false` otherwise.
 * This is useful for preventing state updates on unmounted components
 * in asynchronous operations.
 */
export function useIsMounted() {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    // Return a cleanup function to run on unmount
    return () => {
      isMounted.current = false;
    };
  }, []); // Empty dependency array ensures this runs only once on mount/unmount

  return isMounted;
}
