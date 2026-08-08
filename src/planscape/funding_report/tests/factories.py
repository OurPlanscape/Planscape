import factory

from planning.tests.factories import ScenarioFactory

from funding_report.models import (
    FundingOpportunityReport,
    FundingOpportunityReportInvite,
    FundingOpportunityReportSharedLink,
    FundingOpportunityReportStatus,
)


class FundingOpportunityReportFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = FundingOpportunityReport

    scenario = factory.SubFactory(ScenarioFactory)
    created_by = factory.SelfAttribute("scenario.user")
    status = FundingOpportunityReportStatus.SUCCESS
    results = factory.LazyFunction(dict)


class FundingOpportunityReportInviteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = FundingOpportunityReportInvite

    report = factory.SubFactory(FundingOpportunityReportFactory)
    inviter = factory.SelfAttribute("report.created_by")
    invitee_email = factory.Faker("ascii_email")


class FundingOpportunityReportSharedLinkFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = FundingOpportunityReportSharedLink

    report = factory.SubFactory(FundingOpportunityReportFactory)
    configuration = factory.LazyFunction(
        lambda: {"aet": "10", "total_flame_severity": "high"}
    )
