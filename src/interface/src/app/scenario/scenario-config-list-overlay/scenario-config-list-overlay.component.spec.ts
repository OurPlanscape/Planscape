import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScenarioConfigListOverlayComponent } from './scenario-config-list-overlay.component';
import { MockProvider } from 'ng-mocks';
import { FeatureService } from '@features/feature.service';

describe('ScenarioConfigOverlayComponent', () => {
  let component: ScenarioConfigListOverlayComponent;
  let fixture: ComponentFixture<ScenarioConfigListOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ScenarioConfigListOverlayComponent],
      providers: [MockProvider(FeatureService)],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioConfigListOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
