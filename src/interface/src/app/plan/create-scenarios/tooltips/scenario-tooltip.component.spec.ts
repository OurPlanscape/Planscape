import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioTooltipComponent } from './scenario-tooltip.component';
import { LegacyMaterialModule } from '../../../material/legacy-material.module';

describe('TooltipsComponent', () => {
  let component: ScenarioTooltipComponent;
  let fixture: ComponentFixture<ScenarioTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ScenarioTooltipComponent],
      imports: [LegacyMaterialModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioTooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
