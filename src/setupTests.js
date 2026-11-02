// Adds DOM matchers such as toBeInTheDocument() to Vitest's expect, and
// unmounts each test's components afterwards so tests can't see each other.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
