import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAreaScenariosListComponent } from './project-area-scenarios-list.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ProjectAreaScenariosListComponent', () => {
  let component: ProjectAreaScenariosListComponent;
  let fixture: ComponentFixture<ProjectAreaScenariosListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ProjectAreaScenariosListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectAreaScenariosListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
