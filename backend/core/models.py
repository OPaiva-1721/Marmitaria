from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class ProductCategory(models.TextChoices):
    """Enum para categorias de produtos"""
    MARMITAS = 'marmitas', 'Marmitas'
    BEBIDAS = 'bebidas', 'Bebidas'
    SOBREMESAS = 'sobremesas', 'Sobremesas'
    ACOMPANHAMENTOS = 'acompanhamentos', 'Acompanhamentos'
    OUTROS = 'outros', 'Outros'


class Product(models.Model):
    """Model para produtos do restaurante"""
    
    name = models.CharField(
        max_length=200,
        verbose_name='Nome'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descrição'
    )
    category = models.CharField(
        max_length=20,
        choices=ProductCategory.choices,
        default=ProductCategory.OUTROS,
        verbose_name='Categoria'
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Preço'
    )
    is_available = models.BooleanField(
        default=True,
        verbose_name='Disponível'
    )
    image = models.ImageField(
        upload_to='products/',
        blank=True,
        null=True,
        verbose_name='Imagem'
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
        verbose_name = 'Produto'
        verbose_name_plural = 'Produtos'
        ordering = ['category', 'name']

    def __str__(self):
        return self.name
