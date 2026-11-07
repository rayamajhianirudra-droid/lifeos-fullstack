// Dates in the user's regional order while the app's words are English:
// en-US "Sat, Nov 8", en-GB / en-IN / Nepal "Sat 8 Nov", Germany "Sat, 8 Nov".
// When the app is translated, this becomes the user's own language.

let cached;
export function dateLocale(langs) {
  if (!langs && cached) return cached;
  const list = langs || (typeof navigator !== 'undefined' ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : []);
  const first = String(list[0] || 'en-US');
  const [lang, region] = first.split(/[-_]/);
  let out = 'en-US';
  if (lang && lang.toLowerCase() === 'en' && region) out = `en-${region.toUpperCase()}`;
  else if (region) out = `en-${region.toUpperCase()}`;
  else if (lang && lang.toLowerCase() !== 'en') out = 'en-GB';   // day-first, like most of the world
  try {
    // Browsers silently fall back to US English for regions they have no English data
    // for (e.g. en-NP). Outside the US that would put the month first, so use en-GB.
    const resolved = new Intl.DateTimeFormat(out).resolvedOptions().locale;
    const isUS = region ? region.toUpperCase() === 'US' : out === 'en-US';
    if (!isUS && (resolved === 'en' || resolved === 'en-US')) out = 'en-GB';
    else if (resolved !== out && !resolved.startsWith('en-')) out = isUS ? 'en-US' : 'en-GB';
  } catch { out = 'en-US'; }
  if (!langs) cached = out;
  return out;
}


