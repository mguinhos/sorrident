![Logo da UNICAP](unicap_logo.png)

# SorriDent - UML do Projeto

|Discipina|Prof. |
|---|---|
|Projeto Integrador | Jheymesson |


|Alunos| RA |
|---| --- |
|Salomão de Moraes | 8679|
|Marcel Guinhos | 855041 |
|Lucas Dias | 0 |
|João Pedro| 0 |


## Descrição do projeto

O nosso projeto visa construir um sistema de atendimento automático para um
consultório odontológico. O cliente é a Dra. Monica, que queria reduzir o
tempo que os pacientes passam esperando na recepção e oferecer atendimento
fora do horário comercial. Para isso, criamos um agente com inteligência
artificial que conversa pelo WhatsApp e pelo portal web do consultório.

O agente agenda, remarca e cancela consultas, tira dúvidas frequentes,
envia lembretes e transfere o atendimento para uma pessoa quando não
consegue resolver. Tudo isso usando o horário real da agenda dos dentistas,
então só oferece horários que estão livres, e seguindo a regra do
consultório de que cada consulta dura quarenta minutos.

O atendimento funciona durante a semana, das oito às dezoito horas, e aos
sábados das oito ao meio-dia, sem operar nos feriados. Para cancelar ou
remarcar, o paciente precisa avisar com pelo menos quatro horas de
antecedência. Abaixo disso, o caso vai para o atendimento humano. Os
lembretes são enviados vinte e quatro horas antes da consulta, e o robô
pede uma confirmação.

Para cuidar dos dados dos pacientes, o sistema segue a LGPD. O primeiro
contato mostra um aviso sobre o uso das informações e registra o aceite.
Não entram aqui decisões clínicas, pagamentos, ligações de voz nem
previsão de comportamento. Também há um painel para a equipe acompanhar a
fila de pendências, ver o histórico das conversas e conferir os relatórios
diários, que são enviados por e-mail.

O projeto segue a arquitetura limpa. Isso significa que as dependências
apontam sempre para dentro. A parte de API, os canais de mensagem e o
agente de IA conhecem apenas os contratos do núcleo e as interfaces de
serviço. O container principal é o único lugar que cria os objetos
concretos. Essa organização deixa o código mais fácil de entender e de
testar.

---

## 1. Visão geral

Antes de olhar classe por classe, vale ver o desenho das camadas. As setas
apontam sempre para dentro: o núcleo não conhece ninguém, e quem está de
fora é que depende dele.

[![visão geral](uml/svg/projeto.svg)](uml/svg/projeto.svg)

---

## 2. Os modelos de domínio

São as entidades do negócio, escritas de um jeito simples e sem depender
de nenhum framework. Aqui fica também a entidade base, que traz o id e as
datas de criação e de alteração, além das listas de valores que dão
sentido aos campos, como os papéis de usuário, o tipo de horário, a
prioridade, o status da consulta e o tipo de canal.

Referência: `core/models.py`.

[![domain_models](uml/svg/domain_models.svg)](uml/svg/domain_models.svg)

---

## 3. Os contratos do núcleo

Os contratos que o sistema inteiro enxerga. São as promessas de como cada
parte se comporta: a base de dados, o repositório, o provedor de IA, as
ferramentas, o agente, o canal de mensagem, o guardador de credenciais e a
fila de eventos.

Esses contratos têm um arquivo de tipos ao lado, para que quem usa o
sistema saiba o que cada coisa devolve. Estão em `core/interfaces.py`.

[![core_interfaces](uml/svg/core_interfaces.svg)](uml/svg/core_interfaces.svg)

---

## 4. O agente de IA

Esta é a parte que atende o usuário. O agente roda um laço em que ele usa
as ferramentas uma a uma, passando sempre pelo provedor de IA. Aqui fica
também o montador do prompt clínico e a base das ferramentas.

Referência: `agent/agent.py`, `agent/base.py` e `agent/prompt.py`.

[![agent](uml/svg/agent.svg)](uml/svg/agent.svg)

---

## 5. A memória da conversa

O agente precisa lembrar do que já foi dito, mas sem deixar a conversa
crescer sem limite. A janela deslizante corta as mensagens antigas e o
limite de tokens respeita o tamanho que o modelo aguenta. Cada resposta
vira uma tarefa, com uma subtarefa por ferramenta chamada, o que ajuda a
enxergar o que o agente fez.

Referência: `agent/context.py`, `agent/task.py` e `agent/models.py`.

[![agent_contexto](uml/svg/agent_contexto.svg)](uml/svg/agent_contexto.svg)

---

## 6. As ferramentas do agente

É o que o agente sabe fazer, organizado por assunto: cadastro do paciente,
agenda (incluindo o encaixe de urgência), consulta à base de conhecimento
e suporte, como chamar um atendente ou exportar a conversa.

Referência: `agent/tools/`.

[![agent_ferramentas](uml/svg/agent_ferramentas.svg)](uml/svg/agent_ferramentas.svg)

---

## 7. Os serviços

Esta é a camada dos casos de uso: marcar consulta, cadastrar paciente,
avisar a equipe. Cada serviço cumpre o que a interface pede e não sabe
como os dados são guardados.

Referência: `domain/services/`.

[![servicos](uml/svg/servicos.svg)](uml/svg/servicos.svg)

---

## 8. Os repositórios

Quem conversa com o banco. Cada repositório estende o repositório genérico
e soma as consultas próprias, guardando as entidades do domínio.

Referência: `domain/repositories/`.

[![repositorios](uml/svg/repositorios.svg)](uml/svg/repositorios.svg)

---

## 9. Os canais de mensagem

Aqui está a parte que cuida de onde a mensagem entra. Há um contrato de
canal e uma classe base comum, com três formas de comunicação: uma pela
web, uma pelo Telegram (com um cliente próprio) e uma pelo WhatsApp (por
webhook). O despachante entrega a mensagem ao agente e o gerenciador de
canais direciona o envio de acordo com o tipo de canal.

Referência: `channels/`.

[![channels](uml/svg/channels.svg)](uml/svg/channels.svg)

---

## 10. O RAG, ou a base de conhecimento

O projeto recupera informações de um jeito misto, tudo dentro do próprio
processo e sem depender de um serviço de fora. Um quebrador divide o texto
em pedaços, um gerador de pesos transforma cada pedaço em números, um
guarda-volumes guarda esses números na memória e dois buscadores (um
vetorial e outro por palavras) são juntados em um só. O serviço de
conhecimento indexa documentos, perguntas frequentes, procedimentos,
dentistas e os dados da clínica.

Referência: `rag/`.

[![rag](uml/svg/rag.svg)](uml/svg/rag.svg)

---

## 11. A infraestrutura

As versões concretas dos contratos do núcleo. O pacote do banco aparece
como um cilindro e junta a base de dados com o repositório genérico.
Também estão aqui o guardador de credenciais, a fila de eventos em
memória, o provedor de IA da Groq (desenhado como uma nuvem, porque é um
serviço de fora), a carga inicial de dados e os trabalhos que rodam de
tempos em tempos: os lembretes, o controle de inatividade e a atualização
do índice.

Referência: `infrastructure/` e `scheduler.py`.

[![infraestrutura](uml/svg/infraestrutura.svg)](uml/svg/infraestrutura.svg)

---

## 12. As integrações e a exportação

A camada de integrações trata provedores de IA e canais do mesmo jeito:
cada um declara quais credenciais precisa, e a interface web monta o
formulário sozinha a partir disso. O provedor de rota deixa trocar de IA
sem mexer no agente. Nesta parte estão também os exportadores de conversa,
em texto, marcação e página.

Referência: `integrations/` e `export/`.

[![integracoes](uml/svg/integracoes.svg)](uml/svg/integracoes.svg)

---

## 13. A API REST

A fábrica de aplicação monta o servidor com as rotas, e um verificador de
papel garante quem pode ou não entrar em cada recurso. Os objetos de
entrada ficam em um arquivo de esquemas, e cada um reflete o que a rota
recebe. As rotas dependem apenas das interfaces de serviço, nunca das
versões concretas.

Tudo isso está na pasta `api/`, feita com FastAPI.

[![api](uml/svg/api.svg)](uml/svg/api.svg)

---

## Como os desenhos são gerados

Os fontes ficam em `docs/uml/src/` e viram imagem com o PlantUML rodando
em Docker:

```bash
cd docs/uml
make all        # gera os SVG e depois os PNG
```

Três scripts em `docs/uml/tools/` cuidam do resto:

| script | para que serve |
|---|---|
| `dividir.py` | recorta os diagramas grandes em diagramas menores, por pacote |
| `ajustar_layout.py` | aplica o estilo comum e escolhe a orientação que deixa o desenho mais quadrado |
| `checar_relacoes.py` | compara as setas com o código e avisa quando alguma está errada |

O estilo de todos os diagramas está em `docs/uml/src/_estilo.puml`: mudar
lá muda em todos. O passo a passo para editar os desenhos está no
`docs/uml/README.md`.
