import JSZip from 'jszip';
import {
  DeedType,
  DolSection10Parcel,
  LandUseType,
  PhorThor7Record,
  Point2D,
} from '../types/gis';
import {
  latLngToUtm,
  polygonAreaSqMeters,
  sqMetersToRaiNganWa,
  utmToLatLng,
} from './gisEngine';

function normalizeLandUse(raw?: string): LandUseType {
  const s = (raw || '').trim().toLowerCase();
  if (s.includes('เกษตร') || s.includes('agri') || s === '1') return 'agriculture';
  if (s.includes('อาศัย') || s.includes('resid') || s === '2') return 'residential';
  if (s.includes('พาณิช') || s.includes('อื่น') || s.includes('comm') || s === '3') {
    return 'commercial';
  }
  if (s.includes('รกร้าง') || s.includes('vacant') || s === '4') return 'vacant';
  return 'residential';
}

function normalizeDeedType(raw?: string): DeedType {
  const s = (raw || '').trim();
  if (s.includes('3ก') || s.includes('3 ก')) return 'น.ส.3ก';
  if (s.includes('น.ส.3')) return 'น.ส.3';
  if (s.includes('ส.ป.ก')) return 'ส.ป.ก.4-01';
  if (s.includes('โฉนด') || s === '') return 'โฉนดที่ดิน';
  return 'อื่นๆ';
}

function normalizeRingCoords(coords: number[][], utmZone: 47 | 48): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i < coords.length; i++) {
    const [x, y] = coords[i];
    if (typeof x !== 'number' || typeof y !== 'number' || Number.isNaN(x) || Number.isNaN(y)) {
      continue;
    }
    // Detect WGS84 Lon/Lat vs UTM meters
    if (Math.abs(x) <= 180 && Math.abs(y) <= 90) {
      pts.push(latLngToUtm(y, x, utmZone));
    } else {
      pts.push({ x, y });
    }
  }
  // Drop closing duplicate vertex if present
  if (pts.length > 3) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < 0.01) {
      pts.pop();
    }
  }
  return pts;
}

function buildParcelFromProps(
  props: Record<string, unknown>,
  polygon: Point2D[],
  index: number
): DolSection10Parcel {
  const str = (keys: string[], fallback = ''): string => {
    for (const k of keys) {
      const found = Object.keys(props).find(
        (pk) => pk.toLowerCase() === k.toLowerCase()
      );
      if (found && props[found] !== undefined && props[found] !== null && String(props[found]).trim() !== '') {
        return String(props[found]).trim();
      }
    }
    return fallback;
  };

  const num = (keys: string[], fallback = 0): number => {
    const raw = str(keys, '');
    if (!raw) return fallback;
    const parsed = Number(raw.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const parcelCode = str(
    ['PARCEL_COD', 'PARCEL_CODE', 'ltax_code', 'รหัสแปลงที่ดิน', 'PCODE', 'Name'],
    `01B${String(index + 1).padStart(3, '0')}`
  );
  const zone = parcelCode.slice(0, 2) || '01';
  const block = parcelCode.slice(2, 3) || 'B';
  const lot = parcelCode.slice(3) || String(index + 1).padStart(3, '0');

  const areaSqM = polygonAreaSqMeters(polygon);
  const fromGeom = sqMetersToRaiNganWa(areaSqM);
  const rai = num(['RAI', 'ไร่'], fromGeom.rai);
  const ngan = num(['NGAN', 'งาน'], fromGeom.ngan);
  const sqWa = num(['WA', 'SQ_WA', 'ตร_วา', 'ตารางวา'], fromGeom.sqWa);
  const dolSqWa =
    num(['AREA_WA', 'DOL_SQWA', 'TOTAL_WA'], 0) ||
    Math.round((rai * 400 + ngan * 100 + sqWa) * 100) / 100 ||
    fromGeom.totalSqWa;

  const landUse = normalizeLandUse(str(['LAND_USE', 'USE_TYPE', 'การใช้ประโยชน์'], 'อยู่อาศัย'));
  const hasBldg =
    landUse === 'residential' ||
    landUse === 'commercial' ||
    num(['BLDG_AREA', 'พื้นที่สิ่งปลูกสร้าง'], 0) > 0;
  const bldgArea = num(['BLDG_AREA', 'พื้นที่สิ่งปลูกสร้าง'], hasBldg ? 120 : 0);

  return {
    id: `sec10-${Date.now()}-${index}`,
    ltaxParcelCode: parcelCode,
    zone,
    block,
    lot,
    deedType: normalizeDeedType(str(['DEED_TYPE', 'DOC_TYPE', 'ประเภทเอกสารสิทธิ์'], 'โฉนดที่ดิน')),
    deedNo: str(['DEED_NO', 'LAND_DEED', 'CHANOTE_NO', 'NS4_NO', 'เลขโฉนด', 'เลขที่เอกสารสิทธิ์'], `${45100 + index}`),
    utmMap: str(['UTMMAP', 'MAPSHEET', 'ระวาง'], '5137 III 6854-04'),
    landNo: str(['LAND_NO', 'PARCEL_NO', 'เลขที่ดิน'], `${120 + index}`),
    surveyNo: str(['SURVEY_NO', 'หน้าสำรวจ'], `${880 + index}`),
    tambon: str(['TAMBON', 'TAMBOL', 'ตำบล'], 'คลองหนึ่ง'),
    amphoe: str(['AMPHOE', 'DISTRICT', 'อำเภอ'], 'คลองหลวง'),
    province: str(['PROVINCE', 'CHANGWAT', 'จังหวัด'], 'ปทุมธานี'),
    ownerName: str(['OWNER_NAME', 'OWNER', 'ชื่อเจ้าของ', 'ผู้ถือกรรมสิทธิ์'], `เจ้าของแปลงที่ ${index + 1}`),
    ownerId: str(['OWNER_ID', 'CITIZEN_ID', 'เลขบัตรประชาชน'], '1-1301-00412-88-1'),
    ownerAddress: str(['OWNER_ADDR', 'ADDRESS', 'ที่อยู่'], '99/12 หมู่ 4 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี'),
    rai,
    ngan,
    sqWa,
    dolSqWa,
    landUse,
    assessedPricePerSqWa: num(['ASSESS_VAL', 'PRICE_WA', 'ราคาประเมิน'], 6500),
    building: {
      hasBuilding: hasBldg,
      buildingType: str(['BLDG_TYPE', 'ประเภทสิ่งปลูกสร้าง'], landUse === 'commercial' ? 'ตึกแถว 3 ชั้น' : 'บ้านพักอาศัยตึก 2 ชั้น'),
      houseNo: str(['HOUSE_NO', 'บ้านเลขที่'], hasBldg ? `99/${index + 1}` : '-'),
      floors: num(['FLOORS', 'จำนวนชั้น'], landUse === 'commercial' ? 3 : 2),
      areaSqM: bldgArea,
      ageYears: num(['BLDG_AGE', 'อายุอาคาร'], 6),
      assessedValuePerSqM: num(['BLDG_PRICE', 'ราคาต่อตรม'], 7800),
      depreciationPercent: num(['DEPREC', 'ค่าเสื่อม'], 6),
      netBuildingValue: 0,
    },
    rawPolygon: polygon,
    adjustedPolygon: polygon.map((p) => ({ ...p })),
    status: 'shifted',
    shiftDistanceM: 0,
    snappedVerticesCount: 0,
    calculatedSqWa: fromGeom.totalSqWa,
    areaDiffPercent: 0,
    note: 'นำเข้าจากไฟล์มาตรา 10 หรือ KMZ กรมที่ดิน',
    selectedForPt7: true,
  };
}

/**
 * Decode DBF text bytes safely trying UTF-8 first, then falling back to Windows-874 (Thai TIS-620)
 */
function decodeDbfString(bytes: Uint8Array): string {
  let end = bytes.length;
  while (end > 0 && (bytes[end - 1] === 0 || bytes[end - 1] === 32)) {
    end--;
  }
  const slice = bytes.subarray(0, end);
  if (slice.length === 0) return '';

  try {
    const utf8 = new TextDecoder('utf-8', { fatal: true }).decode(slice);
    return utf8.trim();
  } catch {
    try {
      return new TextDecoder('windows-874').decode(slice).trim();
    } catch {
      return new TextDecoder('latin1').decode(slice).trim();
    }
  }
}

function parseDbfBuffer(buffer: ArrayBuffer): Record<string, string>[] {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const numRecords = view.getUint32(4, true);
  const headerSize = view.getUint16(8, true);
  const recordSize = view.getUint16(10, true);

  const fields: { name: string; type: string; length: number }[] = [];
  let offset = 32;
  while (offset < headerSize - 1 && bytes[offset] !== 0x0d) {
    const nameBytes = bytes.subarray(offset, offset + 11);
    const nullIdx = nameBytes.indexOf(0);
    const name = new TextDecoder('ascii')
      .decode(nullIdx >= 0 ? nameBytes.subarray(0, nullIdx) : nameBytes)
      .trim();
    const type = String.fromCharCode(bytes[offset + 11]);
    const length = bytes[offset + 16];
    fields.push({ name, type, length });
    offset += 32;
  }

  const records: Record<string, string>[] = [];
  let recOffset = headerSize;
  for (let r = 0; r < numRecords && recOffset + recordSize <= bytes.length; r++) {
    const deletedFlag = bytes[recOffset];
    let fieldOffset = recOffset + 1;
    const row: Record<string, string> = {};
    for (const f of fields) {
      const valBytes = bytes.subarray(fieldOffset, fieldOffset + f.length);
      row[f.name] = decodeDbfString(valBytes);
      fieldOffset += f.length;
    }
    if (deletedFlag !== 0x2a) {
      records.push(row);
    }
    recOffset += recordSize;
  }
  return records;
}

function parseShpPolygons(buffer: ArrayBuffer, utmZone: 47 | 48): Point2D[][] {
  const view = new DataView(buffer);
  const polygons: Point2D[][] = [];
  let offset = 100;

  while (offset + 8 <= buffer.byteLength) {
    const contentLengthWords = view.getInt32(offset + 4, false);
    const contentBytes = contentLengthWords * 2;
    const recStart = offset + 8;
    if (recStart + contentBytes > buffer.byteLength) break;

    const shapeType = view.getInt32(recStart, true);
    if (shapeType === 5 || shapeType === 15 || shapeType === 25) {
      const numParts = view.getInt32(recStart + 36, true);
      const numPoints = view.getInt32(recStart + 40, true);
      const partsOffset = recStart + 44;
      const pointsOffset = partsOffset + numParts * 4;

      if (numParts > 0 && numPoints >= 3) {
        const firstPartStart = view.getInt32(partsOffset, true);
        const nextPartStart =
          numParts > 1 ? view.getInt32(partsOffset + 4, true) : numPoints;
        const ring: number[][] = [];
        for (let p = firstPartStart; p < nextPartStart; p++) {
          const px = view.getFloat64(pointsOffset + p * 16, true);
          const py = view.getFloat64(pointsOffset + p * 16 + 8, true);
          ring.push([px, py]);
        }
        polygons.push(normalizeRingCoords(ring, utmZone));
      } else {
        polygons.push([]);
      }
    } else {
      polygons.push([]);
    }

    offset = recStart + contentBytes;
  }

  return polygons;
}

/**
 * Parse KML string or KMZ zip archive containing KML data from Google Earth / LandsMaps
 */
function parseKmlString(kmlText: string, utmZone: 47 | 48): DolSection10Parcel[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(kmlText, 'text/xml');
  const placemarks = xml.getElementsByTagName('Placemark');
  const parcels: DolSection10Parcel[] = [];

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const nameEl = pm.getElementsByTagName('name')[0];
    const descEl = pm.getElementsByTagName('description')[0];
    const name = nameEl ? nameEl.textContent?.trim() || `แปลงที่ ${i + 1}` : `แปลงที่ ${i + 1}`;
    const desc = descEl ? descEl.textContent?.trim() || '' : '';

    // Extract coordinates from Polygon or LinearRing
    const polyEl = pm.getElementsByTagName('Polygon')[0] || pm.getElementsByTagName('LinearRing')[0];
    if (!polyEl) continue;
    const coordEl = polyEl.getElementsByTagName('coordinates')[0];
    if (!coordEl || !coordEl.textContent) continue;

    const rawCoordsStr = coordEl.textContent.trim();
    const coordTuples = rawCoordsStr.split(/\s+/);
    const ring: number[][] = [];

    for (const t of coordTuples) {
      const parts = t.split(',');
      if (parts.length >= 2) {
        const lng = Number(parts[0]);
        const lat = Number(parts[1]);
        if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
          ring.push([lng, lat]);
        }
      }
    }

    if (ring.length >= 3) {
      const polygon = normalizeRingCoords(ring, utmZone);
      const props: Record<string, unknown> = {
        PARCEL_CODE: `01KMZ${String(i + 1).padStart(3, '0')}`,
        DEED_NO: name.replace(/[^0-9]/g, '') || `${85000 + i}`,
        OWNER_NAME: desc ? desc.slice(0, 40) : `ผู้ถือครองแปลง KMZ ${i + 1}`,
      };
      parcels.push(buildParcelFromProps(props, polygon, i));
    }
  }

  return parcels;
}

export async function parseSection10File(
  file: File,
  utmZone: 47 | 48 = 47
): Promise<DolSection10Parcel[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'kmz') {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const kmlEntry = Object.values(zip.files).find((f) =>
      f.name.toLowerCase().endsWith('.kml')
    );
    if (!kmlEntry) {
      throw new Error('ไม่พบไฟล์ .kml ภายในไฟล์ .kmz กรุณาตรวจสอบไฟล์ KMZ');
    }
    const kmlText = await kmlEntry.async('text');
    const parcels = parseKmlString(kmlText, utmZone);
    if (parcels.length === 0) {
      throw new Error('ไม่พบข้อมูล Polygon Placemark ภายในไฟล์ KMZ');
    }
    return parcels;
  }

  if (ext === 'kml') {
    const kmlText = await file.text();
    const parcels = parseKmlString(kmlText, utmZone);
    if (parcels.length === 0) {
      throw new Error('ไม่พบข้อมูล Polygon Placemark ภายในไฟล์ KML');
    }
    return parcels;
  }

  if (ext === 'zip') {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const shpEntry = Object.values(zip.files).find((f) =>
      f.name.toLowerCase().endsWith('.shp')
    );
    if (!shpEntry) {
      throw new Error('ไม่พบไฟล์ .shp ภายในไฟล์ .zip กรุณาตรวจสอบชุดไฟล์ Shapefile');
    }
    const dbfEntry = Object.values(zip.files).find((f) =>
      f.name.toLowerCase().endsWith('.dbf')
    );

    const shpBuf = await shpEntry.async('arraybuffer');
    const polygons = parseShpPolygons(shpBuf, utmZone);
    const attrs = dbfEntry ? parseDbfBuffer(await dbfEntry.async('arraybuffer')) : [];

    const parcels: DolSection10Parcel[] = [];
    for (let i = 0; i < polygons.length; i++) {
      if (polygons[i].length < 3) continue;
      parcels.push(buildParcelFromProps(attrs[i] || {}, polygons[i], i));
    }
    if (parcels.length === 0) {
      throw new Error('ไม่พบรูปแปลงแบบ Polygon ในไฟล์ Shapefile');
    }
    return parcels;
  }

  if (ext === 'geojson' || ext === 'json') {
    const text = await file.text();
    const json = JSON.parse(text);
    const features = Array.isArray(json.features)
      ? json.features
      : json.type === 'Feature'
      ? [json]
      : [];

    const parcels: DolSection10Parcel[] = [];
    features.forEach((feat: { geometry?: { type?: string; coordinates?: unknown }; properties?: Record<string, unknown> }, idx: number) => {
      if (!feat.geometry) return;
      let rawRing: number[][] = [];
      if (feat.geometry.type === 'Polygon' && Array.isArray(feat.geometry.coordinates)) {
        rawRing = (feat.geometry.coordinates[0] as number[][]) || [];
      } else if (
        feat.geometry.type === 'MultiPolygon' &&
        Array.isArray(feat.geometry.coordinates)
      ) {
        rawRing = ((feat.geometry.coordinates[0] as number[][][])?.[0] as number[][]) || [];
      }
      const polygon = normalizeRingCoords(rawRing, utmZone);
      if (polygon.length >= 3) {
        parcels.push(buildParcelFromProps(feat.properties || {}, polygon, idx));
      }
    });
    if (parcels.length === 0) {
      throw new Error('ไม่พบ Polygon Feature ในไฟล์ GeoJSON');
    }
    return parcels;
  }

  if (ext === 'csv') {
    const buf = await file.arrayBuffer();
    let text = '';
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    } catch {
      text = new TextDecoder('windows-874').decode(buf);
    }
    const lines = text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('ไฟล์ CSV ไม่มีข้อมูลแถว');
    }

    const parseCsvRow = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseCsvRow(lines[0]);
    const parcels: DolSection10Parcel[] = [];

    for (let r = 1; r < lines.length; r++) {
      const cols = parseCsvRow(lines[r]);
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx] || '';
      });

      const wkt = rowObj.WKT || rowObj.wkt || rowObj.GEOMETRY || rowObj.geometry || '';
      let polygon: Point2D[] = [];
      const match = wkt.match(/POLYGON\s*\(\(([^)]+)\)\)/i);
      if (match) {
        const pairs = match[1].split(',').map((pair) => {
          const parts = pair.trim().split(/\s+/).map(Number);
          return [parts[0], parts[1]];
        });
        polygon = normalizeRingCoords(pairs, utmZone);
      } else {
        const cx = Number(rowObj.X || rowObj.E || rowObj.LNG || 674200 + r * 35);
        const cy = Number(rowObj.Y || rowObj.N || rowObj.LAT || 1555200);
        const basePt =
          Math.abs(cx) <= 180 && Math.abs(cy) <= 90
            ? latLngToUtm(cy, cx, utmZone)
            : { x: cx, y: cy };
        const half = Math.sqrt((Number(rowObj.AREA_WA || 100) || 100) * 4) / 2;
        polygon = [
          { x: basePt.x - half, y: basePt.y - half },
          { x: basePt.x + half, y: basePt.y - half },
          { x: basePt.x + half, y: basePt.y + half },
          { x: basePt.x - half, y: basePt.y + half },
        ];
      }

      if (polygon.length >= 3) {
        parcels.push(buildParcelFromProps(rowObj, polygon, r - 1));
      }
    }
    return parcels;
  }

  throw new Error('รองรับเฉพาะไฟล์ .kmz, .kml, .zip (Shapefile), .geojson หรือ .csv');
}

export function exportAdjustedGeoJSON(
  parcels: DolSection10Parcel[],
  utmZone: 47 | 48 = 47
): void {
  const fc = {
    type: 'FeatureCollection',
    name: 'LTAX_Section10_Adjusted',
    features: parcels.map((p) => {
      const ring = [...p.adjustedPolygon, p.adjustedPolygon[0]].map((pt) => {
        const ll = utmToLatLng(pt.x, pt.y, utmZone);
        return [
          Math.round(ll.lng * 1000000) / 1000000,
          Math.round(ll.lat * 1000000) / 1000000,
        ];
      });
      return {
        type: 'Feature',
        properties: {
          PARCEL_CODE: p.ltaxParcelCode,
          DEED_TYPE: p.deedType,
          DEED_NO: p.deedNo,
          UTMMAP: p.utmMap,
          LAND_NO: p.landNo,
          SURVEY_NO: p.surveyNo,
          OWNER_NAME: p.ownerName,
          RAI: p.rai,
          NGAN: p.ngan,
          SQ_WA: p.sqWa,
          DOL_SQWA: p.dolSqWa,
          CALC_SQWA: p.calculatedSqWa,
          LAND_USE: p.landUse,
          ASSESS_PRICE_WA: p.assessedPricePerSqWa,
          STATUS: p.status,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [ring],
        },
      };
    }),
  };

  const blob = new Blob([JSON.stringify(fc, null, 2)], {
    type: 'application/geo+json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ltax_section10_adjusted_${new Date().toISOString().slice(0, 10)}.geojson`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPhorThor7CSV(records: PhorThor7Record[]): void {
  const headers = [
    'ปีภาษี',
    'รหัสแปลงที่ดิน',
    'ประเภทเอกสารสิทธิ์',
    'เลขที่เอกสารสิทธิ์',
    'ระวาง',
    'เลขที่ดิน',
    'หน้าสำรวจ',
    'ชื่อผู้เสียภาษี',
    'เลขประจำตัว',
    'ไร่',
    'งาน',
    'ตร.วา',
    'เนื้อที่รวม(ตร.วา)',
    'ราคาประเมิน(บาท/ตร.วา)',
    'มูลค่าที่ดิน(บาท)',
    'มูลค่าสิ่งปลูกสร้าง(บาท)',
    'การใช้ประโยชน์',
    'ฐานภาษีสุทธิ(บาท)',
    'อัตราภาษี(%)',
    'ภาษีที่คำนวณได้(บาท)',
  ];

  const rows = records.map((r) => [
    r.fiscalYear,
    r.parcelCode,
    r.deedType,
    r.deedNo,
    r.utmMap,
    r.landNo,
    r.surveyNo,
    `"${r.ownerName.replace(/"/g, '""')}"`,
    r.ownerId,
    r.rai,
    r.ngan,
    r.sqWa,
    r.totalSqWa,
    r.assessedPricePerSqWa,
    r.landAssessedValue,
    r.building.netBuildingValue,
    r.landUse,
    r.netTaxableValue,
    r.taxRatePercent,
    r.calculatedTaxBaht,
  ]);

  const csvContent =
    '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `phor_thor_7_registry_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
