# Multi Poker

Ranking, lançamento de rodada e gestão de temporada para **vários clubes de pôker** (home games), cada um com as próprias regras e visual. Site estático: roda no GitHub Pages, sem servidor.

> Versão de testes (0.1). Os logins são simples e os dados de cada clube ficam públicos no repositório.

## Páginas

| Página | Endereço | Para quê |
|---|---|---|
| Portal | `index.html` | Lista os clubes e leva a cada tela |
| Ranking | `ranking.html?c=<clube>` | Classificação, evolução, histórico, temporadas e estatísticas |
| Rodada | `rodada.html?c=<clube>` | Abertura → presença → sorteio de mesas → partida → fechamento; gera o arquivo da rodada |
| Gestão | `admin.html?c=<clube>` | Importa rodadas, calendário, jogadores, regras, mesa/blinds, visual, senhas, encerra temporada e publica |
| Novo clube | `admin.html?novo=1` | Gera a pasta de um clube novo |

## Fluxo de uma rodada

1. **Gestão** (admin) cadastra jogadores e gera o calendário.
2. **Rodada** (celular do organizador da noite, sem login nem acesso aos dados do clube): presença, sorteio de mesas, relógio de blinds, rebuy/add-on e eliminações. No fim, **Enviar ao admin pelo WhatsApp** manda um link com a rodada dentro (`admin.html?c=clube#r=…`). Se o clube tiver o WhatsApp do admin configurado, a conversa abre direto.
3. **Gestão → Rodadas**: o admin toca no link, a rodada entra em *Para conferir* com os avisos (pote × prêmios, jogador novo, rodada repetida, data diferente do calendário). Se estiver certo, **Aprovar e publicar**. Se não, **Ajustar**: ordem, nomes, convidado, rebuys, add-on, prêmios, organização e data.
4. **Ranking** atualiza em cerca de 1 minuto. Rodadas já publicadas podem ser corrigidas em *Corrigir*, com o mesmo editor.

A rodada viaja no próprio link, depois do `#`, e não passa por servidor nenhum. Baixar/importar arquivo continua como plano B.

**Publicação com um clique**: em *Gestão → Publicar*, o admin conecta um token *fine-grained* do GitHub (só este repositório, *Contents: read and write*). Só quem tem o token publica; o organizador nunca precisa dele. Antes de gravar, a gestão relê o `dados.json` do GitHub, então aprovar de aparelhos diferentes não apaga nada.

## Estrutura

```
index.html  ranking.html  rodada.html  admin.html
assets/core.js            ← motor de regras, config padrão, temas, senhas
clubes.json               ← lista de clubes do portal
clubes/<clube>/
  config.json             ← regras, visual e senhas do clube
  dados.json              ← temporada em andamento
  temporadas.json         ← índice das temporadas encerradas
  temporada-<id>.json     ← uma por temporada encerrada
```

## Clubes de demonstração

| Clube | Regras | Senhas de teste |
|---|---|---|
| `clube-exemplo` | Clássicas: pontos 26-19-16…, tabela fixa de prêmios, buy-in R$ 100, 9 por mesa, convidado não pontua | gestão `teste`, estatísticas `teste` |
| `noite-do-flop` | Percentual, buy-in R$ 50 com R$ 10 de taxa, rebuy (até 2, até o nível 4), add-on, blinds, 2 descartes, 2 pts de presença, convidado pontua, 8 por mesa | gestão `teste` |

## O que cada clube configura (`config.json`)

Qualquer campo ausente vem do padrão em `assets/core.js`. Tudo é editável pela Gestão.

- **clube**: `nome`, `nomeCurto`, `cidade`, `simbolo`, `slogan`, `whatsAdmin`
- **tema**: `preset` (`feltro`, `noite`, `vinho`, `grafite`, `petroleo`) e `cores` para ajuste fino
- **pontuacao**: `porPosicao` (lista), `demais`, `presenca`, `convidadoPontua`
- **premiacao**: `buyIn`, `taxaPorJogador`, `modo` (`tabela` | `percentual`), `arredondar`, `tabela` (por nº de jogadores), `faixas` (% por faixa de jogadores)
- **temporada**: `rodadas`, `classificados` (Top N), `descartes`, `diaSemana`, `horario`, `rodizioOrganizacao`
- **mesa**: `maxPorMesa`, `fichasIniciais`, `rebuy` (`ativo`, `valor`, `fichas`, `limitePorJogador`, `ateNivel`), `addon` (`ativo`, `valor`, `fichas`), `blinds` (`ativo`, `niveis`)
- **estatisticas**: mínimos de rodadas para consistência, forma recente e confronto
- **acesso**: `senhaAdmin`, `senhaRodada`, `senhaEstatisticas` (código gerado pela senha; vazio = aberto)

### Regras de cálculo

- **Pontos**: posição na rodada → `porPosicao`; abaixo da lista → `demais`; soma `presenca`. Se convidado não pontua, ele é pulado e os membros abaixo sobem.
- **Descartes**: o ranking ignora os N menores resultados de cada jogador; faltas contam como 0.
- **Pote**: jogadores × (buy-in − taxa) + rebuys + add-ons.
- **Prêmios**: no modo tabela, usa a linha do nº de jogadores (com rebuy/add-on, mantém as proporções da linha); fora da tabela ou no modo percentual, usa as faixas. Arredonda e a sobra vai para o 1º.
- **Lucro** no ranking considera buy-in + rebuys + add-on de cada jogador.

## Publicar

A Gestão edita tudo em memória (com rascunho salvo no aparelho) e mostra os arquivos alterados em **Publicar**:

- **Baixar** (um a um ou ZIP com as pastas) e enviar no GitHub em *Add file → Upload files*; depois *marcar como publicado*.
- **GitHub direto**: com um token *fine-grained* com acesso só a este repositório e permissão *Contents: read and write*. O token fica só no aparelho.

## Rodar localmente

```
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Limitações desta versão de testes

- Senhas apenas afastam curiosos: os JSON são públicos e o código da senha fica no `config.json`.
- Publicação depende de upload manual ou de token pessoal no navegador.
- Sem histórico de quem alterou o quê além dos commits do GitHub.

Para produção, o caminho é um backend com login de verdade (ex.: Supabase/Firebase) mantendo o mesmo formato de dados.
