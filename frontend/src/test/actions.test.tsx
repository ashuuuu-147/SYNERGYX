import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ActionsPage } from '../features/actions/ActionsPage';
import { actionsApi, ActionResponse } from '../features/actions/actionsApi';

vi.mock('../features/actions/actionsApi', () => ({
  actionsApi: {
    listActions: vi.fn(),
    createAction: vi.fn(),
    updateAction: vi.fn(),
    deleteAction: vi.fn(),
  },
}));

describe('ActionsPage UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const mockActions: ActionResponse[] = [
    {
      id: 'act-1',
      organization_id: 'org-1',
      recommendation_id: 'rec-1',
      title: 'Fix Loom Shed Air Leaks',
      description: 'Replace worn couplings on compressor line 2',
      status: 'pending',
      due_date: '2026-06-15',
      completed_at: null,
      notes: 'Spares ordered from supplier',
      created_by: null,
      created_at: '2026-03-02T10:00:00Z',
      updated_at: '2026-03-02T10:00:00Z',
      recommendation_title: 'Inspect Air Compressor Leaks',
    },
    {
      id: 'act-2',
      organization_id: 'org-1',
      recommendation_id: null,
      title: 'Routine Boiler Descaling',
      description: 'Clean chemical deposit buildup on heating tubes',
      status: 'completed',
      due_date: '2026-02-28',
      completed_at: '2026-02-27T15:30:00Z',
      notes: 'Completed by maintenance contractor',
      created_by: null,
      created_at: '2026-02-01T10:00:00Z',
      updated_at: '2026-02-27T15:30:00Z',
      recommendation_title: null,
    },
  ];

  it('renders honest empty state when no actions exist', async () => {
    vi.mocked(actionsApi.listActions).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ActionsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('No Actions Found')).toBeInTheDocument();
  });

  it('renders populated action cards with title, description, notes, and recommendation link', async () => {
    vi.mocked(actionsApi.listActions).mockResolvedValue(mockActions);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ActionsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Fix Loom Shed Air Leaks')).toBeInTheDocument();
    expect(screen.getByText('Replace worn couplings on compressor line 2')).toBeInTheDocument();
    expect(screen.getByText('Routine Boiler Descaling')).toBeInTheDocument();
    expect(screen.getByText(/Origin: Inspect Air Compressor Leaks/i)).toBeInTheDocument();
    expect(screen.getByText(/Spares ordered from supplier/i)).toBeInTheDocument();
  });

  it('transitions action status to in_progress and completed', async () => {
    vi.mocked(actionsApi.listActions).mockResolvedValue(mockActions);
    vi.mocked(actionsApi.updateAction).mockResolvedValue({
      ...mockActions[0],
      status: 'in_progress',
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ActionsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    const startBtn = await screen.findByRole('button', { name: /start action/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(actionsApi.updateAction).toHaveBeenCalledWith('act-1', { status: 'in_progress' });
    });
  });

  it('opens drawer and submits new action', async () => {
    vi.mocked(actionsApi.listActions).mockResolvedValue(mockActions);
    vi.mocked(actionsApi.createAction).mockResolvedValue({
      id: 'act-3',
      organization_id: 'org-1',
      recommendation_id: null,
      title: 'Install Variable Frequency Drive',
      description: 'On exhaust blower fans',
      status: 'pending',
      due_date: '2026-07-01',
      completed_at: null,
      notes: null,
      created_by: null,
      created_at: '2026-03-05T10:00:00Z',
      updated_at: '2026-03-05T10:00:00Z',
      recommendation_title: null,
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ActionsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    const newBtn = await screen.findByRole('button', { name: /new action/i });
    fireEvent.click(newBtn);

    const titleInput = screen.getByPlaceholderText(/clean boiler heat exchangers/i);
    fireEvent.change(titleInput, { target: { value: 'Install Variable Frequency Drive' } });

    const saveBtn = screen.getByRole('button', { name: /^save action$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(actionsApi.createAction).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Install Variable Frequency Drive' })
      );
    });
  });

  it('deletes action upon confirmation', async () => {
    vi.mocked(actionsApi.listActions).mockResolvedValue(mockActions);
    vi.mocked(actionsApi.deleteAction).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ActionsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    await screen.findByText('Fix Loom Shed Air Leaks');

    // Click delete button
    const trashBtn = screen.getByLabelText(/delete fix loom shed air leaks/i);
    fireEvent.click(trashBtn);

    // Confirmation dialog appears
    expect(screen.getByText('Delete Action?')).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /confirm delete/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(actionsApi.deleteAction).toHaveBeenCalledWith('act-1');
    });
  });
});
