from django.db import models
from django.core.validators import MinValueValidator
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from decimal import Decimal
from core.models import Product


class OrderStatus(models.TextChoices):
    """Enum para status do pedido"""
    PENDING = 'pending', 'Pendente'
    CONFIRMED = 'confirmed', 'Confirmado'
    PREPARING = 'preparing', 'Preparando'
    READY = 'ready', 'Pronto'
    DELIVERED = 'delivered', 'Entregue'
    CANCELLED = 'cancelled', 'Cancelado'


class Order(models.Model):
    """Model para pedidos"""
    
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name='Cliente'
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        verbose_name='Status'
    )
    is_open = models.BooleanField(
        default=True,
        verbose_name='Em Aberto',
        help_text='Pedidos em aberto podem ser editados pelo Caixa. Pedidos fechados só podem ser visualizados pelo Admin.'
    )
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Total'
    )
    delivery_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Taxa de Entrega',
        help_text='Taxa de entrega para pedidos de entrega'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Observações'
    )
    delivery_address = models.TextField(
        blank=True,
        null=True,
        verbose_name='Endereço de entrega'
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
        verbose_name = 'Pedido'
        verbose_name_plural = 'Pedidos'
        ordering = ['-created_at']

    def __str__(self):
        return f'Pedido #{self.id} - {self.customer.username}'

    def is_paid(self):
        """
        Verifica se o pedido foi pago.
        Um pedido é considerado pago quando existe um pagamento associado
        com status COMPLETED.
        """
        try:
            # Verifica se existe um pagamento associado e se está completo
            return self.payment.status == 'completed'
        except AttributeError:
            # Se não existe payment associado, retorna False
            return False

    def save(self, *args, **kwargs):
        """
        Sobrescreve o método save() para implementar a regra de negócio:
        - Pedidos com pagamento COMPLETED não podem ser alterados.
        
        Esta validação garante a integridade dos dados financeiros,
        impedindo alterações em pedidos já pagos.
        
        Exceção: Se update_fields contém apenas 'total', permite a atualização
        porque isso é usado pelo método recalcular_total() para manter
        a consistência dos dados.
        """
        # Se o pedido já existe no banco (não é uma criação)
        if self.pk:
            # Verifica se o pagamento está completo
            if self.is_paid():
                # Permite atualização apenas do campo 'total' (usado pelo recalcular_total)
                # Bloqueia qualquer outra alteração manual
                update_fields = kwargs.get('update_fields')
                if update_fields and 'total' in update_fields and len(update_fields) == 1:
                    # Permite atualizar apenas o total (recalculo automático)
                    pass
                else:
                    # Obtém o pedido original do banco para comparar
                    original_order = Order.objects.get(pk=self.pk)
                    
                    # Bloqueia qualquer alteração manual em pedidos pagos
                    if (self.customer_id != original_order.customer_id or
                        self.status != original_order.status or
                        self.total != original_order.total or
                        self.notes != original_order.notes or
                        self.delivery_address != original_order.delivery_address):
                        raise ValidationError(
                            'Não é possível alterar um pedido com pagamento completo. '
                            'O pedido já foi pago e não pode ser modificado.'
                        )
        
        # Se passou na validação, salva normalmente
        super().save(*args, **kwargs)

    def recalcular_total(self):
        """
        Recalcula o total do pedido com base nos itens.
        
        Este método percorre todos os itens do pedido, calcula o subtotal
        de cada item (preço × quantidade) e soma tudo para obter o total.
        
        O total é atualizado diretamente no banco de dados usando update()
        no queryset para evitar chamar save() e disparar validações.
        Isso é importante porque o recálculo é uma operação automática
        que deve funcionar mesmo para pedidos pagos (para manter consistência).
        """
        total = Decimal('0.00')
        
        # Itera sobre todos os itens do pedido
        for item in self.items.all():
            # Soma o subtotal de cada item (preço × quantidade)
            total += item.subtotal
        
        # Atualiza diretamente no banco usando update() para evitar validações
        # Isso permite recalcular mesmo pedidos pagos (mantém consistência)
        Order.objects.filter(pk=self.pk).update(total=total)
        
        # Atualiza o valor na instância atual para manter sincronização
        self.total = total
        
        return self.total


class OrderItem(models.Model):
    """Model para itens do pedido"""
    
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Pedido'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='order_items',
        verbose_name='Produto'
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name='Quantidade'
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Preço unitário'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Criado em'
    )

    class Meta:
        verbose_name = 'Item do Pedido'
        verbose_name_plural = 'Itens do Pedido'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.product.name} x{self.quantity} - Pedido #{self.order.id}'

    @property
    def subtotal(self):
        """
        Calcula o subtotal do item (preço unitário × quantidade).
        
        Esta é uma property que calcula dinamicamente o valor total
        do item baseado no preço e na quantidade.
        """
        return self.price * self.quantity

    def save(self, *args, **kwargs):
        """
        Sobrescreve o método save() para garantir que o total do pedido
        seja recalculado sempre que um OrderItem for criado ou alterado.
        
        Fluxo:
        1. Salva o item no banco de dados
        2. Chama recalcular_total() no pedido associado
        3. O pedido atualiza seu total automaticamente
        
        Isso garante que o total do pedido esteja sempre sincronizado
        com a soma dos itens, mesmo se houver alterações manuais.
        """
        # Verifica se o pedido associado está pago antes de permitir alteração
        if self.pk and self.order.is_paid():
            # Se já existe (está sendo editado) e o pedido está pago, bloqueia
            original_item = OrderItem.objects.get(pk=self.pk)
            if (self.order_id != original_item.order_id or
                self.product_id != original_item.product_id or
                self.quantity != original_item.quantity or
                self.price != original_item.price):
                raise ValidationError(
                    'Não é possível alterar itens de um pedido com pagamento completo.'
                )
        
        # Salva o item no banco de dados
        super().save(*args, **kwargs)
        
        # Após salvar, recalcula o total do pedido associado
        # Isso garante que o total sempre reflita a soma dos itens
        self.order.recalcular_total()

    def delete(self, *args, **kwargs):
        """
        Sobrescreve o método delete() para garantir que o total do pedido
        seja recalculado quando um item for removido.
        
        Fluxo:
        1. Guarda referência ao pedido antes de deletar
        2. Deleta o item do banco de dados
        3. Recalcula o total do pedido (que agora não inclui mais este item)
        
        É importante guardar a referência antes de deletar porque após
        o delete(), a relação não estará mais disponível.
        """
        # Guarda referência ao pedido antes de deletar o item
        order = self.order
        
        # Verifica se o pedido está pago antes de permitir exclusão
        if order.is_paid():
            raise ValidationError(
                'Não é possível remover itens de um pedido com pagamento completo.'
            )
        
        # Deleta o item do banco de dados
        super().delete(*args, **kwargs)
        
        # Após deletar, recalcula o total do pedido
        # O total será recalculado sem incluir o item removido
        order.recalcular_total()
