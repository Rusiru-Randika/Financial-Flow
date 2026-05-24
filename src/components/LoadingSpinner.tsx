import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
}) => {
  const sizes = {
    sm: { ring: 28, inner: 18, dot: 4 },
    md: { ring: 52, inner: 34, dot: 6 },
    lg: { ring: 80, inner: 54, dot: 8 },
  };

  const s = sizes[size];

  return (
    <div className="ff-loader-wrap">
      <div
        className="ff-loader-ring"
        style={{ width: s.ring, height: s.ring }}
      >
        {/* Outer gradient spinning arc */}
        <div className="ff-loader-arc" style={{ width: s.ring, height: s.ring }} />

        {/* Inner pulsing core */}
        <div
          className="ff-loader-core"
          style={{ width: s.inner, height: s.inner }}
        />

        {/* Orbiting dot */}
        <div
          className="ff-loader-orbit"
          style={{ width: s.ring, height: s.ring }}
        >
          <div
            className="ff-loader-dot"
            style={{ width: s.dot, height: s.dot }}
          />
        </div>
      </div>

      {label && <p className="ff-loader-label">{label}</p>}
    </div>
  );
};
