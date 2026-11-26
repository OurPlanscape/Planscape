import { FeatureService } from '@features/feature.service';
import { Workspace } from '@types';

export function canManageDataLayers(
  workspace: Workspace,
  featureService: FeatureService
): boolean {
  return (
    featureService.isFeatureEnabled('DATA_UPLOAD') &&
    workspace.permissions.includes('add_datalayer')
  );
}
