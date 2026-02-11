/**
 * PullToRefreshWrapper
 * Wraps children with pull-to-refresh functionality.
 * Shows a spinner indicator at top during refresh.
 */

import { Spinner } from 'react-bootstrap';
import usePullToRefresh from '../../hooks/usePullToRefresh';

const PullToRefreshWrapper = ({ onRefresh, children }) => {
  const { refreshing, pullDistance, containerRef } = usePullToRefresh(onRefresh);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', minHeight: '100%' }}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: refreshing ? 48 : pullDistance,
            overflow: 'hidden',
            transition: refreshing ? 'height 0.2s ease' : 'none',
          }}
        >
          <Spinner
            animation="border"
            size="sm"
            variant="primary"
            style={{
              opacity: refreshing ? 1 : Math.min(pullDistance / 80, 1),
              transform: `rotate(${pullDistance * 3}deg)`,
            }}
          />
        </div>
      )}

      {/* Content with pull transform */}
      <div
        style={{
          transform: !refreshing && pullDistance > 0 ? `translateY(${pullDistance * 0.1}px)` : 'none',
          transition: pullDistance === 0 ? 'transform 0.2s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefreshWrapper;
