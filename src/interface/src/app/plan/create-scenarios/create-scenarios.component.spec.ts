import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { PlanModule } from '../plan.module';
import { CreateScenariosComponent } from './create-scenarios.component';

describe('CreateScenariosComponent', () => {
  let component: CreateScenariosComponent;
  let fixture: ComponentFixture<CreateScenariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, HttpClientTestingModule, PlanModule],
      declarations: [CreateScenariosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateScenariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
