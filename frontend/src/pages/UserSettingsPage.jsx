import React from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import GoogleCalendarSettings from '../components/GoogleCalendarSettings';
import ChangePasswordModal from '../components/ChangePasswordModal';

/**
 * User Settings Page
 *
 * Allows users to manage their account settings including Google Calendar integration
 */
const UserSettingsPage = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="user-settings-page">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              <h1 className="page-title">{t('settings.title', 'Settings')}</h1>

              <div className="settings-sections">
                {/* Google Calendar Settings */}
                <div className="settings-section card">
                  <div className="card-body">
                    <GoogleCalendarSettings />
                  </div>
                </div>

                {/* Account Settings */}
                <div className="settings-section card">
                  <div className="card-header">
                    <h3>{t('settings.account.title', 'Account Settings')}</h3>
                  </div>
                  <div className="card-body">
                    <div className="account-settings">
                      <div className="setting-item">
                        <h4>{t('settings.account.password.title', 'Change Password')}</h4>
                        <p className="text-muted">
                          {t('settings.account.password.description', 'Update your account password for security.')}
                        </p>
                        <ChangePasswordModal />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UserSettingsPage;