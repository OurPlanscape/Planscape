import { Component, Input } from '@angular/core';
import { DecimalPipe, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { DataLayer } from '@types';

@Component({
  selector: 'app-data-layer-tooltip',
  standalone: true,
  imports: [NgIf, MatButtonModule, DecimalPipe],
  templateUrl: './data-layer-tooltip.component.html',
  styleUrl: './data-layer-tooltip.component.scss',
})
export class DataLayerTooltipComponent {
  @Input() layer!: DataLayer;

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

  getVintageDate(): string {
    return (
      this.layer.metadata?.['metadata']?.['metadata']?.['datestamp'] || '--'
    );
  }

  getUnits() {
    const units = this.layer.info?.units?.filter((unit) => !!unit);

    if (!units || units.length === 0) {
      return '--';
    }
    return this.layer.info.units.join(', ');
  }
}
