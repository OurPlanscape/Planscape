import { DataLayer } from '../../types/data-sets';
import { buildPathTree, TreeNode } from './tree-node';

describe('buildPathTree', () => {
  it('should build the correct hierarchy for a typical set of DataLayer items', () => {
    const items: DataLayer[] = [
      {
        id: 1,
        name: 'Item A1',
        path: ['CategoryA', 'SubcategoryA1'],
      } as DataLayer,
      {
        id: 2,
        name: 'Item A2',
        path: ['CategoryA', 'SubcategoryA2'],
      } as DataLayer,
      {
        id: 3,
        name: 'Item B1',
        path: ['CategoryB', 'SubcategoryB1'],
      } as DataLayer,
      {
        id: 4,
        name: 'Item B2',
        path: ['CategoryB', 'SubcategoryB1'],
      } as DataLayer,
      {
        id: 5,
        name: 'Item B3',
        path: ['CategoryB', 'SubcategoryB2'],
      } as DataLayer,
    ];

    const result = buildPathTree(items);

    // There should be 2 top-level categories: CategoryA and CategoryB
    expect(result.length).toEqual(2);

    const categoryA = result.find(
      (node: TreeNode) => node.name === 'CategoryA'
    );
    const categoryB = result.find(
      (node: TreeNode) => node.name === 'CategoryB'
    );
    expect(categoryA).toBeDefined();
    expect(categoryB).toBeDefined();

    // CategoryA should have two subcategories: SubcategoryA1 and SubcategoryA2
    expect(categoryA!.children).toBeDefined();
    expect(categoryA!.children!.length).toEqual(2);

    const subcategoryA1 = categoryA!.children!.find(
      (node: TreeNode) => node.name === 'SubcategoryA1'
    );
    const subcategoryA2 = categoryA!.children!.find(
      (node: TreeNode) => node.name === 'SubcategoryA2'
    );
    expect(subcategoryA1).toBeDefined();
    expect(subcategoryA2).toBeDefined();

    // CategoryB should have two subcategories: SubcategoryB1 and SubcategoryB2
    expect(categoryB!.children).toBeDefined();
    expect(categoryB!.children!.length).toEqual(2);

    const subcategoryB1 = categoryB!.children!.find(
      (node: TreeNode) => node.name === 'SubcategoryB1'
    );
    const subcategoryB2 = categoryB!.children!.find(
      (node: TreeNode) => node.name === 'SubcategoryB2'
    );
    expect(subcategoryB1).toBeDefined();
    expect(subcategoryB2).toBeDefined();

    // SubcategoryA1 should have exactly one leaf item: Item A1
    expect(subcategoryA1!.children).toBeDefined();
    expect(subcategoryA1!.children!.length).toEqual(1);
    expect(subcategoryA1!.children![0].item!.name).toEqual('Item A1');

    // SubcategoryA2 should have exactly one leaf item: Item A2
    expect(subcategoryA2!.children).toBeDefined();
    expect(subcategoryA2!.children!.length).toEqual(1);
    expect(subcategoryA2!.children![0].item!.name).toEqual('Item A2');

    // SubcategoryB1 should have two leaf items: Item B1 and Item B2
    expect(subcategoryB1!.children).toBeDefined();
    expect(subcategoryB1!.children!.length).toEqual(2);
    const childNamesB1 = subcategoryB1!.children!.map(
      (node: TreeNode) => node.item!.name
    );
    expect(childNamesB1).toContain('Item B1');
    expect(childNamesB1).toContain('Item B2');

    // SubcategoryB2 should have one leaf item: Item B3
    expect(subcategoryB2!.children).toBeDefined();
    expect(subcategoryB2!.children!.length).toEqual(1);
    expect(subcategoryB2!.children![0].item!.name).toEqual('Item B3');
  });

  it('should create top-level entries when the path is empty or undefined', () => {
    const items: DataLayer[] = [
      {
        id: 101,
        name: 'TopLevelItem',
        path: [],
      } as unknown as DataLayer,
      {
        id: 102,
        name: 'AlsoTopLevel',
        // no path => treat like empty array
      } as unknown as DataLayer,
    ];

    const result = buildPathTree(items);

    // Both items should appear as top-level leaves
    expect(result.length).toEqual(2);

    const node1 = result.find((node: TreeNode) => node.name === 'TopLevelItem');
    expect(node1).toBeDefined();
    expect(node1!.item!.id).toEqual(101);

    const node2 = result.find((node: TreeNode) => node.name === 'AlsoTopLevel');
    expect(node2).toBeDefined();
    expect(node2!.item!.id).toEqual(102);
  });

  it('should handle a single item with a single-level path', () => {
    const items: DataLayer[] = [
      {
        id: 999,
        name: 'LonelyItem',
        path: ['SingleCategory'],
      } as DataLayer,
    ];

    const result = buildPathTree(items);

    // Only one category node at the top level
    expect(result.length).toEqual(1);
    expect(result[0].name).toEqual('SingleCategory');
    expect(result[0].children!.length).toEqual(1);

    // This category should have one leaf item
    const leaf = result[0].children![0];
    expect(leaf.name).toEqual('LonelyItem');
    expect(leaf.item!.id).toEqual(999);
  });
});
