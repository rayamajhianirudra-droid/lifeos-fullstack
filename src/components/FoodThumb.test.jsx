import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FoodThumb, { isSafePhotoUrl, PhotoCredit } from './FoodThumb';

const pexels = { url: 'https://images.pexels.com/photos/1/a.jpeg?h=200', credit: 'Jane Doe', source: 'pexels' };

describe('FoodThumb', () => {
  it('shows the photo with credit and no referrer', () => {
    const { container } = render(<FoodThumb photo={pexels} />);
    const img = container.querySelector('img');
    expect(img.getAttribute('src')).toBe(pexels.url);
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(container.firstChild.getAttribute('title')).toBe('Photo: Jane Doe on Pexels');
  });

  it('shows the plate icon when there is no photo or it fails to load', () => {
    const { container, rerender } = render(<FoodThumb photo={null} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();

    rerender(<FoodThumb photo={pexels} />);
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('img')).toBeNull();
  });

  it('never renders a photo from an unknown host', () => {
    const { container } = render(<FoodThumb photo={{ url: 'https://evil.example/x.jpg', source: 'pexels' }} />);
    expect(container.querySelector('img')).toBeNull();
    expect(isSafePhotoUrl('javascript:alert(1)')).toBe(false);
    expect(isSafePhotoUrl('https://images.pexels.com.evil.example/x.jpg')).toBe(false);
    expect(isSafePhotoUrl('https://images.openfoodfacts.org/images/products/1/front.200.jpg')).toBe(true);
  });
});

describe('PhotoCredit', () => {
  it('credits the Unsplash photographer and Unsplash with referral links', () => {
    const photo = { url: 'https://images.unsplash.com/photo-1?ixid=a&w=400', credit: 'Ann Lee',
      creditUrl: 'https://unsplash.com/@ann?utm_source=lifeos_health&utm_medium=referral', source: 'unsplash' };
    const { container, getByText } = render(<PhotoCredit photo={photo} />);
    expect(container.textContent).toBe('Photo by Ann Lee on Unsplash');
    expect(getByText('Ann Lee').getAttribute('href')).toBe(photo.creditUrl);
    expect(getByText('Unsplash').getAttribute('href')).toContain('utm_source=lifeos_health');
    expect(getByText('Ann Lee').getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('never links somewhere unexpected', () => {
    const photo = { url: 'https://images.unsplash.com/p', credit: 'X', creditUrl: 'javascript:alert(1)', source: 'unsplash' };
    const { container } = render(<PhotoCredit photo={photo} />);
    expect(container.querySelectorAll('a')).toHaveLength(1);
    expect(container.querySelector('a').getAttribute('href')).toContain('https://unsplash.com/');
  });
});
