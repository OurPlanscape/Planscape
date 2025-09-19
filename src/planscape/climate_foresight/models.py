from django.contrib.auth.models import User
from django.db import models
from core.models import CreatedAtMixin
from planning.models import PlanningArea


class ClimateForesightManager(models.Manager):
    def list_by_user(self, user: User):
        """Returns ClimateForesight analyses for a given user."""
        return self.filter(user=user)
    
    def list_by_planning_area(self, planning_area: PlanningArea, user: User):
        """Returns ClimateForesight analyses for a given planning area and user."""
        return self.filter(planning_area=planning_area, user=user)


class ClimateForesight(CreatedAtMixin, models.Model):
    """Climate Foresight analysis model."""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('running', 'Running'),
        ('done', 'Done'),
    ]
    
    planning_area = models.ForeignKey(
        PlanningArea,
        on_delete=models.CASCADE,
        related_name='climate_foresight_analyses',
        help_text="Planning area this analysis belongs to"
    )
    
    name = models.CharField(
        max_length=255,
        help_text="Name of the climate foresight analysis"
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='climate_foresight_analyses',
        help_text="User who created this analysis"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        help_text="Current status of the analysis"
    )
    
    objects = ClimateForesightManager()
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Climate Foresight Analysis"
        verbose_name_plural = "Climate Foresight Analyses"
        
    def __str__(self):
        return f"{self.name} - {self.planning_area.name}"