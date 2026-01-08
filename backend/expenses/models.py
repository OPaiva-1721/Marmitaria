from django.db import models
from django.core.validators import MinValueValidator
from django.contrib.auth.models import User
from decimal import Decimal


class ExpenseCategory(models.TextChoices):
    """Enum para categorias de despesas"""
    INGREDIENTS = 'ingredients', 'Ingredientes'
    UTILITIES = 'utilities', 'Utilidades (Água, Luz, Gás)'
    RENT = 'rent', 'Aluguel'
    SALARY = 'salary', 'Salários'
    DELIVERY = 'delivery', 'Entrega'
    MARKETING = 'marketing', 'Marketing'
    MAINTENANCE = 'maintenance', 'Manutenção'
    SUPPLIES = 'supplies', 'Suprimentos'
    OTHER = 'other', 'Outros'


class Expense(models.Model):
    """Model para despesas/saídas do caixa"""
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='expenses',
        verbose_name='Usuário'
    )
    category = models.CharField(
        max_length=20,
        choices=ExpenseCategory.choices,
        default=ExpenseCategory.OTHER,
        verbose_name='Categoria'
    )
    description = models.CharField(
        max_length=255,
        verbose_name='Descrição'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Valor'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Observações'
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
        verbose_name = 'Despesa'
        verbose_name_plural = 'Despesas'
        ordering = ['-created_at']

    def __str__(self):
        return f'Despesa #{self.id} - {self.description} - {self.get_category_display()}'

