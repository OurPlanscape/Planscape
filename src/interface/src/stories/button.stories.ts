import type { Meta, StoryObj } from '@storybook/angular';

import { ButtonComponent } from '../styleguide/button/button.component';
import { fn } from '@storybook/test';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<ButtonComponent> = {
  title: 'Example/Button',
  component: ButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    // backgroundColor: {
    //   control: 'color',
    // },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: { click: fn() },
};

export default meta;
type Story = StoryObj<ButtonComponent>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args

export const Default: Story = {
  args: {},
  render: (args) => ({
    template: `<sg-button variant='${args.variant}'>Hello</sg-button>`,
  }),
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
  render: (args) => ({
    template: `<sg-button variant='${args.variant}'>Hello</sg-button>`,
  }),
};
export const Primary: Story = {
  args: { variant: 'primary' },
  render: (args) => ({
    template: `<sg-button variant='${args.variant}'>Hello</sg-button>`,
  }),
};
