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
    fireEvent.click(screen.getAllByRole('button', { name: /create work item/i })[0]);
    const dialog = screen.getByRole('dialog', { name: /create a work item/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /create work item/i })).toBeDisabled();
    expect(within(dialog).getByText(/sign in and configure the api/i)).toBeInTheDocument();
  });

  it('filters the work table by status without replacing the search query', () => {
    render(<AuthProvider><App /></AuthProvider>);
    fireEvent.click(screen.getAllByRole('button', { name: 'Needs review' }).at(-1)!);
    expect(screen.getAllByText('Prepare customer demo walkthrough').length).toBeGreaterThan(0);
    expect(screen.queryByText('Review quarterly validation issue')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(screen.getByText('Review quarterly validation issue')).toBeInTheDocument();
  });

});
