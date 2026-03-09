
# Barbershop Appointment Booking App

A clean, mobile-friendly public booking app where customers can schedule appointments at the barbershop. No login required — just pick a service, date, time, enter your info, and confirm.

## Flow

### Step 1 — Choose a Service
A visually appealing list of barbershop services (hardcoded), each showing name, duration, and price. Examples: Haircut, Beard Trim, Haircut + Beard, Hot Towel Shave, etc. You can customize these after implementation.

### Step 2 — Pick a Date
A calendar picker showing available dates (today onward, excluding Sundays or any days off you define). Past dates are disabled.

### Step 3 — Pick a Time Slot
A grid of time slots based on fixed business hours (e.g., 9:00–18:00, every 30 or 60 minutes). Slots already booked (fetched from the `agendamentos` table for the selected date) are shown as unavailable/greyed out.

### Step 4 — Enter Your Info
Simple form: Name and Phone number (Brazilian format). No account creation needed.

### Step 5 — Confirmation Screen
After booking, the app inserts rows into all three tables (`dados_clientes`, `agendamentos`, `notifica_agendamento`) and shows:
- **Booking ID** (the `agendamentos.id`) — prominently displayed
- Service, date, and time summary
- A reminder that this ID is needed for cancellation via WhatsApp

## Key Rules Enforced
- **Read + Insert only** — no updates or deletes
- `em_atendimento` always set to `false`
- No `atendimento_uuid` or `ticket_id` generated
- `agendamentos.status` set to `"confirmado"` on creation

## Design
- Clean, modern barbershop aesthetic
- Fully responsive (mobile-first)
- Step-by-step wizard flow with progress indicator
- Dark/warm tones fitting a barbershop brand

## Backend
- Supabase connection for reading booked slots and inserting new appointments
- RLS policies to allow public read on time slots and public insert on the three tables
