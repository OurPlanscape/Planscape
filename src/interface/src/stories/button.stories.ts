import type { Meta, StoryObj } from '@storybook/angular';

import { ButtonComponent } from '../styleguide/button/button.component';

/**
 *
 * Buttons communicates actions that users can take, such as sharing a document and adding a comment.
 * They can have several variants as well as optionally an icon.
 */
const meta: Meta<ButtonComponent> = {
  title: 'Components/Buttons',
  component: ButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    // backgroundColor: {
    //   control: 'color',
    // },
  },
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
