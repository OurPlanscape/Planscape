import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { ProjectAreaExpanderComponent } from './project-area-expander.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Extent } from '@types';
import { Point } from 'geojson';

const containerStyle = `style="display: flex;
  width: 100%;
  height: 180px;
  background-color: lightgray;
  align-items: center;
  justify-content: start;
  padding: 10px;
  flex-direction: column;"`;

export type PrescriptionSingleAction =
  | 'MODERATE_THINNING_BIOMASS'
  | 'HEAVY_THINNING_BIOMASS'
  | 'MODERATE_THINNING_BURN'
  | 'HEAVY_THINNING_BURN'
  | 'MODERATE_MASTICATION'
  | 'HEAVY_MASTICATION'
  | 'RX_FIRE'
  | 'HEAVY_THINNING_RX_FIRE'
  | 'MASTICATION_RX_FIRE';

const sampleExtent: Extent = [1, 2, 3, 4];
const samplePoint: Point = { type: 'Point', coordinates: [] };
const sampleProjectAreaResult = {
  project_area_id: 1,
  project_area_name: 'Project Area 1',
  total_stand_count: 10,
  prescriptions: [
    {
      action: 'MODERATE_THINNING_BIOMASS',
      area_acres: 100,
      treated_stand_count: 3,
      type: 'type1',
      stand_ids: [1, 2, 3],
    },
    {
      action: 'HEAVY_THINNING_BIOMASS',
      area_acres: 50,
      treated_stand_count: 2,
      type: 'type2',
      stand_ids: [4, 5],
    },
    {
      action: 'HEAVY_MASTICATION',
      area_acres: 50,
      treated_stand_count: 2,
      type: 'type2',
      stand_ids: [4, 5],
    },
    {
      action: 'MASTICATION_RX_FIRE',
      area_acres: 50,
      treated_stand_count: 2,
      type: 'type2',
      stand_ids: [4, 5],
    },
    {
      action: 'HEAVY_THINNING_BURN',
      area_acres: 50,
      treated_stand_count: 2,
      type: 'type2',
      stand_ids: [4, 5],
    },
  ],
  extent: sampleExtent,
  centroid: samplePoint,
};

const meta: Meta<ProjectAreaExpanderComponent> = {
  title: 'Components/Project Area Expander',
  component: ProjectAreaExpanderComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<div ${containerStyle}><div style="width:400px;"><sg-project-area-expander ${argsToTemplate(args)}></sg-project-area-expander></div>`,
  }),
};

export default meta;
type Story = StoryObj<ProjectAreaExpanderComponent>;

export const Default: Story = {
  args: {
    projectArea: sampleProjectAreaResult,
  },
};
