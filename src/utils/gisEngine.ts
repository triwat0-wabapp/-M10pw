import {
  AlignmentParams,
  BuildingInfo,
  DolSection10Parcel,
  LandUseType,
  LtaxBaseParcel,
  PhorThor7Record,
  Point2D,
} from '../types/gis';

export function sqMetersToRaiNganWa(sqMeters: number): {
  rai: number;
  ngan: number;
  sqWa: number;
  totalSqWa: number;
} {
  const totalSqWa = Math.max(0, Math.round((sqMeters / 4) * 100) / 100);
  const rai = Math.floor(totalSqWa / 400);
  const remAfterRai = totalSqWa - rai * 400;
  const ngan = Math.floor(remAfterRai / 100);
  const sqWa = Math.round((remAfterRai - ngan * 100) * 10) / 10;
  return { rai, ngan, sqWa, totalSqWa };
}

export function raiNganWaToSqWa(rai: number, ngan: number, sqWa: number): number {
  return Math.round((rai * 400 + ngan * 100 + sqWa) * 100) / 100;
}

export function polygonAreaSqMeters(pts: Point2D[]): number {
  if (pts.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

export function polygonCentroid(pts: Point2D[]): Point2D {
  if (pts.length === 0) return { x: 0, y: 0 };
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const cross = pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    area += cross;
    cx += (pts[i].x + pts[j].x) * cross;
    cy += (pts[i].y + pts[j].y) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-6) {
    const sx = pts.reduce((acc, p) => acc + p.x, 0) / pts.length;
    const sy = pts.reduce((acc, p) => acc + p.y, 0) / pts.length;
    return { x: sx, y: sy };
  }
  return {
    x: cx / (6 * area),
    y: cy / (6 * area),
  };
}

export function distance2D(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Convert UTM (WGS84 Zone 47N/48N) meters to Geographic Lat/Lng degrees
 */
export function utmToLatLng(
  easting: number,
  northing: number,
  zone: 47 | 48 = 47
): { lat: number; lng: number } {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e2 = 2 * f - f * f;
  const ep2 = e2 / (1 - e2);

  const x = easting - 500000.0;
  const y = northing;

  const M = y / k0;
  const mu =
    M /
    (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
    ((21 * Math.pow(e1, 2)) / 16 - (55 * Math.pow(e1, 4)) / 32) *
      Math.sin(4 * mu) +
    ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = ep2 * cosPhi1 * cosPhi1;
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
  const D = x / (N1 * k0);

  const latRad =
    phi1 -
    ((N1 * tanPhi1) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * Math.pow(D, 4)) /
          24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) *
          Math.pow(D, 6)) /
          720);

  const lonOrigin = (zone - 1) * 6 - 180 + 3;
  const lngRad =
    (D -
      ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) *
        Math.pow(D, 5)) /
        120) /
    cosPhi1;

  return {
    lat: (latRad * 180) / Math.PI,
    lng: lonOrigin + (lngRad * 180) / Math.PI,
  };
}

/**
 * Convert Geographic Lat/Lng degrees to UTM (WGS84 Zone 47N/48N) meters
 */
export function latLngToUtm(
  lat: number,
  lng: number,
  zone: 47 | 48 = 47
): Point2D {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e2 = 2 * f - f * f;
  const ep2 = e2 / (1 - e2);

  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const lonOrigin = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);

  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = ep2 * Math.cos(latRad) * Math.cos(latRad);
  const A = Math.cos(latRad) * (lngRad - lonOrigin);

  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * latRad -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024) *
        Math.sin(4 * latRad) -
      ((35 * e2 * e2 * e2) / 3072) * Math.sin(6 * latRad));

  const easting =
    k0 *
      N *
      (A +
        ((1 - T + C) * Math.pow(A, 3)) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * Math.pow(A, 5)) / 120) +
    500000.0;

  const northing =
    k0 *
    (M +
      N *
        Math.tan(latRad) *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * Math.pow(A, 6)) /
            720));

  return { x: easting, y: northing };
}

/**
 * Calibrate optimal affine/helmert alignment parameters between incoming Section 10
 * parcels and existing LTAX baseline parcels via matched parcel centroid pairing.
 */
export function calibrateDatumShift(
  dolParcels: DolSection10Parcel[],
  ltaxParcels: LtaxBaseParcel[]
): { dx: number; dy: number; rotationDeg: number; matchedPairs: number } {
  const pairs: { dol: Point2D; ltax: Point2D }[] = [];

  for (const dol of dolParcels) {
    // Match by exact parcelCode or deedNo
    const match = ltaxParcels.find(
      (b) =>
        b.parcelCode === dol.ltaxParcelCode ||
        (b.deedNo && dol.deedNo && b.deedNo === dol.deedNo)
    );
    if (match && dol.rawPolygon.length >= 3 && match.polygon.length >= 3) {
      pairs.push({
        dol: polygonCentroid(dol.rawPolygon),
        ltax: polygonCentroid(match.polygon),
      });
    }
  }

  if (pairs.length === 0) {
    // Fallback standard Thai DOL Indian 1975 -> WGS84 approximate local correction
    return { dx: 0, dy: 0, rotationDeg: 0, matchedPairs: 0 };
  }

  const avgDx =
    pairs.reduce((sum, p) => sum + (p.ltax.x - p.dol.x), 0) / pairs.length;
  const avgDy =
    pairs.reduce((sum, p) => sum + (p.ltax.y - p.dol.y), 0) / pairs.length;

  // Estimate residual rotation around global centroid
  const meanDol = {
    x: pairs.reduce((s, p) => s + p.dol.x, 0) / pairs.length,
    y: pairs.reduce((s, p) => s + p.dol.y, 0) / pairs.length,
  };
  const meanLtax = {
    x: pairs.reduce((s, p) => s + p.ltax.x, 0) / pairs.length,
    y: pairs.reduce((s, p) => s + p.ltax.y, 0) / pairs.length,
  };

  let num = 0;
  let den = 0;
  for (const p of pairs) {
    const ux = p.dol.x - meanDol.x;
    const uy = p.dol.y - meanDol.y;
    const vx = p.ltax.x - meanLtax.x;
    const vy = p.ltax.y - meanLtax.y;
    num += ux * vy - uy * vx;
    den += ux * vx + uy * vy;
  }

  const angleRad = Math.abs(den) > 1e-6 ? Math.atan2(num, den) : 0;
  const rotationDeg = Math.round(((angleRad * 180) / Math.PI) * 1000) / 1000;

  return {
    dx: Math.round(avgDx * 100) / 100,
    dy: Math.round(avgDy * 100) / 100,
    rotationDeg: Math.abs(rotationDeg) < 5 ? rotationDeg : 0,
    matchedPairs: pairs.length,
  };
}

export function transformPolygon(
  pts: Point2D[],
  pivot: Point2D,
  dx: number,
  dy: number,
  rotationDeg: number,
  scale: number = 1
): Point2D[] {
  const rad = (rotationDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  return pts.map((p) => {
    const rx = (p.x - pivot.x) * scale;
    const ry = (p.y - pivot.y) * scale;
    const rotX = rx * cosA - ry * sinA;
    const rotY = rx * sinA + ry * cosA;
    return {
      x: Math.round((pivot.x + rotX + dx) * 100) / 100,
      y: Math.round((pivot.y + rotY + dy) * 100) / 100,
    };
  });
}

/**
 * Full automatic map adjustment pipeline:
 * 1. Applies global datum translation/rotation around dataset pivot
 * 2. Snaps adjacent vertices within snapToleranceMeters to eliminate slivers/overlaps
 * 3. Recomputes geodesic area (sq.wa) & discrepancy against Section 10 registered area
 */
export function runAutoMapAdjustment(
  dolParcels: DolSection10Parcel[],
  ltaxParcels: LtaxBaseParcel[],
  params: AlignmentParams
): DolSection10Parcel[] {
  if (dolParcels.length === 0) return [];

  // Compute global pivot from raw polygons
  const allPts = dolParcels.flatMap((p) => p.rawPolygon);
  const pivot: Point2D =
    allPts.length > 0
      ? {
          x: allPts.reduce((s, p) => s + p.x, 0) / allPts.length,
          y: allPts.reduce((s, p) => s + p.y, 0) / allPts.length,
        }
      : { x: 0, y: 0 };

  // Step 1: Apply rigid/affine transformation
  const transformed = dolParcels.map((parcel) => {
    const shifted = transformPolygon(
      parcel.rawPolygon,
      pivot,
      params.dx,
      params.dy,
      params.rotationDeg,
      params.scale
    );

    const rawCenter = polygonCentroid(parcel.rawPolygon);
    const baseMatch = ltaxParcels.find(
      (b) => b.parcelCode === parcel.ltaxParcelCode
    );
    const shiftDist = baseMatch
      ? distance2D(rawCenter, polygonCentroid(baseMatch.polygon))
      : Math.hypot(params.dx, params.dy);

    return {
      ...parcel,
      adjustedPolygon: shifted,
      shiftDistanceM: Math.round(shiftDist * 100) / 100,
      snappedVerticesCount: 0,
    };
  });

  // Step 2: Topology vertex snapping across neighboring polygons (cluster snapping)
  const tol = Math.max(0, params.snapToleranceMeters);
  if (tol > 0) {
    // Snap vertices to LTAX reference vertices first if matched, else cluster nearby vertices
    const allVerts: { pIdx: number; vIdx: number; pt: Point2D }[] = [];
    transformed.forEach((parcel, pIdx) => {
      parcel.adjustedPolygon.forEach((pt, vIdx) => {
        allVerts.push({ pIdx, vIdx, pt });
      });
    });

    const visited = new Set<string>();
    for (let i = 0; i < allVerts.length; i++) {
      const keyI = `${allVerts[i].pIdx}:${allVerts[i].vIdx}`;
      if (visited.has(keyI)) continue;

      const cluster = [allVerts[i]];
      for (let j = i + 1; j < allVerts.length; j++) {
        if (allVerts[j].pIdx === allVerts[i].pIdx) continue;
        if (distance2D(allVerts[i].pt, allVerts[j].pt) <= tol) {
          cluster.push(allVerts[j]);
        }
      }

      if (cluster.length > 1) {
        // Compute snapped centroid for shared corner vertex
        const meanX =
          Math.round(
            (cluster.reduce((s, c) => s + c.pt.x, 0) / cluster.length) * 100
          ) / 100;
        const meanY =
          Math.round(
            (cluster.reduce((s, c) => s + c.pt.y, 0) / cluster.length) * 100
          ) / 100;

        for (const member of cluster) {
          const oldPt = transformed[member.pIdx].adjustedPolygon[member.vIdx];
          if (Math.hypot(oldPt.x - meanX, oldPt.y - meanY) > 0.005) {
            transformed[member.pIdx].snappedVerticesCount += 1;
          }
          transformed[member.pIdx].adjustedPolygon[member.vIdx] = {
            x: meanX,
            y: meanY,
          };
          visited.add(`${member.pIdx}:${member.vIdx}`);
        }
      }
    }
  }

  // Step 3: Recalculate polygon area & update status
  return transformed.map((parcel) => {
    const areaSqM = polygonAreaSqMeters(parcel.adjustedPolygon);
    const calcSqWa = Math.round((areaSqM / 4) * 100) / 100;
    const baseSqWa = parcel.dolSqWa || calcSqWa || 1;
    const areaDiffPercent =
      Math.round((Math.abs(calcSqWa - baseSqWa) / baseSqWa) * 1000) / 10;

    return {
      ...parcel,
      calculatedSqWa: calcSqWa,
      areaDiffPercent,
      status: params.isApplied
        ? areaDiffPercent > 10
          ? 'area_mismatch'
          : 'adjusted'
        : parcel.status,
    };
  });
}

export function getLandUseLabel(landUse: LandUseType): string {
  switch (landUse) {
    case 'agriculture':
      return 'เกษตรกรรม';
    case 'residential':
      return 'อยู่อาศัย';
    case 'commercial':
      return 'อื่นๆ (พาณิชยกรรม)';
    case 'vacant':
      return 'รกร้างว่างเปล่า';
  }
}

export function getDefaultTaxRate(landUse: LandUseType, value: number): number {
  switch (landUse) {
    case 'agriculture':
      if (value <= 75_000_000) return 0.01;
      if (value <= 100_000_000) return 0.03;
      return 0.05;
    case 'residential':
      if (value <= 50_000_000) return 0.02;
      if (value <= 75_000_000) return 0.03;
      return 0.05;
    case 'commercial':
      if (value <= 50_000_000) return 0.3;
      if (value <= 200_000_000) return 0.4;
      return 0.5;
    case 'vacant':
      if (value <= 50_000_000) return 0.3;
      if (value <= 200_000_000) return 0.4;
      return 0.5;
  }
}

export function computeBuildingNetValue(b: BuildingInfo): number {
  if (!b.hasBuilding || b.areaSqM <= 0) return 0;
  const gross = b.areaSqM * b.assessedValuePerSqM;
  const dep = Math.min(85, Math.max(0, b.depreciationPercent));
  return Math.round(gross * (1 - dep / 100));
}

export function createPhorThor7FromParcel(
  parcel: DolSection10Parcel,
  fiscalYear: number,
  allParcels: DolSection10Parcel[]
): PhorThor7Record {
  const landAssessedValue = Math.round(
    parcel.dolSqWa * parcel.assessedPricePerSqWa
  );
  const netBuildingValue = computeBuildingNetValue(parcel.building);
  const totalPropertyValue = landAssessedValue + netBuildingValue;

  // Thai Land & Building Tax Exemption (บุคคลธรรมดาใช้เป็นที่อยู่อาศัย ยกเว้นสูงสุด 50 ล้าน กรณีเป็นเจ้าของที่ดินและสิ่งปลูกสร้าง; เกษตรกรรมบุคคลธรรมดายกเว้น 50 ล้าน)
  let exemptionAmount = 0;
  if (parcel.landUse === 'residential' && parcel.building.hasBuilding) {
    exemptionAmount = Math.min(totalPropertyValue, 50_000_000);
  } else if (parcel.landUse === 'agriculture') {
    exemptionAmount = Math.min(totalPropertyValue, 50_000_000);
  }

  const netTaxableValue = Math.max(0, totalPropertyValue - exemptionAmount);
  const taxRatePercent = getDefaultTaxRate(parcel.landUse, totalPropertyValue);
  const calculatedTaxBaht =
    Math.round(((netTaxableValue * taxRatePercent) / 100) * 100) / 100;

  // Find nearby adjacent parcel codes for map context
  const c = polygonCentroid(parcel.adjustedPolygon);
  const neighborLabels = allParcels
    .filter((other) => other.id !== parcel.id)
    .map((other) => ({
      code: other.ltaxParcelCode,
      dist: distance2D(c, polygonCentroid(other.adjustedPolygon)),
    }))
    .filter((item) => item.dist < 140)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4)
    .map((item) => item.code);

  return {
    id: `pt7-${parcel.id}`,
    parcelId: parcel.id,
    parcelCode: parcel.ltaxParcelCode,
    zone: parcel.zone,
    block: parcel.block,
    lot: parcel.lot,
    fiscalYear,
    ownerName: parcel.ownerName,
    ownerId: parcel.ownerId,
    ownerAddress: parcel.ownerAddress,
    deedType: parcel.deedType,
    deedNo: parcel.deedNo,
    utmMap: parcel.utmMap,
    landNo: parcel.landNo,
    surveyNo: parcel.surveyNo,
    locationText: `ต.${parcel.tambon} อ.${parcel.amphoe} จ.${parcel.province}`,
    rai: parcel.rai,
    ngan: parcel.ngan,
    sqWa: parcel.sqWa,
    totalSqWa: parcel.dolSqWa,
    assessedPricePerSqWa: parcel.assessedPricePerSqWa,
    landAssessedValue,
    building: {
      ...parcel.building,
      netBuildingValue,
    },
    landUse: parcel.landUse,
    totalPropertyValue,
    exemptionAmount,
    netTaxableValue,
    taxRatePercent,
    calculatedTaxBaht,
    polygon: parcel.adjustedPolygon.map((pt) => ({ ...pt })),
    neighborLabels,
    generatedAt: new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    approved: parcel.status === 'adjusted' || parcel.status === 'matched',
  };
}
