import type { Meta, StoryObj } from '@storybook/angular';
import {
  applicationConfig,
  argsToTemplate,
  moduleMetadata,
} from '@storybook/angular';
import { AdvStandLevelConstraintsComponent } from '@app/scenario-creation/step3/adv-stand-level-constraints/adv-stand-level-constraints.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatExpansionModule } from '@angular/material/expansion';
import { ModalComponent } from '@styleguide';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';

// TODO: remove this -- this is just a temporary story for layout

const meta: Meta<AdvStandLevelConstraintsComponent> = {
  title: 'Components/Adv Stand Level Constraints',
  component: AdvStandLevelConstraintsComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [BrowserAnimationsModule, MatExpansionModule, ModalComponent],
    }),
    applicationConfig({
      // the card links to the planning area and its menu calls the API
      providers: [
        [NewScenarioState],
        provideAnimations(),
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(MatSnackBarModule),
      ],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `<app-adv-stand-level-constraints ${argsToTemplate(args)}>
</app-adv-stand-level-constraints>`,
  }),
};

export default meta;
type Story = StoryObj<AdvStandLevelConstraintsComponent>;

export const Default: Story = {
  args: {},
};
