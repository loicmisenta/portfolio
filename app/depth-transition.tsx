'use client';
import { basePath } from './site-path';
import { useEffect } from 'react';

// Runs before the page paints, so the destination starts on the correct side.
export const depthBootstrap = `try{const p=JSON.parse(sessionStorage.getItem('owly-depth')||'null');sessionStorage.removeItem('owly-depth');if(p&&Date.now()-p.time<10000&&p.path===location.pathname&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.dataset.depth=p.direction;if(p.fallback)document.documentElement.dataset.depthEnter='true';setTimeout(()=>{delete document.documentElement.dataset.depth;delete document.documentElement.dataset.depthEnter},1200)}}catch{}`;

export function DepthTransition() {
  useEffect(() => {
    let navigating = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clean = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      navigating = false;
      delete document.documentElement.dataset.depth;
      delete document.documentElement.dataset.depthExit;
      delete document.documentElement.dataset.depthEnter;
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const link = (event.target as Element)?.closest('a');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const destination = new URL(link.href, location.href);
      const current = location.pathname.slice(basePath.length).replace(/\/$/, '') || '/';
      const next = destination.pathname.slice(basePath.length).replace(/\/$/, '') || '/';
      if (destination.origin !== location.origin || current === next || !['/', '/projects', '/owly'].includes(current) || !['/', '/projects', '/owly'].includes(next) || (current !== '/owly' && next !== '/owly')) return;
      if (navigating) { event.preventDefault(); return; }
      const direction = next === '/owly' ? 'down' : 'up';
      const native = 'onpageswap' in window && 'onpagereveal' in window;
      try { sessionStorage.setItem('owly-depth', JSON.stringify({ direction, path: destination.pathname, time: Date.now(), fallback: !native })); }
      catch { return; }
      navigating = true;
      document.documentElement.dataset.depth = direction;
      if (!native) {
        event.preventDefault();
        document.documentElement.dataset.depthExit = 'true';
        timer = setTimeout(() => location.assign(destination.href), 360);
      }
    };
    document.addEventListener('click', click);
    window.addEventListener('pageshow', clean);
    return () => { document.removeEventListener('click', click); window.removeEventListener('pageshow', clean); if (timer) clearTimeout(timer); };
  }, []);
  return null;
}
