'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Clock, Cpu } from 'lucide-react';
import { useLatencyMeasurement } from '@/hooks/useLatencyMeasurement';
import { RegionTile } from '@/components/RegionTile';
import { CRTOverlay } from '@/components/CRTOverlay';
import { Region } from '@/lib/regions';
import { useEffect, useState } from 'react';

const AWS_GREEN = '#00ff41';
const AZ_BLUE = '#00b4ff';
const SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;

function sortByLatency(regions: Region[]): Region[] {
  return [...regions].sort((a, b) => {
    if (a.latency === null && b.latency === null) return 0;
    if (a.latency === null) return 1;
    if (b.latency === null) return -1;
    return a.latency - b.latency;
  });
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
  const done = regions.filter((r) => r.status === 'done' || r.status === 'error').length;
  const measuring = regions.filter(
    (r) => r.status === 'measuring' || r.status === 'warmup',
  ).length;
  const fastest = regions.find((r) => r.latency !== null);

  return (
    <div
      className="mb-4 pb-3"
      style={{ borderBottom: `2px solid ${color}33` }}
    >
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
          <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: '#4a5568' }}>
            <Cpu size={10} />
            <span>{done}/{regions.length}</span>
          </div>
          {measuring > 0 && (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              className="flex items-center gap-1 text-[10px] font-mono"
              style={{ color }}
            >
              <Activity size={10} />
              <span>LIVE</span>
            </motion.div>
          )}
        </div>
      </div>
      {fastest && fastest.latency !== null && (
        <div className="mt-1 text-[11px] font-mono" style={{ color: '#4a5568' }}>
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

export function LatencyDashboard() {
  const { regions } = useLatencyMeasurement();
  const clock = useClock();

  const awsRegions = regions.filter((r) => r.provider === 'aws');
  const azureRegions = regions.filter((r) => r.provider === 'azure');

  const awsFastest = sortByLatency(awsRegions)[0];
  const azFastest = sortByLatency(azureRegions)[0];

  const winner =
    awsFastest?.latency !== null && azFastest?.latency !== null
      ? awsFastest.latency < azFastest.latency
        ? 'aws'
        : 'azure'
      : null;

  const totalDone = regions.filter(
    (r) => r.status === 'done' || r.status === 'error',
  ).length;

  return (
    <>
      <CRTOverlay />

      <div
        className="min-h-screen font-mono"
        style={{ background: '#030804', color: '#00ff41' }}
      >
        {/* ── Top chrome bar ── */}
        <div
          className="flex items-center justify-between px-6 py-2 text-[10px] tracking-widest"
          style={{
            background: '#020602',
            borderBottom: '2px solid #00ff4133',
            color: '#4a5568',
          }}
        >
          <div className="flex items-center gap-4">
            <span style={{ color: AWS_GREEN }}>SYS:ONLINE</span>
            <span>REGIONS:{totalDone}/{regions.length}</span>
            <span>INTERVAL:35s</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={10} style={{ color: '#4a5568' }} />
            <span>{clock}</span>
          </div>
        </div>

        {/* ── Main header ── */}
        <header
          className="px-6 py-5"
          style={{ borderBottom: '2px solid #00ff4122' }}
        >
          <div className="flex items-end justify-between">
            <div>
              <div
                className="text-[10px] tracking-[0.3em] font-mono mb-1"
                style={{ color: '#4a5568' }}
              >
                ◉ REAL-TIME NETWORK INTELLIGENCE
              </div>
              <h1
                className="font-serif font-black leading-none"
                style={{
                  fontSize: 'clamp(28px, 4vw, 48px)',
                  color: AWS_GREEN,
                  textShadow: `0 0 20px ${AWS_GREEN}60, 0 0 40px ${AWS_GREEN}30`,
                  letterSpacing: '-0.01em',
                }}
              >
                CLOUD LATENCY MAP
              </h1>
              <div
                className="text-[11px] font-mono mt-1 tracking-wider"
                style={{ color: '#4a5568' }}
              >
                AWS vs AZURE · BROWSER-SIDE RTT · 5 WARMUP + 10 SAMPLES/REGION
              </div>
            </div>

            {/* Winner badge */}
            <AnimatePresence>
              {winner && (
                <motion.div
                  key={winner}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={SPRING}
                  className="text-right"
                >
                  <div
                    className="text-[9px] tracking-widest mb-1"
                    style={{ color: '#4a5568' }}
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
                  {awsFastest?.latency !== null &&
                    azFastest?.latency !== null && (
                      <div
                        className="text-[10px] mt-1 font-mono"
                        style={{
                          color: winner === 'aws' ? AWS_GREEN : AZ_BLUE,
                        }}
                      >
                        by{' '}
                        {Math.abs(
                          awsFastest.latency - azFastest.latency,
                        ).toFixed(1)}
                        ms
                      </div>
                    )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* ── Bento grid ── */}
        <main className="px-6 py-6">
          <div className="flex gap-6 items-start">
            <ProviderPanel
              regions={awsRegions}
              color={AWS_GREEN}
              label="Amazon Web Services"
            />

            {/* Divider */}
            <div
              className="self-stretch w-[2px] flex-shrink-0"
              style={{
                background:
                  'linear-gradient(to bottom, transparent, #00ff4133 20%, #00ff4133 80%, transparent)',
              }}
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
          className="px-6 py-3 text-[10px] font-mono"
          style={{
            borderTop: '2px solid #00ff4122',
            color: '#4a5568',
          }}
        >
          <div className="flex items-center justify-between">
            <span>
              METHODOLOGY: HEAD {'{'}mode:no-cors{'}'} · MEDIAN RTT · NO
              SERVER-SIDE PROXY
            </span>
            <span>
              AWS ENDPOINTS: dynamodb.[region].amazonaws.com · AZURE:
              [region].api.cognitive.microsoft.com
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
