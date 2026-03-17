import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { ActionCardComponent } from './action-card.component';

const meta: Meta<ActionCardComponent> = {
  title: 'Components/Action Card',
  component: ActionCardComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<sg-action-card ${argsToTemplate(args)}></sg-action-card>`,
  }),
};

export default meta;
type Story = StoryObj<ActionCardComponent>;

export const Default: Story = {
  args: {
    icon: 'info',
    title: 'Just a regular action card',
    description:
      'Here is a description of various things that are important to know.',
    buttonIcon: 'upload',
    buttonText: 'Do An Action',
  },
};

export const NoDescription: Story = {
  args: {
    ...Default.args,
    description: '',
  },
};

export const SvgIconPath: Story = {
  args: {
    ...Default.args,
    icon: undefined,
    svgIcon: '/assets/svg/icons/actions/subtitles.svg',
  },
};
