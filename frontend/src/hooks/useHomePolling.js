import { useEffect, useRef } from 'react';
import { homeAPI } from '../services/api';

export default function useHomePolling(onUpdate, interval = 15000) {
  const cbRef = useRef(onUpdate);
  useEffect(() => { cbRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    let mounted = true;
    let timer = null;

    const poll = async () => {
      // Only poll if page is visible
      if (document.hidden) {
        timer = setTimeout(poll, interval);
        return;
      }

      try {
        const res = await homeAPI.getHome();
        if (mounted && res?.success) cbRef.current?.(res.data || {});
      } catch (err) {
        // don't crash the app on polling errors
        // eslint-disable-next-line no-console
        console.error('home polling error', err);
      } finally {
        timer = setTimeout(poll, interval);
      }
    };

    poll();
    return () => { mounted = false; if (timer) clearTimeout(timer); };
  }, [interval]);
}
