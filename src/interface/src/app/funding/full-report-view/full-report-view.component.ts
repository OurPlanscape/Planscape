import { Component } from '@angular/core';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
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
import { FilterDropdownComponent } from '@styleguide';
import { NgIf } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { FundingReportComponent } from '@app/funding/funding-report/funding-report.component';

@Component({
  selector: 'app-full-report-view',
  standalone: true,
  imports: [
    FilterDropdownComponent,
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    NavBarComponent,
    MatTabsModule,
    NgIf,
    ToggleTabsComponent,
    FundingReportComponent,
  ],
  templateUrl: './full-report-view.component.html',
  styleUrl: './full-report-view.component.scss',
})
export class FullReportViewComponent {
  tabButtons: ToggleButtonsConfig[] = [
    { name: 'Report', value: 'report', icon: 'analytics_outline' },
    { name: 'Data Layers', value: 'data_layers', icon: 'layers_outline' },
  ];

  // TODO: convert project area list to match this format
  outcomeViewOptions = [
    { name: 'Project Area 1', shortName: '1' },
    { name: 'Project Area 2', shortName: '2' },
    { name: 'Project Area 3', shortName: '3' },
  ];

  currentView: string = 'report';

  constructor(private breadcumbService: BreadcrumbService) {
    const newBreadCrumb: BreadCrumb = {
      label: 'Funding Opportunity Report',
      backUrl: '..',
      icon: 'close',
      blackText: true,
    };
    this.breadcumbService.updateBreadCrumb(newBreadCrumb);
  }

  handleToggleSelection(selection: string) {
    this.currentView = selection;
  }

  /* report tabs things */
  tabIndex = 1;
  onTabIndexChange(tabSelected: number) {}

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
