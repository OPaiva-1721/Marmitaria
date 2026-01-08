# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file para criar executável Windows (onefile)
"""

block_cipher = None

a = Analysis(
    ['run_server.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('templates', 'templates'),
        ('staticfiles', 'staticfiles'),
        ('marmitaria', 'marmitaria'),
        ('core', 'core'),
        ('orders', 'orders'),
        ('payments', 'payments'),
        ('expenses', 'expenses'),
        ('reports', 'reports'),
    ],
    hiddenimports=[
        'django',
        'django.core',
        'django.core.management',
        'django.core.management.commands',
        'django.core.management.commands.runserver',
        'django.contrib',
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'rest_framework',
        'rest_framework_simplejwt',
        'corsheaders',
        'core',
        'orders',
        'payments',
        'expenses',
        'reports',
        'PIL',
        'PIL._tkinter_finder',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='Marmitaria',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
