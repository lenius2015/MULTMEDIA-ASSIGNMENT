/**
 * About Us Page
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/pages/About.css';

export function AboutPage() {
  return (
    <div className="about-page">
      <Helmet>
        <title>About Us - ShopHub</title>
        <meta name="description" content="Learn about ShopHub - your trusted online marketplace." />
      </Helmet>

      <div className="about-container">
        <section className="about-hero">
          <h1>About ShopHub</h1>
          <p>Your Trusted Online Marketplace</p>
        </section>

        <section className="about-content">
          <div className="about-section">
            <h2>Our Mission</h2>
            <p>
              At ShopHub, we're committed to providing the best online shopping experience
              with a wide variety of products at competitive prices. We believe in making
              quality products accessible to everyone.
            </p>
          </div>

          <div className="about-section">
            <h2>Our Vision</h2>
            <p>
              To become the leading e-commerce platform in the region by delivering
              exceptional customer service, innovative solutions, and unbeatable value.
            </p>
          </div>

          <div className="about-section">
            <h2>Why Choose Us?</h2>
            <ul>
              <li>Wide selection of products</li>
              <li>Competitive prices and regular deals</li>
              <li>Secure payment options</li>
              <li>Fast and reliable delivery</li>
              <li>Excellent customer support</li>
              <li>Trusted by thousands of customers</li>
            </ul>
          </div>

          <div className="about-section">
            <h2>Our Values</h2>
            <p>
              <strong>Integrity:</strong> We operate with honesty and transparency in all our dealings.<br/>
              <strong>Excellence:</strong> We strive for the highest standards in everything we do.<br/>
              <strong>Customer Focus:</strong> Your satisfaction is our top priority.<br/>
              <strong>Innovation:</strong> We continuously improve our platform and services.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AboutPage;
