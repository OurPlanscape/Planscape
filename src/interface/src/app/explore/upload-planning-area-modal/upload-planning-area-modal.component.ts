import { Component } from '@angular/core';
import { ModalComponent } from 'src/styleguide/modal/modal.component';
import { MatButtonModule } from '@angular/material/button';
import { FileUploadFieldComponent } from '../../../styleguide/file-upload-field/file-upload-field.component';
import * as shp from 'shpjs';

@Component({
  selector: 'app-upload-planning-area-modal',
  standalone: true,
  imports: [FileUploadFieldComponent, ModalComponent, MatButtonModule],
  templateUrl: './upload-planning-area-modal.component.html',
  styleUrl: './upload-planning-area-modal.component.scss',
})
export class UploadPlanningAreaModalComponent {
  uploadElementStatus: 'default' | 'failed' | 'running' | 'uploaded' =
    'default';
  file: File | null = null;
  geometries: GeoJSON.GeoJSON | null = null;
  uploadFormError?: string | null = null;

  handleFileEvent(file: File | undefined): void {
    this.uploadElementStatus = 'running';

    if (file !== undefined) {
      this.uploadElementStatus = 'uploaded';
      this.file = file;
      this.convertToGeoJson(this.file);
    } else {
      // User clicked to remove file
      this.uploadElementStatus = 'default';
      this.file = null;
    }
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
      if (geojson.type == 'FeatureCollection') {
        this.geometries = geojson;
        console.log('we have geometries?', this.geometries);
      } else if (Array.isArray(geojson)) {
        this.uploadElementStatus = 'failed';
        this.uploadFormError =
          'The upload contains multiple shapefiles and could not be processed.';
        console.log('we have error??', this.uploadFormError);
      } else {
        //unknown failure
        this.uploadElementStatus = 'failed';
        this.uploadFormError = 'The file cannot be converted to GeoJSON.';
        console.log('we have error??', this.uploadFormError);
      }
    } catch (e) {
      this.uploadElementStatus = 'failed';
      this.uploadFormError =
        'The zip file does not appear to contain a valid shapefile.';
      console.log('we have error??', this.uploadFormError);
    }
  }
}
