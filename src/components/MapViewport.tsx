import React, { useMemo, useRef, useState } from 'react';
import {
  Compass,
  Layers,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  DolSection10Parcel,
  LtaxBaseParcel,
  Point2D,
} from '../types/gis';
import { polygonCentroid, utmToLatLng } from '../utils/gisEngine';

interface MapViewportProps {
  dolParcels: DolSection10Parcel[];
  ltaxParcels: LtaxBaseParcel[];
  selectedParcelId: string | null;
  onSelectParcel: (id: string) => void;
  utmZone: 47 | 48;
  compareMode: 'overlay' | 'before' | 'after';
  onCompareModeChange: (mode: 'overlay' | 'before' | 'after') => void;
}

export const MapViewport: React.FC<MapViewportProps> = ({
  dolParcels,
  ltaxParcels,
  selectedParcelId,
  onSelectParcel,
  utmZone,
  compareMode,
  onCompareModeChange,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [showLtaxBase, setShowLtaxBase] = useState(true);
  const [showRawDol, setShowRawDol] = useState(true);
  const [showAdjusted, setShowAdjusted] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
  } | null>(null);
  const [cursorUtm, setCursorUtm] = useState<Point2D | null>(null);

  const SVG_W = 860;
  const SVG_H = 540;

  // Compute bounding box across all active geometries
  const bounds = useMemo(() => {
    const pts: Point2D[] = [];
    ltaxParcels.forEach((p) => pts.push(...p.polygon));
    dolParcels.forEach((p) => {
      pts.push(...p.rawPolygon);
      pts.push(...p.adjustedPolygon);
    });
    if (pts.length === 0) {
      return { minX: 674150, maxX: 674450, minY: 1555380, maxY: 1555560 };
    }
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padX = Math.max(15, (maxX - minX) * 0.12);
    const padY = Math.max(15, (maxY - minY) * 0.12);
    return {
      minX: minX - padX,
      maxX: maxX + padX,
      minY: minY - padY,
      maxY: maxY + padY,
    };
  }, [dolParcels, ltaxParcels]);

  const baseScale = useMemo(() => {
    const spanX = Math.max(10, bounds.maxX - bounds.minX);
    const spanY = Math.max(10, bounds.maxY - bounds.minY);
    return Math.min((SVG_W - 40) / spanX, (SVG_H - 40) / spanY);
  }, [bounds]);

  const activeScale = baseScale * zoom;

  const worldToScreen = (pt: Point2D) => {
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    return {
      x: SVG_W / 2 + (pt.x - cx) * activeScale + pan.x,
      y: SVG_H / 2 - (pt.y - cy) * activeScale + pan.y,
    };
  };

  const screenToWorld = (sx: number, sy: number): Point2D => {
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    return {
      x: cx + (sx - SVG_W / 2 - pan.x) / activeScale,
      y: cy - (sy - SVG_H / 2 - pan.y) / activeScale,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const sy = ((e.clientY - rect.top) / rect.height) * SVG_H;
    setCursorUtm(screenToWorld(sx, sy));

    if (dragging) {
      const dx = ((e.clientX - dragging.startX) / rect.width) * SVG_W;
      const dy = ((e.clientY - dragging.startY) / rect.height) * SVG_H;
      setPan({ x: dragging.origPanX + dx, y: dragging.origPanY + dy });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as HTMLElement).dataset?.parcelClick) return;
    setDragging({
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
    });
  };

  const handleMouseUp = () => setDragging(null);

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((z) => Math.min(6, Math.max(0.45, z * factor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Grid lines every 25m or 50m in UTM coordinates
  const gridLines = useMemo(() => {
    if (!showGrid) return { verticals: [], horizontals: [] };
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(SVG_W, SVG_H);
    const step = zoom > 2 ? 10 : zoom > 1 ? 25 : 50;

    const startX = Math.floor(topLeft.x / step) * step;
    const endX = Math.ceil(bottomRight.x / step) * step;
    const startY = Math.floor(bottomRight.y / step) * step;
    const endY = Math.ceil(topLeft.y / step) * step;

    const verticals: { worldX: number; screenX: number }[] = [];
    for (let x = startX; x <= endX && verticals.length < 30; x += step) {
      verticals.push({ worldX: x, screenX: worldToScreen({ x, y: startY }).x });
    }

    const horizontals: { worldY: number; screenY: number }[] = [];
    for (let y = startY; y <= endY && horizontals.length < 30; y += step) {
      horizontals.push({ worldY: y, screenY: worldToScreen({ x: startX, y }).y });
    }

    return { verticals, horizontals };
  }, [showGrid, zoom, pan, bounds, activeScale]);

  const effectiveShowLtax = compareMode === 'overlay' ? showLtaxBase : true;
  const effectiveShowRaw =
    compareMode === 'before' ? true : compareMode === 'after' ? false : showRawDol;
  const effectiveShowAdjusted =
    compareMode === 'before' ? false : compareMode === 'after' ? true : showAdjusted;

  const cursorLatLng = cursorUtm
    ? utmToLatLng(cursorUtm.x, cursorUtm.y, utmZone)
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-md">
            <button
              type="button"
              onClick={() => onCompareModeChange('overlay')}
              className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                compareMode === 'overlay'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ซ้อนชั้นข้อมูล
            </button>
            <button
              type="button"
              onClick={() => onCompareModeChange('before')}
              className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                compareMode === 'before'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ก่อนปรับ (มาตรา 10 ดิบ)
            </button>
            <button
              type="button"
              onClick={() => onCompareModeChange('after')}
              className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                compareMode === 'after'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              หลังปรับแผนที่
            </button>
          </div>
        </div>

        {/* Layer toggles */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
          <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
            <Layers className="w-3.5 h-3.5" />
            ชั้นข้อมูล:
          </span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showLtaxBase}
              onChange={(e) => setShowLtaxBase(e.target.checked)}
              className="rounded border-slate-300 text-blue-700"
            />
            <span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-slate-500" />
            <span>ฐาน LTAX เดิม</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showRawDol}
              onChange={(e) => setShowRawDol(e.target.checked)}
              className="rounded border-slate-300 text-amber-600"
            />
            <span className="inline-block w-2.5 h-2.5 border border-amber-600 bg-amber-500/20" />
            <span>มาตรา 10 (ก่อนปรับ)</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showAdjusted}
              onChange={(e) => setShowAdjusted(e.target.checked)}
              className="rounded border-slate-300 text-blue-700"
            />
            <span className="inline-block w-2.5 h-2.5 border border-blue-800 bg-blue-600/25" />
            <span>หลังปรับอัตโนมัติ</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showVectors}
              onChange={(e) => setShowVectors(e.target.checked)}
              className="rounded border-slate-300 text-slate-700"
            />
            <span>เวกเตอร์เลื่อน</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded border-slate-300 text-slate-700"
            />
            <span>กริด UTM</span>
          </label>
        </div>
      </div>

      {/* Main GIS SVG Viewport */}
      <div className="relative bg-slate-50">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className={`w-full h-[500px] block select-none ${
            dragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            handleMouseUp();
            setCursorUtm(null);
          }}
          onWheel={handleWheel}
        >
          {/* UTM Coordinate Grid */}
          {gridLines.verticals.map((v, i) => (
            <g key={`vx-${i}`}>
              <line
                x1={v.screenX}
                y1={0}
                x2={v.screenX}
                y2={SVG_H}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={v.screenX + 3}
                y={12}
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
                fill="#94a3b8"
              >
                {Math.round(v.worldX)}E
              </text>
            </g>
          ))}
          {gridLines.horizontals.map((h, i) => (
            <g key={`hy-${i}`}>
              <line
                x1={0}
                y1={h.screenY}
                x2={SVG_W}
                y2={h.screenY}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={6}
                y={h.screenY - 3}
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
                fill="#94a3b8"
              >
                {Math.round(h.worldY)}N
              </text>
            </g>
          ))}

          {/* Layer 1: LTAX Baseline Reference Parcels */}
          {effectiveShowLtax &&
            ltaxParcels.map((base) => {
              const pts = base.polygon
                .map((p) => {
                  const s = worldToScreen(p);
                  return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
                })
                .join(' ');
              const c = worldToScreen(polygonCentroid(base.polygon));
              return (
                <g key={`ltax-${base.parcelCode}`}>
                  <polygon
                    points={pts}
                    fill="#94a3b8"
                    fillOpacity="0.08"
                    stroke="#64748b"
                    strokeWidth="1.3"
                    strokeDasharray="5 3"
                  />
                  <text
                    x={c.x}
                    y={c.y + 11}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#64748b"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    เดิม:{base.parcelCode}
                  </text>
                </g>
              );
            })}

          {/* Layer 2: Incoming Raw DOL Section 10 Parcels */}
          {effectiveShowRaw &&
            dolParcels.map((parcel) => {
              const pts = parcel.rawPolygon
                .map((p) => {
                  const s = worldToScreen(p);
                  return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
                })
                .join(' ');
              const isSelected = parcel.id === selectedParcelId;
              return (
                <polygon
                  key={`raw-${parcel.id}`}
                  data-parcel-click="true"
                  onClick={() => onSelectParcel(parcel.id)}
                  points={pts}
                  fill="#f59e0b"
                  fillOpacity={isSelected ? '0.24' : '0.12'}
                  stroke="#d97706"
                  strokeWidth={isSelected ? '2' : '1.2'}
                  strokeDasharray="3 2"
                  className="cursor-pointer"
                />
              );
            })}

          {/* Layer 3: Adjusted Parcels */}
          {effectiveShowAdjusted &&
            dolParcels.map((parcel) => {
              const pts = parcel.adjustedPolygon
                .map((p) => {
                  const s = worldToScreen(p);
                  return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
                })
                .join(' ');
              const c = worldToScreen(polygonCentroid(parcel.adjustedPolygon));
              const isSelected = parcel.id === selectedParcelId;

              const fill =
                parcel.status === 'adjusted'
                  ? '#2563eb'
                  : parcel.status === 'split_new'
                  ? '#0284c7'
                  : parcel.status === 'area_mismatch'
                  ? '#dc2626'
                  : '#1d4ed8';

              const stroke =
                parcel.status === 'area_mismatch'
                  ? '#b91c1c'
                  : parcel.status === 'adjusted'
                  ? '#1e40af'
                  : '#1e3a8a';

              return (
                <g
                  key={`adj-${parcel.id}`}
                  onClick={() => onSelectParcel(parcel.id)}
                  className="cursor-pointer"
                >
                  <polygon
                    data-parcel-click="true"
                    points={pts}
                    fill={fill}
                    fillOpacity={isSelected ? '0.32' : '0.16'}
                    stroke={stroke}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                  />
                  {/* Vertices on selected parcel */}
                  {isSelected &&
                    parcel.adjustedPolygon.map((v, vi) => {
                      const sv = worldToScreen(v);
                      return (
                        <circle
                          key={vi}
                          cx={sv.x}
                          cy={sv.y}
                          r="3.2"
                          fill="#ffffff"
                          stroke="#1e3a8a"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  <text
                    data-parcel-click="true"
                    x={c.x}
                    y={c.y - 2}
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="600"
                    fill="#0f172a"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {parcel.ltaxParcelCode}
                  </text>
                  <text
                    data-parcel-click="true"
                    x={c.x}
                    y={c.y + 9}
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="#334155"
                  >
                    โฉนด {parcel.deedNo}
                  </text>
                </g>
              );
            })}

          {/* Layer 4: Displacement Vectors (Raw centroid -> Adjusted centroid) */}
          {showVectors &&
            compareMode === 'overlay' &&
            dolParcels.map((parcel) => {
              const cRaw = worldToScreen(polygonCentroid(parcel.rawPolygon));
              const cAdj = worldToScreen(
                polygonCentroid(parcel.adjustedPolygon)
              );
              const distPx = Math.hypot(cAdj.x - cRaw.x, cAdj.y - cRaw.y);
              if (distPx < 2) return null;
              return (
                <g key={`vec-${parcel.id}`} pointerEvents="none">
                  <line
                    x1={cRaw.x}
                    y1={cRaw.y}
                    x2={cAdj.x}
                    y2={cAdj.y}
                    stroke="#0f766e"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                  <circle cx={cRaw.x} cy={cRaw.y} r="2.2" fill="#d97706" />
                  <circle cx={cAdj.x} cy={cAdj.y} r="2.5" fill="#0f766e" />
                </g>
              );
            })}
        </svg>

        {/* Zoom & Compass Controls (Top Right) */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <div className="bg-white/95 border border-slate-200 rounded-md p-1.5 flex items-center justify-center shadow-xs">
            <Compass className="w-4 h-4 text-slate-700" />
            <span className="ml-1 text-[11px] font-semibold text-slate-700">N</span>
          </div>
          <div className="bg-white/95 border border-slate-200 rounded-md flex flex-col overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(6, z * 1.2))}
              className="p-1.5 hover:bg-slate-100 text-slate-700 border-b border-slate-200"
              title="ขยายแผนที่"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.45, z * 0.85))}
              className="p-1.5 hover:bg-slate-100 text-slate-700 border-b border-slate-200"
              title="ย่อแผนที่"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="p-1.5 hover:bg-slate-100 text-slate-700"
              title="พอดีขอบเขตแปลง"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Coordinate Status Bar (Bottom) */}
        <div className="px-4 py-2 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-4 font-mono-tabular">
            <span>ระบบพิกัด: WGS 84 / UTM Zone {utmZone}N</span>
            <span aria-hidden="true">·</span>
            <span>กำลังขยาย: {(zoom * 100).toFixed(0)}%</span>
          </div>
          <div className="font-mono-tabular text-slate-700">
            {cursorUtm && cursorLatLng ? (
              <span>
                E: {cursorUtm.x.toFixed(2)} m · N: {cursorUtm.y.toFixed(2)} m ·{' '}
                {cursorLatLng.lat.toFixed(6)}°N, {cursorLatLng.lng.toFixed(6)}°E
              </span>
            ) : (
              <span>เลื่อนเมาส์บนแผนที่เพื่อดูค่าพิกัด หรือคลิกแปลงเพื่อตรวจสอบ</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
