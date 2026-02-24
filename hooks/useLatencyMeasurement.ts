'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { INITIAL_REGIONS, Region } from '@/lib/regions';
import { pingEndpoint, computeMedian } from '@/lib/latency';

const WARMUP_COUNT = 5;
const MEASURE_COUNT = 10;
const LOOP_INTERVAL_MS = 35_000;

export function useLatencyMeasurement() {
  const [regions, setRegions] = useState<Region[]>(INITIAL_REGIONS);
  const stoppedRef = useRef(false);
  const cycleRef = useRef(0);

  const patchRegion = useCallback((id: string, patch: Partial<Region>) => {
    setRegions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }, []);

  const measureRegion = useCallback(
    async (region: Region) => {
      if (stoppedRef.current) return;

      patchRegion(region.id, {
        status: 'warmup',
        latency: null,
        samples: [],
      });

      // ── Warm-up pings (discarded) ───────────────────────────
      for (let i = 0; i < WARMUP_COUNT; i++) {
        if (stoppedRef.current) return;
        await pingEndpoint(region.endpoint, 3000);
      }

      if (stoppedRef.current) return;
      patchRegion(region.id, { status: 'measuring' });

      // ── Measurement pings ───────────────────────────────────
      const samples: number[] = [];
      for (let i = 0; i < MEASURE_COUNT; i++) {
        if (stoppedRef.current) return;
        const rtt = await pingEndpoint(region.endpoint, 5000);
        if (isFinite(rtt)) {
          samples.push(rtt);
          patchRegion(region.id, {
            latency: computeMedian(samples),
            samples: [...samples],
          });
        }
      }

      patchRegion(region.id, {
        status: samples.length > 0 ? 'done' : 'error',
        latency: computeMedian(samples),
        samples: [...samples],
      });
    },
    [patchRegion],
  );

  const runCycle = useCallback(async () => {
    if (stoppedRef.current) return;
    cycleRef.current += 1;

    // Snapshot prevLatency before new cycle overwrites it
    setRegions((prev) =>
      prev.map((r) => ({ ...r, prevLatency: r.latency })),
    );

    await Promise.all(INITIAL_REGIONS.map(measureRegion));
  }, [measureRegion]);

  useEffect(() => {
    stoppedRef.current = false;
    runCycle();
    const timer = setInterval(runCycle, LOOP_INTERVAL_MS);
    return () => {
      stoppedRef.current = true;
      clearInterval(timer);
    };
  }, [runCycle]);

  return { regions, cycle: cycleRef.current };
}
