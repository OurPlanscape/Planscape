import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioTooltipComponent } from './scenario-tooltip.component';

describe('TooltipsComponent', () => {
  let component: ScenarioTooltipComponent;
  let fixture: ComponentFixture<ScenarioTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ScenarioTooltipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioTooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
