# Generated manually

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
from decimal import Decimal


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Expense',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('category', models.CharField(choices=[('ingredients', 'Ingredientes'), ('utilities', 'Utilidades (Água, Luz, Gás)'), ('rent', 'Aluguel'), ('salary', 'Salários'), ('delivery', 'Entrega'), ('marketing', 'Marketing'), ('maintenance', 'Manutenção'), ('supplies', 'Suprimentos'), ('other', 'Outros')], default='other', max_length=20, verbose_name='Categoria')),
                ('description', models.CharField(max_length=255, verbose_name='Descrição')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))], verbose_name='Valor')),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Observações')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='expenses', to=settings.AUTH_USER_MODEL, verbose_name='Usuário')),
            ],
            options={
                'verbose_name': 'Despesa',
                'verbose_name_plural': 'Despesas',
                'ordering': ['-created_at'],
            },
        ),
    ]

