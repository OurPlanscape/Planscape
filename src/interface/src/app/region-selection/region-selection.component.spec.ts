import { BehaviorSubject } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Region } from '../types';
import { RegionSelectionComponent } from './region-selection.component';
import { SessionService } from './../session.service';

// selector names for getting DOM elements
enum CssSelector {
  RegionButton = '.region-button',
}

describe('RegionSelectionComponent', () => {
  let component: RegionSelectionComponent;
  let fixture: ComponentFixture<RegionSelectionComponent>;
  let mockSessionService: Partial<SessionService>;

  beforeEach(async () => {
    mockSessionService = {
      region$: new BehaviorSubject<Region|null>(null),
      setRegion: () => {},
    };

    await TestBed.configureTestingModule({
      declarations: [ RegionSelectionComponent ],
      providers: [
        {provide: SessionService, useValue: mockSessionService},
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegionSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set available region', () => {
    const element: HTMLElement = fixture.nativeElement;
    const sierraNevadaElement: any = element.querySelectorAll(CssSelector.RegionButton)[0];
    const setRegionSpy = spyOn<any>(mockSessionService, 'setRegion');

    sierraNevadaElement.click();

    expect(setRegionSpy).toHaveBeenCalledWith(Region.SIERRA_NEVADA);
  });

  it('should disable unavailable regions', () => {
    const setRegionSpy = spyOn<any>(mockSessionService, 'setRegion');
    const element: HTMLElement = fixture.nativeElement;
    const regionElement: any = element.querySelectorAll(CssSelector.RegionButton)[2];

    regionElement.click();

    expect(setRegionSpy).not.toHaveBeenCalled();
  });
});
