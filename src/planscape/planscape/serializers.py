from rest_framework import serializers


class LookupKeysSerializer(serializers.ListSerializer):
    child = serializers.CharField()


class TreatmentPrescriptionActionSerializer(serializers.Serializer):
    SEQUENCE = serializers.JSONField()
    SINGLE = serializers.JSONField()
