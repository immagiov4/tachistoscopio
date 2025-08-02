import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna indietro
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Termini e Condizioni d'Uso
          </h1>
          <p className="text-muted-foreground">
            Allenatore di Lettura Veloce - Piattaforma per il Potenziamento della Performance Visiva
          </p>
        </div>

        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>IMPORTANTE DISCLAIMER LEGALE:</strong> Questo software NON è un dispositivo medico 
            secondo il Regolamento MDR (UE) 2017/745 e non è destinato a diagnosi, trattamento, 
            prevenzione o mitigazione di malattie o condizioni mediche.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Natura del Servizio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                L'Allenatore di Lettura Veloce è una piattaforma educativa e sportiva progettata esclusivamente per:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
                <li>Allenamento della velocità di lettura</li>
                <li>Potenziamento delle performance visive</li>
                <li>Supporto a reading coach e allenatori specializzati</li>
                <li>Attività educative e formative</li>
              </ul>
              <p className="text-sm text-muted-foreground font-medium">
                Il software NON ha finalità mediche, terapeutiche, riabilitative o diagnostiche.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Limitazioni d'Uso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">DIVIETI ASSOLUTI:</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm text-red-800">
                  <li>Utilizzo per diagnosi di disturbi dell'apprendimento (dislessia, disgrafia, ecc.)</li>
                  <li>Impiego in contesti clinici o terapeutici</li>
                  <li>Sostituzione di interventi medici specialistici</li>
                  <li>Trattamento di patologie o condizioni mediche</li>
                  <li>Valutazione di capacità cognitive compromesse</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Responsabilità dell'Utente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                L'utente dichiara e garantisce di:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
                <li>Utilizzare il software esclusivamente per scopi educativi e di allenamento sportivo</li>
                <li>NON utilizzare la piattaforma per finalità mediche o terapeutiche</li>
                <li>Consultare sempre professionisti qualificati per questioni sanitarie</li>
                <li>Essere responsabile per qualsiasi uso improprio del software</li>
                <li>Rispettare tutte le leggi e regolamenti applicabili</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Esclusione di Responsabilità</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Gli sviluppatori del software declinano ogni responsabilità per:</strong>
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-yellow-800">
                  <li>Uso improprio del software per finalità mediche</li>
                  <li>Decisioni cliniche basate sui risultati della piattaforma</li>
                  <li>Ritardi o errori nella diagnosi dovuti all'uso improprio</li>
                  <li>Qualsiasi danno derivante dall'uso non conforme</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Uso Clinico a Responsabilità dell'Operatore</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>ATTENZIONE PROFESSIONISTI SANITARI:</strong> Qualsiasi uso di questo software 
                  in contesto clinico o terapeutico è effettuato sotto la TOTALE E ESCLUSIVA RESPONSABILITÀ 
                  del professionista sanitario utilizzatore.
                </p>
                <p className="text-sm text-blue-800 mt-2">
                  Il professionista deve assicurarsi che tale uso sia conforme alle normative locali 
                  e alle linee guida della propria professione.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Privacy e Dati Personali</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Il trattamento dei dati personali avviene in conformità al GDPR (Regolamento UE 2016/679):
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
                <li>I dati sono raccolti solo per le finalità dichiarate</li>
                <li>Ogni coach accede esclusivamente ai dati dei propri studenti</li>
                <li>È implementata la sicurezza a livello di riga (RLS)</li>
                <li>Gli utenti possono richiedere la cancellazione dei propri dati</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Limitazione di Garanzia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Il software è fornito "così com'è" senza garanzie di alcun tipo. Non garantiamo:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
                <li>Accuratezza assoluta dei risultati</li>
                <li>Idoneità per scopi specifici diversi da quelli dichiarati</li>
                <li>Assenza di interruzioni del servizio</li>
                <li>Compatibilità con tutti i dispositivi</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Modifiche ai Termini</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. 
                L'uso continuato del servizio dopo le modifiche costituisce accettazione dei nuovi termini.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Legge Applicabile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Questi termini sono regolati dalla legge italiana. Qualsiasi controversia sarà sottoposta 
                alla giurisdizione esclusiva dei tribunali italiani.
              </p>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground pt-6 border-t">
            <p>
              © 2025 Allenatore di Lettura Veloce - Piattaforma per il Potenziamento della Performance Visiva
            </p>
            <p className="mt-2">
              Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};