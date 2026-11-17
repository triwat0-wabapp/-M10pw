import { useMemo, useState } from 'react';
import {
  AlignmentParams,
  DolSection10Parcel,
  OrganizationConfig,
  PhorThor7Record,
} from './types/gis';
import {
  DEFAULT_ORG_CONFIG,
  INITIAL_DOL_SECTION10_PARCELS,
  INITIAL_LTAX_BASE_PARCELS,
} from './data/sampleSection10Data';
import {
  calibrateDatumShift,
  createPhorThor7FromParcel,
  polygonAreaSqMeters,
  runAutoMapAdjustment,
} from './utils/gisEngine';
import { Section10ImportView } from './components/Section10ImportView';
import { MapAlignmentView } from './components/MapAlignmentView';
import { PhorThor7BuilderView } from './components/PhorThor7BuilderView';
import { PrintReportView } from './components/PrintReportView';

type ActiveTab = 'import' | 'align' | 'pt7' | 'print';

const DEFAULT_ALIGNMENT_PARAMS: AlignmentParams = {
  dx: 0,
  dy: 0,
  rotationDeg: 0,
  scale: 1,
  snapToleranceMeters: 1.5,
  datumMode: 'auto_icp',
  isApplied: false,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('import');
  const [orgConfig, setOrgConfig] = useState<OrganizationConfig>(DEFAULT_ORG_CONFIG);
  const [ltaxBaseParcels] = useState(INITIAL_LTAX_BASE_PARCELS);
  const [dolParcels, setDolParcels] = useState<DolSection10Parcel[]>(
    INITIAL_DOL_SECTION10_PARCELS
  );
  const [alignmentParams, setAlignmentParams] = useState<AlignmentParams>(
    DEFAULT_ALIGNMENT_PARAMS
  );
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(
    INITIAL_DOL_SECTION10_PARCELS[0]?.id || null
  );

  // Pre-build initial Phor Thor 7 records for selected parcels
  const [pt7Records, setPt7Records] = useState<PhorThor7Record[]>(() =>
    INITIAL_DOL_SECTION10_PARCELS.filter((p) => p.selectedForPt7).map((p) =>
      createPhorThor7FromParcel(
        p,
        DEFAULT_ORG_CONFIG.fiscalYear,
        INITIAL_DOL_SECTION10_PARCELS
      )
    )
  );
  const [selectedPt7Id, setSelectedPt7Id] = useState<string | null>(
    pt7Records[0]?.id || null
  );
  const [printFocusId, setPrintFocusId] = useState<string | null>(null);

  const selectedCountForPt7 = useMemo(
    () => dolParcels.filter((p) => p.selectedForPt7).length,
    [dolParcels]
  );

  // Import new parcels (replace or append)
  const handleImportParcels = (
    imported: DolSection10Parcel[],
    mode: 'replace' | 'append'
  ) => {
    const nextList = mode === 'replace' ? imported : [...dolParcels, ...imported];
    setDolParcels(nextList);
    setAlignmentParams(DEFAULT_ALIGNMENT_PARAMS);
    if (nextList[0]) {
      setSelectedParcelId(nextList[0].id);
    }
    const nextPt7 = nextList
      .filter((p) => p.selectedForPt7)
      .map((p) => createPhorThor7FromParcel(p, orgConfig.fiscalYear, nextList));
    setPt7Records(nextPt7);
    setSelectedPt7Id(nextPt7[0]?.id || null);
  };

  const handleResetSample = () => {
    setDolParcels(INITIAL_DOL_SECTION10_PARCELS);
    setAlignmentParams(DEFAULT_ALIGNMENT_PARAMS);
    setSelectedParcelId(INITIAL_DOL_SECTION10_PARCELS[0]?.id || null);
    const nextPt7 = INITIAL_DOL_SECTION10_PARCELS.filter((p) => p.selectedForPt7).map(
      (p) =>
        createPhorThor7FromParcel(
          p,
          orgConfig.fiscalYear,
          INITIAL_DOL_SECTION10_PARCELS
        )
    );
    setPt7Records(nextPt7);
    setSelectedPt7Id(nextPt7[0]?.id || null);
  };

  const handleToggleSelectForPt7 = (id: string) => {
    setDolParcels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selectedForPt7: !p.selectedForPt7 } : p))
    );
  };

  const handleSelectAllForPt7 = (selected: boolean) => {
    setDolParcels((prev) => prev.map((p) => ({ ...p, selectedForPt7: selected })));
  };

  // Automatic GIS calibration & snapping
  const handleAutoAlignAll = () => {
    const calibrated = calibrateDatumShift(dolParcels, ltaxBaseParcels);
    const nextParams: AlignmentParams = {
      dx: calibrated.matchedPairs > 0 ? calibrated.dx : 16.5,
      dy: calibrated.matchedPairs > 0 ? calibrated.dy : -22.8,
      rotationDeg: calibrated.rotationDeg,
      scale: 1,
      snapToleranceMeters: alignmentParams.snapToleranceMeters || 1.5,
      datumMode: 'auto_icp',
      isApplied: true,
    };
    const adjusted = runAutoMapAdjustment(dolParcels, ltaxBaseParcels, nextParams);
    setAlignmentParams(nextParams);
    setDolParcels(adjusted);

    // Sync adjusted polygons into existing Pt.7 records
    setPt7Records((prev) =>
      prev.map((rec) => {
        const match = adjusted.find((p) => p.id === rec.parcelId);
        return match
          ? {
              ...rec,
              polygon: match.adjustedPolygon.map((pt) => ({ ...pt })),
              approved: match.status === 'adjusted',
            }
          : rec;
      })
    );
  };

  const handleUpdateAlignmentParams = (nextParams: AlignmentParams) => {
    setAlignmentParams(nextParams);
    const adjusted = runAutoMapAdjustment(dolParcels, ltaxBaseParcels, nextParams);
    setDolParcels(adjusted);
  };

  const handleResetAlignment = () => {
    setAlignmentParams(DEFAULT_ALIGNMENT_PARAMS);
    setDolParcels((prev) =>
      prev.map((p) => ({
        ...p,
        adjustedPolygon: p.rawPolygon.map((pt) => ({ ...pt })),
        status: p.note.includes('แบ่งแยก') || p.note.includes('ออกโฉนดใหม่') ? 'split_new' : 'shifted',
        snappedVerticesCount: 0,
      }))
    );
  };

  const handleNudgeSingleParcel = (id: string, dx: number, dy: number) => {
    setDolParcels((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nudged = p.adjustedPolygon.map((pt) => ({
          x: Math.round((pt.x + dx) * 100) / 100,
          y: Math.round((pt.y + dy) * 100) / 100,
        }));
        const calcSqWa = Math.round((polygonAreaSqMeters(nudged) / 4) * 100) / 100;
        return {
          ...p,
          adjustedPolygon: nudged,
          calculatedSqWa: calcSqWa,
        };
      })
    );
  };

  const handleApproveSingleParcel = (id: string) => {
    setDolParcels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'adjusted' } : p))
    );
  };

  // Extract selected Section 10 parcels -> Form Phor Thor 7
  const handleExtractToPt7 = () => {
    const selected = dolParcels.filter((p) => p.selectedForPt7);
    const source = selected.length > 0 ? selected : dolParcels;
    const generated = source.map((p) =>
      createPhorThor7FromParcel(p, orgConfig.fiscalYear, dolParcels)
    );
    setPt7Records(generated);
    setSelectedPt7Id(generated[0]?.id || null);
    setActiveTab('pt7');
  };

  const handleUpdatePt7Record = (updated: PhorThor7Record) => {
    setPt7Records((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleUpdateOrgConfig = (next: OrganizationConfig) => {
    setOrgConfig(next);
    setPt7Records((prev) =>
      prev.map((r) => ({ ...r, fiscalYear: next.fiscalYear }))
    );
  };

  const handleGoToPrint = (recordId?: string) => {
    setPrintFocusId(recordId || null);
    setActiveTab('print');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 3-Zone Top Bar Contract (No print) */}
      <header className="no-print bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8 sticky top-0 z-30">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left"
        >
          ระบบปรับมาตรา 10 และจัดทำ ผท.7
        </button>

        {/* Zone 2: 4 concise single-line workflow tabs */}
        <nav className="flex items-center gap-6 text-sm font-medium overflow-x-auto">
          {[
            { id: 'import', label: '1. นำเข้ามาตรา 10' },
            { id: 'align', label: '2. ปรับแผนที่อัตโนมัติ' },
            { id: 'pt7', label: '3. ดึงข้อมูลสร้าง ผท.7' },
            { id: 'print', label: '4. พิมพ์รายงาน' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                  isActive
                    ? 'text-blue-800 border-blue-800 font-semibold'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => handleGoToPrint()}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-900 whitespace-nowrap shrink-0 transition-colors"
          >
            พิมพ์แบบ ผท.7 ({pt7Records.length})
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 print-only-container">
        {/* Sub-bar context breadcrumb (hidden in print) */}
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span>{orgConfig.municipalityName}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>อ.{orgConfig.district} จ.{orgConfig.province}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="tabular-nums">ปีภาษี พ.ศ. {orgConfig.fiscalYear}</span>
          </div>
          <div className="tabular-nums">
            เลือกทำ ผท.7 จำนวน {selectedCountForPt7} จาก {dolParcels.length} แปลง
          </div>
        </div>

        {activeTab === 'import' && (
          <Section10ImportView
            parcels={dolParcels}
            utmZone={orgConfig.utmZone}
            onImportParcels={handleImportParcels}
            onResetSample={handleResetSample}
            onToggleSelectForPt7={handleToggleSelectForPt7}
            onSelectAllForPt7={handleSelectAllForPt7}
            onProceedToMap={() => setActiveTab('align')}
          />
        )}

        {activeTab === 'align' && (
          <MapAlignmentView
            dolParcels={dolParcels}
            ltaxParcels={ltaxBaseParcels}
            alignmentParams={alignmentParams}
            utmZone={orgConfig.utmZone}
            selectedParcelId={selectedParcelId}
            onSelectParcel={setSelectedParcelId}
            onAutoAlignAll={handleAutoAlignAll}
            onUpdateParams={handleUpdateAlignmentParams}
            onResetAlignment={handleResetAlignment}
            onNudgeSingleParcel={handleNudgeSingleParcel}
            onApproveSingleParcel={handleApproveSingleParcel}
            onExtractToPt7={handleExtractToPt7}
          />
        )}

        {activeTab === 'pt7' && (
          <PhorThor7BuilderView
            records={pt7Records}
            orgConfig={orgConfig}
            selectedRecordId={selectedPt7Id}
            onSelectRecord={setSelectedPt7Id}
            onRegenerateAllFromSection10={handleExtractToPt7}
            onUpdateRecord={handleUpdatePt7Record}
            onUpdateOrgConfig={handleUpdateOrgConfig}
            onGoToPrint={handleGoToPrint}
          />
        )}

        {activeTab === 'print' && (
          <PrintReportView
            records={pt7Records}
            dolParcels={dolParcels}
            orgConfig={orgConfig}
            initialFocusRecordId={printFocusId}
          />
        )}
      </main>
    </div>
  );
}
