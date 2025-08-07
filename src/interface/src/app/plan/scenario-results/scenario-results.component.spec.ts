import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioResultsComponent } from './scenario-results.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FileSaverService, ScenarioService } from '@services';
import { MockComponent, MockProvider } from 'ng-mocks';
import { ProjectAreasComponent } from '../project-areas/project-areas.component';
import { of } from 'rxjs';
import { FeaturesModule } from '../../features/features.module';

describe('ScenarioResultsComponent', () => {
  let component: ScenarioResultsComponent;
  let fixture: ComponentFixture<ScenarioResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ScenarioResultsComponent,
        MockComponent(ProjectAreasComponent),
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [HttpClientTestingModule, FeaturesModule],
      providers: [
        MockProvider(ScenarioService, {
          downloadCsvData: () => of(true),
          downloadShapeFiles: () => of(true),
        }),
        MockProvider(FileSaverService),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioResultsComponent);
    component = fixture.componentInstance;
    component.scenarioId = 1234;
    component.scenarioName = 'A\\great.scenario/result';

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
