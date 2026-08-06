import {
  createComponent,
  EnvironmentInjector,
  Injectable,
  Injector,
} from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Map as MapLibreMap } from 'maplibre-gl';
import { addRequestHeaders } from '@app/maplibre-map/maplibre.helper';
import { AuthService, ScenarioService } from '@app/services';
import { FundingMapConfigState } from './funding-map-config-state';
import {
  FundingAcreageLegendComponent,
  FundingLegendData,
} from './funding-acreage-legend/funding-acreage-legend.component';
import { firstValueFrom } from 'rxjs';
import { generateLegendFromReport } from './funding-report/funding-report.helper';
import { FundingReport, ProjectArea } from '@app/types';

/**
 * Exports the funding report as a PDF by rasterizing the live report DOM
 * (map + sections, as shown in the dashboard preview) and paginating the
 * resulting image across A4 pages.
 */
@Injectable()
export class FundingReportToPdfService {
  // ---- PDF page geometry (A4 portrait, mm) ----
  private static readonly PAGE_WIDTH_MM = 210;
  private static readonly PAGE_HEIGHT_MM = 297;
  private static readonly MARGIN_MM = 12;
  private static readonly VERTICAL_GAP = 8;
  private static readonly CARD_SCALE_MULTIPLIER = 0.7;
  private static readonly LOGO_PATH = 'assets/svg/planscape-color-logo.svg';

  constructor(
    private authService: AuthService,
    private fundingMapConfigState: FundingMapConfigState,
    private injector: EnvironmentInjector,
    private scenarioService: ScenarioService
  ) {}

  /**
   * Generate and download the PDF report.
   */
  async exportPDFReport(
    element: HTMLElement,
    fundingReport: FundingReport,
    selectedProjects?: number[]
  ): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const { MARGIN_MM, PAGE_WIDTH_MM, VERTICAL_GAP } =
      FundingReportToPdfService;
    const map = this.fundingMapConfigState.getMapRef();
    const scenarioId = fundingReport.scenario;
    const mapWidth = PAGE_WIDTH_MM - MARGIN_MM * 2;
    const mapHeight = mapWidth * 0.666;

    // TODO: async service call...can we get this somewhere else?
    const allAvailableProjectAreas = await firstValueFrom(
      this.scenarioService.getProjectAreas(scenarioId)
    );

    // This currentY is essentially a "cursor" for where we have advanced
    // when adding elements from top to bottom in the X,Y plane
    let currentY = 0;

    // Fetch async prerequisites
    const [logoDataUrl] = await Promise.all([
      this.loadLogo(FundingReportToPdfService.LOGO_PATH),
    ]);

    const selectedProjectAreas = selectedProjects
      ? this.getSelectedProjectAreas(selectedProjects, allAvailableProjectAreas)
      : [];
    this.fundingMapConfigState.setFundingLegendVisibility(true);

    // Reusable page header renderer
    const renderHeader = () =>
      this.drawHeader(pdf, logoDataUrl, selectedProjectAreas);
    renderHeader();

    currentY = 20;

    // Map Section
    if (map) {
      await this.addMapToPdf(
        pdf,
        map,
        MARGIN_MM,
        currentY,
        mapWidth,
        mapHeight
      );
    }
    // Legend Section
    currentY += mapHeight + VERTICAL_GAP;
    const legendWidth = mapWidth / 3;

    //recalcuate this in this context, because we never do it in the preview
    const legendData = generateLegendFromReport(
      fundingReport.results,
      selectedProjects ?? [],
      allAvailableProjectAreas
    );

    const legendDimensions = await this.addLegendToPdf(
      pdf,
      legendData,
      MARGIN_MM + legendWidth * 2,
      currentY,
      legendWidth
    );

    // Report Cards Section
    currentY += legendDimensions.height + VERTICAL_GAP;
    await this.renderReportCards(pdf, element, currentY, renderHeader);

    pdf.save(`planscape-funding-report-${scenarioId}.pdf`);
  }

  private drawHeader(
    pdf: jsPDF,
    logoDataUrl: string | null,
    selectedProjectAreas: number[]
  ): void {
    const { MARGIN_MM, PAGE_WIDTH_MM } = FundingReportToPdfService;

    if (logoDataUrl) {
      pdf.addImage(logoDataUrl, 'PNG', MARGIN_MM, 7, 32, 6);
    }

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(8);

    const selectedList =
      selectedProjectAreas.length > 0 ? selectedProjectAreas.join(', ') : 'All';
    const selectedAreasInfo = `Selected Project Areas: ${selectedList}`;
    const saTextWidth = pdf.getTextWidth(selectedAreasInfo);

    pdf.text(selectedAreasInfo, PAGE_WIDTH_MM - MARGIN_MM - saTextWidth, 12);
    pdf.setDrawColor('#E2E8F0');
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN_MM, 16, PAGE_WIDTH_MM - MARGIN_MM, 16);
  }

  private async addMapToPdf(
    pdf: jsPDF,
    activeMap: MapLibreMap,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    const printMap = await this.copyActiveMap(activeMap);
    const imgData = printMap.getCanvas()?.toDataURL('image/png');

    if (imgData) {
      pdf.addImage(imgData, 'PNG', x, y, width, height);
    }

    // Border
    pdf.setDrawColor(167, 170, 224);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, width, height);

    // Clean up temporary map DOM container
    printMap.getContainer().remove();
  }

  private async addLegendToPdf(
    pdf: jsPDF,
    legendData: FundingLegendData,
    x: number,
    y: number,
    targetWidth: number
  ): Promise<{ width: number; height: number }> {
    const {
      imgData,
      width: canvasWidth,
      height: canvasHeight,
    } = await this.captureComponent(
      FundingAcreageLegendComponent,
      { legendData: legendData },
      ['pdf-version']
    );

    const targetHeight = (canvasHeight / canvasWidth) * targetWidth;
    pdf.addImage(imgData, 'PNG', x, y, targetWidth, targetHeight);

    return { width: targetWidth, height: targetHeight };
  }

  private async renderReportCards(
    pdf: jsPDF,
    element: HTMLElement,
    startY: number,
    drawHeader: () => void
  ): Promise<void> {
    const { MARGIN_MM, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, CARD_SCALE_MULTIPLIER } =
      FundingReportToPdfService;
    const cards = element.querySelectorAll('.report-section');

    document.body.classList.add('is-generating-pdf');

    const HEADER_OFFSET_Y = 20;
    const colWidth = (PAGE_WIDTH_MM - MARGIN_MM) / 2;
    const colXPositions = [MARGIN_MM * 2, PAGE_WIDTH_MM - colWidth];

    let currentY = startY;
    let pageStartY = startY;
    let currentColumn = 0;

    for (let i = 1; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;

      const canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const layout = this.scaleCardImage(
        canvas,
        colWidth,
        CARD_SCALE_MULTIPLIER,
        MARGIN_MM
      );

      // Check overflow
      if (currentY + layout.height > PAGE_HEIGHT_MM - MARGIN_MM) {
        const isFirstItemOnPage = currentY === pageStartY;

        if (currentColumn === 0 && !isFirstItemOnPage) {
          // Move to Column 2 on the SAME page
          currentColumn = 1;
          currentY = pageStartY;
        } else {
          // Create NEW page and reset to Column 1
          pdf.addPage();
          drawHeader();

          currentColumn = 0;
          pageStartY = HEADER_OFFSET_Y;
          currentY = pageStartY;
        }
      }

      // Draw card
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        colXPositions[currentColumn],
        currentY,
        layout.width,
        layout.height
      );

      currentY += layout.height + 10;
    }

    document.body.classList.remove('is-generating-pdf');
  }

  private async copyActiveMap(activeMap: MapLibreMap): Promise<MapLibreMap> {
    const mapContainer = document.createElement('div');
    mapContainer.id = 'printable-map';
    Object.assign(mapContainer.style, {
      position: 'absolute',
      width: '1000px',
      height: '700px',
      left: '-9000px',
      top: '-100px',
    });
    document.body.appendChild(mapContainer);

    const printMap = new MapLibreMap({
      container: mapContainer,
      preserveDrawingBuffer: true,
      style: activeMap.getStyle(),
      center: activeMap.getBounds().getCenter(),
      zoom: activeMap.getZoom(),
      fitBoundsOptions: {
        padding: { top: 70, bottom: 40, left: 20, right: 20 },
      },
      bearing: activeMap.getBearing(),
      pitch: activeMap.getPitch(),
      bounds: activeMap.getBounds(),
      transformRequest: (url, resourceType) =>
        addRequestHeaders(url, resourceType, this.authService.getAuthCookie()),
    });

    return new Promise((resolve) => {
      printMap.once('idle', () => resolve(printMap));
    });
  }

  private async captureComponent<T>(
    component: new (...args: any[]) => T,
    inputs?: Partial<T>,
    cssClasses: string[] = ['pdf-version']
  ): Promise<{ imgData: string; width: number; height: number }> {
    const elementInjector = Injector.create({
      providers: [
        {
          provide: FundingMapConfigState,
          useValue: this.fundingMapConfigState,
        },
      ],
      parent: this.injector,
    });

    const compRef = createComponent(component, {
      environmentInjector: this.injector,
      elementInjector,
    });

    if (inputs) {
      Object.assign(compRef.instance as object, inputs);
    }

    const element = compRef.location.nativeElement as HTMLElement;
    Object.assign(element.style, {
      position: 'absolute',
      left: '-9000px',
      top: '-9000px',
    });
    cssClasses.forEach((cls) => element.classList.add(cls));

    document.body.appendChild(element);
    compRef.changeDetectorRef.detectChanges();

    await document.fonts.ready;

    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 3,
      windowWidth: 1000,
      windowHeight: 2000,
    });

    const result = {
      imgData: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    };

    document.body.removeChild(element);
    compRef.destroy();

    return result;
  }

  private scaleCardImage(
    canvas: HTMLCanvasElement,
    targetContentWidth: number,
    scaleMultiplier: number,
    marginMm: number
  ): { x: number; width: number; height: number } {
    const imgWidth = targetContentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const width = imgWidth * scaleMultiplier;
    const height = imgHeight * scaleMultiplier;
    const centeringOffset = (targetContentWidth - width) / 2;

    return { x: marginMm + centeringOffset, width, height };
  }

  private getSelectedProjectAreas(
    selectedIds: number[],
    allAvailableProjectAreas: ProjectArea[]
  ): number[] {
    const projectAreas = allAvailableProjectAreas;

    return projectAreas
      .filter((pa) => selectedIds.includes(pa.id))
      .map((pa) => pa.data.treatment_rank);
  }

  private loadLogo(src: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img.naturalWidth || 200;
        canvas.height = img.naturalHeight || 50;

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      };

      img.onerror = () => {
        console.error(`Failed to load PDF logo header from: ${src}`);
        resolve(null);
      };

      img.src = src;
    });
  }
}
