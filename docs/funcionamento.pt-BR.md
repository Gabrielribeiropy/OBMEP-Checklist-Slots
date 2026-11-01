# Relatório de funcionamento — Controle de Lotes de Pistolagem

## Objetivo

Este projeto independente e não oficial da OBMEP organiza o acompanhamento dos lotes de provas. Ele surgiu de um problema prático: sem uma visão compartilhada do que já havia sido pistolado, a equipe podia repetir o trabalho em um lote concluído e atrasar os demais. O painel apresenta o estado de cada lote e o que falta fazer.

## Fluxo de um lote

| Ordem | Confirmação | Regra |
| --- | --- | --- |
| 1 | Pistolagem das provas | Pode ser confirmada em um lote ativo ainda pendente. |
| 2 | Corretores e revisores | Um clique confirma as duas equipes em conjunto, após as provas. |
| 3 | Cadastro das notas | Só pode ser confirmado depois das provas e da equipe. |

Uma confirmação posterior impede desfazer uma anterior. Para reabrir um lote, desfaça primeiro as notas, depois a confirmação conjunta da equipe e, por último, as provas. A API valida essa ordem no servidor, inclusive se alguém enviar uma requisição sem usar a interface. O banco registra eventos com ação, lote e horário; sem login, não há autoria individual.

## Níveis e visualização

O nível 1 é amarelo, o nível 2 é rosa e o nível 3 é azul. O lote concluído é mostrado em verde. A instalação inicial cria 81 lotes vazios em cada faixa: 100–180, 200–280 e 300–380. Outros números inteiros de 1 a 999999 podem ser adicionados a qualquer nível, desde que ainda não existam no ano. O limite implementado é 1000 lotes para 2026. Cada número é único no ano, inclusive quando o lote está excluído.

Na tela, é possível escolher o nível, buscar pelo número e filtrar por todos, provas pendentes, corretores/revisores pendentes, notas pendentes, concluídos ou excluídos. No celular, o número e a situação continuam visíveis; as ações aparecem ao expandir o cartão do lote.

## Indicadores e atualização

Os indicadores usam os lotes **ativos**, presentes no banco naquele instante. Excluir um lote reduz o total ativo; restaurá-lo aumenta o total. Não se presume que 180 lotes devam existir em um nível.

- **Faltam provas:** lotes ativos sem a confirmação de provas.
- **Faltam corretores e revisores:** lotes ativos sem a confirmação conjunta e ainda sem notas.
- **Faltam notas:** lotes ativos sem confirmação de notas, incluindo os que ainda aguardam etapas anteriores.
- **Percentual de provas/notas:** quantidade confirmada dividida pelo total de lotes ativos daquele recorte, arredondada para inteiro.
- **Concluídos:** lotes ativos com provas e notas confirmadas. A interface permite reconhecer a equipe não registrada em lotes concluídos antes da criação da etapa conjunta, sem inventar um registro retroativo.
- **Gargalo:** primeira etapa ainda pendente na sequência provas → equipe → notas.

O navegador consulta o servidor a cada três segundos e quando a aba volta a ficar ativa. Pode haver até alguns segundos entre uma alteração feita por outra pessoa e sua aparição na tela.

## Cadastro, exclusão e restauração

O usuário pode adicionar um lote escolhendo nível e número. Lotes incompletos podem ser excluídos individualmente ou em grupo de até 100 por vez, após confirmação. A exclusão é lógica: o estado e o histórico permanecem no banco. O filtro **Excluídos** permite restaurar o lote. Um número excluído não deve ser cadastrado novamente.

## Dados e limites de segurança

Esta cópia do código não contém os dados reais da operação nem uma senha de banco. Cada pessoa que instalar deve usar seu próprio PostgreSQL. A instalação padrão não tem contas ou controle de acesso: qualquer visitante da instância pode alterar os lotes. Há limites de requisições, validação de entradas e consultas SQL parametrizadas; eles não substituem autenticação quando a integridade depender de saber quem agiu. Leia [SECURITY.md](../SECURITY.md) antes de disponibilizar uma instalação na internet.

## Stack e escopo

Next.js 15, React 19, TypeScript e PostgreSQL. A API Next.js lê e grava os lotes; a URI do banco fica somente no servidor. O esquema habilita RLS, sem políticas públicas declaradas. A versão atual está fixada em 2026; outros anos exigem alteração do código e do esquema. Este projeto não é um sistema oficial da OBMEP.
