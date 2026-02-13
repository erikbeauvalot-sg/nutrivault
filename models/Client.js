module.exports = (sequelize, DataTypes) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    client_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['person', 'company']]
      }
    },
    company_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    address_line1: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    address_line2: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'France'
    },
    siret: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    vat_number: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    contact_person: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    },
    language_preference: {
      type: DataTypes.STRING(5),
      allowNull: true,
      defaultValue: 'fr'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'clients',
    timestamps: true,
    underscored: true,
    getterMethods: {
      displayName() {
        if (this.getDataValue('client_type') === 'company') {
          return this.getDataValue('company_name') || '';
        }
        return [this.getDataValue('first_name'), this.getDataValue('last_name')].filter(Boolean).join(' ');
      }
    },
    indexes: [
      { fields: ['created_by'] },
      { fields: ['client_type'] },
      { fields: ['patient_id'] },
      { fields: ['email'] },
      { fields: ['is_active'] }
    ]
  });

  return Client;
};
