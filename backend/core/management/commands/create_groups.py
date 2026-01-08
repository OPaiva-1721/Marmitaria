from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from core.models import Product
from orders.models import Order, OrderItem
from payments.models import Payment


class Command(BaseCommand):
    help = 'Cria os grupos de usuários (Admin e Caixa) com suas permissões'

    def handle(self, *args, **options):
        # Criar grupo Admin
        admin_group, created = Group.objects.get_or_create(name='Admin')
        if created:
            self.stdout.write(self.style.SUCCESS('Grupo Admin criado'))
        else:
            self.stdout.write('Grupo Admin já existe')

        # Criar grupo Caixa
        caixa_group, created = Group.objects.get_or_create(name='Caixa')
        if created:
            self.stdout.write(self.style.SUCCESS('Grupo Caixa criado'))
        else:
            self.stdout.write('Grupo Caixa já existe')

        # Permissões para Admin (todas as permissões)
        admin_permissions = Permission.objects.all()
        admin_group.permissions.set(admin_permissions)
        self.stdout.write(self.style.SUCCESS(f'Permissões do Admin configuradas ({admin_permissions.count()} permissões)'))

        # Permissões para Caixa (apenas visualização e criação de pedidos/pagamentos)
        caixa_permissions = Permission.objects.filter(
            codename__in=[
                'view_product', 'view_order', 'add_order', 'change_order', 'view_orderitem', 'add_orderitem',
                'view_payment', 'add_payment', 'change_payment'
            ]
        )
        caixa_group.permissions.set(caixa_permissions)
        self.stdout.write(self.style.SUCCESS(f'Permissões do Caixa configuradas ({caixa_permissions.count()} permissões)'))

        self.stdout.write(self.style.SUCCESS('\nGrupos criados com sucesso!'))
        
        # Criar admin padrão automaticamente
        self.stdout.write('\nCriando admin padrão...')
        try:
            from django.core.management import call_command
            call_command('create_default_admin', verbosity=0)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Erro ao criar admin padrão: {e}'))
        
        self.stdout.write('\nPara criar mais usuários:')
        self.stdout.write('1. Acesse o admin: http://localhost:8000/admin/')
        self.stdout.write('2. Ou use: python manage.py create_default_admin')

