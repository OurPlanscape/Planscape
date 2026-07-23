import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Map as MapLibreMap } from 'maplibre-gl';
import { addRequestHeaders } from '@app/maplibre-map/maplibre.helper';
import { AuthService } from '@app/services';
import { FundingMapConfigState } from './funding-map-config-state';

// A4 portrait, in millimeters.
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const LOGO_PATH = 'assets/svg/planscape-color-logo.svg';

/**
 * Exports the funding report as a PDF by rasterizing the live report DOM
 * (map + sections, as shown in the dashboard preview) and paginating the
 * resulting image across A4 pages.
 */
@Injectable()
export class FundingReportToPdfService {
  /**
   * @param element The report sections container to capture.
   * @param fileName Name of the downloaded file, without extension.
   * @param mapCanvas Optional map canvas to draw at the top of the first page.
   *   Used by the full report view, where the map lives outside the report
   *   sections. In the dashboard preview the map is already inside `element`,
   *   so this is omitted.
   */

  constructor(private authService: AuthService,
    private fundingMapConfigState: FundingMapConfigState
  ) { }

  activeMap: MapLibreMap | null = null;
  pdfInstance: jsPDF | null = null;

  async exportReport(
    element: HTMLElement,
    fileName: string,
    map: MapLibreMap,
    mapCanvas?: HTMLCanvasElement | null
  ): Promise<void> {
    this.pdfInstance = new jsPDF('p', 'mm', 'a4');

    // --- CONFIGURABLE MARGINS & SCALING ---
    const MARGIN_MM = 15;
    const COMBINED_MARGINS = MARGIN_MM * 2;
    const TARGET_CONTENT_WIDTH = PAGE_WIDTH_MM - COMBINED_MARGINS;
    const scaleMultiplier = 0.7; // Master scaling knob

    const mapX = MARGIN_MM;
    const mapWidth = 210 - (MARGIN_MM * 2);
    const mapHeight = mapWidth * 0.666;

    // Pre-load the logo so it's ready to paint on the PDF canvas
    const logoDataUrl = await this.loadLogo(LOGO_PATH);


    this.fundingMapConfigState.setFundingLegendVisibility(true);

    // Set the map reference to the maplibre reference
    this.activeMap = map;


    const mapContainer = document.createElement('div');
    this.configMapContainer(mapContainer);
    document.body.appendChild(mapContainer);



    const drawHeader = () => {
      if (logoDataUrl && this.pdfInstance) {
        const logoWidth = 32; // in mm
        const logoHeight = 6;
        this.pdfInstance.addImage(
          logoDataUrl,
          'PNG',
          MARGIN_MM,
          7,
          logoWidth,
          logoHeight
        );
      }
      this.pdfInstance?.setDrawColor('#E2E8F0');
      this.pdfInstance?.setLineWidth(0.5);
      this.pdfInstance?.line(MARGIN_MM, 16, PAGE_WIDTH_MM - MARGIN_MM, 16);
    };


    // Initialize Page 1 Header and set initial content baseline below it
    drawHeader();
    let currentY = 20; // 20mm gives breathing room below the header line

    await this.addMap(mapX, currentY, mapHeight, mapWidth);

    // advance the current Y drawing 'cursor' to after the map
    currentY += 8 + mapHeight;

    const cards = element.querySelectorAll('.report-section');
    document.body.classList.add('is-generating-pdf');

    // Note: we are skipping map by index here --
    // TODO: exclude this specifically by class instead
    for (let i = 1; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;

      const canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgWidth = TARGET_CONTENT_WIDTH;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      const finalWidth = imgWidth * scaleMultiplier;
      const finalHeight = imgHeight * scaleMultiplier;
      const centeringOffset = (TARGET_CONTENT_WIDTH - finalWidth) / 2;
      const finalX = MARGIN_MM + centeringOffset;

      // Check if drawing this element will violate the bottom margin
      if (currentY + finalHeight > PAGE_HEIGHT_MM - MARGIN_MM) {
        this.pdfInstance.addPage();
        drawHeader();
        currentY = 20; // Reset content baseline to the top of the new page
      }

      // Draw the element
      this.pdfInstance.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        finalX,
        currentY,
        finalWidth,
        finalHeight
      );
      currentY += finalHeight + 10;
    }

    document.body.classList.remove('is-generating-pdf');
    this.pdfInstance.save(`${fileName}.pdf`);
  }

  /**
   * Helper to convert an image path/SVG into an HTMLImageElement
   * so jsPDF can parse it natively.
   */
  private loadLogo(src: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Create a temporary canvas to rasterize the SVG into a PNG
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Use the SVG's natural size or fallback to standard dimensions
        canvas.width = img.naturalWidth || 200;
        canvas.height = img.naturalHeight || 50;

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          // Convert the canvas to a clean, uncorrupted base64 PNG data URL
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

    return new Promise((resolve) => {
      const printMap = new MapLibreMap({
        container: 'printable-map',
        preserveDrawingBuffer: true, // Required for toDataURL
        style: this.activeMap?.getStyle(),
        center: this.activeMap?.getBounds().getCenter(),
        zoom: this.activeMap?.getZoom(),
        bearing: this.activeMap?.getBearing(),
        pitch: this.activeMap?.getPitch(),
        bounds: this.activeMap?.getBounds(),
        transformRequest: (url, resourceType) =>
          addRequestHeaders(url, resourceType, this.authService.getAuthCookie()),
      });

      // Wait until the map has finished loading tiles and rendering
      printMap.once('idle', () => {
        resolve(printMap);
      });
    });
  }

  async addMap(
    mapX: number,
    mapY: number,
    mapHeight: number,
    mapWidth: number
  ) {
    if (!this.pdfInstance || !this.activeMap) {
      return;
    }

    const printMap = await this.copyActiveMap();
    const canvas = printMap?.getCanvas();
    const imgData = canvas?.toDataURL('image/png');

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

  configMapContainer(mapContainer: HTMLDivElement) {
    mapContainer.id = 'printable-map';
    mapContainer.style.position = 'absolute';
    mapContainer.style.width = '1000px';
    mapContainer.style.height = '700px';
    mapContainer.style.left = '-9000px';
    mapContainer.style.top = '-100px';
    document.body.appendChild(mapContainer);
  }
}
