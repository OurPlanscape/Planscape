import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScenarioConfigOverlayComponent } from './scenario-config-overlay.component';
import { MockProvider } from 'ng-mocks';
import { FeatureService } from '@features/feature.service';

describe('ScenarioConfigOverlayComponent', () => {
  let component: ScenarioConfigOverlayComponent;
  let fixture: ComponentFixture<ScenarioConfigOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ScenarioConfigOverlayComponent],
      providers: [MockProvider(FeatureService)],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioConfigOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
