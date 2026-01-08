"""
URL configuration for marmitaria project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.http import Http404, HttpResponse
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.views import ProductViewSet, UserInfoView, UserRegistrationView, UserViewSet
from orders.views import OrderViewSet, OrderItemViewSet, bulk_delete_orders
from payments.views import PaymentViewSet
from expenses.views import ExpenseViewSet
import os
from pathlib import Path

def serve_static(request, path):
    """View customizada para servir arquivos estáticos com melhor debug"""
    print(f"[DEBUG STATIC] serve_static CHAMADA! path={path}")
    print(f"[DEBUG STATIC] request.path={request.path}")
    import sys
    
    # Determinar static_root baseado no modo
    if getattr(sys, 'frozen', False):
        # Modo executável: usar STATIC_ROOT que aponta para sys._MEIPASS/staticfiles
        static_root = Path(settings.STATIC_ROOT)
        print(f"[DEBUG STATIC] Modo executável - STATIC_ROOT: {static_root}")
    else:
        # Modo desenvolvimento: tentar STATIC_ROOT primeiro, depois STATICFILES_DIRS
        static_root = Path(settings.STATIC_ROOT)
        if not static_root.exists() and settings.STATICFILES_DIRS:
            # Se STATIC_ROOT não existe, tentar primeiro diretório de STATICFILES_DIRS
            static_root = Path(settings.STATICFILES_DIRS[0])
        print(f"[DEBUG STATIC] Modo desenvolvimento - STATIC_ROOT: {static_root}")
    
    file_path = static_root / path
    print(f"[DEBUG STATIC] Procurando arquivo: {file_path}")
    print(f"[DEBUG STATIC] path recebido: {path}")
    
    if file_path.exists() and file_path.is_file():
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            
            print(f"[DEBUG STATIC] Arquivo encontrado e servido: {file_path}")
            
            # Determinar content-type
            content_type = 'application/octet-stream'
            if path.endswith('.js'):
                content_type = 'application/javascript'
            elif path.endswith('.css'):
                content_type = 'text/css'
            elif path.endswith('.html'):
                content_type = 'text/html'
            elif path.endswith('.png'):
                content_type = 'image/png'
            elif path.endswith('.jpg') or path.endswith('.jpeg'):
                content_type = 'image/jpeg'
            elif path.endswith('.svg'):
                content_type = 'image/svg+xml'
            
            return HttpResponse(content, content_type=content_type)
        except Exception as e:
            print(f"[ERRO STATIC] Erro ao servir arquivo estático {path}: {e}")
            import traceback
            print(f"[ERRO STATIC] Traceback: {traceback.format_exc()}")
            raise Http404(f"Erro ao ler arquivo: {path}")
    else:
        print(f"[DEBUG STATIC] Arquivo NÃO encontrado: {file_path}")
        print(f"[DEBUG STATIC] static_root existe: {static_root.exists()}")
        print(f"[DEBUG STATIC] file_path existe: {file_path.exists()}")
        if static_root.exists():
            print(f"[DEBUG STATIC] Conteúdo de static_root: {list(static_root.iterdir())}")
            assets_path = static_root / 'assets'
            if assets_path.exists():
                print(f"[DEBUG STATIC] Conteúdo de assets: {list(assets_path.iterdir())}")
        raise Http404(f"Arquivo não encontrado: {path}")

# Configuração do router do DRF
router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'users', UserViewSet, basename='user')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'order-items', OrderItemViewSet, basename='order-item')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'expenses', ExpenseViewSet, basename='expense')

# Log para debug (apenas em modo executável)
import sys
if getattr(sys, 'frozen', False):
    print(f"[DEBUG] STATIC_ROOT configurado: {settings.STATIC_ROOT}")
    from pathlib import Path
    static_path = Path(settings.STATIC_ROOT)
    print(f"[DEBUG] STATIC_ROOT existe: {static_path.exists()}")
    if static_path.exists():
        print(f"[DEBUG] Conteúdo de STATIC_ROOT: {list(static_path.iterdir())}")
        assets_path = static_path / 'assets'
        if assets_path.exists():
            print(f"[DEBUG] Conteúdo de assets: {list(assets_path.iterdir())}")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    # Autenticação JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Registro de usuário
    path('api/register/', UserRegistrationView.as_view(), name='user_register'),
    # Informações do usuário
    path('api/user/', UserInfoView.as_view(), name='user_info'),
    # Bulk delete de pedidos (endpoint alternativo)
    path('api/orders/bulk_delete/', bulk_delete_orders, name='bulk_delete_orders'),
    # Relatórios
    path('api/reports/', include('reports.urls')),
    # Servir arquivos estáticos do React (usando view customizada)
    re_path(r'^static/(?P<path>.*)$', serve_static),
    # Servir arquivos de mídia
    re_path(r'^media/(?P<path>.*)$', serve, {
        'document_root': settings.MEDIA_ROOT,
        'show_indexes': False,
    }),
    # Todas as outras rotas vão para o index.html do React (SPA)
    re_path(r'^(?!api|admin|static|media).*$', TemplateView.as_view(template_name='index.html')),
]

# Em modo executável, garantir que arquivos estáticos sejam servidos
# (não usar static() helper pois não funciona bem com PyInstaller)
if not settings.DEBUG or getattr(sys, 'frozen', False):
    # Já configurado acima com re_path
    pass

# Servir arquivos de mídia em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
