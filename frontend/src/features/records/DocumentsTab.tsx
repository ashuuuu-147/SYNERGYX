import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, Download, Trash2, RefreshCw, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { documentApi, DocumentItem } from './documentApi';
import { queryKeys } from '../../lib/queryKeys';
import { ApiError } from '../../lib/apiClient';

export const DocumentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const {
    data: documents,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<DocumentItem[]>({
    queryKey: queryKeys.documents.list(),
    queryFn: documentApi.getDocuments,
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => documentApi.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.list() });
      setSuccessMessage('Document deleted successfully.');
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: unknown) => {
      setSuccessMessage(null);
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to delete document.');
      }
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side quick size check
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 10 MB limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setUploadProgress(0);
      await documentApi.uploadDocument(file, (percent) => {
        setUploadProgress(percent);
      });
      setSuccessMessage(`"${file.name}" uploaded successfully.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.list() });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Upload failed. Please check file format and connection.');
      }
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    setErrorMessage(null);
    setDownloadingId(doc.id);
    try {
      const info = await documentApi.getDownloadUrl(doc.id);
      window.open(info.download_url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Could not generate download link.');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = (doc: DocumentItem) => {
    if (doc.is_linked) {
      setErrorMessage('Cannot delete a document linked to a utility record. Please unlink or delete the record first.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${doc.original_filename}"?`)) {
      deleteMutation.mutate(doc.id);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top action toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Utility Bill & Evidence Documents</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Privately store utility invoices and production logs (.pdf, .png, .jpg up to 10 MB)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh documents"
          >
            <RefreshCw size={16} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress !== null}
          >
            <UploadCloud size={16} />
            <span>Upload Document</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Progress notification */}
      {uploadProgress !== null && (
        <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
            <span>Uploading document...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--border-default)', borderRadius: '3px' }}>
            <div
              style={{
                width: `${uploadProgress}%`,
                height: '100%',
                background: 'var(--brand-primary)',
                borderRadius: '3px',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </Card>
      )}

      {/* Banners */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--success-bg)',
            color: 'var(--success)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Document table / content */}
      {isLoading ? (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <LoadingSkeleton height="36px" />
          <LoadingSkeleton height="36px" />
          <LoadingSkeleton height="36px" />
        </Card>
      ) : isError ? (
        <Card style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--danger)' }}>
          <p>{error instanceof Error ? error.message : 'Could not load documents.'}</p>
        </Card>
      ) : !documents || documents.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText size={28} />}
            title="No documents uploaded yet"
            description="Upload monthly utility bills and production evidence files to verify your sustainability figures."
            action={
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud size={16} />
                <span>Upload First Bill</span>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-card-subtle)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>File Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Uploaded Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Size</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Linked Record</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="var(--brand-primary)" />
                      <span>{doc.original_filename}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{formatDate(doc.created_at)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{doc.mime_type}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{formatFileSize(doc.size_bytes)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {doc.is_linked ? (
                      <Badge variant="success">Linked</Badge>
                    ) : (
                      <Badge variant="default">Unlinked</Badge>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                        title="Download / View document"
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc)}
                        disabled={deleteMutation.isPending}
                        title={doc.is_linked ? 'Cannot delete linked document' : 'Delete document'}
                        style={{ color: doc.is_linked ? 'var(--text-muted)' : 'var(--danger)' }}
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
