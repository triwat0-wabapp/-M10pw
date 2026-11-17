import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Download,
  FilePlus2,
  Printer,
  Search,
  Settings2,
} from 'lucide-react';
import {
  LandUseType,
  OrganizationConfig,
  PhorThor7Record,
} from '../types/gis';
import { exportPhorThor7CSV } from '../utils/fileParsers';
import {
  computeBuildingNetValue,
  getDefaultTaxRate,
  getLandUseLabel,
} from '../utils/gisEngine';
import { ParcelMiniMap } from './ParcelMiniMap';

interface PhorThor7BuilderViewProps {
  records: PhorThor7Record[];
  orgConfig: OrganizationConfig;
  selectedRecordId: string | null;
  onSelectRecord: (id: string) => void;
  onRegenerateAllFromSection10: () => void;
  onUpdateRecord: (updated: PhorThor7Record) => void;
  onUpdateOrgConfig: (next: OrganizationConfig) => void;
  onGoToPrint: (recordId?: string) => void;
}

export const PhorThor7BuilderView: React.FC<PhorThor7BuilderViewProps> = ({
  records,
  orgConfig,
  selectedRecordId,
  onSelectRecord,
  onRegenerateAllFromSection10,
  onUpdateRecord,
  onUpdateOrgConfig,
  onGoToPrint,
}) => {
  const [search, setSearch] = useState('');
  const [showOrgSettings, setShowOrgSettings] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.parcelCode.toLowerCase().includes(q) ||
        r.deedNo.toLowerCase().includes(q) ||
        r.ownerName.toLowerCase().includes(q)
    );
  }, [records, search]);

  const activeRecord = useMemo(
    () => records.find((r) => r.id === selectedRecordId) || filtered[0] || null,
    [records, filtered, selectedRecordId]
  );

  const totals = useMemo(() => {
    const totalValue = records.reduce((s, r) => s + r.totalPropertyValue, 0);
    const totalTax = records.reduce((s, r) => s + r.calculatedTaxBaht, 0);
    const approved = records.filter((r) => r.approved).length;
    return { totalValue, totalTax, approved };
  }, [records]);

  const recalculateAndSave = (draft: PhorThor7Record) => {
    const landAssessedValue = Math.round(draft.totalSqWa * draft.assessedPricePerSqWa);
    const netBuildingValue = computeBuildingNetValue(draft.building);
    const totalPropertyValue = landAssessedValue + netBuildingValue;

    let exemptionAmount = 0;
    if (draft.landUse === 'residential' && draft.building.hasBuilding) {
      exemptionAmount = Math.min(totalPropertyValue, 50_000_000);
    } else if (draft.landUse === 'agriculture') {
      exemptionAmount = Math.min(totalPropertyValue, 50_000_000);
    }

    const netTaxableValue = Math.max(0, totalPropertyValue - exemptionAmount);
    const taxRatePercent = getDefaultTaxRate(draft.landUse, totalPropertyValue);
    const calculatedTaxBaht =
      Math.round(((netTaxableValue * taxRatePercent) / 100) * 100) / 100;

    onUpdateRecord({
      ...draft,
      landAssessedValue,
      building: { ...draft.building, netBuildingValue },
      totalPropertyValue,
      exemptionAmount,
      netTaxableValue,
      taxRatePercent,
      calculatedTaxBaht,
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Action & Summary Header */}
      <div className="bg-white border border-slate-200 rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            ทะเบียนทรัพย์สินและคำนวณภาษีเพื่อจัดทำแบบ ผท.7 (ปีภาษี {orgConfig.fiscalYear})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            ทั้งหมด {records.length} รายการ · ตรวจสอบแล้ว {totals.approved} รายการ ·
            ราคาประเมินทุนทรัพย์รวม {totals.totalValue.toLocaleString('th-TH')} บาท ·
            ภาษีที่คำนวณได้รวม {totals.totalTax.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOrgSettings((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Settings2 className="w-3.5 h-3.5" />
            ตั้งค่าหัวกระดาษ อปท.
          </button>
          <button
            type="button"
            onClick={onRegenerateAllFromSection10}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            ดึงข้อมูลมาตรา 10 ใหม่ทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => exportPhorThor7CSV(records)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            ส่งออก CSV ทะเบียน ผท.7
          </button>
          <button
            type="button"
            onClick={() => onGoToPrint()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-900 whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            เปิดหน้าพิมพ์แบบ ผท.7
          </button>
        </div>
      </div>

      {/* Collapsible Organization Settings */}
      {showOrgSettings && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-slate-900 mb-3">
            ข้อมูลหน่วยงานและผู้ลงนามบนแบบ ผท.7
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <label className="space-y-1">
              <span className="text-slate-600 block">ชื่อองค์กรปกครองส่วนท้องถิ่น</span>
              <input
                type="text"
                value={orgConfig.municipalityName}
                onChange={(e) =>
                  onUpdateOrgConfig({ ...orgConfig, municipalityName: e.target.value })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-700"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600 block">อำเภอ / เขต</span>
              <input
                type="text"
                value={orgConfig.district}
                onChange={(e) =>
                  onUpdateOrgConfig({ ...orgConfig, district: e.target.value })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-700"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600 block">จังหวัด</span>
              <input
                type="text"
                value={orgConfig.province}
                onChange={(e) =>
                  onUpdateOrgConfig({ ...orgConfig, province: e.target.value })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-700"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600 block">ปีภาษี (พ.ศ.)</span>
              <input
                type="number"
                value={orgConfig.fiscalYear}
                onChange={(e) =>
                  onUpdateOrgConfig({
                    ...orgConfig,
                    fiscalYear: Number(e.target.value) || 2569,
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono-tabular focus:outline-none focus:border-blue-700"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600 block">ผู้จัดทำ (เจ้าพนักงาน)</span>
              <input
                type="text"
                value={orgConfig.preparerName}
                onChange={(e) =>
                  onUpdateOrgConfig({ ...orgConfig, preparerName: e.target.value })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-700"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600 block">ผู้ตรวจสอบ (ผอ.กองคลัง)</span>
              <input
                type="text"
                value={orgConfig.reviewerName}
                onChange={(e) =>
                  onUpdateOrgConfig({ ...orgConfig, reviewerName: e.target.value })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-700"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600 block">ผู้อนุมัติ (ปลัด/นายก)</span>
              <input
                type="text"
                value={orgConfig.approverName}
                onChange={(e) =>
                  onUpdateOrgConfig({ ...orgConfig, approverName: e.target.value })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-700"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600 block">ตำแหน่งผู้อนุมัติ</span>
              <input
                type="text"
                value={orgConfig.approverTitle}
                onChange={(e) =>
                  onUpdateOrgConfig({ ...orgConfig, approverTitle: e.target.value })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-700"
              />
            </label>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <div className="text-sm font-medium text-slate-800">
            ยังไม่มีข้อมูลในทะเบียน ผท.7
          </div>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            กดปุ่มดึงข้อมูลจากบัญชีมาตรา 10 เพื่อสร้างแบบ ผท.7 พร้อมรูปแปลงที่ปรับแนวแล้ว
          </p>
          <button
            type="button"
            onClick={onRegenerateAllFromSection10}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-900"
          >
            ดึงข้อมูลมาตรา 10 สร้าง ผท.7 ทันที
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left: Registry List */}
          <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-slate-50/70">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหารหัสแปลง / โฉนด / ชื่อผู้เสียภาษี..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
              {filtered.map((rec) => {
                const isSelected = activeRecord?.id === rec.id;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => onSelectRecord(rec.id)}
                    className={`w-full text-left px-4 py-3 transition-colors flex items-start justify-between gap-3 ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tabular text-xs font-semibold text-slate-900">
                          {rec.parcelCode}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-600 font-mono-tabular">
                          โฉนด {rec.deedNo}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-800 truncate mt-0.5">
                        {rec.ownerName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {getLandUseLabel(rec.landUse)} · {rec.rai}-{rec.ngan}-{rec.sqWa} ไร่
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono-tabular text-xs font-semibold text-slate-900">
                        {rec.calculatedTaxBaht.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        ฿
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {rec.approved ? (
                          <span className="text-emerald-700 font-medium">พร้อมพิมพ์</span>
                        ) : (
                          <span className="text-amber-700">รอตรวจสอบ</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Active Phor Thor 7 Record Editor */}
          {activeRecord && (
            <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs text-slate-500">
                    แก้ไขและตรวจสอบข้อมูลแบบ ผท.7 รายแปลง
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 font-mono-tabular">
                    รหัสแปลง {activeRecord.parcelCode} · {activeRecord.deedType} เลขที่{' '}
                    {activeRecord.deedNo}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateRecord({
                        ...activeRecord,
                        approved: !activeRecord.approved,
                      })
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap ${
                      activeRecord.approved
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {activeRecord.approved ? 'ยืนยันความถูกต้องแล้ว' : 'ยืนยันข้อมูล ผท.7'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onGoToPrint(activeRecord.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-900 whitespace-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    พิมพ์ ผท.7 แปลงนี้
                  </button>
                </div>
              </div>

              {/* Mini-Map + Owner Info */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-5 flex flex-col items-center">
                  <ParcelMiniMap
                    polygon={activeRecord.polygon}
                    parcelCode={activeRecord.parcelCode}
                    neighborLabels={activeRecord.neighborLabels}
                    width={240}
                    height={165}
                  />
                  <span className="text-[11px] text-slate-500 mt-1.5">
                    รูปแปลงที่ดินหลังปรับแนวแผนที่อัตโนมัติ
                  </span>
                </div>

                <div className="md:col-span-7 grid grid-cols-1 gap-3 text-xs">
                  <label className="space-y-1">
                    <span className="text-slate-600 block">ชื่อ-สกุล / นิติบุคคลผู้เสียภาษี</span>
                    <input
                      type="text"
                      value={activeRecord.ownerName}
                      onChange={(e) =>
                        onUpdateRecord({ ...activeRecord, ownerName: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-700"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-slate-600 block">เลขประจำตัวประชาชน / นิติบุคคล</span>
                      <input
                        type="text"
                        value={activeRecord.ownerId}
                        onChange={(e) =>
                          onUpdateRecord({ ...activeRecord, ownerId: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono-tabular focus:outline-none focus:border-blue-700"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600 block">การใช้ประโยชน์ที่ดิน</span>
                      <select
                        value={activeRecord.landUse}
                        onChange={(e) =>
                          recalculateAndSave({
                            ...activeRecord,
                            landUse: e.target.value as LandUseType,
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-700"
                      >
                        <option value="agriculture">เกษตรกรรม</option>
                        <option value="residential">อยู่อาศัย</option>
                        <option value="commercial">อื่นๆ (พาณิชยกรรม)</option>
                        <option value="vacant">รกร้างว่างเปล่า</option>
                      </select>
                    </label>
                  </div>
                  <label className="space-y-1">
                    <span className="text-slate-600 block">ที่อยู่ผู้เสียภาษี</span>
                    <input
                      type="text"
                      value={activeRecord.ownerAddress}
                      onChange={(e) =>
                        onUpdateRecord({ ...activeRecord, ownerAddress: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-700"
                    />
                  </label>
                </div>
              </div>

              {/* Land Valuation & Building Assessment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
                <div className="space-y-2.5">
                  <div className="font-semibold text-slate-800">
                    ข้อมูลที่ดินและราคาประเมินทุนทรัพย์
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="space-y-1">
                      <span className="text-slate-600 block">เนื้อที่รวม (ตร.วา)</span>
                      <input
                        type="number"
                        value={activeRecord.totalSqWa}
                        onChange={(e) =>
                          recalculateAndSave({
                            ...activeRecord,
                            totalSqWa: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono-tabular focus:outline-none focus:border-blue-700"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600 block">ราคาประเมิน (บาท/ตร.วา)</span>
                      <input
                        type="number"
                        value={activeRecord.assessedPricePerSqWa}
                        onChange={(e) =>
                          recalculateAndSave({
                            ...activeRecord,
                            assessedPricePerSqWa: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono-tabular focus:outline-none focus:border-blue-700"
                      />
                    </label>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">มูลค่าที่ดินรวม</span>
                    <span className="font-mono-tabular font-semibold text-slate-900">
                      {activeRecord.landAssessedValue.toLocaleString('th-TH')} บาท
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      ข้อมูลสิ่งปลูกสร้าง
                    </span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={activeRecord.building.hasBuilding}
                        onChange={(e) =>
                          recalculateAndSave({
                            ...activeRecord,
                            building: {
                              ...activeRecord.building,
                              hasBuilding: e.target.checked,
                              areaSqM: e.target.checked
                                ? activeRecord.building.areaSqM || 120
                                : 0,
                              assessedValuePerSqM: e.target.checked
                                ? activeRecord.building.assessedValuePerSqM || 7800
                                : 0,
                            },
                          })
                        }
                        className="rounded border-slate-300 text-blue-700"
                      />
                      มีสิ่งปลูกสร้าง
                    </label>
                  </div>

                  {activeRecord.building.hasBuilding ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="space-y-1 col-span-2">
                        <span className="text-slate-600 block">ประเภทสิ่งปลูกสร้าง</span>
                        <input
                          type="text"
                          value={activeRecord.building.buildingType}
                          onChange={(e) =>
                            onUpdateRecord({
                              ...activeRecord,
                              building: {
                                ...activeRecord.building,
                                buildingType: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-700"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-slate-600 block">พื้นที่รวม (ตร.ม.)</span>
                        <input
                          type="number"
                          value={activeRecord.building.areaSqM}
                          onChange={(e) =>
                            recalculateAndSave({
                              ...activeRecord,
                              building: {
                                ...activeRecord.building,
                                areaSqM: Math.max(0, Number(e.target.value)),
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono-tabular focus:outline-none focus:border-blue-700"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-slate-600 block">ราคาต่อ ตร.ม. (บาท)</span>
                        <input
                          type="number"
                          value={activeRecord.building.assessedValuePerSqM}
                          onChange={(e) =>
                            recalculateAndSave({
                              ...activeRecord,
                              building: {
                                ...activeRecord.building,
                                assessedValuePerSqM: Math.max(0, Number(e.target.value)),
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono-tabular focus:outline-none focus:border-blue-700"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="py-4 px-3 bg-slate-50 border border-slate-200 rounded text-slate-500 text-center">
                      ไม่มีสิ่งปลูกสร้างบนแปลงที่ดินนี้
                    </div>
                  )}
                </div>
              </div>

              {/* Tax Summary Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-slate-500">มูลค่ารวมที่ดินและสิ่งปลูกสร้าง</div>
                  <div className="font-mono-tabular font-semibold text-slate-900 text-sm mt-0.5">
                    {activeRecord.totalPropertyValue.toLocaleString('th-TH')} ฿
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">หักข้อยกเว้นตามกฎหมาย</div>
                  <div className="font-mono-tabular font-semibold text-slate-700 text-sm mt-0.5">
                    {activeRecord.exemptionAmount.toLocaleString('th-TH')} ฿
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">ฐานภาษีสุทธิ ({activeRecord.taxRatePercent}%)</div>
                  <div className="font-mono-tabular font-semibold text-slate-900 text-sm mt-0.5">
                    {activeRecord.netTaxableValue.toLocaleString('th-TH')} ฿
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">ภาษีที่ต้องชำระสุทธิ</div>
                  <div className="font-mono-tabular font-bold text-blue-800 text-base mt-0.5">
                    {activeRecord.calculatedTaxBaht.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    ฿
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
