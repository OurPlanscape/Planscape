import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate, moduleMetadata } from '@storybook/angular';

import { EmptyStateComponent } from './empty-state.component';
import { ButtonComponent } from '../button/button.component';

const meta: Meta<EmptyStateComponent> = {
  title: 'Components/Empty State',
  component: EmptyStateComponent,
  decorators: [
    moduleMetadata({
      imports: [ButtonComponent],
    }),
  ],
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<div style="width: 800px; margin: auto;">
      <sg-empty-state ${argsToTemplate(args)}></sg-empty-state>
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<EmptyStateComponent>;

export const Default: Story = {
  args: {
    icon: 'folder',
    title: 'Workspace: A shared space for smarter planning',
    description:
      'Get started by creating a workspace to collaborate with your team and organize everything you need for planning.',
  },
};

/** Any action content — usually a button — is projected below the text. */
export const WithAction: Story = {
  args: Default.args,
  render: (args) => ({
    props: args,
    template: `<div style="width: 800px; margin: auto;">
      <sg-empty-state ${argsToTemplate(args)}>
        <button sg-button variant="primary">Create Workspace</button>
      </sg-empty-state>
    </div>`,
  }),
};

export const WithoutIcon: Story = {
  args: {
    title: 'No Planning Areas Yet',
    description:
      'Click "Explore" to start creating your planning areas. You can explore the mapping tool without creating a planning area.',
  },
};

export const OutlinedIcon: Story = {
  args: {
    ...Default.args,
    icon: 'create_new_folder',
    outlined: true,
  },
};
