import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioComponent } from '@app/scenario/scenario.component';
import { MockComponents, MockDeclarations } from 'ng-mocks';
import { ScenarioMapComponent } from '@app/maplibre-map/scenario-map/scenario-map.component';

import { NavBarComponent, SharedModule } from '@shared';
import { RouterTestingModule } from '@angular/router/testing';

describe('ScenarioComponent', () => {
  let component: ScenarioComponent;
  let fixture: ComponentFixture<ScenarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        MockComponents(ScenarioMapComponent),
        MockDeclarations(NavBarComponent),
      ],
      imports: [ScenarioComponent, RouterTestingModule, SharedModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
