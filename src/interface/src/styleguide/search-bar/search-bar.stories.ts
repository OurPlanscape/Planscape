import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { SearchBarComponent } from './search-bar.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<SearchBarComponent> = {
  title: 'Components/Search Bar',
  component: SearchBarComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-search-bar ${argsToTemplate(args)}></sg-search-bar>`,
  }),
};

export default meta;
type Story = StoryObj<SearchBarComponent>;

export const Default: Story = {
  args: {
    historyItems: ['previously', 'searched', 'terms'],
    searchPlaceholder: 'Search for something',
  },
};

export const NoHistory: Story = {
  args: { historyItems: [] },
};
