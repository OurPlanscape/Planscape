import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScenarioFailureComponent } from './scenario-failure.component';
import { MatIconModule } from '@angular/material/icon';
import { MockProvider } from 'ng-mocks';
import { ScenarioService } from '@services';

describe('ScenarioFailureComponent', () => {
  let component: ScenarioFailureComponent;
  let fixture: ComponentFixture<ScenarioFailureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ScenarioFailureComponent],
      imports: [MatIconModule],
      providers: [MockProvider(ScenarioService)],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioFailureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
