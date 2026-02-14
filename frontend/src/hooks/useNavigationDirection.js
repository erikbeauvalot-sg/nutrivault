import { useRef } from 'react';
import { useNavigationType } from 'react-router-dom';

/**
 * Returns the current navigation direction ('PUSH' | 'POP' | 'REPLACE')
 * and keeps it in a ref so exit animations use the correct value.
 */
export function useNavigationDirection() {
  const navType = useNavigationType();
  const directionRef = useRef(navType);
  directionRef.current = navType;
  return directionRef;
}
