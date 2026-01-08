from rest_framework import serializers
from .models import Expense, ExpenseCategory


class ExpenseSerializer(serializers.ModelSerializer):
    """Serializer para despesas"""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Expense
        fields = [
            'id',
            'user',
            'user_username',
            'category',
            'category_display',
            'description',
            'amount',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CreateExpenseSerializer(serializers.ModelSerializer):
    """Serializer para criar despesas (sem campos read_only)"""
    
    class Meta:
        model = Expense
        fields = [
            'category',
            'description',
            'amount',
            'notes',
        ]

