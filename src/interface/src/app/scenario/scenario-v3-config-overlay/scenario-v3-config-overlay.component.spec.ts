import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioV3ConfigOverlayComponent } from './scenario-v3-config-overlay.component';

describe('ScenarioV3ConfigOverlayComponent', () => {
  let component: ScenarioV3ConfigOverlayComponent;
  let fixture: ComponentFixture<ScenarioV3ConfigOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioV3ConfigOverlayComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ScenarioV3ConfigOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
