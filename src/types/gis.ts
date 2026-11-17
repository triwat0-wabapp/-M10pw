export interface Point2D {
  x: number; // UTM Easting (meters)
  y: number; // UTM Northing (meters)
}

export type LandUseType = 'agriculture' | 'residential' | 'commercial' | 'vacant';

export type DeedType = 'โฉนดที่ดิน' | 'น.ส.3ก' | 'น.ส.3' | 'ส.ป.ก.4-01' | 'อื่นๆ';

export type ParcelSyncStatus =
  | 'shifted'       // พิกัดคลาดเคลื่อนจากฐานแผนที่เดิม
  | 'matched'       // จับคู่รหัสแปลงตรงกัน
  | 'split_new'     // แปลงแบ่งแยก / แปลงเกิดใหม่จากมาตรา 10
  | 'area_mismatch' // เนื้อที่ต่างจากเดิมเกินเกณฑ์
  | 'adjusted';     // ปรับแนวแผนที่อัตโนมัติแล้ว

export interface BuildingInfo {
  hasBuilding: boolean;
  buildingType: string;
  houseNo: string;
  floors: number;
  areaSqM: number;
  ageYears: number;
  assessedValuePerSqM: number;
  depreciationPercent: number;
  netBuildingValue: number;
}

export interface LtaxBaseParcel {
  parcelCode: string; // e.g., 01A001
  deedNo: string;
  zone: string;
  block: string;
  lot: string;
  ownerName: string;
  registeredSqWa: number;
  polygon: Point2D[];
}

export interface DolSection10Parcel {
  id: string;
  ltaxParcelCode: string; // รหัสแปลงที่ดิน อปท. (เช่น 01A001)
  zone: string;
  block: string;
  lot: string;
  deedType: DeedType;
  deedNo: string;         // เลขที่เอกสารสิทธิ์ (เลขโฉนด)
  utmMap: string;         // ระวาง
  landNo: string;         // เลขที่ดิน
  surveyNo: string;       // หน้าสำรวจ
  tambon: string;
  amphoe: string;
  province: string;
  ownerName: string;
  ownerId: string;        // เลขประจำตัวประชาชน/นิติบุคคล
  ownerAddress: string;
  rai: number;
  ngan: number;
  sqWa: number;
  dolSqWa: number;        // เนื้อที่ตามมาตรา 10 (ตร.วา)
  landUse: LandUseType;
  assessedPricePerSqWa: number; // ราคาประเมินทุนทรัพย์ (บาท/ตร.วา)
  building: BuildingInfo;
  // Geometry layers
  rawPolygon: Point2D[];      // พิกัดดิบจากกรมที่ดิน
  adjustedPolygon: Point2D[]; // พิกัดหลังปรับแผนที่อัตโนมัติ
  // Alignment diagnostics
  status: ParcelSyncStatus;
  shiftDistanceM: number;     // ระยะคลาดเคลื่อนก่อนปรับ (เมตร)
  snappedVerticesCount: number;
  calculatedSqWa: number;     // เนื้อที่คำนวณจากรูปแปลงหลังปรับ (ตร.วา)
  areaDiffPercent: number;    // ผลต่างเนื้อที่ (%)
  note: string;
  selectedForPt7: boolean;
}

export interface PhorThor7Record {
  id: string;
  parcelId: string;
  parcelCode: string; // รหัสแปลงที่ดิน (Zone-Block-Lot)
  zone: string;
  block: string;
  lot: string;
  fiscalYear: number;
  // Owner section
  ownerName: string;
  ownerId: string;
  ownerAddress: string;
  // Land section (from Section 10)
  deedType: DeedType;
  deedNo: string;
  utmMap: string;
  landNo: string;
  surveyNo: string;
  locationText: string;
  rai: number;
  ngan: number;
  sqWa: number;
  totalSqWa: number;
  assessedPricePerSqWa: number;
  landAssessedValue: number;
  // Building section
  building: BuildingInfo;
  // Valuation & Tax summary
  landUse: LandUseType;
  totalPropertyValue: number;
  exemptionAmount: number;
  netTaxableValue: number;
  taxRatePercent: number;
  calculatedTaxBaht: number;
  // Embedded adjusted geometry
  polygon: Point2D[];
  neighborLabels: string[];
  generatedAt: string;
  approved: boolean;
}

export interface AlignmentParams {
  dx: number;                 // Easting shift in meters
  dy: number;                 // Northing shift in meters
  rotationDeg: number;        // Rotation in degrees
  scale: number;              // Scale factor (default 1.0)
  snapToleranceMeters: number; // Vertex snap radius (meters)
  datumMode: 'auto_icp' | 'indian1975_offset' | 'manual';
  isApplied: boolean;
}

export interface OrganizationConfig {
  municipalityName: string;
  district: string;
  province: string;
  fiscalYear: number;
  utmZone: 47 | 48;
  preparerName: string;
  preparerTitle: string;
  reviewerName: string;
  reviewerTitle: string;
  approverName: string;
  approverTitle: string;
}
