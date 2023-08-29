import { TestBed } from '@angular/core/testing';

import { PopupService } from './popup.service';

describe('PopupService', () => {
  let service: PopupService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PopupService] });
    service = TestBed.inject(PopupService);
  });

  it('can load instance', () => {
    expect(service).toBeTruthy();
  });

  describe('makeDetailsPopup', () => {
    it('returns html', () => {
      const data = 'Test data';
      const expectedHtml = `` + `<div>Name: Test data</div>`;

      expect(service.makeDetailsPopup(data)).toEqual(expectedHtml);
    });
  });
});
