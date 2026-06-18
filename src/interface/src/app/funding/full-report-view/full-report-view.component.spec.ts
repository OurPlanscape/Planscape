import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullReportViewComponent } from './full-report-view.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MockProvider } from 'ng-mocks';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { ScenarioState } from '@scenario/scenario.state';
import { MOCK_SCENARIO } from '@app/services/mocks';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';

describe('FullReportViewComponent', () => {
  let component: FullReportViewComponent;
  let fixture: ComponentFixture<FullReportViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        FullReportViewComponent,
        HttpClientTestingModule,
        MatSnackBarModule,
      ],
      providers: [
        MockProvider(DataLayersStateService, {
          dataTree$: of(null),
          paths$: of([]),
        }),
        MockProvider(MapConfigState, { selectedProjectAreas$: of([]) }),
        MockProvider(MapConfigService),
        MockProvider(ScenarioState, {
          currentScenarioId$: new BehaviorSubject<number | null>(null),
          currentScenario$: new BehaviorSubject(MOCK_SCENARIO),
        }),
        { provide: ActivatedRoute, useValue: { firstChild: {} } },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FullReportViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
