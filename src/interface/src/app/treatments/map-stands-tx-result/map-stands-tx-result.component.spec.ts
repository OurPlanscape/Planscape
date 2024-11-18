import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapStandsTxResultComponent } from './map-stands-tx-result.component';

describe('MapStandsTxResultComponent', () => {
  let component: MapStandsTxResultComponent;
  let fixture: ComponentFixture<MapStandsTxResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapStandsTxResultComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapStandsTxResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
