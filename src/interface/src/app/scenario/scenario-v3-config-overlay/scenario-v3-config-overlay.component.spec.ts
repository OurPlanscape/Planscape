import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScenarioV3ConfigOverlayComponent } from '@app/scenario/scenario-v3-config-overlay/scenario-v3-config-overlay.component';
import { MockProvider } from 'ng-mocks';
import { FeatureService } from '@app/features/feature.service';

describe('ScenarioV3ConfigOverlayComponent', () => {
  let component: ScenarioV3ConfigOverlayComponent;
  let fixture: ComponentFixture<ScenarioV3ConfigOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ScenarioV3ConfigOverlayComponent],
      providers: [MockProvider(FeatureService)],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioV3ConfigOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
