import { MaterialModule } from 'src/app/material/material.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { SavedScenariosComponent } from './saved-scenarios.component';

describe('SavedScenariosComponent', () => {
  let component: SavedScenariosComponent;
  let fixture: ComponentFixture<SavedScenariosComponent>;

  beforeEach(async () => {
    const fakeRoute = jasmine.createSpyObj(
      'ActivatedRoute',
      {},
      {
        snapshot: {
          paramMap: convertToParamMap({ id: '24' }),
        },
      }
    );

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MaterialModule],
      declarations: [SavedScenariosComponent],
      providers: [
        { provide: ActivatedRoute, useValue: fakeRoute },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SavedScenariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('createScenario should emit event', () => {
    spyOn(component.createScenarioEvent, 'emit');

    component.createScenario();

    expect(component.createScenarioEvent.emit).toHaveBeenCalled();
  });
});
