import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutsideRegionDialogComponent } from './outside-region-dialog.component';

describe('OutsideRegionDialogComponent', () => {
  let component: OutsideRegionDialogComponent;
  let fixture: ComponentFixture<OutsideRegionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OutsideRegionDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OutsideRegionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
