import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { KpiCard } from '../components/ui/KpiCard';

describe('Design Tokens & Application Shell', () => {
  it('renders all 8 navigation targets in the sidebar', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Records')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Action Tracker')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders empty state dash for null KPI metric', () => {
    render(<KpiCard title="Electricity Used" value={null} unit="kWh" />);
    expect(screen.getByText('Electricity Used')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders numeric KPI value with tabular formatting and unit', () => {
    render(<KpiCard title="Water Used" value={500} unit="m³" />);
    expect(screen.getByText('Water Used')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('m³')).toBeInTheDocument();
  });
});
