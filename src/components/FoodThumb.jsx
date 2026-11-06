import { useState } from 'react';
import Icon from './Icon';

// Only photos from these hosts are ever shown (the server checks too).
const ALLOWED = ['https://images.pexels.com/', 'https://images.unsplash.com/', 'https://images.openfoodfacts.org/', 'https://static.openfoodfacts.org/'];
export const isSafePhotoUrl = (url) => typeof url === 'string' && url.length < 500 && ALLOWED.some(p => url.startsWith(p));

const SITE = { pexels: 'Pexels', unsplash: 'Unsplash', openfoodfacts: 'Open Food Facts' };
const SITE_URL = {
  pexels: 'https://www.pexels.com',
  unsplash: 'https://unsplash.com/?utm_source=lifeos_health&utm_medium=referral',
  openfoodfacts: 'https://world.openfoodfacts.org',
};
const safeLink = (url) => typeof url === 'string' && /^https:\/\/(www\.pexels\.com|unsplash\.com|world\.openfoodfacts\.org)\//.test(url);

const creditText = (photo) => photo.source === 'openfoodfacts'
  ? 'Photo: Open Food Facts'
  : `Photo: ${photo.credit || SITE[photo.source] || 'stock'} on ${SITE[photo.source] || 'the web'}`;

// "Photo by <name> on Unsplash" with links, as the photo sites ask.
export function PhotoCredit({ photo }) {
  if (!photo || !isSafePhotoUrl(photo.url) || !SITE[photo.source]) return null;
  const site = <a href={SITE_URL[photo.source]} target="_blank" rel="noopener noreferrer">{SITE[photo.source]}</a>;
  if (photo.source === 'openfoodfacts') {
    return <p className="photo-credit">Package photo from {safeLink(photo.creditUrl)
      ? <a href={photo.creditUrl} target="_blank" rel="noopener noreferrer">Open Food Facts</a> : site}</p>;
  }
  return (
    <p className="photo-credit">
      Photo by {safeLink(photo.creditUrl)
        ? <a href={photo.creditUrl} target="_blank" rel="noopener noreferrer">{photo.credit || SITE[photo.source]}</a>
        : (photo.credit || SITE[photo.source])} on {site}
    </p>
  );
}

// Square food photo with a plate icon while it loads or when there is none.
// no-referrer: the photo host never learns which page of LifeOS asked for it.
export default function FoodThumb({ photo, size = 44, className = '' }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const ok = photo && isSafePhotoUrl(photo.url) && failedUrl !== photo.url;
  return (
    <span className={`food-thumb ${ok ? '' : 'is-empty'} ${className}`}
      style={{ width: size, height: size }} title={ok ? creditText(photo) : undefined}>
      {ok ? (
        <img src={photo.url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
          onError={() => setFailedUrl(photo.url)} />
      ) : (
        <Icon name="utensils" size={Math.round(size * 0.42)} />
      )}
    </span>
  );
}
