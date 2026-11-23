import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataSetComponent } from './data-set.component';
import { MockProvider } from 'ng-mocks';
import { DataLayersStateService } from '../data-layers.state.service';
import { of } from 'rxjs';

describe('DataSetComponent', () => {
  let component: DataSetComponent;
  let fixture: ComponentFixture<DataSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataSetComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          viewedDataLayer$: of(null),
          selectedDataLayers$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DataSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('category icon', () => {
    const icon = () =>
      fixture.nativeElement.querySelector('.category-icon')?.textContent.trim();

    it('is hidden when the row is not a category', () => {
      expect(icon()).toBeUndefined();
    });

    it('shows the icon from the category', () => {
      fixture.componentRef.setInput('categoryIcon', 'local_fire_department');
      fixture.detectChanges();
      expect(icon()).toBe('local_fire_department');
    });

    it('falls back to the generic category icon', () => {
      fixture.componentRef.setInput('categoryIcon', null);
      fixture.detectChanges();
      expect(icon()).toBe('category');
    });
  });
});
