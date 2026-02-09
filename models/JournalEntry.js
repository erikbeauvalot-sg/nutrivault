module.exports = (sequelize, DataTypes) => {
  const JournalEntry = sequelize.define('JournalEntry', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    entry_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true
      }
    },
    entry_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'note',
      validate: {
        isIn: [['food', 'symptom', 'mood', 'activity', 'note', 'other']]
      }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    mood: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['very_bad', 'bad', 'neutral', 'good', 'very_good']]
      }
    },
    energy_level: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    tags: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('tags');
        if (!raw) return [];
        try { return JSON.parse(raw); } catch { return []; }
      },
      set(val) {
        this.setDataValue('tags', val ? JSON.stringify(val) : null);
      }
    },
    is_private: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'journal_entries',
    timestamps: true,
    paranoid: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { name: 'idx_journal_entries_patient', fields: ['patient_id'] },
      { name: 'idx_journal_entries_date', fields: ['entry_date'] },
      { name: 'idx_journal_entries_patient_date', fields: ['patient_id', 'entry_date'] }
    ]
  });

  JournalEntry.associate = (models) => {
    JournalEntry.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'patient'
    });
    JournalEntry.hasMany(models.JournalComment, {
      foreignKey: 'journal_entry_id',
      as: 'comments'
    });
  };

  return JournalEntry;
};
