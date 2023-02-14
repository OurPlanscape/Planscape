import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { defaultMapConfig } from 'src/app/types';

import { ConditionTreeComponent } from './condition-tree.component';

describe('ConditionTreeComponent', () => {
  let component: ConditionTreeComponent;
  let fixture: ComponentFixture<ConditionTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConditionTreeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConditionTreeComponent);
    component = fixture.componentInstance;

    component.conditionsData$ = of([
      {
        children: [{}, {}, {}],
      },
      {
        children: [],
      },
    ]);
    component.map = {
      id: 'map1',
      name: 'Map 1',
      config: defaultMapConfig(),
    };

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('condition tree', () => {
    beforeEach(() => {
      component.conditionDataSource.data = [
        {
          children: [{}, {}, {}],
        },
        {
          children: [],
        },
      ];
    });

    it('styles children of a selected node and unstyles all other nodes', () => {
      const nodeWithChildren = component.conditionDataSource.data[0];
      const nodeWithoutChildren = component.conditionDataSource.data[1];

      component.onSelect(nodeWithChildren);

      nodeWithChildren.children?.forEach((child) => {
        expect(child.styleDisabled).toBeTrue();
      });
      expect(nodeWithChildren.styleDisabled).toBeFalse();
      expect(nodeWithoutChildren.styleDisabled).toBeFalse();

      component.onSelect(nodeWithoutChildren);

      component.conditionDataSource.data.forEach((node) => {
        expect(node.styleDisabled).toBeFalse();
        node.children?.forEach((child) => {
          expect(child.styleDisabled).toBeFalse();
        });
      });
    });
  });
});
