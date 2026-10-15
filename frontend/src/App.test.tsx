import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from './auth/AuthProvider';
import App from './App';

describe('WorkTrack360 shell', () => {
  it('renders the accessible product brand and primary navigation', () => {
    render(<AuthProvider><App /></AuthProvider>);
    expect(screen.getByRole('link', { name: /worktrack360 home/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByText(/foundation preview/i)).toBeInTheDocument();
  });
});
