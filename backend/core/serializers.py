from rest_framework import serializers
from django.contrib.auth.models import User, Group
from .models import Product


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer para registro de novos usuários"""
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password_confirm']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "As senhas não coincidem."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Garantir que os grupos existam e adicionar ao grupo Caixa por padrão
        from django.contrib.auth.models import Group
        from django.core.management import call_command
        
        # Criar grupos se não existirem
        try:
            admin_group, _ = Group.objects.get_or_create(name='Admin')
            caixa_group, _ = Group.objects.get_or_create(name='Caixa')
            
            # Se os grupos foram criados agora, configurar permissões
            if _:
                # Executar comando para configurar permissões dos grupos
                try:
                    call_command('create_groups', verbosity=0)
                except:
                    pass  # Se falhar, continua mesmo assim
            
            # Adicionar usuário ao grupo Caixa
            user.groups.add(caixa_group)
        except Exception as e:
            # Se houver erro, pelo menos garantir que o usuário existe
            # O admin pode adicionar manualmente depois
            pass
        
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer para listar e visualizar usuários"""
    groups = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    is_caixa = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 
                  'is_active', 'is_staff', 'is_superuser', 'groups', 'is_admin', 'is_caixa', 
                  'date_joined', 'last_login']
        read_only_fields = ['id', 'date_joined', 'last_login']
    
    def get_groups(self, obj):
        return list(obj.groups.values_list('name', flat=True))
    
    def get_is_admin(self, obj):
        return obj.is_superuser or 'Admin' in self.get_groups(obj)
    
    def get_is_caixa(self, obj):
        return 'Caixa' in self.get_groups(obj)
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar usuários (admin)"""
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6)
    groups = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 
                  'password_confirm', 'is_active', 'groups']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "As senhas não coincidem."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        groups_data = validated_data.pop('groups', [])
        password = validated_data.pop('password')
        
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Adicionar aos grupos especificados, ou Caixa por padrão
        if groups_data:
            for group_name in groups_data:
                try:
                    group = Group.objects.get(name=group_name)
                    user.groups.add(group)
                except Group.DoesNotExist:
                    pass
        else:
            # Se não especificado, adicionar ao grupo Caixa por padrão
            try:
                caixa_group = Group.objects.get(name='Caixa')
                user.groups.add(caixa_group)
            except Group.DoesNotExist:
                pass
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualizar usuários (admin)"""
    password = serializers.CharField(write_only=True, min_length=6, required=False, allow_blank=True)
    groups = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 
                  'is_active', 'groups']
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        groups_data = validated_data.pop('groups', None)
        
        # Atualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Atualizar senha se fornecida
        if password:
            instance.set_password(password)
        
        instance.save()
        
        # Atualizar grupos se fornecidos
        if groups_data is not None:
            instance.groups.clear()
            for group_name in groups_data:
                try:
                    group = Group.objects.get(name=group_name)
                    instance.groups.add(group)
                except Group.DoesNotExist:
                    pass
        
        return instance


class ProductSerializer(serializers.ModelSerializer):
    """Serializer para o model Product"""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'category', 'category_display', 'price', 'is_available', 'image', 'created_at', 'updated_at']
        read_only_fields = ['id', 'category_display', 'created_at', 'updated_at']

