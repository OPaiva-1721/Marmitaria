from django.apps import AppConfig


class OrdersConfig(AppConfig):
    name = 'orders'
    
    def ready(self):
        """
        Método chamado quando o app está pronto.
        Importa os signals para que sejam registrados e funcionem.
        """
        import orders.signals  # noqa