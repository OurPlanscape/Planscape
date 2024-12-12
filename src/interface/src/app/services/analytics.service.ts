import { Injectable } from '@angular/core';
import { GoogleAnalyticsService } from 'ngx-google-analytics';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  constructor(private gaEventService: GoogleAnalyticsService) {}

  /**
   * Emit a Google Analytics event
   * @param action Action made by the user (i.e. "button_click")
   * @param category Event category (i.e. "user_interaction")
   * @param label Event tag (optional, i.e. "home_page_button")
   * @param value Event value
   * @param interaction If user interaction is performed
   * @param properties Additional parametters we want to send i.e. {product_id: "123", price: 99.99, currency: "USD"}
   */
  emitEvent(
    action: string,
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
