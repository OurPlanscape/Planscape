import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';

import { ButtonComponent } from './button.component';

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
  render: ({ content, ...args }) => ({
    props: args,
    template: `<section class='flex'>
<button sg-button ${argsToTemplate(args)}>Button ${
      args.variant || 'Default'
    }</button>
<button disabled sg-button ${argsToTemplate(args)}>Disabled ${
      args.variant || 'Default'
    }</button>
<button sg-button ${argsToTemplate(args)} icon='draw'> Icon ${
      args.variant || 'Default'
    }</button>
<button disabled sg-button ${argsToTemplate(args)} icon='draw'> Icon ${
      args.variant || 'Default'
    }</button>
</section>`,
  }),
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
    icon: 'help',
    content: 'A text-only button',
  },
};

export const Outline: Story = {
  args: {
    variant: 'ghost',
    icon: 'explore',
    outlined: true,
    content: 'A button with outline icon',
  },
};

export const Icon: Story = {
  args: {
    variant: 'icon-only',
    icon: 'explore',
    outlined: true,
  },
  render: ({ content, ...args }) => ({
    props: args,
    template: `<button sg-button ${argsToTemplate(args)}></button>
<button sg-button ${argsToTemplate(args)} disabled></button>
<button sg-button ${argsToTemplate(args)} [hasError]='true'></button>`,
  }),
};

export const Loading: Story = {
  args: {
    variant: 'ghost',
    loading: true,
    icon: 'explore',
    outlined: true,
    content: 'Loading stuff',
  },
};
