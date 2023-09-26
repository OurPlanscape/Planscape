import { FormGroup, Validators } from '@angular/forms';
import { Component, Input, Output, EventEmitter } from '@angular/core';

import * as shp from 'shpjs';

@Component({
  selector: 'app-identify-project-areas',
  templateUrl: './identify-project-areas.component.html',
  styleUrls: ['./identify-project-areas.component.scss'],
})
export class IdentifyProjectAreasComponent {
  @Input() formGroup: FormGroup | undefined;
  @Output() formNextEvent = new EventEmitter<void>();
  @Output() formBackEvent = new EventEmitter<void>();

  filename: string = '';
  showErrorText: boolean = false;
  showSuccessText: boolean = false;
  showUploader: boolean = false;

  /** Updates validators for the form based on radio button selection.
   *  If the "generate areas" radio button is selected, uploading an area isn't required.
   *  If the "upload area" radio button is selected, uploading an area is required.
   */
  validateFormRequirements() {
    const generateAreas = this.formGroup?.get('generateAreas');
    const uploadedArea = this.formGroup?.get('uploadedArea');
    if (generateAreas?.value) {
      uploadedArea?.clearValidators();
      uploadedArea?.updateValueAndValidity();
    } else {
      uploadedArea?.setValidators(Validators.required);
      uploadedArea?.updateValueAndValidity();
    }
  }

  /** Upload a shapefile and add it to the form. */
  async loadFile(event: { type: string; value: File }) {
    const file = event.value;
    if (file) {
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
          this.formGroup?.get('uploadedArea')?.setValue(geojson);
          this.showUploader = false;
          this.showErrorText = false;
          this.showSuccessText = true;
          this.filename = file.name;
          this.formGroup?.get('generateAreas')?.setValue(false);
        } else {
          this.showErrorText = true;
        }
      } catch (e) {
        this.showErrorText = true;
      }
    }
  }
}
