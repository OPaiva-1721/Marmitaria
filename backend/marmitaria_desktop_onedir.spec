# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file para criar executável Linux (onedir)
"""

block_cipher = None

a = Analysis(
    ['app_desktop.py'],
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
        'django.core.management.commands.migrate',
        'django.contrib',
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.auth.models',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'rest_framework',
        'rest_framework_simplejwt',
        'corsheaders',
        'core',
        'core.management',
        'core.management.commands',
        'core.management.commands.create_groups',
        'core.management.commands.create_default_admin',
        'orders',
        'payments',
        'expenses',
        'reports',
        'PIL',
        'PIL._tkinter_finder',
        'PyQt6',
        'PyQt6.QtCore',
        'PyQt6.QtGui',
        'PyQt6.QtWidgets',
        'PyQt6.QtWebEngineWidgets',
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
    [],
    exclude_binaries=True,
    name='Marmitaria',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='Marmitaria',
)
