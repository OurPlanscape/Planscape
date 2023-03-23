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

    fakeScenario = {
      id: '1',
      notes: 'bee happy',
      projectAreas: [{
          id: 10,
          estimatedAreaTreated: 2000,
        },
        {
          id: 11,
          estimatedAreaTreated: 5000,
        },
        {
          id: 12,
          estimatedAreaTreated: 6000,
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
    expect(component.totalAcresTreated).toEqual(13000);
  });
});
