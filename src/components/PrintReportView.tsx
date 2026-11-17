import React, { useMemo, useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import {
  DolSection10Parcel,
  OrganizationConfig,
  PhorThor7Record,
} from '../types/gis';
import { getLandUseLabel } from '../utils/gisEngine';
import { ParcelMiniMap } from './ParcelMiniMap';

interface PrintReportViewProps {
  records: PhorThor7Record[];
  dolParcels: DolSection10Parcel[];
  orgConfig: OrganizationConfig;
  initialFocusRecordId: string | null;
}

const PhorThor7A4Sheet: React.FC<{
  record: PhorThor7Record;
  orgConfig: OrganizationConfig;
  pageNumber: number;
  totalPages: number;
}> = ({ record, orgConfig, pageNumber, totalPages }) => {
  return (
    <article className="a4-sheet mx-auto text-[12.5px] leading-snug text-slate-900">
      {/* Official Form Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2.5 mb-3">
        <div>
          <div className="text-lg font-bold tracking-tight">
            แบบ ผท.7 · ทะเบียนรายการที่ดินและสิ่งปลูกสร้าง (รายแปลง)
          </div>
          <div className="text-sm font-semibold text-slate-800 mt-0.5">
            {orgConfig.municipalityName} อำเภอ{orgConfig.district} จังหวัด{orgConfig.province}
          </div>
          <div className="text-xs text-slate-600 mt-0.5">
            ปรับปรุงข้อมูลตามบัญชีรายการที่ดินและสิ่งปลูกสร้าง มาตรา 10 (กรมที่ดิน) · ประจำปีภาษี พ.ศ.{' '}
            {orgConfig.fiscalYear}
          </div>
        </div>
        <div className="text-right border border-slate-800 px-3 py-1.5 bg-slate-50">
          <div className="text-[11px] text-slate-600">รหัสแปลงที่ดิน (LTAX)</div>
          <div className="text-base font-bold font-mono-tabular tracking-wider">
            {record.parcelCode}
          </div>
          <div className="text-[10.5px] text-slate-500 font-mono-tabular">
            โซน {record.zone} · บล็อก {record.block} · ล็อต {record.lot}
          </div>
        </div>
      </div>

      {/* Section 1: Owner + Mini-Map */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        <div className="col-span-7 border border-slate-400 p-2.5 flex flex-col justify-between">
          <div>
            <div className="font-bold text-[12.5px] border-b border-slate-300 pb-1 mb-2">
              ส่วนที่ 1 ข้อมูลเจ้าของทรัพย์สิน / ผู้มีหน้าที่เสียภาษี
            </div>
            <table className="w-full text-[12px]">
              <tbody>
                <tr>
                  <td className="py-1 text-slate-600 w-36 align-top">ชื่อ-สกุล / นิติบุคคล:</td>
                  <td className="py-1 font-semibold">{record.ownerName}</td>
                </tr>
                <tr>
                  <td className="py-1 text-slate-600 align-top">เลขประจำตัว:</td>
                  <td className="py-1 font-mono-tabular">{record.ownerId}</td>
                </tr>
                <tr>
                  <td className="py-1 text-slate-600 align-top">ที่อยู่จัดส่งเอกสาร:</td>
                  <td className="py-1">{record.ownerAddress}</td>
                </tr>
                <tr>
                  <td className="py-1 text-slate-600 align-top">ที่ตั้งทรัพย์สิน:</td>
                  <td className="py-1">{record.locationText}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-200 text-[11px] text-slate-600">
            สถานะการตรวจสอบ: {record.approved ? 'ผ่านการตรวจสอบและปรับแนวแผนที่แล้ว' : 'รอตรวจทานเพิ่มเติม'}
          </div>
        </div>

        <div className="col-span-5 border border-slate-400 p-2 flex flex-col items-center justify-center bg-slate-50/40">
          <div className="text-[11px] font-semibold text-slate-700 mb-1">
            แผนผังรูปแปลงที่ดินสังเขป (หลังปรับแนวแผนที่)
          </div>
          <ParcelMiniMap
            polygon={record.polygon}
            parcelCode={record.parcelCode}
            neighborLabels={record.neighborLabels}
            width={235}
            height={145}
          />
          <div className="text-[10px] text-slate-500 mt-1 font-mono-tabular">
            ระบบพิกัด WGS 84 / UTM Zone 47N
          </div>
        </div>
      </div>

      {/* Section 2: Land Deed & Section 10 Details */}
      <div className="mb-3">
        <div className="font-bold text-[12.5px] bg-slate-100 border border-b-0 border-slate-400 px-2.5 py-1">
          ส่วนที่ 2 รายการที่ดินและข้อมูลเอกสารสิทธิ์ (ดึงจากบัญชีมาตรา 10 กรมที่ดิน)
        </div>
        <table className="w-full border-collapse border border-slate-400 text-[11.5px]">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-400 px-2 py-1.5 text-left">ประเภทเอกสารสิทธิ์</th>
              <th className="border border-slate-400 px-2 py-1.5 text-center">เลขที่เอกสารสิทธิ์</th>
              <th className="border border-slate-400 px-2 py-1.5 text-center">ระวาง</th>
              <th className="border border-slate-400 px-2 py-1.5 text-center">เลขที่ดิน / หน้าสำรวจ</th>
              <th className="border border-slate-400 px-2 py-1.5 text-right">เนื้อที่ (ไร่-งาน-ตร.วา)</th>
              <th className="border border-slate-400 px-2 py-1.5 text-right">รวม (ตร.วา)</th>
              <th className="border border-slate-400 px-2 py-1.5 text-right">ราคาประเมิน/ตร.วา</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-400 px-2 py-2">{record.deedType}</td>
              <td className="border border-slate-400 px-2 py-2 text-center font-mono-tabular font-semibold">
                {record.deedNo}
              </td>
              <td className="border border-slate-400 px-2 py-2 text-center font-mono-tabular">
                {record.utmMap}
              </td>
              <td className="border border-slate-400 px-2 py-2 text-center font-mono-tabular">
                {record.landNo} / {record.surveyNo}
              </td>
              <td className="border border-slate-400 px-2 py-2 text-right font-mono-tabular">
                {record.rai}-{record.ngan}-{record.sqWa}
              </td>
              <td className="border border-slate-400 px-2 py-2 text-right font-mono-tabular font-semibold">
                {record.totalSqWa.toLocaleString('th-TH')}
              </td>
              <td className="border border-slate-400 px-2 py-2 text-right font-mono-tabular">
                {record.assessedPricePerSqWa.toLocaleString('th-TH')} บ.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 3: Building Details */}
      <div className="mb-3">
        <div className="font-bold text-[12.5px] bg-slate-100 border border-b-0 border-slate-400 px-2.5 py-1">
          ส่วนที่ 3 รายการสิ่งปลูกสร้างและการใช้ประโยชน์
        </div>
        <table className="w-full border-collapse border border-slate-400 text-[11.5px]">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-400 px-2 py-1.5 text-left">บ้านเลขที่</th>
              <th className="border border-slate-400 px-2 py-1.5 text-left">ประเภท / ลักษณะสิ่งปลูกสร้าง</th>
              <th className="border border-slate-400 px-2 py-1.5 text-center">จำนวนชั้น</th>
              <th className="border border-slate-400 px-2 py-1.5 text-right">พื้นที่ (ตร.ม.)</th>
              <th className="border border-slate-400 px-2 py-1.5 text-right">ค่าเสื่อม (%)</th>
              <th className="border border-slate-400 px-2 py-1.5 text-center">การใช้ประโยชน์</th>
              <th className="border border-slate-400 px-2 py-1.5 text-right">มูลค่าสิ่งปลูกสร้างสุทธิ</th>
            </tr>
          </thead>
          <tbody>
            {record.building.hasBuilding ? (
              <tr>
                <td className="border border-slate-400 px-2 py-2 font-mono-tabular">
                  {record.building.houseNo}
                </td>
                <td className="border border-slate-400 px-2 py-2">
                  {record.building.buildingType}
                </td>
                <td className="border border-slate-400 px-2 py-2 text-center font-mono-tabular">
                  {record.building.floors}
                </td>
                <td className="border border-slate-400 px-2 py-2 text-right font-mono-tabular">
                  {record.building.areaSqM.toLocaleString('th-TH')}
                </td>
                <td className="border border-slate-400 px-2 py-2 text-right font-mono-tabular">
                  {record.building.depreciationPercent}%
                </td>
                <td className="border border-slate-400 px-2 py-2 text-center font-semibold">
                  {getLandUseLabel(record.landUse)}
                </td>
                <td className="border border-slate-400 px-2 py-2 text-right font-mono-tabular font-semibold">
                  {record.building.netBuildingValue.toLocaleString('th-TH')} บ.
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={5} className="border border-slate-400 px-2 py-2 text-center text-slate-500">
                  ไม่มีสิ่งปลูกสร้างบนแปลงที่ดินนี้
                </td>
                <td className="border border-slate-400 px-2 py-2 text-center font-semibold">
                  {getLandUseLabel(record.landUse)}
                </td>
                <td className="border border-slate-400 px-2 py-2 text-right font-mono-tabular">
                  0 บ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Section 4: Tax Calculation Summary */}
      <div className="mb-5">
        <div className="font-bold text-[12.5px] bg-slate-100 border border-b-0 border-slate-400 px-2.5 py-1">
          ส่วนที่ 4 สรุปการคำนวณราคาประเมินทุนทรัพย์และภาษีที่ดินและสิ่งปลูกสร้าง
        </div>
        <table className="w-full border-collapse border border-slate-400 text-[12px]">
          <tbody>
            <tr>
              <td className="border border-slate-400 px-2.5 py-1.5 w-2/3">
                1. ราคาประเมินทุนทรัพย์ที่ดิน ({record.totalSqWa.toLocaleString('th-TH')} ตร.วา ×{' '}
                {record.assessedPricePerSqWa.toLocaleString('th-TH')} บาท)
              </td>
              <td className="border border-slate-400 px-2.5 py-1.5 text-right font-mono-tabular">
                {record.landAssessedValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2.5 py-1.5">
                2. ราคาประเมินทุนทรัพย์สิ่งปลูกสร้างหลังหักค่าเสื่อมราคา
              </td>
              <td className="border border-slate-400 px-2.5 py-1.5 text-right font-mono-tabular">
                {record.building.netBuildingValue.toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                })}{' '}
                บาท
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2.5 py-1.5 font-semibold">
                3. รวมราคาประเมินทุนทรัพย์ที่ดินและสิ่งปลูกสร้าง (1 + 2)
              </td>
              <td className="border border-slate-400 px-2.5 py-1.5 text-right font-mono-tabular font-semibold">
                {record.totalPropertyValue.toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                })}{' '}
                บาท
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2.5 py-1.5">
                4. หักมูลค่าฐานภาษีที่ได้รับยกเว้นตาม พ.ร.บ. ภาษีที่ดินและสิ่งปลูกสร้าง พ.ศ. 2562
              </td>
              <td className="border border-slate-400 px-2.5 py-1.5 text-right font-mono-tabular">
                {record.exemptionAmount.toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                })}{' '}
                บาท
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2.5 py-1.5">
                5. มูลค่าฐานภาษีคงเหลือสุทธิ × อัตราภาษี ({record.taxRatePercent}%)
              </td>
              <td className="border border-slate-400 px-2.5 py-1.5 text-right font-mono-tabular">
                {record.netTaxableValue.toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                })}{' '}
                บาท
              </td>
            </tr>
            <tr className="bg-slate-100">
              <td className="border border-slate-400 px-2.5 py-2 font-bold">
                6. ยอดภาษีที่ดินและสิ่งปลูกสร้างที่ต้องชำระประจำปี พ.ศ. {orgConfig.fiscalYear}
              </td>
              <td className="border border-slate-400 px-2.5 py-2 text-right font-mono-tabular font-bold text-sm">
                {record.calculatedTaxBaht.toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                })}{' '}
                บาท
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-6 pt-3 text-center text-[11.5px]">
        <div className="space-y-6">
          <div>ลงชื่อ ............................................... ผู้จัดทำ</div>
          <div>
            ({orgConfig.preparerName})
            <div className="text-[10.5px] text-slate-600">{orgConfig.preparerTitle}</div>
          </div>
        </div>
        <div className="space-y-6">
          <div>ลงชื่อ ............................................... ผู้ตรวจสอบ</div>
          <div>
            ({orgConfig.reviewerName})
            <div className="text-[10.5px] text-slate-600">{orgConfig.reviewerTitle}</div>
          </div>
        </div>
        <div className="space-y-6">
          <div>ลงชื่อ ............................................... ผู้อนุมัติ</div>
          <div>
            ({orgConfig.approverName})
            <div className="text-[10.5px] text-slate-600">{orgConfig.approverTitle}</div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-6 pt-2 border-t border-slate-300 flex justify-between text-[10px] text-slate-500">
        <span>ออกรายงานเมื่อวันที่ {record.generatedAt} · เอกสารอ้างอิงข้อมูลมาตรา 10 กรมที่ดิน</span>
        <span className="font-mono-tabular">
          หน้า {pageNumber} / {totalPages}
        </span>
      </div>
    </article>
  );
};

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  records,
  dolParcels,
  orgConfig,
  initialFocusRecordId,
}) => {
  const [reportType, setReportType] = useState<'pt7_single' | 'pt7_batch' | 'sec10_summary'>(
    initialFocusRecordId ? 'pt7_single' : 'pt7_batch'
  );
  const [selectedId, setSelectedId] = useState<string>(
    initialFocusRecordId || records[0]?.id || ''
  );

  const singleRecord = useMemo(
    () => records.find((r) => r.id === selectedId) || records[0] || null,
    [records, selectedId]
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Control Bar (Hidden during print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => setReportType('pt7_batch')}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                reportType === 'pt7_batch'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              พิมพ์ ผท.7 ทั้งชุด ({records.length} หน้า)
            </button>
            <button
              type="button"
              onClick={() => setReportType('pt7_single')}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                reportType === 'pt7_single'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              พิมพ์ ผท.7 รายแปลง
            </button>
            <button
              type="button"
              onClick={() => setReportType('sec10_summary')}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                reportType === 'sec10_summary'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รายงานสรุปการปรับมาตรา 10
            </button>
          </div>

          {reportType === 'pt7_single' && records.length > 0 && (
            <select
              value={singleRecord?.id || ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-700"
            >
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.parcelCode} — โฉนด {r.deedNo} ({r.ownerName})
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="button"
          onClick={handlePrint}
          disabled={records.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-900 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Printer className="w-4 h-4" />
          สั่งพิมพ์รายงาน / บันทึกเป็น PDF (A4)
        </button>
      </div>

      {/* Print Preview Canvas */}
      {records.length === 0 ? (
        <div className="no-print bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500 text-sm">
          <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          กรุณาดึงข้อมูลมาตรา 10 สร้างรายการ ผท.7 ก่อนพิมพ์รายงาน
        </div>
      ) : (
        <div className="print-only-container space-y-6 pb-8 overflow-x-auto">
          {reportType === 'pt7_single' && singleRecord && (
            <PhorThor7A4Sheet
              record={singleRecord}
              orgConfig={orgConfig}
              pageNumber={1}
              totalPages={1}
            />
          )}

          {reportType === 'pt7_batch' &&
            records.map((rec, idx) => (
              <PhorThor7A4Sheet
                key={rec.id}
                record={rec}
                orgConfig={orgConfig}
                pageNumber={idx + 1}
                totalPages={records.length}
              />
            ))}

          {reportType === 'sec10_summary' && (
            <article className="a4-sheet mx-auto text-[11.5px] leading-snug text-slate-900">
              <div className="border-b-2 border-slate-900 pb-2.5 mb-3 flex items-end justify-between">
                <div>
                  <div className="text-base font-bold">
                    รายงานสรุปผลการนำเข้าและปรับปรุงแผนที่ภาษีตามมาตรา 10 กรมที่ดิน
                  </div>
                  <div className="text-xs text-slate-700 mt-0.5">
                    {orgConfig.municipalityName} อำเภอ{orgConfig.district} จังหวัด{orgConfig.province} ·
                    ประจำปีภาษี พ.ศ. {orgConfig.fiscalYear}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-600">
                  จำนวนทั้งหมด {dolParcels.length} แปลง
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-400 text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-400 px-1.5 py-1.5 text-center">ลำดับ</th>
                    <th className="border border-slate-400 px-1.5 py-1.5 text-left">รหัสแปลง</th>
                    <th className="border border-slate-400 px-1.5 py-1.5 text-center">เลขโฉนด</th>
                    <th className="border border-slate-400 px-1.5 py-1.5 text-left">ผู้ถือกรรมสิทธิ์</th>
                    <th className="border border-slate-400 px-1.5 py-1.5 text-right">เนื้อที่ ม.10 (ตร.วา)</th>
                    <th className="border border-slate-400 px-1.5 py-1.5 text-right">เนื้อที่ GIS (ตร.วา)</th>
                    <th className="border border-slate-400 px-1.5 py-1.5 text-right">ระยะเลื่อนที่แก้ (ม.)</th>
                    <th className="border border-slate-400 px-1.5 py-1.5 text-right">ภาษีคำนวณได้ (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {dolParcels.map((p, idx) => {
                    const pt7 = records.find((r) => r.parcelId === p.id);
                    return (
                      <tr key={p.id}>
                        <td className="border border-slate-400 px-1.5 py-1 text-center font-mono-tabular">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-400 px-1.5 py-1 font-mono-tabular font-semibold">
                          {p.ltaxParcelCode}
                        </td>
                        <td className="border border-slate-400 px-1.5 py-1 text-center font-mono-tabular">
                          {p.deedNo}
                        </td>
                        <td className="border border-slate-400 px-1.5 py-1">{p.ownerName}</td>
                        <td className="border border-slate-400 px-1.5 py-1 text-right font-mono-tabular">
                          {p.dolSqWa.toLocaleString('th-TH')}
                        </td>
                        <td className="border border-slate-400 px-1.5 py-1 text-right font-mono-tabular">
                          {p.calculatedSqWa.toLocaleString('th-TH')}
                        </td>
                        <td className="border border-slate-400 px-1.5 py-1 text-right font-mono-tabular">
                          {p.shiftDistanceM.toFixed(1)}
                        </td>
                        <td className="border border-slate-400 px-1.5 py-1 text-right font-mono-tabular font-semibold">
                          {(pt7?.calculatedTaxBaht || 0).toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="grid grid-cols-3 gap-6 pt-8 text-center text-[11px]">
                <div className="space-y-6">
                  <div>ลงชื่อ ............................................... ผู้จัดทำ</div>
                  <div>({orgConfig.preparerName})</div>
                </div>
                <div className="space-y-6">
                  <div>ลงชื่อ ............................................... ผู้ตรวจสอบ</div>
                  <div>({orgConfig.reviewerName})</div>
                </div>
                <div className="space-y-6">
                  <div>ลงชื่อ ............................................... ผู้อนุมัติ</div>
                  <div>({orgConfig.approverName})</div>
                </div>
              </div>
            </article>
          )}
        </div>
      )}
    </div>
  );
};
