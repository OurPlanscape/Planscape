import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'app-funding-report-footer',
  standalone: true,
  imports: [ButtonComponent, MatIconModule, MatMenuModule],
  templateUrl: './funding-report-footer.component.html',
  styleUrl: './funding-report-footer.component.scss',
})
export class FundingReportFooterComponent {
  downloadGeopackage() {
    // TODO
  }

  downloadPDF() {
    // TODO
  }

  shareReport() {
    // TODO
  }
}
