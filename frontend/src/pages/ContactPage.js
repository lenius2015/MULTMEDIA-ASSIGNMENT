/**
 * Contact Us Page
 */

import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { api } from '../services/api';
import '../styles/pages/Contact.css';

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/contact', formData);
      if (response.success) {
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        setError(response.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Contact form error:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <Helmet>
        <title>Contact Us - ShopHub</title>
        <meta name="description" content="Get in touch with ShopHub customer support." />
      </Helmet>

      <div className="contact-container">
        <section className="contact-hero">
          <h1>Contact Us</h1>
          <p>We'd love to hear from you. Get in touch with us today.</p>
        </section>

        <div className="contact-content">
          <div className="contact-info">
            <div className="info-block">
              <h3>Email</h3>
              <p><a href="mailto:support@shophub.com">support@shophub.com</a></p>
            </div>

            <div className="info-block">
              <h3>Phone</h3>
              <p><a href="tel:+254700000000">+254 700 000 000</a></p>
            </div>

            <div className="info-block">
              <h3>Address</h3>
              <p>ShopHub HQ<br/>123 Commerce Street<br/>Nairobi, Kenya</p>
            </div>

            <div className="info-block">
              <h3>Business Hours</h3>
              <p>Monday - Friday: 9:00 AM - 6:00 PM<br/>Saturday: 10:00 AM - 4:00 PM<br/>Sunday: Closed</p>
            </div>
          </div>

          <div className="contact-form-section">
            <h2>Send us a Message</h2>
            {submitted && <div className="success-message">Thank you! Your message has been sent.</div>}
            {error && <div className="error-message">{error}</div>}
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Your name"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your@email.com"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="How can we help?"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Your message here..."
                  rows="5"
                  disabled={loading}
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
