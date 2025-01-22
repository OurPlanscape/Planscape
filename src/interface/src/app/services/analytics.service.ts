import { Injectable } from '@angular/core';
import { GoogleAnalyticsService } from 'ngx-google-analytics';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  constructor(private gaEventService: GoogleAnalyticsService) {}

  /**
   * Emit a Google Analytics event
   * @param action action Action made by the user. Possible values are:
   * - "polygons_draw_explore": For events related to drawing or exploring polygons.
   * - "shapefiles_uploaded_explore": For generic events without a specific context.
   * @param category Event category (i.e. "user_interaction")
   * @param label Event tag (optional, i.e. "home_page_button")
   * @param value Event value
   * @param interaction If user interaction is performed
   * @param properties Additional parametters we want to send i.e. {product_id: "123", price: 99.99, currency: "USD"}
   */
  emitEvent(
    action:
      | 'polygons_draw_explore'
      | 'shapefiles_uploaded_explore'
      | 'run_treatment_analysis'
      | 'new_treatment_plan',
    category?: string,
    label?: string,
    value?: number,
    interaction?: boolean,
    properties?: any
  ) {
    this.gaEventService.event(
      action,
      category,
      label,
      value,
      interaction,
      properties
    );
  }
}
