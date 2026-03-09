# 💈 App Agendamentos — Automação Inteligente de Atendimento

Sistema completo de agendamento automático para negócios como **barbearias, clínicas, petshops e prestadores de serviço**, combinando **IA, automação e interface web moderna**.

Este projeto integra **n8n, Supabase e Lovable** para criar uma solução de agendamento inteligente que automatiza grande parte do atendimento ao cliente.

---

# 🚀 Funcionalidades

### 📅 Agendamento online

Clientes podem agendar serviços diretamente pelo aplicativo web, escolhendo:

* serviço
* data
* horário
* nome
* telefone

O sistema registra automaticamente o agendamento no banco de dados.

---

### 💬 Atendimento automatizado via WhatsApp (n8n)

O sistema utiliza **workflows no n8n para automatizar o atendimento pelo WhatsApp**, permitindo que clientes interajam com o negócio diretamente pelo chat.

Entre as funções do robô:

* responder mensagens automaticamente
* realizar agendamentos via WhatsApp
* consultar horários disponíveis
* confirmar agendamentos
* cancelar agendamentos

---

### 🔔 Lembretes automáticos de agendamento

O n8n também gerencia lembretes enviados aos clientes antes do horário marcado.

Esses lembretes ajudam a:

* reduzir faltas
* lembrar o cliente do horário
* melhorar organização da agenda

---

### 👨‍💼 Transferência para atendimento humano

Caso necessário, o sistema pode **transferir o atendimento para um humano**, permitindo que o profissional continue a conversa diretamente com o cliente.

---

### 📊 Painel de agenda para o profissional

O sistema possui um painel onde o profissional pode:

* visualizar sua agenda
* acompanhar agendamentos
* editar serviços oferecidos
* configurar horários disponíveis

<img width="1849" height="887" alt="image" src="https://github.com/user-attachments/assets/15c7722a-91e6-473c-8a4e-242061b6766d" />
<img width="1859" height="879" alt="image" src="https://github.com/user-attachments/assets/d0fc7e3b-2785-4f83-a1e4-6623da58fc9d" />
<img width="1883" height="895" alt="image" src="https://github.com/user-attachments/assets/5fd2dc6e-4c7f-491d-9491-4938774475f7" />

---

# 🧠 Arquitetura do Sistema

### 🧩 Frontend — Lovable

Interface web usada para:

* clientes realizarem agendamentos
* profissionais gerenciarem agenda
* configuração de serviços e horários

---

### 💬 Automação de atendimento — n8n

O **n8n é responsável pelo atendimento automatizado via WhatsApp**, incluindo:

* recepção de mensagens
* interpretação da solicitação do cliente
* consulta ao banco de dados
* criação de agendamentos
* envio de confirmações e lembretes
* transferência para atendimento humano

---

### 🗄 Banco de dados — Supabase

O Supabase armazena todas as informações do sistema.

Principais tabelas:

* `agendamentos`
* `dados_clientes`
* `notifica_agendamento`

Essas tabelas armazenam:

* clientes
* horários agendados
* status do atendimento
* controle de notificações

---

# 🔄 Fluxo do sistema

1️⃣ Cliente agenda pelo site **ou envia mensagem no WhatsApp**
2️⃣ O sistema registra o agendamento no **Supabase**
3️⃣ O **n8n processa o fluxo de atendimento**
4️⃣ O cliente recebe confirmação e lembretes automáticos

---

# 🛠 Tecnologias utilizadas

* Lovable
* n8n
* Supabase
* React
* TypeScript

---

# 👨‍💻 Autor

Projeto desenvolvido por **Guilherme Domiquile**.

