import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileBarChart,
  Download,
  Printer,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Zap,
  Droplet,
  Flame,
  CheckCircle2,
  Info,
  Clock,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { queryKeys } from '../../lib/queryKeys';
import { reportsApi, MonthlyReportResponse } from './reportsApi';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();

  // Default to current month YYYY-MM
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [activeReportMonth, setActiveReportMonth] = useState<string>(defaultMonth);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<MonthlyReportResponse>({
    queryKey: queryKeys.reports.monthly(activeReportMonth),
    queryFn: () => reportsApi.getMonthlyReport(activeReportMonth),
    enabled: Boolean(activeReportMonth),
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMonth) {
      setActiveReportMonth(selectedMonth);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      setIsDownloading(true);
      setDownloadError(null);
      await reportsApi.downloadMonthlyCsv(activeReportMonth);
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to download report CSV');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: string | null) => {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    return isNaN(num) ? '—' : `₹${num.toLocaleString('en-IN')}`;
  };

  const formatPercent = (val: string | null) => {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    if (isNaN(num)) return '—';
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
  };

  const formatNumber = (val: string | null, unit?: string) => {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    if (isNaN(num)) return '—';
    return `${num.toLocaleString('en-IN')}${unit ? ` ${unit}` : ''}`;
  };

  const getResourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'electricity':
        return <Zap size={16} color="var(--brand-primary)" />;
      case 'water':
        return <Droplet size={16} color="#3B82F6" />;
      case 'fuel':
        return <Flame size={16} color="#F97316" />;
      default:
        return <Info size={16} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top action bar - hidden during print */}
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Monthly Performance Reports</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Official operational summary, resource intensities, and action status
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={() => navigate('/app/dashboard')}
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Button>

          {report && (
            <>
              <Button
                variant="secondary"
                onClick={handlePrint}
              >
                <Printer size={16} />
                <span>Print / Save PDF</span>
              </Button>
              <Button
                variant="primary"
                onClick={handleDownloadCsv}
                isLoading={isDownloading}
              >
                <Download size={16} />
                <span>Download CSV</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Month Selection Bar - hidden during print */}
      <Card className="no-print" style={{ padding: 'var(--space-4)' }}>
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="report-month-input" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Select Calendar Month:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <Calendar size={15} color="var(--text-secondary)" />
              <input
                id="report-month-input"
                aria-label="Report calendar month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
              />
            </div>
            <Button type="submit" variant="primary" size="sm">
              Generate Report
            </Button>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Showing performance report for: <strong style={{ color: 'var(--text-primary)' }}>{activeReportMonth}</strong>
          </div>
        </form>

        {downloadError && (
          <div style={{ marginTop: '12px', color: 'var(--danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={15} />
            <span>{downloadError}</span>
          </div>
        )}
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <LoadingSkeleton height="350px" />
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Card>
          <ErrorState
            title="Failed to generate monthly report"
            message={error instanceof Error ? error.message : 'An unexpected error occurred while fetching report data.'}
            onRetry={() => refetch()}
          />
        </Card>
      )}

      {/* Printable Report Document */}
      {!isLoading && !isError && report && (
        <div id="synergyx-printable-report" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Header Card / Executive Document Banner */}
          <Card style={{ padding: 'var(--space-6)', borderLeft: '4px solid var(--brand-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {report.metadata.organization_name}
                  </h1>
                  <Badge variant={report.summary.has_missing_data ? 'warning' : 'success'}>
                    {report.summary.has_missing_data ? 'Partial Data Coverage' : 'Complete Record Set'}
                  </Badge>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span>Industry: <strong style={{ color: 'var(--text-primary)' }}>{report.metadata.industry}</strong></span>
                  {report.metadata.location && (
                    <span>Location: <strong style={{ color: 'var(--text-primary)' }}>{report.metadata.location}</strong></span>
                  )}
                  <span>Production Unit: <strong style={{ color: 'var(--text-primary)' }}>{report.metadata.production_unit}</strong></span>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div>Report Period: <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{report.metadata.report_month}</strong></div>
                <div>Generated: {new Date(report.metadata.generated_at).toLocaleString()}</div>
              </div>
            </div>

            {/* Non-certification Disclaimer Box (Section 5.10 & 16 invariant) */}
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              background: 'var(--bg-card-subtle)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <Info size={16} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
              <span>
                <strong>Operational Summary:</strong> Figures reflect user-submitted utility bills and recorded production volumes.
                This document is an internal operational resource report and is not an externally verified ESG audit report.
              </span>
            </div>
          </Card>

          {/* KPI Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            <Card style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Production Volume</div>
              <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>
                {formatNumber(report.summary.production_quantity, report.summary.production_unit)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Base volume for intensity normalization
              </div>
            </Card>

            <Card style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Utility Spend</div>
              <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--brand-primary)' }}>
                {formatCurrency(report.summary.total_spend_inr)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Coverage: {report.summary.spend_coverage}
              </div>
            </Card>

            <Card style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Active Actions</div>
              <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>
                {report.summary.active_actions_count}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Open actions in tracker
              </div>
            </Card>

            <Card style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Data Quality Status</div>
              <div style={{ fontSize: '16px', fontWeight: 700, margin: '12px 0 4px 0', color: report.summary.has_missing_data ? '#D97706' : '#16A34A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {report.summary.has_missing_data ? (
                  <>
                    <AlertTriangle size={18} />
                    <span>Incomplete Data</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Validated Complete</span>
                  </>
                )}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {report.summary.has_missing_data ? 'Missing production or utility bills' : 'All standard utilities recorded'}
              </div>
            </Card>
          </div>

          {/* Utilities & Intensity Table */}
          <Card style={{ padding: 'var(--space-5)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
              Resource Consumption & Production Intensities
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-default)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 12px' }}>Resource</th>
                    <th style={{ padding: '10px 12px' }}>Consumption</th>
                    <th style={{ padding: '10px 12px' }}>Spend (INR)</th>
                    <th style={{ padding: '10px 12px' }}>Production Intensity</th>
                    <th style={{ padding: '10px 12px' }}>MoM Qty Change</th>
                    <th style={{ padding: '10px 12px' }}>MoM Intensity Change</th>
                    <th style={{ padding: '10px 12px' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {report.utilities.map((u) => (
                    <tr key={u.resource_type} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getResourceIcon(u.resource_type)}
                          <span>{u.resource_type}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {formatNumber(u.quantity, u.unit)}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 500 }}>
                        {formatCurrency(u.spend_inr)}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--brand-primary)' }}>
                        {u.intensity !== null ? `${Number(u.intensity).toFixed(4)} ${u.intensity_unit}` : '—'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          color: u.mom_quantity_change_pct && Number(u.mom_quantity_change_pct) < 0 ? '#16A34A' : u.mom_quantity_change_pct && Number(u.mom_quantity_change_pct) > 0 ? '#DC2626' : 'inherit',
                          fontWeight: 500,
                        }}>
                          {formatPercent(u.mom_quantity_change_pct)}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          color: u.mom_intensity_change_pct && Number(u.mom_intensity_change_pct) < 0 ? '#16A34A' : u.mom_intensity_change_pct && Number(u.mom_intensity_change_pct) > 0 ? '#DC2626' : 'inherit',
                          fontWeight: 500,
                        }}>
                          {formatPercent(u.mom_intensity_change_pct)}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {u.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Active Insights & Recommendations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--space-4)' }}>
            {/* Insights Column */}
            <Card style={{ padding: 'var(--space-5)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileBarChart size={18} color="var(--brand-primary)" />
                <span>Active Period Insights ({report.insights.length})</span>
              </h3>

              {report.insights.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '16px 0' }}>
                  No automated insights were generated for this month.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {report.insights.map((ins, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-default)',
                        background: 'var(--bg-card-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {ins.title}
                        </span>
                        <Badge variant={ins.severity === 'high' ? 'danger' : ins.severity === 'medium' ? 'warning' : 'default'}>
                          {ins.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
                        {ins.description}
                      </p>
                      {ins.caveat && (
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                          * {ins.caveat}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recommendations & Action Tracker Summary */}
            <Card style={{ padding: 'var(--space-5)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="var(--brand-primary)" />
                <span>Recommendations & Actions</span>
              </h3>

              {report.recommendations.length === 0 && report.actions.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '16px 0' }}>
                  No recommendations or actions logged.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {report.recommendations.slice(0, 3).map((rec, idx) => (
                    <div
                      key={`rec-${idx}`}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-default)',
                        background: 'var(--bg-card-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{rec.title}</span>
                        <Badge variant="default">{rec.status}</Badge>
                      </div>
                      {rec.potential_saving_inr && (
                        <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
                          Est. Savings: {formatCurrency(rec.potential_saving_inr)}
                        </div>
                      )}
                      {rec.practical_action && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Step: {rec.practical_action}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Actions summary */}
                  {report.actions.slice(0, 3).map((act, idx) => (
                    <div
                      key={`act-${idx}`}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px dashed var(--border-default)',
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>Action:</strong> {act.title}
                        {act.due_date && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>Due: {act.due_date}</span>}
                      </div>
                      <Badge variant={act.status === 'completed' ? 'success' : act.status === 'in_progress' ? 'info' : 'default'}>
                        {act.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Data Quality Notes & Caveats */}
          <Card style={{ padding: 'var(--space-5)', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-default)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} />
              <span>Data Quality Notes & Comparison Limitations</span>
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {report.caveats.map((cav, idx) => (
                <li key={idx}>{cav}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && !report && (
        <Card>
          <EmptyState
            icon={<FileBarChart size={28} />}
            title="No Monthly Reports Generated"
            description="Select a calendar month above and click 'Generate Report' to synthesize utility totals, production intensity, and completed actions."
          />
        </Card>
      )}

      {/* Print Specific CSS Stylesheet */}
      <style>{`
        @media print {
          .no-print,
          nav,
          header,
          aside,
          button {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          #synergyx-printable-report {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
