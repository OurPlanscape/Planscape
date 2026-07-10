import type { Preview } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import docJson from '../src/styleguide/generated/documentation.json';

setCompodocJson(docJson);

const preview: Preview = {
  // Material components (menus, form fields, tooltips…) rely on Angular
  // animations; the real app provides them app-wide, so mirror that here.
  decorators: [applicationConfig({ providers: [provideAnimations()] })],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
