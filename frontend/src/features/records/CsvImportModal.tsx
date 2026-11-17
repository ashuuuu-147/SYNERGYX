import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, X, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { recordsImportApi, CsvImportResponse } from './recordsImportApi';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_CSV_TEMPLATE = `Month,Electricity (kWh),Electricity Bill (₹),Water (L),Water Bill (₹),Fuel (L),Fuel Bill (₹),Production
January,"4,820","43,380","38,500","1,925",620,"58,900","12,400"
February,"4,560","41,040","36,200","1,810",590,"56,050","11,850"
March,"5,190","46,710","41,000","2,050",675,"64,125","13,200"
April,"5,480","49,320","43,800","2,190",710,"67,450","13,950"
May,"5,310","47,790","42,100","2,105",690,"65,550","13,600"
`;

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvImportResponse | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'synergyx_monthly_records_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith('.csv')) {
        setError('Please select a valid CSV file (.csv)');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await recordsImportApi.importCsv(file, year);
      setResult(response);

      // Invalidate queries so dashboard, analytics, and records refresh immediately
      queryClient.invalidateQueries({ queryKey: ['utility-records'] });
      queryClient.invalidateQueries({ queryKey: ['production-records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    } catch (err: any) {
      setError(err?.message || 'Failed to import CSV file. Please verify column headers and values.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(41, 36, 59, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-default)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card style={{ border: 'none', padding: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--brand-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-600)',
                }}
              >
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Bulk Import Monthly Records
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Upload a CSV file containing monthly utility and production records
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X size={18} />
            </Button>
          </div>

          {/* Success State */}
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: 'var(--success-bg)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--success)',
                }}
              >
                <CheckCircle2 size={24} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>CSV Import Successful!</div>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>{result.message}</div>
                </div>
              </div>

              {/* Summary Stats */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  fontSize: '13px',
                }}
              >
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ color: 'var(--text-secondary)' }}>Utility Records Added / Updated</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {result.utility_records_created + result.utility_records_updated} entries
                  </div>
                </div>
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ color: 'var(--text-secondary)' }}>Production Records Added / Updated</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {result.production_records_created + result.production_records_updated} entries
                  </div>
                </div>
              </div>

              {/* Months breakdown */}
              {result.details && result.details.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Extracted Months Summary:
                  </h4>
                  <div
                    style={{
                      maxHeight: '160px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-default)' }}>
                        <tr>
                          <th style={{ padding: '6px 10px' }}>Month</th>
                          <th style={{ padding: '6px 10px' }}>Electricity</th>
                          <th style={{ padding: '6px 10px' }}>Water</th>
                          <th style={{ padding: '6px 10px' }}>Fuel</th>
                          <th style={{ padding: '6px 10px' }}>Production</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.details.map((d, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>{d.month}</td>
                            <td style={{ padding: '6px 10px' }}>{d.electricity_kwh ? `${d.electricity_kwh} kWh` : '—'}</td>
                            <td style={{ padding: '6px 10px' }}>{d.water_m3 ? `${d.water_m3} m³` : '—'}</td>
                            <td style={{ padding: '6px 10px' }}>{d.fuel_l ? `${d.fuel_l} L` : '—'}</td>
                            <td style={{ padding: '6px 10px' }}>{d.production || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <Button variant="primary" onClick={handleClose} style={{ alignSelf: 'flex-end', marginTop: '8px' }}>
                View Updated Records
              </Button>
            </div>
          ) : (
            /* Upload Form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Year & Template Options */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="csv-year-input" style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Target Year:
                  </label>
                  <input
                    id="csv-year-input"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    min={2000}
                    max={2050}
                    style={{
                      width: '80px',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-default)',
                      fontSize: '13px',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} style={{ gap: '6px' }}>
                  <Download size={14} />
                  <span>Download Sample Template</span>
                </Button>
              </div>

              {/* Upload Dropzone */}
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '28px 16px',
                  borderRadius: 'var(--radius-lg)',
                  border: '2px dashed var(--border-default)',
                  backgroundColor: file ? 'var(--brand-surface)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--brand-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary-600)',
                  }}
                >
                  <UploadCloud size={24} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {file ? file.name : 'Click to browse or drag and drop your CSV'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports columns for Month, Electricity, Water, Fuel, Production & Bills'}
                  </div>
                </div>
              </label>

              {/* Error Message */}
              {error && (
                <div
                  role="alert"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    fontSize: '13px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <Button variant="ghost" onClick={handleClose} disabled={isUploading}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  isLoading={isUploading}
                >
                  {isUploading ? 'Extracting & Importing...' : 'Import Records'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
