import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// A4 portrait, in millimeters.
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

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
  async exportReport(
    element: HTMLElement,
    fileName: string,
    mapCanvas?: HTMLCanvasElement | null
  ): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');

    // Optional map on top of the first page.
    let topOffset = 0;
    if (mapCanvas && mapCanvas.width > 0) {
      const mapHeight = (mapCanvas.height * PAGE_WIDTH_MM) / mapCanvas.width;
      pdf.addImage(
        mapCanvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        PAGE_WIDTH_MM,
        mapHeight
      );
      topOffset = mapHeight;
    }

    const canvas = await this.captureFullElement(element);
    const imgWidth = PAGE_WIDTH_MM;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    // Draw the (potentially tall) sections image starting below the map on
    // page 1, then continue on subsequent full pages by shifting it up.
    pdf.addImage(imgData, 'PNG', 0, topOffset, imgWidth, imgHeight);
    let shown = PAGE_HEIGHT_MM - topOffset;
    while (shown < imgHeight) {
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -shown, imgWidth, imgHeight);
      shown += PAGE_HEIGHT_MM;
    }

    pdf.save(`${fileName}.pdf`);
  }

  /**
   * Captures the full element, including content scrolled out of view.
   *
   * The report sections live in an `overflow-y: auto` container, so html2canvas
   * would otherwise only paint the visible slice and leave the rest blank. We
   * temporarily lift the height/overflow constraints so the whole content lays
   * out, capture it, then restore the original inline styles.
   */
  private async captureFullElement(
    element: HTMLElement
  ): Promise<HTMLCanvasElement> {
    const original = {
      height: element.style.height,
      maxHeight: element.style.maxHeight,
      overflow: element.style.overflow,
      flex: element.style.flex,
    };

    element.style.height = 'auto';
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';
    element.style.flex = 'none';

    // Let the browser reflow (and chart.js canvases settle) before capturing.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

    try {
      return await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        height: element.scrollHeight,
        windowHeight: element.scrollHeight,
      });
    } finally {
      element.style.height = original.height;
      element.style.maxHeight = original.maxHeight;
      element.style.overflow = original.overflow;
      element.style.flex = original.flex;
    }
  }
}
