import { Component } from '@angular/core';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { FundingReportMapComponent } from '../funding-report-map/funding-report-map.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import {
  BreadCrumb,
  BreadcrumbService,
} from '@app/services/breadcrumb.service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import {
  ToggleButtonsConfig,
  ToggleTabsComponent,
} from '@styleguide/toggle-tabs/toggle-tabs.component';

@Component({
  selector: 'app-full-report-view',
  standalone: true,
  imports: [
    FundingReportMapComponent,
    MatButtonToggleModule,
    MatIconModule,
    MatSelectModule,
    NavBarComponent,
    MatTabsModule,
    ToggleTabsComponent,
  ],
  templateUrl: './full-report-view.component.html',
  styleUrl: './full-report-view.component.scss',
})
export class FullReportViewComponent {
  tabButtons: ToggleButtonsConfig[] = [
    { name: 'Report', value: 'report', icon: 'analytics_outline' },
    { name: 'Data Layers', value: 'data_layers', icon: 'layers_outline' },
  ];

  constructor(private breadcumbService: BreadcrumbService) {
    const newBreadCrumb: BreadCrumb = {
      label: 'Funding Opportunity Report',
      backUrl: '..',
      icon: 'close',
      blackText: true,
    };
    this.breadcumbService.updateBreadCrumb(newBreadCrumb);
  }
  tabIndex = 1;
  /* report tabs things */
  onTabIndexChange(tabSelected: number) {}
}
