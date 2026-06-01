import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';

import { ToggleTabsComponent } from './toggle-tabs.component';

type PagePropsAndCustomArgs = ToggleTabsComponent & { content?: string };

const meta: Meta<PagePropsAndCustomArgs> = {
  title: 'Components/Toggle Tabs',
  component: ToggleTabsComponent,
  tags: ['autodocs'],
  render: ({ content, ...args }) => ({
    props: args,
    template: `
     <sg-toggle-tabs ${argsToTemplate(args)}>${content}</sg-toggle-tabs>`,
  }),
};

export default meta;
type Story = StoryObj<PagePropsAndCustomArgs>;

export const Default: Story = {
  render: ({ content, ...args }) => ({}),
};
