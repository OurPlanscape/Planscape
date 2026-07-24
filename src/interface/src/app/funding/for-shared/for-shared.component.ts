import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { filter, map, shareReplay, switchMap } from 'rxjs';

import { NavBarComponent } from '@standalone/nav-bar/nav-bar.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { FundingReportService } from '@services/funding-report.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { FundingMapConfigState } from '@app/funding/funding-map-config-state';
import { MapConfigState } from '@maplibre-map/map-config.state';
import { MapConfigService } from '@maplibre-map/map-config.service';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';

@Component({
  selector: 'app-for-shared',
  templateUrl: './for-shared.component.html',
  styleUrls: ['./for-shared.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NavBarComponent,
    MatProgressSpinnerModule,
    MatTabsModule,
  ],
  providers: [
    FundingMapConfigState,
    { provide: MapConfigState, useExisting: FundingMapConfigState },
    MapConfigService,
    DataLayersStateService,
  ],
})
export class ForSharedComponent implements OnInit {
  /** Shared-link UUID from the route (`for/:id`). */
  id$ = this.route.paramMap.pipe(map((params) => params.get('id')));

  /** The shared report resolved from the link UUID (`null` if not found). */
  report$ = this.id$.pipe(
    filter((id): id is string => !!id),
    switchMap((id) => this.fundingReportService.getPublicReport(id)),
    shareReplay(1)
  );

  reportConfig$ = this.report$.pipe(map((r) => r?.shared_configuration));

  constructor(
    private route: ActivatedRoute,
    private breadcrumbService: BreadcrumbService,
    private fundingReportService: FundingReportService,
    private fundingMapConfigState: FundingMapConfigState
  ) {}

  opacity$ = this.fundingMapConfigState.opacity$;

  ngOnInit(): void {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Funding Opportunity Report',
      backUrl: '/',
      icon: 'close',
      blackText: true,
    });
  }

  handleOpacityChange(opacity: number): void {
    this.fundingMapConfigState.setOpacity(opacity);
  }
}
