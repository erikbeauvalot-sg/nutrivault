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

  // Hooks for Google Calendar synchronization
  Visit.addHook('afterCreate', async (visit, options) => {
    try {
      // Only sync if dietitian has Google Calendar enabled
      const dietitian = await sequelize.models.User.findByPk(visit.dietitian_id);
      if (dietitian && dietitian.google_calendar_sync_enabled) {
        const googleCalendarService = require('../backend/src/services/googleCalendar.service');
        const calendarId = dietitian.google_calendar_id || 'primary';
        await googleCalendarService.createOrUpdateCalendarEvent(visit, dietitian, calendarId);
      }
    } catch (error) {
      console.error('Error syncing visit creation to Google Calendar:', error);
      // Don't fail the visit creation if calendar sync fails
    }
  });

  Visit.addHook('afterUpdate', async (visit, options) => {
    try {
      // Only sync if dietitian has Google Calendar enabled
      const dietitian = await sequelize.models.User.findByPk(visit.dietitian_id);
      if (dietitian && dietitian.google_calendar_sync_enabled) {
        const googleCalendarService = require('../backend/src/services/googleCalendar.service');

        // Check if relevant fields changed
        const changedFields = visit.changed();
        const calendarRelevantFields = ['visit_date', 'visit_type', 'status', 'duration_minutes'];

        if (changedFields.some(field => calendarRelevantFields.includes(field))) {
          const calendarId = dietitian.google_calendar_id || 'primary';
          if (visit.status === 'CANCELLED') {
            // Delete from calendar if cancelled
            await googleCalendarService.deleteCalendarEvent(visit.google_event_id, dietitian, calendarId);
            visit.google_event_id = null;
            await visit.save({ hooks: false }); // Avoid infinite loop
          } else {
            // Update calendar event
            await googleCalendarService.createOrUpdateCalendarEvent(visit, dietitian, calendarId);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing visit update to Google Calendar:', error);
      // Don't fail the visit update if calendar sync fails
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
