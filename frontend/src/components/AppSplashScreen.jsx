/**
 * AppSplashScreen
 * Animated loading screen shown on native app launch.
 * Replaces the static Capacitor splash with a rich CSS animation.
 */

import { useState, useEffect } from 'react';

const AppSplashScreen = ({ onFinished }) => {
  const [phase, setPhase] = useState('enter'); // enter → visible → exit → done

  useEffect(() => {
    // Phase 1: enter animation plays via CSS (0 → 1.2s)
    const visibleTimer = setTimeout(() => setPhase('visible'), 1200);
    // Phase 2: hold visible briefly, then exit
    const exitTimer = setTimeout(() => setPhase('exit'), 2400);
    // Phase 3: fade out complete → notify parent
    const doneTimer = setTimeout(() => {
      setPhase('done');
      onFinished?.();
    }, 3000);

    return () => {
      clearTimeout(visibleTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinished]);

  if (phase === 'done') return null;

  return (
    <div
      className={`app-splash ${phase}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #0f1c2e 0%, #1a2a3a 40%, #1e3044 100%)',
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.6s ease-out',
      }}
    >
      {/* Animated background glow */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(196,164,52,0.12) 0%, transparent 70%)',
        animation: 'splashPulse 2.5s ease-in-out infinite',
      }} />

      {/* Lock icon */}
      <div style={{
        animation: 'splashIconEnter 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        opacity: 0,
        transform: 'scale(0.5) translateY(20px)',
      }}>
        <svg width="120" height="120" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sp-body" x1="30%" y1="0%" x2="70%" y2="100%">
              <stop offset="0%" stopColor="#C75B39"/>
              <stop offset="55%" stopColor="#933D25"/>
              <stop offset="100%" stopColor="#5E2214"/>
            </linearGradient>
            <linearGradient id="sp-arc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD180"/>
              <stop offset="60%" stopColor="#FFAB40"/>
              <stop offset="100%" stopColor="#D9922E"/>
            </linearGradient>
            <linearGradient id="sp-leaf1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#388E3C"/>
              <stop offset="100%" stopColor="#1B5E20"/>
            </linearGradient>
            <linearGradient id="sp-leaf2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A5D6A7"/>
              <stop offset="100%" stopColor="#4CAF50"/>
            </linearGradient>
          </defs>
          {/* Lock body */}
          <rect x="50" y="88" width="100" height="74" rx="14" fill="url(#sp-body)"/>
          {/* Shackle */}
          <path d="M72,88 L72,62 Q72,30 100,30 Q128,30 128,62 L128,88"
            fill="none" stroke="url(#sp-arc)" strokeWidth="12" strokeLinecap="round"
            style={{
              strokeDasharray: 200,
              strokeDashoffset: 200,
              animation: 'splashShackle 0.8s ease-out 0.4s forwards',
            }}
          />
          {/* Leaves */}
          <path d="M100,30 Q82,14 74,22 Q84,28 100,30" fill="url(#sp-leaf1)"
            style={{ opacity: 0, animation: 'splashFadeIn 0.4s ease-out 0.9s forwards' }} />
          <path d="M100,30 Q118,12 128,20 Q116,28 100,30" fill="url(#sp-leaf2)"
            style={{ opacity: 0, animation: 'splashFadeIn 0.4s ease-out 1s forwards' }} />
          {/* Keyhole */}
          <circle cx="100" cy="115" r="9" fill="#FAF0E2"
            style={{ opacity: 0, animation: 'splashFadeIn 0.3s ease-out 0.7s forwards' }} />
          <path d="M100,119 L94,138 Q100,142 106,138 Z" fill="#FAF0E2"
            style={{ opacity: 0, animation: 'splashFadeIn 0.3s ease-out 0.8s forwards' }} />
        </svg>
      </div>

      {/* App name */}
      <h1 style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 800,
        fontSize: '2rem',
        letterSpacing: '0.15em',
        color: '#FAF0E2',
        marginTop: '1.5rem',
        opacity: 0,
        animation: 'splashTextEnter 0.8s ease-out 0.6s forwards',
      }}>
        NutriVault
      </h1>

      {/* Tagline */}
      <p style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 200,
        fontSize: '0.75rem',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        color: 'rgba(196,164,52,0.7)',
        marginTop: '0.5rem',
        opacity: 0,
        animation: 'splashTextEnter 0.8s ease-out 0.9s forwards',
      }}>
        Nutrition &middot; Suivi &middot; Cabinet
      </p>

      {/* Loading dots */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginTop: '2.5rem',
        opacity: 0,
        animation: 'splashTextEnter 0.5s ease-out 1.2s forwards',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#c4a434',
            animation: `splashDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes splashIconEnter {
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes splashShackle {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes splashFadeIn {
          to {
            opacity: 1;
          }
        }
        @keyframes splashTextEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes splashPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.3);
            opacity: 1;
          }
        }
        @keyframes splashDot {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.3;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default AppSplashScreen;
