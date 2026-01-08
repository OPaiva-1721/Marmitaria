from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q, F, DecimalField
from django.db.models.functions import TruncDate, TruncMonth, TruncYear
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime, timedelta
from decimal import Decimal
import csv
import io
from orders.models import Order, OrderItem, OrderStatus
from payments.models import Payment, PaymentStatus, PaymentMethod
from expenses.models import Expense, ExpenseCategory
from core.models import Product
from core.permissions import IsAdmin


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def dashboard_summary(request):
    """
    Retorna um resumo geral do dashboard para o admin.
    
    Endpoint: GET /api/reports/dashboard/
    
    Retorna:
    - Total de pedidos
    - Pedidos abertos
    - Pedidos fechados
    - Receita total
    - Receita do período (últimos 30 dias)
    - Pedidos pendentes de pagamento
    - Produtos mais vendidos (top 5)
    """
    today = timezone.now()
    last_30_days = today - timedelta(days=30)
    
    # Total de pedidos
    total_orders = Order.objects.count()
    open_orders = Order.objects.filter(is_open=True).count()
    closed_orders = Order.objects.filter(is_open=False).count()
    
    # Receita total (apenas pedidos pagos) - inclui produtos + taxas de entrega
    total_revenue = Payment.objects.filter(
        status=PaymentStatus.COMPLETED
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Receita de produtos (apenas total dos pedidos, sem taxa de entrega)
    total_products_revenue = Order.objects.filter(
        payment__status=PaymentStatus.COMPLETED
    ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    
    # Receita de taxas de entrega
    total_delivery_fees = Order.objects.filter(
        payment__status=PaymentStatus.COMPLETED
    ).aggregate(total=Sum('delivery_fee'))['total'] or Decimal('0.00')
    
    # Receita dos últimos 30 dias
    recent_revenue = Payment.objects.filter(
        status=PaymentStatus.COMPLETED,
        paid_at__gte=last_30_days
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Receita de produtos dos últimos 30 dias
    recent_products_revenue = Order.objects.filter(
        payment__status=PaymentStatus.COMPLETED,
        payment__paid_at__gte=last_30_days
    ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    
    # Receita de taxas de entrega dos últimos 30 dias
    recent_delivery_fees = Order.objects.filter(
        payment__status=PaymentStatus.COMPLETED,
        payment__paid_at__gte=last_30_days
    ).aggregate(total=Sum('delivery_fee'))['total'] or Decimal('0.00')
    
    # Pedidos pendentes de pagamento
    pending_payments = Order.objects.filter(
        Q(payment__isnull=True) | Q(payment__status=PaymentStatus.PENDING)
    ).count()
    
    # Total de despesas
    total_expenses = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Despesas dos últimos 30 dias
    recent_expenses = Expense.objects.filter(
        created_at__gte=last_30_days
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Lucro (receita - despesas)
    profit = total_revenue - total_expenses
    recent_profit = recent_revenue - recent_expenses
    
    # Top 5 produtos mais vendidos
    top_products = OrderItem.objects.values(
        'product__name', 'product__id'
    ).annotate(
        total_quantity=Sum('quantity'),
        total_revenue=Sum(F('quantity') * F('price'), output_field=DecimalField())
    ).order_by('-total_quantity')[:5]
    
    top_products_list = [
        {
            'id': item['product__id'],
            'name': item['product__name'],
            'total_quantity': item['total_quantity'],
            'total_revenue': float(item['total_revenue'])
        }
        for item in top_products
    ]
    
    # Pedidos por status
    orders_by_status = Order.objects.values('status').annotate(
        count=Count('id')
    )
    
    return Response({
        'summary': {
            'total_orders': total_orders,
            'open_orders': open_orders,
            'closed_orders': closed_orders,
            'total_revenue': float(total_revenue),
            'total_products_revenue': float(total_products_revenue),
            'total_delivery_fees': float(total_delivery_fees),
            'recent_revenue': float(recent_revenue),
            'recent_products_revenue': float(recent_products_revenue),
            'recent_delivery_fees': float(recent_delivery_fees),
            'total_expenses': float(total_expenses),
            'recent_expenses': float(recent_expenses),
            'profit': float(profit),
            'recent_profit': float(recent_profit),
            'pending_payments': pending_payments,
        },
        'top_products': top_products_list,
        'orders_by_status': list(orders_by_status),
        'period': {
            'start': last_30_days.isoformat(),
            'end': today.isoformat()
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def sales_report(request):
    """
    Relatório de vendas com filtros por período.
    
    Endpoint: GET /api/reports/sales/
    
    Query Parameters:
    - start_date: Data inicial (YYYY-MM-DD)
    - end_date: Data final (YYYY-MM-DD)
    - group_by: 'day', 'month', 'year' (padrão: 'day')
    - payment_method: Filtrar por método de pagamento
    
    Retorna:
    - Vendas agrupadas por período
    - Total de vendas
    - Total de pedidos
    - Vendas por método de pagamento
    """
    # Parâmetros de data
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    group_by = request.query_params.get('group_by', 'day')
    payment_method = request.query_params.get('payment_method')
    
    # Filtro base: apenas pagamentos completos
    payments = Payment.objects.filter(status=PaymentStatus.COMPLETED)
    
    # Aplicar filtro de método de pagamento
    if payment_method:
        payments = payments.filter(method=payment_method)
    
    # Aplicar filtro de data
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            payments = payments.filter(paid_at__gte=start)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            # Incluir o dia inteiro
            end = datetime.combine(end, datetime.max.time())
            payments = payments.filter(paid_at__lte=end)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Agrupar por período
    if group_by == 'month':
        payments_grouped = payments.annotate(
            period=TruncMonth('paid_at')
        ).values('period').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('period')
    elif group_by == 'year':
        payments_grouped = payments.annotate(
            period=TruncYear('paid_at')
        ).values('period').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('period')
    else:  # day (padrão)
        payments_grouped = payments.annotate(
            period=TruncDate('paid_at')
        ).values('period').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('period')
    
    # Total geral
    total_sales = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    total_orders = payments.count()
    
    # Vendas por método de pagamento
    sales_by_method = payments.values('method').annotate(
        total=Sum('amount'),
        count=Count('id')
    ).order_by('-total')
    
    sales_by_method_list = [
        {
            'method': item['method'],
            'method_display': PaymentMethod(item['method']).label,
            'total': float(item['total']),
            'count': item['count']
        }
        for item in sales_by_method
    ]
    
    # Formatar dados agrupados
    grouped_data = [
        {
            'period': item['period'].isoformat() if item['period'] else None,
            'total': float(item['total']),
            'count': item['count']
        }
        for item in payments_grouped
    ]
    
    return Response({
        'period': {
            'start_date': start_date,
            'end_date': end_date,
            'group_by': group_by
        },
        'summary': {
            'total_sales': float(total_sales),
            'total_orders': total_orders
        },
        'sales_by_period': grouped_data,
        'sales_by_method': sales_by_method_list
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def products_report(request):
    """
    Relatório de produtos mais vendidos.
    
    Endpoint: GET /api/reports/products/
    
    Query Parameters:
    - start_date: Data inicial (YYYY-MM-DD)
    - end_date: Data final (YYYY-MM-DD)
    - limit: Número de produtos a retornar (padrão: 10)
    - category: Filtrar por categoria
    
    Retorna:
    - Lista de produtos ordenados por quantidade vendida
    - Total de unidades vendidas
    - Receita por produto
    """
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    limit = int(request.query_params.get('limit', 10))
    category = request.query_params.get('category')
    
    # Base: itens de pedidos pagos
    order_items = OrderItem.objects.filter(
        order__payment__status=PaymentStatus.COMPLETED
    )
    
    # Filtrar por data (usando data do pagamento)
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            order_items = order_items.filter(order__payment__paid_at__gte=start)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            end = datetime.combine(end, datetime.max.time())
            order_items = order_items.filter(order__payment__paid_at__lte=end)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Filtrar por categoria
    if category:
        order_items = order_items.filter(product__category=category)
    
    # Agrupar por produto - primeiro calculamos a receita base dos produtos
    products_data = order_items.values(
        'product__id',
        'product__name',
        'product__category',
        'product__price'
    ).annotate(
        total_quantity=Sum('quantity'),
        total_revenue=Sum(F('quantity') * F('price'), output_field=DecimalField()),
        order_count=Count('order', distinct=True)
    ).order_by('-total_quantity')[:limit]
    
    # Calcular receita incluindo taxa de entrega
    # Vamos somar a taxa de entrega diretamente, dividindo igualmente entre os produtos do pedido
    product_ids = [item['product__id'] for item in products_data]
    relevant_order_items = order_items.filter(product__id__in=product_ids).select_related('order').prefetch_related('order__items')
    
    # Criar um dicionário para armazenar quantos produtos únicos existem por pedido
    order_product_counts = {}
    
    # Processar todos os itens para contar produtos únicos por pedido
    for order_item in relevant_order_items:
        order = order_item.order
        order_id = order.id
        
        if order_id not in order_product_counts:
            # Contar produtos únicos neste pedido
            unique_products = set()
            for oi in order.items.all():
                unique_products.add(oi.product_id)
            order_product_counts[order_id] = len(unique_products) if unique_products else 1
    
    # Agora calcular a receita com taxa de entrega para cada produto
    products_list = []
    for item in products_data:
        product_id = item['product__id']
        base_revenue = item['total_revenue']
        delivery_fee_revenue = Decimal('0.00')
        
        # Processar todos os pedidos que contêm este produto
        processed_orders = set()
        for order_item in relevant_order_items:
            if order_item.product_id != product_id:
                continue
            
            order = order_item.order
            order_id = order.id
            
            if order_id in processed_orders:
                continue
            processed_orders.add(order_id)
            
            # Se o pedido tem taxa de entrega, dividir igualmente entre os produtos
            if order.delivery_fee and order.delivery_fee > 0:
                num_products = order_product_counts.get(order_id, 1)
                if num_products > 0:
                    # Dividir a taxa igualmente entre os produtos do pedido
                    delivery_fee_revenue += order.delivery_fee / num_products
        
        # Receita total = receita base + taxa de entrega dividida igualmente
        total_revenue_with_delivery = base_revenue + delivery_fee_revenue
        
        products_list.append({
            'id': item['product__id'],
            'name': item['product__name'],
            'category': item['product__category'],
            'current_price': float(item['product__price']),
            'total_quantity': item['total_quantity'],
            'total_revenue': float(total_revenue_with_delivery),
            'order_count': item['order_count']
        })
    
    # Estatísticas gerais
    total_products_sold = sum(item['total_quantity'] for item in products_list)
    total_revenue = sum(item['total_revenue'] for item in products_list)
    
    return Response({
        'period': {
            'start_date': start_date,
            'end_date': end_date
        },
        'summary': {
            'total_products_sold': total_products_sold,
            'total_revenue': total_revenue,
            'products_count': len(products_list)
        },
        'products': products_list
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def orders_report(request):
    """
    Relatório de pedidos.
    
    Endpoint: GET /api/reports/orders/
    
    Query Parameters:
    - start_date: Data inicial (YYYY-MM-DD)
    - end_date: Data final (YYYY-MM-DD)
    - status: Filtrar por status do pedido
    - is_open: Filtrar por pedidos abertos/fechados (true/false)
    
    Retorna:
    - Estatísticas de pedidos
    - Pedidos por status
    - Pedidos abertos vs fechados
    - Pedidos com/sem pagamento
    """
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    order_status = request.query_params.get('status')
    is_open_param = request.query_params.get('is_open')
    
    orders = Order.objects.all()
    
    # Filtrar por data
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            orders = orders.filter(created_at__gte=start)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            end = datetime.combine(end, datetime.max.time())
            orders = orders.filter(created_at__lte=end)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Filtrar por status
    if order_status:
        orders = orders.filter(status=order_status)
    
    # Filtrar por is_open
    if is_open_param is not None:
        is_open = is_open_param.lower() == 'true'
        orders = orders.filter(is_open=is_open)
    
    # Estatísticas gerais
    total_orders = orders.count()
    open_orders = orders.filter(is_open=True).count()
    closed_orders = orders.filter(is_open=False).count()
    
    # Pedidos por status
    orders_by_status = orders.values('status').annotate(
        count=Count('id')
    )
    
    # Pedidos com/sem pagamento
    orders_with_payment = orders.filter(
        payment__status=PaymentStatus.COMPLETED
    ).count()
    orders_without_payment = orders.filter(
        Q(payment__isnull=True) | Q(payment__status__in=[PaymentStatus.PENDING, PaymentStatus.PROCESSING])
    ).count()
    
    # Valor total dos pedidos
    total_value = orders.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    
    # Valor médio por pedido
    avg_order_value = total_value / total_orders if total_orders > 0 else Decimal('0.00')
    
    return Response({
        'period': {
            'start_date': start_date,
            'end_date': end_date
        },
        'summary': {
            'total_orders': total_orders,
            'open_orders': open_orders,
            'closed_orders': closed_orders,
            'orders_with_payment': orders_with_payment,
            'orders_without_payment': orders_without_payment,
            'total_value': float(total_value),
            'avg_order_value': float(avg_order_value)
        },
        'orders_by_status': list(orders_by_status)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def financial_report(request):
    """
    Relatório financeiro detalhado.
    
    Endpoint: GET /api/reports/financial/
    
    Query Parameters:
    - start_date: Data inicial (YYYY-MM-DD)
    - end_date: Data final (YYYY-MM-DD)
    
    Retorna:
    - Receita total (pagamentos completos)
    - Receita pendente (pagamentos pendentes)
    - Receita por método de pagamento
    - Estatísticas de pagamentos
    """
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    
    payments = Payment.objects.all()
    
    # Filtrar por data
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            payments = payments.filter(created_at__gte=start)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            end = datetime.combine(end, datetime.max.time())
            payments = payments.filter(created_at__lte=end)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Receita total (completos) - inclui produtos + taxas de entrega
    completed_payments_qs = payments.filter(status=PaymentStatus.COMPLETED)
    total_revenue = completed_payments_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Receita de produtos (apenas total dos pedidos, sem taxa de entrega)
    products_revenue = Order.objects.filter(
        payment__in=completed_payments_qs
    ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    
    # Receita de taxas de entrega
    delivery_fees = Order.objects.filter(
        payment__in=completed_payments_qs
    ).aggregate(total=Sum('delivery_fee'))['total'] or Decimal('0.00')
    
    # Receita pendente
    pending_revenue = payments.filter(
        status=PaymentStatus.PENDING
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Receita por método de pagamento
    revenue_by_method = payments.filter(
        status=PaymentStatus.COMPLETED
    ).values('method').annotate(
        total=Sum('amount'),
        count=Count('id')
    ).order_by('-total')
    
    revenue_by_method_list = [
        {
            'method': item['method'],
            'method_display': PaymentMethod(item['method']).label,
            'total': float(item['total']),
            'count': item['count']
        }
        for item in revenue_by_method
    ]
    
    # Pagamentos por status
    payments_by_status = payments.values('status').annotate(
        total=Sum('amount'),
        count=Count('id')
    )
    
    payments_by_status_list = [
        {
            'status': item['status'],
            'status_display': PaymentStatus(item['status']).label,
            'total': float(item['total']),
            'count': item['count']
        }
        for item in payments_by_status
    ]
    
    # Total de pagamentos
    total_payments = payments.count()
    completed_payments = payments.filter(status=PaymentStatus.COMPLETED).count()
    pending_payments = payments.filter(status=PaymentStatus.PENDING).count()
    failed_payments = payments.filter(status=PaymentStatus.FAILED).count()
    
    # Despesas no período
    expenses = Expense.objects.all()
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            expenses = expenses.filter(created_at__gte=start)
        except ValueError:
            pass
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            end = datetime.combine(end, datetime.max.time())
            expenses = expenses.filter(created_at__lte=end)
        except ValueError:
            pass
    
    total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Despesas por categoria
    expenses_by_category = expenses.values('category').annotate(
        total=Sum('amount'),
        count=Count('id')
    ).order_by('-total')
    
    expenses_by_category_list = [
        {
            'category': item['category'],
            'category_display': ExpenseCategory(item['category']).label,
            'total': float(item['total']),
            'count': item['count']
        }
        for item in expenses_by_category
    ]
    
    # Lucro líquido (receita - despesas)
    net_profit = total_revenue - total_expenses
    
    return Response({
        'period': {
            'start_date': start_date,
            'end_date': end_date
        },
        'summary': {
            'total_revenue': float(total_revenue),
            'products_revenue': float(products_revenue),
            'delivery_fees': float(delivery_fees),
            'pending_revenue': float(pending_revenue),
            'total_expenses': float(total_expenses),
            'net_profit': float(net_profit),
            'total_payments': total_payments,
            'completed_payments': completed_payments,
            'pending_payments': pending_payments,
            'failed_payments': failed_payments
        },
        'revenue_by_method': revenue_by_method_list,
        'payments_by_status': payments_by_status_list,
        'expenses_by_category': expenses_by_category_list
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def export_sales_csv(request):
    """
    Exporta relatório de vendas em CSV.
    
    Endpoint: GET /api/reports/sales/export_csv/
    """
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    payment_method = request.query_params.get('payment_method')
    
    payments = Payment.objects.filter(status=PaymentStatus.COMPLETED)
    
    if payment_method:
        payments = payments.filter(method=payment_method)
    
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            payments = payments.filter(paid_at__gte=start)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            end = datetime.combine(end, datetime.max.time())
            payments = payments.filter(paid_at__lte=end)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Criar CSV
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="relatorio_vendas_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    # Adicionar BOM para UTF-8 (Excel)
    response.write('\ufeff')
    
    writer = csv.writer(response, delimiter=';')
    
    # Cabeçalho
    writer.writerow(['Data', 'Pedido ID', 'Método de Pagamento', 'Valor', 'Status'])
    
    # Dados
    for payment in payments.select_related('order'):
        writer.writerow([
            payment.paid_at.strftime('%d/%m/%Y %H:%M:%S') if payment.paid_at else '',
            payment.order.id,
            payment.get_method_display(),
            str(payment.amount).replace('.', ','),
            payment.get_status_display()
        ])
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def export_products_csv(request):
    """
    Exporta relatório de produtos em CSV.
    
    Endpoint: GET /api/reports/products/export_csv/
    """
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    limit = int(request.query_params.get('limit', 100))
    category = request.query_params.get('category')
    
    order_items = OrderItem.objects.filter(
        order__payment__status=PaymentStatus.COMPLETED
    )
    
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            order_items = order_items.filter(order__payment__paid_at__gte=start)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            end = datetime.combine(end, datetime.max.time())
            order_items = order_items.filter(order__payment__paid_at__lte=end)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if category:
        order_items = order_items.filter(product__category=category)
    
    # Agrupar por produto - primeiro calculamos a receita base dos produtos
    products_data = order_items.values(
        'product__id',
        'product__name',
        'product__category',
        'product__price'
    ).annotate(
        total_quantity=Sum('quantity'),
        total_revenue=Sum(F('quantity') * F('price'), output_field=DecimalField()),
        order_count=Count('order', distinct=True)
    ).order_by('-total_quantity')[:limit]
    
    # Calcular receita incluindo taxa de entrega
    # Vamos somar a taxa de entrega diretamente, dividindo igualmente entre os produtos do pedido
    product_ids = [item['product__id'] for item in products_data]
    relevant_order_items = order_items.filter(product__id__in=product_ids).select_related('order').prefetch_related('order__items')
    
    # Criar um dicionário para armazenar quantos produtos únicos existem por pedido
    order_product_counts = {}
    
    # Processar todos os itens para contar produtos únicos por pedido
    for order_item in relevant_order_items:
        order = order_item.order
        order_id = order.id
        
        if order_id not in order_product_counts:
            # Contar produtos únicos neste pedido
            unique_products = set()
            for oi in order.items.all():
                unique_products.add(oi.product_id)
            order_product_counts[order_id] = len(unique_products) if unique_products else 1
    
    # Agora calcular a receita com taxa de entrega para cada produto
    products_list = []
    for item in products_data:
        product_id = item['product__id']
        base_revenue = item['total_revenue']
        delivery_fee_revenue = Decimal('0.00')
        
        # Processar todos os pedidos que contêm este produto
        processed_orders = set()
        for order_item in relevant_order_items:
            if order_item.product_id != product_id:
                continue
            
            order = order_item.order
            order_id = order.id
            
            if order_id in processed_orders:
                continue
            processed_orders.add(order_id)
            
            # Se o pedido tem taxa de entrega, dividir igualmente entre os produtos
            if order.delivery_fee and order.delivery_fee > 0:
                num_products = order_product_counts.get(order_id, 1)
                if num_products > 0:
                    # Dividir a taxa igualmente entre os produtos do pedido
                    delivery_fee_revenue += order.delivery_fee / num_products
        
        # Receita total = receita base + taxa de entrega dividida igualmente
        total_revenue_with_delivery = base_revenue + delivery_fee_revenue
        
        products_list.append({
            'id': item['product__id'],
            'name': item['product__name'],
            'category': item['product__category'],
            'total_quantity': item['total_quantity'],
            'total_revenue': total_revenue_with_delivery,
            'order_count': item['order_count'],
            'current_price': item['product__price']
        })
    
    # Criar CSV
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="relatorio_produtos_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    # Adicionar BOM para UTF-8 (Excel)
    response.write('\ufeff')
    
    writer = csv.writer(response, delimiter=';')
    
    # Cabeçalho
    writer.writerow(['Produto', 'Categoria', 'Quantidade Vendida', 'Número de Pedidos', 'Receita Total (com taxa de entrega)', 'Preço Atual'])
    
    # Dados
    for item in products_list:
        writer.writerow([
            item['name'],
            item['category'],
            item['total_quantity'],
            item['order_count'],
            str(item['total_revenue']).replace('.', ','),
            str(item['current_price']).replace('.', ',')
        ])
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def export_orders_csv(request):
    """
    Exporta relatório de pedidos em CSV.
    
    Endpoint: GET /api/reports/orders/export_csv/
    """
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    order_status = request.query_params.get('status')
    is_open_param = request.query_params.get('is_open')
    
    orders = Order.objects.all()
    
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            orders = orders.filter(created_at__gte=start)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            end = datetime.combine(end, datetime.max.time())
            orders = orders.filter(created_at__lte=end)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if order_status:
        orders = orders.filter(status=order_status)
    
    if is_open_param is not None:
        is_open = is_open_param.lower() == 'true'
        orders = orders.filter(is_open=is_open)
    
    # Criar CSV
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="relatorio_pedidos_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    # Adicionar BOM para UTF-8 (Excel)
    response.write('\ufeff')
    
    writer = csv.writer(response, delimiter=';')
    
    # Cabeçalho
    writer.writerow(['ID', 'Cliente', 'Status', 'Aberto', 'Total', 'Data Criação', 'Data Atualização', 'Tem Pagamento', 'Status Pagamento'])
    
    # Dados
    for order in orders.select_related('customer'):
        has_payment = hasattr(order, 'payment')
        payment_status = order.payment.get_status_display() if has_payment else 'Sem pagamento'
        
        writer.writerow([
            order.id,
            order.customer.username,
            order.get_status_display(),
            'Sim' if order.is_open else 'Não',
            str(order.total).replace('.', ','),
            order.created_at.strftime('%d/%m/%Y %H:%M:%S'),
            order.updated_at.strftime('%d/%m/%Y %H:%M:%S'),
            'Sim' if has_payment else 'Não',
            payment_status
        ])
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def export_financial_csv(request):
    """
    Exporta relatório financeiro em CSV.
    
    Endpoint: GET /api/reports/financial/export_csv/
    """
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    
    payments = Payment.objects.all()
    
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            payments = payments.filter(created_at__gte=start)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            end = datetime.combine(end, datetime.max.time())
            payments = payments.filter(created_at__lte=end)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Criar CSV
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="relatorio_financeiro_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    # Adicionar BOM para UTF-8 (Excel)
    response.write('\ufeff')
    
    writer = csv.writer(response, delimiter=';')
    
    # Cabeçalho
    writer.writerow(['ID Pagamento', 'Pedido ID', 'Método de Pagamento', 'Valor', 'Status', 'Data Criação', 'Data Pagamento', 'ID Transação'])
    
    # Dados
    for payment in payments.select_related('order'):
        writer.writerow([
            payment.id,
            payment.order.id,
            payment.get_method_display(),
            str(payment.amount).replace('.', ','),
            payment.get_status_display(),
            payment.created_at.strftime('%d/%m/%Y %H:%M:%S'),
            payment.paid_at.strftime('%d/%m/%Y %H:%M:%S') if payment.paid_at else '',
            payment.transaction_id or ''
        ])
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def expenses_report(request):
    """
    Relatório de despesas/saídas.
    
    Endpoint: GET /api/reports/expenses/
    
    Query Parameters:
    - start_date: Data inicial (YYYY-MM-DD)
    - end_date: Data final (YYYY-MM-DD)
    - category: Filtrar por categoria
    
    Retorna:
    - Estatísticas de despesas
    - Despesas por categoria
    - Total de despesas
    """
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    category = request.query_params.get('category')
    
    expenses = Expense.objects.all()
    
    # Filtrar por data
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            expenses = expenses.filter(created_at__gte=start)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            end = datetime.combine(end, datetime.max.time())
            expenses = expenses.filter(created_at__lte=end)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Filtrar por categoria
    if category:
        expenses = expenses.filter(category=category)
    
    # Estatísticas gerais
    total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    total_count = expenses.count()
    
    # Despesas por categoria
    expenses_by_category = expenses.values('category').annotate(
        total=Sum('amount'),
        count=Count('id')
    ).order_by('-total')
    
    expenses_by_category_list = [
        {
            'category': item['category'],
            'category_display': ExpenseCategory(item['category']).label,
            'total': float(item['total']),
            'count': item['count']
        }
        for item in expenses_by_category
    ]
    
    # Média de despesas
    avg_expense = total_expenses / total_count if total_count > 0 else Decimal('0.00')
    
    return Response({
        'period': {
            'start_date': start_date,
            'end_date': end_date
        },
        'summary': {
            'total_expenses': float(total_expenses),
            'total_count': total_count,
            'avg_expense': float(avg_expense)
        },
        'expenses_by_category': expenses_by_category_list
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def export_expenses_csv(request):
    """
    Exporta relatório de despesas em CSV.
    
    Endpoint: GET /api/reports/expenses/export_csv/
    """
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    category = request.query_params.get('category')
    
    expenses = Expense.objects.all()
    
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            expenses = expenses.filter(created_at__gte=start)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            end = datetime.combine(end, datetime.max.time())
            expenses = expenses.filter(created_at__lte=end)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if category:
        expenses = expenses.filter(category=category)
    
    # Criar CSV
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="relatorio_despesas_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    # Adicionar BOM para UTF-8 (Excel)
    response.write('\ufeff')
    
    writer = csv.writer(response, delimiter=';')
    
    # Cabeçalho
    writer.writerow(['Data', 'Categoria', 'Descrição', 'Valor', 'Usuário', 'Observações'])
    
    # Dados
    for expense in expenses.select_related('user'):
        writer.writerow([
            expense.created_at.strftime('%d/%m/%Y %H:%M:%S'),
            expense.get_category_display(),
            expense.description,
            str(expense.amount).replace('.', ','),
            expense.user.username if expense.user else 'N/A',
            expense.notes or ''
        ])
    
    return response

