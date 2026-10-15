import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { AuthProvider } from './auth/AuthProvider';
import App from './App';

afterEach(() => cleanup());

describe('WorkTrack360 shell', () => {
  it('renders the accessible product brand and primary navigation', () => {
    render(<AuthProvider><App /></AuthProvider>);
    expect(screen.getByRole('link', { name: /worktrack360 home/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByText(/demo mode — dummy data only/i)).toBeInTheDocument();
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
    expect(screen.queryAllByText('Review quarterly validation issue')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(screen.getAllByText('Review quarterly validation issue').length).toBeGreaterThan(0);
  });

  it('filters by product and shows overdue labels using fictional records', () => {
    render(<AuthProvider><App /></AuthProvider>);
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by product' }), { target: { value: 'Orbit Compliance' } });
    expect(screen.getAllByText('Prepare customer demo walkthrough').length).toBeGreaterThan(0);
    expect(screen.queryByText('Review quarterly validation issue')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(screen.getAllByText('Review quarterly validation issue').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SLA overdue').length).toBeGreaterThan(0);
  });

  it('lets the demo admin add and remove configurable dropdown options', () => {
    render(<AuthProvider><App /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: /workspace settings/i }));
    expect(screen.getByRole('heading', { name: /workspace dropdowns/i })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /new products/i }), { target: { value: 'Demo Product X' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }).at(0)!);
    expect(screen.getByText('Demo Product X')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove demo product x/i }));
    expect(screen.queryByText('Demo Product X')).not.toBeInTheDocument();
    expect(screen.getByText(/demo-only settings/i)).toBeInTheDocument();
  });

});
