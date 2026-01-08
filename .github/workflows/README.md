# GitHub Actions Workflows

Este diretório contém os workflows do GitHub Actions para build automático dos executáveis.

## Workflows Disponíveis

### 1. `build-windows.yml`
Cria o executável para Windows (.exe)

**Quando executa:**
- Push para `main` ou `master`
- Pull requests para `main` ou `master`
- Criação de release
- Manualmente via `workflow_dispatch`

**Artefatos:**
- `Marmitaria.exe` - Executável standalone para Windows

### 2. `build-linux.yml`
Cria o executável para Linux

**Quando executa:**
- Push para `main` ou `master`
- Pull requests para `main` ou `master`
- Criação de release
- Manualmente via `workflow_dispatch`

**Artefatos:**
- `Marmitaria/` - Pasta com executável e dependências
- `marmitaria-linux.tar.gz` - Arquivo compactado

### 3. `build-all.yml`
Cria executáveis para Windows e Linux em paralelo

**Quando executa:**
- Push para `main` ou `master`
- Pull requests para `main` ou `master`
- Criação de release
- Manualmente via `workflow_dispatch`

**Artefatos:**
- Windows: `Marmitaria.exe`
- Linux: `marmitaria-linux.tar.gz`

**Releases:**
- Quando uma release é criada, os executáveis são automaticamente anexados à release

## Como Usar

### Build Manual

1. Vá para a aba **Actions** no GitHub
2. Selecione o workflow desejado
3. Clique em **Run workflow**
4. Escolha a branch e clique em **Run workflow**

### Criar Release com Executáveis

1. Vá para **Releases** no GitHub
2. Clique em **Draft a new release**
3. Crie uma tag (ex: `v1.0.0`)
4. Preencha o título e descrição
5. Clique em **Publish release**
6. Os workflows serão executados automaticamente
7. Os executáveis serão anexados à release

### Baixar Executáveis

#### Durante o Build
1. Vá para a aba **Actions**
2. Clique no workflow executado
3. Clique no job (ex: "Build Windows")
4. Role até a seção **Artifacts**
5. Baixe o artefato desejado

#### Durante uma Release
1. Vá para **Releases**
2. Clique na release desejada
3. Baixe os arquivos anexados

## Configuração

### Variáveis de Ambiente

Os workflows usam uma `SECRET_KEY` temporária para builds. Para produção, configure:

1. Vá para **Settings** > **Secrets and variables** > **Actions**
2. Adicione uma secret chamada `SECRET_KEY` com uma chave Django válida

**Nota:** A secret é opcional - os workflows funcionam sem ela usando uma chave temporária.

## Troubleshooting

### Build Falha

1. Verifique os logs na aba **Actions**
2. Verifique se todas as dependências estão corretas
3. Verifique se o frontend compila sem erros
4. Verifique se as migrações do Django executam corretamente

### Executável Não Aparece

1. Verifique se o build foi concluído com sucesso
2. Verifique a seção **Artifacts** no workflow
3. Os artefatos ficam disponíveis por 30 dias

### Release Sem Executáveis

1. Verifique se os workflows foram executados
2. Aguarde a conclusão de todos os jobs
3. Os executáveis são anexados automaticamente quando todos os builds terminam

---

**Última atualização**: 2024

