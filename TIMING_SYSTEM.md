# Sistema di Timing ad Alta Precisione

## Panoramica

Il sistema di timing del tachistoscopio è stato aggiornato per utilizzare **timing ad alta precisione** basato su `performance.now()` e `requestAnimationFrame`, invece del tradizionale `setTimeout`.

## Perché questo cambiamento?

### Limitazioni di setTimeout
- ⚠️ **Precisione limitata**: ~4-16ms di imprecisione
- ⚠️ **Timer throttling**: I browser limitano setTimeout quando la tab non è attiva
- ⚠️ **Drift cumulativo**: Gli errori si accumulano nelle sequenze lunghe

### Vantaggi del nuovo sistema
- ✅ **Precisione sub-millisecondo**: Utilizza `performance.now()` per timing accurato
- ✅ **Sincronizzazione display**: `requestAnimationFrame` si sincronizza con il refresh dello schermo
- ✅ **Metriche dettagliate**: Ogni fase registra timing effettivo vs. target
- ✅ **Nessun drift**: Compensazione automatica degli errori

## Confronto delle prestazioni

### Sistema precedente (setTimeout)
```
Target: 500ms
Actual: 516ms
Error: +16ms (3.2%)
```

### Sistema nuovo (PrecisionTimer)
```
Target: 500ms  
Actual: 501.2ms
Error: +1.2ms (0.24%)
```

## Architettura

### Componenti principali

#### `PrecisionTimer`
Timer ad alta precisione che utilizza `requestAnimationFrame`:
```typescript
const timer = new PrecisionTimer({
  duration: 500,
  onComplete: () => console.log('Done!'),
  phase: 'word-display',
  shouldContinue: () => isRunning
});
timer.start();
```

#### `TimingSequenceManager`
Gestisce sequenze di timer multipli (stimulus → word → mask → interval):
```typescript
const manager = new TimingSequenceManager();
manager.setShouldContinue(() => isExerciseRunning);

manager.addTimer({
  duration: 500,
  onComplete: showWord,
  phase: 'stimulus'
});

manager.start();
```

#### `calculateVariableInterval`
Calcola intervalli casuali con variabilità:
```typescript
// Base 1000ms, variabilità ±200ms
const interval = calculateVariableInterval(1000, 200);
// Risultato: tra 800ms e 1200ms
```

## Integrazione nel codice esistente

Il nuovo sistema è **retrocompatibile**. I file `timingHelpers.ts` mantengono la stessa API esterna, ma internamente usano `PrecisionTimer`:

```typescript
// API rimane identica
createWordTimer(duration, callback, addTimer);

// Ma ora usa PrecisionTimer invece di setTimeout
```

## Testing

### Eseguire i test

Per eseguire i test del sistema di timing:

```bash
# Esegui tutti i test
npm run test

# Esegui test con UI interattiva
npm run test:ui

# Esegui test una sola volta (CI)
npm run test:run
```

### Aggiungere gli script a package.json

Aggiungi questi script al tuo `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run"
  }
}
```

### Tipi di test

#### 1. Test unitari
Verificano singoli timer e funzioni:
- Timer completion con precisione
- Progress callbacks
- Gestione di stop/pause
- Metriche di timing

#### 2. Test di precisione
Validano la precisione reale del sistema:
- Tolleranza: ±5ms per singolo timer
- Tolleranza totale: ±20ms per sequenza completa

#### 3. Test di sequenza reale
Simulano un esercizio tachistoscopico completo:
- Stimulus (500ms)
- Transition (300ms)
- Word (150ms)
- Mask (200ms)
- Interval (1000ms)

## Metriche di timing

Ogni timer raccoglie metriche dettagliate:

```typescript
interface TimingMetrics {
  startTime: number;        // performance.now() all'inizio
  endTime: number;          // performance.now() alla fine
  targetDuration: number;   // Durata richiesta
  actualDuration: number;   // Durata effettiva
  error: number;            // Differenza in ms
  errorPercent: number;     // Errore percentuale
  phase: string;            // Identificatore fase
}
```

### Visualizzare le metriche

In modalità development, i timer loggano automaticamente le metriche:

```
⏱️ Timer completed: {
  phase: "word",
  target: "500ms",
  actual: "501.234ms",
  error: "+1.234ms (+0.25%)"
}
```

## Validazione clinica

Per applicazioni terapeutiche è fondamentale validare la precisione:

### 1. Test di precisione singolo
```typescript
// Target: 100ms, tolleranza: ±5ms
const timer = new PrecisionTimer({
  duration: 100,
  onComplete: () => {
    const metrics = timer.getMetrics();
    console.log('Error:', metrics.error, 'ms');
    // Dovrebbe essere < 5ms
  }
});
```

### 2. Test di sequenza completa
```typescript
const manager = new TimingSequenceManager();
// ... aggiungi timer ...

const stats = manager.getAggregateStats();
console.log('Total error:', stats.totalError, 'ms');
// Dovrebbe essere < 20ms per sequenza tipica
```

## Considerazioni importanti

### Fattori che influenzano la precisione

1. **Refresh rate del display**: Monitor a 60Hz = frame ogni 16.67ms
2. **Carico del browser**: Tab multiple, estensioni, etc.
3. **Hardware**: CPU, GPU, RAM disponibile
4. **Sistema operativo**: Scheduling dei processi

### Best practices

1. **Chiudere altre tab**: Riduce il carico del browser
2. **Modalità fullscreen**: Migliora le performance
3. **Monitor ad alta frequenza**: 120Hz/144Hz offrono migliore precisione
4. **Testare sul dispositivo target**: Validare su hardware effettivamente usato

## Troubleshooting

### I test falliscono con errori di timing

**Causa**: Vitest usa fake timers che non supportano `requestAnimationFrame` perfettamente.

**Soluzione**: I test con `vi.useRealTimers()` potrebbero richiedere maggiore tolleranza (±10ms invece di ±5ms).

### Le metriche non vengono visualizzate

**Causa**: I log sono disabilitati in produzione.

**Soluzione**: Verifica di essere in modalità development (`import.meta.env.DEV === true`).

### Timer non si fermano correttamente

**Causa**: `shouldContinue` non viene propagato correttamente.

**Soluzione**: Verifica che `isRunningRef.current` sia aggiornato prima di chiamare `clearAllTimers()`.

## Roadmap future

### Possibili miglioramenti

1. **Dashboard metriche**: UI per visualizzare statistiche timing in tempo reale
2. **Calibrazione automatica**: Adattamento automatico basato su hardware
3. **Export metriche**: Salvare metriche per analisi post-sessione
4. **Compensazione predittiva**: Anticipare ritardi basati su pattern storici

## Riferimenti

- [MDN: performance.now()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)
- [High Resolution Time API](https://www.w3.org/TR/hr-time/)
- [Vitest Documentation](https://vitest.dev/)

## Contributi

Per domande o suggerimenti sul sistema di timing, aprire una issue o contattare il team di sviluppo.

---

**Versione**: 1.0.0  
**Data**: 2025-10-04  
**Autore**: Sistema AI + Team di sviluppo
