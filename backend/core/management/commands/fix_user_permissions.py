from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group


class Command(BaseCommand):
    help = 'Corrige permissões de usuários adicionando-os ao grupo Caixa se não estiverem em nenhum grupo'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Corrigir um usuário específico (opcional)',
        )

    def handle(self, *args, **options):
        # Garantir que grupos existam
        admin_group, _ = Group.objects.get_or_create(name='Admin')
        caixa_group, _ = Group.objects.get_or_create(name='Caixa')
        
        if _:
            # Se grupos foram criados, configurar permissões
            from django.core.management import call_command
            call_command('create_groups', verbosity=0)
        
        username = options.get('username')
        
        if username:
            # Corrigir usuário específico
            try:
                user = User.objects.get(username=username)
                self.fix_user(user, caixa_group)
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Usuário "{username}" não encontrado!')
                )
        else:
            # Corrigir todos os usuários sem grupos (exceto superusuários)
            users_without_groups = User.objects.filter(
                groups__isnull=True,
                is_superuser=False
            )
            
            count = 0
            for user in users_without_groups:
                self.fix_user(user, caixa_group)
                count += 1
            
            if count > 0:
                self.stdout.write(
                    self.style.SUCCESS(f'\n✅ {count} usuário(s) corrigido(s)!')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS('\n✅ Todos os usuários já estão em grupos!')
                )
    
    def fix_user(self, user, caixa_group):
        """Adiciona usuário ao grupo Caixa se não estiver em nenhum grupo"""
        if user.groups.count() == 0:
            user.groups.add(caixa_group)
            self.stdout.write(
                self.style.SUCCESS(f'✅ Usuário "{user.username}" adicionado ao grupo Caixa')
            )
        else:
            groups = list(user.groups.values_list('name', flat=True))
            self.stdout.write(
                self.style.WARNING(f'⚠️  Usuário "{user.username}" já está nos grupos: {", ".join(groups)}')
            )

