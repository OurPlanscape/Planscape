import { Component, Input, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { DataLayer } from '@types';
import { getFileExtensionFromFile, getSafeFileName } from '@shared/files';
import { DataLayersService } from '@services/data-layers.service';
import { Observable, shareReplay, take } from 'rxjs';
import { ButtonComponent } from '@styleguide';
import { AccountRoutingModule } from '@app/account/account-routing.module';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-data-layer-tooltip',
  standalone: true,
  imports: [
    AsyncPipe,
    ButtonComponent,
    DecimalPipe,
    MatButtonModule,
    NgIf,
    AccountRoutingModule,
    DatePipe,
  ],
  templateUrl: './data-layer-tooltip.component.html',
  styleUrl: './data-layer-tooltip.component.scss',
})
export class DataLayerTooltipComponent implements OnInit {
  @Input() layer!: DataLayer;

  downloadLink$: Observable<string> | null = null;
  loadingLink = false;
  filename: string | null = null;

  constructor(private dataLayersService: DataLayersService) {}

  ngOnInit() {
    this.loadingLink = true;
    this.downloadLink$ = this.dataLayersService
      .getPublicUrl(this.layer.id)
      .pipe(take(1), shareReplay(1));

    this.downloadLink$.pipe(untilDestroyed(this)).subscribe((link) => {
      this.loadingLink = false;
      this.filename = this.transformFilename(link);
    });
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

  get vintageDate() {
    return this.layer.metadata?.['metadata']?.['identification']?.['date']?.[
      'date'
    ];
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
    return `${safeName}${extension}`;
  }
}
