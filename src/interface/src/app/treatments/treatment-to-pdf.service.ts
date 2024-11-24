import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PRESCRIPTIONS,
  PrescriptionSequenceAction,
  nameForTypeAndAction,
  nameForAction,
} from './prescriptions';
import { Map as MapLibreMap } from 'maplibre-gl';
import { logoImg } from '../../assets/base64/icons';
import { TreatmentSummary, Prescription, TreatmentProjectArea } from '@types';
import { MapConfigState } from './treatment-map/map-config.state';

import { TreatmentsState } from './treatments.state';
import { TreatedStandsState } from './treatment-map/treated-stands.state';

@Injectable()
export class TreatmentToPDFService {
  constructor(
    private treatmentsState: TreatmentsState,
    private treatedStandsState: TreatedStandsState,
    private mapConfigState: MapConfigState
  ) {}

  activeMap: MapLibreMap | null = null;
  pdfDoc: jsPDF | null = null;

  topMargin = 10;
  leftMargin = 30;
  rightMargin = 190;
  bottomMargin = 280;

  async createPDF(map: MapLibreMap, attributions: string) {
    this.activeMap = map;
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
    const treatmentsUsedSet = new Set(
      this.treatedStandsState
        .getTreatedStands()
        .map((s) => nameForAction(s.action))
    );
    this.addLogo(this.leftMargin, 14);

    const headerText = `${planningAreaName} / ${scenarioName} /  ${treatmentPlanName} - Treated Stands: ${treatedStandsCount} / ${totalStands}`;
    this.addHeader(headerText, this.leftMargin, 24);

    const mapX = this.leftMargin + 10;
    const mapY = 28;
    const mapWidth = this.rightMargin - (this.leftMargin + 20);
    const mapHeight = 100;
    await this.addMap(mapX, mapY, mapHeight, mapWidth);

    this.addAttributions(attributions, mapX + mapWidth, mapHeight + mapY - 2);

    if (this.mapConfigState.isTreatmentStandsVisible()) {
      this.drawHexagon(this.pdfDoc, 100, 100, 2, '#aaaaff');
      this.drawTreatmentLegend(
        this.leftMargin,
        132,
        Array.from(treatmentsUsedSet, (str) => [str]),
        this.drawHexagon
      );
    } else {
      const projectAreasX = this.leftMargin;
      const projectAreasY = 132;
      this.addProjectAreaTable(
        this.tableRowsFromSummary(curSummary),
        projectAreasX,
        projectAreasY
      );
    }

    document.body.removeChild(mapContainer);
    const pdfName = `planscape-${encodeURI(treatmentPlanName.split(' ').join('_'))}.pdf`;
    this.pdfDoc.save(pdfName);
  }

  drawHexagon(
    doc: any,
    centerX: number,
    centerY: number,
    size: number,
    fill: string
  ) {
    const points = this.calculateHexagonPoints(centerX, centerY, size);
    doc.setLineWidth(0.1);
    doc.setFillColor(fill);
    doc.setDrawColor(0); // Black stroke
    doc.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      doc.lineTo(points[i].x, points[i].y);
    }
    doc.lineTo(points[0].x, points[0].y);
    doc.fillStroke();
  }

  calculateHexagonPoints(centerX: number, centerY: number, size: number) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerX + size * Math.cos(angle);
      const y = centerY + size * Math.sin(angle);
      points.push({ x, y });
    }
    return points;
  }

  drawTreatmentLegend(
    startX: number,
    startY: number,
    treatmentsUsed: string[][],
    hexFunction: Function
  ) {
    autoTable(this.pdfDoc, {
      styles: {
        fillColor: [255, 255, 255],
        cellPadding: 1,
        lineColor: '#000000',
        lineWidth: 0.4,
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { fontSize: 6, cellWidth: 29, lineWidth: 0 },
      },
      startY: startY,
      tableLineWidth: 0.3,
      tableLineColor: [0, 0, 0],
      margin: {
        left: startX,
        right: 20,
        top: 10,
        bottom: 20,
      },
      tableWidth: 30,
      horizontalPageBreak: true,
      body: treatmentsUsed,
      didParseCell: function (data) {
        // Only handle image column (index 1)
        if (data.column.index === 1 && data.row.section === 'body') {
        }
      },
    });
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
      tableLineColor: '#000000',
      horizontalPageBreak: true,
      body: bodyData,
    });
  }

  copyActiveMap() {
    if (!this.activeMap) {
      return;
    }
    return new MapLibreMap({
      container: 'printable-map',
      style: this.activeMap.getStyle(),
      center: this.activeMap.getBounds().getCenter(),
      zoom: this.activeMap.getZoom(),
      bearing: this.activeMap.getBearing(),
      pitch: this.activeMap.getPitch(),
      bounds: this.activeMap.getBounds(),
    });
  }

  async addMap(
    mapX: number,
    mapY: number,
    mapHeight: number,
    mapWidth: number
  ) {
    if (!this.pdfDoc || !this.activeMap) {
      return;
    }

    const printMap = this.copyActiveMap();
    await new Promise((resolve) => printMap?.on('load', resolve));
    const canvas = printMap?.getCanvas();
    const imgData = canvas?.toDataURL('image/png');
    if (imgData) {
      this.pdfDoc.setLineWidth(1);
      this.pdfDoc.rect(mapX, mapY, mapWidth, mapHeight);
      this.pdfDoc.addImage(imgData, 'PNG', mapX, mapY, mapWidth, mapHeight);
    }
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

  addAttributions(attributionText: string, mapRight: number, y: number) {
    this.pdfDoc?.setFont('Helvetica');
    this.pdfDoc?.setFontSize(5);
    const textWidth = this.pdfDoc?.getTextWidth(attributionText) ?? 0;
    this.pdfDoc?.text(attributionText, mapRight - textWidth - 2, y);
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
