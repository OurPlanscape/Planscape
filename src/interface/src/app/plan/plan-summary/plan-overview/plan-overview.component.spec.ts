import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { LegacyMaterialModule } from '../../../material/legacy-material.module';
import { PlanOverviewComponent } from './plan-overview.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('PlanOverviewComponent', () => {
  let component: PlanOverviewComponent;
  let fixture: ComponentFixture<PlanOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        LegacyMaterialModule,
        RouterTestingModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [PlanOverviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
