import { NgClass, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '@styleguide';
import { FeaturesModule } from '@features/features.module';

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
    private route: ActivatedRoute
  ) {}
  // allow for arbitrary disabling, such as when the map is still loading
  @Input() buttonDisabled = false;
  @Input() footerType: 'preview' | 'full' = 'preview';
  @Input() generatingPdf = false;
  @Input() downloadingGeopackage = false;

  @Output() downloadPdf = new EventEmitter<void>();
  @Output() downloadGeopackage = new EventEmitter<void>();

  get buttonLabel() {
    if (this.generatingPdf) {
      return 'Generating PDF...';
    } else if (this.downloadingGeopackage) {
      return 'Downloading GeoPackage...';
    } else if (this.isFullView) {
      return 'Download Options';
    }
    return 'Download';
  }

  handleGeopackageDownload() {
    this.downloadGeopackage.emit();
  }

  handleDownloadPdf() {
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
