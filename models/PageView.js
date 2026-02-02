module.exports = (sequelize, DataTypes) => {
  const PageView = sequelize.define('PageView', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    page_path: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'The URL path being viewed'
    },
    visitor_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Anonymous visitor identifier (from cookie)'
    },
    session_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Session identifier'
    },
    referrer: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      comment: 'Referrer URL'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser user agent string'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'Visitor IP address (anonymized)'
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Country from IP geolocation'
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'City from IP geolocation'
    },
    device_type: {
      type: DataTypes.ENUM('desktop', 'mobile', 'tablet', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown',
      comment: 'Type of device'
    },
    browser: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Browser name'
    },
    os: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Operating system'
    },
    utm_source: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'UTM source parameter'
    },
    utm_medium: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'UTM medium parameter'
    },
    utm_campaign: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'UTM campaign parameter'
    }
  }, {
    tableName: 'page_views',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['page_path']
      },
      {
        fields: ['visitor_id']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['page_path', 'created_at']
      }
    ]
  });

  return PageView;
};
