import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioResultsComponent } from './scenario-results.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { FileSaverService, ScenarioService } from '@services';
import { MockComponent, MockProvider } from 'ng-mocks';
import { ProjectAreasMetricsComponent } from '../project-areas-metrics/project-areas-metrics.component';
import { ProjectAreasComponent } from '../project-areas/project-areas.component';
import { of } from 'rxjs';

describe('ScenarioResultsComponent', () => {
  let component: ScenarioResultsComponent;
  let fixture: ComponentFixture<ScenarioResultsComponent>;
  let scenarioService: ScenarioService;
  let fileSaverService: FileSaverService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ScenarioResultsComponent,
        MockComponent(ProjectAreasMetricsComponent),
        MockComponent(ProjectAreasComponent),
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [HttpClientTestingModule],
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
    component.scenarioId = '1234';
    component.scenarioName = 'A\\great.scenario/result';

    scenarioService = TestBed.inject(ScenarioService);
    fileSaverService = TestBed.inject(FileSaverService);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('downloading files', () => {
    beforeEach(() => {
      spyOn(scenarioService, 'downloadCsvData').and.callThrough();
      spyOn(scenarioService, 'downloadShapeFiles').and.callThrough();
      spyOn(fileSaverService, 'saveAs');
    });

    it('should download csv file with scenario name', () => {
      const button = fixture.debugElement.query(
        By.css('[data-id="downloadCsv"]')
      );
      button.nativeElement.click();

      expect(scenarioService.downloadCsvData).toHaveBeenCalledWith('1234');
      expect(fileSaverService.saveAs).toHaveBeenCalledWith(
        jasmine.any(Blob),
        'A_great_scenario_result.zip'
      );
    });
    it('should download shapefile file with scenario name', () => {
      const button = fixture.debugElement.query(
        By.css('[data-id="downloadShapeFiles"]')
      );
      button.nativeElement.click();
      expect(scenarioService.downloadShapeFiles).toHaveBeenCalledWith('1234');
      expect(fileSaverService.saveAs).toHaveBeenCalledWith(
        jasmine.any(Blob),
        'A_great_scenario_result_shp.zip'
      );
    });
  });
});
