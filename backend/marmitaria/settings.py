"""
Django settings for marmitaria project.

Este arquivo contém todas as configurações do projeto Django.
Para produção, configure as variáveis de ambiente conforme backend/env.example
"""

from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
# Use variável de ambiente ou fallback para desenvolvimento
import os
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-_ly%usxi32j)^3-@q63rk*ljxt0xj3t(m0j78*oz11159x_964')

# SECURITY WARNING: don't run with debug turned on in production!
# Em modo executável, desabilitar DEBUG para evitar que runserver sirva arquivos estáticos automaticamente
import sys
if getattr(sys, 'frozen', False):
    DEBUG = False  # Modo executável: usar nossa view customizada para arquivos estáticos
else:
    # Em desenvolvimento, usar variável de ambiente ou padrão True
    DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 'yes')

# ALLOWED_HOSTS: usar variável de ambiente ou padrão
ALLOWED_HOSTS_STR = os.environ.get('ALLOWED_HOSTS', '*')
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_STR.split(',')] if ALLOWED_HOSTS_STR else ['*']


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    # Local apps
    'core',
    'orders',
    'payments',
    'expenses',
    'reports',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'marmitaria.urls'

# Configurar diretórios de templates
# Se estiver rodando como executável, templates estão em sys._MEIPASS
import sys
if getattr(sys, 'frozen', False):
    TEMPLATE_DIR = Path(sys._MEIPASS) / 'templates'
else:
    TEMPLATE_DIR = BASE_DIR / 'templates'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [TEMPLATE_DIR],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'marmitaria.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

# Configurar caminho do banco de dados
# Se estiver rodando como executável, usar pasta 'db' na mesma pasta do .exe
import os
if os.environ.get('DB_PATH'):
    DB_PATH = Path(os.environ['DB_PATH'])
else:
    DB_PATH = BASE_DIR / 'db.sqlite3'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': DB_PATH,
    }
}


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'pt-br'

TIME_ZONE = 'America/Sao_Paulo'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'

# Configuração de arquivos estáticos
# Se estiver rodando como executável, os arquivos estão em sys._MEIPASS
import sys
if getattr(sys, 'frozen', False):
    # Executável: arquivos estão no diretório temporário do PyInstaller
    # PyInstaller extrai tudo para sys._MEIPASS
    STATIC_ROOT = str(Path(sys._MEIPASS) / 'staticfiles')
    STATICFILES_DIRS = []
    # Desabilitar o comportamento padrão do staticfiles em modo executável
    # Vamos servir manualmente através da view customizada
    STATICFILES_STORAGE = None
    # Mídia na pasta do executável
    MEDIA_ROOT = str(Path(sys.executable).parent / 'media')
else:
    # Desenvolvimento: usar pasta normal
    STATIC_ROOT = str(BASE_DIR / 'staticfiles')
    STATICFILES_DIRS = [
        str(BASE_DIR.parent / 'frontend' / 'dist'),
    ]
    MEDIA_ROOT = str(BASE_DIR / 'media')

# Configuração de arquivos de mídia
MEDIA_URL = '/media/'


# JWT Settings
from datetime import timedelta

# Configurações JWT com suporte a variáveis de ambiente
JWT_ACCESS_HOURS = int(os.environ.get('JWT_ACCESS_TOKEN_LIFETIME_HOURS', '8'))
JWT_REFRESH_DAYS = int(os.environ.get('JWT_REFRESH_TOKEN_LIFETIME_DAYS', '1'))

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=JWT_ACCESS_HOURS),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=JWT_REFRESH_DAYS),
    'ROTATE_REFRESH_TOKENS': True,
}

# CORS configuration for React
# Usar variável de ambiente ou padrão
CORS_ORIGINS_STR = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_STR.split(',')] if CORS_ORIGINS_STR else []

CORS_ALLOW_CREDENTIALS = True

# REST Framework configuration
# Configurações do Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'EXCEPTION_HANDLER': 'core.middleware.custom_exception_handler',
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
}
