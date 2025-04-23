import { Component, Input } from '@angular/core';
import { DecimalPipe, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { DataLayer } from '@types';
import { getFileExtensionFromFile, getSafeFileName } from '../../shared/files';

@Component({
  selector: 'app-data-layer-tooltip',
  standalone: true,
  imports: [NgIf, MatButtonModule, DecimalPipe],
  templateUrl: './data-layer-tooltip.component.html',
  styleUrl: './data-layer-tooltip.component.scss',
})
export class DataLayerTooltipComponent {
  @Input() layer!: DataLayer;
  private fileName = '';

  hasDownloadLink(): boolean {
    return !!this.layer.public_url;
  }

  hasMinMax(): boolean {
    return (
      this.layer.info?.stats?.[0]?.min != undefined &&
      this.layer.info?.stats?.[0]?.max != undefined
    );
  }

  getSource() {
    return this.layer.metadata?.['metadata']?.['distribution']?.['download'];
  }

  getUnits() {
    const units = this.layer.metadata?.['metadata']?.[
      'identification'
    ]?.keywords?.units?.keywords?.filter((unit: any) => !!unit);

    if (!units || units.length === 0) {
      return '--';
    }
    return units.join(', ');
  }

  getFileName() {
    if (this.fileName) {
      return this.fileName;
    }
    const urlPath = this.layer.public_url.split('?')[0]; // remove query string
    const originalFilename = urlPath.substring(urlPath.lastIndexOf('/') + 1); // get last segment

    const extension = getFileExtensionFromFile(originalFilename);

    // Sanitize the name: lowercase, replace spaces with underscores, remove non-word characters
    const safeName = getSafeFileName(this.layer.name);
    // save it so we dont re-run regex again
    this.fileName = `${safeName}${extension}`;
    return this.fileName;
  }
}
