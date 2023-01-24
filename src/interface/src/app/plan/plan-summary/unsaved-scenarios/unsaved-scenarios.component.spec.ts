import { MaterialModule } from 'src/app/material/material.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnsavedScenariosComponent } from './unsaved-scenarios.component';

describe('UnsavedScenariosComponent', () => {
  let component: UnsavedScenariosComponent;
  let fixture: ComponentFixture<UnsavedScenariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ MaterialModule ],
      declarations: [ UnsavedScenariosComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnsavedScenariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
