# Painel Executivo de Projetos Estratégicos v2.0

Sistema web para gerenciamento de projetos com Firebase, desenvolvido para acompanhamento de atividades, prazos e indicadores.

## ✨ Novidades da Versão 2.0

- **📎 Arquivos Anexos** - Anexe PDFs, documentos Word, planilhas Excel e imagens aos projetos
- **🔔 Lembretes Recorrentes** - Crie lembretes com recorrência diária, semanal, quinzenal ou mensal
- **📄 Relatórios Executivos** - Gere PDFs formatados com resumo, gráficos e análise SWOT
- **⚙️ Personalização Completa** - Altere cores, textos e temas do painel
- **📧 Notificações por E-mail** - Receba alertas de prazos via EmailJS

## 🚀 Funcionalidades

### Gerenciamento de Projetos
- Criar, editar, visualizar e excluir projetos
- Status: Não Iniciado, Planejado, Em Andamento, Concluído, Suspenso
- Barra de progresso e prazos
- Análise SWOT integrada
- Próximos passos e metas

### Painel de Próximos Passos
- Visualização consolidada de todas as tarefas
- Filtros por projeto e status
- Marcar tarefas como concluídas
- Integração com Google Calendar

### Lembretes Recorrentes
- Lembretes avulsos ou vinculados a projetos
- Recorrência configurável
- Notificações por e-mail
- Integração com Google Calendar

### Personalização
- **Aparência**: Cores do tema, sidebar, fundo, cards e status
- **Textos**: Título, subtítulo, labels dos cards, nome da organização
- **Temas Predefinidos**: Escuro, Claro, Azul Corporativo, Verde Natural
- **Notificações**: Configuração de alertas de prazo

### Relatórios
- Relatório Executivo em PDF
- Resumo com estatísticas
- Gráfico de status
- Detalhes dos projetos
- Próximos passos
- Análise SWOT

### Importação/Exportação
- Excel (.xlsx)
- CSV
- PDF simples

## 📁 Arquivos do Sistema

| Arquivo | Descrição |
|---------|-----------|
| `index.html` | Interface principal |
| `styles.css` | Estilos e temas |
| `app.js` | Lógica principal e Firebase |
| `settings.js` | Configurações personalizáveis |
| `reminders.js` | Lembretes recorrentes |
| `files.js` | Upload de arquivos |
| `reports.js` | Geração de relatórios PDF |
| `firebase-config.js` | Credenciais do Firebase |
| `export.js` | Exportação de dados |
| `import.js` | Importação de dados |

## ⚙️ Configuração

### 1. Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um projeto
3. Ative **Authentication** (E-mail/senha)
4. Crie **Firestore Database** (região: southamerica-east1)
5. Ative **Storage**
6. Configure as regras de segurança (ver abaixo)
7. Obtenha as credenciais e atualize `firebase-config.js`

### 2. Regras do Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read, write: if request.auth != null;
    }
    match /comments/{commentId} {
      allow read, write: if request.auth != null;
    }
    match /tasksState/{docId} {
      allow read, write: if request.auth != null;
    }
    match /settings/{docId} {
      allow read, write: if request.auth != null;
    }
    match /reminders/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Regras do Storage

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /projects/{projectId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Publicação (GitHub Pages)

1. Crie um repositório no GitHub
2. Faça upload de todos os arquivos
3. Vá em **Settings > Pages**
4. Selecione a branch `main` e pasta `/(root)`
5. No Firebase, autorize o domínio em **Authentication > Settings > Authorized domains**

## 📧 Configurar EmailJS (Opcional)

Para receber notificações por e-mail:

1. Crie uma conta em [emailjs.com](https://www.emailjs.com)
2. Configure um serviço de e-mail (Gmail, Outlook, etc.)
3. Crie um template com variáveis: `{{to_email}}`, `{{subject}}`, `{{message}}`
4. No painel, vá em **Configurações > Notificações**
5. Cole as credenciais: Public Key, Service ID, Template ID
6. Clique em "Testar Envio"

## 📊 Colunas de Importação (CSV/Excel)

| Coluna | Descrição |
|--------|-----------|
| Nome | Nome do projeto (obrigatório) |
| Status | Não iniciado, Planejado, Em andamento, Concluído, Suspenso |
| Progresso | Número de 0 a 100 |
| Prazo | Data no formato DD/MM/AAAA |
| Responsável | Nome do responsável |
| Descrição | Descrição do projeto |
| Objetivo | Objetivo do projeto |
| Próximos Passos | Lista separada por ponto-e-vírgula |
| Metas | Lista separada por ponto-e-vírgula |
| Forças | Análise SWOT - Forças |
| Fraquezas | Análise SWOT - Fraquezas |
| Oportunidades | Análise SWOT - Oportunidades |
| Ameaças | Análise SWOT - Ameaças |

## 🔧 Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Bibliotecas**: 
  - Chart.js (gráficos)
  - SheetJS (Excel)
  - jsPDF (PDF)
  - EmailJS (notificações)
  - Font Awesome (ícones)

## 📝 Licença

Desenvolvido para uso interno da Comissão de Assuntos Sociais - CAS/CLDF.

---

**Versão 2.0** | Dezembro 2025

