import type { Meta, StoryObj } from '@storybook/angular';

import { ButtonComponent } from './button/button.component';

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
  args: { variant: 'ghost' },
  render: (args) => ({
    template: `<button sg-button variant='${args.variant}'>A button</button>
  <br> <button sg-button icon='draw' variant='${args.variant}'>A button with icon</button>
  <br> <button sg-button  variant='${args.variant}' disabled>A disabled button </button>
<br> <button sg-button icon='archive' variant='${args.variant}' disabled>A disabled button with icon</button>`,
  }),
};

export const Primary: Story = {
  args: { variant: 'primary' },
  render: (args) => ({
    template: `<button sg-button variant='${args.variant}'>Primary button</button>`,
  }),
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
  render: (args) => ({
    template: `<button sg-button variant='${args.variant}' >Ghost button</button>`,
  }),
};

export const Negative: Story = {
  args: { variant: 'negative' },
  render: (args) => ({
    template: `<button sg-button variant='${args.variant}'>A distructive action</button>`,
  }),
};
