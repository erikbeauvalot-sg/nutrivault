/**
 * Privacy Policy Page
 * Public page accessible without authentication — required by Apple App Store.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './PrivacyPolicyPage.css';

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isFr = i18n.language?.startsWith('fr');

  return (
    <div className="privacy-page">
      <div className="privacy-wrapper">
        <header className="privacy-header">
          <div className="privacy-brand" onClick={() => navigate('/login')} role="button" tabIndex={0}>
            <span className="privacy-brand-icon">{'🌱'}</span>
            <span className="privacy-brand-title">NutriVault</span>
          </div>
        </header>

        <article className="privacy-card">
          <h1 className="privacy-title">
            {isFr ? 'Politique de Confidentialité' : 'Privacy Policy'}
          </h1>
          <p className="privacy-updated">
            {isFr ? 'Dernière mise à jour : 14 février 2026' : 'Last updated: February 14, 2026'}
          </p>

          <hr className="privacy-separator" />

          {isFr ? <FrenchContent /> : <EnglishContent />}
        </article>

        <footer className="privacy-footer">
          <button className="privacy-back-btn" onClick={() => navigate('/login')}>
            {isFr ? '← Retour à l\'accueil' : '← Back to home'}
          </button>
        </footer>
      </div>
    </div>
  );
};

/* ─── French Version ─── */
const FrenchContent = () => (
  <>
    <section className="privacy-section">
      <h2>1. Introduction</h2>
      <p>
        NutriVault (ci-après « l'Application ») est une plateforme de gestion
        diététique développée et opérée par Marion Beauvalot, diététicienne-nutritionniste.
        La présente politique décrit comment nous collectons, utilisons et protégeons vos données personnelles,
        conformément au Règlement Général sur la Protection des Données (RGPD).
      </p>
    </section>

    <section className="privacy-section">
      <h2>2. Responsable du traitement</h2>
      <ul>
        <li><strong>Responsable :</strong> Marion Beauvalot</li>
        <li><strong>Profession :</strong> Diététicienne-nutritionniste</li>
        <li><strong>Contact :</strong> mariondiet@beauvalot.com</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>3. Données collectées</h2>
      <p>Nous collectons les catégories de données suivantes :</p>
      <h3>Données d'identification</h3>
      <ul>
        <li>Nom, prénom, adresse e-mail</li>
        <li>Numéro de téléphone (optionnel)</li>
        <li>Identifiant de compte</li>
      </ul>
      <h3>Données de santé</h3>
      <ul>
        <li>Mesures anthropométriques (poids, taille, IMC)</li>
        <li>Données nutritionnelles et habitudes alimentaires</li>
        <li>Résultats biologiques (si renseignés)</li>
        <li>Objectifs et suivis diététiques</li>
        <li>Journal alimentaire</li>
      </ul>
      <h3>Données techniques</h3>
      <ul>
        <li>Adresse IP et informations de connexion</li>
        <li>Type d'appareil et système d'exploitation</li>
        <li>Données d'authentification biométrique (Face ID / Touch ID — traitées localement sur l'appareil)</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>4. Finalités du traitement</h2>
      <ul>
        <li>Suivi diététique et nutritionnel personnalisé</li>
        <li>Communication entre patients et diététicien</li>
        <li>Gestion des rendez-vous et consultations</li>
        <li>Facturation et gestion administrative</li>
        <li>Amélioration du service et analyses statistiques anonymisées</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>5. Base légale</h2>
      <ul>
        <li><strong>Exécution du contrat :</strong> la gestion de votre suivi diététique</li>
        <li><strong>Intérêt légitime :</strong> amélioration du service et sécurité</li>
        <li><strong>Consentement :</strong> notifications push, communications marketing</li>
        <li><strong>Obligation légale :</strong> conservation des données comptables</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>6. Durée de conservation</h2>
      <ul>
        <li><strong>Données de santé :</strong> 5 ans après la dernière consultation</li>
        <li><strong>Données de facturation :</strong> 10 ans (obligation légale)</li>
        <li><strong>Données de compte :</strong> supprimées à la demande ou 3 ans après dernière activité</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>7. Partage des données</h2>
      <p>
        Vos données ne sont <strong>jamais vendues</strong> à des tiers. Elles peuvent être partagées avec :
      </p>
      <ul>
        <li>Votre diététicien(ne) traitant(e) dans le cadre du suivi</li>
        <li>Nos prestataires techniques (hébergement, e-mail) sous contrat de sous-traitance RGPD</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>8. Sécurité</h2>
      <ul>
        <li>Chiffrement des communications (HTTPS/TLS)</li>
        <li>Authentification sécurisée par JWT</li>
        <li>Authentification biométrique optionnelle (traitée localement)</li>
        <li>Accès restreint par rôles (RBAC)</li>
        <li>Sauvegardes régulières et chiffrées</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>9. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Accès :</strong> obtenir une copie de vos données</li>
        <li><strong>Rectification :</strong> corriger vos données inexactes</li>
        <li><strong>Suppression :</strong> demander l'effacement de vos données</li>
        <li><strong>Portabilité :</strong> recevoir vos données dans un format structuré</li>
        <li><strong>Opposition :</strong> vous opposer au traitement de vos données</li>
        <li><strong>Limitation :</strong> demander la limitation du traitement</li>
      </ul>
      <p>
        Pour exercer vos droits, contactez-nous à <strong>mariondiet@beauvalot.com</strong>.
        Nous répondrons dans un délai de 30 jours.
      </p>
    </section>

    <section className="privacy-section">
      <h2>10. Cookies</h2>
      <p>
        L'application utilise des cookies strictement nécessaires au fonctionnement (authentification, préférences).
        Les cookies analytiques ne sont déposés qu'avec votre consentement explicite.
      </p>
    </section>

    <section className="privacy-section">
      <h2>11. Application mobile</h2>
      <p>
        L'application iOS utilise les fonctionnalités suivantes de votre appareil :
      </p>
      <ul>
        <li><strong>Face ID / Touch ID :</strong> authentification biométrique (données traitées localement, jamais transmises)</li>
        <li><strong>Notifications push :</strong> rappels de rendez-vous et messages (avec votre consentement)</li>
        <li><strong>Caméra :</strong> prise de photos de documents (avec votre autorisation)</li>
        <li><strong>Stockage local :</strong> cache hors-ligne pour une utilisation sans connexion</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>12. Modifications</h2>
      <p>
        Cette politique peut être mise à jour. En cas de modification significative,
        vous serez informé(e) via l'application ou par e-mail.
      </p>
    </section>

    <section className="privacy-section">
      <h2>13. Contact</h2>
      <p>
        Pour toute question relative à cette politique ou à vos données personnelles :
      </p>
      <ul>
        <li><strong>E-mail :</strong> mariondiet@beauvalot.com</li>
        <li><strong>Site web :</strong> beauvalot.com</li>
      </ul>
      <p>
        Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).
      </p>
    </section>
  </>
);

/* ─── English Version ─── */
const EnglishContent = () => (
  <>
    <section className="privacy-section">
      <h2>1. Introduction</h2>
      <p>
        NutriVault (the "Application") is a dietetic management platform developed and operated
        by Marion Beauvalot, registered dietitian-nutritionist. This policy describes how we collect,
        use, and protect your personal data, in compliance with the General Data Protection
        Regulation (GDPR).
      </p>
    </section>

    <section className="privacy-section">
      <h2>2. Data Controller</h2>
      <ul>
        <li><strong>Controller:</strong> Marion Beauvalot</li>
        <li><strong>Profession:</strong> Registered Dietitian-Nutritionist</li>
        <li><strong>Contact:</strong> mariondiet@beauvalot.com</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>3. Data Collected</h2>
      <p>We collect the following categories of data:</p>
      <h3>Identification Data</h3>
      <ul>
        <li>Name, surname, email address</li>
        <li>Phone number (optional)</li>
        <li>Account identifier</li>
      </ul>
      <h3>Health Data</h3>
      <ul>
        <li>Anthropometric measurements (weight, height, BMI)</li>
        <li>Nutritional data and dietary habits</li>
        <li>Lab results (if provided)</li>
        <li>Dietetic objectives and follow-ups</li>
        <li>Food journal</li>
      </ul>
      <h3>Technical Data</h3>
      <ul>
        <li>IP address and connection information</li>
        <li>Device type and operating system</li>
        <li>Biometric authentication data (Face ID / Touch ID — processed locally on device)</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>4. Purpose of Processing</h2>
      <ul>
        <li>Personalized dietetic and nutritional follow-up</li>
        <li>Communication between patients and dietitians</li>
        <li>Appointment and consultation management</li>
        <li>Billing and administrative management</li>
        <li>Service improvement and anonymized statistical analysis</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>5. Legal Basis</h2>
      <ul>
        <li><strong>Contract performance:</strong> managing your dietetic follow-up</li>
        <li><strong>Legitimate interest:</strong> service improvement and security</li>
        <li><strong>Consent:</strong> push notifications, marketing communications</li>
        <li><strong>Legal obligation:</strong> accounting data retention</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>6. Data Retention</h2>
      <ul>
        <li><strong>Health data:</strong> 5 years after the last consultation</li>
        <li><strong>Billing data:</strong> 10 years (legal requirement)</li>
        <li><strong>Account data:</strong> deleted upon request or 3 years after last activity</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>7. Data Sharing</h2>
      <p>
        Your data is <strong>never sold</strong> to third parties. It may be shared with:
      </p>
      <ul>
        <li>Your treating dietitian as part of your follow-up</li>
        <li>Our technical service providers (hosting, email) under GDPR sub-processing agreements</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>8. Security</h2>
      <ul>
        <li>Encrypted communications (HTTPS/TLS)</li>
        <li>Secure JWT authentication</li>
        <li>Optional biometric authentication (processed locally)</li>
        <li>Role-based access control (RBAC)</li>
        <li>Regular encrypted backups</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>9. Your Rights</h2>
      <p>Under the GDPR, you have the following rights:</p>
      <ul>
        <li><strong>Access:</strong> obtain a copy of your data</li>
        <li><strong>Rectification:</strong> correct inaccurate data</li>
        <li><strong>Erasure:</strong> request deletion of your data</li>
        <li><strong>Portability:</strong> receive your data in a structured format</li>
        <li><strong>Objection:</strong> object to the processing of your data</li>
        <li><strong>Restriction:</strong> request limitation of processing</li>
      </ul>
      <p>
        To exercise your rights, contact us at <strong>mariondiet@beauvalot.com</strong>.
        We will respond within 30 days.
      </p>
    </section>

    <section className="privacy-section">
      <h2>10. Cookies</h2>
      <p>
        The application uses strictly necessary cookies (authentication, preferences).
        Analytics cookies are only set with your explicit consent.
      </p>
    </section>

    <section className="privacy-section">
      <h2>11. Mobile Application</h2>
      <p>
        The iOS application uses the following device features:
      </p>
      <ul>
        <li><strong>Face ID / Touch ID:</strong> biometric authentication (data processed locally, never transmitted)</li>
        <li><strong>Push notifications:</strong> appointment reminders and messages (with your consent)</li>
        <li><strong>Camera:</strong> document photo capture (with your permission)</li>
        <li><strong>Local storage:</strong> offline cache for use without connectivity</li>
      </ul>
    </section>

    <section className="privacy-section">
      <h2>12. Changes</h2>
      <p>
        This policy may be updated. In the event of significant changes,
        you will be notified via the application or by email.
      </p>
    </section>

    <section className="privacy-section">
      <h2>13. Contact</h2>
      <p>
        For any questions regarding this policy or your personal data:
      </p>
      <ul>
        <li><strong>Email:</strong> mariondiet@beauvalot.com</li>
        <li><strong>Website:</strong> beauvalot.com</li>
      </ul>
      <p>
        You may also file a complaint with the CNIL (cnil.fr) or your local data protection authority.
      </p>
    </section>
  </>
);

export default PrivacyPolicyPage;
