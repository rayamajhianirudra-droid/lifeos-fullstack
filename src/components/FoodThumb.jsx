import { useState } from 'react';
import Icon from './Icon';

// Only photos from these hosts are ever shown (the server checks too).
const ALLOWED = ['https://images.pexels.com/', 'https://images.openfoodfacts.org/', 'https://static.openfoodfacts.org/'];
export const isSafePhotoUrl = (url) => typeof url === 'string' && url.length < 500 && ALLOWED.some(p => url.startsWith(p));

const creditText = (photo) => photo.source === 'pexels'
  ? `Photo: ${photo.credit || 'Pexels'} on Pexels`
  : 'Photo: Open Food Facts';

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
