import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LegacyMaterialModule } from '../../material/legacy-material.module';

import { ProjectCardComponent } from './project-card.component';

describe('ProjectCardComponent', () => {
  let component: ProjectCardComponent;
  let fixture: ComponentFixture<ProjectCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, LegacyMaterialModule],
      declarations: [ProjectCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.features = [];
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('should filter projects', () => {
    const fakeGeometry: GeoJSON.Geometry = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 1],
        ],
      ],
    };
    const fakeBoundary: GeoJSON.Feature<GeoJSON.Polygon, any> = {
      type: 'Feature',
      geometry: fakeGeometry,
      properties: {
        shape_name: 'test_boundary',
      },
    };
    const fakeProject: GeoJSON.Feature<GeoJSON.Polygon, any> = {
      type: 'Feature',
      geometry: fakeGeometry,
      properties: {
        PROJECT_NAME: 'test_project',
      },
    };
    component.features = [fakeBoundary, fakeProject];
    fixture.detectChanges();

    expect(component.projects.length).toEqual(1);
    expect(component.projects).toContain(fakeProject.properties);
  });
});
