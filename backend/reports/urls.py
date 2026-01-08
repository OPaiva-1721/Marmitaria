from django.urls import path
from . import views

app_name = 'reports'

urlpatterns = [
    path('dashboard/', views.dashboard_summary, name='dashboard_summary'),
    path('sales/', views.sales_report, name='sales_report'),
    path('sales/export_csv/', views.export_sales_csv, name='export_sales_csv'),
    path('products/', views.products_report, name='products_report'),
    path('products/export_csv/', views.export_products_csv, name='export_products_csv'),
    path('orders/', views.orders_report, name='orders_report'),
    path('orders/export_csv/', views.export_orders_csv, name='export_orders_csv'),
    path('financial/', views.financial_report, name='financial_report'),
    path('financial/export_csv/', views.export_financial_csv, name='export_financial_csv'),
    path('expenses/', views.expenses_report, name='expenses_report'),
    path('expenses/export_csv/', views.export_expenses_csv, name='export_expenses_csv'),
]

