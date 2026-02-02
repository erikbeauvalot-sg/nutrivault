import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Button, Badge, InputGroup, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { updateUser, getUserById } from '../services/userService';
import { toast } from 'react-toastify';

/**
 * UserWebsitesManager Component
 * Allows users to manage website URLs
 * @param {string} userId - Optional user ID to manage (for admin editing another user)
 */
const UserWebsitesManager = ({ userId }) => {
  const { t } = useTranslation();
  const { user: currentUser, refreshUser } = useAuth();
  const [websites, setWebsites] = useState([]);
  const [newWebsite, setNewWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Determine which user's websites to manage
  const targetUserId = userId || currentUser?.id;
  const isOwnProfile = !userId || userId === currentUser?.id;

  useEffect(() => {
    if (targetUserId) {
      loadUserWebsites();
    }
  }, [targetUserId]);

  const loadUserWebsites = async () => {
    setLoading(true);
    try {
      if (isOwnProfile && currentUser) {
        // Use current user data from context
        setWebsites(currentUser.websites || []);
      } else {
        // Fetch the target user's data
        const userData = await getUserById(targetUserId);
        setWebsites(userData.websites || []);
      }
    } catch (err) {
      console.error('Error loading websites:', err);
      setError(t('settings.websites.loadError', 'Failed to load websites'));
    } finally {
      setLoading(false);
    }
  };

  const isValidUrl = (string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const normalizeUrl = (url) => {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  };

  const saveWebsites = async (newWebsites) => {
    setSaving(true);
    setError(null);
    try {
      await updateUser(targetUserId, { websites: newWebsites });
      setWebsites(newWebsites);
      if (isOwnProfile && refreshUser) {
        await refreshUser();
      }
      toast.success(t('settings.websites.saved', 'Websites saved successfully'));
    } catch (err) {
      console.error('Error saving websites:', err);
      setError(t('settings.websites.saveError', 'Failed to save websites'));
      toast.error(t('settings.websites.saveError', 'Failed to save websites'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddWebsite = async (e) => {
    e.preventDefault();
    if (!newWebsite.trim()) return;

    const normalizedUrl = normalizeUrl(newWebsite);

    if (!isValidUrl(normalizedUrl)) {
      setError(t('settings.websites.invalidUrl', 'Please enter a valid URL'));
      return;
    }

    if (websites.includes(normalizedUrl)) {
      setError(t('settings.websites.duplicate', 'This website is already in your list'));
      return;
    }

    const updatedWebsites = [...websites, normalizedUrl];
    await saveWebsites(updatedWebsites);
    setNewWebsite('');
    setError(null);
  };

  const handleRemoveWebsite = async (urlToRemove) => {
    const updatedWebsites = websites.filter(url => url !== urlToRemove);
    await saveWebsites(updatedWebsites);
  };

  const getDisplayUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" />
      </div>
    );
  }

  return (
    <div className="websites-manager">
      <p className="text-muted mb-3">
        {t('settings.websites.description', 'Add your professional websites, blogs, or social media links.')}
      </p>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Website list */}
      <div className="mb-3">
        {websites.length === 0 ? (
          <p className="text-muted fst-italic">
            {t('settings.websites.noWebsites', 'No websites added yet.')}
          </p>
        ) : (
          <div className="d-flex flex-wrap gap-2">
            {websites.map((url, index) => (
              <Badge
                key={index}
                bg="primary"
                className="d-flex align-items-center gap-2 py-2 px-3"
                style={{ fontSize: '0.9rem' }}
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white text-decoration-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  {getDisplayUrl(url)}
                </a>
                <button
                  type="button"
                  className="btn-close btn-close-white ms-1"
                  style={{ fontSize: '0.6rem' }}
                  onClick={() => handleRemoveWebsite(url)}
                  disabled={saving}
                  aria-label={t('settings.websites.remove', 'Remove')}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Add website form */}
      <Form onSubmit={handleAddWebsite}>
        <InputGroup>
          <Form.Control
            type="text"
            placeholder={t('settings.websites.placeholder', 'https://example.com')}
            value={newWebsite}
            onChange={(e) => setNewWebsite(e.target.value)}
            disabled={saving}
          />
          <Button
            type="submit"
            variant="outline-primary"
            disabled={saving || !newWebsite.trim()}
          >
            {saving ? (
              <Spinner animation="border" size="sm" />
            ) : (
              t('settings.websites.add', 'Add')
            )}
          </Button>
        </InputGroup>
        <Form.Text className="text-muted">
          {t('settings.websites.help', 'Enter a full URL (e.g., https://www.mysite.com)')}
        </Form.Text>
      </Form>
    </div>
  );
};

export default UserWebsitesManager;
