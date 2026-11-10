# 🚀 Guia de Continuidade de Projeto para Antigravity (UEPG)

Este arquivo foi preparado para que o **Antigravity (ou qualquer desenvolvedor)**, ao abrir este repositório em outro computador, entenda imediatamente toda a arquitetura, contexto, regras críticas de negócio, credenciais e os passos para continuar o desenvolvimento sem interrupções.

---

## 📌 1. Visão Geral do Projeto

- **Nome do Projeto:** Plataforma de Pesquisa Clínica Odontológica
- **Instituição:** Universidade Estadual de Ponta Grossa (UEPG) - Programa de Pós-Graduação em Odontologia Clínica (PPGO)
- **Objetivo:** Sistema integrado para gestão de Ensaios Clínicos Randomizados (ECR), prontuário odontológico com odontograma interativo, avaliação cega/mascarada (GCP / ICH E6), consentimento digital (TCLE com assinatura na tela e hash SHA-256), construtor de questionários (eCRF), diários de dor e sensibilidade (EVA 0h, 1h, 24h, 48h) e exportação bioestatística (Excel, SPSS Syntax, R e GraphPad Prism).

---

## 🛠️ 2. Stack Tecnológica

- **Framework Web:** Next.js 16 (App Router, Turbopack, TypeScript, Tailwind CSS, Lucide Icons)
- **ORM & Banco de Dados:** Prisma ORM conectando ao PostgreSQL gerenciado na nuvem (Neon Database)
- **Storage de Mídia e Documentos:** Cloudflare R2 (S3-compatible para uploads, fotos clínicas e PDFs)
- **Hospedagem & Deploy:** Cloudflare Pages / Workers com CI/CD automático via GitHub

---

## ⚠️ 3. Regra de Ouro de CI/CD (Cloudflare)

> [!IMPORTANT]
> - O projeto está conectado diretamente à Cloudflare pelo repositório GitHub (`main`).
> - **NUNCA execute deploy manual (`wrangler deploy` ou `npm run deploy`).**
> - **Todo deploy deve ocorrer EXCLUSIVAMENTE via Git**: basta realizar `git push origin main`.
> - A Cloudflare detecta o commit automaticamente, executa a compilação em ambiente isolado (`prisma generate && next build`) e publica a nova versão em produção.

---

## 🔑 4. Como Configurar no Novo Computador

### Passo 1: Clonar o Repositório
```bash
# Clone utilizando suas credenciais do GitHub ou o token de acesso pessoal (PAT):
git clone https://github.com/sistemaclinicouepg/plataforma-pesquisa-clinica.git
cd plataforma-pesquisa-clinica
```

### Passo 2: Criar o Arquivo `.env` na Raiz
Crie um arquivo `.env` na raiz do projeto com as chaves de conexão (o Antigravity pode solicitar ao usuário ou utilizar as chaves salvas no cofre seguro):

```env
# Conexão com o banco de dados Neon PostgreSQL
DATABASE_URL="postgresql://neondb_owner:npg_CA0opbuD6UaY@ep-mute-dream-b61qern4-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:npg_CA0opbuD6UaY@ep-mute-dream-b61qern4.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require"

# Chave de API Neon
NEON_API_KEY="napi_qtss6dadtyu68p41r5j5x6bg5r4odleifr3n0z6p70blq6d5orjpqg6d9y1hmezy"

# Segredo de autenticação JWT
AUTH_SECRET="uepg-pesquisa-clinica-secret-jwt-key-2026"

# Cloudflare R2 Storage (S3 compatível para fotos, exames e documentos)
R2_ACCOUNT_ID="f7708139b6dc36cd7f2912f252bcb2eb"
R2_ACCESS_KEY_ID="f511af99c7a0a470bd5a16de9c35a80e"
R2_SECRET_ACCESS_KEY="f8ca4ecb472beb0866d0b055cf4ab2e951d39f2c01ef677a8920349e3f89e257"
R2_ENDPOINT="https://f7708139b6dc36cd7f2912f252bcb2eb.r2.cloudflarestorage.com"
R2_API_TOKEN="cfat_Sr5RPEEC1MMkTrzGS58H4YIYxrU8iP53H1jbIhoff90f150f"
R2_BUCKET_NAME="pesquisa-clinica-uepg"
```

### Passo 3: Instalar Dependências e Gerar o Prisma Client
```bash
npm install
npx prisma generate
```

### Passo 4: Executar Localmente
```bash
npm run dev
```
Acesse `http://localhost:3000`.

---

## 👥 5. Perfis e Contas de Usuário Autorizadas

O sistema possui acesso restrito configurado tanto em banco quanto em memória institucional resiliente (`src/app/api/auth/login/route.ts`):

| Perfil | E-mails Aceitos | Senha Padrão | Papel no Sistema |
|---|---|---|---|
| **Administrador Geral** | `admin@uepg.br` ou `administrador@uepg.br` | `admin` ou `123` | ADMIN (Acesso total a todos os estudos e configurações) |
| **Dra. Alessandra Reis** | `alessandra@uepg.br` ou `admin@uepg.br` | `admin` ou `123` | ADMIN / Coordenação Geral |
| **Dra. Roberta Micheten Dias** | `roberta@uepg.br` ou `pesquisadora@uepg.br` | `123` ou `admin` | RESEARCHER / Coordenadora de Estudo |

---

## 🗺️ 6. Mapa de Rotas e Telas Principais

- `/` ou `/projetos`: Lista e gerenciamento de estudos clínicos.
- `/login`: Tela de login simplificada e limpa para pesquisadores.
- `/dashboard?id={projectId}`: Prontuário, lista de voluntários, agendamento de janelas clínicas, odontograma e triagem.
- `/resultados?participantId={id}&projectId={id}`: **Página dedicada tabular de resultados** (acompanhamento longitudinal de dor EVA 0h/1h/24h/48h, respostas detalhadas de questionários e exportação bioestatística).
- `/construtor?projectId={id}`: Construtor visual de fichas clínicas e eCRFs.
- `/tcle/editor?projectId={id}`: Personalizador de TCLE com termos institucionais UEPG.
- `/paciente`: Portal público do participante para assinatura eletrônica de TCLE e envio de diários de dor.

---

## 🔄 7. Resumo das Últimas Atualizações Realizadas

1. **Página Dedicada de Resultados (`/resultados`):**
   - Substituição do antigo modal sobrecarregado por uma página dedicada em formato tabular compacto.
   - Sincronização automática entre questionários submetidos pelo paciente e o escore de dor EVA imediato (0h).
   - Tabela organizada das respostas com títulos completos, opções Likert, matrizes e booleanos.
2. **Simplificação da Tela de Login (`/login`):**
   - Remoção dos atalhos de preenchimento automático (1-Click Demo) e painéis decorativos excessivos.
   - Remoção de listas de nomes da tela pública para manter a privacidade institucional.
   - Restrição estrita de autenticação aos 3 perfis autorizados (Administrador Geral, Dra. Alessandra e Dra. Roberta).

---

## 💻 8. Instruções para o Antigravity Continuar o Trabalho

Ao abrir este repositório no novo computador, o Antigravity deve:
1. Ler este arquivo (`ANTIGRAVITY_ONBOARDING.md`) e `AGENTS.md`.
2. Verificar se o `.env` está configurado corretamente.
3. Testar a compilação com `npm run build` antes de realizar novas alterações.
4. Ao concluir qualquer solicitação do usuário, **sempre commitar e enviar via `git push origin main`** para acionar o deploy automático na Cloudflare.
