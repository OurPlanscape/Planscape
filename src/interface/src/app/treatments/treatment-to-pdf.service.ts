import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  descriptionsForAction,
  PrescriptionAction,
  PrescriptionSequenceAction,
  PrescriptionSingleAction,
  PRESCRIPTIONS,
} from './prescriptions';
import { Map as MapLibreMap } from 'maplibre-gl';
import { logoImg } from '../../assets/base64/icons';
import { Prescription, TreatmentProjectArea, TreatmentSummary } from '@types';
import { MapConfigState } from './treatment-map/map-config.state';

import { TreatmentsState } from './treatments.state';
import { TreatedStandsState } from './treatment-map/treated-stands.state';
import * as txIcons from '../../assets/base64/stand_icons/treatments';
import { addRequestHeaders } from './maplibre.helper';
import { AuthService } from '@services';

const treatmentIcons: Record<PrescriptionAction, string> = {
  MODERATE_THINNING_BIOMASS: txIcons.treatment_blue,
  HEAVY_THINNING_BIOMASS: txIcons.treatment_purple,
  MODERATE_THINNING_BURN: txIcons.treatment_orange,
  HEAVY_THINNING_BURN: txIcons.treatment_yellow,
  MODERATE_MASTICATION: txIcons.treatment_junglegreen,
  HEAVY_MASTICATION: txIcons.treatment_limegreen,
  RX_FIRE: txIcons.treatment_red,
  HEAVY_THINNING_RX_FIRE: txIcons.treatment_brown,
  MASTICATION_RX_FIRE: txIcons.treatment_pink,
  MODERATE_THINNING_BURN_PLUS_RX_FIRE: txIcons.sequence_1,
  MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN: txIcons.sequence_2,
  HEAVY_THINNING_BURN_PLUS_RX_FIRE: txIcons.sequence_3,
  HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN: txIcons.sequence_4,
  RX_FIRE_PLUS_RX_FIRE: txIcons.sequence_5,
  MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION: txIcons.sequence_6,
  HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE: txIcons.sequence_7,
  MODERATE_MASTICATION_PLUS_RX_FIRE: txIcons.sequence_8,
};

@Injectable()
export class TreatmentToPDFService {
  constructor(
    private treatmentsState: TreatmentsState,
    private treatedStandsState: TreatedStandsState,
    private mapConfigState: MapConfigState,
    private authService: AuthService
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
      this.treatedStandsState.getTreatedStands().map((s) => s.action)
    );
    this.addLogo(this.leftMargin, 14);

    const headerText = `${planningAreaName} / ${scenarioName} /  ${treatmentPlanName}`;
    this.addHeader(headerText, this.leftMargin, 24.5);

    //add stands info:
    const treatedStands = `Treated Stands: ${treatedStandsCount} / ${totalStands}`;

    this.pdfDoc?.setFont('Helvetica', 'normal');
    this.pdfDoc?.setFontSize(8);
    const standsTextWidth = this.pdfDoc?.getTextWidth(treatedStands);
    this.pdfDoc?.text(treatedStands, 190 - standsTextWidth, 24.5);

    const mapX = this.leftMargin + 10;
    const mapY = 28;
    const mapWidth = this.rightMargin - (this.leftMargin + 20);
    const mapHeight = 100;
    await this.addMap(mapX, mapY, mapHeight, mapWidth);

    this.addAttributions(attributions, mapX + mapWidth, mapHeight + mapY - 2);

    // If we are showing the treatment stands, we change what's being rendered
    if (this.mapConfigState.isTreatmentStandsVisible()) {
      const nextY = 132;
      this.drawTreatmentLegend(130, nextY, treatmentsUsedSet);
      this.addProjectAreaTable(
        this.tableRowsFromSummary(curSummary),
        this.leftMargin + 10,
        nextY,
        80
      );
    } else {
      const projectAreasX = this.leftMargin + 10;
      const projectAreasY = 132;
      this.addProjectAreaTable(
        this.tableRowsFromSummary(curSummary),
        projectAreasX,
        projectAreasY,
        140
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
    treatmentsUsed: Set<string>
  ) {
    const treatments = Array.from(treatmentsUsed).map((t) => ({
      name: descriptionsForAction(t),
      icon: treatmentIcons[t as PrescriptionAction],
    }));
    autoTable(this.pdfDoc, {
      styles: {
        fillColor: [255, 255, 255],
        cellPadding: 2,
        lineColor: '#000000',
        lineWidth: 0.4,
      },
      headStyles: {
        fontSize: 7,
        lineWidth: 0,
        font: 'Helvetica',
        textColor: '#000000',
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { fontSize: 7, cellWidth: 50, lineWidth: 0, cellPadding: 1 },
      },
      startY: startY,
      tableLineWidth: 0.3,
      tableLineColor: [0, 0, 0],
      margin: {
        left: startX - 2,
        right: 20,
        top: 10,
        bottom: 20,
      },
      tableWidth: 52,
      horizontalPageBreak: true,
      head: [['Treatment Legend']],
      body: treatments,
      didDrawCell: (data) => {
        if (data.column.index === 0 && data.row.section === 'body') {
          const idx = data.row.index;
          const x = data.cell.x + 1; // Add some padding
          const y = data.cell.y; // Add some padding
          data.doc.addImage(treatments[idx].icon, 'PNG', x, y, 3, 3);
          data.row.height += 1.5 * treatments[idx].name.length; // expand height per name line
          data.doc.text(treatments[idx].name, x + 4, y + 2.5);
        }
      },
    });
  }

  tableRowsFromSummary(currentSummary: TreatmentSummary): string[][] {
    const tableRows: string[][] = [];
    currentSummary.project_areas.forEach((p) => {
      let rxInfo = '';
      p.prescriptions.forEach((rx) => {
        if (rx.type === 'SINGLE') {
          const actionName =
            PRESCRIPTIONS.SINGLE[rx.action as PrescriptionSingleAction];
          rxInfo += actionName + '\n';
        }

        if (rx.type === 'SEQUENCE') {
          const seqActions =
            PRESCRIPTIONS.SEQUENCE[rx.action as PrescriptionSequenceAction];
          seqActions.forEach((seqAction) => {
            rxInfo +=
              seqAction.description + '(Year ' + seqAction.year + ') \n ';
          });
        }
      });
      const treatedStands = `Treated stands: ${this.treatedStandCount(p)}/${p.total_stand_count}`;
      const projectInfo = `${p.project_area_name} \n ${treatedStands} \n\n ${rxInfo}`;
      tableRows.push([projectInfo]);
    });
    return tableRows;
  }

  addProjectAreaTable(
    bodyData: string[][],
    startX: number,
    startY: number,
    tableWidth: number
  ) {
    autoTable(this.pdfDoc, {
      styles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { fontSize: 8 },
      },
      tableWidth: tableWidth,
      startY: startY,
      tableLineWidth: 0.3,
      tableLineColor: '#000000',
      theme: 'grid',
      margin: {
        left: startX,
        right: 20,
        top: 10,
        bottom: 20,
      },
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
      transformRequest: (url, resourceType) =>
        addRequestHeaders(url, resourceType, this.authService.getAuthCookie()),
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
    this.pdfDoc?.setFont('Helvetica', 'bold');
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
