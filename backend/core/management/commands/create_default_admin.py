from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group


class Command(BaseCommand):
    help = 'Cria um usuário admin padrão (admin/admin123) se não existir'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default='admin',
            help='Nome de usuário do admin padrão (padrão: admin)',
        )
        parser.add_argument(
            '--password',
            type=str,
            default='admin123',
            help='Senha do admin padrão (padrão: admin123)',
        )
        parser.add_argument(
            '--email',
            type=str,
            default='admin@marmitaria.com',
            help='Email do admin padrão',
        )

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']

        # Verificar se o usuário já existe
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'Usuário "{username}" já existe. Pulando criação.')
            )
            return

        # Criar usuário admin
        admin_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=True,
            is_superuser=True,
            first_name='Administrador',
            last_name='Sistema'
        )

        # Adicionar ao grupo Admin se existir
        try:
            admin_group = Group.objects.get(name='Admin')
            admin_user.groups.add(admin_group)
            self.stdout.write(
                self.style.SUCCESS(f'Usuário "{username}" adicionado ao grupo Admin')
            )
        except Group.DoesNotExist:
            self.stdout.write(
                self.style.WARNING('Grupo Admin não encontrado. Execute "python manage.py create_groups" primeiro.')
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Admin padrão criado com sucesso!\n'
                f'   Usuário: {username}\n'
                f'   Senha: {password}\n'
                f'   Email: {email}\n'
            )
        )
        self.stdout.write(
            self.style.WARNING(
                '\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!'
            )
        )

