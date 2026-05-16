import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Spinner from './Spinner';

describe('Spinner', () => {
  it('renders with role status for screen readers', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the label when provided', () => {
    render(<Spinner label="Loading user…" />);
    expect(screen.getByText('Loading user…')).toBeInTheDocument();
  });
});
