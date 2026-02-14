import { useRef, useEffect, useState } from 'react';
import { useNavigationType } from 'react-router-dom';
import { isNative } from '../../utils/platform';

/**
 * iOS-style page transition wrapper.
 * Pure CSS animations — no external dependencies.
 * PUSH: slide in from right. POP: slide in from left. Web: no animation.
 */
const AnimatedPage = ({ children, locationKey }) => {
  const navType = useNavigationType();
  const [animClass, setAnimClass] = useState('');
  const prevKeyRef = useRef(locationKey);

  useEffect(() => {
    // Skip animation on initial mount
    if (prevKeyRef.current === locationKey) return;
    prevKeyRef.current = locationKey;

    const cls = navType === 'POP' ? 'page-slide-from-left' : 'page-slide-from-right';
    setAnimClass(cls);

    // Remove class after animation completes to avoid replaying
    const timer = setTimeout(() => setAnimClass(''), 400);
    return () => clearTimeout(timer);
  }, [locationKey, navType]);

  if (!isNative) {
    return children;
  }

  return (
    <div className={`animated-page ${animClass}`}>
      {children}
    </div>
  );
};

export default AnimatedPage;
