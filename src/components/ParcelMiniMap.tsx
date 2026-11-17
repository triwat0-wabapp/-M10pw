import React from 'react';
import { Point2D } from '../types/gis';
import { distance2D, polygonCentroid } from '../utils/gisEngine';

interface ParcelMiniMapProps {
  polygon: Point2D[];
  parcelCode: string;
  neighborLabels?: string[];
  width?: number;
  height?: number;
  showDimensions?: boolean;
}

export const ParcelMiniMap: React.FC<ParcelMiniMapProps> = ({
  polygon,
  parcelCode,
  neighborLabels = [],
  width = 240,
  height = 170,
  showDimensions = true,
}) => {
  if (!polygon || polygon.length < 3) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center border border-slate-300 bg-slate-50 text-xs text-slate-500"
      >
        ไม่มีข้อมูลรูปแปลง
      </div>
    );
  }

  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = Math.max(10, maxX - minX);
  const spanY = Math.max(10, maxY - minY);
  const pad = 28;
  const drawW = width - pad * 2;
  const drawH = height - pad * 2;
  const scale = Math.min(drawW / spanX, drawH / spanY);

  const offsetX = pad + (drawW - spanX * scale) / 2;
  const offsetY = pad + (drawH - spanY * scale) / 2;

  const toSvg = (pt: Point2D) => ({
    x: offsetX + (pt.x - minX) * scale,
    y: height - (offsetY + (pt.y - minY) * scale),
  });

  const svgPts = polygon.map(toSvg);
  const pointsAttr = svgPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const centroid = toSvg(polygonCentroid(polygon));

  // Scale bar calculation in meters
  const targetMeters = Math.max(5, Math.round((45 / scale) / 5) * 5 || 10);
  const barPx = targetMeters * scale;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="bg-white border border-slate-400 select-none"
      role="img"
      aria-label={`แผนผังรูปแปลงที่ดินรหัส ${parcelCode}`}
    >
      {/* Subtle cartographic grid */}
      <defs>
        <pattern
          id={`grid-${parcelCode.replace(/[^a-zA-Z0-9]/g, '')}`}
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="0.6"
          />
        </pattern>
      </defs>
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        fill={`url(#grid-${parcelCode.replace(/[^a-zA-Z0-9]/g, '')})`}
      />

      {/* Neighbor context labels */}
      {neighborLabels[0] && (
        <text x={width / 2} y="14" textAnchor="middle" fontSize="8" fill="#64748b">
          ทิศเหนือติดแปลง {neighborLabels[0]}
        </text>
      )}
      {neighborLabels[1] && (
        <text x={width / 2} y={height - 6} textAnchor="middle" fontSize="8" fill="#64748b">
          ทิศใต้ติดแปลง {neighborLabels[1]}
        </text>
      )}

      {/* Parcel polygon */}
      <polygon
        points={pointsAttr}
        fill="#dbeafe"
        fillOpacity="0.65"
        stroke="#1e3a8a"
        strokeWidth="1.8"
      />

      {/* Vertices */}
      {svgPts.map((pt, i) => (
        <circle
          key={i}
          cx={pt.x}
          cy={pt.y}
          r="2.2"
          fill="#ffffff"
          stroke="#1e3a8a"
          strokeWidth="1.2"
        />
      ))}

      {/* Edge length annotations (meters) */}
      {showDimensions &&
        polygon.map((pt, i) => {
          const next = polygon[(i + 1) % polygon.length];
          const lenM = distance2D(pt, next);
          if (lenM < 4) return null;
          const a = svgPts[i];
          const b = svgPts[(i + 1) % svgPts.length];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return (
            <g key={`dim-${i}`}>
              <rect
                x={mx - 14}
                y={my - 6}
                width="28"
                height="11"
                fill="#ffffff"
                fillOpacity="0.85"
              />
              <text
                x={mx}
                y={my + 2.5}
                textAnchor="middle"
                fontSize="8"
                fontFamily="IBM Plex Mono, monospace"
                fill="#334155"
              >
                {lenM.toFixed(1)}ม.
              </text>
            </g>
          );
        })}

      {/* Center Parcel Code */}
      <text
        x={centroid.x}
        y={centroid.y + 3}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="#0f172a"
      >
        {parcelCode}
      </text>

      {/* North Arrow (top right) */}
      <g transform={`translate(${width - 20}, 24)`}>
        <polygon points="0,-10 4,3 0,0 -4,3" fill="#0f172a" />
        <text
          x="0"
          y="-12"
          textAnchor="middle"
          fontSize="8"
          fontWeight="700"
          fill="#0f172a"
        >
          N
        </text>
      </g>

      {/* Scale bar (bottom left) */}
      <g transform={`translate(10, ${height - 16})`}>
        <line x1="0" y1="0" x2={Math.min(70, barPx)} y2="0" stroke="#0f172a" strokeWidth="1.4" />
        <line x1="0" y1="-3" x2="0" y2="3" stroke="#0f172a" strokeWidth="1.2" />
        <line
          x1={Math.min(70, barPx)}
          y1="-3"
          x2={Math.min(70, barPx)}
          y2="3"
          stroke="#0f172a"
          strokeWidth="1.2"
        />
        <text x={Math.min(70, barPx) + 4} y="3" fontSize="8" fill="#334155">
          {targetMeters} ม.
        </text>
      </g>
    </svg>
  );
};
