import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAreasEmptyListComponent } from './project-areas-empty-list.component';
import { MatDialogModule } from '@angular/material/dialog';

describe('ProjectAreasEmptyListComponent', () => {
  let component: ProjectAreasEmptyListComponent;
  let fixture: ComponentFixture<ProjectAreasEmptyListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatDialogModule, ProjectAreasEmptyListComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectAreasEmptyListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
