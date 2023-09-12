import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapConfigSummaryComponent } from './map-config-summary.component';

describe('MapConfigSummaryComponent', () => {
  let component: MapConfigSummaryComponent;
  let fixture: ComponentFixture<MapConfigSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MapConfigSummaryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapConfigSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
