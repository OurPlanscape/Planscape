import * as turf from '@turf/turf';
import proj4 from 'proj4';
import { Feature, Position } from 'geojson';

const CONVERSION_SQM_ACRES = 4046.8564213562374;
const epsg5070 =
  '+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs';
const epsg4326 = '+proj=longlat +datum=WGS84 +no_defs +type=crs';

// accepts polygon and multipolygon features
function getTotalAcreage(feature: Feature): number {
  if (!turf.booleanValid(feature)) {
    return 0;
  }
  try {
    const coords = getOuterRingCoordinates(feature);
    const projectedCoords = coords.map((coord) =>
      proj4(epsg4326, epsg5070, coord)
    );

    const areaInSquareMeters = calculateArea(projectedCoords);
    const areaInAcres = areaInSquareMeters / CONVERSION_SQM_ACRES;
    return Math.round(areaInAcres * 100) / 100;
  } catch (error) {
    console.error('Error calculating acreage:', error);
    return 0;
  }
}

function getOuterRingCoordinates(feature: Feature): Position[] {
  if (feature.geometry.type === 'Polygon') {
    return feature.geometry.coordinates[0];
  } else if (feature.geometry.type === 'MultiPolygon') {
    return feature.geometry.coordinates[0][0];
  }
  throw new Error('Unsupported geometry type');
}

function calculateArea(coordinates: Position[]): number {
  let area = 0;
  const n = coordinates.length - 1; // Last point same as first in GeoJSON
  for (let i = 0; i < n; i++) {
    const [x1, y1] = coordinates[i];
    const [x2, y2] = coordinates[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

export { getTotalAcreage };
