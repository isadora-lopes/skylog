from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken

from .models import User
from .serializers import ProfileUpdateSerializer, RegisterSerializer


def _token_for_user(user):
    token = AccessToken.for_user(user)
    return str(token)


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        msg = next(iter(serializer.errors.values()))[0]
        return Response({"success": False, "message": str(msg)}, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"]
    if User.objects.filter(email=email).exists():
        return Response(
            {"success": False, "message": "Este e-mail já está cadastrado."},
            status=status.HTTP_409_CONFLICT,
        )

    user = serializer.save()
    return Response(
        {
            "success": True,
            "message": "Conta criada com sucesso!",
            "token": _token_for_user(user),
            "user": user.to_public(),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    email = (request.data.get("email") or "").lower().strip()
    password = request.data.get("password")

    if not email or not password:
        return Response(
            {"success": False, "message": "E-mail e senha são obrigatórios."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(request, email=email, password=password)
    if not user:
        return Response(
            {"success": False, "message": "E-mail ou senha incorretos."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    return Response(
        {
            "success": True,
            "message": "Login realizado com sucesso!",
            "token": _token_for_user(user),
            "user": user.to_public(),
        }
    )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def me_profile_view(request):
    if request.method == "GET":
        return Response({"success": True, "user": request.user.to_public()})
    serializer = ProfileUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        msg = next(iter(serializer.errors.values()))[0]
        return Response({"success": False, "message": str(msg)}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    name = serializer.validated_data.get("name")
    new_password = serializer.validated_data.get("new_password")
    current_password = serializer.validated_data.get("current_password")

    if name:
        user.name = name

    if new_password:
        if not current_password or not user.check_password(current_password):
            return Response(
                {"success": False, "message": "Senha atual incorreta."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        user.set_password(new_password)

    user.save()
    return Response({"success": True, "message": "Perfil atualizado.", "user": user.to_public()})

