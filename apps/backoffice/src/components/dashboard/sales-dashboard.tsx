'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const;

/** Nilai batang di grafik. April + Agustus = Rp 8.205.000 (Leads) & Rp 2.050.000 (Prospects). */
const LEADS_BY_MONTH = [0, 0, 0, 5_600_000, 0, 0, 0, 2_605_000, 0, 0, 0, 0];
const PROSPECTS_BY_MONTH = [0, 0, 0, 1_200_000, 0, 0, 0, 850_000, 0, 0, 0, 0];
const Y_MAX = 6_000_000;
const Y_TICKS = [6_000_000, 5_000_000, 4_000_000, 3_000_000, 2_000_000, 1_000_000, 0];

const LEADS_COLOR = '#2563eb'; // Vibrant Blue
const PROSPECTS_COLOR = '#e11d48'; // Elegant Crimson

function rupiahShort(value: number) {
  if (value >= 1_000_000) {
    const jt = (value / 1_000_000).toFixed(1).replace('.0', '');
    return `Rp ${jt} Jt`;
  }
  if (value >= 1_000) {
    return `Rp ${Math.round(value / 1_000)} Rb`;
  }
  return `Rp ${value}`;
}

export function SalesDashboard() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const updateScrollProgress = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setScrollProgress(0);
    } else {
      setScrollProgress(Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100)));
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    updateScrollProgress();
    el.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress);
    return () => {
      el.removeEventListener('scroll', updateScrollProgress);
      window.removeEventListener('resize', updateScrollProgress);
    };
  }, []);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full">
      <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-card p-6 sm:p-8 shadow-card">
        {/* ── Top Header & Legend ── */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80">
          <div className="max-w-xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Statistik Penyaluran Pembiayaan
              </h2>
              <span className="rounded-lg bg-blue-50/80 dark:bg-blue-950/40 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/60">
                Tahun 2026
              </span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Perbandingan nominal Leads dan Prospects yang teregistrasi per bulan.
            </p>
          </div>

          {/* Legend Box */}
          <div className="flex items-center gap-5 sm:gap-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 px-5 py-3.5 shadow-2xs shrink-0 self-start md:self-auto">
            <div className="flex items-start gap-2.5">
              <span className="h-3.5 w-3.5 rounded-xs shrink-0 mt-0.5" style={{ backgroundColor: LEADS_COLOR }} />
              <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                <div>Leads (8,2</div>
                <div>Jt)</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="h-3.5 w-3.5 rounded-xs shrink-0 mt-0.5" style={{ backgroundColor: PROSPECTS_COLOR }} />
              <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                <div>Prospects (2,05</div>
                <div>Jt)</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Responsive SVG Chart ── */}
        <div
          ref={scrollContainerRef}
          className="mt-6 overflow-x-auto pb-2 scrollbar-none"
        >
          <div className="min-w-[760px] sm:min-w-full">
            <SalesChart />
          </div>
        </div>

        {/* ── Bottom Slider / Scroll Navigation ── */}
        <div className="mt-6 flex items-center gap-2 px-1 text-slate-400">
          <button
            type="button"
            onClick={handleScrollLeft}
            aria-label="Geser ke kiri"
            className="h-6 w-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="relative flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="absolute top-0 bottom-0 rounded-full bg-slate-300 dark:bg-slate-600 transition-all duration-150"
              style={{
                width: '32%',
                left: `${scrollProgress * 0.68}%`,
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleScrollRight}
            aria-label="Geser ke kanan"
            className="h-6 w-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}

function SalesChart() {
  const width = 1000;
  const height = 360;
  const padL = 80;
  const padR = 28;
  const padT = 36;
  const padB = 44;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const slot = plotW / MONTHS.length;
  const barW = slot * 0.28;
  const yOf = (value: number) => padT + plotH - (value / Y_MAX) * plotH;
  const baseline = yOf(0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full select-none"
      role="img"
      aria-label="Grafik leads & prospects bulanan"
    >
      {/* Horizontal Gridlines & Y-Axis Labels */}
      {Y_TICKS.map((tick) => {
        const y = yOf(tick);
        return (
          <g key={tick}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y}
              y2={y}
              stroke={tick === 0 ? '#f1f5f9' : '#e2e8f0'}
              strokeWidth={tick === 0 ? '1.5' : '1'}
              strokeDasharray={tick === 0 ? undefined : '3 3'}
            />
            <text
              x={padL - 14}
              y={y + 4}
              textAnchor="end"
              fill="#64748b"
              fontSize="11"
              fontWeight="500"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {rupiahShort(tick)}
            </text>
          </g>
        );
      })}

      {/* Vertical subtle column separators */}
      {MONTHS.map((month, index) => {
        const x = padL + slot * index;
        return (
          <line
            key={`v-${month}`}
            x1={x}
            x2={x}
            y1={padT}
            y2={baseline}
            stroke="#f8fafc"
            strokeWidth="1"
          />
        );
      })}

      {/* Bars: Leads & Prospects */}
      {MONTHS.map((month, index) => {
        const leadsVal = LEADS_BY_MONTH[index];
        const prosVal = PROSPECTS_BY_MONTH[index];
        const center = padL + slot * index + slot / 2;
        const xLeads = center - barW - 2;
        const xPros = center + 2;

        return (
          <g key={month} className="group">
            {/* Leads Bar */}
            {leadsVal > 0 && (
              <g>
                <rect
                  x={xLeads}
                  y={yOf(leadsVal)}
                  width={barW}
                  height={baseline - yOf(leadsVal)}
                  fill={LEADS_COLOR}
                  rx="4"
                  className="transition-all duration-200 hover:brightness-110"
                />
                {/* Pill Tooltip above bar */}
                <rect
                  x={xLeads - 12}
                  y={yOf(leadsVal) - 22}
                  width={barW + 24}
                  height={18}
                  fill="#0f172a"
                  rx="4"
                />
                <text
                  x={xLeads + barW / 2}
                  y={yOf(leadsVal) - 9}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {rupiahShort(leadsVal)}
                </text>
              </g>
            )}

            {/* Prospects Bar */}
            {prosVal > 0 && (
              <g>
                <rect
                  x={xPros}
                  y={yOf(prosVal)}
                  width={barW}
                  height={baseline - yOf(prosVal)}
                  fill={PROSPECTS_COLOR}
                  rx="4"
                  className="transition-all duration-200 hover:brightness-110"
                />
                {/* Pill Tooltip above bar */}
                <rect
                  x={xPros - 10}
                  y={yOf(prosVal) - 22}
                  width={barW + 20}
                  height={18}
                  fill="#881337"
                  rx="4"
                />
                <text
                  x={xPros + barW / 2}
                  y={yOf(prosVal) - 9}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {rupiahShort(prosVal)}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* X-Axis Month Labels */}
      {MONTHS.map((month, index) => {
        const x = padL + slot * index + slot / 2;
        const hasData = LEADS_BY_MONTH[index] > 0 || PROSPECTS_BY_MONTH[index] > 0;
        return (
          <g key={month}>
            <text
              x={x}
              y={height - 14}
              textAnchor="middle"
              fill={hasData ? '#0f172a' : '#64748b'}
              fontSize="12"
              fontWeight={hasData ? '700' : '500'}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {month}
            </text>
            {hasData && (
              <circle cx={x} cy={height - 6} r="2.5" fill={LEADS_COLOR} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
