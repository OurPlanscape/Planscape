import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  ViewChild,
} from '@angular/core';

import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { Map as MapLibreMap } from 'maplibre-gl';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentsState } from '../treatments.state';

import { filter } from 'rxjs/operators';
import { MapConfigState } from '../treatment-map/map-config.state';
import { catchError, combineLatest, map, switchMap } from 'rxjs';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { FeaturesModule } from '../../features/features.module';
import { SharedModule } from '@shared';
import { ButtonComponent } from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule } from '@angular/material/legacy-button';
import { MatMenuModule } from '@angular/material/menu';
import { TreatmentNavbarMenuComponent } from '../treatment-navbar-menu/treatment-navbar-menu.component';
import { ApplyTreatmentComponent } from '../apply-treatment/apply-treatment.component';
import { TreatmentLegendComponent } from '../treatment-legend/treatment-legend.component';
import { MatLegacySlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { ReviewTreatmentPlanDialogComponent } from '../review-treatment-plan-dialog/review-treatment-plan-dialog.component';
import { getMergedRouteData } from '../treatments-routing-data';
import { PrintableTxFooterComponent } from '../printable-tx-footer/printable-tx-footer.component';
import { jsPDF } from 'jspdf';
import { logoImg } from '../../../assets/base64/icons';
import { TreatmentSummary, Prescription, TreatmentProjectArea } from '@types';
import {
  PRESCRIPTIONS,
  PrescriptionSequenceAction,
  PrescriptionSingleAction,
} from '../prescriptions';

// import { autoTable } from 'jspdf-autotable';

@UntilDestroy()
@Component({
  selector: 'app-treatment-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    TreatmentMapComponent,
    AsyncPipe,
    NgIf,
    NgFor,
    FeaturesModule,
    SharedModule,
    ButtonComponent,
    MatLegacySlideToggleModule,
    MatIconModule,
    MatLegacyButtonModule,
    MatMenuModule,
    TreatmentNavbarMenuComponent,
    ApplyTreatmentComponent,
    TreatmentLegendComponent,
    RouterLink,
    PrintableTxFooterComponent,
  ],
  providers: [
    TreatmentsState,
    SelectedStandsState,
    TreatedStandsState,
    MapConfigState,
  ],
  templateUrl: './treatment-config.component.html',
  styleUrl: './treatment-config.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentConfigComponent {
  projectAreaId$ = this.treatmentsState.projectAreaId$;
  activeProjectArea$ = this.treatmentsState.activeProjectArea$;
  summary$ = this.treatmentsState.summary$;
  treatmentPlanName$ = this.summary$.pipe(map((s) => s?.treatment_plan_name));
  showApplyTreatments$ = this.treatmentsState.showApplyTreatmentsDialog$;
  showTreatmentLayer$ = this.mapConfig.showTreatmentStandsLayer$;
  showTreatmentLegend$ = combineLatest([
    this.treatmentsState.projectAreaId$.pipe(map((activeArea) => !!activeArea)),
    this.showTreatmentLayer$,
  ]).pipe(
    map(([activeArea, showTreatmentLayer]) => !activeArea && showTreatmentLayer)
  );
  @ViewChild(TreatmentMapComponent) mapElement: any;
  breadcrumbs$ = this.treatmentsState.breadcrumbs$;

  constructor(
    private treatmentsState: TreatmentsState,
    private mapConfig: MapConfigState,
    private treatedStandsState: TreatedStandsState,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private injector: Injector // Angular's injector for passing shared services
  ) {
    this.router.events
      .pipe(
        untilDestroyed(this),
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

  redirectToScenario() {
    const summary = this.treatmentsState.getCurrentSummary();
    let url = `/plan/${summary.planning_area_id}/config/${summary.scenario_id}`;
    this.router.navigate([url]);
  }

  redirectToNewPlan(planId: number) {
    const summary = this.treatmentsState.getCurrentSummary();
    let url = `/plan/${summary.planning_area_id}/config/${summary.scenario_id}/treatment/${planId}`;
    this.router.navigate([url]);
  }

  toggleShowTreatmentLayers() {
    this.mapConfig.toggleShowTreatmentStands();
  }

  showReviewDialog() {
    this.dialog.open(ReviewTreatmentPlanDialogComponent, {
      injector: this.injector, // Pass the current injector to the dialog
    });
  }

  async addProjectAreaPDFBox(currentSummary: TreatmentSummary) {
    if (!this.pdfDoc) {
      return;
    }
    this.pdfDoc.setFont('Helvetica');
    this.pdfDoc.setFontSize(10);
    const indentAmount = 8;
    let yLoc: number = 130;
    let xLoc: number = 20;
    currentSummary?.project_areas.map((p) => {
      if (!this.pdfDoc) {
        return;
      }

      // create a new page if we overflow
      if (xLoc > 100) {
        this.pdfDoc.addPage();
        xLoc = 20;
        yLoc = 20;
      }

      const projectName =
        p.project_area_name +
        ' stand count: ' +
        +this.treatedStandCount(p) +
        '/' +
        p.total_stand_count;
      this.pdfDoc?.setFont('Helvetica');
      this.pdfDoc?.setFontSize(10);
      this.pdfDoc?.getTextWidth(projectName);
      this.pdfDoc?.text(projectName, xLoc, yLoc);

      p.prescriptions.forEach((rx) => {
        this.pdfDoc?.setFontSize(8);
        yLoc += 4;
        const actionName = this.actionToName(rx.type, rx.action);
        console.log('what do we know about this prescription?', rx);
        const standsTreated =
          rx.treated_stand_count + ' acres:' + rx.area_acres;
        this.pdfDoc?.text(actionName + '  (' + standsTreated + ')', xLoc, yLoc);
        if (rx.type === 'SEQUENCE') {
          yLoc += 4;
          this.pdfDoc?.text('sequence action', xLoc + indentAmount, yLoc);
        }
      });

      yLoc += 14;
      if (yLoc > 260) {
        yLoc = 130;
        xLoc += 80;
      }
    });
  }

  pdfDoc: jsPDF | null = null;

  async createPDF() {
    // Create a new jsPDF instance
    this.pdfDoc = new jsPDF();
    //TODO: display project areas, planning area, scenario, about data,

    const curSummary = this.treatmentsState.getCurrentSummary();
    const scenarioName = curSummary.scenario_name;
    const treatmentPlanName = curSummary.treatment_plan_name;
    const planningAreaName = curSummary.planning_area_name;
    const treatedStandsCount =
      this.treatedStandsState.getTreatedStands().length;
    const totalStands = curSummary.project_areas.reduce((acc: number, p) => {
      acc += p.total_stand_count;
      return acc;
    }, 0);

    const logoWidth = 28;
    const logoHeight = 5.5;
    this.pdfDoc.addImage(logoImg, 'SVG', 20, 5, logoWidth, logoHeight); // Position at (10, 10)

    this.pdfDoc?.setFont('Helvetica');
    this.pdfDoc?.setFontSize(10);

    const header = `${planningAreaName} / ${scenarioName} /  ${treatmentPlanName}`;
    this.pdfDoc.text(header, 20, 16);

    const standInfo = `Treated Stands: ${treatedStandsCount} / ${totalStands}`;
    this.pdfDoc.text(standInfo, 20, 124);

    // Get the existing MapLibre map instance
    const originalMap = this.mapElement.mapLibreMap;
    // Get the map's bounding box
    const mapBounds = originalMap.getBounds();

    const printMap = new MapLibreMap({
      container: 'printable-map',
      style: originalMap.getStyle(),
      center: mapBounds.getCenter(),
      zoom: originalMap.getZoom(),
      bearing: originalMap.getBearing(),
      pitch: originalMap.getPitch(),
    });
    printMap.fitBounds(mapBounds);
    await new Promise((resolve) => printMap.on('load', resolve));

    const canvas = printMap.getCanvas();
    const imgData = canvas.toDataURL('image/png');
    const mapWidth = 150;
    const mapHeight = 100;
    const mapX = 30;
    const mapY = 18;

    // Draw a border around the map
    this.pdfDoc.setLineWidth(1);
    this.pdfDoc.rect(mapX, mapY, mapWidth, mapHeight);
    this.pdfDoc.addImage(imgData, 'PNG', mapX, mapY, mapWidth, mapHeight);

    this.addProjectAreaPDFBox(curSummary);

    const pdfName = `planscape-${encodeURI(treatmentPlanName.split(' ').join('_'))}.pdf`;
    this.pdfDoc.save(pdfName);
  }

  actionToName(rxType: string, rxAction: string) {
    if (rxType === 'SINGLE') {
      return PRESCRIPTIONS.SINGLE[rxAction as PrescriptionSingleAction];
    } else if (rxType === 'SEQUENCE')
      return PRESCRIPTIONS.SEQUENCE[rxAction as PrescriptionSequenceAction]
        .name;
    else return '';
  }

  treatedStandCount(projectArea: TreatmentProjectArea): number {
    return projectArea.prescriptions.reduce(
      (acc: number, p: Prescription) => acc + p.treated_stand_count,
      0
    );
  }

  // async printTreatment() {
  //   // Create a new div for the printable map
  //   const printContainer = document.createElement('div');
  //   printContainer.style.position = 'absolute';
  //   printContainer.style.left = '-9999px';
  //   printContainer.style.width = '100%';
  //   printContainer.style.height = '100%';
  //   document.body.appendChild(printContainer);

  //   // Copy orientation and content of existing map
  //   const originalMap = this.mapElement.mapLibreMap;
  //   const printMap = new MapLibreMap({
  //     container: printContainer,
  //     style: originalMap.getStyle(),
  //     center: originalMap.getCenter(),
  //     zoom: originalMap.getZoom(),
  //     bearing: originalMap.getBearing(),
  //     pitch: originalMap.getPitch(),
  //   });

  //   // Let map load, then grab canvas as png
  //   await new Promise((resolve) => printMap.on('load', resolve));
  //   const canvas = printMap.getCanvas();
  //   const img = new Image();
  //   img.src = canvas.toDataURL('image/png');

  //   // create actual printable element
  //   const printElement = document.createElement('div');
  //   printElement.className = 'print-only-map';
  //   printElement.style.display = 'none';
  //   printElement.appendChild(img);
  //   document.body.appendChild(printElement);

  //   //add styles that must be dynamic
  //   const style = document.createElement('style');
  //   style.textContent = `
  //     @media print {
  //           .print-only-map {
  //             display: block !important;
  //             page-break-inside: avoid;
  //             position: absolute;
  //             top: 1in;
  //             left: 0in;
  //             width: 3in;
  //             height: 5in;
  //           }
  //           .print-only-map img {
  //             width:auto;
  //             height:5in;
  //           }}`;
  //   document.head.appendChild(style);

  //   window.print();

  //   // cleanup/remove elements
  //   document.body.removeChild(printElement);
  //   document.head.removeChild(style);
  //   printMap.remove();
  //   document.body.removeChild(printContainer);
  // }
}
