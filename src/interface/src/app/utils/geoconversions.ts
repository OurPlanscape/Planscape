import * as turf from '@turf/turf';
import proj4 from 'proj4';
import { Feature, Polygon, MultiPolygon, Position } from 'geojson';

const CONVERSION_SQM_ACRES = 4046.8564213562374;

interface GeoJSONStoreFeatures extends Feature<Polygon | MultiPolygon> {
    // Add any additional properties your type has
}

// Define EPSG:5070 projection (Albers Equal Area Conic for US)
const epsg5070 = '+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs';
const epsg4326 = '+proj=longlat +datum=WGS84 +no_defs +type=crs';

function getTotalAcreage(polygon: GeoJSONStoreFeatures): number {
    if (!turf.booleanValid(polygon)) {
        return 0;
    }

    try {
        // Get the first set of coordinates (outer ring)
        const coords = getOuterRingCoordinates(polygon);

        // Transform to EPSG:5070 using direct proj strings
        const projectedCoords = coords.map(coord =>
            proj4(epsg4326, epsg5070, coord)
        );

        // Calculate area using shoelace formula
        const areaInSquareMeters = calculateArea(projectedCoords);
        const areaInAcres = areaInSquareMeters / CONVERSION_SQM_ACRES;
        return Math.round(areaInAcres * 100) / 100;
    } catch (error) {
        console.error('Error calculating acreage:', error);
        return 0;
    }
}

function getOuterRingCoordinates(polygon: GeoJSONStoreFeatures): Position[] {
    if (polygon.geometry.type === 'Polygon') {
        return polygon.geometry.coordinates[0]; // First ring is outer ring
    } else if (polygon.geometry.type === 'MultiPolygon') {
        return polygon.geometry.coordinates[0][0]; // First polygon, first ring
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

// // Option 2: Manual projection-based calculation (matches backend exactly)
// function getTotalAcreageComplex(polygon: GeoJSONStoreFeatures): number {
//     console.log('we have this polygon in getTotalAcreage:', polygon);
//     if (!turf.booleanValid(polygon)) {
//         return 0;
//     }

//     // Define EPSG:5070 projection
//     proj4.defs('EPSG:5070', '+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

//     try {
//         // Transform coordinates to EPSG:5070
//         const transformedCoords: Position[][] = transformCoordinates(polygon.geometry.coordinates, 'EPSG:4326', 'EPSG:5070');

//         // Calculate area using shoelace formula (since we're now in a projected coordinate system)
//         const areaInSquareMeters: number = calculateProjectedArea(transformedCoords);
//         const areaInAcres: number = areaInSquareMeters / CONVERSION_SQM_ACRES;

//         return Math.round(areaInAcres * 100) / 100;
//     } catch (error) {
//         console.error('Error calculating acreage with projection:', error);
//         return 0;
//     }
// }

// function transformCoordinates(
//     coordinates: Position[][] | Position[][][],
//     fromProj: string,
//     toProj: string
// ): Position[][] {
//     // Check if it's a MultiPolygon (3D array) or Polygon (2D array)
//     if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0]) && Array.isArray(coordinates[0][0][0])) {
//         // MultiPolygon - take the first polygon for simplicity
//         const multiPolygonCoords = coordinates as Position[][][];
//         return multiPolygonCoords[0].map((ring: Position[]) =>
//             ring.map((coord: Position) => proj4(fromProj, toProj, coord) as Position)
//         );
//     } else {
//         // Polygon
//         const polygonCoords = coordinates as Position[][];
//         return polygonCoords.map((ring: Position[]) =>
//             ring.map((coord: Position) => proj4(fromProj, toProj, coord) as Position)
//         );
//     }
// }

// function calculateProjectedArea(coordinates: Position[][]): number {
//     // Use shoelace formula for the outer ring (first ring)
//     const outerRing: Position[] = coordinates[0];
//     let area: number = Math.abs(shoelaceArea(outerRing));

//     // Subtract inner rings (holes)
//     for (let i = 1; i < coordinates.length; i++) {
//         area -= Math.abs(shoelaceArea(coordinates[i]));
//     }

//     return area;
// }

// function shoelaceArea(ring: Position[]): number {
//     let area: number = 0;
//     const n: number = ring.length - 1; // Last point same as first in GeoJSON

//     for (let i = 0; i < n; i++) {
//         const [x1, y1] = ring[i];
//         const [x2, y2] = ring[i + 1];
//         area += x1 * y2 - x2 * y1;
//     }

//     return Math.abs(area) / 2;
// }

// // Option 3: Simple fix - ensure proper typing for Turf area calculation
// function getTotalAcreageSimple(polygon: GeoJSONStoreFeatures): number {
//     if (!turf.booleanValid(polygon)) {
//         return 0;
//     }

//     try {
//         // Turf.area already does geodesic calculation by default
//         const areaInSquareMeters: number = turf.area(polygon);
//         const areaInAcres: number = areaInSquareMeters / CONVERSION_SQM_ACRES;

//         return areaInAcres;
//     } catch (error) {
//         console.error('Error calculating acreage:', error);
//         return 0;
//     }
// }

export {
    getTotalAcreage,
    // getTotalAcreageComplex
    type GeoJSONStoreFeatures
};