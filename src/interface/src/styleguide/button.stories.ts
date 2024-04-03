import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';

import { ButtonComponent } from './button/button.component';

type PagePropsAndCustomArgs = ButtonComponent & { content?: string };

/**
 *
 * Buttons communicates actions that users can take, such as sharing a document and adding a comment.
 * They can have several variants as well as optionally an icon.
 */
const meta: Meta<PagePropsAndCustomArgs> = {
  title: 'Components/Buttons',
  component: ButtonComponent,
  tags: ['autodocs'],
  render: ({ content, ...args }) => ({
    props: args,
    template: `
     <button sg-button ${argsToTemplate(args)}>${content}</button>`,
  }),
};

export default meta;
type Story = StoryObj<PagePropsAndCustomArgs>;

export const Default: Story = {
  args: { content: 'Default button' },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    icon: 'add_box',
    content: 'A primary button',
  },
};

export const Ghost: Story = {
  args: { variant: 'ghost', icon: 'draw', content: 'Ghost button' },
};

export const Negative: Story = {
  args: {
    variant: 'negative',
    icon: 'delete',
    content: 'A distructive action',
  },
};

export const Text: Story = {
  args: {
    variant: 'text',
    icon: 'help_outline',
    content: 'A text-only button',
  },
};
