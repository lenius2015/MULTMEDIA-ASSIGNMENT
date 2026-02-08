export default function notify(message, type = 'info', timeout = 2500) {
  const el = document.createElement('div');
  el.className = `notification notification--${type}`;
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 18px',
    background: '#333',
    color: 'white',
    borderRadius: '8px',
    opacity: '0',
    transform: 'translateY(20px)',
    transition: 'all 0.3s ease',
    zIndex: 10000
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => el.style.opacity = '1');
  requestAnimationFrame(() => el.style.transform = 'translateY(0)');
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    setTimeout(() => el.remove(), 300);
  }, timeout);
}
