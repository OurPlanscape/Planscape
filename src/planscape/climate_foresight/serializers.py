from rest_framework import serializers
from climate_foresight.models import ClimateForesight
from planning.models import PlanningArea


class ClimateForesightSerializer(serializers.ModelSerializer):
    """Serializer for ClimateForesight model."""
    
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    created_at = serializers.DateTimeField(read_only=True)
    planning_area_name = serializers.CharField(source='planning_area.name', read_only=True)
    creator = serializers.SerializerMethodField()
    
    class Meta:
        model = ClimateForesight
        fields = [
            'id',
            'name',
            'planning_area',
            'planning_area_name',
            'user',
            'creator',
            'status',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'planning_area_name', 'creator']
    
    def get_creator(self, obj):
        """Return the user's full name."""
        if obj.user.first_name and obj.user.last_name:
            return f"{obj.user.first_name} {obj.user.last_name}"
        return obj.user.username
    
    def validate_planning_area(self, value):
        """Ensure the user has access to the planning area."""
        user = self.context['request'].user
        if not PlanningArea.objects.list_by_user(user).filter(id=value.id).exists():
            raise serializers.ValidationError("You don't have access to this planning area.")
        return value


class ClimateForesightListSerializer(serializers.ModelSerializer):
    """Serializer for listing ClimateForesight analyses."""
    
    planning_area_name = serializers.CharField(source='planning_area.name', read_only=True)
    creator = serializers.SerializerMethodField()
    
    class Meta:
        model = ClimateForesight
        fields = [
            'id',
            'name',
            'planning_area',
            'planning_area_name',
            'creator',
            'status',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'planning_area_name', 'creator']
    
    def get_creator(self, obj):
        """Return the user's full name."""
        if obj.user.first_name and obj.user.last_name:
            return f"{obj.user.first_name} {obj.user.last_name}"
        return obj.user.username