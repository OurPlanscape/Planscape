import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';

import { MixpanelService } from '@services/mixpanel.service';
import { OpenPanelService } from '@services/open-panel.service';
import { ProductAnalyticsService } from '@services/product-analytics.service';

describe('ProductAnalyticsService', () => {
  let service: ProductAnalyticsService;
  let openPanel: OpenPanelService;
  let mixpanel: MixpanelService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProductAnalyticsService,
        MockProvider(OpenPanelService),
        MockProvider(MixpanelService),
      ],
    });
    service = TestBed.inject(ProductAnalyticsService);
    openPanel = TestBed.inject(OpenPanelService);
    mixpanel = TestBed.inject(MixpanelService);
  });

  it('starts both SDKs', () => {
    spyOn(openPanel, 'init');
    spyOn(mixpanel, 'init');

    service.init();

    expect(openPanel.init).toHaveBeenCalled();
    expect(mixpanel.init).toHaveBeenCalled();
  });

  it('sends every event to both SDKs so the data sets stay comparable', () => {
    spyOn(openPanel, 'trackEvent');
    spyOn(mixpanel, 'track');

    service.trackEvent('funding_report.shared_link.copied', { scenario_id: 7 });

    expect(openPanel.trackEvent).toHaveBeenCalledWith(
      'funding_report.shared_link.copied',
      { scenario_id: 7 }
    );
    expect(mixpanel.track).toHaveBeenCalledWith(
      'funding_report.shared_link.copied',
      { scenario_id: 7 }
    );
  });
});
