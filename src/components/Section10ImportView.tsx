import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderUp,
  RotateCcw,
  Search,
} from 'lucide-react';
import { DolSection10Parcel } from '../types/gis';
import { getLandUseLabel } from '../utils/gisEngine';
import { parseSection10File } from '../utils/fileParsers';
import { LandsMapLookup } from './LandsMapLookup';

interface Section10ImportViewProps {
  parcels: DolSection10Parcel[];
  utmZone: 47 | 48;
  onImportParcels: (imported: DolSection10Parcel[], mode: 'replace' | 'append') => void;
  onResetSample: () => void;
  onToggleSelectForPt7: (id: string) => void;
  onSelectAllForPt7: (selected: boolean) => void;
  onProceedToMap: () => void;
}

function StatusLabel({ status }: { status: DolSection10Parcel['status'] }) {
  switch (status) {
    case 'adjusted':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ปรับแผนที่แล้ว
        </span>
      );
    case 'shifted':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          พิกัดคลาดเคลื่อน
        </span>
      );
    case 'split_new':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          แปลงแบ่งแยก/เกิดใหม่
        </span>
      );
    case 'area_mismatch':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          เนื้อที่ต่างจากเดิม
        </span>
      );
    case 'matched':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          จับคู่ตรงกัน
        </span>
      );
  }
}

export const Section10ImportView: React.FC<Section10ImportViewProps> = ({
  parcels,
  utmZone,
  onImportParcels,
  onResetSample,
  onToggleSelectForPt7,
  onSelectAllForPt7,
  onProceedToMap,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const filteredParcels = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return parcels.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.ltaxParcelCode.toLowerCase().includes(q) ||
        p.deedNo.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        p.landNo.toLowerCase().includes(q)
      );
    });
  }, [parcels, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = parcels.length;
    const shifted = parcels.filter((p) => p.status === 'shifted').length;
    const splitNew = parcels.filter((p) => p.status === 'split_new').length;
    const adjusted = parcels.filter((p) => p.status === 'adjusted').length;
    const totalSqWa = parcels.reduce((sum, p) => sum + p.dolSqWa, 0);
    return { total, shifted, splitNew, adjusted, totalSqWa };
  }, [parcels]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const parsed = await parseSection10File(files[0], utmZone);
      onImportParcels(parsed, importMode);
      setUploadSuccess(
        `นำเข้าข้อมูลมาตรา 10/KMZ จากไฟล์ "${files[0].name}" สำเร็จ จำนวน ${parsed.length} แปลง`
      );
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLandsMapParcel = (newParcel: DolSection10Parcel) => {
    onImportParcels([newParcel], 'append');
  };

  const downloadSampleGeoJson = () => {
    const sample = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            PARCEL_CODE: '01B001',
            DEED_TYPE: 'โฉนดที่ดิน',
            DEED_NO: '99101',
            UTMMAP: '5137 III 6854-04',
            LAND_NO: '401',
            SURVEY_NO: '5101',
            OWNER_NAME: 'นายกิตติพงษ์ ภักดี',
            OWNER_ID: '1-1301-00554-10-2',
            OWNER_ADDR: '18/2 ม.3 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี',
            RAI: 0,
            NGAN: 2,
            WA: 50,
            LAND_USE: 'อยู่อาศัย',
            ASSESS_VAL: 14000,
            BLDG_TYPE: 'บ้านพักอาศัย คสล. 2 ชั้น',
            HOUSE_NO: '18/2',
            BLDG_AREA: 180,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [674183.5, 1555512.8],
                [674223.5, 1555512.8],
                [674223.5, 1555537.8],
                [674183.5, 1555537.8],
                [674183.5, 1555512.8],
              ],
            ],
          },
        },
      ],
    };
    const blob = new Blob([JSON.stringify(sample, null, 2)], {
      type: 'application/geo+json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_section10_dol.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };

  const allSelected =
    filteredParcels.length > 0 && filteredParcels.every((p) => p.selectedForPt7);

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">รายการแปลงมาตรา 10 ทั้งหมด</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
            {stats.total} แปลง
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            เนื้อที่รวม {stats.totalSqWa.toLocaleString('th-TH')} ตร.วา
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">แปลงพิกัดคลาดเคลื่อนรอปรับ</div>
          <div className="mt-1 text-2xl font-semibold text-amber-700 tabular-nums">
            {stats.shifted} แปลง
          </div>
          <div className="mt-1 text-xs text-slate-500">
            ต้องเทียบค่า Datum จากฐาน LTAX
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">แปลงแบ่งแยก / ออกโฉนดใหม่</div>
          <div className="mt-1 text-2xl font-semibold text-sky-700 tabular-nums">
            {stats.splitNew} แปลง
          </div>
          <div className="mt-1 text-xs text-slate-500">
            พร้อมออกรหัสแปลงและ ผท.7 ใหม่
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">ปรับแนวแผนที่เสร็จสมบูรณ์</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700 tabular-nums">
            {stats.adjusted} แปลง
          </div>
          <div className="mt-1 text-xs text-slate-500">
            ผ่านการสแนปขอบเขตและตรวจเนื้อที่
          </div>
        </div>
      </div>

      {/* LandsMap Deed Lookup Component */}
      <LandsMapLookup onAddParcel={handleAddLandsMapParcel} utmZone={utmZone} />

      {/* Upload / Import Box (.kmz, .kml, .zip, .geojson, .csv) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              นำเข้าไฟล์แผนที่ KMZ / KML / Shapefile / GeoJSON จากกรมที่ดิน
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              รองรับไฟล์ Google Earth KMZ/KML, Shapefile (.zip), GeoJSON (.geojson) หรือ CSV พร้อมพิกัด
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                  importMode === 'replace'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                แทนที่ชุดปัจจุบัน
              </button>
              <button
                type="button"
                onClick={() => setImportMode('append')}
                className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                  importMode === 'append'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เพิ่มต่อท้ายรายการ
              </button>
            </div>
            <button
              type="button"
              onClick={downloadSampleGeoJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              ดาวน์โหลดไฟล์ตัวอย่าง GeoJSON
            </button>
            <button
              type="button"
              onClick={() => {
                onResetSample();
                setUploadError(null);
                setUploadSuccess('โหลดชุดข้อมูลตัวอย่างเทศบาลตำบลคลองหลวง (12 แปลง) เรียบร้อยแล้ว');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              รีเซ็ตชุดข้อมูลตัวอย่าง
            </button>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`border border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging
              ? 'border-blue-600 bg-blue-50/50'
              : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".kmz,.kml,.zip,.geojson,.json,.csv"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="flex flex-col items-center gap-2">
            <FolderUp className="w-7 h-7 text-blue-700" />
            <div className="text-sm font-medium text-slate-800">
              ลากไฟล์ KMZ, KML, ZIP (Shapefile) หรือ GeoJSON มาวางที่นี่
            </div>
            <div className="text-xs text-slate-500">
              รองรับ: .kmz, .kml · Shapefile (.zip) · GeoJSON (.geojson, .json) · CSV
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-4 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-900 whitespace-nowrap shrink-0"
            >
              เลือกไฟล์แผนที่ (KMZ / Shapefile)
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
        {uploadSuccess && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}
      </div>

      {/* Section 10 Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              บัญชีรายการที่ดินตามมาตรา 10 ({filteredParcels.length} แปลง)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหารหัสแปลง / เลขโฉนด / ชื่อเจ้าของ..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md w-64 focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              {[
                { key: 'all', label: 'ทั้งหมด' },
                { key: 'shifted', label: 'พิกัดเลื่อน' },
                { key: 'split_new', label: 'แบ่งแยกใหม่' },
                { key: 'area_mismatch', label: 'เนื้อที่ต่าง' },
                { key: 'adjusted', label: 'ปรับแล้ว' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                    statusFilter === tab.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onProceedToMap}
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-900 whitespace-nowrap shrink-0"
            >
              ไปขั้นตอนปรับแผนที่อัตโนมัติ
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAllForPt7(e.target.checked)}
                    aria-label="เลือกทั้งหมดสำหรับ ผท.7"
                    className="rounded border-slate-300 text-blue-700"
                  />
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">รหัสแปลง (อปท.)</th>
                <th className="py-2.5 px-3 whitespace-nowrap">เอกสารสิทธิ์ / เลขที่</th>
                <th className="py-2.5 px-3 whitespace-nowrap">เลขที่ดิน / หน้าสำรวจ</th>
                <th className="py-2.5 px-3 whitespace-nowrap">ผู้ถือกรรมสิทธิ์</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">ไร่-งาน-วา (ม.10)</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">รวม (ตร.วา)</th>
                <th className="py-2.5 px-3 whitespace-nowrap">การใช้ประโยชน์</th>
                <th className="py-2.5 px-3 whitespace-nowrap">สถานะแผนที่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredParcels.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    ไม่พบรายการแปลงที่ดินที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredParcels.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={p.selectedForPt7}
                        onChange={() => onToggleSelectForPt7(p.id)}
                        className="rounded border-slate-300 text-blue-700"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                      {p.ltaxParcelCode}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                      {p.deedType} · <span className="font-mono-tabular">{p.deedNo}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-600 whitespace-nowrap">
                      {p.landNo} / {p.surveyNo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 max-w-[220px] truncate">
                      {p.ownerName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-700 whitespace-nowrap">
                      {p.rai}-{p.ngan}-{p.sqWa}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-tabular font-medium text-slate-900 whitespace-nowrap">
                      {p.dolSqWa.toLocaleString('th-TH', { maximumFractionDigits: 1 })}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {getLandUseLabel(p.landUse)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StatusLabel status={p.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
