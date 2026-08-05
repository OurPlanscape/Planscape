import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAreaStandsComponent } from './project-area-stands.component';

describe('ProjectAreaStandsComponent', () => {
  let component: ProjectAreaStandsComponent;
  let fixture: ComponentFixture<ProjectAreaStandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectAreaStandsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProjectAreaStandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
