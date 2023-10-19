import { BackendProjectArea, ProjectArea } from '../types';

export function convertToProjectAreas(scenarioProjectAreas: {
  [id: number]: BackendProjectArea;
}): ProjectArea[] {
  if (!scenarioProjectAreas) {
    return [];
  }

  let projectAreas: ProjectArea[] = [];
  Object.values(scenarioProjectAreas).forEach((projectArea) => {
    projectAreas.push({
      id: projectArea.id.toString(),
      projectId: projectArea.properties?.project?.toString(),
      projectArea: projectArea.geometry,
      owner: projectArea.properties?.owner?.toString(),
      estimatedAreaTreated: projectArea.properties?.estimated_area_treated,
    });
  });

  return projectAreas;
}
