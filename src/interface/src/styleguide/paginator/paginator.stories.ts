import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate, applicationConfig } from '@storybook/angular';
import { PaginatorComponent } from './paginator.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<PaginatorComponent> = {
  title: 'Components/Paginator',
  component: PaginatorComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `<sg-paginator ${argsToTemplate(args)}></sg-paginator>`,
  }),
};

export default meta;
type Story = StoryObj<PaginatorComponent>;

export const Default: Story = {
  args: {
    pageCount: 10,
    currentPage: 6,
    recordsPerPage: 10,
  },
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-paginator ${argsToTemplate(args)}></sg-paginator>`,
  }),
};
