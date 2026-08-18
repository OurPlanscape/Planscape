import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreatedStandsToggleComponent } from './treated-stands-toggle.component';
import { MockProvider } from 'ng-mocks';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';

describe('TreatedStandsToggleComponent', () => {
  let component: TreatedStandsToggleComponent;
  let fixture: ComponentFixture<TreatedStandsToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatedStandsToggleComponent],
      providers: [MockProvider(NewScenarioState)],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatedStandsToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
