import { NgClass, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '@styleguide';
import { FeaturesModule } from '@features/features.module';
import { FileSaverService } from '@app/services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_ERROR_CONFIG, SUPPORT_URL } from '@app/shared';

@Component({
  selector: 'app-funding-report-footer',
  standalone: true,
  imports: [
    ButtonComponent,
    MatIconModule,
    MatMenuModule,
    NgIf,
    NgClass,
    FeaturesModule,
  ],
  templateUrl: './funding-report-footer.component.html',
  styleUrl: './funding-report-footer.component.scss',
})
export class FundingReportFooterComponent {
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fileSaverService: FileSaverService,
    private snackbar: MatSnackBar
  ) {}
  // allow for arbitrary disabling, such as when the map is still loading
  @Input() buttonDisabled = false;
  @Input() footerType: 'preview' | 'full' = 'preview';
  @Input() generatingPdf = false;

  @Output() downloadPdf = new EventEmitter<void>();

  @Input() geoPackageUrl: string | null = null;
  @Input() geoPackageStatus: string | null = null;

  downloadingGeopackage = false;

  displayDownloadErrorSnackbar() {
    const snackBarConfig = {
      ...SNACK_ERROR_CONFIG,
      verticalPosition: 'bottom' as const,
    };

    const downloadErrorSnackbar = this.snackbar.open(
      'Unable to download GeoPackage.',
      'Submit Feedback',
      snackBarConfig
    );

    downloadErrorSnackbar.onAction().subscribe(() => {
      window.open(SUPPORT_URL, '_blank');
    });
  }

  downloadGeopackage() {
    // if we presume it's failed before the click
    if (!this.geoPackageStatus || this.geoPackageStatus === 'FAILED') {
      this.displayDownloadErrorSnackbar();
    }

    this.downloadingGeopackage = true;

    //TODO: grab this from ... generated file or...compose it?
    const filename = 'geopackage.gpkg';

    if (this.geoPackageUrl) {
      this.fileSaverService.downloadGeopackage(this.geoPackageUrl).subscribe({
        next: (data) => {
          this.downloadingGeopackage = false;
          const blob = new Blob([data], {
            type: 'application/zip',
          });
          this.fileSaverService.saveAs(blob, filename);
        },
        error: (e) => {
          this.downloadingGeopackage = false;
          console.error('Error downloading: ', e);
          // if it's failed for some other reason, after the click
          this.displayDownloadErrorSnackbar();
        },
      });
    }
  }

  downloadPDF() {
    this.downloadPdf.emit();
  }

  shareReport() {
    // TODO
  }

  openFullView() {
    this.router.navigate(['report'], { relativeTo: this.route });
  }

  get isFullView() {
    return this.footerType === 'full';
  }
}
