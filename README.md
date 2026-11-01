# Controle de Lotes de Pistolagem / Lot Processing Checklist

**[Português](#português) · [English](#english)**

## Português

Projeto independente e **não oficial da OBMEP**. Foi criado para evitar a repetição da pistolagem de lotes já processados e permitir que uma equipe veja, em um único painel, quais lotes ainda precisam de cada confirmação. Não representa nem é endossado pela OBMEP.

O painel acompanha três etapas por lote, nesta ordem:

1. **Provas:** confirma que as provas do lote foram pistoladas.
2. **Corretores e revisores:** uma única ação confirma conjuntamente as duas equipes.
3. **Notas:** confirma o cadastro das notas dos alunos. Só é liberada depois das etapas anteriores.

As confirmações podem ser desfeitas em ordem inversa. A exclusão de um lote incompleto é reversível; lotes concluídos não podem ser excluídos pelo painel. O histórico registra a ação e o horário, mas não identifica a pessoa, pois o aplicativo não tem contas. Os contadores, percentuais e filtros usam apenas os lotes ativos existentes no banco. O painel atualiza a lista a cada três segundos e mostra os lotes em cartões recolhíveis no celular.

O banco é iniciado com 243 lotes vazios nas faixas 100–180, 200–280 e 300–380. Novos números entre 1 e 999999 podem ser adicionados a qualquer um dos três níveis. O número é único no ano; um lote excluído deve ser restaurado para voltar a aparecer. A implementação atual é configurada para **2026** e admite até 1000 lotes.

### Instalar na sua máquina

Requisitos: Node.js 20+ e um banco PostgreSQL próprio, local ou hospedado. **Não use a credencial de outro projeto ou o banco da demonstração.**

```bash
git clone https://github.com/Gabrielribeiropy/OBMEP-Checklist-Slots.git
cd OBMEP-Checklist-Slots
npm ci
```

Crie um banco vazio chamado `obmep_checklist` no seu PostgreSQL local (ou use um banco seu já preparado). Copie `.env.example` para `.env.local` e substitua os valores de exemplo por uma URI de conexão **do seu banco**. A conexão local em loopback pode ser sem TLS; conexões com hosts remotos exigem TLS. A variável `DATABASE_URL` só deve existir no servidor. Não publique `.env.local`, senhas, backups nem dumps.

```bash
npm run db:migrate
npm run dev
```

Abra `http://localhost:3000`. A migração é repetível: cria as tabelas e os lotes iniciais ausentes sem sobrescrever confirmações existentes. Para um banco criado por uma versão anterior, `npm run db:stages` acrescenta as colunas das etapas. Antes de migrar um banco que já contém dados, faça um backup próprio.

**Segurança:** a instalação padrão não exige login. Qualquer pessoa que consiga abrir a instância pode ver e alterar os lotes; o limite de requisições e a checagem de sequência não substituem autorização. Para uso restrito, mantenha a aplicação acessível apenas à equipe ou adicione autenticação e autorização no servidor antes de colocá-la na internet. Consulte [SECURITY.md](SECURITY.md). O código fonte é público; seus dados e credenciais não fazem parte deste repositório.

Leia o [relatório de funcionamento em português](docs/funcionamento.pt-BR.md) para o fluxo, contagens, filtros e limites.

## English

An independent, **unofficial OBMEP project**. It was built to prevent teams from processing a lot twice and to show which lots still need confirmation at each step. It is not affiliated with or endorsed by OBMEP.

The checklist follows three ordered steps per lot: **exam papers**, **graders and reviewers together in one confirmation**, and **student grade entry**. A later step unlocks only when the earlier steps are complete. Confirmations can be undone in reverse order. Incomplete lots can be soft deleted and restored. Counts, percentages, and filters reflect the active lots stored in the database, and the mobile view uses expandable lot cards.

The initial migration creates 243 empty lots across 100–180, 200–280, and 300–380. You may add any unused number from 1 to 999999 and choose a level. The current implementation targets **2026** and allows up to 1000 lots.

### Run your own local copy

You need Node.js 20+ and **your own PostgreSQL database**. Clone this repository, run `npm ci`, copy `.env.example` to `.env.local`, set `DATABASE_URL` to your database connection string, then run `npm run db:migrate` and `npm run dev`. Open `http://localhost:3000`. Back up an existing database before running a migration. Never commit your environment file, passwords, or database exports.

The default app has **no user accounts**. Anyone who can reach an instance can view and change its lots. Keep a private instance within your team or add server side authentication and authorization before exposing it to the internet. Read [SECURITY.md](SECURITY.md) and the [English functionality report](docs/how-it-works.en.md).

## Tecnologia / Technology

Next.js 15, React 19, TypeScript, PostgreSQL. The database connection stays in the Next.js server. The schema enables row level security and does not define public policies; the browser uses only the application API. SQL queries are parameterized. Source code is available under the [MIT License](LICENSE); the OBMEP icon is third party material and is excluded from that license (see [NOTICE](NOTICE)).
