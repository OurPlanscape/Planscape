import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandSizeComponent } from './stand-size.component';

describe('StandSizeComponent', () => {
  let component: StandSizeComponent;
  let fixture: ComponentFixture<StandSizeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandSizeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StandSizeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
