import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotesExpandedPanelComponent } from './notes-expanded-panel.component';

describe('NotesExpandedPanelComponent', () => {
  let component: NotesExpandedPanelComponent;
  let fixture: ComponentFixture<NotesExpandedPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotesExpandedPanelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NotesExpandedPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
