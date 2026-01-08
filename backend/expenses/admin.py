from django.contrib import admin
from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['id', 'description', 'category', 'amount', 'user', 'created_at']
    list_filter = ['category', 'created_at']
    search_fields = ['description', 'notes']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

