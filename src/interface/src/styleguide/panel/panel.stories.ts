import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { PanelComponent } from './panel.component';

const meta: Meta<PanelComponent> = {
  title: 'Components/Panel',
  component: PanelComponent,
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-panel>
  <div panelTitle>Just a basic panel title</div>
  <div>
  This is the content of the panel.
  </div>
</sg-panel>`,
  }),
};

export default meta;
type Story = StoryObj<PanelComponent>;

export const Default: Story = {};

export const WithIcons: Story = {
  args: {
    buttons: [
      { icon: 'layers', actionName: 'layers' },
      { icon: 'open_in_full', actionName: 'Open in full' },
    ],
  },
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-panel  ${argsToTemplate(args)}>
<div panelTitle>This Panel has icons</div>
 Just the content, no title.</sg-panel>`,
  }),
};

export const NoTitle: Story = {
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-panel>Just the content, no title.</sg-panel>`,
  }),
};

export const NoPadding: Story = {
  args: {
    paddedContent: false,
  },
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-panel ${argsToTemplate(args)}><div panelTitle>No padding</div>
Use this variant to show maps or images where we dont want the panel container to have padding</sg-panel>`,
  }),
};

export const LongNameAndLotsOfIcons: Story = {
  args: {
    buttons: [
      { icon: 'check', actionName: 'check' },
      { icon: 'task', actionName: 'Task' },
      { icon: 'layers', actionName: 'layer btn' },
      { icon: 'open_in_full', actionName: 'Open in full' },
    ],
  },
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-panel  ${argsToTemplate(args)}>
<div panelTitle>This Panel a very long name that might take more space than whats available, without wrapping</div>
 This is the content of the panel.</sg-panel>`,
  }),
};
