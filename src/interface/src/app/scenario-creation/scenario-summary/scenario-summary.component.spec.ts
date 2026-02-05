import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScenarioSummaryComponent } from './scenario-summary.component';
import { MockDeclaration } from 'ng-mocks';
import { SectionComponent } from '@styleguide';

describe('ScenarioSummaryComponent', () => {
  let component: ScenarioSummaryComponent;
  let fixture: ComponentFixture<ScenarioSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MockDeclaration(SectionComponent)],
      imports: [ScenarioSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
