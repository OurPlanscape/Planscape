import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListCardComponent } from './list-card.component';

describe('ListCardComponent', () => {
  let component: ListCardComponent;
  let fixture: ComponentFixture<ListCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListCardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ListCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
