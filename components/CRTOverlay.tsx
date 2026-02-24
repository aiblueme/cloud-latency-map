'use client';

export function CRTOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] select-none"
    >
      {/* Scanlines */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(to bottom, transparent 0px, transparent 1px, rgba(0,0,0,0.20) 1px, rgba(0,0,0,0.20) 2px)',
        }}
      />

      {/* Screen vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,0.80) 100%)',
        }}
      />

      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  );
}
