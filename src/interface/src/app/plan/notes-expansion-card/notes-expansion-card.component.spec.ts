import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotesExpansionCardComponent } from './notes-expansion-card.component';

describe('NotesExpansionCardComponent', () => {
  let component: NotesExpansionCardComponent;
  let fixture: ComponentFixture<NotesExpansionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotesExpansionCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NotesExpansionCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
