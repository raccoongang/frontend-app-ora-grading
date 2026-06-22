import { useContext, useEffect, useRef } from 'react';

import { AppContext } from '@edx/frontend-platform/react';

const readThemeCookie = () => document.cookie.match(/(?:^|;\s*)theme-variant=(dark|light)/)?.[1];

/**
 * Adopt the shared cross-origin `theme-variant` cookie as the active Paragon theme
 * variant. The ORA staff-grading (ESG) MFE renders the `LearningHeader`, which has NO
 * <ThemeToggle/> to adopt the cookie — and frontend-platform keeps the theme choice in
 * per-origin localStorage, which cannot be read across the MFE port boundaries. So when a
 * user enables dark mode elsewhere (the toggle writes a shared-domain `theme-variant`
 * cookie on `.local.openedx.io`), ESG stays light unless we read that cookie here and call
 * setThemeVariant.
 *
 * It also polls the cookie (and re-checks on focus/visibility) plus listens for a
 * `{ type: 'rg-theme-variant', variant }` postMessage so a switch made in the parent
 * window propagates LIVE (e.g. when ESG is opened from another themed page).
 *
 * Renders nothing; safe to mount unconditionally inside AppProvider.
 */
const ThemeCookieSync = () => {
  const { paragonTheme } = useContext(AppContext);
  const setThemeVariant = paragonTheme?.setThemeVariant;
  const lastApplied = useRef(null);

  useEffect(() => {
    if (!setThemeVariant) { return undefined; }
    const apply = () => {
      const variant = readThemeCookie();
      if (variant && variant !== lastApplied.current) {
        lastApplied.current = variant;
        setThemeVariant(variant);
      }
    };
    const onMessage = (event) => {
      const variant = event?.data?.type === 'rg-theme-variant' ? event.data.variant : null;
      if ((variant === 'dark' || variant === 'light') && variant !== lastApplied.current) {
        lastApplied.current = variant;
        setThemeVariant(variant);
      }
    };
    apply();
    const intervalId = setInterval(apply, 1000);
    document.addEventListener('visibilitychange', apply);
    window.addEventListener('focus', apply);
    window.addEventListener('message', onMessage);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', apply);
      window.removeEventListener('focus', apply);
      window.removeEventListener('message', onMessage);
    };
  }, [setThemeVariant]);

  return null;
};

export default ThemeCookieSync;
