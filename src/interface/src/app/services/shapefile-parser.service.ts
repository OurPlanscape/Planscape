import { Injectable } from '@angular/core';
import * as shp from 'shpjs';
import {
  InvalidCoordinatesError,
  MultipleShapefilesError,
  UnknownShapefileError,
} from './errors';

// shapefile-parser.service.ts
@Injectable({ providedIn: 'root' })
export class ShapefileParserService {
  readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  async parseAndValidate(
    buffer: ArrayBuffer
  ): Promise<GeoJSON.FeatureCollection> {
    const geojson = (await shp.parseZip(buffer)) as GeoJSON.GeoJSON;

    if (Array.isArray(geojson)) {
      throw new MultipleShapefilesError(
        'The upload contains multiple shapefiles and could not be processed.'
      );
    }

    if (geojson.type !== 'FeatureCollection') {
      throw new UnknownShapefileError(
        'The file cannot be converted to GeoJSON.'
      );
    }

    if (geojson.features.length < 1) {
      throw new InvalidCoordinatesError(
        'Invalid Shapefile: No features were detected in this uploaded shapefile.'
      );
    }

    geojson.features.forEach((feature, index) => {
      const geom = feature.geometry;

      if (geom.type === 'LineString' || geom.type === 'Point') {
        throw new InvalidCoordinatesError(
          `Invalid Shapefile: Element at index: ${index} is a ${geom.type}.`
        );
      }

      if (geom.type !== 'GeometryCollection') {
        if (!geom.coordinates || geom.coordinates.length === 0) {
          throw new InvalidCoordinatesError(
            `Invalid Shapefile: Geometry coordinates at feature ${index} are empty.`
          );
        }
      } else if (geom.geometries.length === 0) {
        throw new InvalidCoordinatesError(
          `Invalid Shapefile: GeometryCollection at index ${index} is empty.`
        );
      }
    });

    return geojson;
  }

  getUserFacingErrorMessage(e: unknown): string {
    if (e instanceof InvalidCoordinatesError) {
      return 'The upload contains features with invalid coordinates.';
    }
    if (
      e instanceof MultipleShapefilesError ||
      e instanceof UnknownShapefileError
    ) {
      return e.message;
    }
    return 'The zip file does not appear to contain a valid shapefile.';
  }
}
