import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { SearchResultCardComponent } from './search-result-card.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TreatmentProjectArea } from 'src/app/types';

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
    template: `<div ${containerStyle}><div style='width:400px;'><sg-search-result-card ${argsToTemplate(args)}></sg-search-result-card></div>`,
  }),
};

export default meta;
type Story = StoryObj<SearchResultCardComponent>;

const exampleProjectArea: TreatmentProjectArea = {
  project_area_id: 20,
  project_area_name: 'hello i am a project',
  total_area_acres: 100,
  total_stand_count: 10,
  total_treated_area_acres: 12,
  total_treated_stand_count: 1120,
  prescriptions: [
    {
      action: 'RX_FIRE',
      area_acres: 100,
      treated_stand_count: 100,
      type: 'SINGLE',
      stand_ids: [],
    },
    {
      action: 'HEAVY_THINNING_BURN_PLUS_RX_FIRE',
      area_acres: 100,
      treated_stand_count: 100,
      type: 'SEQUENCE',
      stand_ids: [],
    },
    {
      action: 'MODERATE_THINNING_BURN_PLUS_RX_FIRE',
      area_acres: 100,
      treated_stand_count: 100,
      type: 'SEQUENCE',
      stand_ids: [],
    },
    {
      action: 'HEAVY_THINNING_RX_FIRE',
      area_acres: 100,
      treated_stand_count: 100,
      type: 'SINGLE',
      stand_ids: [],
    },
  ],
  extent: [0, 0, 0, 0],
  centroid: {
    type: 'Point',
    coordinates: [],
  },
};

export const Default: Story = {
  args: {
    projectArea: exampleProjectArea,
    searchString: '',
    wholeWordsOnly: false,
  },
};
