import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegionDropdownComponent } from './region-dropdown.component';
import { By } from '@angular/platform-browser';

import { HttpClientTestingModule } from '@angular/common/http/testing';

import { BehaviorSubject } from 'rxjs';
import { AuthService, SessionService } from '@services';
import { Region, User } from '@types';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { FeaturesModule } from '../../features/features.module';

describe('RegionDropdownComponent', () => {
  let component: RegionDropdownComponent;
  let fixture: ComponentFixture<RegionDropdownComponent>;
  let mockSessionService: Partial<SessionService>;
  let mockAuthService: Partial<AuthService>;

  beforeEach(async () => {
    mockAuthService = {
      loggedInUser$: new BehaviorSubject<User | null | undefined>(null),
    };
    mockSessionService = {
      region$: new BehaviorSubject<Region | null>(null),
      setRegion: () => {},
    };
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, LegacyMaterialModule, FeaturesModule],
      declarations: [RegionDropdownComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegionDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Region selection dropdown', () => {
    it('should set the region', () => {
      const setRegionSpy = spyOn<any>(mockSessionService, 'setRegion');
      const regionDropdown = fixture.debugElement.query(
        By.css('select')
      ).nativeElement;

      regionDropdown.value = regionDropdown.options[0].value;
      regionDropdown.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(setRegionSpy).toHaveBeenCalledOnceWith(regionDropdown.value);
    });
  });
});
