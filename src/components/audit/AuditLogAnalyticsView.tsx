import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Filter,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  FolderOpen,
  Building2,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Clock,
  ShieldCheck,
  Package,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  StockItem,
  MovementLogEntry,
  Department,
  AdjustmentReasonCode,
  MovementType,
} from '../../types';

interface AuditLogAnalyticsViewProps {
  movementLogs?: MovementLogEntry[];
  stockItems?: StockItem[];
  departments?: Department[];
  onOpenMovementDocument?: (log: MovementLogEntry) => void;
}

export interface DailyDataPoint {
  date: Date;
  dateStr: string;
  issues: number;
  adjustments: number;
  deliveries: number;
  net: number;
}

export interface ReasonDataPoint {
  code: string;
  label: string;
  count: number;
  totalQty: number;
  color: string;
}

export interface DeptConsumptionDataPoint {
  deptName: string;
  units: number;
  reqCount: number;
  color: string;
}

type DatePreset = '7d' | '30d' | '90d' | 'ytd' | 'all' | 'custom';

export const AuditLogAnalyticsView: React.FC<AuditLogAnalyticsViewProps> = ({
  movementLogs = [],
  stockItems = [],
  departments = [],
  onOpenMovementDocument,
}) => {
  const safeMovementLogs = Array.isArray(movementLogs) ? movementLogs : [];
  const safeStockItems = Array.isArray(stockItems) ? stockItems : [];
  const safeDepartments = Array.isArray(departments) ? departments : [];
  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('90d');
  const [startDate, setStartDate] = useState<string>('2026-05-01');
  const [endDate, setEndDate] = useState<string>('2026-08-20');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChartTab, setActiveChartTab] = useState<'trends' | 'reasons' | 'departments' | 'netFlow'>('trends');
  const [sortField, setSortField] = useState<'Timestamp' | 'Qty' | 'ItemName' | 'Type'>('Timestamp');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // D3 Chart Refs
  const timelineSvgRef = useRef<SVGSVGElement | null>(null);
  const reasonsSvgRef = useRef<SVGSVGElement | null>(null);
  const deptSvgRef = useRef<SVGSVGElement | null>(null);
  const netFlowSvgRef = useRef<SVGSVGElement | null>(null);

  // Tooltip State for D3 Charts
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    title: string;
    items: { label: string; value: string | number; color?: string }[];
  }>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    items: [],
  });

  // Handle Preset Date Changes
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date('2026-08-20T23:59:59'); // Anchor date aligned with dataset

    if (preset === '7d') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '30d') {
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '90d') {
      const past = new Date(now);
      past.setDate(past.getDate() - 90);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'ytd') {
      setStartDate('2026-01-01');
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setStartDate('2026-01-01');
      setEndDate('2026-12-31');
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return safeMovementLogs.filter((log) => {
      if (!log) return false;
      // Date Filter
      const logDateStr = (log.Timestamp || '').split(' ')[0];
      if (startDate && logDateStr < startDate) return false;
      if (endDate && logDateStr > endDate) return false;

      // Type Filter
      if (selectedType !== 'ALL' && log.Type !== selectedType) return false;

      // Dept Filter
      if (selectedDept !== 'ALL') {
        if (log.DeptID !== selectedDept && log.DeptName !== selectedDept) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchItem = (log.ItemName || '').toLowerCase().includes(query);
        const matchRef = (log.DocumentRef || '').toLowerCase().includes(query);
        const matchReason = (log.DiscrepancyReason || log.AdjustmentReason || '').toLowerCase().includes(query);
        const matchIssuer = (log.IssuerName || log.IssuerID || '').toLowerCase().includes(query);
        const matchDept = (log.DeptName || '').toLowerCase().includes(query);
        if (!matchItem && !matchRef && !matchReason && !matchIssuer && !matchDept) {
          return false;
        }
      }

      return true;
    });
  }, [safeMovementLogs, startDate, endDate, selectedType, selectedDept, searchQuery]);

  // Sorted Logs
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'Timestamp') {
        valA = new Date(a.Timestamp).getTime();
        valB = new Date(b.Timestamp).getTime();
      } else if (sortField === 'Qty') {
        valA = Math.abs(a.Qty);
        valB = Math.abs(b.Qty);
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredLogs, sortField, sortAsc]);

  // Analytics Metrics Aggregation
  const metrics = useMemo(() => {
    let totalIssuesUnits = 0;
    let issuesCount = 0;
    let totalAdjustmentUnits = 0; // Net variance
    let totalAbsDiscrepancyUnits = 0;
    let adjustmentsCount = 0;
    let deliveriesUnits = 0;
    let deliveriesCount = 0;
    let damagedCount = 0;
    let discrepancyCount = 0;

    filteredLogs.forEach((log) => {
      if (log.Type === 'ISSUE') {
        totalIssuesUnits += log.Qty;
        issuesCount++;
      } else if (log.Type === 'ADJUSTMENT') {
        totalAdjustmentUnits += log.Qty;
        totalAbsDiscrepancyUnits += Math.abs(log.Qty);
        adjustmentsCount++;
        if (log.AdjustmentReason === 'DAMAGED_STOCK') damagedCount++;
        if (log.AdjustmentReason === 'COUNT_DISCREPANCY') discrepancyCount++;
      } else if (log.Type === 'DELIVERY') {
        deliveriesUnits += log.Qty;
        deliveriesCount++;
      }
    });

    const netStockFlow = deliveriesUnits + totalAdjustmentUnits - totalIssuesUnits;
    const accuracyRate =
      totalIssuesUnits + deliveriesUnits > 0
        ? Math.max(0, 100 - (totalAbsDiscrepancyUnits / (totalIssuesUnits + deliveriesUnits)) * 100)
        : 100;

    return {
      totalIssuesUnits,
      issuesCount,
      totalAdjustmentUnits,
      totalAbsDiscrepancyUnits,
      adjustmentsCount,
      deliveriesUnits,
      deliveriesCount,
      damagedCount,
      discrepancyCount,
      netStockFlow,
      accuracyRate: accuracyRate.toFixed(1),
    };
  }, [filteredLogs]);

  // Grouped Data by Date for D3 Timeline
  const dailyTimelineData = useMemo(() => {
    const map = new Map<string, { date: Date; dateStr: string; issues: number; adjustments: number; deliveries: number; net: number }>();

    // Seed dates in range
    const start = new Date(startDate || '2026-05-01');
    const end = new Date(endDate || '2026-08-20');
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      map.set(dateStr, {
        date: new Date(current),
        dateStr,
        issues: 0,
        adjustments: 0,
        deliveries: 0,
        net: 0,
      });
      current.setDate(current.getDate() + 1);
    }

    filteredLogs.forEach((log) => {
      const dateStr = log.Timestamp.split(' ')[0];
      if (map.has(dateStr)) {
        const item = map.get(dateStr)!;
        if (log.Type === 'ISSUE') {
          item.issues += log.Qty;
        } else if (log.Type === 'ADJUSTMENT') {
          item.adjustments += Math.abs(log.Qty);
        } else if (log.Type === 'DELIVERY') {
          item.deliveries += log.Qty;
        }
        item.net = item.deliveries + (log.Type === 'ADJUSTMENT' ? log.Qty : 0) - item.issues;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredLogs, startDate, endDate]);

  // Grouped Adjustment Reasons Data
  const adjustmentReasonsData = useMemo(() => {
    const reasonsMap: Record<string, { label: string; count: number; totalQty: number; color: string }> = {
      DAMAGED_STOCK: { label: 'Damaged in Storage / Transit', count: 0, totalQty: 0, color: '#f43f5e' },
      COUNT_DISCREPANCY: { label: 'Physical Count Discrepancy', count: 0, totalQty: 0, color: '#f59e0b' },
      EXPIRED_OBSOLETE: { label: 'Expired / Obsolete Batch', count: 0, totalQty: 0, color: '#8b5cf6' },
      FOUND_STOCK: { label: 'Found Surplus Inventory', count: 0, totalQty: 0, color: '#10b981' },
      AUDIT_CORRECTION: { label: 'Audit / Debit Correction', count: 0, totalQty: 0, color: '#0ea5e9' },
    };

    filteredLogs
      .filter((log) => log.Type === 'ADJUSTMENT')
      .forEach((log) => {
        const code = (log.AdjustmentReason as AdjustmentReasonCode) || 'COUNT_DISCREPANCY';
        if (reasonsMap[code]) {
          reasonsMap[code].count++;
          reasonsMap[code].totalQty += Math.abs(log.Qty);
        } else {
          reasonsMap['COUNT_DISCREPANCY'].count++;
          reasonsMap['COUNT_DISCREPANCY'].totalQty += Math.abs(log.Qty);
        }
      });

    return Object.entries(reasonsMap)
      .map(([key, data]) => ({ code: key, ...data }))
      .filter((d) => d.count > 0 || d.totalQty > 0);
  }, [filteredLogs]);

  // Grouped Department Issue Consumption Data
  const departmentConsumptionData = useMemo(() => {
    const deptMap: Record<string, { deptName: string; units: number; reqCount: number; color: string }> = {};

    safeDepartments.forEach((d, idx) => {
      const colors = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#10b981'];
      deptMap[d.DeptName] = {
        deptName: d.DeptName,
        units: 0,
        reqCount: 0,
        color: colors[idx % colors.length],
      };
    });

    filteredLogs
      .filter((l) => l.Type === 'ISSUE')
      .forEach((l) => {
        const dName = l.DeptName || 'Other';
        if (!deptMap[dName]) {
          deptMap[dName] = { deptName: dName, units: 0, reqCount: 0, color: '#64748b' };
        }
        deptMap[dName].units += l.Qty;
        deptMap[dName].reqCount++;
      });

    return Object.values(deptMap).sort((a, b) => b.units - a.units);
  }, [filteredLogs, safeDepartments]);

  // ==========================================
  // D3 RENDERING: CHART 1 — TIMELINE & AREA TRENDS
  // ==========================================
  useEffect(() => {
    if (!timelineSvgRef.current || dailyTimelineData.length === 0) return;

    const svg = d3.select(timelineSvgRef.current);
    svg.selectAll('*').remove();

    const container = timelineSvgRef.current.parentElement;
    const width = container ? container.clientWidth : 800;
    const height = 280;
    const margin = { top: 25, right: 30, bottom: 40, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(dailyTimelineData, (d: DailyDataPoint) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const maxIssues = Number(d3.max(dailyTimelineData, (d: DailyDataPoint) => d.issues)) || 10;
    const maxAdjustments = Number(d3.max(dailyTimelineData, (d: DailyDataPoint) => d.adjustments)) || 5;
    const maxDeliveries = Number(d3.max(dailyTimelineData, (d: DailyDataPoint) => d.deliveries)) || 20;
    const maxY = Math.max(maxIssues, maxAdjustments, maxDeliveries, 15) * 1.15;

    const yScale = d3.scaleLinear().domain([0, maxY]).nice().range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid-lines')
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.08)
      .attr('stroke-dasharray', '3,3');

    g.select('.domain').remove();

    // Defs Gradients
    const defs = svg.append('defs');

    // Issues Gradient (Emerald)
    const issuesGrad = defs
      .append('linearGradient')
      .attr('id', 'issues-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    issuesGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.45);
    issuesGrad.append('stop').attr('offset', '100%').attr('stop-color', '#10b981').attr('stop-opacity', 0.02);

    // Adjustments Gradient (Amber/Rose)
    const adjGrad = defs
      .append('linearGradient')
      .attr('id', 'adj-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    adjGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.45);
    adjGrad.append('stop').attr('offset', '100%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.02);

    // Deliveries Gradient (Blue)
    const delivGrad = defs
      .append('linearGradient')
      .attr('id', 'deliv-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    delivGrad.append('stop').attr('offset', '0%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0.35);
    delivGrad.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0.01);

    // D3 Area & Line Generators
    const issuesArea = d3
      .area<{ date: Date; issues: number }>()
      .curve(d3.curveMonotoneX)
      .x((d) => xScale(d.date))
      .y0(innerHeight)
      .y1((d) => yScale(d.issues));

    const issuesLine = d3
      .line<{ date: Date; issues: number }>()
      .curve(d3.curveMonotoneX)
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.issues));

    const adjArea = d3
      .area<{ date: Date; adjustments: number }>()
      .curve(d3.curveMonotoneX)
      .x((d) => xScale(d.date))
      .y0(innerHeight)
      .y1((d) => yScale(d.adjustments));

    const adjLine = d3
      .line<{ date: Date; adjustments: number }>()
      .curve(d3.curveMonotoneX)
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.adjustments));

    const delivLine = d3
      .line<{ date: Date; deliveries: number }>()
      .curve(d3.curveMonotoneX)
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.deliveries));

    // Draw Deliveries
    g.append('path')
      .datum(dailyTimelineData)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 1.8)
      .attr('stroke-dasharray', '4,3')
      .attr('stroke-opacity', 0.7)
      .attr('d', delivLine as any);

    // Draw Issues Area & Line
    g.append('path').datum(dailyTimelineData).attr('fill', 'url(#issues-gradient)').attr('d', issuesArea as any);

    g.append('path')
      .datum(dailyTimelineData)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2.5)
      .attr('d', issuesLine as any);

    // Draw Adjustments Area & Line
    g.append('path').datum(dailyTimelineData).attr('fill', 'url(#adj-gradient)').attr('d', adjArea as any);

    g.append('path')
      .datum(dailyTimelineData)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2.5)
      .attr('d', adjLine as any);

    // Draw Data Point Circles on peaks/active points
    dailyTimelineData.forEach((d) => {
      if (d.issues > 0) {
        g.append('circle')
          .attr('cx', xScale(d.date))
          .attr('cy', yScale(d.issues))
          .attr('r', 3.5)
          .attr('fill', '#10b981')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5);
      }
      if (d.adjustments > 0) {
        g.append('circle')
          .attr('cx', xScale(d.date))
          .attr('cy', yScale(d.adjustments))
          .attr('r', 3.5)
          .attr('fill', '#f59e0b')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5);
      }
      if (d.deliveries > 0) {
        g.append('rect')
          .attr('x', xScale(d.date) - 3)
          .attr('y', yScale(d.deliveries) - 3)
          .attr('width', 6)
          .attr('height', 6)
          .attr('fill', '#3b82f6')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
      }
    });

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(dailyTimelineData.length, 8))
      .tickFormat(d3.timeFormat('%b %d') as any);

    const yAxis = d3.axisLeft(yScale).ticks(5);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('class', 'text-[11px] font-mono fill-slate-500 dark:fill-slate-400');

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('class', 'text-[11px] font-mono fill-slate-500 dark:fill-slate-400');

    // Interactive Overlay Guide
    const crosshair = g
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .style('opacity', 0);

    const overlay = g
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    overlay
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const hoveredDate = xScale.invert(mx);
        // Find nearest item
        const bisect = d3.bisector((d: any) => d.date).center;
        const index = bisect(dailyTimelineData, hoveredDate);
        const d = dailyTimelineData[index];

        if (d) {
          crosshair.attr('x1', xScale(d.date)).attr('x2', xScale(d.date)).style('opacity', 1);

          setTooltipData({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            title: d3.timeFormat('%A, %B %d, %Y')(d.date),
            items: [
              { label: 'Stock Issues Out', value: `${d.issues} Units`, color: '#10b981' },
              { label: 'Stock Adjustments', value: `${d.adjustments} Units`, color: '#f59e0b' },
              { label: 'Inbound Deliveries', value: `${d.deliveries} Units`, color: '#3b82f6' },
              { label: 'Daily Net Delta', value: `${d.net > 0 ? '+' : ''}${d.net} Units`, color: '#64748b' },
            ],
          });
        }
      })
      .on('mouseleave', () => {
        crosshair.style('opacity', 0);
        setTooltipData((prev) => ({ ...prev, visible: false }));
      });
  }, [dailyTimelineData]);

  // ==========================================
  // D3 RENDERING: CHART 2 — ADJUSTMENT REASONS DONUT
  // ==========================================
  useEffect(() => {
    if (!reasonsSvgRef.current || adjustmentReasonsData.length === 0) return;

    const svg = d3.select(reasonsSvgRef.current);
    svg.selectAll('*').remove();

    const container = reasonsSvgRef.current.parentElement;
    const width = container ? container.clientWidth : 340;
    const height = 240;
    const radius = Math.min(width, height) / 2 - 20;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

    const pie = d3
      .pie<ReasonDataPoint>()
      .value((d) => d.totalQty)
      .sort(null);

    const arc = d3
      .arc<d3.PieArcDatum<ReasonDataPoint>>()
      .innerRadius(radius * 0.58)
      .outerRadius(radius);

    const hoverArc = d3
      .arc<d3.PieArcDatum<ReasonDataPoint>>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius + 6);

    const arcs = g.selectAll('.arc').data(pie(adjustmentReasonsData)).enter().append('g').attr('class', 'arc');

    arcs
      .append('path')
      .attr('d', arc)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(150).attr('d', hoverArc);
        setTooltipData({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          title: d.data.label,
          items: [
            { label: 'Affected Volume', value: `${d.data.totalQty} Units`, color: d.data.color },
            { label: 'Incident Count', value: `${d.data.count} Occurrences` },
            {
              label: 'Share of Adjustments',
              value: `${((d.data.totalQty / (d3.sum(adjustmentReasonsData, (x: ReasonDataPoint) => x.totalQty) || 1)) * 100).toFixed(1)}%`,
            },
          ],
        });
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(150).attr('d', arc);
        setTooltipData((prev) => ({ ...prev, visible: false }));
      });

    // Center Total
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('class', 'text-xl font-bold fill-slate-800 dark:fill-slate-100 font-mono')
      .text(metrics.totalAbsDiscrepancyUnits);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.3em')
      .attr('class', 'text-[10px] font-bold uppercase fill-slate-500 dark:fill-slate-400 font-sans')
      .text('Adj Units');
  }, [adjustmentReasonsData, metrics]);

  // ==========================================
  // D3 RENDERING: CHART 3 — DEPARTMENT CONSUMPTION BARS
  // ==========================================
  useEffect(() => {
    if (!deptSvgRef.current || departmentConsumptionData.length === 0) return;

    const svg = d3.select(deptSvgRef.current);
    svg.selectAll('*').remove();

    const container = deptSvgRef.current.parentElement;
    const width = container ? container.clientWidth : 340;
    const height = 240;
    const margin = { top: 15, right: 35, bottom: 25, left: 110 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const topDepts = departmentConsumptionData.slice(0, 6);

    const yScale = d3
      .scaleBand()
      .domain(topDepts.map((d: DeptConsumptionDataPoint) => d.deptName))
      .range([0, innerHeight])
      .padding(0.3);

    const maxUnits = Number(d3.max(topDepts, (d: DeptConsumptionDataPoint) => d.units)) || 10;
    const xScale = d3.scaleLinear().domain([0, maxUnits]).nice().range([0, innerWidth]);

    // Bars
    g.selectAll('.bar')
      .data(topDepts)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('y', (d: DeptConsumptionDataPoint) => yScale(d.deptName) || 0)
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', (d: DeptConsumptionDataPoint) => xScale(d.units))
      .attr('rx', 4)
      .attr('fill', (d: DeptConsumptionDataPoint) => d.color)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d: DeptConsumptionDataPoint) => {
        setTooltipData({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          title: d.deptName,
          items: [
            { label: 'Requisition Volume', value: `${d.units} Units`, color: d.color },
            { label: 'Requisitions Count', value: `${d.reqCount} Orders` },
          ],
        });
      })
      .on('mouseleave', () => {
        setTooltipData((prev) => ({ ...prev, visible: false }));
      });

    // Bar Value Labels
    g.selectAll('.bar-label')
      .data(topDepts)
      .enter()
      .append('text')
      .attr('y', (d: DeptConsumptionDataPoint) => (yScale(d.deptName) || 0) + yScale.bandwidth() / 2 + 4)
      .attr('x', (d: DeptConsumptionDataPoint) => xScale(d.units) + 6)
      .attr('class', 'text-[10px] font-mono font-bold fill-slate-700 dark:fill-slate-300')
      .text((d: DeptConsumptionDataPoint) => d.units);

    // Y Axis (Department names)
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .attr('class', 'text-[10px] font-medium fill-slate-700 dark:fill-slate-300')
      .style('text-anchor', 'end');

    g.select('.domain').remove();
    g.selectAll('.tick line').remove();
  }, [departmentConsumptionData]);

  // CSV Export Handler
  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Type', 'DocumentRef', 'ItemID', 'ItemName', 'Qty', 'DeptID', 'DeptName', 'IssuerName', 'Status', 'Reason'];
    const rows = filteredLogs.map((l) => [
      `"${l.Timestamp}"`,
      `"${l.Type}"`,
      `"${l.DocumentRef || ''}"`,
      `"${l.ItemID}"`,
      `"${l.ItemName}"`,
      l.Qty,
      `"${l.DeptID}"`,
      `"${l.DeptName}"`,
      `"${l.IssuerName || l.IssuerID}"`,
      `"${l.Status}"`,
      `"${l.DiscrepancyReason || l.AdjustmentReason || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Paramount_Audit_Log_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white shadow-md">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Procurement Audit Log &amp; Visual Analytics
                <span className="text-xs bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-mono px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                  D3.js Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Interactive temporal trend modeling, stock issues consumption, and physical inventory discrepancy analytics.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Export Filtered CSV</span>
          </button>
        </div>
      </div>

      {/* 1. COMPREHENSIVE DATE & FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-400 px-2 font-mono text-[10px] uppercase font-bold">Range:</span>
            {(['7d', '30d', '90d', 'ytd', 'all'] as DatePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  datePreset === preset
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {preset === '7d' && 'Last 7 Days'}
                {preset === '30d' && 'Last 30 Days'}
                {preset === '90d' && 'Last 90 Days'}
                {preset === 'ytd' && 'Year to Date'}
                {preset === 'all' && 'All Time'}
              </button>
            ))}
          </div>

          {/* Date Pickers */}
          <div className="flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Transaction Type Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Transaction Types</option>
                <option value="ISSUE">Stock Issues Only</option>
                <option value="ADJUSTMENT">Stock Adjustments Only</option>
                <option value="DELIVERY">Inbound Deliveries Only</option>
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Building2 className="w-3 h-3 text-slate-400" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {safeDepartments.map((dept) => (
                  <option key={dept.DeptID} value={dept.DeptName}>
                    {dept.DeptName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search items, voucher refs, reasons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-1 focus:ring-teal-500 w-56 sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Issues */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400">
              Total Stock Issues
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {metrics.totalIssuesUnits}{' '}
            <span className="text-xs font-normal text-slate-500">Units</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{metrics.issuesCount} Requisitions</span>
            <span>•</span>
            <span>Issued to departments</span>
          </div>
        </div>

        {/* Total Adjustments */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400">
              Stock Adjustments
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2">
            {metrics.totalAdjustmentUnits > 0 ? `+${metrics.totalAdjustmentUnits}` : metrics.totalAdjustmentUnits}{' '}
            <span className="text-xs font-normal text-slate-500">Net Units</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{metrics.adjustmentsCount} Audits</span>
            <span>•</span>
            <span>{metrics.totalAbsDiscrepancyUnits} Total Variance</span>
          </div>
        </div>

        {/* Deliveries Received */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400">
              Inbound Deliveries
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-2">
            +{metrics.deliveriesUnits}{' '}
            <span className="text-xs font-normal text-slate-500">Units</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{metrics.deliveriesCount} GRN Intakes</span>
            <span>•</span>
            <span>Warehouse restock</span>
          </div>
        </div>

        {/* Audit Accuracy Score */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400">
              Audit Accuracy Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-teal-700 dark:text-teal-400 mt-2">
            {metrics.accuracyRate}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-600 font-semibold">High Compliance</span>
            <span>•</span>
            <span>Discrepancy: {metrics.discrepancyCount + metrics.damagedCount}</span>
          </div>
        </div>
      </div>

      {/* 3. D3 VISUAL CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Timeline Trends (2 Columns Wide) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Temporal Trends: Stock Issues &amp; Adjustments
                </h3>
                <p className="text-xs text-slate-500">
                  D3 interactive area &amp; multi-series trajectory across {startDate} to {endDate}
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center space-x-3 text-[11px] font-mono">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-700 dark:text-slate-300">Issues Out</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-slate-700 dark:text-slate-300">Adjustments</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-slate-700 dark:text-slate-300">Deliveries</span>
                </div>
              </div>
            </div>

            {/* D3 SVG Container */}
            <div className="relative w-full h-[280px] overflow-hidden">
              <svg ref={timelineSvgRef} className="w-full h-full" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono text-[11px]">Hover over graph for precise transaction coordinates &amp; metrics</span>
            <span className="text-teal-600 dark:text-teal-400 font-semibold">{dailyTimelineData.length} timeline days plotted</span>
          </div>
        </div>

        {/* Side Chart: Discrepancy Reasons & Department Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Adjustment Reasons
              </h3>
              <span className="text-[10px] font-mono bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                {metrics.adjustmentsCount} Audits
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">Breakdown of variances by reason code</p>

            {/* D3 Donut SVG */}
            <div className="relative w-full h-[180px] flex items-center justify-center">
              <svg ref={reasonsSvgRef} className="w-full h-full" />
            </div>

            {/* Reasons Legend */}
            <div className="mt-2 space-y-1.5 text-xs">
              {adjustmentReasonsData.map((reason) => (
                <div key={reason.code} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: reason.color }} />
                    <span className="text-slate-700 dark:text-slate-300 truncate">{reason.label}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 shrink-0 ml-2">
                    {reason.totalQty} Units ({reason.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. DEPARTMENT CONSUMPTION DISTRIBUTION BAR CHART */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Department Stock Consumption Distribution
            </h3>
            <p className="text-xs text-slate-500">
              Total units issued across departments within the selected date window
            </p>
          </div>
          <div className="text-xs font-mono text-slate-500">
            Total Issued: <strong className="text-slate-800 dark:text-slate-200">{metrics.totalIssuesUnits} Units</strong>
          </div>
        </div>

        <div className="relative w-full h-[220px]">
          <svg ref={deptSvgRef} className="w-full h-full" />
        </div>
      </div>

      {/* 5. FILTERED AUDIT LOG INTERACTIVE TABLE WITH FRAMER-MOTION */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Audit Transaction Log
            </span>
            <span className="text-xs font-mono bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800 font-bold">
              {sortedLogs.length} Records Found
            </span>
          </div>

          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <span>Sort by:</span>
            <button
              onClick={() => {
                if (sortField === 'Timestamp') setSortAsc(!sortAsc);
                else {
                  setSortField('Timestamp');
                  setSortAsc(false);
                }
              }}
              className={`px-2 py-1 rounded font-mono text-[11px] font-bold border transition ${
                sortField === 'Timestamp'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
            >
              Date {sortField === 'Timestamp' && (sortAsc ? '▲' : '▼')}
            </button>
            <button
              onClick={() => {
                if (sortField === 'Qty') setSortAsc(!sortAsc);
                else {
                  setSortField('Qty');
                  setSortAsc(false);
                }
              }}
              className={`px-2 py-1 rounded font-mono text-[11px] font-bold border transition ${
                sortField === 'Qty'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
            >
              Volume {sortField === 'Qty' && (sortAsc ? '▲' : '▼')}
            </button>
          </div>
        </div>

        {/* Motion Table */}
        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-xs text-left border-collapse font-sans">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700">Timestamp</th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700">Type</th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700">Voucher / Doc Ref</th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700">Item Description</th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right">Delta Qty</th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700">Department / Notes</th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700">Issuer / Auditor</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px]">
              <AnimatePresence mode="popLayout" initial={false}>
                {sortedLogs.length === 0 ? (
                  <motion.tr
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      No procurement transactions found matching the selected date range and filters.
                    </td>
                  </motion.tr>
                ) : (
                  sortedLogs.map((log) => {
                    const isDelivery = log.Type === 'DELIVERY';
                    const isAdjustment = log.Type === 'ADJUSTMENT';
                    const isIssue = log.Type === 'ISSUE';

                    return (
                      <motion.tr
                        key={log.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => onOpenMovementDocument && onOpenMovementDocument(log)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition cursor-pointer group"
                      >
                        <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                          {log.Timestamp}
                        </td>
                        <td className="p-3 border-r border-slate-200 dark:border-slate-800">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isDelivery
                                ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : isAdjustment
                                ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            {log.Type}
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-200 dark:border-slate-800">
                          <div className="flex items-center space-x-1.5">
                            <FolderOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                              {log.DocumentRef || (isDelivery ? 'GRN-Voucher' : isAdjustment ? 'ADJ-Voucher' : 'Issue-Slip')}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 border-r border-slate-200 dark:border-slate-800 font-sans font-medium text-slate-900 dark:text-slate-100">
                          <div className="flex flex-col">
                            <span>{log.ItemName}</span>
                            <span className="font-mono text-[10px] text-teal-700 dark:text-teal-400">{log.ItemID}</span>
                          </div>
                        </td>
                        <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-right font-bold font-mono">
                          {isDelivery ? (
                            <span className="text-blue-600 dark:text-blue-400">+{log.Qty}</span>
                          ) : isAdjustment ? (
                            log.Qty > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">+{log.Qty}</span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400">{log.Qty}</span>
                            )
                          ) : (
                            <span className="text-slate-800 dark:text-slate-200">-{log.Qty}</span>
                          )}
                        </td>
                        <td className="p-3 border-r border-slate-200 dark:border-slate-800 font-sans">
                          {isAdjustment ? (
                            <div>
                              <span className="text-amber-800 dark:text-amber-300 font-bold text-xs">
                                {log.DiscrepancyReason || log.AdjustmentReason}
                              </span>
                              {log.DiscrepancyNotes && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {log.DiscrepancyNotes}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-teal-700 dark:text-teal-400 font-semibold">{log.DeptName}</span>
                          )}
                        </td>
                        <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-sans">
                          {log.IssuerName || log.IssuerID}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenMovementDocument && onOpenMovementDocument(log);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-1 mx-auto transition"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Interactive Tooltip */}
      {tooltipData.visible && (
        <div
          className="fixed pointer-events-none z-50 bg-slate-950/90 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-md space-y-1.5 transition-all duration-75"
          style={{
            left: `${tooltipData.x + 12}px`,
            top: `${tooltipData.y - 40}px`,
          }}
        >
          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">{tooltipData.title}</div>
          <div className="space-y-1">
            {tooltipData.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between space-x-3 text-[11px]">
                <span className="text-slate-400 flex items-center gap-1.5">
                  {item.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />}
                  {item.label}:
                </span>
                <span className="font-mono font-bold" style={{ color: item.color || '#fff' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
