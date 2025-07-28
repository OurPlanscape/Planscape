import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioCreationComponent } from './scenario-creation.component';
import { MockDeclarations } from 'ng-mocks';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ScenarioCreationComponent', () => {
  let component: ScenarioCreationComponent;
  let fixture: ComponentFixture<ScenarioCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioCreationComponent, NoopAnimationsModule],
      declarations: [MockDeclarations(DataLayersComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
