import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AuthProvider } from './auth/AuthProvider';
import App from './App';

describe('WorkTrack360 shell', () => {
  it('renders the accessible product brand and primary navigation', () => {
    render(<AuthProvider><App /></AuthProvider>);
    expect(screen.getByRole('link', { name: /worktrack360 home/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByText(/foundation preview/i)).toBeInTheDocument();
  });

  it('keeps persistent creation disabled until a trusted session exists', () => {
    render(<AuthProvider><App /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: /create work item/i }));
    const dialog = screen.getByRole('dialog', { name: /create a work item/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /create work item/i })).toBeDisabled();
    expect(within(dialog).getByText(/sign in and configure the api/i)).toBeInTheDocument();
  });
});
