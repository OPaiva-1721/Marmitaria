"""
Aplicativo Desktop Marmitaria
Inicia Django em background e abre janela PyQt6 com WebView
"""
import os
import sys
import threading
import time
import socket
from pathlib import Path

# Configurar caminhos ANTES de importar Django
if getattr(sys, 'frozen', False):
    # Se está rodando como executável (PyInstaller)
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
from django.core.management import call_command
from django.contrib.auth.models import User, Group
from django.db import connection

# Importar PyQt6
from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget, QMessageBox
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtCore import QUrl, QTimer, pyqtSignal, QObject
from PyQt6.QtGui import QIcon


class DjangoServer(QObject):
    """Classe para gerenciar o servidor Django em background"""
    server_ready = pyqtSignal()
    server_error = pyqtSignal(str)
    
    def __init__(self):
        super().__init__()
        self.server_thread = None
        self.server_running = False
    
    def start_server(self):
        """Inicia o servidor Django em uma thread separada"""
        def run_server():
            try:
                # Executar migrações se necessário
                call_command('migrate', '--noinput', verbosity=0)
                
                # Criar grupos se não existirem
                try:
                    call_command('create_groups', verbosity=0)
                except Exception as e:
                    print(f"Aviso ao criar grupos: {e}")
                
                # Criar admin padrão se não existir
                try:
                    if not User.objects.filter(username='admin').exists():
                        call_command('create_default_admin', verbosity=0)
                except Exception as e:
                    print(f"Aviso ao criar admin: {e}")
                
                # Aguardar um pouco para garantir que tudo está pronto
                time.sleep(0.5)
                
                # Iniciar servidor Django
                self.server_running = True
                self.server_ready.emit()
                
                # Executar servidor (bloqueia até ser interrompido)
                call_command('runserver', '127.0.0.1:8000', use_reloader=False, verbosity=0)
            except Exception as e:
                self.server_error.emit(str(e))
                self.server_running = False
        
        self.server_thread = threading.Thread(target=run_server, daemon=True)
        self.server_thread.start()
    
    def stop_server(self):
        """Para o servidor Django"""
        self.server_running = False


class MainWindow(QMainWindow):
    """Janela principal do aplicativo"""
    
    def __init__(self):
        super().__init__()
        self.django_server = DjangoServer()
        self.setup_ui()
        self.setup_server()
    
    def setup_ui(self):
        """Configura a interface do usuário"""
        self.setWindowTitle("Marmitaria - Sistema de Gerenciamento")
        self.setGeometry(100, 100, 1200, 800)
        
        # Widget central
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Layout
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # WebView para carregar o frontend
        self.webview = QWebEngineView()
        layout.addWidget(self.webview)
        
        # Conectar sinais do servidor Django
        self.django_server.server_ready.connect(self.on_server_ready)
        self.django_server.server_error.connect(self.on_server_error)
    
    def setup_server(self):
        """Inicia o servidor Django"""
        # Mostrar mensagem de carregamento
        self.webview.setHtml("""
            <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                        }
                        .loader {
                            text-align: center;
                        }
                        .spinner {
                            border: 4px solid rgba(255, 255, 255, 0.3);
                            border-top: 4px solid white;
                            border-radius: 50%;
                            width: 50px;
                            height: 50px;
                            animation: spin 1s linear infinite;
                            margin: 0 auto 20px;
                        }
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                </head>
                <body>
                    <div class="loader">
                        <div class="spinner"></div>
                        <h2>Iniciando Sistema Marmitaria...</h2>
                        <p>Aguarde enquanto o servidor é iniciado.</p>
                    </div>
                </body>
            </html>
        """)
        
        # Iniciar servidor Django
        self.django_server.start_server()
    
    def check_server_ready(self, attempts=0):
        """Verifica se o servidor está pronto"""
        max_attempts = 30
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('127.0.0.1', 8000))
            sock.close()
            if result == 0:
                # Servidor está pronto
                self.load_frontend()
            elif attempts < max_attempts:
                # Tentar novamente após 500ms
                QTimer.singleShot(500, lambda: self.check_server_ready(attempts + 1))
            else:
                self.show_error("Timeout: O servidor não iniciou a tempo.")
        except Exception as e:
            if attempts < max_attempts:
                QTimer.singleShot(500, lambda: self.check_server_ready(attempts + 1))
            else:
                self.show_error(f"Erro ao verificar servidor: {e}")
    
    def on_server_ready(self):
        """Chamado quando o servidor Django está pronto"""
        # Verificar se o servidor está realmente acessível
        QTimer.singleShot(500, lambda: self.check_server_ready())
    
    def load_frontend(self):
        """Carrega o frontend no WebView"""
        try:
            # Carregar o frontend local
            url = QUrl("http://127.0.0.1:8000")
            self.webview.setUrl(url)
        except Exception as e:
            self.show_error(f"Erro ao carregar frontend: {e}")
    
    def on_server_error(self, error_msg):
        """Chamado quando há erro no servidor Django"""
        self.show_error(f"Erro ao iniciar servidor:\n{error_msg}")
    
    def show_error(self, message):
        """Mostra uma mensagem de erro"""
        msg_box = QMessageBox(self)
        msg_box.setIcon(QMessageBox.Icon.Critical)
        msg_box.setWindowTitle("Erro")
        msg_box.setText(message)
        msg_box.exec()
    
    def closeEvent(self, event):
        """Chamado quando a janela é fechada"""
        # Parar servidor Django
        self.django_server.stop_server()
        event.accept()


def main():
    """Função principal"""
    # Criar aplicação Qt
    app = QApplication(sys.argv)
    
    # Criar e mostrar janela principal
    window = MainWindow()
    window.show()
    
    # Executar loop de eventos
    sys.exit(app.exec())


if __name__ == '__main__':
    main()
