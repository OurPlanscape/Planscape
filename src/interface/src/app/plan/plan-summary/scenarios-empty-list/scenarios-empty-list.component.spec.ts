import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenariosEmptyListComponent } from './scenarios-empty-list.component';
import { MatDialogModule } from '@angular/material/dialog';

describe('ScenariosEmptyListComponent', () => {
  let component: ScenariosEmptyListComponent;
  let fixture: ComponentFixture<ScenariosEmptyListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatDialogModule, ScenariosEmptyListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenariosEmptyListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
