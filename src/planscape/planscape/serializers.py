from rest_framework import serializers


class BaseErrorMessageSerializer(serializers.Serializer):
    detail = serializers.CharField(help_text="Error details.")
