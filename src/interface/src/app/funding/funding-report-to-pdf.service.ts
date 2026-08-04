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
import { FundingAcreageLegendComponent } from './funding-acreage-legend/funding-acreage-legend.component';
import { firstValueFrom } from 'rxjs';

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

  // Shrinks captured report-card screenshots so they don't dominate the page.
  private static readonly CARD_SCALE_MULTIPLIER = 0.7;

  private static readonly LOGO_PATH = 'assets/svg/planscape-color-logo.svg';

  // ---- Per-export state ----
  // Reset at the start of every exportPDFReport() call.
  private scenarioId: number | null = null;
  private activeMap: MapLibreMap | null = null;
  private pdfInstance: jsPDF | null = null;

  constructor(
    private authService: AuthService,
    private fundingMapConfigState: FundingMapConfigState,
    private injector: EnvironmentInjector,
    private scenarioService: ScenarioService
  ) {}

  /**
   * Exports the funding report as a PDF by rasterizing the live report DOM
   * (map + sections, as shown in the dashboard preview) and paginating the
   * resulting image across A4 pages.
   *
   * @param element The report sections container to capture
   */
  async exportPDFReport(
    element: HTMLElement,
    scenarioId: number,
    map: MapLibreMap,
    selectedProjects?: number[]
  ): Promise<void> {
    this.pdfInstance = new jsPDF('p', 'mm', 'a4');
    this.scenarioId = scenarioId;
    this.activeMap = map;

    const filename = `planscape-funding-report-${scenarioId}`;

    const { MARGIN_MM, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, CARD_SCALE_MULTIPLIER } =
      FundingReportToPdfService;
    const targetContentWidth = PAGE_WIDTH_MM - MARGIN_MM * 2;

    const mapX = MARGIN_MM;
    const fullPageWidth = PAGE_WIDTH_MM - (MARGIN_MM * 2);
    const mapHeight = fullPageWidth * 0.666;

    // Pre-load the logo so it's ready to paint on the PDF canvas.
    const logoDataUrl = await this.loadLogo(
      FundingReportToPdfService.LOGO_PATH
    );
    const selectedProjectAreas = selectedProjects
      ? await this.getSelectedProjectAreas(selectedProjects)
      : [];

    this.fundingMapConfigState.setFundingLegendVisibility(true);

    const mapContainer = document.createElement('div');
    this.configMapContainer(mapContainer);

    const drawHeader = () => {
      if (logoDataUrl && this.pdfInstance) {
        this.pdfInstance.addImage(logoDataUrl, 'PNG', MARGIN_MM, 7, 32, 6);
      }

      // draw title info...

      this.pdfInstance?.setFont('Helvetica', 'normal');
      this.pdfInstance?.setFontSize(8);
      const selectedList =
        selectedProjectAreas.length > 0
          ? selectedProjectAreas.join(', ')
          : 'All';

      const selectedAreasInfo = `Selected Project Areas: ${selectedList}`;
      const saTextWidth =
        this.pdfInstance?.getTextWidth(selectedAreasInfo) ?? 0;
      this.pdfInstance?.text(
        selectedAreasInfo,
        PAGE_WIDTH_MM - MARGIN_MM - saTextWidth,
        12
      );
      this.pdfInstance?.setDrawColor('#E2E8F0');
      this.pdfInstance?.setLineWidth(0.5);
      this.pdfInstance?.line(MARGIN_MM, 16, PAGE_WIDTH_MM - MARGIN_MM, 16);
    };

    // Initialize Page 1 header and set the content baseline below it.
    drawHeader();
    let currentY = 20; // gives breathing room below the header line

    await this.addMap(mapX, currentY, mapHeight, fullPageWidth);

    currentY += 8 + mapHeight;
    await this.addLegend(MARGIN_MM + ((fullPageWidth / 3) * 2), currentY, fullPageWidth / 3);

    const cards = element.querySelectorAll('.report-section');
    document.body.classList.add('is-generating-pdf');

    // Note: we are skipping the map by index here.
    // TODO: exclude this specifically by class instead
    for (let i = 1; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;

      const canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const layout = this.scaleCardImage(
        canvas,
        targetContentWidth,
        CARD_SCALE_MULTIPLIER,
        MARGIN_MM
      );

      // Start a new page if this card would overflow the bottom margin.
      if (currentY + layout.height > PAGE_HEIGHT_MM - MARGIN_MM) {
        this.pdfInstance.addPage();
        drawHeader();
        currentY = 20;
      }

      this.pdfInstance.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        layout.x,
        currentY,
        layout.width,
        layout.height
      );
      currentY += layout.height + 10;
    }

    document.body.classList.remove('is-generating-pdf');
    this.pdfInstance.save(`${filename}.pdf`);
  }

  /**
   * Scales a captured card canvas to fit the page content width, applying
   * the master scale multiplier and centering it horizontally.
   */
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

  private async getSelectedProjectAreas(
    selectedIds: number[]
  ): Promise<number[]> {
    if (!this.scenarioId) {
      return [];
    }

    const projectAreas = await firstValueFrom(
      this.scenarioService.getProjectAreas(this.scenarioId)
    );

    return projectAreas
      .filter((pa) => selectedIds.includes(pa.id))
      .map((pa) => pa.data.treatment_rank);
  }

  /**
   * Converts an image path/SVG into a data URL so jsPDF can render it.
   */
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

  async copyActiveMap(): Promise<MapLibreMap> {
    if (this.activeMap === null) {
      throw new Error('No active map');
    }
    const curZoom = this.activeMap?.getZoom();
    const curBounds = this.activeMap?.getBounds();
    console.log('the current zoom is:', curZoom);
    console.log('the current bounds is:', curBounds);

    const printMap = new MapLibreMap({
      container: 'printable-map',
      preserveDrawingBuffer: true, // required for toDataURL
      style: this.activeMap?.getStyle(),
      center: this.activeMap?.getBounds().getCenter(),
      zoom: 9,
      fitBoundsOptions: {
        padding: { top: 70, bottom: 40, left: 20, right: 20 },
      },
      bearing: this.activeMap?.getBearing(),
      pitch: this.activeMap?.getPitch(),
      bounds: this.activeMap?.getBounds(),
      transformRequest: (url, resourceType) =>
        addRequestHeaders(url, resourceType, this.authService.getAuthCookie()),
    });
    console.log('what is the printmap object?', printMap);

    return new Promise((resolve) => {
      // Wait until the map has finished loading tiles and rendering.
      printMap.once('idle', () => resolve(printMap));
    });
  }

  async addMap(
    mapX: number,
    mapY: number,
    mapHeight: number,
    mapWidth: number
  ): Promise<void> {
    if (!this.pdfInstance || !this.activeMap) {
      return;
    }

    const printMap = await this.copyActiveMap();
    const imgData = printMap?.getCanvas()?.toDataURL('image/png');

    if (imgData) {
      this.pdfInstance.setLineWidth(1);
      this.pdfInstance.rect(mapX, mapY, mapWidth, mapHeight);
      this.pdfInstance.addImage(
        imgData,
        'PNG',
        mapX,
        mapY,
        mapWidth,
        mapHeight
      );
    }
  }

  configMapContainer(mapContainer: HTMLDivElement): void {
    mapContainer.id = 'printable-map';
    mapContainer.style.position = 'absolute';
    mapContainer.style.width = '1000px';
    mapContainer.style.height = '700px';
    mapContainer.style.left = '-9000px';
    mapContainer.style.top = '-100px';
    document.body.appendChild(mapContainer);
  }

  /**
   * Renders an arbitrary component off-screen and captures it as an image,
   * e.g. for the legend.
   */
  async captureComponent<T>(
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
      parent: this.injector, // fall back to root injector for everything else
    });

    const compRef = createComponent(component, {
      environmentInjector: this.injector,
      elementInjector,
    });

    if (inputs) {
      Object.assign(compRef.instance as object, inputs);
    }

    const element = compRef.location.nativeElement as HTMLElement;
    element.style.position = 'absolute';
    element.style.left = '-9000px';
    element.style.top = '-9000px';
    cssClasses.forEach((cls) => element.classList.add(cls));

    document.body.appendChild(element);
    compRef.changeDetectorRef.detectChanges();

    // Ensure icon fonts or web fonts render properly.
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

  async addLegend(
    legendX: number,
    legendY: number,
    targetWidth: number,
  ): Promise<{ width: number; height: number }> {
    if (!this.pdfInstance) return { width: 0, height: 0 };

    const { imgData } = await this.captureComponent(
      FundingAcreageLegendComponent,
      // TODO: this is a placeholder of data
      { legendData: this.fundingMapConfigState.getLegendData() ?? {} },
      ['pdf-version']
    );

    const targetHeight = targetWidth * 0.90;

    this.pdfInstance.addImage(
      imgData,
      'PNG',
      legendX,
      legendY,
      targetWidth,
      targetHeight
    );

    return { width: targetWidth, height: targetHeight };
  }
}
