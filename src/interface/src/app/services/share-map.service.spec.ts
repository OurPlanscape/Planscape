import { TestBed } from '@angular/core/testing';

import { ShareMapService } from './share-map.service';
import { firstValueFrom, of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { WINDOW } from './window.service';
import { Region } from '@types';

describe('ShareMapService', () => {
  let service: ShareMapService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: WINDOW,
          useValue: {
            location: {
              origin: 'http://testingurl.com',
            },
          },
        },
      ],
    });
    service = TestBed.inject(ShareMapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSharedLink', () => {
    it('should return a link with the right url', async () => {
      spyOn(service, 'createShareLink').and.returnValue(
        of({
          created_at: '',
          link_code: 'superlink',
          updated_at: '',
          view_state: {
            mapConfig: [],
            region: Region.SIERRA_NEVADA,
            mapViewOptions: null,
          },
        })
      );
      const link = await firstValueFrom(
        service.getSharedLink({
          mapConfig: [],
          region: Region.SIERRA_NEVADA,
          mapViewOptions: null,
        })
      );
      expect(link).toBe('http://testingurl.com/map?link=superlink');
    });
  });
});
