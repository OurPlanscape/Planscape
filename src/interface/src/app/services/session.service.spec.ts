import { Region } from '../types/region.types';
import { TestBed } from '@angular/core/testing';

import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save region', () => {
    const testRegion = Region.NORTHERN_CALIFORNIA;
    const spyStorage = spyOn(localStorage, 'setItem');

    service.setRegion(testRegion);

    expect(spyStorage).toHaveBeenCalledOnceWith('region', testRegion);
    expect(service.region$.value).toBe(testRegion);
  });
});
