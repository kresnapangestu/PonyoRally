import { THEME_COLOR } from "@/constants/brand";
import { SESSION_KEYS, STORAGE_KEYS } from "@/constants/storage-keys";
import { DARK_QUERY } from "./theme";

/**
 * Runs synchronously in <head> before first paint, so the page never flashes
 * the wrong theme, and the splash is hidden up front when it already played
 * this session. It reads the same persisted prefs the Zustand store writes
 * ({ state: { theme, lang } }) and must stay plain ES5 with no imports.
 */
export const bootScript = `(function(){try{
if(sessionStorage.getItem(${JSON.stringify(SESSION_KEYS.splashSeen)}))document.documentElement.dataset.splash="skip";
var p=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEYS.prefs)})||"{}").state||{};
var t=p.theme==="light"||p.theme==="dark"?p.theme:(matchMedia(${JSON.stringify(DARK_QUERY)}).matches?"dark":"light");
var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t;
if(p.lang==="en"||p.lang==="id")r.lang=p.lang;
var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",${JSON.stringify(THEME_COLOR)}[t]);
}catch(e){}})()`;
