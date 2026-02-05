import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';

import { NoResultsComponent } from './no-results.component';

const meta: Meta<NoResultsComponent> = {
  title: 'Components/No Results',
  component: NoResultsComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<div style='width: 500px;
    margin: auto;
    '><sg-no-results ${argsToTemplate(args)}></sg-no-results></div>`,
  }),
};

export default meta;
type Story = StoryObj<NoResultsComponent>;

export const Default: Story = {
  args: {},
};

export const WithSearchString: Story = {
  args: {
    searchString: 'something',
  },
};
