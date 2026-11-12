import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Calendar,
  RotateCcw,
  Zap,
  Droplets,
  Flame,
  IndianRupee,
  Layers,
  AlertTriangle,
  Info,
  TrendingUp,
} from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import {
  analyticsApi,
  AnalyticsResponse,
  MetricTypeFilter,
  ResourceTypeFilter,
} from './analyticsApi';
import { queryKeys } from '../../lib/queryKeys';

const RESOURCE_COLORS = {
  electricity: '#5b4cdb',
  water: '#0ea5e9',
  fuel: '#f59e0b',
  spend: '#10b981',
};

export const AnalyticsPage: React.FC = () => {
  const [fromMonth, setFromMonth] = useState<string>('');
  const [toMonth, setToMonth] = useState<string>('');
  const [resourceType, setResourceType] = useState<ResourceTypeFilter>('all');
  const [metric, setMetric] = useState<MetricTypeFilter>('consumption');
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

  // Range validation
  const dateError = useMemo(() => {
    if (fromMonth && toMonth && fromMonth > toMonth) {
      return 'Start month cannot be after end month.';
    }
    return null;
  }, [fromMonth, toMonth]);

  const queryParams = useMemo(() => ({
    from: fromMonth || undefined,
    to: toMonth || undefined,
    resource_type: resourceType,
    metric,
  }), [fromMonth, toMonth, resourceType, metric]);

  const {
    data: analytics,
    isLoading,
    isError,
    error,
  } = useQuery<AnalyticsResponse>({
    queryKey: queryKeys.analytics.series(queryParams),
    queryFn: () => analyticsApi.getAnalytics(queryParams),
    enabled: !dateError,
    placeholderData: (prev) => prev,
  });

  const handleResetFilters = () => {
    setFromMonth('');
    setToMonth('');
    setResourceType('all');
    setMetric('consumption');
    setHiddenSeries({});
  };

  const handleLegendClick = (dataKey: string) => {
    setHiddenSeries((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey],
    }));
  };

  // Prepare chart data objects
  const chartData = useMemo(() => {
    if (!analytics?.series) return [];
    return analytics.series.map((pt) => {
      const elecQty = pt.electricity?.quantity != null ? Number(pt.electricity.quantity) : null;
      const waterQty = pt.water?.quantity != null ? Number(pt.water.quantity) : null;
      const fuelQty = pt.fuel?.quantity != null ? Number(pt.fuel.quantity) : null;

      const elecInt = pt.electricity?.intensity != null ? Number(pt.electricity.intensity) : null;
      const waterInt = pt.water?.intensity != null ? Number(pt.water.intensity) : null;
      const fuelInt = pt.fuel?.intensity != null ? Number(pt.fuel.intensity) : null;

      const spend = pt.total_spend_inr != null ? Number(pt.total_spend_inr) : null;

      return {
        month: pt.month_str,
        electricityQty: elecQty,
        waterQty: waterQty,
        fuelQty: fuelQty,
        electricityIntensity: elecInt,
        waterIntensity: waterInt,
        fuelIntensity: fuelInt,
        spend: spend,
        isPartialSpend: pt.is_partial_spend,
        caveats: pt.caveats,
      };
    });
  }, [analytics]);

  const hasAnyData = useMemo(() => {
    if (!analytics?.series) return false;
    return analytics.series.some((pt) => pt.has_utility_data || pt.has_production_data);
  }, [analytics]);

  const prodUnit = analytics?.production_unit || 'kg';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Resource Analytics & Trends</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Historical multi-month resource performance, production intensity, and spend curves
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleResetFilters}>
          <RotateCcw size={14} />
          <span>Reset Filters</span>
        </Button>
      </div>

      {/* Filter Control Bar */}
      <Card style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Date range pickers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="analytics-from-month" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                From:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <Calendar size={14} color="var(--text-secondary)" />
                <input
                  id="analytics-from-month"
                  aria-label="Start month"
                  type="month"
                  value={fromMonth || (analytics?.from_month ?? '')}
                  onChange={(e) => setFromMonth(e.target.value)}
                  style={{ border: 'none', background: 'transparent', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="analytics-to-month" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                To:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <Calendar size={14} color="var(--text-secondary)" />
                <input
                  id="analytics-to-month"
                  aria-label="End month"
                  type="month"
                  value={toMonth || (analytics?.to_month ?? '')}
                  onChange={(e) => setToMonth(e.target.value)}
                  style={{ border: 'none', background: 'transparent', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* Metric Selector Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-card-subtle)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            {(['consumption', 'intensity', 'spend'] as MetricTypeFilter[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  backgroundColor: metric === m ? 'var(--brand-primary)' : 'transparent',
                  color: metric === m ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {m === 'consumption' ? 'Total Consumption' : m === 'intensity' ? 'Intensity' : 'Expenditure'}
              </button>
            ))}
          </div>

          {/* Resource Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label htmlFor="analytics-resource-filter" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Resource:
            </label>
            <select
              id="analytics-resource-filter"
              aria-label="Filter by resource type"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value as ResourceTypeFilter)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Resources</option>
              <option value="electricity">Electricity only</option>
              <option value="water">Water only</option>
              <option value="fuel">Fuel only</option>
            </select>
          </div>
        </div>

        {dateError && (
          <div style={{ marginTop: '12px', color: 'var(--danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={15} />
            <span>{dateError}</span>
          </div>
        )}
      </Card>

      {/* Data Quality / Limitations Notice */}
      {analytics && analytics.data_quality_notes.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
          <Info size={18} color="var(--brand-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Data Quality Disclosures:</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              {analytics.data_quality_notes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !analytics && (
        <Card style={{ padding: 'var(--space-8)' }}>
          <LoadingSkeleton height="350px" />
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Card style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--danger)' }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 12px' }} />
          <p>{error instanceof Error ? error.message : 'Could not load analytics data.'}</p>
        </Card>
      )}

      {/* Populated State or Honest Empty State */}
      {!isLoading && !isError && analytics && (
        <>
          {!hasAnyData ? (
            <Card>
              <EmptyState
                icon={<TrendingUp size={28} />}
                title="No Data in Selected Period"
                description={`There are no utility or production records found between ${analytics.from_month} and ${analytics.to_month}. Record data or expand the date range to see analytics.`}
              />
            </Card>
          ) : (
            <>
              {/* Aggregated Totals Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                <Card style={{ padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>
                    <Layers size={14} /> Total Production
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px' }}>
                    {analytics.totals.total_production != null ? `${Number(analytics.totals.total_production).toLocaleString()} ${prodUnit}` : '—'}
                  </div>
                </Card>

                {(resourceType === 'all' || resourceType === 'electricity') && (
                  <Card style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: RESOURCE_COLORS.electricity, fontSize: '12px', fontWeight: 600 }}>
                      <Zap size={14} /> Total Electricity
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px' }}>
                      {analytics.totals.total_electricity_kwh != null ? `${Number(analytics.totals.total_electricity_kwh).toLocaleString()} kWh` : '—'}
                    </div>
                    {analytics.totals.avg_electricity_intensity != null && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Avg: {Number(analytics.totals.avg_electricity_intensity).toFixed(4)} kWh/{prodUnit}
                      </div>
                    )}
                  </Card>
                )}

                {(resourceType === 'all' || resourceType === 'water') && (
                  <Card style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: RESOURCE_COLORS.water, fontSize: '12px', fontWeight: 600 }}>
                      <Droplets size={14} /> Total Water
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px' }}>
                      {analytics.totals.total_water_m3 != null ? `${Number(analytics.totals.total_water_m3).toLocaleString()} m³` : '—'}
                    </div>
                    {analytics.totals.avg_water_intensity != null && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Avg: {Number(analytics.totals.avg_water_intensity).toFixed(6)} m³/{prodUnit}
                      </div>
                    )}
                  </Card>
                )}

                {(resourceType === 'all' || resourceType === 'fuel') && (
                  <Card style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: RESOURCE_COLORS.fuel, fontSize: '12px', fontWeight: 600 }}>
                      <Flame size={14} /> Total Fuel
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px' }}>
                      {analytics.totals.total_fuel_l != null ? `${Number(analytics.totals.total_fuel_l).toLocaleString()} L` : '—'}
                    </div>
                    {analytics.totals.avg_fuel_intensity != null && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Avg: {Number(analytics.totals.avg_fuel_intensity).toFixed(4)} L/{prodUnit}
                      </div>
                    )}
                  </Card>
                )}

                <Card style={{ padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: RESOURCE_COLORS.spend, fontSize: '12px', fontWeight: 600 }}>
                    <IndianRupee size={14} /> Total Utility Spend
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px' }}>
                    {analytics.totals.total_spend_inr != null ? `₹${Number(analytics.totals.total_spend_inr).toLocaleString()}` : '—'}
                  </div>
                </Card>
              </div>

              {/* Main Visualization Card */}
              <Card style={{ padding: 'var(--space-6)' }}>
                <div style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
                    {metric === 'consumption'
                      ? 'Monthly Consumption Curves'
                      : metric === 'intensity'
                      ? `Normalized Production Intensity (${prodUnit})`
                      : 'Monthly Utility Expenditure (INR)'}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    * Preserves gaps for unrecorded months
                  </span>
                </div>

                <div style={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {metric === 'spend' ? (
                      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                        <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
                        <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(val) => `₹${val.toLocaleString()}`} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '13px', boxShadow: 'var(--shadow-md)' }}>
                                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>{label}</div>
                                  <div>Spend: {d.spend != null ? `₹${d.spend.toLocaleString()}` : '—'}</div>
                                  {d.isPartialSpend && <div style={{ color: 'var(--warning)', fontSize: '11px', marginTop: '4px' }}>⚠️ Incomplete cost data</div>}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <Bar name="Utility Spend (INR)" dataKey="spend" fill={RESOURCE_COLORS.spend} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : metric === 'consumption' ? (
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                        <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
                        <YAxis stroke="var(--text-secondary)" fontSize={12} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '13px', boxShadow: 'var(--shadow-md)' }}>
                                  <div style={{ fontWeight: 700, marginBottom: '6px' }}>{label}</div>
                                  {(resourceType === 'all' || resourceType === 'electricity') && (
                                    <div style={{ color: RESOURCE_COLORS.electricity }}>Electricity: {d.electricityQty != null ? `${d.electricityQty.toLocaleString()} kWh` : '—'}</div>
                                  )}
                                  {(resourceType === 'all' || resourceType === 'water') && (
                                    <div style={{ color: RESOURCE_COLORS.water }}>Water: {d.waterQty != null ? `${d.waterQty.toLocaleString()} m³` : '—'}</div>
                                  )}
                                  {(resourceType === 'all' || resourceType === 'fuel') && (
                                    <div style={{ color: RESOURCE_COLORS.fuel }}>Fuel: {d.fuelQty != null ? `${d.fuelQty.toLocaleString()} L` : '—'}</div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend onClick={(e) => handleLegendClick(e.dataKey as string)} wrapperStyle={{ cursor: 'pointer' }} />
                        {(resourceType === 'all' || resourceType === 'electricity') && (
                          <Line
                            name="Electricity (kWh)"
                            type="monotone"
                            dataKey="electricityQty"
                            stroke={RESOURCE_COLORS.electricity}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            connectNulls={false}
                            hide={hiddenSeries['electricityQty']}
                          />
                        )}
                        {(resourceType === 'all' || resourceType === 'water') && (
                          <Line
                            name="Water (m³)"
                            type="monotone"
                            dataKey="waterQty"
                            stroke={RESOURCE_COLORS.water}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            connectNulls={false}
                            hide={hiddenSeries['waterQty']}
                          />
                        )}
                        {(resourceType === 'all' || resourceType === 'fuel') && (
                          <Line
                            name="Fuel (L)"
                            type="monotone"
                            dataKey="fuelQty"
                            stroke={RESOURCE_COLORS.fuel}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            connectNulls={false}
                            hide={hiddenSeries['fuelQty']}
                          />
                        )}
                      </LineChart>
                    ) : (
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                        <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
                        <YAxis stroke="var(--text-secondary)" fontSize={12} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '13px', boxShadow: 'var(--shadow-md)' }}>
                                  <div style={{ fontWeight: 700, marginBottom: '6px' }}>{label}</div>
                                  {(resourceType === 'all' || resourceType === 'electricity') && (
                                    <div style={{ color: RESOURCE_COLORS.electricity }}>Electricity Intensity: {d.electricityIntensity != null ? `${d.electricityIntensity.toFixed(4)} kWh/${prodUnit}` : '— (No production)'}</div>
                                  )}
                                  {(resourceType === 'all' || resourceType === 'water') && (
                                    <div style={{ color: RESOURCE_COLORS.water }}>Water Intensity: {d.waterIntensity != null ? `${d.waterIntensity.toFixed(6)} m³/${prodUnit}` : '— (No production)'}</div>
                                  )}
                                  {(resourceType === 'all' || resourceType === 'fuel') && (
                                    <div style={{ color: RESOURCE_COLORS.fuel }}>Fuel Intensity: {d.fuelIntensity != null ? `${d.fuelIntensity.toFixed(4)} L/${prodUnit}` : '— (No production)'}</div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend onClick={(e) => handleLegendClick(e.dataKey as string)} wrapperStyle={{ cursor: 'pointer' }} />
                        {(resourceType === 'all' || resourceType === 'electricity') && (
                          <Line
                            name={`Electricity (${prodUnit})`}
                            type="monotone"
                            dataKey="electricityIntensity"
                            stroke={RESOURCE_COLORS.electricity}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            connectNulls={false}
                            hide={hiddenSeries['electricityIntensity']}
                          />
                        )}
                        {(resourceType === 'all' || resourceType === 'water') && (
                          <Line
                            name={`Water (${prodUnit})`}
                            type="monotone"
                            dataKey="waterIntensity"
                            stroke={RESOURCE_COLORS.water}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            connectNulls={false}
                            hide={hiddenSeries['waterIntensity']}
                          />
                        )}
                        {(resourceType === 'all' || resourceType === 'fuel') && (
                          <Line
                            name={`Fuel (${prodUnit})`}
                            type="monotone"
                            dataKey="fuelIntensity"
                            stroke={RESOURCE_COLORS.fuel}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            connectNulls={false}
                            hide={hiddenSeries['fuelIntensity']}
                          />
                        )}
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Summary Table Card */}
              <Card style={{ padding: 'var(--space-6)', overflowX: 'auto' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                  Monthly Resource Performance Summary
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px 12px' }}>Month</th>
                      <th style={{ padding: '8px 12px' }}>Production</th>
                      <th style={{ padding: '8px 12px' }}>Electricity</th>
                      <th style={{ padding: '8px 12px' }}>Water</th>
                      <th style={{ padding: '8px 12px' }}>Fuel</th>
                      <th style={{ padding: '8px 12px' }}>Total Spend</th>
                      <th style={{ padding: '8px 12px' }}>Notes / Gaps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.summary_table.map((row) => (
                      <tr key={row.month} style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.month}</td>
                        <td style={{ padding: '10px 12px' }}>{row.production_display}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div>{row.electricity_qty_display}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {row.electricity_intensity_display !== '—' ? row.electricity_intensity_display : ''}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div>{row.water_qty_display}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {row.water_intensity_display !== '—' ? row.water_intensity_display : ''}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div>{row.fuel_qty_display}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {row.fuel_intensity_display !== '—' ? row.fuel_intensity_display : ''}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div>{row.total_spend_display}</div>
                          {row.is_partial_spend && (
                            <span style={{ fontSize: '11px', color: 'var(--warning)' }}>Partial</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {row.caveats.length > 0 ? (
                            <Badge variant="warning">{row.caveats[0]}</Badge>
                          ) : (
                            <Badge variant="success">Complete</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};
