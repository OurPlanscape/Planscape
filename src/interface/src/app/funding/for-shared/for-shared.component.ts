import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { filter, map, shareReplay, switchMap } from 'rxjs';

import { BreadcrumbService } from '@services/breadcrumb.service';
import { FundingReportService } from '@services/funding-report.service';
import { FundingReportViewComponent } from '@app/funding/funding-report-view/funding-report-view.component';
import { MAP_WEST_CONUS_BOUNDS } from '@app/map/map.constants';
import { FundingReport, FundingReportPublic } from '@types';

@Component({
  selector: 'app-for-shared',
  templateUrl: './for-shared.component.html',
  styleUrls: ['./for-shared.component.scss'],
  standalone: true,
  imports: [CommonModule, FundingReportViewComponent],
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

  /** Public payload adapted to the `FundingReport` shape the view expects. */
  fundingReport$ = this.report$.pipe(
    map((report) => (report ? this.toFundingReport(report) : null))
  );

  /** Frozen configuration, to seed the static water / flame length fields. */
  config$ = this.report$.pipe(map((report) => report?.shared_configuration));

  /**
   * Map bounds for the public view, taken straight from the report payload
   * (the public view has no plan in state to derive them from). Falls back to a
   * default extent so the map still renders until the backend sends `bounds`.
   */
  mapBounds$ = this.report$.pipe(
    map((report) => report?.bounds ?? MAP_WEST_CONUS_BOUNDS)
  );

  constructor(
    private route: ActivatedRoute,
    private breadcrumbService: BreadcrumbService,
    private fundingReportService: FundingReportService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Funding Opportunity Report',
      backUrl: '/',
      icon: 'close',
      blackText: true,
    });
  }

  /**
   * Adapt the trimmed public payload to the `FundingReport` shape. The fields
   * the read-only report actually renders (status, results, data layers) come
   * straight from the payload; the identity fields it never reads in this mode
   * (id, scenario, author, timestamps) are filled with placeholders.
   */
  private toFundingReport(report: FundingReportPublic): FundingReport {
    return {
      status: report.status,
      results: report.results,
      treatment_datalayer: report.treatment_datalayer,
      aet_datalayer: report.aet_datalayer,
      geopackage_status: report.geopackage_status,
      geopackage_url: report.geopackage_url,
      id: 0,
      scenario: 0,
      created_by: 0,
      created_at: '',
      updated_at: '',
    };
  }
}
