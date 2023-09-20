import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectAreasComponent } from './project-areas.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CurrencyInKPipe } from '../../pipes/currency-in-k.pipe';
import { CurrencyPipe } from '@angular/common';

describe('ProjectAreasComponent', () => {
  let component: ProjectAreasComponent;
  let fixture: ComponentFixture<ProjectAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [ProjectAreasComponent, CurrencyInKPipe],
      providers: [CurrencyPipe],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectAreasComponent);
    component = fixture.componentInstance;
    component.areas = [
      { id: 1, acres: 123, percentTotal: 12, estimatedCost: 1212, score: 12 },
    ];
    component.total = {
      acres: 983,
      percentTotal: 32.2,
      estimatedCost: 43200,
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
