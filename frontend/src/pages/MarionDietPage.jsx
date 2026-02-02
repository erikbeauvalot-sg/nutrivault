/**
 * MarionDiet Landing Page
 * Site vitrine pour Marion Beauvalot - Diététicienne-nutritionniste
 */

import { useEffect, useState } from 'react';
import CookieConsentBanner from '../components/CookieConsentBanner';
import { trackPageView, hasAnalyticsConsent } from '../services/analyticsService';

const MarionDietPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [formStatus, setFormStatus] = useState(null);

  // Color palette - exactement comme le site original
  const colors = {
    forest: '#38533d',        // Vert foncé principal
    forestDark: '#2d4331',    // Vert plus foncé
    cream: '#eeefed',         // Beige clair
    wine: '#b83946',          // Rouge accent
    rose: '#bc6c66',          // Rose/marron
    offWhite: '#f4eae3',      // Fond crème/beige
    black: '#000000',
    white: '#ffffff',
    text: '#333333',
    textLight: '#666666',
  };

  // Images stockées localement
  const images = {
    hero: '/mariondiet/images/hero.png',
    cheesecake: '/mariondiet/images/cheesecake.jpg',
    testimonials: '/mariondiet/images/testimonials.jpg',
    services: '/mariondiet/images/services.jpg',
    marion: '/mariondiet/images/marion.jpg',
    logoADL: '/mariondiet/images/logo-adl.png',
    logoAlimMater: '/mariondiet/images/logo-alimmater.png',
    logoCPTS: '/mariondiet/images/logo-cpts.png',
    doctolib: '/mariondiet/images/doctolib.png',
    icon: '/mariondiet/images/icon.svg',
    // Images ateliers partenaires
    atelier1: '/mariondiet/images/atelier-1.png',
    atelier2: '/mariondiet/images/atelier-2.png',
    atelier3: '/mariondiet/images/atelier-3.png',
    atelier4: '/mariondiet/images/atelier-4.png',
    atelier5: '/mariondiet/images/atelier-5.png',
    atelier6: '/mariondiet/images/atelier-6.png',
    // Images catégories ateliers
    atelierEcoles: '/mariondiet/images/atelier-ecoles.jpg',
    atelierEntreprises: '/mariondiet/images/atelier-entreprises.jpg',
    atelierAssociations: '/mariondiet/images/atelier-associations.jpg',
    atelierSport: '/mariondiet/images/atelier-sport.jpg',
    atelierContenu: '/mariondiet/images/atelier-contenu.jpg',
    // Images "Pourquoi prendre rendez-vous"
    rdvPoids: '/mariondiet/images/rdv-poids.png',
    rdvDigestifs: '/mariondiet/images/rdv-digestifs.png',
    rdvMetaboliques: '/mariondiet/images/rdv-metaboliques.png',
    rdvEnfants: '/mariondiet/images/rdv-enfants.png',
    rdvGrossesse: '/mariondiet/images/rdv-grossesse.png',
    rdvVegetarienne: '/mariondiet/images/rdv-vegetarienne.png',
    rdvFemme: '/mariondiet/images/rdv-femme.png',
    monApproche: '/mariondiet/images/mon-approche.jpg',
  };

  // SEO - Meta tags et données structurées
  useEffect(() => {
    // Titre de la page
    document.title = 'Marion Beauvalot - Diététicienne Nutritionniste à Suresnes (92)';

    // Meta description
    const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'Marion Beauvalot, diététicienne-nutritionniste à Suresnes (92). Consultations personnalisées : perte de poids, troubles digestifs, alimentation végétarienne, grossesse. Cabinet et visio. RDV Doctolib.';
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDescription);
    }

    // Meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]') || document.createElement('meta');
    metaKeywords.name = 'keywords';
    metaKeywords.content = 'diététicienne Suresnes, nutritionniste Suresnes, diététicienne nutritionniste 92, consultation diététique Suresnes, perte de poids Suresnes, rééquilibrage alimentaire, Marion Beauvalot, troubles digestifs nutritionniste, alimentation végétarienne, diététicienne Hauts-de-Seine, nutritionniste 92150';
    if (!document.querySelector('meta[name="keywords"]')) {
      document.head.appendChild(metaKeywords);
    }

    // Canonical URL
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = 'https://mariondiet.beauvalot.com/';
    if (!document.querySelector('link[rel="canonical"]')) {
      document.head.appendChild(canonical);
    }

    // Open Graph tags
    const ogTags = [
      { property: 'og:title', content: 'Marion Beauvalot - Diététicienne Nutritionniste à Suresnes' },
      { property: 'og:description', content: 'Diététicienne-nutritionniste à Suresnes. Accompagnement personnalisé pour perte de poids, troubles digestifs, alimentation végétarienne. Consultations cabinet et visio.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://mariondiet.beauvalot.com/' },
      { property: 'og:image', content: 'https://mariondiet.beauvalot.com/mariondiet/images/marion.jpg' },
      { property: 'og:locale', content: 'fr_FR' },
      { property: 'og:site_name', content: 'Marion Beauvalot Diététicienne' }
    ];

    ogTags.forEach(tag => {
      let meta = document.querySelector(`meta[property="${tag.property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', tag.property);
        document.head.appendChild(meta);
      }
      meta.content = tag.content;
    });

    // Twitter Card tags
    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Marion Beauvalot - Diététicienne Nutritionniste à Suresnes' },
      { name: 'twitter:description', content: 'Diététicienne-nutritionniste à Suresnes (92). Accompagnement personnalisé, consultations cabinet et visio.' },
      { name: 'twitter:image', content: 'https://mariondiet.beauvalot.com/mariondiet/images/marion.jpg' }
    ];

    twitterTags.forEach(tag => {
      let meta = document.querySelector(`meta[name="${tag.name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = tag.name;
        document.head.appendChild(meta);
      }
      meta.content = tag.content;
    });

    // Données structurées JSON-LD (Schema.org)
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Dietitian',
      'name': 'Marion Beauvalot',
      'jobTitle': 'Diététicienne-Nutritionniste',
      'description': 'Diététicienne-nutritionniste diplômée proposant des consultations personnalisées pour la gestion du poids, les troubles digestifs, l\'alimentation végétarienne et l\'accompagnement nutritionnel.',
      'url': 'https://mariondiet.beauvalot.com/',
      'image': 'https://mariondiet.beauvalot.com/mariondiet/images/marion.jpg',
      'telephone': '',
      'email': 'mariondiet@beauvalot.com',
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': '54 rue de Verdun',
        'addressLocality': 'Suresnes',
        'postalCode': '92150',
        'addressRegion': 'Île-de-France',
        'addressCountry': 'FR'
      },
      'geo': {
        '@type': 'GeoCoordinates',
        'latitude': 48.8697,
        'longitude': 2.2189
      },
      'areaServed': [
        { '@type': 'City', 'name': 'Suresnes' },
        { '@type': 'City', 'name': 'Puteaux' },
        { '@type': 'City', 'name': 'Nanterre' },
        { '@type': 'City', 'name': 'Rueil-Malmaison' },
        { '@type': 'City', 'name': 'Courbevoie' },
        { '@type': 'City', 'name': 'La Défense' },
        { '@type': 'AdministrativeArea', 'name': 'Hauts-de-Seine' }
      ],
      'priceRange': '€€',
      'paymentAccepted': ['Cash', 'Credit Card', 'Check'],
      'openingHoursSpecification': [
        {
          '@type': 'OpeningHoursSpecification',
          'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          'opens': '09:00',
          'closes': '19:00'
        }
      ],
      'sameAs': [
        'https://www.instagram.com/marion_dieteticienne/',
        'https://www.linkedin.com/in/marion-beauvalot/',
        'https://www.doctolib.fr/dieteticien/suresnes/marion-beauvalot'
      ],
      'hasOfferCatalog': {
        '@type': 'OfferCatalog',
        'name': 'Consultations diététiques',
        'itemListElement': [
          {
            '@type': 'Offer',
            'itemOffered': {
              '@type': 'Service',
              'name': 'Première consultation',
              'description': 'Bilan initial complet - 1 heure'
            },
            'price': '65',
            'priceCurrency': 'EUR'
          },
          {
            '@type': 'Offer',
            'itemOffered': {
              '@type': 'Service',
              'name': 'Consultation de suivi',
              'description': 'Ajustement et progression - 30 minutes'
            },
            'price': '50',
            'priceCurrency': 'EUR'
          }
        ]
      },
      'knowsAbout': [
        'Nutrition',
        'Diététique',
        'Perte de poids',
        'Troubles digestifs',
        'Alimentation végétarienne',
        'Alimentation végétalienne',
        'Nutrition sportive',
        'Alimentation pendant la grossesse',
        'Syndrome de l\'intestin irritable',
        'Diabète',
        'Cholestérol'
      ]
    };

    let scriptTag = document.querySelector('script[type="application/ld+json"]');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

    // Cleanup on unmount
    return () => {
      document.title = 'NutriVault';
    };
  }, []);

  // Scroll to hash on load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  // Analytics - Track page view if consent is given
  useEffect(() => {
    if (hasAnalyticsConsent()) {
      trackPageView('/mariondiet');
    }
  }, []);

  // Handle cookie consent callback - track page if user accepts
  const handleCookieConsent = (consent) => {
    if (consent) {
      trackPageView('/mariondiet');
    }
  };

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormStatus('sending');

    try {
      const response = await fetch('https://formspree.io/f/xkozvkdk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message
        })
      });

      if (response.ok) {
        setFormStatus('sent');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        setFormStatus('error');
      }
    } catch (error) {
      console.error('Erreur envoi formulaire:', error);
      setFormStatus('error');
    }
  };

  return (
    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", color: colors.text, overflowX: 'hidden' }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Lato:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        input:focus, textarea:focus { outline: 2px solid ${colors.forest}; }
        @media (max-width: 768px) {
          .hero-content { flex-direction: column !important; text-align: center !important; }
          .hero-text h1 { font-size: 2rem !important; }
          .nav-links { display: none !important; }
          .section-flex { flex-direction: column !important; }
          .section-flex > div { max-width: 100% !important; }
        }
        .testimonials-scroll::-webkit-scrollbar {
          height: 8px;
        }
        .testimonials-scroll::-webkit-scrollbar-track {
          background: ${colors.cream};
          border-radius: 10px;
        }
        .testimonials-scroll::-webkit-scrollbar-thumb {
          background: ${colors.forest};
          border-radius: 10px;
        }
        .testimonials-scroll::-webkit-scrollbar-thumb:hover {
          background: ${colors.forestDark};
        }
      `}</style>

      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        padding: '0.8rem 3rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        borderBottom: `1px solid ${colors.cream}`
      }}>
        <a href="#accueil" onClick={(e) => scrollToSection(e, 'accueil')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <img src={images.icon} alt="Marion Beauvalot" style={{ height: '45px' }} />
        </a>
        <div className="nav-links" style={{ display: 'flex', gap: '2.5rem', fontFamily: "'Lato', sans-serif" }}>
          {[
            { label: 'Accueil', id: 'accueil' },
            { label: 'Accompagnements diététiques', id: 'accompagnements' },
            { label: 'Ateliers nutrition', id: 'ateliers' },
            { label: 'Contact', id: 'contact' }
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => scrollToSection(e, item.id)}
              style={{
                color: colors.forest,
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: '400',
                transition: 'color 0.3s',
                paddingBottom: '2px',
                borderBottom: '2px solid transparent'
              }}
              onMouseOver={(e) => { e.target.style.color = colors.wine; e.target.style.borderBottomColor = colors.wine; }}
              onMouseOut={(e) => { e.target.style.color = colors.forest; e.target.style.borderBottomColor = 'transparent'; }}
            >
              {item.label}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="https://www.instagram.com/marion_dieteticienne/" target="_blank" rel="noopener noreferrer" style={{ color: colors.forest, transition: 'color 0.3s', display: 'flex', alignItems: 'center' }} onMouseOver={(e) => e.currentTarget.style.color = colors.wine} onMouseOut={(e) => e.currentTarget.style.color = colors.forest}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
          <a href="https://www.linkedin.com/in/marion-beauvalot/" target="_blank" rel="noopener noreferrer" style={{ color: colors.forest, transition: 'color 0.3s', display: 'flex', alignItems: 'center' }} onMouseOver={(e) => e.currentTarget.style.color = colors.wine} onMouseOut={(e) => e.currentTarget.style.color = colors.forest}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          </a>
          <a href="https://www.doctolib.fr/dieteticien/suresnes/marion-beauvalot" target="_blank" rel="noopener noreferrer" title="Prendre rendez-vous sur Doctolib" style={{ display: 'flex', alignItems: 'center', transition: 'transform 0.3s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
              <rect width="100" height="100" rx="20" fill="#107ACA"/>
              <path d="M25 30h15c11 0 20 9 20 20s-9 20-20 20H25V30zm10 32h5c5.5 0 10-4.5 10-10s-4.5-10-10-10h-5v20z" fill="white"/>
              <circle cx="65" cy="50" r="8" fill="white"/>
            </svg>
          </a>
        </div>
      </nav>

      {/* Hero Section - Fond beige/crème avec texte vert foncé */}
      <section id="accueil" style={{
        minHeight: '100vh',
        backgroundColor: colors.offWhite,
        display: 'flex',
        alignItems: 'center',
        padding: '7rem 5% 4rem',
      }}>
        <div className="hero-content" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1300px',
          margin: '0 auto',
          width: '100%',
          gap: '4rem',
          flexWrap: 'wrap'
        }}>
          <div className="hero-text" style={{ flex: '1', minWidth: '300px', maxWidth: '580px' }}>
            <h1 style={{
              color: colors.forest,
              fontSize: '2.6rem',
              marginBottom: '1.5rem',
              fontWeight: '500',
              lineHeight: '1.3'
            }}>
              MARION BEAUVALOT, DIÉTÉTICIENNE - NUTRITIONNISTE À SURESNES.
            </h1>
            <p style={{
              color: colors.text,
              fontSize: '1.15rem',
              lineHeight: '1.8',
              marginBottom: '1.5rem',
              fontFamily: "'Lato', sans-serif",
              fontWeight: '400'
            }}>
              J'aide les personnes qui souhaitent perdre du poids à retrouver un équilibre durable, en les accompagnant avec une approche personnalisée, positive et axée sur le plaisir de manger.
            </p>
            <p style={{
              color: colors.textLight,
              fontSize: '1rem',
              lineHeight: '1.7',
              marginBottom: '2rem',
              fontFamily: "'Lato', sans-serif",
              fontWeight: '300'
            }}>
              Je vous propose un accompagnement diététique, en consultation au cabinet paramédical situé à Suresnes ou en visio.
            </p>
            <a
              href="https://www.doctolib.fr/dieteticien/suresnes/marion-beauvalot"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#107ACA',
                color: 'white',
                padding: '0.9rem 1.8rem',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '1rem',
                fontFamily: "'Lato', sans-serif",
                fontWeight: '500',
                transition: 'transform 0.3s, box-shadow 0.3s',
                boxShadow: '0 4px 15px rgba(16, 122, 202, 0.3)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 122, 202, 0.4)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 122, 202, 0.3)'; }}
            >
              <img src={images.doctolib} alt="Doctolib" style={{ height: '22px' }} />
              Prendre rendez-vous
            </a>
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <img
              src={images.hero}
              alt="Marion Beauvalot"
              style={{
                maxWidth: '380px',
                width: '100%',
                borderRadius: '8px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
              }}
            />
          </div>
        </div>
      </section>

      {/* Ma vision de l'alimentation - Fond blanc */}
      <section style={{
        padding: '5rem 5%',
        backgroundColor: colors.white
      }}>
        <div className="section-flex" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '1100px',
          margin: '0 auto',
          gap: '4rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: '0 0 auto' }}>
            <img
              src={images.cheesecake}
              alt="Alimentation saine"
              style={{
                maxWidth: '320px',
                width: '100%',
                borderRadius: '8px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
              }}
            />
          </div>
          <div style={{ flex: '1', minWidth: '300px', maxWidth: '520px' }}>
            <h2 style={{
              color: colors.forest,
              fontSize: '2rem',
              marginBottom: '1.5rem',
              fontWeight: '500'
            }}>
              Ma vision de l'alimentation
            </h2>
            <p style={{
              color: colors.textLight,
              fontSize: '1rem',
              lineHeight: '1.9',
              fontFamily: "'Lato', sans-serif",
              fontWeight: '400'
            }}>
              Pour moi, l'alimentation est une source de bien-être global, allant bien au-delà de simples besoins physiologiques. Elle englobe non seulement la santé physique, mais aussi le bien être mental et émotionnel, ainsi que le respect de notre environnement. Mon approche vise à vous guider vers une écoute attentive de votre corps et à vous accompagner dans la recherche d'un équilibre alimentaire durable, adapté à vos besoins individuels et surtout sans frustration.
            </p>
          </div>
        </div>
      </section>

      {/* Mon approche - Fond offWhite */}
      <section style={{
        padding: '5rem 5%',
        backgroundColor: colors.offWhite
      }}>
        <div className="section-flex" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '1100px',
          margin: '0 auto',
          gap: '4rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: '1', minWidth: '300px', maxWidth: '520px' }}>
            <h2 style={{
              color: colors.forest,
              fontSize: '2rem',
              marginBottom: '1.5rem',
              fontWeight: '500'
            }}>
              Mon approche
            </h2>
            <p style={{
              color: colors.textLight,
              fontSize: '1rem',
              lineHeight: '1.9',
              fontFamily: "'Lato', sans-serif",
              fontWeight: '400',
              marginBottom: '1.5rem'
            }}>
              Je vous accompagne vers une <strong>écoute attentive de votre corps</strong> et dans la recherche d'un <strong>équilibre alimentaire durable</strong>, adapté à vos besoins individuels et surtout <strong>sans frustration</strong>.
            </p>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              fontFamily: "'Lato', sans-serif"
            }}>
              {[
                'Mettre en place une alimentation équilibrée, adaptée à vos besoins et votre quotidien',
                'Comprendre vos signaux corporels (faim, satiété, envie alimentaire)',
                'Développer une relation apaisée avec la nourriture',
                'Atteindre vos objectifs santé et bien-être sans frustration ni restriction',
                'Gagner en autonomie grâce à des outils simples, concrets et durables'
              ].map((item, index) => (
                <li key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.7rem',
                  marginBottom: '0.9rem',
                  color: colors.textLight,
                  fontSize: '0.95rem',
                  lineHeight: '1.6'
                }}>
                  <span style={{ color: colors.forest, fontSize: '1.1rem', marginTop: '-2px', flexShrink: 0 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <img
              src={images.monApproche}
              alt="Mon approche"
              style={{
                maxWidth: '380px',
                width: '100%',
                borderRadius: '8px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
              }}
            />
          </div>
        </div>
      </section>

      {/* Témoignages - Fond crème */}
      <section style={{
        padding: '5rem 5%',
        backgroundColor: colors.cream
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Titre */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              color: colors.forest,
              fontSize: '2rem',
              marginBottom: '1rem',
              fontWeight: '500'
            }}>
              Ils m'ont fait confiance
            </h2>
            <p style={{
              color: colors.textLight,
              fontSize: '1rem',
              fontFamily: "'Lato', sans-serif",
              fontStyle: 'italic'
            }}>
              Découvrez les témoignages de mes patients
            </p>
          </div>

          {/* Scroll horizontal de témoignages */}
          <div className="testimonials-scroll" style={{
            display: 'flex',
            gap: '1.5rem',
            marginBottom: '2rem',
            overflowX: 'auto',
            paddingBottom: '1rem',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}>
            {[
              {
                name: 'Tison',
                date: '27 novembre 2024',
                text: "Première fois que je prends rdv chez Marion, et je ne peux que vous la conseiller ! A l'écoute de mes besoins avec un suivi personnel adapté. Je la recommande vivement !",
                rating: 5
              },
              {
                name: 'Monit',
                date: '20 décembre 2024',
                text: "Une diététicienne exceptionnelle, très à l'écoute et professionnelle. Elle propose des conseils personnalisés et efficaces, tout en étant bienveillante. Je recommande vivement pour un accompagnement de qualité et durable !",
                rating: 5
              },
              {
                name: 'Azria',
                date: '13 février 2025',
                text: "Je suis allé consulter pour adapter mon régime alimentaire et Marion a été d'une grande aide et d'une grande pédagogie ! Je recommande les yeux fermés, merci beaucoup Marion",
                rating: 5
              },
              {
                name: 'Bluet',
                date: '16 février 2025',
                text: "Marion est une jeune diététicienne que je recommande vivement ! Elle donne de précieux conseils personnalisés et grâce à son suivi j'ai pu retrouver un bon équilibre alimentaire. Prenez rendez-vous sans hésiter !",
                rating: 5
              }
            ].map((testimonial, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  minWidth: '320px',
                  maxWidth: '350px',
                  flexShrink: 0,
                  scrollSnapAlign: 'start'
                }}
              >
                {/* Header avec Google */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: colors.forest,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '1rem',
                      fontFamily: "'Lato', sans-serif"
                    }}>
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p style={{
                        margin: 0,
                        fontWeight: '600',
                        color: colors.text,
                        fontSize: '0.95rem',
                        fontFamily: "'Lato', sans-serif"
                      }}>
                        {testimonial.name}
                      </p>
                      <p style={{
                        margin: 0,
                        color: colors.textLight,
                        fontSize: '0.8rem',
                        fontFamily: "'Lato', sans-serif"
                      }}>
                        {testimonial.date}
                      </p>
                    </div>
                  </div>
                  {/* Logo Google */}
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>

                {/* Étoiles */}
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#FBBC05">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                  ))}
                </div>

                {/* Texte du témoignage */}
                <p style={{
                  color: colors.text,
                  fontSize: '0.95rem',
                  lineHeight: '1.7',
                  fontFamily: "'Lato', sans-serif",
                  margin: 0,
                  flex: 1
                }}>
                  "{testimonial.text}"
                </p>
              </div>
            ))}
          </div>

          {/* Image et lien vers Google */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <img
              src={images.testimonials}
              alt="Témoignages"
              style={{
                maxWidth: '300px',
                width: '100%',
                borderRadius: '8px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <span style={{ fontSize: '2rem', fontWeight: '700', color: colors.forest }}>5.0</span>
                <div style={{ display: 'flex' }}>
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill="#FBBC05">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                  ))}
                </div>
              </div>
              <p style={{
                color: colors.textLight,
                fontSize: '0.9rem',
                fontFamily: "'Lato', sans-serif",
                margin: 0
              }}>
                Basé sur les avis Google
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section "Pourquoi prendre rendez-vous ?" - Fond offWhite */}
      <section style={{
        padding: '5rem 5%',
        backgroundColor: colors.offWhite
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Titre */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              color: colors.forest,
              fontSize: '2.2rem',
              marginBottom: '1rem',
              fontWeight: '500'
            }}>
              Pourquoi prendre rendez-vous ?
            </h2>
            <p style={{
              color: colors.textLight,
              fontSize: '1.1rem',
              fontFamily: "'Lato', sans-serif",
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Je vous accompagne dans différentes problématiques nutritionnelles
            </p>
          </div>

          {/* Grille des catégories avec icônes - Ligne 1 (4 items) */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2.5rem',
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            {[
              {
                image: images.rdvPoids,
                title: 'Gestion du poids',
                desc: 'Accompagnement personnalisé pour une perte ou prise de poids saine et durable'
              },
              {
                image: images.rdvDigestifs,
                title: 'Troubles digestifs',
                desc: 'Pour soulager et gérer des problématiques comme le syndrome de l\'intestin irritable'
              },
              {
                image: images.rdvMetaboliques,
                title: 'Maladies métaboliques',
                desc: 'Conseils diététiques pour mieux contrôler votre diabète, cholestérol, hypertension'
              },
              {
                image: images.rdvEnfants,
                title: 'Alimentation des enfants',
                desc: 'Accompagnement adapté pour les enfants et adolescents'
              }
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  width: '180px',
                  textAlign: 'center',
                  transition: 'transform 0.3s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{
                  width: '120px',
                  height: '120px',
                  margin: '0 auto 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <h4 style={{
                  color: colors.forest,
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  fontFamily: "'Lato', sans-serif",
                  lineHeight: '1.3'
                }}>
                  {item.title}
                </h4>
                <p style={{
                  color: colors.textLight,
                  fontSize: '0.8rem',
                  lineHeight: '1.5',
                  fontFamily: "'Lato', sans-serif",
                  margin: 0
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Grille des catégories - Ligne 2 (3 items centrés) */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2.5rem',
            marginBottom: '3rem',
            flexWrap: 'wrap'
          }}>
            {[
              {
                image: images.rdvGrossesse,
                title: 'Grossesse et allaitement',
                desc: 'Conseils nutritionnels pour une grossesse sereine et un allaitement réussi'
              },
              {
                image: images.rdvVegetarienne,
                title: 'Alimentation végétarienne',
                desc: 'Équilibrer son alimentation végétarienne ou végétalienne'
              },
              {
                image: images.rdvFemme,
                title: 'Alimentation de la femme',
                desc: 'Accompagnement spécifique : cycle menstruel, SOPK, endométriose, ménopause'
              }
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  width: '180px',
                  textAlign: 'center',
                  transition: 'transform 0.3s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{
                  width: '120px',
                  height: '120px',
                  margin: '0 auto 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <h4 style={{
                  color: colors.forest,
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  fontFamily: "'Lato', sans-serif",
                  lineHeight: '1.3'
                }}>
                  {item.title}
                </h4>
                <p style={{
                  color: colors.textLight,
                  fontSize: '0.8rem',
                  lineHeight: '1.5',
                  fontFamily: "'Lato', sans-serif",
                  margin: 0
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Bouton CTA */}
          <div style={{ textAlign: 'center' }}>
            <a
              href="https://www.doctolib.fr/dieteticien/suresnes/marion-beauvalot"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#107ACA',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '1rem',
                fontFamily: "'Lato', sans-serif",
                fontWeight: '500',
                transition: 'transform 0.3s, box-shadow 0.3s',
                boxShadow: '0 4px 15px rgba(16, 122, 202, 0.3)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 122, 202, 0.4)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 122, 202, 0.3)'; }}
            >
              <img src={images.doctolib} alt="Doctolib" style={{ height: '22px' }} />
              Prendre rendez-vous
            </a>
          </div>
        </div>
      </section>

      {/* Accompagnements diététiques détaillés - Fond blanc */}
      <section id="accompagnements" style={{
        padding: '5rem 5%',
        backgroundColor: colors.white
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Titre principal */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              color: colors.forest,
              fontSize: '2.2rem',
              marginBottom: '1rem',
              fontWeight: '500'
            }}>
              Accompagnement diététique personnalisé
            </h2>
            <p style={{
              color: colors.textLight,
              fontSize: '1.1rem',
              lineHeight: '1.8',
              fontFamily: "'Lato', sans-serif",
              maxWidth: '700px',
              margin: '0 auto'
            }}>
              Un accompagnement complet et personnalisé, adapté à vos besoins, à votre mode de vie et à vos objectifs.
            </p>
          </div>

          {/* Vous remarquez des changements corporels ? */}
          <div className="section-flex" style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: '2.5rem',
            flexWrap: 'wrap',
            marginBottom: '4rem'
          }}>
            {/* Colonne gauche - Symptômes */}
            <div style={{ flex: '1', minWidth: '280px', maxWidth: '350px' }}>
              <h3 style={{
                color: colors.forest,
                fontSize: '1.4rem',
                marginBottom: '1.5rem',
                fontWeight: '500',
                lineHeight: '1.4'
              }}>
                Vous remarquez des changements corporels ?
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                fontFamily: "'Lato', sans-serif"
              }}>
                {[
                  'Une fatigue persistante ou un manque d\'énergie',
                  'Une prise de poids difficile à comprendre ou à contrôler',
                  'Des troubles digestifs (ballonnements, constipations, inconforts...)',
                  'Des grignotages fréquents, des envies de sucres incontrôlables',
                  'Une relation compliquée avec l\'alimentation (culpabilité, perte de contrôle)',
                  'Des analyses sanguines perturbées (cholestérol, glycémie, tension...)'
                ].map((item, index) => (
                  <li key={index} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.7rem',
                    marginBottom: '0.9rem',
                    color: colors.textLight,
                    fontSize: '0.9rem',
                    lineHeight: '1.6'
                  }}>
                    <span style={{ color: colors.wine, fontSize: '1.1rem', marginTop: '-2px', flexShrink: 0 }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Image centrale */}
            <div style={{ flex: '0 0 auto' }}>
              <img
                src={images.services}
                alt="Accompagnement diététique"
                style={{
                  maxWidth: '300px',
                  width: '100%',
                  borderRadius: '8px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                }}
              />
            </div>

            {/* Colonne droite - Accompagnement */}
            <div style={{ flex: '1', minWidth: '280px', maxWidth: '350px' }}>
              <h3 style={{
                color: colors.forest,
                fontSize: '1.4rem',
                marginBottom: '1.5rem',
                fontWeight: '500',
                lineHeight: '1.4'
              }}>
                Je vous accompagne pour :
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                fontFamily: "'Lato', sans-serif"
              }}>
                {[
                  'Mettre en place une alimentation équilibrée, adaptée à vos besoins et votre quotidien',
                  'Comprendre vos signaux corporels (faim, satiété, envie alimentaire)',
                  'Développer une relation apaisée avec la nourriture',
                  'Atteindre vos objectifs santé et bien être sans frustration ni restriction',
                  'Gagner en autonomie grâce à des outils simples, concrets et durables'
                ].map((item, index) => (
                  <li key={index} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.7rem',
                    marginBottom: '0.9rem',
                    color: colors.textLight,
                    fontSize: '0.9rem',
                    lineHeight: '1.6'
                  }}>
                    <span style={{ color: colors.forest, fontSize: '1.1rem', marginTop: '-2px', flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tarifs des consultations */}
          <div style={{ marginBottom: '4rem' }}>
            <h3 style={{
              color: colors.forest,
              fontSize: '1.6rem',
              marginBottom: '2rem',
              fontWeight: '500',
              textAlign: 'center'
            }}>
              Tarifs des consultations
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem'
            }}>
              {/* Première consultation */}
              <div style={{
                backgroundColor: colors.offWhite,
                padding: '2rem',
                borderRadius: '12px',
                textAlign: 'center',
                border: `2px solid ${colors.forest}`,
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: colors.forest,
                  color: 'white',
                  padding: '0.3rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontFamily: "'Lato', sans-serif"
                }}>
                  Recommandé
                </div>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🩺</div>
                <h4 style={{
                  color: colors.forest,
                  fontSize: '1.2rem',
                  marginBottom: '0.5rem',
                  fontWeight: '600'
                }}>
                  Première consultation
                </h4>
                <p style={{
                  color: colors.textLight,
                  fontSize: '0.9rem',
                  marginBottom: '1rem',
                  fontFamily: "'Lato', sans-serif"
                }}>
                  Bilan initial complet
                </p>
                <div style={{
                  fontSize: '2.5rem',
                  color: colors.forest,
                  fontWeight: '700',
                  marginBottom: '0.5rem'
                }}>
                  65€
                </div>
                <p style={{
                  color: colors.wine,
                  fontSize: '0.9rem',
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: '500',
                  marginBottom: '1rem'
                }}>
                  Durée : 1 heure
                </p>
                <p style={{
                  color: colors.textLight,
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  fontFamily: "'Lato', sans-serif"
                }}>
                  Point complet sur vos habitudes alimentaires, votre mode de vie, vos objectifs et vos éventuels problèmes de santé.
                </p>
              </div>

              {/* Consultation de suivi */}
              <div style={{
                backgroundColor: colors.cream,
                padding: '2rem',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
                <h4 style={{
                  color: colors.forest,
                  fontSize: '1.2rem',
                  marginBottom: '0.5rem',
                  fontWeight: '600'
                }}>
                  Consultation de suivi
                </h4>
                <p style={{
                  color: colors.textLight,
                  fontSize: '0.9rem',
                  marginBottom: '1rem',
                  fontFamily: "'Lato', sans-serif"
                }}>
                  Ajustement et progression
                </p>
                <div style={{
                  fontSize: '2.5rem',
                  color: colors.forest,
                  fontWeight: '700',
                  marginBottom: '0.5rem'
                }}>
                  50€
                </div>
                <p style={{
                  color: colors.wine,
                  fontSize: '0.9rem',
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: '500',
                  marginBottom: '1rem'
                }}>
                  Durée : 30 minutes
                </p>
                <p style={{
                  color: colors.textLight,
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  fontFamily: "'Lato', sans-serif"
                }}>
                  Évaluation des progrès, ajustement du plan alimentaire et abordage d'une thématique spécifique.
                </p>
              </div>

              {/* Bilan final */}
              <div style={{
                backgroundColor: colors.cream,
                padding: '2rem',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎯</div>
                <h4 style={{
                  color: colors.forest,
                  fontSize: '1.2rem',
                  marginBottom: '0.5rem',
                  fontWeight: '600'
                }}>
                  Bilan final
                </h4>
                <p style={{
                  color: colors.textLight,
                  fontSize: '0.9rem',
                  marginBottom: '1rem',
                  fontFamily: "'Lato', sans-serif"
                }}>
                  Consolidation des acquis
                </p>
                <div style={{
                  fontSize: '2.5rem',
                  color: colors.forest,
                  fontWeight: '700',
                  marginBottom: '0.5rem'
                }}>
                  50€
                </div>
                <p style={{
                  color: colors.wine,
                  fontSize: '0.9rem',
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: '500',
                  marginBottom: '1rem'
                }}>
                  Durée : 30 minutes
                </p>
                <p style={{
                  color: colors.textLight,
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  fontFamily: "'Lato', sans-serif"
                }}>
                  Point sur les résultats obtenus et recommandations pour maintenir les acquis sur le long terme.
                </p>
              </div>
            </div>
          </div>

          {/* Comment se passe un suivi + Dossier patient */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem'
          }}>
            {/* Comment se passe un suivi */}
            <div style={{
              backgroundColor: colors.offWhite,
              padding: '2rem',
              borderRadius: '12px'
            }}>
              <h3 style={{
                color: colors.forest,
                fontSize: '1.3rem',
                marginBottom: '1.5rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>⏱️</span> Combien de temps dure un suivi ?
              </h3>
              <p style={{
                color: colors.textLight,
                fontSize: '0.95rem',
                lineHeight: '1.8',
                fontFamily: "'Lato', sans-serif",
                marginBottom: '1rem'
              }}>
                En général, <strong>4 à 5 consultations</strong> sont nécessaires pour devenir autonome dans votre alimentation.
              </p>
              <p style={{
                color: colors.textLight,
                fontSize: '0.95rem',
                lineHeight: '1.8',
                fontFamily: "'Lato', sans-serif"
              }}>
                Les consultations sont espacées de <strong>2 à 4 semaines</strong> pour vous laisser le temps d'intégrer les changements.
              </p>
            </div>

            {/* Dossier patient */}
            <div style={{
              backgroundColor: colors.cream,
              padding: '2rem',
              borderRadius: '12px'
            }}>
              <h3 style={{
                color: colors.forest,
                fontSize: '1.3rem',
                marginBottom: '1.5rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>📁</span> Votre dossier patient comprend
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                fontFamily: "'Lato', sans-serif"
              }}>
                {[
                  'Document sur les fréquences alimentaires et équivalences nutritionnelles',
                  'Informations sur les principaux nutriments',
                  'Conseils pratiques d\'organisation',
                  'Fiches personnalisées selon vos objectifs (pathologies, régimes spécifiques...)'
                ].map((item, index) => (
                  <li key={index} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.7rem',
                    marginBottom: '0.8rem',
                    color: colors.textLight,
                    fontSize: '0.9rem',
                    lineHeight: '1.5'
                  }}>
                    <span style={{ color: colors.forest, flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Thématiques et domaines */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem'
          }}>
            {/* Thématiques abordées */}
            <div>
              <h3 style={{
                color: colors.forest,
                fontSize: '1.2rem',
                marginBottom: '1rem',
                fontWeight: '500'
              }}>
                Thématiques abordées lors des suivis
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[
                  'Lecture d\'étiquettes',
                  'Alimentation intuitive',
                  'Macro/micro-nutriments',
                  'Alimentation émotionnelle',
                  'Super-aliments',
                  'Collations saines'
                ].map((theme, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: colors.cream,
                      color: colors.forest,
                      padding: '0.4rem 0.8rem',
                      borderRadius: '15px',
                      fontSize: '0.85rem',
                      fontFamily: "'Lato', sans-serif"
                    }}
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>

            {/* Domaines de prise en charge */}
            <div>
              <h3 style={{
                color: colors.forest,
                fontSize: '1.2rem',
                marginBottom: '1rem',
                fontWeight: '500'
              }}>
                Domaines de prise en charge
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[
                  'Gestion du poids',
                  'Troubles digestifs',
                  'Maladies métaboliques',
                  'Alimentation des enfants',
                  'Grossesse / Allaitement',
                  'Alimentation végétarienne',
                  'Syndrome prémenstruel',
                  'Endométriose',
                  'SOPK',
                  'Ménopause'
                ].map((domaine, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: colors.offWhite,
                      color: colors.forest,
                      padding: '0.4rem 0.8rem',
                      borderRadius: '15px',
                      fontSize: '0.85rem',
                      fontFamily: "'Lato', sans-serif",
                      border: `1px solid ${colors.forest}20`
                    }}
                  >
                    {domaine}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Remboursement mutuelle */}
          <div style={{
            backgroundColor: colors.forest,
            color: 'white',
            padding: '2rem',
            borderRadius: '12px',
            marginBottom: '2rem'
          }}>
            <h3 style={{
              fontSize: '1.3rem',
              marginBottom: '1rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>💶</span> Remboursement mutuelle
            </h3>
            <p style={{
              fontSize: '0.95rem',
              lineHeight: '1.8',
              fontFamily: "'Lato', sans-serif",
              opacity: 0.95
            }}>
              Les consultations diététiques <strong>ne sont pas encore prises en charge par la Sécurité sociale</strong>, mais <strong>certaines mutuelles offrent un remboursement partiel ou total</strong>. Une facture vous sera fournie pour transmission à votre mutuelle.
            </p>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center' }}>
            <a
              href="https://www.doctolib.fr/dieteticien/suresnes/marion-beauvalot"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#107ACA',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '1rem',
                fontFamily: "'Lato', sans-serif",
                fontWeight: '500',
                transition: 'transform 0.3s, box-shadow 0.3s',
                boxShadow: '0 4px 15px rgba(16, 122, 202, 0.3)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 122, 202, 0.4)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 122, 202, 0.3)'; }}
            >
              <img src={images.doctolib} alt="Doctolib" style={{ height: '22px' }} />
              Prendre rendez-vous
            </a>
          </div>
        </div>
      </section>

      {/* Ateliers Nutrition - Fond offWhite */}
      <section id="ateliers" style={{
        padding: '5rem 5%',
        backgroundColor: colors.offWhite
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Titre et introduction */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              color: colors.forest,
              fontSize: '2rem',
              marginBottom: '1rem',
              fontWeight: '500'
            }}>
              Ateliers Nutrition
            </h2>
            <p style={{
              color: colors.textLight,
              fontSize: '1.1rem',
              lineHeight: '1.8',
              fontFamily: "'Lato', sans-serif",
              fontWeight: '400',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              Les ateliers nutrition sont des moments d'échange et d'apprentissage ludiques pour adopter une alimentation équilibrée.
            </p>
          </div>

          {/* Animation d'ateliers / conférences */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{
              color: colors.forest,
              fontSize: '1.8rem',
              marginBottom: '2rem',
              fontWeight: '500',
              textAlign: 'center'
            }}>
              Animation d'ateliers nutrition / conférences
            </h3>

            {/* Publics visés - Cartes avec images */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '1.5rem',
              marginBottom: '3rem'
            }}>
              {[
                {
                  image: images.atelierEcoles,
                  title: 'Crèches, écoles, collèges, lycées, facultés',
                  desc: 'Éveil alimentaire et éducation nutritionnelle adaptés à chaque âge'
                },
                {
                  image: images.atelierEntreprises,
                  title: 'Entreprises / Conférences',
                  desc: 'Bien-être au travail, nutrition et productivité'
                },
                {
                  image: images.atelierAssociations,
                  title: 'Associations, structures de santé',
                  desc: 'Accompagnement des publics spécifiques'
                },
                {
                  image: images.atelierSport,
                  title: 'Clubs de sport',
                  desc: 'Nutrition sportive et optimisation des performances'
                },
                {
                  image: images.atelierContenu,
                  title: 'Rédactions d\'articles, création de contenus',
                  desc: 'Expertise nutrition pour vos publications'
                }
              ].map((item, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    width: '320px',
                    flexShrink: 0
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; }}
                >
                  <div style={{
                    height: '180px',
                    overflow: 'hidden'
                  }}>
                    <img
                      src={item.image}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s'
                      }}
                    />
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <h4 style={{
                      color: colors.forest,
                      fontSize: '1.05rem',
                      fontWeight: '600',
                      marginBottom: '0.75rem',
                      fontFamily: "'Lato', sans-serif",
                      lineHeight: '1.4'
                    }}>
                      {item.title}
                    </h4>
                    <p style={{
                      color: colors.textLight,
                      fontSize: '0.9rem',
                      lineHeight: '1.6',
                      fontFamily: "'Lato', sans-serif",
                      margin: 0
                    }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Ils m'ont fait confiance - Photos ateliers */}
            <div style={{
              backgroundColor: 'white',
              padding: '3rem',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
              <h4 style={{
                color: colors.forest,
                fontSize: '1.5rem',
                marginBottom: '2.5rem',
                fontWeight: '500',
                textAlign: 'center'
              }}>
                Ils m'ont fait confiance
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                {[
                  images.atelier1,
                  images.atelier2,
                  images.atelier3,
                  images.atelier4,
                  images.atelier5,
                  images.atelier6
                ].map((img, index) => (
                  <div
                    key={index}
                    style={{
                      borderRadius: '10px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                      transition: 'transform 0.3s, box-shadow 0.3s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; }}
                  >
                    <img
                      src={img}
                      alt={`Atelier nutrition ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '250px',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Thèmes des ateliers */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{
              color: colors.forest,
              fontSize: '1.3rem',
              marginBottom: '2rem',
              fontWeight: '500',
              textAlign: 'center'
            }}>
              Thèmes des ateliers proposés
            </h3>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '1.5rem'
            }}>
              {[
                { title: 'Éveil alimentaire', desc: 'Découverte des goûts, jeux éducatifs, diversité alimentaire' },
                { title: 'Lecture des étiquettes alimentaires', desc: 'Compréhension des informations nutritionnelles' },
                { title: 'Alimentation émotionnelle', desc: 'Distinguer faim physique vs émotionnelle' },
                { title: 'Nutrition et bien-être au travail', desc: 'Concentration, productivité, repas rapides' },
                { title: 'Nutrition pour les sportifs', desc: 'Adaptation selon activité, optimisation performance' },
                { title: 'Collations saines', desc: 'Alternatives aux snacks transformés' },
                { title: 'Alimentation durable', desc: 'Impact environnemental, réduction du gaspillage' },
                { title: 'Alimentation seniors', desc: 'Prévention des carences, maintien de la vitalité' },
                { title: 'Les bases de la nutrition', desc: 'Assiette équilibrée, macros et micronutriments' },
                { title: 'Alimentation et bien-être féminin', desc: 'Cycle menstruel, grossesse, ménopause' }
              ].map((atelier, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    borderLeft: `4px solid ${colors.forest}`,
                    width: '320px',
                    flexShrink: 0
                  }}
                >
                  <h4 style={{
                    color: colors.forest,
                    fontSize: '1rem',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    fontFamily: "'Lato', sans-serif"
                  }}>
                    {atelier.title}
                  </h4>
                  <p style={{
                    color: colors.textLight,
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                    fontFamily: "'Lato', sans-serif",
                    margin: 0
                  }}>
                    {atelier.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Formats */}
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '2rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              color: colors.forest,
              fontSize: '1.2rem',
              marginBottom: '1rem',
              fontWeight: '500'
            }}>
              Formats adaptables
            </h3>
            <p style={{
              color: colors.textLight,
              fontSize: '0.95rem',
              lineHeight: '1.8',
              fontFamily: "'Lato', sans-serif",
              margin: 0
            }}>
              Les ateliers peuvent être adaptés en <strong>versions courtes (1h)</strong> ou <strong>approfondies (2-3h)</strong>, avec supports pratiques possibles (fiches recettes, guides).
            </p>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center' }}>
            <a
              href="#contact"
              onClick={(e) => scrollToSection(e, 'contact')}
              style={{
                display: 'inline-block',
                backgroundColor: colors.wine,
                color: 'white',
                padding: '1rem 2.5rem',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '1rem',
                fontFamily: "'Lato', sans-serif",
                fontWeight: '500',
                transition: 'background-color 0.3s, transform 0.3s',
                boxShadow: '0 4px 15px rgba(184, 57, 70, 0.3)'
              }}
              onMouseOver={(e) => { e.target.style.backgroundColor = '#9a2f3b'; e.target.style.transform = 'translateY(-2px)'; }}
              onMouseOut={(e) => { e.target.style.backgroundColor = colors.wine; e.target.style.transform = 'translateY(0)'; }}
            >
              Demander un devis
            </a>
          </div>
        </div>
      </section>

      {/* À propos - Fond blanc */}
      <section style={{
        padding: '5rem 5%',
        backgroundColor: colors.white
      }}>
        <div className="section-flex" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '1100px',
          margin: '0 auto',
          gap: '4rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: '0 0 auto' }}>
            <img
              src={images.marion}
              alt="Marion Beauvalot"
              style={{
                maxWidth: '350px',
                width: '100%',
                borderRadius: '8px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
              }}
            />
          </div>
          <div style={{ flex: '1', minWidth: '300px', maxWidth: '520px' }}>
            <p style={{
              color: colors.forest,
              fontSize: '0.9rem',
              marginBottom: '0.5rem',
              fontWeight: '400',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              fontFamily: "'Lato', sans-serif"
            }}>
              À PROPOS DE MOI
            </p>
            <h2 style={{
              color: colors.forest,
              fontSize: '1.8rem',
              marginBottom: '1.5rem',
              fontWeight: '500',
              lineHeight: '1.3'
            }}>
              Marion Beauvalot, Diététicienne-nutritionniste à Suresnes.
            </h2>
            <p style={{
              color: colors.textLight,
              fontSize: '1rem',
              lineHeight: '1.9',
              fontFamily: "'Lato', sans-serif",
              fontWeight: '400'
            }}>
              À la suite de l'obtention de mon BTS Diététique en 2020, j'ai choisi de me spécialiser davantage en poursuivant ma formation avec un Bachelor en Diététique et Nutrition Humaine et un Master dans le même domaine. Ce parcours académique me permet aujourd'hui de proposer une expertise approfondie en diététique et de vous accompagner efficacement dans la réalisation de vos objectifs. Aujourd'hui, je vous propose un accompagnement diététique, en consultation au cabinet paramédical situé à Suresnes ou en visio.
            </p>
          </div>
        </div>
      </section>

      {/* Membre de - Fond crème */}
      <section style={{
        padding: '4rem 5%',
        backgroundColor: colors.cream
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            color: colors.forest,
            fontSize: '1.6rem',
            marginBottom: '2.5rem',
            fontWeight: '500'
          }}>
            Membre de
          </h2>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4rem',
            flexWrap: 'wrap'
          }}>
            <img src={images.logoADL} alt="ADL" style={{ height: '90px', opacity: 0.9 }} />
            <img src={images.logoAlimMater} alt="Alim-Mater" style={{ height: '75px', opacity: 0.9 }} />
            <img src={images.logoCPTS} alt="CPTS Suresnes" style={{ height: '100px', opacity: 0.9 }} />
          </div>
        </div>
      </section>

      {/* Contact / Localisation - Fond vert foncé */}
      <section id="contact" style={{
        padding: '5rem 5%',
        backgroundColor: colors.forest,
        color: 'white'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          maxWidth: '1200px',
          margin: '0 auto',
          gap: '3rem',
          flexWrap: 'wrap'
        }}>
          {/* Localisation */}
          <div style={{ flex: '1', minWidth: '280px', maxWidth: '350px' }}>
            <h2 style={{
              fontSize: '1.8rem',
              marginBottom: '1.5rem',
              fontWeight: '500'
            }}>
              Localisation
            </h2>
            <p style={{
              fontSize: '1rem',
              lineHeight: '1.8',
              fontFamily: "'Lato', sans-serif",
              fontWeight: '300',
              opacity: 0.9,
              marginBottom: '1.5rem'
            }}>
              Cabinet pluridisciplinaire<br />
              54 rue de Verdun<br />
              92150 Suresnes
            </p>

            {/* Google Maps Embed */}
            <div style={{ marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2623.5!2d2.2189!3d48.8697!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e665a7b4e9b8f7%3A0x8c7e8f0b5c8d7a6e!2s54%20Rue%20de%20Verdun%2C%2092150%20Suresnes!5e0!3m2!1sfr!2sfr!4v1234567890"
                width="100%"
                height="200"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localisation cabinet"
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href="https://www.instagram.com/marion_dieteticienne/" target="_blank" rel="noopener noreferrer" style={{ color: 'white', opacity: 0.8, transition: 'opacity 0.3s' }} onMouseOver={(e) => e.currentTarget.style.opacity = 1} onMouseOut={(e) => e.currentTarget.style.opacity = 0.8}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://www.linkedin.com/in/marion-beauvalot/" target="_blank" rel="noopener noreferrer" style={{ color: 'white', opacity: 0.8, transition: 'opacity 0.3s' }} onMouseOver={(e) => e.currentTarget.style.opacity = 1} onMouseOut={(e) => e.currentTarget.style.opacity = 0.8}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>

          {/* Formulaire de contact */}
          <div style={{ flex: '1', minWidth: '280px', maxWidth: '400px' }}>
            <h2 style={{
              fontSize: '1.8rem',
              marginBottom: '1.5rem',
              fontWeight: '500'
            }}>
              Me contacter
            </h2>
            <form onSubmit={handleFormSubmit} style={{ fontFamily: "'Lato', sans-serif" }}>
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  name="name"
                  placeholder="Votre nom *"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.95rem',
                    fontFamily: "'Lato', sans-serif"
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="email"
                  name="email"
                  placeholder="Votre email *"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.95rem',
                    fontFamily: "'Lato', sans-serif"
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Votre téléphone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.95rem',
                    fontFamily: "'Lato', sans-serif"
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  name="subject"
                  placeholder="Sujet *"
                  value={formData.subject}
                  onChange={handleFormChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.95rem',
                    fontFamily: "'Lato', sans-serif"
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <textarea
                  name="message"
                  placeholder="Votre message *"
                  value={formData.message}
                  onChange={handleFormChange}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.95rem',
                    fontFamily: "'Lato', sans-serif",
                    resize: 'vertical'
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={formStatus === 'sending'}
                style={{
                  width: '100%',
                  padding: '0.9rem 1.5rem',
                  backgroundColor: colors.wine,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s',
                  fontFamily: "'Lato', sans-serif"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#9a2f3b'}
                onMouseOut={(e) => e.target.style.backgroundColor = colors.wine}
              >
                {formStatus === 'sending' ? 'Envoi en cours...' : formStatus === 'sent' ? 'Message envoyé !' : formStatus === 'error' ? 'Erreur, réessayez' : 'Envoyer'}
              </button>
            </form>
          </div>

          {/* Prendre rendez-vous */}
          <div style={{ flex: '1', minWidth: '280px', maxWidth: '300px' }}>
            <h2 style={{
              fontSize: '1.8rem',
              marginBottom: '1.5rem',
              fontWeight: '500'
            }}>
              Prendre rendez-vous
            </h2>
            <p style={{
              fontSize: '0.95rem',
              lineHeight: '1.8',
              fontFamily: "'Lato', sans-serif",
              fontWeight: '300',
              opacity: 0.9,
              marginBottom: '1.5rem'
            }}>
              Consultations disponibles en cabinet et en visio. Prenez rendez-vous facilement sur Doctolib.
            </p>
            <a
              href="https://www.doctolib.fr/dieteticien/suresnes/marion-beauvalot"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#107ACA',
                color: 'white',
                padding: '0.8rem 1.5rem',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '1rem',
                fontFamily: "'Lato', sans-serif",
                fontWeight: '500',
                transition: 'transform 0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <img src={images.doctolib} alt="Doctolib" style={{ height: '20px' }} />
              Prendre rendez-vous
            </a>
          </div>
        </div>
      </section>

      {/* Footer - Fond vert très foncé */}
      <footer style={{
        backgroundColor: colors.forestDark,
        padding: '2rem 5%',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          fontFamily: "'Lato', sans-serif"
        }}>
          {[
            { label: 'Accueil', id: 'accueil' },
            { label: 'Accompagnements diététiques', id: 'accompagnements' },
            { label: 'Ateliers nutrition', id: 'ateliers' },
            { label: 'Contact', id: 'contact' }
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => scrollToSection(e, item.id)}
              style={{
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                transition: 'color 0.3s'
              }}
              onMouseOver={(e) => e.target.style.color = 'white'}
              onMouseOut={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
            >
              {item.label}
            </a>
          ))}
        </div>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.85rem',
          fontFamily: "'Lato', sans-serif"
        }}>
          © 2025 Marion Beauvalot - Diététicienne-Nutritionniste à Suresnes
        </p>
      </footer>

      {/* Cookie Consent Banner */}
      <CookieConsentBanner onConsent={handleCookieConsent} />
    </div>
  );
};

export default MarionDietPage;
