import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenariosTableListComponent } from './scenarios-table-list.component';
import { FeaturesModule } from '../../../features/features.module';

describe('ScenariosTableListComponent', () => {
  let component: ScenariosTableListComponent;
  let fixture: ComponentFixture<ScenariosTableListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ScenariosTableListComponent],
      imports: [FeaturesModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenariosTableListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
