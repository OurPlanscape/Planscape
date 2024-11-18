import { Component, Input } from '@angular/core';
import {
  PRESCRIPTIONS,
  PrescriptionSequenceAction,
  PrescriptionSingleAction,
} from '../prescriptions';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Map as MapLibreMap } from 'maplibre-gl';
import { jsPDF } from 'jspdf';
import { logoImg } from '../../../assets/base64/icons';
import { TreatmentSummary, Prescription, TreatmentProjectArea } from '@types';
import { TreatmentsState } from '../treatments.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';

@Component({
  selector: 'app-printable-treatment',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf],
  providers: [TreatmentsState, TreatedStandsState],
  templateUrl: './printable-treatment.component.html',
  styleUrl: './printable-treatment.component.scss',
})
export class PrintableTreatmentComponent {
  constructor(
    private treatmentsState: TreatmentsState,
    private treatedStandsState: TreatedStandsState
  ) {}

  @Input() summary?: TreatmentSummary | null;
  @Input() parentMap!: maplibregl.Map;

  async addProjectAreaPDFBox(currentSummary: TreatmentSummary) {
    if (!this.pdfDoc) {
      return;
    }
    this.pdfDoc.setFont('Helvetica');
    this.pdfDoc.setFontSize(10);
    const indentAmount = 4;
    let yLoc: number = 134;
    let xLoc: number = 30;
    currentSummary?.project_areas.map((p) => {
      if (!this.pdfDoc) {
        return;
      }

      // create a new page if we overflow
      if (xLoc > 120) {
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
        const standsTreated =
          rx.treated_stand_count + ' acres:' + Number(rx.area_acres.toFixed(2));
        this.pdfDoc?.text(actionName + '  (' + standsTreated + ')', xLoc, yLoc);
        if (rx.type === 'SEQUENCE') {
          const seqActions =
            PRESCRIPTIONS.SEQUENCE[rx.action as PrescriptionSequenceAction]
              .details;
          seqActions.forEach((sa) => {
            yLoc += 4;
            this.pdfDoc?.text(sa, xLoc + indentAmount, yLoc);
          });
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

  async addMap() {
    if (!this.pdfDoc) {
      return;
    }
    const originalMap = this.parentMap;
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
    const mapY = 24;

    // Draw a border around the map
    this.pdfDoc.setLineWidth(1);
    this.pdfDoc.rect(mapX, mapY, mapWidth, mapHeight);
    this.pdfDoc.addImage(imgData, 'PNG', mapX, mapY, mapWidth, mapHeight);
  }

  addLogo() {
    const logoWidth = 28;
    const logoHeight = 5.5;
    this.pdfDoc?.addImage(logoImg, 'SVG', 20, 14, logoWidth, logoHeight);
  }

  async createPDF() {
    this.pdfDoc = new jsPDF();

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

    this.pdfDoc?.setFont('Helvetica');
    this.pdfDoc?.setFontSize(10);

    const header = `${planningAreaName} / ${scenarioName} /  ${treatmentPlanName}`;
    this.pdfDoc.text(header, 30, 22);

    const standInfo = `Treated Stands: ${treatedStandsCount} / ${totalStands}`;
    this.pdfDoc.text(standInfo, 30, 130);

    this.addLogo();
    await this.addMap();
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

  //print element functions
  sequenceActions(action: string): string[] {
    let title = action as PrescriptionSequenceAction;
    if (title !== null) {
      return PRESCRIPTIONS.SEQUENCE[title].details;
    }
    return [];
  }

  prescriptionName(action: string, type: string): string | null {
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
}
