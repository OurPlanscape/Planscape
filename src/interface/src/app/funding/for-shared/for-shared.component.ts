import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { filter, map, shareReplay, startWith, switchMap } from 'rxjs';

import { BreadcrumbService } from '@services/breadcrumb.service';
import { FundingReportService } from '@services/funding-report.service';
import { FundingReportViewComponent } from '@app/funding/funding-report-view/funding-report-view.component';
import { FilterProjectFormat } from '@app/funding/funding-project-areas-selector/funding-project-areas-selector.component';
import { MAP_WEST_CONUS_BOUNDS } from '@app/map/map.constants';
import { getBoundsFromGeometry } from '@app/maplibre-map/maplibre.helper';
import { FundingReport, FundingReportPublic, ProjectArea } from '@types';
import { MessageCardComponent } from '@styleguide/message-card/message-card.component';

@Component({
  selector: 'app-for-shared',
  templateUrl: './for-shared.component.html',
  styleUrls: ['./for-shared.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    FundingReportViewComponent,
    MessageCardComponent,
  ],
})
export class ForSharedComponent implements OnInit {
  /** Shared-link UUID from the route (`funding-report/:id`). */
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

  /**
   * View state for the public page: `loading` while the link resolves, then
   * `found` or `not-found` (404). Lets the template hide the report shell during
   * load instead of flashing its internal spinner.
   */
  reportState$ = this.report$.pipe(
    map((report): 'found' | 'not-found' => (report ? 'found' : 'not-found')),
    startWith('loading' as const)
  );

  /** Frozen configuration, to seed the static water / flame length fields. */
  config$ = this.report$.pipe(map((report) => report?.shared_configuration));

  /**
   * Project areas of the shared report, from the public endpoint. Feeds the
   * legend's per-project acreage; also the source for the selector menu below.
   */
  projectAreas$ = this.id$.pipe(
    filter((id): id is string => !!id),
    switchMap((id) => this.fundingReportService.getPublicProjectAreas(id)),
    shareReplay(1)
  );

  /** Options for the "Viewing outcomes for" selector. */
  filterOptions$ = this.projectAreas$.pipe(
    map((projectAreas) => this.projectAreasToSelectionMenu(projectAreas))
  );

  /**
   * Map bounds for the public view, derived from the planning-area geometry on
   * the payload (the public view has no plan in state to frame the map from).
   * Falls back to a default extent when the geometry is missing.
   */
  mapBounds$ = this.report$.pipe(
    map((report) => {
      const geometry = report?.scenario?.planning_area?.geometry;
      return geometry ? getBoundsFromGeometry(geometry) : MAP_WEST_CONUS_BOUNDS;
    })
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
   * Build the "Viewing outcomes for" menu from the project areas, keyed by the
   * project-area `id` (which must line up with the report's per-project
   * `project_id` for the selection to filter). Mirrors the authed container's
   * menu; the authed-only top-10 subunit filter is omitted here since the public
   * payload carries no planning approach.
   */
  private projectAreasToSelectionMenu(
    projectAreas: ProjectArea[]
  ): FilterProjectFormat[] {
    return projectAreas
      .map((projectArea) => ({
        id: projectArea.id,
        shortName: projectArea.data.treatment_rank.toString(),
        name: `Project Area ${projectArea.data.treatment_rank}`,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );
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
