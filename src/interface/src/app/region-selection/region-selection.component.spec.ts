import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Region } from '../types';

import { RegionSelectionComponent } from './region-selection.component';

describe('RegionSelectionComponent', () => {
  let component: RegionSelectionComponent;
  let fixture: ComponentFixture<RegionSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegionSelectionComponent ]
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
    const sierraNevadaElement: any = element.querySelectorAll('.region')[0];

    sierraNevadaElement.click();

    expect(component.selectedRegion).toEqual(Region.SIERRA_NEVADA);
  });

  it('should disable unavailable regions', () => {
    const element: HTMLElement = fixture.nativeElement;
    const regionElement: any = element.querySelectorAll('.region')[2];

    regionElement.click();

    expect(component.selectedRegion).toEqual(undefined);
  });
});
