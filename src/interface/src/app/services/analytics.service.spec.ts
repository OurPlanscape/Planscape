import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';
import { GoogleAnalyticsService } from 'ngx-google-analytics';

// Mock for GoogleAnalyticsService
class MockGoogleAnalyticsService {
  event = jasmine.createSpy('event');
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let gaService: MockGoogleAnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: GoogleAnalyticsService,
          useClass: MockGoogleAnalyticsService,
        },
      ],
    });

    service = TestBed.inject(AnalyticsService);
    gaService = TestBed.inject(
      GoogleAnalyticsService
    ) as unknown as MockGoogleAnalyticsService;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call gaEventService.event with all parameters', () => {
    const action = 'polygons_draw_explore';
    const category = 'user_interaction';
    const label = 'home_page_button';
    const value = 10;
    const interaction = true;
    const properties = { product_id: '123', price: 99.99, currency: 'USD' };

    service.emitEvent(action, category, label, value, interaction, properties);

    expect(gaService.event).toHaveBeenCalledWith(
      action,
      category,
      label,
      value,
      interaction,
      properties
    );
  });

  it('should call gaEventService.event with optional parameters undefined', () => {
    const action = 'polygons_draw_explore';

    service.emitEvent(action);

    expect(gaService.event).toHaveBeenCalledWith(
      action,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
  });

  it('should call gaEventService.event with only some parameters defined', () => {
    const action = 'polygons_draw_explore';
    const category = 'user_interaction';
    const properties = { product_id: '123' };

    service.emitEvent(
      action,
      category,
      undefined,
      undefined,
      undefined,
      properties
    );

    expect(gaService.event).toHaveBeenCalledWith(
      action,
      category,
      undefined,
      undefined,
      undefined,
      properties
    );
  });
});
