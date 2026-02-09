/**
 * Profile Page
 * User profile management with profile picture upload
 */

import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import '../styles/pages/Profile.css';

export function ProfilePage() {
  const { user, updateProfile, updateProfilePicture } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await updateProfile(profileData);
      if (result) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 2MB' });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result);
    };
    reader.readAsDataURL(file);

    // Upload
    setLoading(true);
    const formData = new FormData();
    formData.append('profile_picture', file);

    try {
      const response = await authAPI.updateProfilePicture(formData);
      if (response.success) {
        setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
        setPreviewImage(null);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to update profile picture' });
        setPreviewImage(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload profile picture' });
      setPreviewImage(null);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="profile-page">
      <Helmet>
        <title>My Profile - ShopHub</title>
        <meta name="description" content="Manage your ShopHub profile" />
      </Helmet>

      <div className="profile-container">
        <div className="profile-header">
          <h1>My Profile</h1>
          <p>Manage your account settings and profile information</p>
        </div>

        {message && (
          <div className={`profile-message ${message.type}`}>
            {message.text}
            <button onClick={() => setMessage(null)}>&times;</button>
          </div>
        )}

        <div className="profile-content">
          {/* Profile Sidebar */}
          <div className="profile-sidebar">
            <div className="profile-avatar-section">
              <div className="profile-avatar" onClick={handleProfilePictureClick}>
                {loading && !previewImage ? (
                  <div className="avatar-loading">Uploading...</div>
                ) : previewImage || user?.profile_picture ? (
                  <img 
                    src={previewImage || user.profile_picture} 
                    alt={user?.name || 'User'} 
                    className="avatar-image"
                    onError={(e) => {
                      e.target.src = '/images/default-avatar.svg';
                    }}
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="avatar-edit-overlay">
                  <span>📷</span>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
              />
              <p className="avatar-hint">Click to change photo</p>
            </div>

            <nav className="profile-nav">
              <button 
                className={`profile-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                👤 Profile
              </button>
              <button 
                className={`profile-nav-item ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                🔒 Security
              </button>
              <button 
                className={`profile-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('notifications')}
              >
                🔔 Notifications
              </button>
            </nav>
          </div>

          {/* Profile Forms */}
          <div className="profile-main">
            {activeTab === 'profile' && (
              <div className="profile-section">
                <h2>Profile Information</h2>
                <form onSubmit={handleProfileSubmit} className="profile-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="name">Full Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={profileData.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="email">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleChange}
                        placeholder="+254 700 000 000"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="address">Address</label>
                      <textarea
                        id="address"
                        name="address"
                        value={profileData.address}
                        onChange={handleChange}
                        placeholder="Your shipping address"
                        rows="3"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="save-btn" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="profile-section">
                <h2>Security Settings</h2>
                <div className="security-item">
                  <div className="security-info">
                    <h3>Password</h3>
                    <p>Last changed: Never</p>
                  </div>
                  <button className="change-btn">Change Password</button>
                </div>
                <div className="security-item">
                  <div className="security-info">
                    <h3>Two-Factor Authentication</h3>
                    <p>Add an extra layer of security to your account</p>
                  </div>
                  <button className="enable-btn">Enable 2FA</button>
                </div>
                <div className="security-item">
                  <div className="security-info">
                    <h3>Active Sessions</h3>
                    <p>Manage your active login sessions</p>
                  </div>
                  <button className="view-btn">View Sessions</button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="profile-section">
                <h2>Notification Preferences</h2>
                <div className="notification-group">
                  <h3>Email Notifications</h3>
                  <label className="notification-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                    Order updates and shipping confirmations
                  </label>
                  <label className="notification-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                    Promotions and deals
                  </label>
                  <label className="notification-toggle">
                    <input type="checkbox" />
                    <span className="toggle-slider"></span>
                    New product recommendations
                  </label>
                </div>
                <div className="notification-group">
                  <h3>Push Notifications</h3>
                  <label className="notification-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                    Order status changes
                  </label>
                  <label className="notification-toggle">
                    <input type="checkbox" />
                    <span className="toggle-slider"></span>
                    Price drop alerts
                  </label>
                </div>
                <button className="save-btn">Save Preferences</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
