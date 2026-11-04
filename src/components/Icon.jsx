// Small line-icon set drawn inline (no icon font or extra package), 24x24 grid,
// stroke uses currentColor so icons follow the text color in light and dark mode.
const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  utensils: 'M5 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M7 13v8M17 21V3c-2.2 0-4 2.7-4 6v4h4',
  run: 'M13 4.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M5 21l4-6 3 2 2-4-4-3-3 3M14 13l3 3h4M10 7l4-1 3 3',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z',
  ruler: 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  bot: 'M12 3v3M7 8h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3zM9 13h.01M15 13h.01M9.5 16.5h5',
  moon: 'M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a6.5 6.5 0 0 0 11 11z',
  smile: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2M9 9.5h.01M15 9.5h.01',
  pill: 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM8.5 8.5l7 7',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  droplet: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  flame: 'M12 21c3.9 0 6.5-2.6 6.5-6.3C18.5 10 13.5 7 14 3c-3 1.5-5 4.5-5 7.5-1-.5-1.8-1.6-2-3-1.5 1.7-2.5 3.7-2.5 6C4.5 18.2 8.1 21 12 21z',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  scale: 'M5 4h14l-1.5 16h-11zM9 9a3 3 0 0 1 6 0',
  heart: 'M12 20s-7.5-4.6-9-9.3C2 7.3 4.3 4.5 7.3 4.5c2 0 3.4 1.1 4.7 2.7 1.3-1.6 2.7-2.7 4.7-2.7 3 0 5.3 2.8 4.3 6.2-1.5 4.7-9 9.3-9 9.3z',
  wheat: 'M12 21V9M12 9c-2.5 0-4-1.7-4-4 2.5 0 4 1.7 4 4zm0 0c2.5 0 4-1.7 4-4-2.5 0-4 1.7-4 4zm0 5c-2.5 0-4-1.7-4-4 2.5 0 4 1.7 4 4zm0 0c2.5 0 4-1.7 4-4-2.5 0-4 1.7-4 4z',
  drop: 'M12 4c3 4 5 7 5 9.5a5 5 0 0 1-10 0C7 11 9 8 12 4z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  lock: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1.5v2M12 20.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M1.5 12h2M20.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
};

export default function Icon({ name, size = 18, strokeWidth = 1.8, className = '', title }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d={d} />
    </svg>
  );
}
