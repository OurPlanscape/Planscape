import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DirectImpactsMapComponent } from './direct-impacts-map.component';

describe('DirectImpactsMapComponent', () => {
  let component: DirectImpactsMapComponent;
  let fixture: ComponentFixture<DirectImpactsMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectImpactsMapComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DirectImpactsMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
