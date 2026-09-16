'use client';

import React, { useState } from 'react';
import type { MetricsSummary } from '@/types';
import {
  TrendingUp, DollarSign, Calendar, Users, MapPin, Award,
  CheckCircle2, ArrowUpRight, Filter, Download
} from 'lucide-react';

interface MetricsViewProps {
  metrics: MetricsSummary;
}

export default function MetricsView({ metrics }: MetricsViewProps) {
  const [timeframe, setTimeframe] = useState<'year' | 'all'>('year');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  // Calculate maximum values for SVG scaling
  const maxInspections = Math.max(
    ...metrics.inspectionsTrend.map(d => Math.max(d.currentYear, d.previousYear))
  );

  const maxRevenue = Math.max(
    ...metrics.revenueMonthly.map(d => Math.max(d.currentYear, d.previousYear))
  );

  const maxAgentCount = Math.max(...metrics.topAgents.map(a => a.inspections));

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header Notice matching Spectora Screenshot 4 ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Business Intelligence &amp; Metrics</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Data
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational analytics, referral acquisition channels, and revenue performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setTimeframe('year')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeframe === 'year' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2026 vs 2025
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeframe === 'all' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards matching Spectora Revenue Blocks ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Online Scheduler Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Online Scheduler</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              ${metrics.onlineSchedulerRevenue.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" /> +24% YoY Growth
            </div>
          </div>
          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">Direct booking through website &amp; portal</p>
        </div>

        {/* Card 2: Partnership Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Partnership Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              ${metrics.partnershipRevenue.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-600 font-bold">
              <span>Affiliate &amp; Brokerage tiers active</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">Broker agreements &amp; preferred inspector tiers</p>
        </div>

        {/* Card 3: Total Inspections */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Completed Inspections</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {metrics.totalInspections}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-bold">
              <span>Avg Fee: ${metrics.avgInspectionFee}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">Residential, Radon, and Pre-listing reports</p>
        </div>

        {/* Card 4: Turnaround & Satisfaction */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Turnaround Speed</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {metrics.avgTurnaroundHours} <span className="text-base font-semibold text-slate-400">hrs</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-bold">
              <span>★ {metrics.satisfactionRate}% Satisfaction</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">From on-site arrival to PDF publication</p>
        </div>
      </div>

      {/* ── Charts Grid (matching Spectora Screenshot 4 layout) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* 1. INSPECTIONS TREND (Line Chart - 7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Inspections Trend</h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-3 h-1 bg-blue-600 rounded-full"></span> 2026
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3 h-1 bg-slate-300 rounded-full"></span> 2025
                </div>
              </div>
            </div>

            {/* SVG Line Chart */}
            <div className="mt-4 relative h-56 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                {[0, 50, 100, 150].map((y, idx) => (
                  <line key={idx} x1="0" y1={y} x2="600" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                ))}

                {/* 2025 Previous Year Path (Grey dashed) */}
                <path
                  d={metrics.inspectionsTrend.map((d, i) => {
                    const x = (i / (metrics.inspectionsTrend.length - 1)) * 580 + 10;
                    const y = 180 - (d.previousYear / maxInspections) * 150;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* 2026 Current Year Gradient Area */}
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d={`${metrics.inspectionsTrend.map((d, i) => {
                    const x = (i / (metrics.inspectionsTrend.length - 1)) * 580 + 10;
                    const y = 180 - (d.currentYear / maxInspections) * 150;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')} L 590 180 L 10 180 Z`}
                  fill="url(#chartGrad)"
                />

                {/* 2026 Current Year Line */}
                <path
                  d={metrics.inspectionsTrend.map((d, i) => {
                    const x = (i / (metrics.inspectionsTrend.length - 1)) * 580 + 10;
                    const y = 180 - (d.currentYear / maxInspections) * 150;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Data Points */}
                {metrics.inspectionsTrend.map((d, i) => {
                  const x = (i / (metrics.inspectionsTrend.length - 1)) * 580 + 10;
                  const y = 180 - (d.currentYear / maxInspections) * 150;
                  const isHovered = hoveredMonth === i;
                  return (
                    <g key={i} onMouseEnter={() => setHoveredMonth(i)} onMouseLeave={() => setHoveredMonth(null)} className="cursor-pointer">
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 6 : 4}
                        fill="#ffffff"
                        stroke="#2563eb"
                        strokeWidth={isHovered ? 3 : 2}
                        className="transition-all"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Month Labels */}
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mt-2 px-1">
                {metrics.inspectionsTrend.map((d, idx) => (
                  <span
                    key={d.month}
                    className={`transition-colors ${hoveredMonth === idx ? 'text-blue-600 font-extrabold' : ''}`}
                  >
                    {d.month}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Hover detail box */}
          {hoveredMonth !== null && (
            <div className="mt-3 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs flex items-center justify-between text-slate-700 animate-fade-up">
              <span className="font-bold text-blue-800">
                {metrics.inspectionsTrend[hoveredMonth].month} Inspection Volume:
              </span>
              <div className="flex items-center gap-4 font-mono font-bold">
                <span className="text-blue-700">{metrics.inspectionsTrend[hoveredMonth].currentYear} (2026)</span>
                <span className="text-slate-400">{metrics.inspectionsTrend[hoveredMonth].previousYear} (2025)</span>
              </div>
            </div>
          )}
        </div>

        {/* 2. REFERRAL SOURCES (Donut Chart - 5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Referral Sources</h3>
            </div>
            <span className="text-xs font-mono text-slate-400 font-bold">4 Channels</span>
          </div>

          <div className="my-4 flex flex-col sm:flex-row items-center justify-center gap-6">
            {/* SVG Donut */}
            <div className="relative w-40 h-40 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {(() => {
                  let accumulatedPercent = 0;
                  return metrics.referralSources.map((item, idx) => {
                    const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                    const strokeDashoffset = -accumulatedPercent;
                    accumulatedPercent += item.percentage;
                    return (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="16"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        pathLength="100"
                        className="transition-all hover:opacity-80 cursor-pointer"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-900">46%</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Realtors</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 flex-1 text-xs">
              {metrics.referralSources.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="text-slate-700 font-medium truncate">{item.name}</span>
                  </div>
                  <span className="font-bold font-mono text-slate-900 shrink-0">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100">
            Realtor co-marketing generates over $110k in annual inspection bookings.
          </p>
        </div>

        {/* 3. TOP AGENTS (Horizontal Bars - 6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Top Performing Agents</h3>
            </div>
            <span className="text-xs font-mono text-slate-400 font-bold">Total Inspections</span>
          </div>

          <div className="space-y-3">
            {metrics.topAgents.map((agent, idx) => {
              const widthPct = (agent.inspections / maxAgentCount) * 100;

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 font-mono text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span>{agent.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">({agent.agency})</span>
                    </div>
                    <span className="font-mono font-bold text-blue-600">{agent.inspections}</span>
                  </div>

                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. REVENUE BREAKDOWN (Bar Chart - 6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Revenue Breakdown ($)</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
              Payments Received
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-1.5 pt-4">
            {metrics.revenueMonthly.map((d, idx) => {
              const currentHeight = (d.currentYear / maxRevenue) * 100;
              const prevHeight = (d.previousYear / maxRevenue) * 100;

              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer">
                  <div className="w-full flex items-end justify-center gap-0.5 h-36">
                    {/* Previous year bar */}
                    <div
                      className="w-2.5 bg-slate-200 rounded-t-sm transition-all group-hover:bg-slate-300"
                      style={{ height: `${prevHeight}%` }}
                      title={`2025: $${d.previousYear.toLocaleString()}`}
                    ></div>
                    {/* Current year bar */}
                    <div
                      className="w-2.5 bg-emerald-600 rounded-t-sm transition-all group-hover:bg-emerald-700 shadow-2xs"
                      style={{ height: `${currentHeight}%` }}
                      title={`2026: $${d.currentYear.toLocaleString()}`}
                    ></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-emerald-700">
                    {d.month}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-slate-500 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></span> 2026 Actual
              </div>
              <div className="flex items-center gap-1 text-slate-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-200"></span> 2025
              </div>
            </div>
            <span className="font-mono font-bold text-slate-800">YTD: $249,700</span>
          </div>
        </div>

      </div>
    </div>
  );
}
