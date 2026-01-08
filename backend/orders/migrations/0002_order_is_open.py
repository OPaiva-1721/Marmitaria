# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='is_open',
            field=models.BooleanField(default=True, help_text='Pedidos em aberto podem ser editados pelo Caixa. Pedidos fechados só podem ser visualizados pelo Admin.', verbose_name='Em Aberto'),
        ),
    ]

