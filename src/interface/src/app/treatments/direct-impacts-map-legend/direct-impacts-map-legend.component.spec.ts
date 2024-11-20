import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DirectImpactsMapLegendComponent } from './direct-impacts-map-legend.component';

describe('DirectImpactsMapLegendComponent', () => {
  let component: DirectImpactsMapLegendComponent;
  let fixture: ComponentFixture<DirectImpactsMapLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectImpactsMapLegendComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DirectImpactsMapLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
