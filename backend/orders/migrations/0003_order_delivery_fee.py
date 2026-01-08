# Generated manually

from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_order_is_open'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='delivery_fee',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0.00'),
                help_text='Taxa de entrega para pedidos de entrega',
                max_digits=10,
                verbose_name='Taxa de Entrega'
            ),
        ),
    ]

