from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group


class Command(BaseCommand):
    help = 'Garante que o usuário admin está no grupo Admin'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default='admin',
            help='Nome de usuário do admin (padrão: admin)',
        )

    def handle(self, *args, **options):
        username = options['username']
        
        # Garantir que os grupos existam
        try:
            from django.core.management import call_command
            call_command('create_groups', verbosity=0)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Erro ao criar grupos: {e}'))
        
        # Buscar usuário
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Usuário "{username}" não encontrado!')
            )
            self.stdout.write('Execute: python manage.py create_default_admin')
            return
        
        # Buscar grupo Admin
        try:
            admin_group = Group.objects.get(name='Admin')
        except Group.DoesNotExist:
            self.stdout.write(
                self.style.ERROR('Grupo Admin não encontrado! Execute: python manage.py create_groups')
            )
            return
        
        # Verificar se já está no grupo
        if user.groups.filter(name='Admin').exists():
            self.stdout.write(
                self.style.SUCCESS(f'✅ Usuário "{username}" já está no grupo Admin')
            )
        else:
            # Adicionar ao grupo Admin
            user.groups.add(admin_group)
            self.stdout.write(
                self.style.SUCCESS(f'✅ Usuário "{username}" adicionado ao grupo Admin')
            )
        
        # Mostrar informações do usuário
        groups = list(user.groups.values_list('name', flat=True))
        self.stdout.write(f'\n📋 Informações do usuário "{username}":')
        self.stdout.write(f'   ID: {user.id}')
        self.stdout.write(f'   Email: {user.email}')
        self.stdout.write(f'   is_superuser: {user.is_superuser}')
        self.stdout.write(f'   is_staff: {user.is_staff}')
        self.stdout.write(f'   Grupos: {", ".join(groups) if groups else "Nenhum"}')
        
        # Verificar se é admin (superuser ou no grupo Admin)
        is_admin = user.is_superuser or 'Admin' in groups
        self.stdout.write(f'   É Admin: {is_admin}')

