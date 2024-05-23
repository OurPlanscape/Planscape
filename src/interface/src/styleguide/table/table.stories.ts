import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { TableComponent } from './table.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<TableComponent> = {
  title: 'Components/Table',
  component: TableComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `<sg-table></sg-table>`,
  }),
};

export default meta;
type Story = StoryObj<TableComponent>;

export const Default: Story = {
  args: {},
};
