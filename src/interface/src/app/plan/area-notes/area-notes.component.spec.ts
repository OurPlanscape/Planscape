import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaNotesComponent } from './area-notes.component';

describe('AreaNotesComponent', () => {
  let component: AreaNotesComponent;
  let fixture: ComponentFixture<AreaNotesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AreaNotesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AreaNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
