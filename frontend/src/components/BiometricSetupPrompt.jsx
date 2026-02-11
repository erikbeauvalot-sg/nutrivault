/**
 * BiometricSetupPrompt
 * Modal shown after first successful login on native — asks user to enable Face ID / Touch ID.
 */

import { Modal, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiShield } from 'react-icons/fi';
import * as biometricService from '../services/biometricService';

const BiometricSetupPrompt = ({ show, biometricName, onEnable, onSkip }) => {
  const { t } = useTranslation();

  const handleDontAskAgain = () => {
    biometricService.setDontAskAgain(true);
    onSkip();
  };

  return (
    <Modal show={show} centered backdrop="static" keyboard={false}>
      <Modal.Body className="text-center py-4 px-4">
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
          style={{
            width: 64,
            height: 64,
            background: 'var(--nv-accent-100, #e8f5e9)',
          }}
        >
          <FiShield size={32} style={{ color: 'var(--nv-accent-600, #2e7d32)' }} />
        </div>

        <h5 className="mb-2">
          {t('biometric.setupTitle', { type: biometricName }, `Enable ${biometricName}?`)}
        </h5>
        <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
          {t(
            'biometric.setupDescription',
            { type: biometricName },
            `Use ${biometricName} to quickly and securely unlock NutriVault without entering your password.`
          )}
        </p>

        <div className="d-grid gap-2">
          <Button variant="success" size="lg" onClick={onEnable}>
            {t('biometric.enable', { type: biometricName }, `Enable ${biometricName}`)}
          </Button>
          <Button variant="outline-secondary" onClick={onSkip}>
            {t('biometric.notNow', 'Not Now')}
          </Button>
          <Button
            variant="link"
            className="text-muted"
            style={{ fontSize: '0.8rem' }}
            onClick={handleDontAskAgain}
          >
            {t('biometric.dontAskAgain', "Don't Ask Again")}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default BiometricSetupPrompt;
