import type { Meta, StoryObj } from '@storybook/angular';
// import { argsToTemplate } from '@storybook/angular';
import { ChipSelectorComponent } from './chip-selector.component';

const meta: Meta<ChipSelectorComponent> = {
  title: 'Components/ChipSelector',
  component: ChipSelectorComponent,
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-chip-selector></sg-chip-selector>`,
  }),
};

export default meta;
type Story = StoryObj<ChipSelectorComponent>;

export const Default: Story = {};


export const NoTitle: Story = {
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-chip-selector></sg-chip-selector>`,
  }),
};

