from django.db import models
from django.core.validators import MinValueValidator
from django.contrib.auth.models import User
from decimal import Decimal
from orders.models import Order


class PaymentMethod(models.TextChoices):
    """Enum para forma de pagamento"""
    CASH = 'cash', 'Dinheiro'
    CREDIT_CARD = 'credit_card', 'Cartão de Crédito'
    DEBIT_CARD = 'debit_card', 'Cartão de Débito'
    PIX = 'pix', 'PIX'
    BANK_TRANSFER = 'bank_transfer', 'Transferência Bancária'


class PaymentStatus(models.TextChoices):
    """Enum para status do pagamento"""
    PENDING = 'pending', 'Pendente'
    PROCESSING = 'processing', 'Processando'
    COMPLETED = 'completed', 'Concluído'
    FAILED = 'failed', 'Falhou'
    REFUNDED = 'refunded', 'Reembolsado'


class Payment(models.Model):
    """Model para pagamentos"""
    
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='payment',
        verbose_name='Pedido'
    )
    method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        verbose_name='Forma de Pagamento'
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        verbose_name='Status'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Valor'
    )
    transaction_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='ID da Transação'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Observações'
    )
    paid_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Pago em'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Criado em'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Atualizado em'
    )

    class Meta:
        verbose_name = 'Pagamento'
        verbose_name_plural = 'Pagamentos'
        ordering = ['-created_at']

    def __str__(self):
        return f'Pagamento #{self.id} - Pedido #{self.order.id} - {self.get_method_display()}'

    def mark_as_completed(self):
        """Marca o pagamento como concluído"""
        from django.utils import timezone
        self.status = PaymentStatus.COMPLETED
        self.paid_at = timezone.now()
        self.save(update_fields=['status', 'paid_at'])

    def mark_as_failed(self):
        """Marca o pagamento como falhou"""
        self.status = PaymentStatus.FAILED
        self.save(update_fields=['status'])
