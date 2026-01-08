"""
Signals para o app orders.

Este módulo contém signals do Django que garantem que o total do pedido
seja recalculado automaticamente sempre que um OrderItem for criado,
alterado ou deletado.

Os signals são uma camada adicional de segurança além do override
dos métodos save() e delete() nos models, garantindo que o recálculo
aconteça mesmo em operações em lote ou através do admin.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import OrderItem


@receiver(post_save, sender=OrderItem)
def recalcular_total_apos_save(sender, instance, created, **kwargs):
    """
    Signal que recalcula o total do pedido após salvar um OrderItem.
    
    Este signal é disparado sempre que um OrderItem é salvo (criado ou atualizado).
    Ele serve como uma camada adicional de segurança para garantir que o total
    do pedido seja sempre atualizado, mesmo se o método save() do OrderItem
    não for chamado diretamente (ex: bulk_create, bulk_update, admin actions).
    
    Nota: Se o save() do OrderItem for chamado normalmente, ele também
    recalculará o total. Isso resulta em um recálculo duplo, mas é seguro
    porque o método recalcular_total() é idempotente (sempre calcula o mesmo valor).
    
    Parâmetros:
        sender: A classe do model que enviou o signal (OrderItem)
        instance: A instância do OrderItem que foi salva
        created: Boolean indicando se foi criação (True) ou atualização (False)
        **kwargs: Argumentos adicionais do signal
    """
    # Recalcula o total do pedido associado
    # O método recalcular_total() já está implementado no model Order
    # e usa update() diretamente no banco para evitar validações
    instance.order.recalcular_total()


@receiver(post_delete, sender=OrderItem)
def recalcular_total_apos_delete(sender, instance, **kwargs):
    """
    Signal que recalcula o total do pedido após deletar um OrderItem.
    
    Este signal é disparado sempre que um OrderItem é deletado.
    Ele garante que o total do pedido seja recalculado mesmo se o método
    delete() do OrderItem não for chamado diretamente (ex: queryset.delete()).
    
    Parâmetros:
        sender: A classe do model que enviou o signal (OrderItem)
        instance: A instância do OrderItem que foi deletada
        **kwargs: Argumentos adicionais do signal
    
    Nota: A instância ainda existe na memória quando este signal é disparado,
    mas já foi removida do banco de dados. Por isso, ainda podemos acessar
    instance.order para recalcular o total.
    """
    # Recalcula o total do pedido associado
    # Remove o item deletado do cálculo automaticamente
    instance.order.recalcular_total()

