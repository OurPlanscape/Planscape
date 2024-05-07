import { TestBed } from '@angular/core/testing';
import { RegionService } from './region.service';
import { FeaturesModule } from '../features/features.module';
import { FEATURES_JSON } from '../features/features-config';
import { firstValueFrom } from 'rxjs';
import { Region } from '@types';
import { SessionService } from './session.service';

describe('RegionService', () => {
  let service: RegionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FeaturesModule],
      providers: [
        {
          provide: FEATURES_JSON,
          useValue: {
            drawn_northcal: false,
            draw_socal: true,
            draw_centralcoast: false,
          },
        },
        SessionService,
      ],
    });
    service = TestBed.inject(RegionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('drawRegionEnabled$', () => {
    it('should return true for enabled regions', async () => {
      const session = TestBed.inject(SessionService);
      session.region$.next(Region.NORTHERN_CALIFORNIA);

      let regionEnabled = await firstValueFrom(service.drawRegionEnabled$);
      expect(regionEnabled).toBe(false);

      session.region$.next(Region.SOUTHERN_CALIFORNIA);
      regionEnabled = await firstValueFrom(service.drawRegionEnabled$);
      expect(regionEnabled).toBe(true);

      session.region$.next(Region.CENTRAL_COAST);
      regionEnabled = await firstValueFrom(service.drawRegionEnabled$);
      expect(regionEnabled).toBe(false);
    });
  });
});
