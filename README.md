# Allenatore di Lettura Veloce

Un'applicazione web avanzata per l'allenamento della lettura veloce e il potenziamento della performance visiva, sviluppata per reading coach e allenatori specializzati.

## Caratteristiche Principali

### Per Coach
- **Gestione Studenti**: Creazione e gestione completa dei profili studenti
- **Liste di Parole Personalizzate**: Creazione di liste con parole reali o non-parole
- **Generatore di Parole**: Sistema automatico per generare parole basate su parametri specifici
- **Assegnazione Esercizi**: Pianificazione settimanale degli allenamenti per ogni studente
- **Monitoraggio Progressi**: Analisi dettagliata delle performance degli studenti

### Per Studenti
- **Dashboard Personale**: Accesso sicuro ai propri allenamenti giornalieri
- **Training di Lettura Veloce**: Esercizi con controllo preciso di:
  - Durata di esposizione (50-2000ms)
  - Intervalli tra stimoli
  - Mascheramento opzionale
  - Dimensione del testo
- **Feedback Immediato**: Risultati e statistiche in tempo reale
- **Accessibilità**: Supporto per diverse dimensioni di testo e temi

### Caratteristiche Tecniche
- **Sistema di Autenticazione**: Gestione sicura di coach e studenti
- **Database Relazionale**: Archiviazione strutturata di esercizi e risultati
- **Responsive Design**: Ottimizzato per desktop, tablet e mobile
- **Real-time Updates**: Sincronizzazione automatica dei dati
- **Cloud-Based**: Accessibile da qualsiasi dispositivo con connessione internet

## Tecnologie Utilizzate

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Edge Functions)
- **Autenticazione**: Supabase Auth
- **UI Components**: Radix UI, Shadcn/ui
- **Deployment**: Lovable Platform

## Sicurezza e Privacy

- **RLS (Row Level Security)**: Controllo granulare degli accessi ai dati
- **Autenticazione Email**: Sistema sicuro di login e registrazione
- **Separazione Dati**: Ogni coach accede solo ai propri studenti
- **GDPR Compliant**: Gestione conforme dei dati personali

## Deploy

L'applicazione è pronta per il deploy su qualsiasi piattaforma cloud moderna. 

### Deploy su Lovable
1. Vai su [Lovable](https://lovable.dev/projects/4bfaeec9-edae-4a8b-aaa3-2b5a8110108d)
2. Clicca su Share -> Publish
3. Configura le URL di redirect in Supabase per il dominio di produzione

### Configurazione Post-Deploy
1. **Supabase Auth Configuration**: 
   - Aggiungi l'URL di produzione nelle "Redirect URLs" 
   - Imposta la "Site URL" al dominio di produzione
2. **Email Configuration**: Verifica che le email di benvenuto funzionino correttamente
3. **RLS Policies**: Tutte le politiche di sicurezza sono già configurate

### Database Setup
Il database include:
- Tabelle per profili utente, liste di parole, esercizi e sessioni
- Politiche RLS complete per la sicurezza
- Funzioni automatiche per la gestione degli studenti
- Edge functions per operazioni avanzate

## Domini Personalizzati

Per connettere un dominio personalizzato:
1. Vai su Project > Settings > Domains
2. Clicca Connect Domain
3. Segui la guida: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Sviluppo Locale

Se vuoi sviluppare localmente:

```sh
# Clona il repository
git clone <YOUR_GIT_URL>

# Installa le dipendenze
npm i

# Avvia il server di sviluppo
npm run dev
```

## Supporto

Per supporto tecnico o domande sull'utilizzo dell'applicazione, contattare il team di sviluppo.

---

© 2025 Allenatore di Lettura Veloce - Piattaforma per il potenziamento della performance visiva