module.exports = (sequelize, DataTypes) => {
  const Visit = sequelize.define('Visit', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    dietitian_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    visit_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    visit_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Initial, Follow-up, Final, etc.'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'SCHEDULED',
      validate: {
        isIn: [['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']]
      }
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Clinical fields (chief_complaint, assessment, recommendations, notes)
    // have been removed - now managed via custom fields
    visit_summary: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Auto-generated summary of changes made during the visit'
    },
    next_visit_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reminders_sent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of appointment reminders sent for this visit'
    },
    last_reminder_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last reminder sent'
    },
    // Google Calendar integration
    google_event_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Google Calendar event ID for this visit'
    },
    google_event_etag: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Google Calendar event ETag for change detection'
    },
    sync_status: {
      type: DataTypes.ENUM('synced', 'pending_to_google', 'pending_from_google', 'conflict', 'error'),
      allowNull: true,
      defaultValue: null,
      comment: 'Current synchronization status'
    },
    last_sync_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last successful synchronization'
    },
    last_sync_source: {
      type: DataTypes.ENUM('nutrivault', 'google', 'manual'),
      allowNull: true,
      comment: 'Source of the last synchronization'
    },
    local_modified_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last local modification in NutriVault'
    },
    remote_modified_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last modification in Google Calendar'
    },
    sync_error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message from last failed sync attempt'
    },
    sync_error_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of consecutive sync failures'
    },
    google_event_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the Google Calendar event has been deleted'
    }
  }, {
    tableName: 'visits',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['patient_id']
      },
      {
        fields: ['dietitian_id']
      },
      {
        fields: ['visit_date']
      },
      {
        fields: ['status']
      },
      {
        fields: ['sync_status']
      }
    ]
  });

  // Associations
  Visit.associate = (models) => {
    Visit.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'patient'
    });
    Visit.belongsTo(models.User, {
      foreignKey: 'dietitian_id',
      as: 'dietitian'
    });
    Visit.hasMany(models.VisitCustomFieldValue, {
      foreignKey: 'visit_id',
      as: 'customFieldValues'
    });
  };

  // Calendar-relevant fields for tracking changes
  const CALENDAR_RELEVANT_FIELDS = ['visit_date', 'visit_type', 'status', 'duration_minutes'];

  // Hook to track local modifications (before update)
  Visit.addHook('beforeUpdate', async (visit, options) => {
    // Skip if this update is coming from a sync operation
    if (options.fromSync) {
      return;
    }

    const changedFields = visit.changed();
    if (changedFields && changedFields.some(field => CALENDAR_RELEVANT_FIELDS.includes(field))) {
      // Track local modification time
      visit.local_modified_at = new Date();

      // Mark as pending sync to Google if we have an event and it was synced before
      if (visit.google_event_id && visit.sync_status !== 'conflict') {
        visit.sync_status = 'pending_to_google';
      }
    }
  });

  // Hooks for Google Calendar synchronization
  Visit.addHook('afterCreate', async (visit, options) => {
    console.log(`📅 [afterCreate] Visit ${visit.id} created, checking Google Calendar sync...`);
    try {
      // Skip if this is a sync operation
      if (options.fromSync) {
        console.log(`📅 [afterCreate] Skipping - fromSync flag set`);
        return;
      }

      // Set initial local_modified_at
      await visit.update({
        local_modified_at: new Date(),
        sync_status: 'pending_to_google'
      }, { hooks: false });

      // Only sync if dietitian has Google Calendar enabled
      const dietitian = await sequelize.models.User.findByPk(visit.dietitian_id);
      console.log(`📅 [afterCreate] Dietitian ${dietitian?.username}: google_calendar_sync_enabled=${dietitian?.google_calendar_sync_enabled}, has_token=${!!dietitian?.google_access_token}`);

      if (dietitian && dietitian.google_calendar_sync_enabled && dietitian.google_access_token) {
        const googleCalendarService = require('../backend/src/services/googleCalendar.service');
        const calendarId = dietitian.google_calendar_id || 'primary';
        console.log(`📅 [afterCreate] Syncing to Google Calendar (${calendarId})...`);
        await googleCalendarService.createOrUpdateCalendarEvent(visit, dietitian, calendarId);
        console.log(`📅 [afterCreate] ✅ Sync complete`);
      } else {
        console.log(`📅 [afterCreate] Skipping sync - Google Calendar not enabled or no token`);
      }
    } catch (error) {
      console.error('❌ [afterCreate] Error syncing visit creation to Google Calendar:', error.message);
      // Update sync status to error
      await visit.update({
        sync_status: 'error',
        sync_error_message: error.message,
        sync_error_count: (visit.sync_error_count || 0) + 1
      }, { hooks: false });
    }
  });

  Visit.addHook('afterUpdate', async (visit, options) => {
    try {
      // Skip if this is a sync operation or if visit is in conflict/error state
      if (options.fromSync) {
        return;
      }

      // Don't sync if in conflict state (needs manual resolution)
      if (visit.sync_status === 'conflict') {
        console.log(`⚠️ Skipping sync for visit ${visit.id} - in conflict state`);
        return;
      }

      // Don't sync if too many errors
      if (visit.sync_error_count >= 3) {
        console.log(`⚠️ Skipping sync for visit ${visit.id} - too many errors (${visit.sync_error_count})`);
        return;
      }

      // Only sync if dietitian has Google Calendar enabled
      const dietitian = await sequelize.models.User.findByPk(visit.dietitian_id);
      if (dietitian && dietitian.google_calendar_sync_enabled) {
        const googleCalendarService = require('../backend/src/services/googleCalendar.service');

        // Check if relevant fields changed
        const changedFields = visit.changed();

        if (changedFields && changedFields.some(field => CALENDAR_RELEVANT_FIELDS.includes(field))) {
          const calendarId = dietitian.google_calendar_id || 'primary';
          if (visit.status === 'CANCELLED') {
            // Delete from calendar if cancelled
            if (visit.google_event_id) {
              await googleCalendarService.deleteCalendarEvent(visit.google_event_id, dietitian, calendarId);
              await visit.update({
                google_event_id: null,
                google_event_etag: null,
                sync_status: 'synced',
                last_sync_at: new Date(),
                last_sync_source: 'nutrivault',
                sync_error_count: 0,
                sync_error_message: null
              }, { hooks: false });
            }
          } else {
            // Update calendar event
            await googleCalendarService.createOrUpdateCalendarEvent(visit, dietitian, calendarId);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing visit update to Google Calendar:', error);
      // Update sync status to error
      await visit.update({
        sync_status: 'error',
        sync_error_message: error.message,
        sync_error_count: (visit.sync_error_count || 0) + 1
      }, { hooks: false });
    }
  });

  Visit.addHook('afterDestroy', async (visit, options) => {
    try {
      // Only sync if dietitian has Google Calendar enabled and event exists
      const dietitian = await sequelize.models.User.findByPk(visit.dietitian_id);
      if (dietitian && dietitian.google_calendar_sync_enabled && visit.google_event_id) {
        const googleCalendarService = require('../backend/src/services/googleCalendar.service');
        const calendarId = dietitian.google_calendar_id || 'primary';
        await googleCalendarService.deleteCalendarEvent(visit.google_event_id, dietitian, calendarId);
      }
    } catch (error) {
      console.error('Error syncing visit deletion to Google Calendar:', error);
      // Don't fail the visit deletion if calendar sync fails
    }
  });

  return Visit;
};
