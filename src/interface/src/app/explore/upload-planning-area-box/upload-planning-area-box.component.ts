import { Component, EventEmitter, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import * as shp from 'shpjs';
import GJV from 'geojson-validation';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DrawService } from 'src/app/maplibre-map/draw.service';
import booleanValid from '@turf/boolean-valid';
import flatten from '@turf/flatten'
import kinks from '@turf/kinks';
import { FileUploadFieldComponent, ModalInfoComponent } from '@styleguide';

@Component({
  selector: 'app-upload-planning-area-box',
  standalone: true,
  imports: [
    FileUploadFieldComponent,
    MatButtonModule,
    ModalInfoComponent,
    NgIf,
    FormsModule,
    MatButtonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './upload-planning-area-box.component.html',
  styleUrl: './upload-planning-area-box.component.scss',
})
export class UploadPlanningAreaBoxComponent {
  uploadPlanningAreaForm!: FormGroup;

  uploadElementStatus: 'default' | 'failed' | 'running' | 'uploaded' =
    'default';
  file: File | null = null;
  geometries: GeoJSON.GeoJSON | null = null;
  uploadFormError?: string | null = null;
  @Output() uploadedShape = new EventEmitter();

  constructor(
    private fb: FormBuilder,
    private drawService: DrawService
  ) {
    this.uploadPlanningAreaForm = this.fb.group({
      scenarioName: this.fb.control('', [Validators.required]),
      standSize: this.fb.control('MEDIUM', [Validators.required]),
    });
  }

  handleFileEvent(file: File | undefined): void {
    this.uploadElementStatus = 'running';
    if (file !== undefined) {
      // async:
      this.convertToGeoJson(file);
    } else {
      this.uploadElementStatus = 'default';
      this.file = null;
    }
  }

  validateGeoJSONFeatures(geoJSON: GeoJSON.GeoJSON): boolean {
    const ix: any[] = [];
    if (geoJSON.type === 'FeatureCollection') {
      console.log('this is a featurecollection...');


      const res :boolean = geoJSON.features.every((f) => {
        console.log('inspecting feature:', f);
        console.log('what kind of feature is this supposed to be?', f.geometry.type);
        if (f.geometry.type === 'MultiPolygon') {
          const flattenedThings = flatten(f);
          console.log('here is the flattened things:', flattenedThings);
        }

        if (
          f.geometry.type === 'Polygon'
        ) {
          console.log('this is a polygon...');
          const ks = kinks(f.geometry);
          console.log('what is the ks?', ks);
          if (ks.features.length > 0) {
            console.error('Self-intersection detected.', ks);
            ix.push(ks);
          }
          return true;
        }

        return booleanValid(f);
      });

      console.log('intersections: ', ix);
      return res;
    }
    //TODO: handle non featurecollections
    console.log('intersections: ', ix);
    return true;
  }

  async convertToGeoJson(file: File) {
    const reader = new FileReader();
    const fileAsArrayBuffer: ArrayBuffer = await new Promise((resolve) => {
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      reader.readAsArrayBuffer(file);
    });
    try {
      const geojson = (await shp.parseZip(
        fileAsArrayBuffer
      )) as GeoJSON.GeoJSON;
      console.log('here is the geojson we uploaded:', geojson);
      const isValid = this.validateGeoJSONFeatures(geojson);
      console.log('is it valid?:', isValid);
      console.log('is gjv valid?', GJV.valid(geojson));

      if (
        geojson.type == 'FeatureCollection' &&
        GJV.valid(geojson) &&
        isValid
      ) {
        this.geometries = geojson;
        this.drawService.addGeoJSONFeature(this.geometries);
        this.uploadElementStatus = 'uploaded';
        this.uploadedShape.emit();
      } else if (Array.isArray(geojson)) {
        this.uploadElementStatus = 'failed';
        this.uploadFormError =
          'The upload contains multiple shapefiles and could not be processed.';
      } else {
        //unknown failure
        this.uploadElementStatus = 'failed';
        this.uploadFormError = 'The file cannot be converted to GeoJSON.';
      }
    } catch (e) {
      console.log('Got an error:', e);
      this.uploadElementStatus = 'failed';
      this.uploadFormError =
        'The zip file does not appear to contain a valid shapefile.';
    }
  }
}
