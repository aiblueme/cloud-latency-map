'use client';

import { motion } from 'framer-motion';
import { Region } from '@/lib/regions';

const SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;

function latencyColor(ms: number | null): string {
  if (ms === null) return '#4a5568';
  if (ms < 50) return '#00ff41';
  if (ms < 120) return '#ffd700';
  if (ms < 250) return '#ff8c00';
  return '#ff4136';
}

function statusLabel(status: Region['status']): string {
  switch (status) {
    case 'idle': return 'STANDBY';
    case 'warmup': return 'WARM-UP';
    case 'measuring': return 'SAMPLING';
    case 'done': return 'NOMINAL';
    case 'error': return 'TIMEOUT';
  }
}

function statusColor(status: Region['status']): string {
  switch (status) {
    case 'idle': return '#4a5568';
    case 'warmup': return '#ffb700';
    case 'measuring': return '#00ff41';
    case 'done': return '#00ff41';
    case 'error': return '#ff4136';
  }
}

interface Props {
  region: Region;
  rank: number;
  accentColor: string;
}

export function RegionTile({ region, rank, accentColor }: Props) {
  const isFastest = rank === 0;
  const lColor = latencyColor(region.latency);
  const sColor = statusColor(region.status);
  const barPct =
    region.latency !== null
      ? Math.min(100, (region.latency / 400) * 100)
      : 0;

  const delta =
    region.latency !== null && region.prevLatency !== null
      ? region.latency - region.prevLatency
      : null;

  return (
    <motion.div
      layout
      transition={SPRING}
      className="relative overflow-hidden"
      style={{
        border: `2px solid ${isFastest ? accentColor : accentColor + '55'}`,
        background: isFastest ? `${accentColor}08` : '#070d07',
        boxShadow: isFastest
          ? `0 0 18px ${accentColor}40, inset 0 0 12px ${accentColor}10`
          : 'none',
        padding: '10px 14px',
        marginBottom: '6px',
      }}
    >
      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {isFastest && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-[10px] font-mono px-1 py-0 leading-tight"
              style={{
                border: `1px solid ${accentColor}`,
                color: accentColor,
                textShadow: `0 0 8px ${accentColor}`,
              }}
            >
              ◈ #1
            </motion.span>
          )}
          <span
            className="font-mono text-[13px] tracking-widest"
            style={{
              color: accentColor,
              textShadow: isFastest
                ? `0 0 8px ${accentColor}, 0 0 16px ${accentColor}80`
                : 'none',
            }}
          >
            {region.code}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono" style={{ color: '#4a5568' }}>
            {region.flag} {region.city}
          </span>
          <motion.span
            animate={
              region.status === 'measuring' || region.status === 'warmup'
                ? { opacity: [1, 0.2, 1] }
                : {}
            }
            transition={{ duration: 0.8, repeat: Infinity }}
            className="text-[10px] font-mono tracking-widest"
            style={{ color: sColor }}
          >
            [{statusLabel(region.status)}]
          </motion.span>
        </div>
      </div>

      {/* ── Latency bar ── */}
      <div
        className="w-full h-[4px] mb-2"
        style={{ background: '#111' }}
      >
        <motion.div
          className="h-full"
          animate={{ width: `${barPct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{
            background: lColor,
            boxShadow: `0 0 6px ${lColor}`,
          }}
        />
      </div>

      {/* ── RTT reading ── */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-mono" style={{ color: '#4a5568' }}>
            RTT MEDIAN
          </span>
          <div
            className="font-mono text-[22px] leading-none tracking-tight"
            style={{
              color: lColor,
              textShadow:
                region.latency !== null
                  ? `0 0 10px ${lColor}, 0 0 24px ${lColor}60`
                  : 'none',
            }}
          >
            {region.latency !== null
              ? `${region.latency.toFixed(1)}`
              : region.status === 'idle'
              ? '——'
              : '···'}
            {region.latency !== null && (
              <span
                className="text-[12px] ml-1"
                style={{ color: lColor + 'cc' }}
              >
                ms
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          {/* Sample count dots */}
          <div className="flex gap-[2px] justify-end mb-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-[5px] h-[5px]"
                style={{
                  background:
                    i < region.samples.length ? lColor : '#1a2a1a',
                  boxShadow:
                    i < region.samples.length ? `0 0 4px ${lColor}` : 'none',
                }}
              />
            ))}
          </div>
          {/* Delta indicator */}
          {delta !== null && Math.abs(delta) > 0.5 && (
            <span
              className="text-[10px] font-mono"
              style={{ color: delta < 0 ? '#00ff41' : '#ff4136' }}
            >
              {delta < 0 ? '▼' : '▲'} {Math.abs(delta).toFixed(1)}ms
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
