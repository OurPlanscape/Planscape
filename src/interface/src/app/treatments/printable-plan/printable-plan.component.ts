import {
  Component,
  Input,
  OnInit,
  ViewChild,
  ElementRef,
  // Injector,
} from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';

import { Map as MaplibreMap } from 'maplibre-gl';
import { TreatmentsState } from '../treatments.state';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { ApplyTreatmentComponent } from '../apply-treatment/apply-treatment.component';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  // RouterLink,
  RouterOutlet,
} from '@angular/router';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { MapConfigState } from '../treatment-map/map-config.state';
import { filter } from 'rxjs/operators';
import { catchError, map, switchMap } from 'rxjs';
// import { untilDestroyed } from '@ngneat/until-destroy';
import { getMergedRouteData } from '../treatments-routing-data';
import { TreatmentPlanAboutTabComponent } from '../treatment-plan-about-tab/treatment-plan-about-tab.component';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';
import { TreatmentSummary, Prescription } from '@types';
import {
  PrescriptionSequenceAction,
  PRESCRIPTIONS,
  PrescriptionSingleAction,
} from '../prescriptions';
import { ProjectAreaExpanderComponent } from '@styleguide';

@Component({
  selector: 'app-printable-plan',
  standalone: true,
  imports: [
    AsyncPipe,
    NgFor,
    NgIf,
    ProjectAreasTabComponent,
    TreatmentPlanAboutTabComponent,
    RouterOutlet,
    TreatmentMapComponent,
    ApplyTreatmentComponent,
    ProjectAreaExpanderComponent,
  ],
  providers: [
    TreatmentsState,
    SelectedStandsState,
    TreatedStandsState,
    MapConfigState,
  ],
  templateUrl: 'printable-plan.component.html',
  styleUrl: 'printable-plan.component.scss',
})
export class PrintablePlanComponent implements OnInit {
  projectAreaId$ = this.treatmentsState.projectAreaId$;
  summary$ = this.treatmentsState.summary$;
  treatmentPlanName$ = this.summary$.pipe(map((s) => s?.treatment_plan_name));
  showApplyTreatments$ = this.treatmentsState.showApplyTreatmentsDialog$;
  projectAreas$ = this.summary$?.pipe(
    map((summary: TreatmentSummary | null) => summary?.project_areas)
  );

  constructor(
    private treatmentsState: TreatmentsState,
    private mapConfig: MapConfigState,
    private route: ActivatedRoute,
    private router: Router
    // private injector: Injector // Angular's injector for passing shared services
  ) {
    this.router.events
      .pipe(
        // untilDestroyed(this),
        filter((event) => event instanceof NavigationEnd) // Only react to navigation events
      )
      .subscribe(() => {
        const data = getMergedRouteData(this.route.snapshot);
        this.treatmentsState
          .loadTreatmentByRouteData(data)
          .pipe(
            switchMap((_) => this.treatmentsState.treatmentPlan$),
            map((plan) => {
              // if plan is completed redirect to impacts
              if (plan?.status === 'SUCCESS') {
                this.router.navigate(['impacts'], { relativeTo: this.route });
              }
            }),
            catchError((error) => {
              this.router.navigate(['/']);
              throw error;
            })
          )
          .subscribe();
      });
  }

  @Input() sourceMap: any;
  @ViewChild('printMapContainer') printMapContainer: ElementRef | null = null;

  private printMap?: MaplibreMap;

  async ngOnInit() {
    if (this.sourceMap) {
      await this.initializePrintMap();
    }
  }

  rxName(rx: Prescription) {
    if (rx.type === 'SINGLE') {
      return PRESCRIPTIONS.SINGLE[rx.action as PrescriptionSingleAction];
    } else {
      return PRESCRIPTIONS.SEQUENCE[rx.action as PrescriptionSequenceAction]
        .name;
    }
  }

  headingTitleText(action: string, type: string): string | null {
    if (type === 'SINGLE') {
      let title = action as PrescriptionSingleAction;
      if (title !== null) {
        return PRESCRIPTIONS.SINGLE[title];
      }
    } else if (type === 'SEQUENCE') {
      let title = action as PrescriptionSequenceAction;
      if (title !== null) {
        return PRESCRIPTIONS.SEQUENCE[title].name;
      }
    }
    return '';
  }

  sequenceActions(action: string): string[] {
    let title = action as PrescriptionSequenceAction;
    if (title !== null) {
      return PRESCRIPTIONS.SEQUENCE[title].details;
    }
    return [];
  }

  private async initializePrintMap() {
    console.log('did this happen?');
    // Create new map in the visible container
    this.printMap = new MaplibreMap({
      container: this.printMapContainer?.nativeElement,
      style: this.sourceMap.getStyle(),
      center: this.sourceMap.getCenter(),
      zoom: this.sourceMap.getZoom(),
      bearing: this.sourceMap.getBearing(),
      pitch: this.sourceMap.getPitch(),
      interactive: false, // Disable interactions for print version
    });

    // Wait for map to load
    await new Promise<void>((resolve) =>
      this.printMap?.on('load', () => resolve())
    );
  }

  toggleShowTreatmentLayers() {
    this.mapConfig.toggleShowTreatmentStands();
  }

  ngOnDestroy() {
    if (this.printMap) {
      this.printMap.remove();
    }
  }
}
