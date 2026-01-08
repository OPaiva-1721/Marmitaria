from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permissão customizada para verificar se o usuário é admin.
    Um usuário é considerado admin se:
    - É superusuário, OU
    - Pertence ao grupo 'Admin'
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            print(f"[DEBUG IsAdmin] Usuário não autenticado: {request.user}")
            return False
        
        # Superusuário sempre tem permissão
        if request.user.is_superuser:
            print(f"[DEBUG IsAdmin] Usuário {request.user.username} é superusuário - PERMITIDO")
            return True
        
        # Verifica se pertence ao grupo Admin
        is_in_admin_group = request.user.groups.filter(name='Admin').exists()
        groups = list(request.user.groups.values_list('name', flat=True))
        print(f"[DEBUG IsAdmin] Usuário: {request.user.username}, Grupos: {groups}, É Admin: {is_in_admin_group}")
        return is_in_admin_group


class IsCaixa(permissions.BasePermission):
    """
    Permissão customizada para verificar se o usuário é caixa.
    Um usuário é considerado caixa se:
    - Pertence ao grupo 'Caixa'
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Verifica se pertence ao grupo Caixa
        return request.user.groups.filter(name='Caixa').exists()


class IsAdminOrCaixa(permissions.BasePermission):
    """
    Permissão para Admin ou Caixa.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusuário sempre tem permissão
        if request.user.is_superuser:
            return True
        
        # Verifica se pertence ao grupo Admin ou Caixa
        return request.user.groups.filter(name__in=['Admin', 'Caixa']).exists()

