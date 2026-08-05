import { TestBed } from '@angular/core/testing';

import { OpenPanelService } from './open-panel.service';

describe('OpenPanelService', () => {
  let service: OpenPanelService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [OpenPanelService] });
    service = TestBed.inject(OpenPanelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('does not start the SDK when tracking is disabled', () => {
    // `open_panel_enabled` is false in the test environment.
    service.init();

    expect(service['openPanel']).toBeNull();
  });

  it('does not throw when tracking an event before init', () => {
    expect(() => service.trackEvent('some.event', { id: 1 })).not.toThrow();
  });

  it('forwards the event to the SDK instance', () => {
    const openPanel = jasmine.createSpyObj('OpenPanel', ['track']);
    service['openPanel'] = openPanel;

    service.trackEvent('funding_report.shared_link.copied', { scenario_id: 7 });

    expect(openPanel.track).toHaveBeenCalledWith(
      'funding_report.shared_link.copied',
      { scenario_id: 7 }
    );
  });

  it('keeps the existing instance when init runs again', () => {
    const openPanel = jasmine.createSpyObj('OpenPanel', ['track']);
    service['openPanel'] = openPanel;

    service.init();

    expect(service['openPanel']).toBe(openPanel);
  });
});
