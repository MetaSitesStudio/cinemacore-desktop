import React from "react";

export const ChristmasSnowOverlay = ({ active }: { active: boolean }) => {
  if (!active) return null;

  const flakes = Array.from({ length: 80 });

  return (
    <div
      className="
        pointer-events-none
        fixed inset-0
        z-[200]
        overflow-visible
      "
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
      }}
    >
      {flakes.map((_, i) => {
        const size = Math.random() * 3 + 2; // 2–5px
        const left = Math.random() * 100;
        const delay = Math.random() * 10;
        const duration = 8 + Math.random() * 10;

        return (
          <span
            key={i}
            className="snowflake absolute rounded-full bg-white/90"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${left}%`,
              top: `-${size * 2}px`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
};
