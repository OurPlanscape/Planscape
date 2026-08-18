import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';

import { MixpanelService } from '@services/mixpanel.service';
import { ProductAnalyticsService } from '@services/product-analytics.service';

describe('ProductAnalyticsService', () => {
  let service: ProductAnalyticsService;
  let mixpanel: MixpanelService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProductAnalyticsService, MockProvider(MixpanelService)],
    });
    service = TestBed.inject(ProductAnalyticsService);
    mixpanel = TestBed.inject(MixpanelService);
  });

  it('starts the SDK', () => {
    spyOn(mixpanel, 'init');

    service.init();

    expect(mixpanel.init).toHaveBeenCalled();
  });

  it('forwards events to mixpanel', () => {
    spyOn(mixpanel, 'track');

    service.trackEvent('funding_report.shared_link.copied', { scenario_id: 7 });

    expect(mixpanel.track).toHaveBeenCalledWith(
      'funding_report.shared_link.copied',
      { scenario_id: 7 }
    );
  });
});
