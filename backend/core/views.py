from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.db import IntegrityError
from .models import Product
from .serializers import (
    ProductSerializer, 
    UserRegistrationSerializer,
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer
)
from .permissions import IsAdmin, IsAdminOrCaixa
from django.contrib.auth.models import User
from .utils import (
    success_response,
    error_response,
    validation_error_response,
    not_found_response,
    permission_denied_response
)


class UserInfoView(APIView):
    """
    View para retornar informações do usuário autenticado.
    
    Endpoint: GET /api/user/
    
    Retorna informações do usuário logado incluindo:
    - ID, username, email
    - Grupos de permissão
    - Flags de admin e caixa
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Retorna informações do usuário autenticado.
        
        Returns:
            Response com dados do usuário
        """
        print(f"[DEBUG UserInfoView] Requisição recebida")
        print(f"[DEBUG UserInfoView] Usuário autenticado: {request.user.is_authenticated if request.user else False}")
        print(f"[DEBUG UserInfoView] Usuário: {request.user}")
        if request.user and request.user.is_authenticated:
            print(f"[DEBUG UserInfoView] Username: {request.user.username}")
        else:
            print(f"[DEBUG UserInfoView] ERRO: Usuário não autenticado!")
            print(f"[DEBUG UserInfoView] Headers Authorization: {request.META.get('HTTP_AUTHORIZATION', 'NÃO ENCONTRADO')}")
        
        user = request.user
        groups = list(user.groups.values_list('name', flat=True))
        
        # Um usuário é admin se for superuser OU estiver no grupo Admin
        is_admin = user.is_superuser or 'Admin' in groups
        # Um usuário é caixa se estiver no grupo Caixa (mas não é admin)
        is_caixa = 'Caixa' in groups and not is_admin
        
        return success_response(
            data={
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_superuser': user.is_superuser,
                'groups': groups,
                'is_admin': is_admin,
                'is_caixa': is_caixa,
            }
        )


class UserRegistrationView(APIView):
    """
    View para registro de novos usuários.
    
    Endpoint: POST /api/register/
    
    Qualquer pessoa pode se registrar (sem autenticação necessária).
    Novos usuários são automaticamente adicionados ao grupo 'Caixa'.
    
    Body esperado:
    {
        "username": "usuario",
        "email": "usuario@example.com",
        "password": "senha123",
        "password_confirm": "senha123",
        "first_name": "Nome",
        "last_name": "Sobrenome"
    }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Registra um novo usuário no sistema.
        
        Returns:
            Response com mensagem de sucesso e username
        """
        # Garantir que grupos existam antes de registrar
        from django.contrib.auth.models import Group
        from django.core.management import call_command
        
        try:
            # Verificar se grupos existem, se não, criar
            if not Group.objects.filter(name__in=['Admin', 'Caixa']).exists():
                call_command('create_groups', verbosity=0)
        except Exception:
            # Se falhar, continua mesmo assim
            pass
        
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                return success_response(
                    data={'username': user.username},
                    message='Usuário criado com sucesso!',
                    status_code=status.HTTP_201_CREATED
                )
            except IntegrityError:
                return error_response(
                    message='Nome de usuário ou email já está em uso',
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                return error_response(
                    message=f'Erro ao criar usuário: {str(e)}',
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return validation_error_response(
            errors=serializer.errors,
            message='Erro de validação ao criar usuário'
        )


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar produtos.
    
    Endpoints:
    - GET /api/products/ - Listar produtos
    - POST /api/products/ - Criar produto (Admin apenas)
    - GET /api/products/{id}/ - Detalhes do produto
    - PUT/PATCH /api/products/{id}/ - Atualizar produto (Admin apenas)
    - DELETE /api/products/{id}/ - Deletar produto (Admin apenas)
    
    Permissões:
    - Admin: pode criar, editar, deletar e listar todos os produtos
    - Caixa: pode apenas listar produtos disponíveis (read-only)
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, IsAdminOrCaixa]
    
    def get_queryset(self):
        """
        Retorna produtos baseado no tipo de usuário.
        
        - Admin: vê todos os produtos (disponíveis e indisponíveis)
        - Caixa: vê apenas produtos disponíveis
        
        Returns:
            QuerySet de produtos ordenados por nome
        """
        # Admin vê todos os produtos
        if self.request.user.is_superuser or self.request.user.groups.filter(name='Admin').exists():
            return Product.objects.all().order_by('name')
        # Caixa vê apenas produtos disponíveis
        return Product.objects.filter(is_available=True).order_by('name')
    
    def get_permissions(self):
        """
        Retorna permissões baseadas na ação.
        
        - create, update, destroy: Apenas Admin
        - list, retrieve: Admin e Caixa
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Apenas Admin pode criar, editar ou deletar
            permission_classes = [IsAuthenticated, IsAdmin]
        else:
            # Admin e Caixa podem listar e ver detalhes
            permission_classes = [IsAuthenticated, IsAdminOrCaixa]
        
        return [permission() for permission in permission_classes]
    
    def create(self, request, *args, **kwargs):
        """
        Cria um novo produto.
        
        Apenas Admin pode criar produtos.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            product = serializer.save()
            return success_response(
                data=ProductSerializer(product).data,
                message='Produto criado com sucesso!',
                status_code=status.HTTP_201_CREATED
            )
        except IntegrityError:
            return error_response(
                message='Erro ao criar produto. Verifique se os dados estão corretos.',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao criar produto: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """
        Atualiza um produto existente.
        
        Apenas Admin pode atualizar produtos.
        """
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            return error_response(
                message=f'Erro ao atualizar produto: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Deleta um produto.
        
        Apenas Admin pode deletar produtos.
        """
        try:
            product = self.get_object()
            product.delete()
            return success_response(
                message='Produto deletado com sucesso!',
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao deletar produto: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar usuários (apenas Admin).
    
    Endpoints:
    - GET /api/users/ - Listar usuários
    - POST /api/users/ - Criar usuário
    - GET /api/users/{id}/ - Detalhes do usuário
    - PUT/PATCH /api/users/{id}/ - Atualizar usuário
    - DELETE /api/users/{id}/ - Deletar usuário
    
    Permissões:
    - Apenas Admin pode acessar todos os endpoints
    """
    queryset = User.objects.all().order_by('username')
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_serializer_class(self):
        """
        Retorna o serializer apropriado baseado na ação.
        """
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def list(self, request, *args, **kwargs):
        """
        Lista todos os usuários.
        """
        print(f"[DEBUG UserViewSet.list] Requisição recebida")
        print(f"[DEBUG UserViewSet.list] Usuário autenticado: {request.user.is_authenticated if request.user else False}")
        print(f"[DEBUG UserViewSet.list] Usuário: {request.user}")
        if request.user and request.user.is_authenticated:
            print(f"[DEBUG UserViewSet.list] Username: {request.user.username}")
            print(f"[DEBUG UserViewSet.list] is_superuser: {request.user.is_superuser}")
            print(f"[DEBUG UserViewSet.list] Grupos: {list(request.user.groups.values_list('name', flat=True))}")
        try:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return success_response(
                data=serializer.data,
                message='Usuários listados com sucesso!'
            )
        except Exception as e:
            print(f"[DEBUG UserViewSet.list] Erro: {str(e)}")
            return error_response(
                message=f'Erro ao listar usuários: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retorna detalhes de um usuário.
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return success_response(
                data=serializer.data,
                message='Usuário encontrado!'
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao buscar usuário: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def create(self, request, *args, **kwargs):
        """
        Cria um novo usuário.
        """
        print(f"[DEBUG UserViewSet.create] Requisição recebida")
        print(f"[DEBUG UserViewSet.create] Usuário autenticado: {request.user.is_authenticated if request.user else False}")
        print(f"[DEBUG UserViewSet.create] Usuário: {request.user}")
        if request.user and request.user.is_authenticated:
            print(f"[DEBUG UserViewSet.create] Username: {request.user.username}")
            print(f"[DEBUG UserViewSet.create] is_superuser: {request.user.is_superuser}")
            print(f"[DEBUG UserViewSet.create] Grupos: {list(request.user.groups.values_list('name', flat=True))}")
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                return success_response(
                    data={'id': user.id, 'username': user.username},
                    message='Usuário criado com sucesso!',
                    status_code=status.HTTP_201_CREATED
                )
            except IntegrityError:
                return error_response(
                    message='Nome de usuário ou email já está em uso',
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                return error_response(
                    message=f'Erro ao criar usuário: {str(e)}',
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return validation_error_response(
            errors=serializer.errors,
            message='Erro de validação ao criar usuário'
        )
    
    def update(self, request, *args, **kwargs):
        """
        Atualiza um usuário.
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=False)
            if serializer.is_valid():
                user = serializer.save()
                return success_response(
                    data={'id': user.id, 'username': user.username},
                    message='Usuário atualizado com sucesso!'
                )
            return validation_error_response(
                errors=serializer.errors,
                message='Erro de validação ao atualizar usuário'
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao atualizar usuário: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def partial_update(self, request, *args, **kwargs):
        """
        Atualiza parcialmente um usuário.
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            if serializer.is_valid():
                user = serializer.save()
                return success_response(
                    data={'id': user.id, 'username': user.username},
                    message='Usuário atualizado com sucesso!'
                )
            return validation_error_response(
                errors=serializer.errors,
                message='Erro de validação ao atualizar usuário'
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao atualizar usuário: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Deleta um usuário.
        
        Não permite deletar o próprio usuário.
        """
        try:
            instance = self.get_object()
            
            # Não permitir deletar o próprio usuário
            if instance.id == request.user.id:
                return error_response(
                    message='Você não pode deletar seu próprio usuário',
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            username = instance.username
            instance.delete()
            return success_response(
                message=f'Usuário "{username}" deletado com sucesso!',
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao deletar usuário: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
