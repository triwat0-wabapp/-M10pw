import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Crosshair,
  Download,
  FileCheck2,
  RotateCcw,
  SlidersHorizontal,
  Wand2,
} from 'lucide-react';
import {
  AlignmentParams,
  DolSection10Parcel,
  LtaxBaseParcel,
} from '../types/gis';
import { exportAdjustedGeoJSON } from '../utils/fileParsers';
import { MapViewport } from './MapViewport';
import { ParcelMiniMap } from './ParcelMiniMap';

interface MapAlignmentViewProps {
  dolParcels: DolSection10Parcel[];
  ltaxParcels: LtaxBaseParcel[];
  alignmentParams: AlignmentParams;
  utmZone: 47 | 48;
  selectedParcelId: string | null;
  onSelectParcel: (id: string) => void;
  onAutoAlignAll: () => void;
  onUpdateParams: (next: AlignmentParams) => void;
  onResetAlignment: () => void;
  onNudgeSingleParcel: (id: string, dx: number, dy: number) => void;
  onApproveSingleParcel: (id: string) => void;
  onExtractToPt7: () => void;
}

export const MapAlignmentView: React.FC<MapAlignmentViewProps> = ({
  dolParcels,
  ltaxParcels,
  alignmentParams,
  utmZone,
  selectedParcelId,
  onSelectParcel,
  onAutoAlignAll,
  onUpdateParams,
  onResetAlignment,
  onNudgeSingleParcel,
  onApproveSingleParcel,
  onExtractToPt7,
}) => {
  const [compareMode, setCompareMode] = useState<'overlay' | 'before' | 'after'>('overlay');

  const selectedParcel = useMemo(
    () => dolParcels.find((p) => p.id === selectedParcelId) || dolParcels[0] || null,
    [dolParcels, selectedParcelId]
  );

  const summary = useMemo(() => {
    const adjustedCount = dolParcels.filter((p) => p.status === 'adjusted').length;
    const totalSnapped = dolParcels.reduce((s, p) => s + p.snappedVerticesCount, 0);
    const avgShift =
      dolParcels.length > 0
        ? dolParcels.reduce((s, p) => s + p.shiftDistanceM, 0) / dolParcels.length
        : 0;
    const mismatchCount = dolParcels.filter((p) => p.areaDiffPercent > 10).length;
    return { adjustedCount, totalSnapped, avgShift, mismatchCount };
  }, [dolParcels]);

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="bg-white border border-slate-200 rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            ปรับแนวแผนที่ภาษีอัตโนมัติ (GIS Datum Calibration & Topology Snap)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            จับคู่พิกัดแปลงมาตรา 10 กับฐานแผนที่ LTAX เดิม คำนวณค่าเลื่อนแกนอัตโนมัติและสแนปจุดต่อมุมแปลง
            · ปรับแล้ว {summary.adjustedCount}/{dolParcels.length} แปลง
            · จุดสแนปรวม {summary.totalSnapped} จุด
            · ค่าคลาดเคลื่อนเฉลี่ย {summary.avgShift.toFixed(1)} ม.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onResetAlignment}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            คืนค่าพิกัดดิบ
          </button>
          <button
            type="button"
            onClick={() => exportAdjustedGeoJSON(dolParcels, utmZone)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            ส่งออก GeoJSON
          </button>
          <button
            type="button"
            onClick={onAutoAlignAll}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-900 whitespace-nowrap shrink-0"
          >
            <Wand2 className="w-3.5 h-3.5" />
            คำนวณและปรับแผนที่อัตโนมัติ
          </button>
          <button
            type="button"
            onClick={onExtractToPt7}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 whitespace-nowrap shrink-0"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            ดึงข้อมูลสร้าง ผท.7
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left: Interactive GIS Map Viewport */}
        <div className="xl:col-span-8">
          <MapViewport
            dolParcels={dolParcels}
            ltaxParcels={ltaxParcels}
            selectedParcelId={selectedParcel?.id || null}
            onSelectParcel={onSelectParcel}
            utmZone={utmZone}
            compareMode={compareMode}
            onCompareModeChange={setCompareMode}
          />
        </div>

        {/* Right: Parameters & Selected Parcel Geometry Inspector */}
        <div className="xl:col-span-4 space-y-4">
          {/* Calibration Parameters Panel */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <SlidersHorizontal className="w-4 h-4 text-blue-800" />
                พารามิเตอร์ปรับแก้แนวแผนที่
              </div>
              <span className="text-xs font-medium text-slate-500">
                {alignmentParams.isApplied ? 'ใช้งานแล้ว' : 'ยังไม่ปรับแก้'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">เลื่อนแกนตะวันออก (ΔX Easting)</span>
                  <span className="font-mono-tabular font-medium text-slate-900">
                    {alignmentParams.dx >= 0 ? '+' : ''}
                    {alignmentParams.dx.toFixed(2)} ม.
                  </span>
                </div>
                <input
                  type="range"
                  min={-40}
                  max={40}
                  step={0.1}
                  value={alignmentParams.dx}
                  onChange={(e) =>
                    onUpdateParams({
                      ...alignmentParams,
                      dx: Number(e.target.value),
                      datumMode: 'manual',
                      isApplied: true,
                    })
                  }
                  className="w-full accent-blue-800"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">เลื่อนแกนเหนือ (ΔY Northing)</span>
                  <span className="font-mono-tabular font-medium text-slate-900">
                    {alignmentParams.dy >= 0 ? '+' : ''}
                    {alignmentParams.dy.toFixed(2)} ม.
                  </span>
                </div>
                <input
                  type="range"
                  min={-40}
                  max={40}
                  step={0.1}
                  value={alignmentParams.dy}
                  onChange={(e) =>
                    onUpdateParams({
                      ...alignmentParams,
                      dy: Number(e.target.value),
                      datumMode: 'manual',
                      isApplied: true,
                    })
                  }
                  className="w-full accent-blue-800"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">มุมหมุนปรับแก้ระวาง (Rotation)</span>
                  <span className="font-mono-tabular font-medium text-slate-900">
                    {alignmentParams.rotationDeg.toFixed(3)}°
                  </span>
                </div>
                <input
                  type="range"
                  min={-2}
                  max={2}
                  step={0.01}
                  value={alignmentParams.rotationDeg}
                  onChange={(e) =>
                    onUpdateParams({
                      ...alignmentParams,
                      rotationDeg: Number(e.target.value),
                      datumMode: 'manual',
                      isApplied: true,
                    })
                  }
                  className="w-full accent-blue-800"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">ระยะสแนปจุดต่อมุมแปลง (Snap Tolerance)</span>
                  <span className="font-mono-tabular font-medium text-slate-900">
                    {alignmentParams.snapToleranceMeters.toFixed(1)} ม.
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.2}
                  value={alignmentParams.snapToleranceMeters}
                  onChange={(e) =>
                    onUpdateParams({
                      ...alignmentParams,
                      snapToleranceMeters: Number(e.target.value),
                      isApplied: true,
                    })
                  }
                  className="w-full accent-blue-800"
                />
              </div>
            </div>
          </div>

          {/* Selected Parcel Inspector */}
          {selectedParcel && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Crosshair className="w-4 h-4 text-blue-800" />
                  แปลงที่เลือก: {selectedParcel.ltaxParcelCode}
                </div>
                <span className="text-xs font-mono-tabular text-slate-500">
                  โฉนด {selectedParcel.deedNo}
                </span>
              </div>

              <div className="flex justify-center">
                <ParcelMiniMap
                  polygon={selectedParcel.adjustedPolygon}
                  parcelCode={selectedParcel.ltaxParcelCode}
                  width={290}
                  height={160}
                />
              </div>

              <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs pt-1">
                <div>
                  <div className="text-slate-500">ผู้ถือกรรมสิทธิ์</div>
                  <div className="font-medium text-slate-900 truncate">
                    {selectedParcel.ownerName}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">ระวาง / เลขที่ดิน</div>
                  <div className="font-mono-tabular text-slate-900">
                    {selectedParcel.landNo} / หน้าสำรวจ {selectedParcel.surveyNo}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">เนื้อที่ตามมาตรา 10</div>
                  <div className="font-mono-tabular font-medium text-slate-900">
                    {selectedParcel.dolSqWa.toLocaleString('th-TH')} ตร.วา
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">เนื้อที่คำนวณจาก GIS</div>
                  <div
                    className={`font-mono-tabular font-medium ${
                      selectedParcel.areaDiffPercent > 10
                        ? 'text-red-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {selectedParcel.calculatedSqWa.toLocaleString('th-TH')} ตร.วา (ต่าง{' '}
                    {selectedParcel.areaDiffPercent}%)
                  </div>
                </div>
              </div>

              {/* Fine Nudge Controls for individual parcel */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500 mb-2">
                  ขยับตำแหน่งเฉพาะแปลงนี้ (±0.5 เมตร)
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onNudgeSingleParcel(selectedParcel.id, -0.5, 0)}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50"
                    >
                      ซ้าย
                    </button>
                    <button
                      type="button"
                      onClick={() => onNudgeSingleParcel(selectedParcel.id, 0.5, 0)}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50"
                    >
                      ขวา
                    </button>
                    <button
                      type="button"
                      onClick={() => onNudgeSingleParcel(selectedParcel.id, 0, 0.5)}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50"
                    >
                      ขึ้น
                    </button>
                    <button
                      type="button"
                      onClick={() => onNudgeSingleParcel(selectedParcel.id, 0, -0.5)}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50"
                    >
                      ลง
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApproveSingleParcel(selectedParcel.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-300 bg-emerald-50 rounded hover:bg-emerald-100 whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ยืนยันแปลง
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
