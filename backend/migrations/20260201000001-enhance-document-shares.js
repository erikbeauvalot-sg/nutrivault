'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add share_token column (without unique constraint first for SQLite compatibility)
    await queryInterface.addColumn('document_shares', 'share_token', {
      type: Sequelize.STRING(64),
      allowNull: true,
      comment: 'Secure random token for public share links'
    });

    // Add expires_at column
    await queryInterface.addColumn('document_shares', 'expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Expiration timestamp for the share link'
    });

    // Add password_hash column
    await queryInterface.addColumn('document_shares', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Bcrypt hash of password for protected shares'
    });

    // Add download_count column
    await queryInterface.addColumn('document_shares', 'download_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of times the document has been downloaded via this share'
    });

    // Add max_downloads column
    await queryInterface.addColumn('document_shares', 'max_downloads', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Maximum number of allowed downloads (null = unlimited)'
    });

    // Add last_accessed_at column
    await queryInterface.addColumn('document_shares', 'last_accessed_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When the share was last accessed'
    });

    // Add is_active column
    await queryInterface.addColumn('document_shares', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether the share link is active (can be revoked)'
    });

    // Add index on share_token for fast lookups
    await queryInterface.addIndex('document_shares', ['share_token'], {
      name: 'idx_document_shares_share_token',
      unique: true,
      where: {
        share_token: {
          [Sequelize.Op.ne]: null
        }
      }
    });

    // Add index on is_active for filtering
    await queryInterface.addIndex('document_shares', ['is_active'], {
      name: 'idx_document_shares_is_active'
    });

    // Add index on expires_at for filtering expired shares
    await queryInterface.addIndex('document_shares', ['expires_at'], {
      name: 'idx_document_shares_expires_at'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('document_shares', 'idx_document_shares_share_token');
    await queryInterface.removeIndex('document_shares', 'idx_document_shares_is_active');
    await queryInterface.removeIndex('document_shares', 'idx_document_shares_expires_at');

    // Remove columns
    await queryInterface.removeColumn('document_shares', 'share_token');
    await queryInterface.removeColumn('document_shares', 'expires_at');
    await queryInterface.removeColumn('document_shares', 'password_hash');
    await queryInterface.removeColumn('document_shares', 'download_count');
    await queryInterface.removeColumn('document_shares', 'max_downloads');
    await queryInterface.removeColumn('document_shares', 'last_accessed_at');
    await queryInterface.removeColumn('document_shares', 'is_active');
  }
};
