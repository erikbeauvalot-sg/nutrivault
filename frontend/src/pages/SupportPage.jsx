/**
 * Support Page
 * Public page accessible without authentication — required by Apple App Store.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './PrivacyPolicyPage.css';

const SupportPage = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language?.startsWith('fr') ? 'fr' : 'en');
  const isFr = lang === 'fr';

  return (
    <div className="privacy-page">
      <div className="privacy-wrapper">
        <header className="privacy-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="privacy-brand" onClick={() => navigate('/login')} role="button" tabIndex={0}>
            <span className="privacy-brand-icon">🌱</span>
            <span className="privacy-brand-title">NutriVault</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => setLang('fr')} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #ccc', background: isFr ? '#2d6a4f' : 'transparent', color: isFr ? '#fff' : '#555', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>FR</button>
            <button onClick={() => setLang('en')} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #ccc', background: !isFr ? '#2d6a4f' : 'transparent', color: !isFr ? '#fff' : '#555', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>EN</button>
          </div>
        </header>

        <article className="privacy-card">
          <h1 className="privacy-title">
            {isFr ? 'Support & Aide' : 'Support & Help'}
          </h1>
          <p className="privacy-updated">
            {isFr ? 'Dernière mise à jour : mars 2026' : 'Last updated: March 2026'}
          </p>

          <section className="privacy-section">
            <h2>{isFr ? 'Contacter le support' : 'Contact Support'}</h2>
            <p>
              {isFr
                ? 'Pour toute question, problème technique ou demande d\'assistance concernant l\'application NutriVault, vous pouvez nous contacter par email :'
                : 'For any questions, technical issues, or assistance requests regarding the NutriVault app, you can reach us by email:'}
            </p>
            <p>
              <a href="mailto:support_nutrivault@beauvalot.com" style={{ color: '#2d6a4f', fontWeight: 600 }}>
                support_nutrivault@beauvalot.com
              </a>
            </p>
            <p>
              {isFr
                ? 'Nous nous efforçons de répondre à toutes les demandes dans un délai de 48 heures ouvrées.'
                : 'We strive to respond to all requests within 48 business hours.'}
            </p>
          </section>

          <section className="privacy-section">
            <h2>{isFr ? 'Questions fréquentes' : 'Frequently Asked Questions'}</h2>

            <h3>{isFr ? 'Comment me connecter ?' : 'How do I log in?'}</h3>
            <p>
              {isFr
                ? 'Vos identifiants vous sont fournis par votre diététicien(ne). Si vous avez oublié votre mot de passe, utilisez le lien "Mot de passe oublié" sur la page de connexion.'
                : 'Your login credentials are provided by your dietitian. If you forgot your password, use the "Forgot password" link on the login page.'}
            </p>

            <h3>{isFr ? 'Comment accéder à mon espace patient ?' : 'How do I access my patient portal?'}</h3>
            <p>
              {isFr
                ? 'Une fois connecté, vous accédez directement à votre espace personnel où vous pouvez consulter vos consultations, plans de repas et messages.'
                : 'Once logged in, you access your personal space where you can view your consultations, meal plans, and messages.'}
            </p>

            <h3>{isFr ? 'Mes données sont-elles sécurisées ?' : 'Is my data secure?'}</h3>
            <p>
              {isFr
                ? 'Oui. Toutes vos données de santé sont chiffrées et stockées de manière sécurisée. Consultez notre politique de confidentialité pour en savoir plus.'
                : 'Yes. All your health data is encrypted and stored securely. See our privacy policy for more details.'}
              {' '}
              <a href="/privacy" style={{ color: '#2d6a4f' }}>
                {isFr ? 'Politique de confidentialité' : 'Privacy Policy'}
              </a>
            </p>

            <h3>{isFr ? 'Comment signaler un problème technique ?' : 'How do I report a technical issue?'}</h3>
            <p>
              {isFr
                ? 'Envoyez un email à support_nutrivault@beauvalot.com en décrivant le problème rencontré, votre appareil et la version de l\'application.'
                : 'Send an email to support_nutrivault@beauvalot.com describing the issue, your device, and the app version.'}
            </p>
          </section>

          <section className="privacy-section">
            <h2>{isFr ? 'À propos de NutriVault' : 'About NutriVault'}</h2>
            <p>
              {isFr
                ? 'NutriVault est une plateforme de suivi nutritionnel connectant les diététiciens à leurs patients. L\'application est disponible sur iOS et via navigateur web.'
                : 'NutriVault is a nutrition tracking platform connecting dietitians with their patients. The app is available on iOS and via web browser.'}
            </p>
            <p>
              {isFr ? 'Développé par' : 'Developed by'}{' '}
              <strong>Antigravity</strong>
              {' — '}
              <a href="mailto:support_nutrivault@beauvalot.com" style={{ color: '#2d6a4f' }}>
                support_nutrivault@beauvalot.com
              </a>
            </p>
          </section>
        </article>

        <footer className="privacy-footer">
          <p>© {new Date().getFullYear()} NutriVault · Antigravity</p>
          <p>
            <a href="/privacy">{isFr ? 'Politique de confidentialité' : 'Privacy Policy'}</a>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default SupportPage;
