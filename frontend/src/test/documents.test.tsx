import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentsTab } from '../features/records/DocumentsTab';
import { documentApi, DocumentItem } from '../features/records/documentApi';

vi.mock('../features/records/documentApi', () => ({
  documentApi: {
    getDocuments: vi.fn(),
    uploadDocument: vi.fn(),
    getDownloadUrl: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));

describe('DocumentsTab UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const mockDocuments: DocumentItem[] = [
    {
      id: 'doc-1',
      organization_id: 'org-1',
      storage_provider: 'local',
      storage_path: 'org-1/bill_may.pdf',
      original_filename: 'may_electricity_bill.pdf',
      mime_type: 'application/pdf',
      size_bytes: 1048576, // 1.0 MB
      uploaded_by: 'user-1',
      created_at: '2026-05-15T10:00:00Z',
      is_linked: false,
    },
    {
      id: 'doc-2',
      organization_id: 'org-1',
      storage_provider: 'local',
      storage_path: 'org-1/gas_june.png',
      original_filename: 'gas_meter_photo.png',
      mime_type: 'image/png',
      size_bytes: 524288, // 512 KB
      uploaded_by: 'user-1',
      created_at: '2026-06-15T10:00:00Z',
      is_linked: true,
    },
  ];

  it('renders empty state when no documents exist', async () => {
    vi.mocked(documentApi.getDocuments).mockResolvedValueOnce([]);

    render(
      <QueryClientProvider client={queryClient}>
        <DocumentsTab />
      </QueryClientProvider>
    );

    expect(await screen.findByText('No documents uploaded yet')).toBeInTheDocument();
  });

  it('renders document table with file details and status badges', async () => {
    vi.mocked(documentApi.getDocuments).mockResolvedValueOnce(mockDocuments);

    render(
      <QueryClientProvider client={queryClient}>
        <DocumentsTab />
      </QueryClientProvider>
    );

    expect(await screen.findByText('may_electricity_bill.pdf')).toBeInTheDocument();
    expect(screen.getByText('gas_meter_photo.png')).toBeInTheDocument();
    expect(screen.getByText('Unlinked')).toBeInTheDocument();
    expect(screen.getByText('Linked')).toBeInTheDocument();
  });

  it('handles download click and opens download URL', async () => {
    vi.mocked(documentApi.getDocuments).mockResolvedValueOnce(mockDocuments);
    vi.mocked(documentApi.getDownloadUrl).mockResolvedValueOnce({
      download_url: 'https://storage.synergyx.test/signed/doc-1',
      expires_in_seconds: 300,
      original_filename: 'may_electricity_bill.pdf',
    });

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <QueryClientProvider client={queryClient}>
        <DocumentsTab />
      </QueryClientProvider>
    );

    await screen.findByText('may_electricity_bill.pdf');

    const downloadButtons = screen.getAllByRole('button', { name: /download/i });
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(documentApi.getDownloadUrl).toHaveBeenCalledWith('doc-1');
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://storage.synergyx.test/signed/doc-1',
        '_blank',
        'noopener,noreferrer'
      );
    });

    windowOpenSpy.mockRestore();
  });

  it('blocks deletion of linked documents with warning message', async () => {
    vi.mocked(documentApi.getDocuments).mockResolvedValueOnce(mockDocuments);

    render(
      <QueryClientProvider client={queryClient}>
        <DocumentsTab />
      </QueryClientProvider>
    );

    await screen.findByText('gas_meter_photo.png');

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    // doc-2 is linked (second delete button)
    fireEvent.click(deleteButtons[1]);

    expect(
      screen.getByText(/cannot delete a document linked to a utility record/i)
    ).toBeInTheDocument();
    expect(documentApi.deleteDocument).not.toHaveBeenCalled();
  });

  it('deletes unlinked document upon confirmation', async () => {
    vi.mocked(documentApi.getDocuments).mockResolvedValueOnce(mockDocuments);
    vi.mocked(documentApi.deleteDocument).mockResolvedValueOnce();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <QueryClientProvider client={queryClient}>
        <DocumentsTab />
      </QueryClientProvider>
    );

    await screen.findByText('may_electricity_bill.pdf');

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    // doc-1 is unlinked (first delete button)
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(documentApi.deleteDocument).toHaveBeenCalledWith('doc-1');
    });

    confirmSpy.mockRestore();
  });
});
