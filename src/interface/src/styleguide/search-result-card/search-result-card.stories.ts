import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { SearchResultCardComponent } from './search-result-card.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const containerStyle = `style="display: flex;
  width: 100%;
  height: 180px;
  background-color: lightgray;
  align-items: center;
  justify-content: start;
  padding: 10px;
  flex-direction: column;"`;

const meta: Meta<SearchResultCardComponent> = {
  title: 'Components/Search Result Card',
  component: SearchResultCardComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<div ${containerStyle}><div style="width:400px;"><sg-search-result-card ${argsToTemplate(args)}></sg-search-result-card></div>`,
  }),
};

export default meta;
type Story = StoryObj<SearchResultCardComponent>;

export const Default: Story = {
  args: {
    resultTitle: 'hello i am a title',
    resultTextLines: [
      'this is a line',
      'this is another line',
      'here is some third line',
    ],
    searchString: '',
    wholeWordsOnly: false,
  },
};
