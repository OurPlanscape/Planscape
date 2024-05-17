import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { LegacyMaterialModule } from '../../../material/legacy-material.module';
import { LayerInfoCardComponent } from './../../layer-info-card/layer-info-card.component';
import { ConditionTreeComponent } from './condition-tree.component';
import { defaultMapConfig } from '../../map.helper';

describe('ConditionTreeComponent', () => {
  let component: ConditionTreeComponent;
  let fixture: ComponentFixture<ConditionTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, LegacyMaterialModule, NoopAnimationsModule],
      declarations: [ConditionTreeComponent, LayerInfoCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConditionTreeComponent);
    component = fixture.componentInstance;

    component.conditionsConfig$ = of({});
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
      const nodeWithChildren = component.treeControl.dataNodes[0];
      const nodeWithoutChildren = component.treeControl.dataNodes[4];

      component.onSelect(nodeWithChildren);

      component.treeControl
        .getDescendants(nodeWithChildren)
        .forEach((descendant) => {
          expect(descendant.styleDisabled).toBeTrue();
        });
      expect(nodeWithChildren.styleDisabled).toBeFalse();
      expect(nodeWithoutChildren.styleDisabled).toBeFalse();

      component.onSelect(nodeWithoutChildren);

      component.treeControl.dataNodes.forEach((node) => {
        expect(node.styleDisabled).toBeFalse();
      });
    });
    it('styles ancestors of a selected node and unstyles all other nodes', () => {
      const childNode = component.treeControl.dataNodes[1];
      const parentNode = component.treeControl.dataNodes[0];

      component.onSelect(childNode);

      expect(parentNode.styleDescendantSelected).toBeTrue();

      component.treeControl.dataNodes
        .filter((node) => {
          return node !== childNode && node !== parentNode;
        })
        .forEach((node) => {
          expect(node.styleDisabled).toBeFalse();
          expect(node.styleDescendantSelected).toBeFalse();
        });
    });
  });
});
