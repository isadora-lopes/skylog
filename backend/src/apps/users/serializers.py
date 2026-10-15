from django.contrib.auth import password_validation
from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("name", "email", "password")

    def validate_email(self, value):
        return value.lower().strip()

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class ProfileUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80, required=False)
    current_password = serializers.CharField(write_only=True, required=False)
    new_password = serializers.CharField(write_only=True, min_length=8, required=False)
