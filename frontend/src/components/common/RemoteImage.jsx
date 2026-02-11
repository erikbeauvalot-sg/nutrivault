/**
 * RemoteImage
 * On native (Capacitor iOS), WKWebView blocks <img src="https://..."> from
 * the capacitor:// origin. This component fetches the image via JS fetch()
 * (which goes through the native HTTP layer) and displays it as a blob URL.
 * On web, it renders a plain <img> tag.
 */

import { useState, useEffect, memo } from 'react';
import { isNative } from '../../utils/platform';

const RemoteImage = memo(({ src, alt, style, onClick, className, ...props }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isNative || !src) return;

    let revoked = false;
    let objectUrl = null;

    fetch(src)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then(blob => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setLoaded(true);
      })
      .catch(() => {
        if (!revoked) setError(true);
      });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!src) return null;

  // Web: plain img tag
  if (!isNative) {
    return <img src={src} alt={alt} style={style} onClick={onClick} className={className} {...props} />;
  }

  // Native: loading placeholder
  if (!loaded && !error) {
    return (
      <div
        style={{
          ...style,
          background: 'var(--nv-warm-200, #e7e5e4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    );
  }

  // Native: error
  if (error) {
    return (
      <div
        style={{
          ...style,
          background: 'var(--nv-warm-100, #f5f5f4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
        }}
      >
        {'\uD83D\uDDBC\uFE0F'}
      </div>
    );
  }

  // Native: loaded blob URL
  return <img src={blobUrl} alt={alt} style={style} onClick={onClick} className={className} {...props} />;
});

RemoteImage.displayName = 'RemoteImage';

export default RemoteImage;
