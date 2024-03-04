import json
import logging
import os

from base.region_name import display_name_to_region, region_to_display_name
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from django.db import IntegrityError
from django.db.models import Count, Max
from django.db.models.functions import Coalesce
from django.http import (
    HttpRequest,
    HttpResponse,
    HttpResponseBadRequest,
    Http404,
    JsonResponse,
    QueryDict,
)
from django.shortcuts import get_object_or_404
from collaboration.permissions import PlanningAreaPermission
from planning.models import (
    PlanningArea,
    Scenario,
    ScenarioResult,
    ScenarioResultStatus,
    SharedLink,
)
from collaboration.permissions import PlanningAreaPermission, ScenarioPermission
from planning.serializers import (
    PlanningAreaSerializer,
    ScenarioSerializer,
    SharedLinkSerializer,
)
from planning.services import (
    export_to_shapefile,
    validate_scenario_treatment_ratio,
    zip_directory,
)
from planning.tasks import async_forsys_run
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status

logger = logging.getLogger(__name__)


# We always need to store multipolygons, so coerce a single polygon to
# a multigolygon if needed.
def _convert_polygon_to_multipolygon(geometry: dict):
    features = geometry.get("features", [])
    if len(features) > 1 or len(features) == 0:
        raise ValueError("Must send exactly one feature.")
    feature = features[0]
    geom = feature["geometry"]
    if geom["type"] == "Polygon":
        geom["type"] = "MultiPolygon"
        geom["coordinates"] = [feature["geometry"]["coordinates"]]
    actual_geometry = GEOSGeometry(json.dumps(geom))
    if actual_geometry.geom_type != "MultiPolygon":
        raise ValueError("Could not parse geometry")
    return actual_geometry


# TODO: Along with PlanningAreaSerializer, refactor this a bit more to
# make it more maintainable.
def _serialize_planning_area(
    planning_area: PlanningArea, add_geometry: bool, context
) -> dict:
    """
    Serializes a Planning Area (Plan) into a dictionary.
    1. Converts the Planning Area to a dictionary with fields 'id', 'geometry', and 'properties'
       (the latter of which is a dictionary).
    2. Creates the partial result from the properties and 'id' fields.
    3. Adds the 'geometry' if requested.
    4. Replaces the internal region_name with the display version.
    """

    serializer = PlanningAreaSerializer(planning_area, context=context)

    data = serializer.data
    result = data["properties"]
    result["id"] = data["id"]
    if "geometry" in data and add_geometry:
        result["geometry"] = data["geometry"]
    if "region_name" in result:
        result["region_name"] = region_to_display_name(result["region_name"])
    return result


#### PLAN(NING AREA) Handlers ####
@api_view(["POST"])
def create_planning_area(request: Request) -> Response:
    """
    Creates a planning area (aka plan), given a name, region, an optional geometry,
    and an optional notes string.
    Requires a logged in user.

    Returns: id: the newly inserted planning area's primary key (int)

    Required params:
      name (str): User-provided name of the planning area.
      region_name (str): The region name, in user-facing form, e.g. "Sierra Nevada"
      geometry (JSON str): The planning area shape, in GEOGeometry-compatible JSON.
         This can be '{}', but the param does need to be specified.

    Optional params:
      notes (str): An optional note string for this planning area.
    """
    try:
        # Check that the user is logged in.
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Get the name of the planning area.
        body = json.loads(request.body)
        name = body.get("name")
        if name is None:
            return Response(
                {"message": "Must specify a planning area name."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Get the region name; it should be in the human-readable display name format.
        region_name_input = body.get("region_name")
        if region_name_input is None:
            return Response(
                {"message": "Region name must be specified."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        region_name = display_name_to_region(region_name_input)
        if region_name is None:
            return Response(
                {"message": f"Unknown region_name: {region_name_input}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Get the geometry of the planning area.
        geometry = body.get("geometry")
        if geometry is None:
            return Response(
                {"message": "Must specify the planning area geometry."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Convert to a MultiPolygon if it is a simple Polygon, since the model column type is
        # MultiPolygon.
        geometry = _convert_polygon_to_multipolygon(geometry)
        # Create the planning area
        planning_area = PlanningArea.objects.create(
            user=user,
            name=name,
            region_name=region_name,
            geometry=geometry,
            notes=body.get("notes", None),
        )
        planning_area.save()

        return Response({"id": planning_area.pk}, content_type="application/json")

    except ValueError as ve:  # potentially from _convert_polygon_to_multipolygon
        logger.error(f"ValueError creating planning area: {ve}")
        return Response(
            {"message": f"Error creating planning area: {str(ve)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except KeyError as ke:  # potentially from _convert_polygon_to_multipolygon
        logger.error(f"Error creating planning area: {ke}")
        return Response(
            {"message": f"Error creating planning area: {str(ke)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as e:
        logger.error(f"Error creating planning area: {e}")
        raise


@api_view(["POST"])
def delete_planning_area(request: Request) -> Response:
    """
    Deletes a planning area or areas.
    Requires a logged in user.  Users can delete only their owned planning areas.
    Deletion of a planning area not owned by the user will not generate an error but will not delete anything.
    Deletion attempts of nonexistent planning areas will not generate an error but will also not delete anything.

    Returns: The list of IDs entered, including those IDs that failed to matched a user-owned planning area.

    Required params:
      id (int): id: the ID of the planning area to delete, or a list of IDs to delete.
    """
    try:
        # Check that the user is logged in.
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Get the planning area IDs
        body = json.loads(request.body)
        planning_area_id = body.get("id", None)
        planning_area_ids = []
        if planning_area_id is None:
            return Response(
                {"message": "No ID given for planning area"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        elif isinstance(planning_area_id, int):
            planning_area_ids = [planning_area_id]
        elif isinstance(planning_area_id, list):
            planning_area_ids = planning_area_id
        else:
            return Response(
                {"message": "Planning Area ID must be an int or a list of ints."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        planning_areas = PlanningArea.objects.get_for_user(user).filter(
            pk__in=planning_area_ids
        )
        for p in planning_areas:
            if PlanningAreaPermission.can_remove(user, p):
                p.delete()
            else:
                logger.error(f"User {user} has no permission to delete {p.id}")

        # We still report that the full set of planning area IDs requested were deleted,
        # since from the user's perspective, there are no planning areas with that ID.
        # The end result is that those planning areas don't exist as far as the user is concerned.
        return Response({"id": planning_area_ids}, content_type="application/json")

    except Exception as e:
        logger.exception(f"Error deleting planningarea: {e}")
        raise


@api_view(["PATCH", "POST"])
def update_planning_area(request: Request) -> Response:
    """
    Updates a planning area's name or notes.  To date, these are the only fields that
    can be modified after a planning area is created.  This can be also used to clear
    the notes field, but the name needs to be defined always.

    Calling this without anything to update will not throw an error.

    Requires a logged in user.  Users can modify only their owned planning_areas.

    Returns: id: The planning area's ID, even if nothing needed updating.

    Required params:
      id (int): ID of the planning area to retrieve.
    """
    try:
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        body = json.loads(request.body)
        planning_area_id = body.get("id", None)

        if planning_area_id is None:
            return Response(
                {"error": "No planning area ID provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        planning_area = PlanningArea.objects.get(id=planning_area_id)

        if not PlanningAreaPermission.can_change(user, planning_area):
            return Response(
                {
                    "message": "User does not have permission to update this planning area",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        is_dirty = False

        if "notes" in body:
            # This can clear the notes field
            planning_area.notes = body.get("notes")
            is_dirty = True

        if "name" in body:
            # This must be always defined
            new_name = body.get("name")
            if (new_name is None) or (len(new_name) == 0):
                return Response(
                    {"message": "Name must be defined"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            planning_area.name = new_name
            is_dirty = True

        if is_dirty:
            planning_area.save()

        return Response({"id": planning_area_id}, content_type="application/json")
    except Exception as e:
        logger.exception("Error updating planning area %s", e)
        raise


@api_view(["GET"])
def get_planning_area_by_id(request: Request) -> Response:
    """
    Retrieves a planning area by ID.
    Requires a logged in user.  Users can see only their owned planning_areas.

    Returns: The planning area in JSON form.  The JSON will also include two metadata fields:
      scenario_count: number of scenarios for this planning area.
      latest_updated: latest datetime (e.g. 2023-09-08T20:33:28.090393Z) across all scenarios or
        PlanningArea updated_at if no scenarios

    Required params:
      id (int): ID of the planning area to retrieve.
    """
    try:
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if "id" not in request.GET:
            return Response(
                {"error": "Missing required parameter 'id'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        planning_area = (
            PlanningArea.objects.filter(id=request.GET["id"])
            .annotate(scenario_count=Count("scenarios", distinct=True))
            .annotate(
                scenario_latest_updated_at=Coalesce(
                    Max("scenarios__updated_at"), "updated_at"
                )
            )
            .first()
        )

        if not planning_area:
            return Response(
                {"message": "Planning area not found with this ID"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not PlanningAreaPermission.can_view(user, planning_area):
            return Response(
                {"message": "User has no access to this planning area."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            _serialize_planning_area(planning_area, True, context={"request": request})
        )
    except Exception as e:
        logger.exception("Error getting area by id %s", e)
        raise


# No Params expected, since we're always using the logged in user.
@api_view(["GET"])
def list_planning_areas(request: Request) -> Response:
    """
    Retrieves all planning areas for a user.
    Requires a logged in user.  Users can see only their owned planning_areas.

    Returns: A list of planning areas in JSON form.  Each planning area JSON will also include
        two metadata fields:
      scenario_count: number of scenarios for the planning area returned.
      latest_updated: latest datetime (e.g. 2023-09-08T20:33:28.090393Z) across all scenarios or
        PlanningArea updated_at if no scenarios

    Required params: none
    """
    try:
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # TODO: This could be really slow; consider paging or perhaps
        # fetching everything but geometries (since they're huge) for performance gains.
        # given that we need geometry to calculate total acres, should we save this value
        # when creating the planning area instead of calculating it each time?

        planning_areas = (
            PlanningArea.objects.get_for_user(user)
            .annotate(scenario_count=Count("scenarios", distinct=True))
            .annotate(
                scenario_latest_updated_at=Coalesce(
                    Max("scenarios__updated_at"), "updated_at"
                )
            )
            .order_by("-scenario_latest_updated_at")
        )
        return JsonResponse(
            [
                _serialize_planning_area(
                    planning_area, True, context={"request": request}
                )
                for planning_area in planning_areas
            ],
            safe=False,
        )
    except Exception as e:
        logger.error(f"Error: Failed to list planning areas: {e}")
        raise


def _serialize_scenario(scenario: Scenario) -> dict:
    """
    Serializes a Scenario into a dictionary.
    # TODO: Add more logic here as our Scenario model expands beyond just the
    #       JSON "configuration" field.
    """
    data = ScenarioSerializer(scenario).data
    return data


@api_view(["GET"])
def get_scenario_by_id(request: Request) -> Response:
    """
    Retrieves a scenario by its ID.
    Requires a logged in user with permission to view scenario.
    Returns: A scenario in JSON form.

    Required params:
      id (int): The scenario ID to be retrieved.
    """
    try:
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if "id" not in request.GET:
            return Response(
                {"error": "Missing required parameter 'id'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        scenario = Scenario.objects.get(id=request.GET["id"])
        if not ScenarioPermission.can_view(user, scenario):
            return Response(
                {"message": "You do not have permission to view this scenario"},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(_serialize_scenario(scenario), content_type="application/json")
    except Scenario.DoesNotExist:
        return Response(
            {"error": "Scenario matching query does not exist."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.error(f"Could not get scenario: {e}")
        raise


@api_view(["GET"])
def download_csv(request: Request) -> HttpResponse:
    """
    Generates a new Zip file for a scenario based on ID.

    Requires a logged in user.  Users can only access a scenarios belonging to their own planning areas.

    Returns: a Zip file generated with the CSVs ad JSON file for this particular scenario

    Required params:
      id (int): The scenario ID to be retrieved.
    """
    # Ensure that the user is logged in.
    user = request.user
    if not user.is_authenticated:
        return Response(
            {"error": "Authentication Required"}, status=status.HTTP_401_UNAUTHORIZED
        )
    if "id" not in request.GET:
        return Response(
            {"error": "Missing required parameter 'id'"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        scenario = Scenario.objects.get(id=request.GET["id"])

        # Ensure that current user is associated with this scenario
        if not ScenarioPermission.can_view(user, scenario):
            return Response(
                "Scenario matching query does not exist.",
                status=status.HTTP_403_FORBIDDEN,
            )

        output_zip_name: str = str(scenario.uuid) + ".zip"

        if not scenario.get_forsys_folder().exists():
            return Response(
                {"error": "Scenario files cannot be read."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response = HttpResponse(content_type="application/zip")
        zip_directory(response, scenario.get_forsys_folder())

        response["Content-Disposition"] = f"attachment; filename={output_zip_name}"
        return response

    except Scenario.DoesNotExist:
        return Response(
            {"error": "Scenario matching query does not exist."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.exception(f"Error: {e}")
        raise


@api_view(["GET"])
def download_shapefile(request: Request) -> Response:
    """
    Generates a new Zip file of the shapefile for a scenario based on ID.

    Requires a logged in user.  Users can only access a scenarios belonging to their own planning areas.

    Returns: a Zip file generated with the shapefiles

    Required params:
      id (int): The scenario ID to be retrieved.
    """
    # Ensure that the user is logged in.
    user = request.user
    if not user.is_authenticated:
        return Response(
            {"error": "Authentication Required"}, status=status.HTTP_401_UNAUTHORIZED
        )

    if "id" not in request.GET:
        return Response(
            {"error": "Missing required parameter 'id'"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        scenario = Scenario.objects.get(id=request.GET["id"])
        # Ensure that current user is associated with this scenario
        if not ScenarioPermission.can_view(user, scenario):
            return Response(
                {"error": "User has no permission to view scenario"},
                status=status.HTTP_403_FORBIDDEN,
            )

        scenario_result = ScenarioResult.objects.get(scenario__id=scenario.pk)
        if scenario_result.status != ScenarioResultStatus.SUCCESS:
            return Response(
                "Scenario was not successful, can't download data.",
                status=status.HTTP_424_FAILED_DEPENDENCY,
            )

        output_zip_name = f"{str(scenario.uuid)}.zip"
        export_to_shapefile(scenario)
        response = Response(content_type="application/zip")
        zip_directory(response, scenario.get_shapefile_folder())

        response["Content-Disposition"] = f"attachment; filename={output_zip_name}"
        return response
    except Scenario.DoesNotExist:
        return Response(
            {"error": "Scenario matching query does not exist."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except ScenarioResult.DoesNotExist:
        return Response(
            {"error": "Scenario result matching query does not exist."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.error("Error in downloading shapefile %s", e)
        raise


@api_view(["POST"])
def create_scenario(request: Request) -> Response:
    """
    Creates a Scenario.  This also creates a default (e.g. mostly empty) ScenarioResult associated with the scenario.
    Requires a logged in user, as a scenario must be associated with a user's planning area.

    Returns: id: the ID of the newly inserted Scenario.

    Required params:
      name (str): The user-provided name of the Scenario.
      planning_area (int): The ID of the planning area that will recieve the new Scenario.
      configuration (str): A JSON string representing the scenario configuration (e.g. query parameters, weights).

    Optional params:
      notes (str): User-provided notes for this scenario.
    """
    try:
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        body = json.loads(request.body)

        # Check for all needed fields
        serializer = ScenarioSerializer(data=body, context={"user": user})
        serializer.is_valid(raise_exception=True)

        # Ensure that we have a viable planning area owned by the user.  Note that this gives a slightly different
        # error response for a nonowned planning area vs. when given a nonexistent planning area.
        planning_area = PlanningArea.objects.get(id=body["planning_area"])
        if not PlanningAreaPermission.can_view(user, planning_area):
            return Response(
                {
                    "error": "User does not have permission to create scenarios from this Planning Area"
                },
                content_type="application/json",
                status=status.HTTP_403_FORBIDDEN,
            )

        # TODO: Parse configuration field into further components.
        result, reason = validate_scenario_treatment_ratio(
            planning_area,
            serializer.validated_data.get("configuration"),
        )

        if not result:
            return Response(
                {"reason": reason},
                content_type="application/json",
                status=status.HTTP_400_BAD_REQUEST,
            )

        scenario = serializer.save()

        # Create a default scenario result.
        # Note that if this fails, we will have still written the Scenario without
        # a corresponding ScenarioResult.
        scenario_result = ScenarioResult.objects.create(scenario=scenario)
        scenario_result.save()

        if settings.USE_CELERY_FOR_FORSYS:
            async_forsys_run.delay(scenario.pk)

        return Response({"id": scenario.pk}, content_type="application/json")
    except PlanningArea.DoesNotExist:
        return Response(
            {"error": "a matching Planning Area does not exist"},
            content_type="application/json",
            status=status.HTTP_404_NOT_FOUND,
        )
    except IntegrityError as ve:
        reason = ve.args[0]
        if "(planning_area_id, name)" in ve.args[0]:
            reason = "A scenario with this name already exists."
        return Response(
            json.dumps({"reason": reason}),
            content_type="application/json",
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        logger.error("Error creating scenario: %s", e)
        raise


@api_view(["PATCH", "POST"])
def update_scenario(request: Request) -> Response:
    """
    Updates a scenario's name or notes.  To date, these are the only fields that
    can be modified after a scenario is created.  This can be also used to clear
    the notes field, but the name needs to be defined always.

    Calling this without anything to update will not throw an error.

    Requires a logged in user.  Users can modify only their owned scenarios.

    Returns: id: The scenario's ID, even if nothing needed updating.

    Required params:
      id (int): ID of the scenario to retrieve.
    """
    try:
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        body = json.loads(request.body)
        scenario_id = body.get("id", None)
        if scenario_id is None:
            return Response(
                {"error": "Scenario ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        scenario = Scenario.objects.get(id=scenario_id)

        if not ScenarioPermission.can_change(user, scenario):
            return Response(
                {"error": "User does not have permission to update this scenario."},
                status=status.HTTP_403_FORBIDDEN,
            )

        is_dirty = False

        if "notes" in body:
            # This can clear the notes field
            scenario.notes = body.get("notes")
            is_dirty = True

        if "name" in body:
            # This must be always defined
            new_name = body.get("name")
            if (new_name is None) or (len(new_name) == 0):
                return Response(
                    {"error": "Name must be defined."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            scenario.name = new_name
            is_dirty = True

        if is_dirty:
            scenario.save()

        return Response({"id": scenario_id}, content_type="application/json")

    except Scenario.DoesNotExist:
        return Response(
            {"error": "Scenario matching query does not exist."},
            status=status.HTTP_404_NOT_FOUND,
        )

    except Exception as e:
        logger.error("Error updating scenario: %s", e)
        raise


# TODO: add more things to update other than state
# Unlike other routines, this does not require a user login context, as it is expected to be called
# by the EP.
#
# TODO: require credential from EP so that random people cannot call this endpoint.
@api_view(["GET", "POST"])
def update_scenario_result(request: Request) -> Response:
    """
    Updates a ScenarioResult's status.
    Requires a logged in user, as a scenario must be associated with a user's planning area.
    Throws an error if no scenario/ScenarioResult owned by the user can be found with the desired ID.
    This does not modify the Scenario object itself.
    A ScenarioResult's status can be updated only in the following directions:
       PENDING -> RUNNING | FAILURE
       RUNNING -> SUCCESS | FAILURE

    Returns: id: the ID of the Scenario whose ScenarioResult was updated.

    Required params:
      scenario_id (int): The scenario ID whose ScenarioResult is meant to be updated.

    Optional params:
      status (ScenarioResultStatus): The new status of the ScenarioResult.
      result (JSON str): Details of the run.
      run_details (JSON str): Even more verbose details of the run.
    """
    try:
        body = json.loads(request.body)
        scenario_id = body.get("scenario_id")

        scenario_result = ScenarioResult.objects.get(scenario__id=scenario_id)

        new_status = body.get("status")
        old_status = scenario_result.status

        if new_status is not None:
            match new_status:
                case ScenarioResultStatus.RUNNING:
                    if old_status != ScenarioResultStatus.PENDING:
                        return Response(
                            {"error": "Invalid new state."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                case ScenarioResultStatus.SUCCESS:
                    if old_status != ScenarioResultStatus.RUNNING:
                        return Response(
                            {"error": "Invalid new state."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                case _:
                    if new_status != ScenarioResultStatus.FAILURE:
                        return Response(
                            {"error": "Invalid new state."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
            scenario_result.status = new_status

        if (run_details := body.get("run_details")) is not None:
            scenario_result.run_details = run_details

        if (result := body.get("result")) is not None:
            scenario_result.result = result

        scenario_result.save()

        return Response({"id": scenario_id}, content_type="application/json")
    except ScenarioResult.DoesNotExist:
        return Response(
            {"error": "Scenario result matching query does not exist."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.error("Error updating scenario result: %s", e)
        raise


@api_view(["GET"])
def list_scenarios_for_planning_area(request: Request) -> Response:
    """
    Lists all Scenarios for a Planning area.
    Requires a logged in user, as a scenario must be associated with a user's planning area.

    Returns: a list of the scenarios for the user.  Will return an empty list
      if given a planning area that has no scenarios, a planning area that isn't owned by the user,
      or if there is no existing planning area associated with the given planning area ID.

    Required params:
      planning_area (int): The planning area ID whose scenarios to retrieve.
    """
    try:
        # Check that the user is logged in.
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        planning_area_id = request.GET["planning_area"]
        if planning_area_id is None:
            return Response(
                {"error": "Missing planning_area"}, status=status.HTTP_400_BAD_REQUEST
            )

        planning_area = PlanningArea.objects.get(id=planning_area_id)
        if not PlanningAreaPermission.can_view(user, planning_area):
            return Response(
                {"error": "User has no permission to view planning area"},
                status=status.HTTP_403_FORBIDDEN,
            )

        scenarios = Scenario.objects.filter(planning_area__pk=planning_area_id)
        return Response(
            [_serialize_scenario(scenario) for scenario in scenarios],
            content_type="application/json",
        )
    except PlanningArea.DoesNotExist:
        return Response(
            {"error": "Planning Area does not exist."}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error("Error updating scenario result: %s", e)
        raise


@api_view(["DELETE", "POST"])
def delete_scenario(request: Request) -> Response:
    """
    Deletes a scenario or list of scenarios for a planning_area owned by the user.
    Requires a logged in user, as a scenario must be associated with a user's planning area.
    Scenarios that do not exist or do not belong to a planning_area that is owned by the user
    will appear in the returned list, but scenarios that are not owned by the user are not changed.

    Returns: id: the list of IDs to be deleted.

    Required params:
      scenario_id (int): The ID of the scenario (or list of IDs) to delete.
    """
    try:
        # Check that the user is logged in.
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        body = json.loads(request.body)
        scenario_id_str = body.get("scenario_id", None)
        if scenario_id_str is None:
            return Response(
                {"error": "Must specify scenario id(s)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        scenario_ids = []
        if isinstance(scenario_id_str, int):
            scenario_ids = [scenario_id_str]
        elif isinstance(scenario_ids, list):
            scenario_ids = scenario_id_str
        else:
            return Response(
                {"error": "scenario_id must be an int or a list of ints."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the scenarios matching the provided IDs and the logged-in user.
        scenarios = Scenario.objects.filter(pk__in=scenario_ids).filter(
            planning_area__user=user.pk
        )
        # This automatically deletes ScenarioResult entries for the deleted Scenarios.
        for s in scenarios:
            if ScenarioPermission.can_delete(user, s):
                s.delete()

        # We still report that the full set of scenario IDs requested were deleted,
        # since from the user's perspective, there are no scenarios with that ID after this
        # call completes.
        response_data = {"id": scenario_ids}

        return Response(response_data, content_type="application/json")
    except Exception as e:
        logger.error("Error deleting scenario: %s", e)
        raise


def get_treatment_goals_config_for_region(params: QueryDict):
    # Get region name
    assert isinstance(params["region_name"], str)
    region_name = params["region_name"]

    # Read from treatment_goals config
    config_path = os.path.join(settings.BASE_DIR, "config/treatment_goals.json")
    treatment_goals_config = json.load(open(config_path, "r"))
    for region in treatment_goals_config["regions"]:
        if region_name == region["region_name"]:
            return region["treatment_goals"]

    return None


@api_view(["GET"])
def treatment_goals_config(request: Request) -> Response:
    treatment_goals = get_treatment_goals_config_for_region(request.GET)
    return Response(treatment_goals, content_type="application/json")


#### SHARED LINK Handlers ####
@api_view(["GET"])
def get_shared_link(request: Request, link_code: str) -> Response:
    try:
        link_obj = SharedLink.objects.get(link_code=link_code)
    except SharedLink.DoesNotExist:
        # Handle the case where the object doesn't exist
        return Response(
            {"error": "This link does not exist"}, status=status.HTTP_404_NOT_FOUND
        )
    serializer = SharedLinkSerializer(link_obj)
    return Response(serializer.data, content_type="application/json")


@api_view(["POST"])
def create_shared_link(request: Request) -> Response:
    try:
        user = request.user

        body = json.loads(request.body)
        serializer = SharedLinkSerializer(data=body, context={"user": user})
        serializer.is_valid(raise_exception=True)
        shared_link = serializer.save()

        serializer = SharedLinkSerializer(shared_link)
        return Response(serializer.data, content_type="application/json")

    except Exception as e:
        logger.error("Error creating shared link: %s", e)
        raise
