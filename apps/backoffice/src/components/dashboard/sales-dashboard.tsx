'use client';

import { BookOpen, Hourglass, Laptop, TrendingDown, type LucideIcon, BarChart3 } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const;

/** Nilai batang biru di grafik. April + Agustus = Rp 8.205.000. */
const LEADS_BY_MONTH = [0, 0, 0, 5_600_000, 0, 0, 0, 2_605_000, 0, 0, 0, 0];
const PROSPECTS_BY_MONTH = [0, 0, 0, 1_200_000, 0, 0, 0, 850_000, 0, 0, 0, 0];
const Y_MAX = 6_000_000;
const Y_TICKS = [6_000_000, 5_000_000, 4_000_000, 3_000_000, 2_000_000, 1_000_000, 0];

const LEADS_COLOR = '#2563EB'; // Vibrant Blue
const PROSPECTS_COLOR = '#F43F5E'; // Rose Pink

function idNumber(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function rupiah(value: number) {
  return `Rp ${idNumber(value)}`;
}

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
  const jumlahLeads = LEADS_BY_MONTH.reduce((sum, value) => sum + value, 0);
  const jumlahProspects = PROSPECTS_BY_MONTH.reduce((sum, value) => sum + value, 0);

  return (
    <div className="space-y-5">
      {/* ── Section Grafik Sales ── */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                Sales Statistik
              </h2>
              <p className="text-xs font-medium text-slate-600">
                Pergerakan nominal Leads dan Prospects sepanjang tahun berjalan
              </p>
            </div>
          </div>

          {/* Legend dengan label kontras tinggi */}
          <div className="flex items-center gap-5 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/70 text-xs font-bold text-slate-800">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full shadow-2xs" style={{ background: LEADS_COLOR }} />
              <span>Leads (Rp 8,2 Jt)</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full shadow-2xs" style={{ background: PROSPECTS_COLOR }} />
              <span>Prospects (Rp 2,05 Jt)</span>
            </span>
          </div>
        </div>

        {/* Chart with horizontal scroll wrapper for mobile */}
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="min-w-[680px]">
            <SalesChart />
          </div>
        </div>
      </section>

      {/* ── Section Metrics Cards ── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BookOpen}
          iconBg="#EA580C"
          label="Jumlah Leads"
          value={rupiah(jumlahLeads)}
          percent="100%"
          percentClass="text-emerald-700 font-bold"
          ratio="2/2 Periode Aktif"
          tagColor="bg-orange-50 text-orange-700 border-orange-200"
        />
        <MetricCard
          icon={Hourglass}
          iconBg="#334155"
          label="Prospects"
          value={rupiah(jumlahProspects)}
          percent="25%"
          percentClass="text-blue-700 font-bold"
          ratio="Terproses"
          tagColor="bg-slate-100 text-slate-800 border-slate-200"
        />
        <MetricCard
          icon={Laptop}
          iconBg="#E11D48"
          label="Collections"
          value={rupiah(0)}
          percent="0%"
          percentClass="text-rose-700 font-bold"
          ratio="Rp 0 / Target Rp 0"
          tagColor="bg-rose-50 text-rose-700 border-rose-200"
        />
        <MetricCard
          icon={TrendingDown}
          iconBg="#059669"
          label="NPL (Non-Performing Loan)"
          value="0.00%"
          percent="Lancar"
          percentClass="text-emerald-700 font-bold"
          ratio="Kolektibilitas 1"
          tagColor="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
      </section>
    </div>
  );
}

function SalesChart() {
  const width = 940;
  const height = 340;
  const padL = 90;
  const padR = 24;
  const padT = 32;
  const padB = 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const slot = plotW / MONTHS.length;
  const barW = slot * 0.32;
  const yOf = (value: number) => padT + plotH - (value / Y_MAX) * plotH;
  const baseline = yOf(0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full select-none"
      role="img"
      aria-label="Grafik leads & prospects bulanan"
    >
      {/* Horizontal Gridlines & Y-Axis Labels (Dark, High Contrast) */}
      {Y_TICKS.map((tick) => {
        const y = yOf(tick);
        return (
          <g key={tick}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y}
              y2={y}
              stroke="#E2E8F0"
              strokeWidth={tick === 0 ? '1.5' : '1'}
              strokeDasharray={tick === 0 ? undefined : '4 4'}
            />
            {/* Y-axis label: high contrast text-slate-700 */}
            <text
              x={padL - 14}
              y={y + 4}
              textAnchor="end"
              fill="#334155"
              fontSize="12"
              fontWeight="700"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {rupiahShort(tick)}
            </text>
          </g>
        );
      })}

      {/* Vertical separators */}
      {MONTHS.map((month, index) => {
        const x = padL + slot * index;
        return (
          <line
            key={`v-${month}`}
            x1={x}
            x2={x}
            y1={padT}
            y2={baseline}
            stroke="#F1F5F9"
            strokeWidth="1"
          />
        );
      })}
      <line x1={width - padR} x2={width - padR} y1={padT} y2={baseline} stroke="#F1F5F9" strokeWidth="1" />

      {/* Bars: Leads & Prospects */}
      {MONTHS.map((month, index) => {
        const leadsVal = LEADS_BY_MONTH[index];
        const prosVal = PROSPECTS_BY_MONTH[index];
        const center = padL + slot * index + slot / 2;
        const xLeads = center - barW - 2;
        const xPros = center + 2;

        return (
          <g key={month}>
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
                  className="transition-all duration-300 hover:opacity-90"
                />
                {/* Value Label Above Leads Bar */}
                <rect
                  x={xLeads - 12}
                  y={yOf(leadsVal) - 22}
                  width={barW + 24}
                  height={18}
                  fill="#1E293B"
                  rx="4"
                />
                <text
                  x={xLeads + barW / 2}
                  y={yOf(leadsVal) - 9}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="10"
                  fontWeight="800"
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
                  className="transition-all duration-300 hover:opacity-90"
                />
                {/* Value Label Above Prospects Bar */}
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
                  fill="#FFFFFF"
                  fontSize="10"
                  fontWeight="800"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {rupiahShort(prosVal)}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* X-Axis Month Labels (Crisp Dark Text) */}
      {MONTHS.map((month, index) => {
        const x = padL + slot * index + slot / 2;
        const hasData = LEADS_BY_MONTH[index] > 0 || PROSPECTS_BY_MONTH[index] > 0;
        return (
          <g key={month}>
            <text
              x={x}
              y={height - 12}
              textAnchor="middle"
              fill={hasData ? '#0F172A' : '#475569'}
              fontSize="13"
              fontWeight={hasData ? '800' : '600'}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {month}
            </text>
            {hasData && (
              <circle cx={x} cy={height - 3} r="2.5" fill="#2563EB" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function MetricCard({
  icon: Icon,
  iconBg,
  label,
  value,
  percent,
  percentClass = 'text-slate-600 font-semibold',
  ratio,
  tagColor = 'bg-slate-50 text-slate-700 border-slate-200',
}: {
  icon: LucideIcon;
  iconBg: string;
  label: string;
  value: string;
  percent?: string;
  percentClass?: string;
  ratio?: string;
  tagColor?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-start gap-3.5">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs"
          style={{ background: iconBg }}
        >
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 truncate">
            {value}
          </p>
        </div>
      </div>

      {percent && ratio && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className={`px-2 py-0.5 rounded-full border text-[11px] ${tagColor}`}>
            {percent}
          </span>
          <span className="font-semibold text-slate-700">{ratio}</span>
        </div>
      )}
    </article>
  );
}
