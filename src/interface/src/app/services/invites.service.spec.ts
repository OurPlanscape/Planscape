import { TestBed } from '@angular/core/testing';
import { InvitesService } from './invites.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('InvitesService', () => {
  let service: InvitesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(InvitesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
