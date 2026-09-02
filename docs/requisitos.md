---
title: Documento de Requisitos
---

**Integrantes:** Salomão de Moraes, Marcel Guinhos, Lucas Dias e João Pedro.

**Cliente:** Consultório Odontológico Dra. Monica

# 1. Introdução

## 1.1. Objetivo

Desenvolver um agente conversacional com IA, integrado ao WhatsApp e a um portal web, para automatizar agendamentos, cancelamentos, dúvidas frequentes e lembretes de consulta. O agente usa um modelo de linguagem (LLM) apoiado por uma base de conhecimento do consultório. O objetivo é reduzir o tempo de espera do paciente e oferecer atendimento 24/7.

## 1.2. Escopo

**Produto:** Chatbot de Atendimento para Consultórios Odontológicos.

**Nome do produto:** SorriDent

### 1.2.1. Escopo IN

- Atendimento 24/7 para agendamentos, cancelamentos, remarcações e dúvidas administrativas.
- Lembretes automáticos com pedido de confirmação.
- Leitura e escrita da agenda no sistema do consultório.
- Registro do histórico de conversas e atendimentos.
- Relatórios diários consolidados por e-mail.
- Painel web administrativo.
- Transferência para atendente humano.

### 1.2.2. Escopo OUT

- **Atendimento clínico:** sem triagem, diagnóstico, prescrição ou orientação de saúde.
- **Pagamentos:** sem cobrança, transação financeira ou nota fiscal.
- **Alterações no sistema legado:** sem mudança de interface, dados ou regras internas.
- **Voz:** sem ligações ativas ou receptivas. Somente texto.
- **Análise preditiva:** sem previsão de demanda ou perfil de comportamento.
- **Marketing ativo:** sem campanhas ou promoções.

### 1.2.3. Canais

| Fase | Canal | Situação |
| --- | --- | --- |
| MVP | Portal web próprio (chat) | Obrigatório |
| MVP | WhatsApp Business Platform | Obrigatório |
| MVP | E-mail (SMTP), para relatórios e lembretes | Obrigatório |
| Fase 2 | Google Calendar, para espelhar a agenda | Futuro |

*O Microsoft Teams foi removido do escopo: o consultório não usa a ferramenta.*

# 2. Descrição Geral

## 2.1. Regras de Negócio (RN)

| ID | Descrição |
| --- | --- |
| RN-01 | Atendimento de segunda a sexta, 08h às 18h, e sábado, 08h às 12h. Sem atendimento em feriados. |
| RN-02 | Consulta padrão de 40 minutos. Durações distintas vêm do cadastro de procedimentos. |
| RN-03 | Só pode ser oferecido horário livre na agenda do dentista. |
| RN-04 | O agendamento exige nome completo, telefone e data de nascimento. |
| RN-05 | Cancelamento e remarcação exigem 4 horas de antecedência. Abaixo disso, vai para atendimento humano. |
| RN-06 | Lembrete 24 horas antes. Sem resposta em 12 horas, novo lembrete 3 horas antes. |
| RN-07 | Máximo de 2 consultas futuras por paciente pelo canal automatizado. |
| RN-08 | Consulta não confirmada não é cancelada. A falta é registrada pela recepção. |
| RN-09 | Relatório diário enviado às 19h de cada dia útil. |
| RN-10 | Toda questão clínica vai direto para atendimento humano. |
| RN-11 | O primeiro contato exibe o aviso de dados e registra o aceite. |

## 2.2. Requisitos Funcionais (RF)

| ID | Descrição |
| --- | --- |
| RF-01 | Responder dúvidas administrativas a partir da base de conhecimento. |
| RF-02 | Consultar horários disponíveis por data, período, dentista e procedimento. |
| RF-03 | Registrar novo agendamento na agenda do consultório. |
| RF-04 | Cancelar ou remarcar consulta existente. |
| RF-05 | Enviar lembretes e registrar a confirmação do paciente. |
| RF-06 | Armazenar histórico de conversas, agendamentos e confirmações. |
| RF-07 | Gerar e enviar por e-mail o relatório diário consolidado. |
| RF-08 | Exibir painel de controle (dashboard) web. |
| RF-09 | Coletar avaliação do paciente sobre a resposta do agente. |
| RF-10 | Transferir para atendente humano, preservando o histórico. |
| RF-11 | Enfileirar solicitações fora do expediente e notificar a recepção. |
| RF-12 | Permitir gerenciar base de conhecimento, horários, feriados e destinatários pelo painel. |
| RF-13 | Autenticar o painel via SSO (OAuth 2.0), com permissões por perfil. |
| RF-14 | Exibir o aviso de tratamento de dados e registrar o aceite. |
| RF-15 | Encaminhar pedidos de consulta, correção e exclusão de dados do titular. |

## 2.3. Requisitos Não Funcionais (RNF)

| ID | Descrição |
| --- | --- |
| RNF-01 | Disponibilidade 24/7, com mínimo de 99% ao mês. |
| RNF-02 | Resposta ao paciente em até 5 segundos em 95% das interações. |
| RNF-03 | Relatório diário concluído em até 5 minutos. |
| RNF-04 | Logs de execução detalhados para auditoria. |
| RNF-05 | Código-fonte em repositório Git privado, sem dados reais. |
| RNF-06 | Credenciais em cofre de segredos, nunca no código. |
| RNF-07 | Dados pessoais sob TLS 1.2+ e criptografados em repouso. |
| RNF-08 | Dados pessoais mascarados em logs e relatórios. |
| RNF-09 | Histórico de conversas retido por no máximo 12 meses. |
| RNF-10 | Acesso a dados de paciente restrito por perfil, com auditoria. |
| RNF-11 | Painel responsivo em navegadores atualizados. |
| RNF-12 | Suporte a 30 conversas simultâneas sem perda de desempenho. |

## 2.4. Exceções e Tratamentos de Erro

| ID | Situação | Tratamento |
| --- | --- | --- |
| E1 | Falha técnica (timeout, queda, rede) | Log detalhado e alerta à equipe. Ao paciente, mensagem simples, sem detalhes técnicos. |
| E2 | Sistema de agendamento indisponível | Avisar o paciente, enfileirar a solicitação e notificar a recepção. |
| E3 | Sem registros para o relatório | Enviar o relatório assinalando ausência de atendimentos. |
| E4 | Falha no envio de e-mail | Repetir até 3 vezes. Persistindo, registrar log e alertar a equipe. |
| E5 | Mensagem não compreendida | Após 2 tentativas, transferir a humano ou enfileirar. |
| E6 | Conflito de agenda | Informar o paciente, oferecer horários próximos e não gravar. |
| E7 | Recusa do aviso de dados | Encerrar sem coletar dados e orientar contato com a recepção. |

## 2.5. Critérios de Aceitação (CA)

| ID | Cenário | Confirmação de aceite |
| --- | --- | --- |
| CA-01 | Disponibilidade | O agente devolve apenas horários livres na agenda. |
| CA-02 | Agendamento | A consulta consta na agenda e o paciente recebe confirmação. |
| CA-03 | Cancelamento | Acima de 4 horas, o horário é liberado. Abaixo, vai a humano. |
| CA-04 | Lembrete | Enviado 24 horas antes e a resposta é registrada. |
| CA-05 | Relatórios | E-mail enviado às 19h aos destinatários cadastrados. |
| CA-06 | Dia sem movimento | Relatório enviado assinalando ausência de registros. |
| CA-07 | Exceções | Erro gera log, alerta à equipe e mensagem genérica ao paciente. |
| CA-08 | Escalonamento | Pergunta clínica vai a humano, sem opinião do agente. |
| CA-09 | Fora do horário | Solicitação das 23h é enfileirada e a recepção é notificada. |
| CA-10 | Estabilidade | 30 dias de operação sem intervenção manual. |
| CA-11 | Proteção de dados | Aviso exibido, aceite registrado e logs mascarados. |

## 2.6. Histórias de Usuário

### Paciente

| ID | História | Critério de aceitação |
| --- | --- | --- |
| US-01 | Como paciente, quero ver os horários disponíveis, para escolher um que caiba na minha rotina. | Informo o dia e recebo os horários livres em até 5 segundos. |
| US-02 | Como paciente, quero marcar consulta pelo WhatsApp a qualquer hora, para não depender da recepção. | Ao confirmar, a consulta entra na agenda e recebo confirmação. |
| US-03 | Como paciente, quero cancelar ou remarcar, para não ocupar um horário que não vou usar. | Com mais de 4 horas de antecedência, o horário é liberado. |
| US-04 | Como paciente, quero um lembrete antes da consulta, para não esquecer. | Recebo o lembrete 24 horas antes, com pedido de confirmação. |
| US-05 | Como paciente, quero falar com uma pessoa quando o robô não resolver. | Após 2 tentativas, sou transferido com o histórico preservado. |
| US-06 | Como paciente, quero saber como meus dados são usados e poder excluí-los. | Recebo o aviso antes de qualquer coleta e posso pedir exclusão. |

### Recepção

| ID | História | Critério de aceitação |
| --- | --- | --- |
| US-07 | Como recepcionista, quero ver o que o robô não resolveu, para retomar o atendimento. | Vejo a fila de pendências com o histórico de cada conversa. |
| US-08 | Como recepcionista, quero consultar o histórico do paciente antes de retornar o contato. | Busco por nome ou telefone e vejo os atendimentos anteriores. |
| US-09 | Como recepcionista, quero registrar faltas, para que apareçam no relatório. | A falta registrada consta no relatório diário. |

### Dentista

| ID | História | Critério de aceitação |
| --- | --- | --- |
| US-10 | Como dentista, quero que só horários livres sejam oferecidos, para evitar sobreposição. | Horário ocupado não aparece para o paciente. |
| US-11 | Como dentista, quero bloquear períodos da agenda, para férias e procedimentos longos. | Período bloqueado não é oferecido. |

### Administrador

| ID | História | Critério de aceitação |
| --- | --- | --- |
| US-12 | Como administradora, quero o relatório diário por e-mail, para acompanhar o movimento. | Recebo o e-mail às 19h com os dados do dia. |
| US-13 | Como administradora, quero ver os horários de pico, para dimensionar a equipe. | O dashboard mostra os atendimentos por faixa de horário. |
| US-14 | Como administradora, quero corrigir as respostas do robô sem programador. | Edito a base pelo painel e o agente passa a usar o novo texto. |
| US-15 | Como administradora, quero ver as respostas mal avaliadas, para corrigi-las. | A tela de feedback lista as interações negativas. |
| US-16 | Como administradora, quero acesso restrito por perfil, para proteger dados de pacientes. | Usuário sem perfil é bloqueado e a tentativa é registrada. |

### Equipe de desenvolvimento

| ID | História | Critério de aceitação |
| --- | --- | --- |
| US-17 | Como desenvolvedor, quero ser alertado quando o sistema falhar, para corrigir antes do cliente perceber. | Erro capturado gera log e alerta por e-mail. |

## 2.7. Requisitos de Interface

**Paciente:** chat no portal web do consultório e WhatsApp.

**Usuários internos:** painel web com as telas de login (SSO), dashboard, pacientes e histórico de conversas, fila de atendimentos escalonados, agenda dos dentistas, relatórios, logs, configurações e ajuda.

**Integrações:**

- Sistema de agendamento do consultório (leitura e escrita).
- Servidor SMTP.
- WhatsApp Business Platform.
- Provedor de identidade OAuth 2.0.
- Google Calendar (Fase 2).

## 2.8. Atributos de Qualidade

- **Disponibilidade:** 24/7, mínimo de 99% ao mês, sem intervenção manual rotineira.
- **Desempenho:** resposta em até 5 segundos; rotinas em lote em até 5 minutos.
- **Auditoria:** logs detalhados, captura de erros e alerta automático à equipe.
- **Segurança e privacidade:** criptografia, credenciais protegidas, acesso por perfil, mascaramento e retenção limitada, conforme a LGPD.
- **Usabilidade:** linguagem simples ao paciente e painel operável sem conhecimento técnico.

## 2.9. Características dos Usuários

- **Pacientes:** externos, sem cadastro no painel, familiaridade variável com tecnologia.
- **Recepção:** assume atendimentos escalonados e registra faltas.
- **Dentistas:** consultam e bloqueiam a própria agenda, sem acesso a dados financeiros.
- **Administrador (Dra. Monica):** acesso total ao painel, relatórios e configurações.

## 2.10. Restrições

- Comunicação apenas por canais de texto.
- Tratamento de dados conforme a LGPD.
- Sem alteração da estrutura ou das regras do sistema de agendamento existente.
- Uso do WhatsApp sujeito às políticas da Meta, com templates aprovados para lembretes.

# 3. Suposições e Dependências

- O sistema de agendamento atual é informatizado e oferece API ou acesso ao banco. **Se a agenda for em papel, a integração é inviável e o projeto passa a exigir agenda própria**, alterando prazo e escopo.
- Liberação de credenciais com permissão de **leitura e escrita** na agenda.
- Aprovação da conta no WhatsApp Business Platform, com templates de lembrete aprovados pela Meta. É o principal risco de cronograma.
- Servidor e SMTP disponíveis e configurados.
- Conteúdo inicial da base de conhecimento e destinatários dos relatórios fornecidos pelo cliente.
- Responsável designado para assumir os atendimentos escalonados.
- Nobreak no servidor local do sistema de agendamento, se houver.
