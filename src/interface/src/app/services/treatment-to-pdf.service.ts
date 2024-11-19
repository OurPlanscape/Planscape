import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PRESCRIPTIONS,
  PrescriptionSequenceAction,
  nameForTypeAndAction,
} from '../treatments/prescriptions';
import { Map as MapLibreMap } from 'maplibre-gl';
import { logoImg } from '../../assets/base64/icons';
import { TreatmentSummary, Prescription, TreatmentProjectArea } from '@types';
import { TreatmentsState } from '../treatments/treatments.state';
import { TreatedStandsState } from '../treatments/treatment-map/treated-stands.state';
@Injectable({
  providedIn: 'root',
})
export class TreatmentToPDFService {
  constructor(
    private treatmentsState: TreatmentsState,
    private treatedStandsState: TreatedStandsState
  ) {}

  parentMap!: MapLibreMap;
  pdfDoc: jsPDF | null = null;

  topMargin = 10;
  leftMargin = 30;
  rightMargin = 190;
  bottomMargin = 280;

  async createPDF(map: MapLibreMap) {
    this.parentMap = map;
    this.pdfDoc = new jsPDF();

    const mapContainer = document.createElement('div');
    this.configMapContainer(mapContainer);
    document.body.appendChild(mapContainer);

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

    this.addLogo(this.leftMargin, 14);

    const headerText = `${planningAreaName} / ${scenarioName} /  ${treatmentPlanName} - Treated Stands: ${treatedStandsCount} / ${totalStands}`;
    this.addHeader(headerText, this.leftMargin, 24);

    const mapX = this.leftMargin + 10;
    const mapY = 28;
    const mapWidth = this.rightMargin - (this.leftMargin + 20);
    const mapHeight = 100;
    await this.addMap(mapX, mapY, mapHeight, mapWidth);

    const projectAreasX = this.leftMargin;
    const projectAreasY = 132;
    this.addProjectAreaTable(
      this.tableRowsFromSummary(curSummary),
      projectAreasX,
      projectAreasY
    );

    document.body.removeChild(mapContainer);
    const pdfName = `planscape-${encodeURI(treatmentPlanName.split(' ').join('_'))}.pdf`;
    this.pdfDoc.save(pdfName);
  }

  tableRowsFromSummary(currentSummary: TreatmentSummary): string[][] {
    const tableRows: string[][] = [];
    currentSummary.project_areas.forEach((p) => {
      let rxInfo = '';
      p.prescriptions.forEach((rx) => {
        const actionName = nameForTypeAndAction(rx.type, rx.action);
        rxInfo += actionName + '\n';

        if (rx.type === 'SEQUENCE') {
          const seqActions =
            PRESCRIPTIONS.SEQUENCE[rx.action as PrescriptionSequenceAction]
              .details;
          seqActions.forEach((aeqAction) => {
            rxInfo += '\t' + aeqAction + '\n';
          });
        }
      });
      const treatedStands = `Treated stands: ${this.treatedStandCount(p)}/${p.total_stand_count}`;
      tableRows.push([p.project_area_name, treatedStands, rxInfo]);
    });
    return tableRows;
  }

  addProjectAreaTable(bodyData: string[][], startX: number, startY: number) {
    autoTable(this.pdfDoc, {
      styles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { fontSize: 9, cellWidth: 30 },
        1: { fontSize: 9, cellWidth: 40 },
        2: { fontSize: 9 },
      },
      startY: startY,
      theme: 'grid',
      margin: {
        left: startX,
        right: 20,
        top: 10,
        bottom: 20,
      },
      // tableLineWidth: 0.4,
      tableLineColor: '#000000',
      horizontalPageBreak: true,
      body: bodyData,
    });
  }

  copyOldMapStyles(originalMap: MapLibreMap) {
    return new MapLibreMap({
      container: 'printable-map',
      style: this.parentMap.getStyle(),
      center: this.parentMap.getBounds().getCenter(),
      zoom: this.parentMap.getZoom(),
      bearing: this.parentMap.getBearing(),
      pitch: this.parentMap.getPitch(),
      bounds: this.parentMap.getBounds(),
    });
  }

  async addMap(
    mapX: number,
    mapY: number,
    mapHeight: number,
    mapWidth: number
  ) {
    if (!this.pdfDoc) {
      return;
    }

    const printMap = this.copyOldMapStyles(this.parentMap);
    await new Promise((resolve) => printMap.on('load', resolve));

    const canvas = printMap.getCanvas();
    const imgData = canvas.toDataURL('image/png');

    // Draw a border around the map
    this.pdfDoc.setLineWidth(1);
    this.pdfDoc.rect(mapX, mapY, mapWidth, mapHeight);
    this.pdfDoc.addImage(imgData, 'PNG', mapX, mapY, mapWidth, mapHeight);
  }

  addLogo(x: number, y: number) {
    const logoWidth = 28;
    const logoHeight = 5.5;
    this.pdfDoc?.addImage(logoImg, 'SVG', x, y, logoWidth, logoHeight);
  }

  addHeader(headerText: string, x: number, y: number) {
    this.pdfDoc?.setFont('Helvetica');
    this.pdfDoc?.setFontSize(10);
    this.pdfDoc?.text(headerText, x, y);
  }

  configMapContainer(mapContainer: HTMLDivElement) {
    mapContainer.id = 'printable-map';
    mapContainer.style.position = 'absolute';
    mapContainer.style.width = '1000px';
    mapContainer.style.height = '700px';
    mapContainer.style.left = '-9000px';
    mapContainer.style.top = '-100px';
    document.body.appendChild(mapContainer);
  }

  treatedStandCount(projectArea: TreatmentProjectArea): number {
    return projectArea.prescriptions.reduce(
      (acc: number, p: Prescription) => acc + p.treated_stand_count,
      0
    );
  }
}
