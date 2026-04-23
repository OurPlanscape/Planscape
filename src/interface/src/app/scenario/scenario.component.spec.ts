import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioComponent } from './scenario.component';
import { MockComponents, MockDeclarations } from 'ng-mocks';
import { ScenarioMapComponent } from '@maplibre-map/scenario-map/scenario-map.component';

import { SharedModule } from '@shared';
import { RouterTestingModule } from '@angular/router/testing';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';

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
