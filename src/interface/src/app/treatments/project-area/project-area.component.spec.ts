import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAreaComponent } from './project-area.component';

describe('ProjectAreaComponent', () => {
  let component: ProjectAreaComponent;
  let fixture: ComponentFixture<ProjectAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectAreaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
