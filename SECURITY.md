# Security / Segurança

## Português

Esta aplicação foi feita para um checklist compartilhado e **não inclui autenticação**. Qualquer pessoa que consiga acessar uma instância pode consultar, confirmar, desfazer, adicionar, excluir e restaurar lotes. A checagem de origem, o limite de alterações por IP e as regras de sequência reduzem erros e abuso, mas não provam quem fez uma alteração.

Para uso privado, restrinja o acesso à instância à equipe ou implemente autenticação e autorização no servidor. Nunca conecte uma instalação pública a um banco que contenha dados privados. Use um banco próprio para cada instalação.

Mantenha `DATABASE_URL` apenas em `.env.local` ou no gerenciador de segredos da hospedagem. O arquivo é ignorado pelo Git. Não use prefixo `NEXT_PUBLIC_` para credenciais. Não envie dumps ou logs com dados sensíveis ao repositório. Se uma senha foi divulgada em conversa, arquivo ou serviço, rotacione-a no provedor e atualize as instalações que a usam.

As tabelas têm RLS habilitado no esquema, mas a aplicação usa uma conexão PostgreSQL no servidor. Revise permissões, políticas, backups, TLS e logs da sua instalação antes de uso externo. A versão atual usa o ano 2026; adaptar para outros anos exige rever código e migração.

Para comunicar uma falha de segurança, use o canal privado de segurança do repositório GitHub, se estiver habilitado, ou contate o mantenedor em privado. **Não publique credenciais, dados reais ou passos de exploração em uma issue pública.**

## English

This is a shared checklist with **no built-in authentication**. Anyone who can reach an instance can read and change its lots. Origin checks, per-IP limits, and server-side state validation do not identify an operator. Restrict access to your team or implement server-side authentication and authorization before exposing a private workflow to the internet.

Use your own database. Keep `DATABASE_URL` in an ignored local environment file or your host's secret manager, never in source code or `NEXT_PUBLIC_` variables. Rotate any credential that has been shared. Review database permissions, row level security, backups, TLS, and logs for your deployment. Report vulnerabilities privately; do not post credentials or real data in public issues.
