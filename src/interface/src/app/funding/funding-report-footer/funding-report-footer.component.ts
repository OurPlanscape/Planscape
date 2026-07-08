import { NgClass, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
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

  @Input() footerType: 'preview' | 'full' = 'preview';

  downloadGeopackage() {
    // TODO
  }

  downloadPDF() {
    // TODO
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
