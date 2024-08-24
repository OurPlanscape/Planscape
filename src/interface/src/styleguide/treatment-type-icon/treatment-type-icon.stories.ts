import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { TreatmentTypeIconComponent } from './treatment-type-icon.component';

const meta: Meta<TreatmentTypeIconComponent> = {
  title: 'Components/Treatment Type Icon',
  component: TreatmentTypeIconComponent,
  tags: ['autodocs'],
  //   decorators: [applicationConfig({})],
  render: (args) => ({
    props: args,
    template: `<sg-treatment-type-icon ${argsToTemplate(args)}></sg-treatment-type-icon>`,
  }),
};

export default meta;
type Story = StoryObj<TreatmentTypeIconComponent>;

export const Default: Story = {
  args: {
    type: 'Sequence',
  },
};
