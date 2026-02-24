'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Clock, Cpu, RefreshCw } from 'lucide-react';
import { useLatencyMeasurement } from '@/hooks/useLatencyMeasurement';
import { RegionTile } from '@/components/RegionTile';
import { CRTOverlay } from '@/components/CRTOverlay';
import { Region } from '@/lib/regions';
import { useEffect, useState } from 'react';

const AWS_GREEN = '#00ff41';
const AZ_BLUE = '#00b4ff';
const SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;
const LOOP_INTERVAL_S = 35;
// Winner is only declared when margin exceeds this threshold
const WINNER_MARGIN_MS = 5;

function sortByLatency(regions: Region[]): Region[] {
  return [...regions].sort((a, b) => {
    if (a.latency === null && b.latency === null) return 0;
    if (a.latency === null) return 1;
    if (b.latency === null) return -1;
    return a.latency - b.latency;
  });
}

// Use median of top-3 regions for a stable, jitter-resistant score
function providerScore(regions: Region[]): number | null {
  const withData = sortByLatency(regions).filter((r) => r.latency !== null);
  if (withData.length === 0) return null;
  const top = withData.slice(0, Math.min(3, withData.length));
  return top.reduce((s, r) => s + (r.latency ?? 0), 0) / top.length;
}

// Countdown hook: ticks down from LOOP_INTERVAL_S when all regions are idle
function useRefreshCountdown(regions: Region[]) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const allSettled = regions.every(
    (r) => r.status === 'done' || r.status === 'error',
  );
  const anyActive = regions.some(
    (r) => r.status === 'measuring' || r.status === 'warmup',
  );

  useEffect(() => {
    if (!allSettled || anyActive) {
      setCountdown(null);
      return;
    }
    let secs = LOOP_INTERVAL_S;
    setCountdown(secs);
    const t = setInterval(() => {
      secs -= 1;
      if (secs <= 0) {
        setCountdown(null);
        clearInterval(t);
      } else {
        setCountdown(secs);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [allSettled, anyActive]);

  return countdown;
}

function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = () => new Date().toISOString().slice(11, 19) + ' UTC';
    setTime(fmt());
    const t = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

function ProviderHeader({
  label,
  color,
  regions,
}: {
  label: string;
  color: string;
  regions: Region[];
}) {
  const done = regions.filter(
    (r) => r.status === 'done' || r.status === 'error',
  ).length;
  const measuring = regions.filter(
    (r) => r.status === 'measuring' || r.status === 'warmup',
  ).length;
  const fastest = sortByLatency(regions).find((r) => r.latency !== null);

  return (
    <div className="mb-4 pb-3" style={{ borderBottom: `2px solid ${color}33` }}>
      <div className="flex items-center justify-between">
        <h2
          className="font-serif text-[22px] font-black tracking-tight uppercase"
          style={{
            color,
            textShadow: `0 0 12px ${color}80`,
            letterSpacing: '0.08em',
          }}
        >
          {label}
        </h2>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1 text-[10px] font-mono"
            style={{ color: '#9ca3af' }}
          >
            <Cpu size={10} aria-hidden="true" />
            <span>
              {done}/{regions.length}
            </span>
          </div>
          {measuring > 0 && (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              className="flex items-center gap-1 text-[10px] font-mono"
              style={{ color }}
              aria-label="Measuring live"
            >
              <Activity size={10} aria-hidden="true" />
              <span>LIVE</span>
            </motion.div>
          )}
        </div>
      </div>
      {fastest && fastest.latency !== null && (
        <div
          className="mt-1 text-[11px] font-mono"
          style={{ color: '#9ca3af' }}
        >
          FASTEST ▸{' '}
          <span style={{ color }}>
            {fastest.code} ({fastest.latency.toFixed(1)}ms)
          </span>
        </div>
      )}
    </div>
  );
}

function ProviderPanel({
  regions,
  color,
  label,
}: {
  regions: Region[];
  color: string;
  label: string;
}) {
  const sorted = sortByLatency(regions);

  return (
    <div className="flex-1 min-w-0">
      <ProviderHeader label={label} color={color} regions={regions} />
      <div>
        <AnimatePresence initial={false}>
          {sorted.map((region, i) => (
            <RegionTile
              key={region.id}
              region={region}
              rank={i}
              accentColor={color}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function LatencyDashboard() {
  const { regions } = useLatencyMeasurement();
  const clock = useClock();
  const countdown = useRefreshCountdown(regions);

  const awsRegions = regions.filter((r) => r.provider === 'aws');
  const azureRegions = regions.filter((r) => r.provider === 'azure');

  const awsScore = providerScore(awsRegions);
  const azScore = providerScore(azureRegions);

  // Only declare a winner when both have data and margin exceeds threshold
  const winner =
    awsScore !== null && azScore !== null
      ? Math.abs(awsScore - azScore) < WINNER_MARGIN_MS
        ? 'tie'
        : awsScore < azScore
        ? 'aws'
        : 'azure'
      : null;

  const totalDone = regions.filter(
    (r) => r.status === 'done' || r.status === 'error',
  ).length;
  const anyActive = regions.some(
    (r) => r.status === 'measuring' || r.status === 'warmup',
  );

  return (
    <>
      <CRTOverlay />

      <div
        className="min-h-screen font-mono"
        style={{ background: '#030804', color: '#00ff41' }}
      >
        {/* ── Top chrome bar ── */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-2 text-[10px] tracking-widest overflow-hidden"
          style={{
            background: '#020602',
            borderBottom: '2px solid #00ff4133',
            color: '#9ca3af',
          }}
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <span style={{ color: AWS_GREEN }} className="shrink-0">
              SYS:ONLINE
            </span>
            <span className="shrink-0">
              REGIONS:{totalDone}/{regions.length}
            </span>
            {anyActive ? (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.1, repeat: Infinity }}
                style={{ color: AWS_GREEN }}
                className="shrink-0"
              >
                MEASURING...
              </motion.span>
            ) : countdown !== null ? (
              <span className="flex items-center gap-1 shrink-0">
                <RefreshCw size={9} aria-hidden="true" />
                NEXT:{countdown}s
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Clock size={10} style={{ color: '#9ca3af' }} aria-hidden="true" />
            <span>{clock}</span>
          </div>
        </div>

        {/* ── Main header ── */}
        <header
          className="px-4 sm:px-6 py-5"
          style={{ borderBottom: '2px solid #00ff4122' }}
        >
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div
                className="text-[10px] tracking-[0.3em] font-mono mb-1"
                style={{ color: '#9ca3af' }}
              >
                ◉ REAL-TIME NETWORK INTELLIGENCE
              </div>
              <h1
                className="font-serif font-black leading-none"
                style={{
                  fontSize: 'clamp(24px, 4vw, 48px)',
                  color: AWS_GREEN,
                  textShadow: `0 0 20px ${AWS_GREEN}60, 0 0 40px ${AWS_GREEN}30`,
                  letterSpacing: '-0.01em',
                }}
              >
                CLOUD LATENCY MAP
              </h1>
              <div
                className="text-[11px] font-mono mt-1 tracking-wider"
                style={{ color: '#9ca3af' }}
              >
                AWS vs AZURE · BROWSER-SIDE RTT · 5 WARMUP + 10 SAMPLES/REGION
              </div>
            </div>

            {/* Winner badge — aria-live so screen readers catch changes */}
            <div
              aria-live="polite"
              role="status"
              className="shrink-0 text-right"
            >
              <AnimatePresence mode="wait">
                {winner && winner !== 'tie' && (
                  <motion.div
                    key={winner}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={SPRING}
                  >
                    <div
                      className="text-[9px] tracking-widest mb-1"
                      style={{ color: '#9ca3af' }}
                    >
                      CURRENT WINNER
                    </div>
                    <div
                      className="flex items-center gap-2 px-3 py-2"
                      style={{
                        border: `2px solid ${winner === 'aws' ? AWS_GREEN : AZ_BLUE}`,
                        boxShadow: `0 0 16px ${winner === 'aws' ? AWS_GREEN : AZ_BLUE}40`,
                      }}
                    >
                      <Zap
                        size={14}
                        style={{ color: winner === 'aws' ? AWS_GREEN : AZ_BLUE }}
                        aria-hidden="true"
                      />
                      <span
                        className="font-serif font-black text-[18px] tracking-wider"
                        style={{
                          color: winner === 'aws' ? AWS_GREEN : AZ_BLUE,
                          textShadow: `0 0 10px ${winner === 'aws' ? AWS_GREEN : AZ_BLUE}`,
                        }}
                      >
                        {winner === 'aws' ? 'AWS' : 'AZURE'}
                      </span>
                    </div>
                    {awsScore !== null && azScore !== null && (
                      <div
                        className="text-[10px] mt-1 font-mono"
                        style={{
                          color: winner === 'aws' ? AWS_GREEN : AZ_BLUE,
                        }}
                      >
                        by {Math.abs(awsScore - azScore).toFixed(1)}ms
                      </div>
                    )}
                  </motion.div>
                )}
                {winner === 'tie' && (
                  <motion.div
                    key="tie"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={SPRING}
                  >
                    <div
                      className="text-[9px] tracking-widest mb-1"
                      style={{ color: '#9ca3af' }}
                    >
                      CURRENT WINNER
                    </div>
                    <div
                      className="flex items-center gap-2 px-3 py-2"
                      style={{
                        border: '2px solid #9ca3af',
                        boxShadow: '0 0 16px #9ca3af40',
                      }}
                    >
                      <span
                        className="font-serif font-black text-[18px] tracking-wider"
                        style={{ color: '#9ca3af' }}
                      >
                        TIED
                      </span>
                    </div>
                    <div
                      className="text-[10px] mt-1 font-mono"
                      style={{ color: '#9ca3af' }}
                    >
                      &lt;{WINNER_MARGIN_MS}ms margin
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* ── Bento grid ── */}
        <main className="px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <ProviderPanel
              regions={awsRegions}
              color={AWS_GREEN}
              label="Amazon Web Services"
            />

            {/* Divider — hidden on mobile */}
            <div
              className="hidden sm:block self-stretch w-[2px] flex-shrink-0"
              style={{
                background:
                  'linear-gradient(to bottom, transparent, #00ff4133 20%, #00ff4133 80%, transparent)',
              }}
              aria-hidden="true"
            />

            <ProviderPanel
              regions={azureRegions}
              color={AZ_BLUE}
              label="Microsoft Azure"
            />
          </div>
        </main>

        {/* ── Footer ── */}
        <footer
          className="px-4 sm:px-6 py-3 text-[10px] font-mono"
          style={{
            borderTop: '2px solid #00ff4122',
            color: '#9ca3af',
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
            <span>
              METHODOLOGY: HEAD &#123;mode:no-cors&#125; · MEDIAN RTT · NO SERVER-SIDE PROXY
            </span>
            <span>
              AWS: s3.[region].amazonaws.com · AZURE: [region].api.cognitive.microsoft.com
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
