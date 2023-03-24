import { SimpleChange, SimpleChanges } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { AuthService } from 'src/app/services';
import { User } from 'src/app/types';

import { OutcomeComponent } from './outcome.component';

describe('OutcomeComponent', () => {
  let component: OutcomeComponent;
  let fixture: ComponentFixture<OutcomeComponent>;
  let fakeScenario: any;
  let fakeAuthService: AuthService;
  let loggedInStatus$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    loggedInStatus$ = new BehaviorSubject(false);
    fakeAuthService = jasmine.createSpyObj(
      'AuthService',
      {},
      {
        loggedInUser$: new BehaviorSubject<User | null>(null),
      }
    );
    const fakeGeoJson: GeoJSON.GeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [10, 20],
                  [10, 30],
                  [15, 15],
                ],
              ],
            ],
          },
          properties: {
            shape_name: 'Test',
          },
        },
      ],
    };
    fakeScenario = {
      id: '1',
      notes: 'bee happy',
      projectAreas: [{
          id: 10,
          projectArea: fakeGeoJson,
        },
        {
          id: 11,
          projectArea: fakeGeoJson,
        },
        {
          id: 12,
          projectArea: fakeGeoJson,
        },
      ],
    }
    await TestBed.configureTestingModule({
      imports: [ BrowserAnimationsModule, MaterialModule, ReactiveFormsModule],
      declarations: [ OutcomeComponent ],
      providers: [ FormBuilder,
        {
          provide: AuthService,
          useValue: fakeAuthService,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(OutcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.scenario = fakeScenario;
    const changesObj: SimpleChanges = {
      scenario: new SimpleChange(null, fakeScenario, true),
    };
    component.ngOnChanges(changesObj);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set the notes when scenario is loaded', () => {
    expect(component.scenarioNotes.get('notes')?.value).toEqual('bee happy');
  });

  it('should calculate the total acres treated', () => {
    expect(component.totalAcresTreated).toEqual(207878832);
  });
});
