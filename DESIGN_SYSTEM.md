# E-Commerce Website Design System

## Overview
This document outlines the complete design system for the OMUNJU SHOPPERS e-commerce website, ensuring consistency across all pages.

## Design Principles
- **Marketplace-grade UI** inspired by Kikuu and Alibaba
- **Consistent branding** across all pages
- **Mobile-first responsive design**
- **Performance-optimized** layouts
- **Accessibility-compliant** (WCAG AA)

## Color Palette

### Primary Colors
```css
--primary-color: #ff6b35;      /* Orange - Main brand color */
--secondary-color: #004e89;    /* Blue - Secondary actions */
--accent-color: #f77f00;       /* Amber - Highlights */
```

### Neutral Colors
```css
--text-dark: #1a1a1a;          /* Primary text */
--text-light: #666;            /* Secondary text */
--bg-light: #f8f9fa;           /* Light backgrounds */
--white: #ffffff;              /* Pure white */
--border-color: #e0e0e0;       /* Borders and dividers */
```

### Status Colors
```css
--success: #28a745;            /* Success states */
--danger: #dc3545;             /* Error states */
--warning: #ffc107;            /* Warning states */
--info: #17a2b8;               /* Info states */
```

## Typography

### Font Families
- **Primary**: Inter, Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Headings**: 700 weight
- **Body**: 400-500 weight
- **Buttons**: 600 weight

### Font Sizes
```css
--font-xs: 0.75rem;    /* 12px */
--font-sm: 0.875rem;   /* 14px */
--font-base: 1rem;     /* 16px */
--font-lg: 1.125rem;   /* 18px */
--font-xl: 1.25rem;    /* 20px */
--font-2xl: 1.5rem;    /* 24px */
--font-3xl: 2rem;      /* 32px */
--font-4xl: 2.5rem;    /* 40px */
```

## Spacing System
```css
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */
--space-3xl: 4rem;     /* 64px */
--space-4xl: 5rem;     /* 80px */
```

## Shadows
```css
--shadow-sm: 0 2px 4px rgba(0,0,0,0.08);
--shadow-md: 0 4px 12px rgba(0,0,0,0.1);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
--shadow-xl: 0 12px 32px rgba(0,0,0,0.15);
```

## Border Radius
```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
```

## Transitions
```css
--transition-fast: 0.15s ease;
--transition-base: 0.3s ease;
--transition-slow: 0.5s ease;
```

## Component Specifications

### Header
- **Height**: 140px total (60px main nav + 50px secondary nav + 30px notification bar)
- **Position**: Sticky
- **Background**: White with shadow
- **Z-index**: 1000

### Footer
- **Background**: Dark (#1a1a1a)
- **Text Color**: White/Light gray
- **Padding**: 60px top, 20px bottom
- **Grid**: 4 columns on desktop, 1 column on mobile

### Cards
- **Background**: White
- **Border Radius**: 16px
- **Shadow**: var(--shadow-sm) default, var(--shadow-lg) on hover
- **Padding**: 20px
- **Transition**: 0.3s ease

### Buttons

#### Primary Button
```css
background: var(--primary-color);
color: white;
padding: 12px 24px;
border-radius: 8px;
font-weight: 600;
transition: 0.3s ease;
```

#### Secondary Button
```css
background: transparent;
color: var(--primary-color);
border: 2px solid var(--primary-color);
padding: 12px 24px;
border-radius: 8px;
font-weight: 600;
```

### Product Cards
- **Image Height**: 300px
- **Aspect Ratio**: 1:1
- **Hover Effect**: Lift (translateY(-8px))
- **Badge Position**: Top-left
- **Rating**: Star icons with count
- **Price**: Large, bold, primary color

### Form Inputs
```css
padding: 12px 20px;
border: 1px solid var(--border-color);
border-radius: 8px;
font-size: 1rem;
transition: 0.3s ease;
```

## Page Layouts

### 1. Homepage
- Notification bar
- Header with search
- Hero slider (500px height)
- Categories grid (8 items)
- Featured products (8 items, 4 columns)
- Promotional section
- Recommended products
- Footer

### 2. Products Page
- Header
- Breadcrumb navigation
- Filter sidebar (left, 250px width)
- Product grid (right, flexible)
- Pagination/Infinite scroll
- Footer

### 3. Catalog Page
- Header
- Category sidebar (left, 280px width)
- Product grid by category
- Breadcrumb navigation
- Footer

### 4. About Page
- Header
- Hero section (400px height)
- Who We Are section
- Our Mission section
- Why Choose Us (value cards)
- Statistics section
- Footer

### 5. Profile Page
- Header
- Dashboard layout
- Profile card (left sidebar, 300px)
- Main content area (right, flexible)
- Tabs: Orders, Saved Items, Settings
- Footer

### 6. Notifications Page
- Header
- Page title
- Notification list (card-based)
- Mark as read/delete actions
- Footer

## Responsive Breakpoints

### Desktop (> 1024px)
- Full navigation visible
- 4-column product grid
- Sidebar layouts
- Large images

### Tablet (768px - 1024px)
- Adjusted spacing
- 3-column product grid
- Collapsible sidebars
- Medium images

### Mobile (< 768px)
- Hamburger menu
- 1-2 column grids
- Stacked layouts
- Optimized images
- Touch-friendly buttons (min 44px)

## Icons
- **Library**: Font Awesome 6.4.0
- **Size**: 1.2rem - 1.5rem for UI icons
- **Color**: Inherit from parent or primary color

## Images
- **Format**: WebP with JPG fallback
- **Optimization**: Lazy loading
- **Alt Text**: Required for accessibility
- **Aspect Ratios**: 
  - Products: 1:1
  - Banners: 16:9
  - Categories: 4:3

## Animations

### Hover Effects
```css
/* Cards */
transform: translateY(-8px);
box-shadow: var(--shadow-lg);

/* Buttons */
transform: translateY(-2px);
box-shadow: var(--shadow-md);

/* Images */
transform: scale(1.1);
```

### Page Transitions
```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide Up */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Accessibility

### Requirements
- Semantic HTML5 elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus visible states
- Color contrast ratio ≥ 4.5:1
- Alt text for images
- Form labels

### Focus States
```css
:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
```

## Performance

### Optimization Strategies
1. **Lazy Loading**: Images load on scroll
2. **Code Splitting**: Separate CSS/JS per page
3. **Minification**: Compressed assets
4. **Caching**: Browser and CDN caching
5. **Image Optimization**: WebP format, responsive sizes

### Loading States
- Skeleton screens for content
- Spinners for actions
- Progress bars for uploads

## Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## File Structure
```
views/
├── partials/
│   ├── header.ejs
│   └── footer.ejs
├── index.ejs (Homepage)
├── products.ejs (Products listing)
├── catalog.ejs (Category catalog)
├── about.ejs (About page)
├── profile.ejs (User profile)
├── notifications.ejs (Notifications)
├── product.ejs (Single product)
└── contact.ejs (Contact page)

public/
├── style.css (Main stylesheet)
├── script.js (Main JavaScript)
├── products.js (Products page JS)
├── catalog.js (Catalog page JS)
└── profile.js (Profile page JS)
```

## Implementation Checklist

### Header/Footer
- [x] Create shared header partial
- [x] Create shared footer partial
- [ ] Implement in all pages

### Pages
- [x] Homepage (Complete)
- [ ] Products page with filters
- [ ] Catalog page with sidebar
- [ ] About page (Update with new design)
- [ ] Profile page (Dashboard layout)
- [ ] Notifications page (List layout)

### Styling
- [x] Base styles and variables
- [ ] Page-specific styles
- [ ] Responsive styles
- [ ] Animation styles

### JavaScript
- [x] Core functionality
- [ ] Page-specific scripts
- [ ] Form validation
- [ ] AJAX interactions

### Testing
- [ ] Desktop responsiveness
- [ ] Tablet responsiveness
- [ ] Mobile responsiveness
- [ ] Cross-browser testing
- [ ] Accessibility testing
- [ ] Performance testing

## Notes
- All pages must use the shared header and footer partials
- Maintain consistent spacing and typography
- Use the defined color palette
- Follow the component specifications
- Test on multiple devices and browsers
- Ensure accessibility compliance

---

**Version**: 1.0  
**Last Updated**: January 2026  
**Maintained By**: Development Team
