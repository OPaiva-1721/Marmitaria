"""
Script para iniciar o servidor Django.
Usado pelo executável para iniciar o servidor automaticamente.
"""
import os
import sys
from pathlib import Path

# Configurar caminhos ANTES de importar Django
if getattr(sys, 'frozen', False):
    # Se está rodando como executável (PyInstaller)
    # sys._MEIPASS é o diretório temporário onde PyInstaller extrai os arquivos
    BASE_DIR = Path(sys._MEIPASS)
    EXE_DIR = Path(sys.executable).parent
    
    # Criar diretórios necessários na pasta do executável
    (EXE_DIR / 'db').mkdir(exist_ok=True)
    (EXE_DIR / 'media').mkdir(exist_ok=True)
    
    # Configurar caminho do banco de dados na pasta do executável
    os.environ['DB_PATH'] = str(EXE_DIR / 'db' / 'db.sqlite3')
    
    # Adicionar o diretório base ao Python path
    sys.path.insert(0, str(BASE_DIR))
else:
    # Se está rodando como script normal
    BASE_DIR = Path(__file__).resolve().parent
    EXE_DIR = BASE_DIR

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'marmitaria.settings')

# Importar Django após configurar os caminhos
import django
django.setup()

# Importar módulos do Django
import webbrowser
import threading
import time

def open_browser():
    """Abre o navegador após um pequeno delay"""
    time.sleep(2)
    try:
        webbrowser.open('http://localhost:8000')
    except Exception as e:
        print(f"Erro ao abrir navegador: {e}")
        print("Abra manualmente: http://localhost:8000")

if __name__ == '__main__':
    print("=" * 50)
    print("Sistema Marmitaria - Iniciando servidor...")
    print("=" * 50)
    print("\nServidor iniciando em: http://localhost:8000")
    print("Pressione Ctrl+C para parar o servidor\n")
    
    # Abrir navegador automaticamente
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    # Iniciar servidor na porta 8000
    try:
        # Usar o comando runserver diretamente
        from django.core.management import call_command
        call_command('runserver', '0.0.0.0:8000', use_reloader=False)
    except KeyboardInterrupt:
        print("\n\nServidor encerrado pelo usuário.")
        sys.exit(0)
    except Exception as e:
        print(f"\n\nERRO ao iniciar servidor: {e}")
        print("\nPressione Enter para sair...")
        input()
        sys.exit(1)
