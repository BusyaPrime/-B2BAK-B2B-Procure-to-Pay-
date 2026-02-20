"use client";

export function LightRaysBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
      <div className="light-ray light-ray-primary" />
      <div className="light-ray light-ray-accent" />
    </div>
  );
}
