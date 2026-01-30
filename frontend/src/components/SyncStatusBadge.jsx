import React from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

/**
 * SyncStatusBadge Component
 *
 * Displays the synchronization status of a visit with Google Calendar.
 * Shows appropriate icon and color based on sync state.
 */
const SyncStatusBadge = ({ status, showLabel = true, size = 'sm', onClick }) => {
  const { t } = useTranslation();

  const getStatusConfig = (syncStatus) => {
    switch (syncStatus) {
      case 'synced':
        return {
          icon: 'bi-check-circle-fill',
          color: 'success',
          label: t('googleCalendar.syncStatus.synced', 'Synced'),
          tooltip: t('googleCalendar.syncStatus.syncedTooltip', 'Synchronized with Google Calendar')
        };
      case 'pending_to_google':
        return {
          icon: 'bi-arrow-up-circle',
          color: 'warning',
          label: t('googleCalendar.syncStatus.pendingToGoogle', 'Pending'),
          tooltip: t('googleCalendar.syncStatus.pendingToGoogleTooltip', 'Changes pending sync to Google Calendar')
        };
      case 'pending_from_google':
        return {
          icon: 'bi-arrow-down-circle',
          color: 'info',
          label: t('googleCalendar.syncStatus.pendingFromGoogle', 'Updating'),
          tooltip: t('googleCalendar.syncStatus.pendingFromGoogleTooltip', 'Changes pending from Google Calendar')
        };
      case 'conflict':
        return {
          icon: 'bi-exclamation-triangle-fill',
          color: 'danger',
          label: t('googleCalendar.syncStatus.conflict', 'Conflict'),
          tooltip: t('googleCalendar.syncStatus.conflictTooltip', 'Conflicting changes - manual resolution required')
        };
      case 'error':
        return {
          icon: 'bi-x-circle-fill',
          color: 'danger',
          label: t('googleCalendar.syncStatus.error', 'Error'),
          tooltip: t('googleCalendar.syncStatus.errorTooltip', 'Sync error occurred')
        };
      default:
        return {
          icon: 'bi-cloud-slash',
          color: 'secondary',
          label: t('googleCalendar.syncStatus.notSynced', 'Not synced'),
          tooltip: t('googleCalendar.syncStatus.notSyncedTooltip', 'Not connected to Google Calendar')
        };
    }
  };

  const config = getStatusConfig(status);

  const sizeClasses = {
    xs: 'badge-xs',
    sm: 'badge-sm',
    md: '',
    lg: 'badge-lg'
  };

  const iconSizes = {
    xs: 'fs-7',
    sm: 'fs-6',
    md: 'fs-5',
    lg: 'fs-4'
  };

  const badgeClass = `badge bg-${config.color} ${sizeClasses[size] || ''} ${onClick ? 'cursor-pointer' : ''}`;
  const iconClass = `bi ${config.icon} ${iconSizes[size] || ''} ${showLabel ? 'me-1' : ''}`;

  const handleClick = (e) => {
    if (onClick) {
      e.stopPropagation();
      onClick(status);
    }
  };

  return (
    <span
      className={badgeClass}
      title={config.tooltip}
      onClick={handleClick}
      style={onClick ? { cursor: 'pointer' } : {}}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && handleClick(e) : undefined}
    >
      <i className={iconClass}></i>
      {showLabel && config.label}
    </span>
  );
};

SyncStatusBadge.propTypes = {
  status: PropTypes.oneOf(['synced', 'pending_to_google', 'pending_from_google', 'conflict', 'error', null]),
  showLabel: PropTypes.bool,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  onClick: PropTypes.func
};

export default SyncStatusBadge;
