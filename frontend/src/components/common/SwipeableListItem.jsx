/**
 * SwipeableListItem
 * Horizontal swipe detection — reveals action button on swipe left.
 * Springs back if swipe doesn't pass threshold.
 */

import { useState, useRef, useCallback } from 'react';

const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 80;

const SwipeableListItem = ({
  children,
  onSwipeAction,
  actionLabel = 'Delete',
  actionColor = '#dc3545',
  actionIcon = null,
  disabled = false,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const isHorizontal = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = true;
    isHorizontal.current = null;
  }, [disabled]);

  const handleTouchMove = useCallback((e) => {
    if (!swiping.current) return;

    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;

    // Determine swipe direction on first significant move
    if (isHorizontal.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontal.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
      return;
    }

    if (!isHorizontal.current) return;

    // Only allow left swipe (negative deltaX)
    if (deltaX < 0) {
      setOffsetX(Math.max(deltaX, -ACTION_WIDTH - 20));
    } else if (swiped) {
      // Allow right swipe to close
      setOffsetX(Math.min(0, -ACTION_WIDTH + deltaX));
    }
  }, [swiped]);

  const handleTouchEnd = useCallback(() => {
    swiping.current = false;
    isHorizontal.current = null;

    if (Math.abs(offsetX) >= SWIPE_THRESHOLD) {
      setOffsetX(-ACTION_WIDTH);
      setSwiped(true);
    } else {
      setOffsetX(0);
      setSwiped(false);
    }
  }, [offsetX]);

  const handleAction = () => {
    setOffsetX(0);
    setSwiped(false);
    if (onSwipeAction) onSwipeAction();
  };

  const handleClose = () => {
    setOffsetX(0);
    setSwiped(false);
  };

  return (
    <div
      style={{ position: 'relative', overflow: 'hidden' }}
      onClick={swiped ? handleClose : undefined}
    >
      {/* Action button behind */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: ACTION_WIDTH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: actionColor,
          color: '#fff',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 600,
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleAction();
        }}
      >
        {actionIcon || actionLabel}
      </div>

      {/* Sliding content */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping.current ? 'none' : 'transform 0.25s ease',
          position: 'relative',
          zIndex: 1,
          backgroundColor: 'inherit',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableListItem;
