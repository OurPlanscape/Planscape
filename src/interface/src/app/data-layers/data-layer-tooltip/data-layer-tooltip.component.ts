import { Component, Input, OnInit } from '@angular/core';
import { DecimalPipe, NgIf, AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { DataLayer } from '@types';
import { getFileExtensionFromFile, getSafeFileName } from '../../shared/files';
import { DataLayersService } from '../../services/data-layers.service';
import { Observable, take, map } from 'rxjs';

@Component({
  selector: 'app-data-layer-tooltip',
  standalone: true,
  imports: [AsyncPipe, NgIf, MatButtonModule, DecimalPipe],
  templateUrl: './data-layer-tooltip.component.html',
  styleUrl: './data-layer-tooltip.component.scss',
})
export class DataLayerTooltipComponent implements OnInit {
  @Input() layer!: DataLayer;

  constructor(private dataLayersService: DataLayersService) { }

  downloadLink$: Observable<string> | null = null;
  filename$: Observable<string> | null = null;

  ngOnInit() {
    this.downloadLink$ = this.dataLayersService.getPublicUrl(this.layer.id).pipe(take(1));
    this.filename$ = this.downloadLink$.pipe(
      map(filename => this.transformFilename(filename))
    );
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


  transformFilename(downloadPath: string) {
    const urlPath = downloadPath.split('?')[0]; // remove query string
    const originalFilename = urlPath?.substring(urlPath.lastIndexOf('/') + 1); // get last segment
    const extension = getFileExtensionFromFile(originalFilename ?? '');
    // Sanitize the name: lowercase, replace spaces with underscores, remove non-word characters
    const safeName = getSafeFileName(this.layer.name);
    // save it so we dont re-run regex again
    return `${safeName}${extension}`;
  }
}
