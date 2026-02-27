import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { KeyValuePipe, NgClass, NgForOf, NgIf, NgStyle } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ButtonComponent } from '..';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SimpleChanges } from '@angular/core';

interface Item {
  id: number;
  name: string;
}

/** Displays a list of items, with the option to select and or toggle view on each.
 *
 * Items can be of any type as long as they match a basic `Item` interface:
 *
 * ```ts
 * interface Item {
 *   id: number;
 *   name: string;
 * }
 * ```
 *
 * We can also specify an optional `groupBy` key, which points to an attribute in each `Item`
 * which can be used to organize results. For example, `dataset.name` to organize layers.
 *
 * To provide where the component should look for the legend color, use `colorPath`
 * and provide a string with the path (example `nested.styles.color` or even `nested[0].styles.color`)
 *
 * Has `selectedItemsChanged` and `viewedItemsChanged` event emitters to listen for to changes.
 *
 * */
@Component({
  selector: 'sg-selectable-list',
  standalone: true,
  imports: [
    ButtonComponent,
    KeyValuePipe,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NgClass,
    NgForOf,
    NgIf,
    NgStyle,
  ],
  templateUrl: './selectable-list.component.html',
  styleUrl: './selectable-list.component.scss',
})
export class SelectableListComponent<T extends Item> implements OnChanges {
  /** @ignore - default legend color */
  defaultColor = 'transparent';
  defaultOutlineColor = 'transparent';

  /** all the items in the list */
  @Input() items: T[] = [];

  /** path to an attribute on an item that can be
   *  used to group data, for instance 'dataset.name' */
  @Input() groupBy?: string;

  /** the set of data to iterate through in the template.
   * If there's no groupBy input, then we just consider it all one group */
  groupedData: Record<string, T[]> = {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes['items']) {
      this.recalculateGroups();
    }
  }

  private recalculateGroups() {
    const data = this.items || [];
    if (!this.groupBy) {
      this.groupedData = { '': data };
      return;
    }

    this.groupedData = data.reduce(
      (acc, item) => {
        const key = this.resolvePath(item, this.groupBy!) || '';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, T[]>
    );
  }

  private resolvePath(obj: any, path: string): string {
    if (!obj || !path) return '';
    return path.split('.').reduce((prev, curr) => prev?.[curr], obj) || '';
  }
  /** the selected items, optional */
  @Input() selectedItems: T[] = [];

  /** the viewed items, optional */
  @Input() viewedItems: T[] = [];

  @Input() loadingItems: string[] = [];

  /** the property or path to look up color for the legend */
  @Input() colorPath?: string;
  @Input() outlineColorPath?: string;

  /** Emits when an item is selected */
  @Output() selectedItemsChanged = new EventEmitter<T[]>();

  /** Emits when an item is viewed */
  @Output() viewedItemsChanged = new EventEmitter<T[]>();

  /** @ignore */
  selectItem(item: T) {
    const exists = this.selectedItems.some((i) => i.id === item.id);

    this.selectedItems = exists
      ? this.selectedItems.filter((i) => i.id !== item.id)
      : [...this.selectedItems, item];

    this.selectedItemsChanged.emit(this.selectedItems);
  }

  /** @ignore */
  viewItem(item: T) {
    const exists = this.viewedItems.some((i) => i.id === item.id);

    this.viewedItems = exists
      ? this.viewedItems.filter((i) => i.id !== item.id)
      : [...this.viewedItems, item];

    this.viewedItemsChanged.emit(this.viewedItems);
  }

  /** @ignore */
  isSelected(item: T) {
    return this.selectedItems.some((i) => i.id === item.id);
  }

  /** @ignore */
  isViewed(item: T) {
    return this.viewedItems.some((i) => i.id === item.id);
  }

  /** @ignore */
  isLoading(item: T) {
    return this.loadingItems.some((i) => i === `source_${item.id}`);
  }

  /** @ignore */
  getColor(item: any): string {
    if (!this.colorPath) return this.defaultColor;

    const tokens = this.tokenizePath(this.colorPath);
    const val = tokens.reduce<any>((acc, key) => acc?.[key as any], item);

    if (val == null) {
      console.error(
        `SelectableListComponent: colorPath "${this.colorPath}" not found`,
        item
      );
      return this.defaultColor;
    }
    return String(val);
  }

  getOutlineColor(item: any): string {
    if (!this.outlineColorPath) return this.colorPath || this.defaultColor;

    const tokens = this.tokenizePath(this.outlineColorPath);
    const val = tokens.reduce<any>((acc, key) => acc?.[key as any], item);

    if (val == null) {
      console.error(
        `SelectableListComponent: outlineColorPath "${this.outlineColorPath}" not found`,
        item
      );
      return this.defaultColor;
    }
    return String(val);
  }

  /** @ignore supports: "color", "styles.color", "nested[0].properties.color" */
  private tokenizePath(path: string): Array<string | number> {
    const re = /[^.[\]]+|\[(\d+)\]/g; // words or [digits]
    const out: Array<string | number> = [];
    let m: RegExpExecArray | null;

    while ((m = re.exec(path))) {
      out.push(m[1] !== undefined ? Number(m[1]) : m[0]);
    }
    return out;
  }
}
