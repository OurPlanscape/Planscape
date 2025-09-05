import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioSetupModalComponent } from './scenario-setup-modal.component';

describe('ScenarioSetupModalComponent', () => {
  let component: ScenarioSetupModalComponent;
  let fixture: ComponentFixture<ScenarioSetupModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioSetupModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ScenarioSetupModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
