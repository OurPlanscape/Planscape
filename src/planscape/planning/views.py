import json
import logging
import os
from base.region_name import display_name_to_region
from django.conf import settings
from django.db import transaction
from django.db import IntegrityError
from django.db.models import Count, Max
from django.db.models.functions import Coalesce
from django.http import (
    HttpResponse,
    QueryDict,
)
from django.shortcuts import get_object_or_404
from collaboration.permissions import (
    PlanningAreaPermission,
    ScenarioPermission,
    PlanningAreaNotePermission,
)
from planning.models import (
    PlanningArea,
    PlanningAreaNote,
    Scenario,
    ScenarioResult,
    ScenarioResultStatus,
    SharedLink,
    ScenarioStatus,
)
from planning.serializers import (
    ListPlanningAreaSerializer,
    ListScenarioSerializer,
    PlanningAreaSerializer,
    ScenarioSerializer,
    SharedLinkSerializer,
    PlanningAreaNoteSerializer,
    PlanningAreaNoteListSerializer,
    ValidatePlanningAreaOutputSerializer,
    ValidatePlanningAreaSerializer,
)
from planning.services import (
    export_to_shapefile,
    get_acreage,
    validate_scenario_treatment_ratio,
    zip_directory,
    create_planning_area as create_planning_area_service,
    create_scenario as create_scenario_service,
    delete_planning_area as delete_planning_area_service,
    delete_scenario as delete_scenario_service,
)
from planning.tasks import async_forsys_run
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status

from planscape.exceptions import InvalidGeometry

logger = logging.getLogger(__name__)


@api_view(["POST"])
def validate_planning_area(request: Request) -> Response:
    serializer = ValidatePlanningAreaSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    geometry = serializer.validated_data.get("geometry")
    data = {"area_acres": get_acreage(geometry)}
    out_serializer = ValidatePlanningAreaOutputSerializer(instance=data)
    return Response(out_serializer.data)


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
        notes = body.get("notes", None) or None
        planning_area = create_planning_area_service(
            user=user,
            name=name,
            region_name=region_name,
            geometry=geometry,
            notes=notes,
        )
        serializer = PlanningAreaSerializer(
            instance=planning_area, context={"request": request}
        )
        return Response(serializer.data)
    except InvalidGeometry as invGeom:
        msg = f"User uploaded invalid geometry.\n{invGeom}"
        logger.warning(msg)
        # this error data mirrors what django auto-generates from serializer errors
        # when we migrate to v2 endpoints, this will be automatically taken care of
        error_data = {"errors": {"geometry": [msg]}}
        return Response(
            data=error_data,
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

        planning_areas = PlanningArea.objects.list_by_user(user).filter(
            pk__in=planning_area_ids
        )

        # opens up a transaction.
        # any calls to the delete method will open a new checkpoint
        with transaction.atomic():
            results = [delete_planning_area_service(user, pa) for pa in planning_areas]

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
        serializer = PlanningAreaSerializer(
            instance=planning_area, context={"request": request}
        )
        return Response(serializer.data)
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
        planning_areas = PlanningArea.objects.list_for_api(user)
        serializer = ListPlanningAreaSerializer(
            instance=planning_areas, many=True, context={"request": request}
        )
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error: Failed to list planning areas: {e}")
        raise


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
        serializer = ScenarioSerializer(instance=scenario)
        return Response(serializer.data, content_type="application/json")
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
        response = HttpResponse(content_type="application/zip")
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
      configuration (dict): A JSON-friendly dict/string representing the scenario configuration (e.g., query parameters, weights).

    Optional params:
      notes (str): User-provided notes for this scenario.
      seed (int): An integer used to initialize the random number generator in Forsys. If
      provided, subsequent runs of Forsys for this scenario become reproducible, yielding the
      same results every time. If omitted, Forsys defaults to standard random behavior.
    """
    try:
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Validate request data via function's serializer
        serializer = ScenarioSerializer(data=request.data, context={"user": user})
        serializer.is_valid(raise_exception=True)

        # Ensure user can add a scenario in the specified planning area
        planning_area = serializer.validated_data.get("planning_area")
        if not PlanningAreaPermission.can_add_scenario(user, planning_area):
            return Response(
                {
                    "error": "User does not have permission to create scenarios from this Planning Area"
                },
                content_type="application/json",
                status=status.HTTP_403_FORBIDDEN,
            )

        # Retrieve the scenario configuration parsed by the serializer
        configuration = serializer.validated_data.get("configuration") or {}

        # Parse the seed from request.data
        seed_value = request.data.get("seed")
        if seed_value is not None:
            try:
                # Attempt to convert to integer
                seed_value = int(seed_value)
                configuration["seed"] = seed_value
            except ValueError:
                return Response(
                    {"error": "Seed must be an integer"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Validate scenarion configuration (e.g., check treatment ratio)
        result, reason = validate_scenario_treatment_ratio(
            planning_area,
            configuration,
        )
        if not result:
            return Response(
                {"reason": reason},
                content_type="application/json",
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create the scenario, passing in updated configuration
        scenario = create_scenario_service(
            user=request.user,
            **{
                **serializer.validated_data,
                "configuration": configuration,
            },
        )

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
            {"reason": reason},
            content_type="application/json",
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        logger.error("Error creating scenario: %s", e)
        raise


@api_view(["PATCH", "POST"])
def update_scenario(request: Request) -> Response:
    """
    Handles updates to a scenario's notes, name, or status fields.
    To date, these are the only fields that can be modified after a scenario is created.
    This can be also used to clear the notes field, but the name needs to be defined always.

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

        if "status" in body:
            new_status = body.get("status").upper()
            if (new_status is None) or (new_status not in dict(ScenarioStatus.choices)):
                return Response(
                    {"error": "Status is not valid."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            scenario.status = new_status
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
        serializer = ListScenarioSerializer(instance=scenarios, many=True)
        return Response(serializer.data)
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

        with transaction.atomic():
            [delete_scenario_service(user, s) for s in scenarios]

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


class PlanningAreaNotes(APIView):
    def post(self, request: Request, planningarea_pk: int):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        note_data = request.data.copy()
        note_data["planning_area"] = planningarea_pk

        try:
            serializer = PlanningAreaNoteSerializer(
                data=note_data, context={"user": user}
            )
            serializer.is_valid(raise_exception=True)

            if not PlanningAreaNotePermission.can_add(
                user, PlanningAreaNote(**serializer.validated_data)
            ):
                return Response(
                    {"error": "Authentication Required"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            new_note = serializer.save()
            out_serializer = PlanningAreaNoteSerializer(new_note)
            return Response(
                out_serializer.data,
                content_type="application/json",
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            logger.error("Error creating PlanningAreaNote: %s", e)
            raise

    def get(
        self, request: Request, planningarea_pk: int, planningareanote_pk: int = None
    ):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            if planningareanote_pk:
                planningareanote = PlanningAreaNote.objects.get(
                    id=planningareanote_pk, planning_area=planningarea_pk
                )
                if not PlanningAreaNotePermission.can_view(user, planningareanote):
                    return Response(status=status.HTTP_403_FORBIDDEN)
                serializer = PlanningAreaNoteListSerializer(
                    instance=planningareanote,
                    many=False,
                    context={"request": request, "user": user},
                )
                return Response(serializer.data)

            else:
                planningarea = PlanningArea.objects.get(id=planningarea_pk)
                # Note: all of the notes in this query will have the same PlanningArea, so for now,
                #  having view access to the PlanningArea means a viewer can see the notes,
                if not PlanningAreaPermission.can_view(user, planningarea):
                    return Response(status=status.HTTP_403_FORBIDDEN)

                notes = PlanningAreaNote.objects.filter(
                    planning_area=planningarea_pk
                ).order_by("-created_at")
                serializer = PlanningAreaNoteListSerializer(
                    instance=notes,
                    many=True,
                    context={"request": request, "user": user},
                )
                return Response(serializer.data)

        except PlanningArea.DoesNotExist as pa_dne:
            logger.error("Error getting notes for planning area: %s", pa_dne)
            return Response(
                {"message": "Planning area with this id could not be found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        except PlanningAreaNote.DoesNotExist as pan_dne:
            logger.error("Error getting notes for planning area: %s", pan_dne)
            return Response(
                {"message": "Planning area note could not be found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        except Exception as e:
            logger.error("Error getting notes for planning area: %s", e)
            raise

    def delete(self, request: Request, planningarea_pk: int, planningareanote_pk: int):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            note = get_object_or_404(PlanningAreaNote, pk=planningareanote_pk)

            if not PlanningAreaNotePermission.can_remove(user, note):
                return Response(
                    {"error": "User does not have access to delete this note."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if note.delete():
                return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            logger.error("Exception deleting planning area note: %s", e)
            raise
