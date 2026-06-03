import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate, moduleMetadata } from '@storybook/angular';
import { ToggleTabsComponent } from './toggle-tabs.component';

type PagePropsAndCustomArgs = ToggleTabsComponent & { content?: string };

const meta: Meta<PagePropsAndCustomArgs> = {
  title: 'Components/Toggle Tabs',
  component: ToggleTabsComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [ToggleTabsComponent],
    }),
  ],
  render: ({ content, ...args }) => ({
    props: args,
    template: `
     <sg-toggle-tabs ${argsToTemplate(args)}>${content || ''}</sg-toggle-tabs>`,
  }),
};

export default meta;
type Story = StoryObj<PagePropsAndCustomArgs>;

export const Default: Story = {
  args: {
    buttons: [
      { name: 'Report', value: 'report', icon: 'analytics_outline' },
      { name: 'Data Layers', value: 'data_layers', icon: 'layers_outline' },
    ],
    defaultSelection: 'report',
  },
};

export const AltDefault: Story = {
  args: {
    ...Default.args,
    defaultSelection: 'data_layers',
  },
};

export const LotsOfButtons: Story = {
  args: {
    ...Default.args,
    buttons: [
      { name: 'Button 1', value: 'item_1', icon: 'counter_1' },
      { name: 'Button 2', value: 'item_2', icon: 'counter_2' },
      { name: 'Button 3', value: 'item_3', icon: 'counter_3' },
      { name: 'Button 4', value: 'item_4', icon: 'counter_4' },
      { name: 'Button 5', value: 'item_5', icon: 'counter_5' },
    ],
    defaultSelection: 'item_3',
  },
};
