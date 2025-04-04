import { Component, inject, Input } from '@angular/core';
import { DecimalPipe, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { DataLayer } from '@types';
import { HttpClient } from '@angular/common/http';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'app-data-layer-tooltip',
  standalone: true,
  imports: [NgIf, MatButtonModule, DecimalPipe, ButtonComponent],
  templateUrl: './data-layer-tooltip.component.html',
  styleUrl: './data-layer-tooltip.component.scss',
})
export class DataLayerTooltipComponent {
  @Input() layer!: DataLayer;
  private http: HttpClient = inject(HttpClient);

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
    const units = this.layer.info?.units?.filter((unit) => !!unit);

    if (!units || units.length === 0) {
      return '--';
    }
    return this.layer.info.units.join(', ');
  }

  downloadDataset() {
    console.log('URL: ', this.layer.public_url);
    this.http
      .get(this.layer.public_url, { responseType: 'blob' })
      .subscribe((blob) => {
        const filename = `${this.layer.name}.tif`;
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.click();

        window.URL.revokeObjectURL(blobUrl);
      });
  }
}
