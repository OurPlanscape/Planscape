import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioToolsComponent } from './scenario-tools.component';
import { FeaturesModule } from '@features/features.module';

describe('ScenarioToolsComponent', () => {
  let component: ScenarioToolsComponent;
  let fixture: ComponentFixture<ScenarioToolsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioToolsComponent, FeaturesModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioToolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
