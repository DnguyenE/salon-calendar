export const THEME_STORAGE_KEY = "salon-calendar:theme:v1";

/**
 * Inline script that runs synchronously in <head> before paint to apply the
 * saved theme class on <html>. Prevents a flash of light mode on hard reload
 * when the saved preference is dark.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){}})();`;
