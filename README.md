# BR-Simulator

Ein realitätsnaher, webbasierten Terminal-Story-Simulator, der interessierten Mitarbeitenden den Alltag, die Verantwortung und die Entscheidungslogik eines Betriebsrats (BR) erlebbar macht.

## Projektvision
Der BR-Simulator bildet typische Situationen im Betriebsrat ab – inklusive Beratung, Verhandlungen, Eskalationen und interner Gremiendynamik. Ziel ist es, die Komplexität dieser Rolle verständlich zu machen und Empathie für die Aufgaben eines BR aufzubauen.

## Pädagogisches Ziel
- Arbeitsrealität von BR-Mitgliedern nachvollziehbar machen.
- Entscheidungskonsequenzen erlebbar machen (Teamkohäsion, Vertrauen, Fristen).
- Reflexion über Verantwortung, Belastung und Kommunikationsstil ermöglichen.

## Abgrenzung (keine Rechtsberatung)
Diese Simulation stellt keine Rechtsberatung dar. Sie vermittelt ausschließlich ein realistisches, aber vereinfachtes Szenario, das nicht den Anspruch auf Vollständigkeit oder rechtliche Verbindlichkeit erhebt.

## Lokale Nutzung
1. Repository klonen.
2. Lokalen Webserver starten, z. B.:
   ```bash
   python -m http.server 8000
   ```
3. Im Browser `http://localhost:8000` öffnen.

## GitHub Pages Deployment
1. Repository in ein GitHub-Projekt pushen.
2. Unter **Settings → Pages** den Branch (z. B. `main`) auswählen.
3. Root-Verzeichnis (`/`) als Quelle nutzen.
4. Die Anwendung läuft vollständig statisch (HTML/CSS/JS) und ist Pages-kompatibel.

## Content erweitern
Die Storys sind datengetrieben und liegen in JSON-Dateien unter `/content`:
- `/content/events`
- `/content/cases`
- `/content/negotiations`
- `/content/gbr`
- `/content/conciliation`
- `/content/knowledge`

Neue Inhalte in der `content/manifest.json` ergänzen, damit die App sie lädt.

## Mechaniken erklärt
### BR & Gremium
- Teamkohäsion und Fraktionen beeinflussen Beschlüsse.
- Entscheidungen verändern Vertrauen, Stress, Reputation und Arbeitslast.
- Gremienmitglieder reagieren auf deinen Stil (Vertrauen, Konfliktmarker).

### Fristen & Formalien
- Fristen laufen tageweise herunter.
- Versäumte Fristen lösen automatische Konsequenzen aus.
- Formalstatus beeinflusst Verhandlungspositionen.

### Guided Actions & Expertenmodus
- Standardmäßig werden empfohlene nächste Schritte angezeigt.
- `hinweis` erklärt, warum bestimmte Schritte empfohlen sind.
- Mit `fuehrung aus` kann der Expertenmodus aktiviert werden.

### Kompetenzprofil & Chronik
- Entscheidungen beeinflussen langfristige Kompetenzachsen.
- Die Chronik hält Beschlüsse, Eskalationen und Konflikte fest.
- Am Ende gibt es eine „Amtszeit im Rückblick“-Auswertung.
- Der „Rote Faden“ führt durch eine zusammenhängende Handlung und zeigt Schwerpunkte je Phase.

### Stress & Selbstschutz
- Hoher Stress schränkt Optionen ein und kann Fehler auslösen.
- Gegenmaßnahmen: `pause nehmen`, `aufgabe delegieren`, `schulung besuchen`, `kollegiales gespraech`.

### GBR
- Fälle können an den Gesamtbetriebsrat übergeben werden.
- Die Qualität der Übergabe beeinflusst die Zusammenarbeit.

### Einigungsstelle
- Eskalation ist möglich und erfordert starke Aktenlage.
- Ergebnisse wirken dauerhaft auf Metriken und Storyverlauf.

## Mitwirkungsleitfaden
Beiträge sind willkommen! Bitte beachte:
- Neue Inhalte in separaten JSON-Dateien anlegen.
- Inhalte müssen realistisch, respektvoll und anonymisiert sein.
- Keine realen Personen oder rechtliche Beratung.
- Änderungen kurz im Pull Request beschreiben.

## Sicherheit & Ethik
- Keine echten Personen.
- Sensible Themen respektvoll behandeln.
- Hinweis auf professionelle Stellen bei Konflikten.

## Befehle (Deutsch)
- `hilfe` – Übersicht aller Kommandos
- `rolle mitglied` | `rolle vorsitz`
- `weiter` – Zeitslot fortschreiten
- `waehlen <nummer>` – Event-Option wählen
- `posteingang`, `faelle`, `fristen`
- `gremium status`, `gremium sprechen <name>`, `sitzung starten`, `abstimmen`
- `notiz anlegen <qualitaet> <thema>`
- `pause nehmen`, `aufgabe delegieren`, `schulung besuchen`, `kollegiales gespraech`
- `eskalieren gbr`, `einigungsstelle starten`
- `kompetenz`, `chronik`
- `roter faden`
- `fuehrung an`, `fuehrung aus`, `hinweis`
- `speichern`, `laden`, `zuruecksetzen`
- `antwort <nr> <text>` (am Ende)
