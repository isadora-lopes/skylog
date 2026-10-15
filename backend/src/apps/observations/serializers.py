from rest_framework import serializers

from .models import Observation, SkyCondition


class ObservationSerializer(serializers.ModelSerializer):
    _id = serializers.IntegerField(source="pk", read_only=True)
    location = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()

    class Meta:
        model = Observation
        fields = (
            "id",
            "_id",
            "object",
            "date",
            "equipment",
            "conditions",
            "location",
            "notes",
            "photo",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "_id", "photo", "created_at", "updated_at")

    def get_location(self, obj):
        return obj.location

    def get_photo(self, obj):
        if not obj.photo:
            return {"url": None, "filename": None}
        request = self.context.get("request")
        url = obj.photo.url
        if request is not None:
            url = request.build_absolute_uri(url)
        return {"url": url, "filename": obj.photo.name.split("/")[-1]}


class ObservationWriteSerializer(serializers.Serializer):
    object = serializers.CharField(max_length=120, required=False)
    date = serializers.DateField(required=False)
    equipment = serializers.CharField(max_length=100, required=False)
    conditions = serializers.ChoiceField(choices=SkyCondition.choices, required=False)
    location = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    lat = serializers.FloatField(required=False, allow_null=True)
    lon = serializers.FloatField(required=False, allow_null=True)
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")
    removePhoto = serializers.CharField(required=False, allow_blank=True)
