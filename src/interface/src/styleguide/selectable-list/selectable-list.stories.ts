import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { SelectableListComponent } from './selectable-list.component';

interface DemoInterface {
  id: number;
  name: string;
  otherPropertyUsedForColor?: string;
}

const items: DemoInterface[] = [
  { id: 1, name: 'First Item', otherPropertyUsedForColor: '#123d81' },
  {
    id: 2,
    name: 'Some very long name that its going to wrap at some point but still should look good',
    otherPropertyUsedForColor: '#1b86e4',
  },
  {
    id: 3,
    name: 'Another one that is going to be super long and then probably wrap and make it into more than two lines probably 3',
    otherPropertyUsedForColor: '#4854c0',
  },
  { id: 4, name: 'Fourth Item', otherPropertyUsedForColor: '#7946e6' },
];

const meta: Meta<DemoInterface> = {
  title: 'Components/Selectable List',
  component: SelectableListComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<div style='width: 400px; padding: 20px;  border: 1px solid #d0d0d0; resize: both; overflow: auto'>
                 <sg-selectable-list ${argsToTemplate(args)}></sg-selectable-list>
               </div>`,
  }),
};

export default meta;
type Story = StoryObj<SelectableListComponent<DemoInterface>>;

export const Default: Story = {
  args: {
    items: items,
    colorPath: 'otherPropertyUsedForColor',
  },
};

export const WithSelectedItems: Story = {
  args: {
    items: items,
    selectedItems: [items[1], items[3]],
    colorPath: 'otherPropertyUsedForColor',
  },
};

export const WithViewedItems: Story = {
  args: {
    items: items,
    viewedItems: [items[1], items[3]],
    colorPath: 'otherPropertyUsedForColor',
  },
};

interface ComplexDemoInterface {
  id: number;
  name: string;
  nested: {
    properties: {
      color: string;
    };
  }[];
}

const complexItems: ComplexDemoInterface[] = [
  { id: 1, name: 'First Item', nested: [{ properties: { color: '#123d81' } }] },
  {
    id: 2,
    name: 'Second Item',
    nested: [{ properties: { color: '#1b86e4' } }],
  },
  {
    id: 3,
    name: 'Third item',
    nested: [{ properties: { color: '#4854c0' } }],
  },
  {
    id: 4,
    name: 'Fourth Item',
    nested: [{ properties: { color: '#7946e6' } }],
  },
];

export const WithCustomColorPath: Story = {
  args: {
    items: complexItems,
    colorPath: 'nested[0].properties.color',
  },
};

export const WithLoadingItems: Story = {
  args: {
    items: items,
    viewedItems: [items[1], items[3]],
    colorPath: 'otherPropertyUsedForColor',
    loadingItems: [`source_${items[1].id}`],
  },
};
