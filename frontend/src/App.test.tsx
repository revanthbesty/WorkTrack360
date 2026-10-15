import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('WorkTrack360 shell', () => {
  it('renders the product name and primary workspace navigation', () => {
    render(<App />);
    expect(screen.getByText('WorkTrack360')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
  });
});
