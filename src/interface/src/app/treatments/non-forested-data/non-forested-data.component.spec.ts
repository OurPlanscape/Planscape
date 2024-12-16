import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NonForestedDataComponent } from './non-forested-data.component';

describe('NonForestedDataComponent', () => {
  let component: NonForestedDataComponent;
  let fixture: ComponentFixture<NonForestedDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NonForestedDataComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NonForestedDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
