# 🍱 Marmitaria - Sistema de Gerenciamento de Pedidos

<div align="center">

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-5.0+-092E20?style=for-the-badge&logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Sistema completo de gerenciamento de pedidos para restaurantes com interface web moderna e aplicativo desktop nativo**

[Funcionalidades](#-funcionalidades) • [Instalação](#-instalação) • [Como Executar](#-como-executar) • [Documentação](#-documentação)

</div>

---

## 📖 Sobre o Projeto

O **Marmitaria** é um sistema completo de gerenciamento de pedidos desenvolvido para restaurantes e estabelecimentos de comida. O sistema oferece uma solução moderna e profissional para gerenciar produtos, pedidos, pagamentos e relatórios, com interfaces tanto web quanto desktop.

### 🎯 Características Principais

- ✅ **Interface Web Moderna**: Frontend React com design responsivo e intuitivo
- ✅ **API REST Completa**: Backend Django REST Framework com autenticação JWT
- ✅ **Aplicativo Desktop**: Versão standalone para Windows e Linux usando PyQt6
- ✅ **Sistema de Permissões**: Controle de acesso baseado em grupos (Admin e Caixa)
- ✅ **Gestão Financeira**: Controle de pagamentos, despesas e relatórios
- ✅ **Validações de Negócio**: Proteção contra alterações em pedidos pagos

---

## 🚀 Tecnologias

### Backend
- **Django 5.0+** - Framework web Python
- **Django REST Framework** - API RESTful
- **SQLite** - Banco de dados (suporta PostgreSQL/MySQL)
- **JWT** - Autenticação com tokens
- **Pillow** - Processamento de imagens

### Frontend
- **React 18** - Biblioteca JavaScript
- **Vite** - Build tool moderna
- **Axios** - Cliente HTTP
- **Context API** - Gerenciamento de estado

### Desktop App
- **PyQt6** - Interface gráfica nativa
- **PyQt6-WebEngine** - WebView para React
- **PyInstaller** - Empacotamento standalone

---

## 📋 Funcionalidades

### 👤 Gestão de Usuários
- Sistema de autenticação com JWT
- Grupos de permissões (Admin e Caixa)
- Registro de novos usuários
- Controle de acesso por funcionalidade

### 📦 Gestão de Produtos
- CRUD completo de produtos
- Categorias (Marmitas, Bebidas, Sobremesas, etc.)
- Upload de imagens
- Controle de disponibilidade
- Preços e descrições

### 🛒 Sistema de Pedidos
- Criação e gerenciamento de pedidos
- Adição/remoção de itens
- Cálculo automático de totais
- Status de pedidos (Pendente, Confirmado, Preparando, Pronto, Entregue)
- Observações e endereço de entrega
- Proteção contra alteração de pedidos pagos

### 💳 Sistema de Pagamentos
- Múltiplas formas de pagamento (Dinheiro, Cartão, PIX, etc.)
- Status de pagamento
- Finalização de pagamentos
- Histórico completo

### 📊 Relatórios e Despesas
- Controle de despesas
- Relatórios de vendas
- Análise financeira

---

## 🛠️ Instalação

### Pré-requisitos

- Python 3.12 ou superior
- Node.js 18 ou superior
- npm ou yarn

---

## ⚡ Como Executar

### 🎯 Início Rápido

**Você precisa de 2 terminais abertos:**

#### Terminal 1 - Backend

```bash
# 1. Criar e ativar ambiente virtual
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# 2. Instalar dependências
cd backend
pip install -r requirements.txt

# 3. Configurar banco de dados
python manage.py migrate

# 4. Criar usuário admin
python manage.py create_groups

# 5. Iniciar servidor
python manage.py runserver
```

✅ Backend: **http://localhost:8000**

#### Terminal 2 - Frontend

```bash
# 1. Instalar dependências
cd frontend
npm install

# 2. Iniciar servidor
npm run dev
```

✅ Frontend: **http://localhost:3000**

### 🔑 Login

- **Usuário:** `admin`
- **Senha:** `admin123`
- ⚠️ **Altere a senha após o primeiro login!**

📖 **Guia completo:** Veja [INICIO_RAPIDO.md](INICIO_RAPIDO.md) ou [COMO_RODAR.md](COMO_RODAR.md)

---

## 🖥️ Criar Aplicativo Desktop

### Opção 1: GitHub Actions ⭐ Recomendado

Os executáveis são criados automaticamente via GitHub Actions quando você faz push ou cria uma release.

### Opção 2: Build Local

**Windows:**
```bash
cd backend
create_desktop_app.bat
```

**Linux/Mac:**
```bash
cd backend
chmod +x create_desktop_app.sh
./create_desktop_app.sh
```

---

## 📁 Estrutura do Projeto

```
Marmitaria/
├── backend/                 # Backend Django
│   ├── core/               # App de produtos
│   ├── orders/             # App de pedidos
│   ├── payments/            # App de pagamentos
│   ├── expenses/           # App de despesas
│   ├── reports/            # App de relatórios
│   ├── marmitaria/         # Configurações do projeto
│   ├── app_desktop.py      # Aplicativo desktop
│   └── requirements.txt    # Dependências Python
├── frontend/                # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── contexts/       # Context API
│   │   └── services/       # Serviços API
│   └── package.json
└── README.md
```

---

## 🔌 API Endpoints

### Autenticação
- `POST /api/register/` - Registrar novo usuário
- `POST /api/token/` - Obter token JWT (login)
- `POST /api/token/refresh/` - Atualizar token JWT
- `GET /api/user/` - Informações do usuário autenticado

### Produtos
- `GET /api/products/` - Listar produtos
- `POST /api/products/` - Criar produto (Admin)
- `GET /api/products/{id}/` - Detalhes do produto
- `PUT /api/products/{id}/` - Atualizar produto (Admin)
- `DELETE /api/products/{id}/` - Deletar produto (Admin)

### Pedidos
- `GET /api/orders/` - Listar pedidos
- `POST /api/orders/` - Criar pedido
- `GET /api/orders/{id}/` - Detalhes do pedido
- `POST /api/orders/{id}/add_item/` - Adicionar item
- `DELETE /api/order-items/{id}/` - Remover item

### Pagamentos
- `GET /api/payments/` - Listar pagamentos
- `POST /api/payments/` - Criar pagamento
- `POST /api/payments/{id}/finalize/` - Finalizar pagamento

---

## 📝 Regras de Negócio

1. **Pedidos Pagos**: Pedidos com pagamento completo não podem ser alterados ou deletados
2. **Recálculo Automático**: O total do pedido é recalculado automaticamente ao adicionar/remover itens
3. **Permissões**: 
   - **Admin**: Acesso total ao sistema
   - **Caixa**: Pode criar pedidos e processar pagamentos, mas não pode alterar produtos

---

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 👨‍💻 Autor

**Seu Nome**
- GitHub: [@OPaiva-1721](https://github.com/OPaiva-1721)
- LinkedIn: [Gabryel Paiva](www.linkedin.com/in/gabryel-paiva-17a21g)

---

<div align="center">

**⭐ Se este projeto foi útil para você, considere dar uma estrela! ⭐**

Feito com ❤️ usando Python, Django e React

</div>

