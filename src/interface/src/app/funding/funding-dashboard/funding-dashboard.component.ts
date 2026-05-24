import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { NavBarComponent } from '@standalone/nav-bar/nav-bar.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { BehaviorSubject, map } from 'rxjs';
import { FundingEmptyStateComponent } from '../funding-empty-state/funding-empty-state.component';
import { LegacyMaterialModule } from '@material/legacy-material.module';
import { FundingReportComponent } from '@app/funding/funding-report/funding-report.component';
import { ToolInfoCardComponent } from '@styleguide';

// placeholder type
interface Report {
  status: 'success' | 'generating' | 'error';
}

@Component({
  selector: 'app-funding-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardLayoutComponent,
    NavBarComponent,
    FundingEmptyStateComponent,
    LegacyMaterialModule,
    FundingReportComponent,
    ToolInfoCardComponent,
  ],
  templateUrl: './funding-dashboard.component.html',
  styleUrl: './funding-dashboard.component.scss',
})
export class FundingDashboardComponent implements OnInit {
  constructor(private breadcrumbService: BreadcrumbService) {}

  // report stubbed out for now
  report$ = new BehaviorSubject<Report | null>(null);

  isGenerating$ = this.report$.pipe(map((r) => r?.status === 'generating'));
  hasOutput$ = this.report$.pipe(map((r) => r?.status === 'success'));

  readonly partners = [
    {
      name: 'Blue Forest',
      logo: '/assets/png/blue-forest.png',
      url: 'https://www.blueforest.org/',
    },
    {
      name: 'The Freshwater Trust',
      logo: '/assets/png/freshwater-trust.png',
      url: 'https://thefreshwatertrust.org/',
    },
  ];

  ngOnInit() {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Scenario Dashboard ',
      backUrl: '../dashboard',
    });
  }

  generateReport() {
    this.report$.next({ status: 'generating' });
    // simulate generating report
    setTimeout(() => {
      this.report$.next({ status: 'success' });
    }, 1000);
  }
}
