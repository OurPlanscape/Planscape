import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectableListComponent } from './selectable-list.component';

describe('SelectableListComponent', () => {
  let component: SelectableListComponent;
  let fixture: ComponentFixture<SelectableListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectableListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SelectableListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
