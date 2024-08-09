import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioCreateConfirmationComponent } from './scenario-create-confirmation.component';

describe('ScenarioCreateConfirmationComponent', () => {
  let component: ScenarioCreateConfirmationComponent;
  let fixture: ComponentFixture<ScenarioCreateConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioCreateConfirmationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioCreateConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
