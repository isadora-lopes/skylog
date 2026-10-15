from django.db.models import Max
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.users.models import User

from .models import Observation


def _refresh_user_stats(user_id: int):
    total = Observation.objects.filter(user_id=user_id).count()
    last_date = Observation.objects.filter(user_id=user_id).aggregate(last=Max("date"))["last"]
    User.objects.filter(pk=user_id).update(total_observations=total, last_observation=last_date)


@receiver(post_save, sender=Observation)
def observation_saved(sender, instance, **kwargs):
    _refresh_user_stats(instance.user_id)


@receiver(post_delete, sender=Observation)
def observation_deleted(sender, instance, **kwargs):
    _refresh_user_stats(instance.user_id)
