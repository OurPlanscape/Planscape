import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaNotesComponent } from './area-notes.component';
import { MockProvider } from 'ng-mocks';
import { PlanNotesService } from '@services/plan-notes.service';
import { of } from 'rxjs';

describe('AreaNotesComponent', () => {
  let component: AreaNotesComponent;
  let fixture: ComponentFixture<AreaNotesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AreaNotesComponent],
      providers: [
        MockProvider(PlanNotesService, {
          getNotes: () => of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AreaNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
