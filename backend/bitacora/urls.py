from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LogEntryViewSet

router = DefaultRouter()
router.register(r'bitacora', LogEntryViewSet, basename='bitacora')

urlpatterns = [
    path('', include(router.urls)),
]
