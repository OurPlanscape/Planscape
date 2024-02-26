import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenariosTableListComponent } from './scenarios-table-list.component';

describe('ScenariosTableListComponent', () => {
  let component: ScenariosTableListComponent;
  let fixture: ComponentFixture<ScenariosTableListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScenariosTableListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScenariosTableListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
