# ExplorerX

ExplorerX v2 ist eine mobile-first Social-Discovery-App für öffentliche Freizeitorte. Mit konfiguriertem Supabase arbeitet sie ausschliesslich mit echten Cloud-Daten. Ohne Konfiguration startet ein klar gekennzeichneter lokaler Demo-Modus.

## Funktionen

- Startseite, Entdecken, interaktive Leaflet-Karte, Detailseiten und Ranking
- Freitextsuche sowie Filter für Sport, Baden, Natur, Aussicht, Essen, Treffpunkt, Abenteuer und Sonstiges
- Standortfreigabe nur im Browser, Distanzberechnung und Explorer Score aus Suchtreffer, Likes und Nähe
- Orte per Kartenklick hinzufügen, validieren und mit mehreren echten Community-Fotos veröffentlichen
- Likes, deutlich sichtbare Meldefunktion, Lade-, Fehler- und Leerzustände
- Supabase-Modus mit Auth, RLS und Storage; automatischer lokaler Demo-Modus ohne Umgebungsvariablen
- Profile mit Avatar, Anzeigename, Bio, Beitrags- und Like-Statistiken
- Geräteübergreifende Favoriten und persönliche Favoriten-Seite
- Kommentare mit Autor, Zeitstempel sowie Bearbeiten/Löschen eigener Beiträge
- 7-Tage-Trending aus Likes und Kommentaraktivität
- Achievements für erstellte Orte, erhaltene Likes und besuchte Orte
- Zoomabhängige Marker-Cluster, Bild-Popups und direkte OpenStreetMap-Routen

## Voraussetzungen

- Node.js 22 oder neuer
- npm 10 oder neuer

## Lokal starten

```bash
cd outputs/ExplorerX
npm install
npm run dev
```

Dann `http://localhost:5173` öffnen.

Qualitätsprüfungen:

```bash
npm run lint
npm test
npm run build
npm run preview
```

`npm run preview` stellt den gebauten Ordner unter `http://localhost:4173` bereit.

## Supabase einrichten

1. Auf `https://supabase.com` ein kostenloses Projekt erstellen.
2. Im Supabase Dashboard **SQL Editor > New query** öffnen.
3. In einem frischen Projekt nacheinander `supabase/schema.sql`, `supabase/v2_migration.sql`, `supabase/launch_hardening.sql`, `supabase/ux_upgrade.sql`, `supabase/admin_hardening.sql`, `supabase/community_photos.sql` und `supabase/social_places.sql` ausführen. Die Skripte erstellen Schema, Social-Funktionen, Adressvalidierung und Filterfelder. Es werden keine Beispielorte oder künstlichen Interaktionen angelegt.
4. Unter **Project Settings > API** die Project URL und den **Anon Key** (bei neueren Projekten: den clientseitigen Publishable Key) kopieren. Niemals `service_role` oder einen Secret Key im Browser verwenden.
5. `.env.example` als `.env.local` anlegen und Werte einsetzen:

```env
VITE_SUPABASE_URL=https://DEIN_PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN_ANON_ODER_PUBLISHABLE_KEY
```

6. Unter **Authentication > Providers > Google** den Provider aktivieren und Google Client ID sowie Client Secret hinterlegen.
7. Unter **Authentication > URL Configuration** die Site URL setzen und alle unten aufgeführten Callback- und Wildcard-URLs erlauben.
8. In der Google Cloud Console exakt `https://kymusfeyvguicizoeqfa.supabase.co/auth/v1/callback` als **Authorized redirect URI** eintragen. Google leitet zuerst zu Supabase zurück; Supabase leitet danach zu ExplorerX weiter.
9. Unter **Integrations > Data API > Settings** prüfen, dass das `public` Schema exponiert ist. Die SQL-Skripte vergeben explizit die nötigen Rechte; RLS bleibt auf allen App-Tabellen aktiv.
10. Entwicklungsserver nach dem Anlegen von `.env.local` neu starten und über **Profil** mit Google anmelden.

### Auth URL Settings

In **Authentication > URL Configuration**:

```text
Lokal:
Site URL: http://127.0.0.1:5173

Produktion (nach dem ersten Vercel-Deploy ersetzen):
Site URL: https://DEINE-VERCEL-DOMAIN.vercel.app
```

Unter **Redirect URLs** ergänzen:

```text
http://127.0.0.1:5173/auth/callback
http://127.0.0.1:5173/**
http://localhost:5173/auth/callback
http://localhost:5173/**
https://DEINE-VERCEL-DOMAIN.vercel.app/auth/callback
https://DEINE-VERCEL-DOMAIN.vercel.app/**
```

### Google Login

ExplorerX verwendet ausschliesslich Google OAuth über Supabase. Die App startet den Provider mit `signInWithOAuth`, Google führt zurück zu `/auth/callback`, und ExplorerX tauscht dort den einmalig gültigen PKCE-Code gegen eine persistente Supabase-Session. Es werden keine Login-Mails versendet.

Nach einem erfolgreich getesteten Google Login kann **Authentication > Providers > Email** deaktiviert werden. Der Google Provider muss aktiviert bleiben. Für lokale Tests müssen sowohl `localhost` als auch `127.0.0.1` exakt in der Supabase-Redirect-Liste stehen; für Produktion die echte Vercel-Domain ohne Platzhalter ergänzen.

Supabase verknüpft Google automatisch mit einem bestehenden Auth-Nutzer, wenn beide dieselbe verifizierte E-Mail-Adresse verwenden. Dadurch bleiben Nutzer-ID, ExplorerX-Profil, Beiträge und Adminrolle erhalten. Wird bei Google eine andere E-Mail verwendet, entsteht ein neuer Auth-Nutzer; dessen neue ID muss bei Bedarf separat in `public.admin_users` eingetragen werden.

Supabase prüfen:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('users','places','likes','reports','photos','favorites','comments','visits');

select id, name, public, file_size_limit
from storage.buckets
where id = 'place-photos';
```

Alle acht App-Tabellen müssen RLS verwenden. Ortsfotos akzeptieren JPG, PNG und WebP bis 4 MB, Avatare bis 2 MB. Uploads werden im Ordner der angemeldeten User-ID gespeichert.

## ExplorerX-v2-Migration

Bestehende Projekte führen fehlende Dateien in dieser Reihenfolge aus: [supabase/v2_migration.sql](supabase/v2_migration.sql), [supabase/launch_hardening.sql](supabase/launch_hardening.sql), [supabase/ux_upgrade.sql](supabase/ux_upgrade.sql). Falls eine ältere Version von `ux_upgrade.sql` bereits ausgeführt wurde, danach einmalig [supabase/remove_ai_seed_data.sql](supabase/remove_ai_seed_data.sql) ausführen. Die Bereinigung entfernt nur die zehn bekannten Demo-UUIDs samt verknüpften Fake-Interaktionen; echte Nutzerorte bleiben erhalten.

Neue Tabellen:

- `favorites`: ein gespeicherter Ort pro Nutzer und Ort
- `comments`: Kommentare mit Eigentümer, Zeitstempel und Bearbeitungszeit
- `visits`: eindeutige besuchte Orte pro Nutzer

`trending_places` ist eine `security_invoker`-View und kombiniert Likes sowie Kommentare der letzten sieben Tage.

## Adminbereich

Für den geschützten Bereich `/admin` einmalig [supabase/admin_hardening.sql](supabase/admin_hardening.sql) im Supabase SQL Editor ausführen. Die Migration erstellt `admin_users`, aktiviert RLS und ergänzt ausschließlich serverseitig geprüfte Moderations-Policies. Im Frontend wird kein `service_role`- oder Secret-Key verwendet.

Danach den eigenen Account über seine Auth-User-ID zum Admin machen:

```sql
insert into public.admin_users (user_id)
select id from auth.users
where email = 'DEINE-EMAIL@example.com'
on conflict (user_id) do nothing;
```

Bei Google Login muss diese ID zum Google-Nutzer in `auth.users` gehören. Falls ein früherer E-Mail-Nutzer bereits Admin war, den Google-Account einmal anmelden und danach das obige Statement mit dessen Google-E-Mail ausführen. Alternativ die ID unter **Authentication > Users** kopieren und direkt eintragen:

```sql
insert into public.admin_users (user_id)
values ('GOOGLE-AUTH-USER-UUID')
on conflict (user_id) do nothing;
```

Anschliessend in ExplorerX ab- und wieder anmelden oder die Seite neu laden. Adminrollen können nicht über die App erstellt werden. Zum Entfernen einer Rolle im SQL Editor `delete from public.admin_users where user_id = 'USER-UUID';` ausführen.

## Community-Fotos

Damit eingeloggte Nutzer Fotos zu jedem aktiven Ort beitragen können, [supabase/community_photos.sql](supabase/community_photos.sql) im SQL Editor ausführen. Die Migration beschränkt Uploads auf JPG, PNG und WebP bis 4 MB, erzwingt den eigenen Storage-Ordner und erlaubt Nutzern nur das Löschen eigener Fotos. Die Admin-Policies aus `admin_hardening.sql` bleiben bestehen. Die App lädt bis zu zehn Bilder pro Vorgang hoch; danach können ohne Gesamtgrenze weitere Batches ergänzt werden.

## Freunde und „War hier“

Nach den bisherigen Migrationen [supabase/social_places.sql](supabase/social_places.sql) im SQL Editor ausführen. Die Migration erstellt `friendships`, ergänzt sichere RLS-Policies und synchronisierte Community-Zähler. Freundschaften sind nur für die beiden beteiligten Nutzer sichtbar. Visits bleiben privat und sind ausschließlich für den eigenen Account sowie bestätigte Freunde lesbar; öffentliche Ortskarten sehen nur den anonymen Gesamtzähler.

Nach dem Ausführen die App einmal neu laden. Unter `/friends` stehen Suche, Anfragen und die Freundesliste bereit. Auf jeder Ortsdetailseite kann „Ich war hier“ unabhängig gesetzt und wieder entfernt werden.

## Demo-Modus und Datenschutz

Ohne Supabase-Variablen speichert ExplorerX selbst erstellte Orte, Likes und Meldungen unter `explorerx.*`-Schlüsseln im LocalStorage. Es werden in keinem Modus Beispielorte erzeugt. Sind keine echten Orte vorhanden, zeigt die App einen Empty State mit einer klaren Aktion zum ersten Beitrag. Fällt Supabase aus, wird die letzte lokale Kopie angezeigt; Schreiben ist dann deaktiviert, damit keine nicht synchronisierbaren Änderungen entstehen. Der freigegebene Nutzerstandort wird nie gespeichert oder übertragen. Offensichtliche private Hausnummern werden im Formular und zusätzlich in Postgres blockiert.

## Bekannte Grenzen

- Neue Orte, Likes, Meldungen und Uploads erfordern im Supabase-Modus eine Anmeldung mit Google.
- Meldungen blenden einen Ort sofort für die meldende Person aus. Eine globale Moderationsoberfläche und automatische globale Sperrung sind bewusst nicht enthalten, damit einzelne Konten keine Orte eigenmächtig entfernen können.
- Die Erkennung privater Adressen blockiert typische Strassenangaben mit Hausnummern, ersetzt aber keine redaktionelle Moderation.
- Leaflet-Karten und externe Vorschaubilder benötigen eine Internetverbindung; der Offline-Modus cached keine Kartenkacheln.

## Kostenlos deployen

### Vercel

1. Repository in Vercel importieren.
2. **Root Directory** auf `outputs/ExplorerX` setzen, falls das übergeordnete Workspace-Repository importiert wird. Ist ExplorerX selbst das Repository, Root Directory leer lassen.
3. Framework Preset `Vite` wählen.
4. Install Command `npm ci`, Build Command `npm run build` und Output Directory `dist` verwenden. Diese Werte stehen auch in `vercel.json`.
5. `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` unter **Settings > Environment Variables** für Production und Preview ergänzen.
6. Deploy auslösen, die endgültige Domain in Supabase als Site URL und Redirect URL ergänzen und danach neu deployen.
7. Google Login sowie die vollständige Produktionsprüfung aus [DEPLOYMENT.md](DEPLOYMENT.md) durchführen.

`vercel.json` enthält die SPA-Weiterleitung für direkte URLs wie `/map`, `/profile`, `/admin` und `/places/:id`. Unbekannte App-Routen zeigen eine eigene 404-Seite.

### Netlify

1. Repository importieren und Base Directory `outputs/ExplorerX` setzen.
2. Build Command `npm run build`, Publish Directory `dist` setzen.
3. Supabase-Variablen unter **Site configuration > Environment variables** ergänzen.
4. Deploy auslösen. `public/_redirects` übernimmt das Client-Routing.

### Cloudflare Pages

1. Repository verbinden und Root Directory `outputs/ExplorerX` wählen.
2. Framework Preset `Vite`, Build Command `npm run build`, Output Directory `dist` setzen.
3. Unter **Settings > Variables and Secrets** die beiden öffentlichen Supabase-Werte ergänzen.
4. Deployment starten und die Pages-Domain als Supabase Auth Site URL eintragen.

## Architektur

- React 19 + TypeScript + Vite
- React Router
- Leaflet + OpenStreetMap/CARTO
- Supabase JS
- Vitest + Testing Library
- ESLint mit TypeScript- und React-Hooks-Regeln
- Route-basiertes Code-Splitting und getrennte React-, Supabase- und Leaflet-Bundles

## App-Icon und PWA

Das textfreie ExplorerX Berg-X-Icon liegt unter `public/icons/` in 1024, 512, 192, 180 und 32 Pixeln. `public/manifest.json`, Favicon, Apple Touch Icon, Open-Graph-Bild und die Navigation verwenden dieselbe visuelle Identität. Für ein installiertes PWA startet ExplorerX direkt auf `/map` im Standalone-Modus.

## Produktions-Checkliste

- Alle benötigten Supabase-SQL-Dateien und bei älteren Installationen `remove_ai_seed_data.sql` ausgeführt; Security/Performance Advisors geprüft
- Supabase Auth Site URL für die jeweilige Umgebung gesetzt
- `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` in allen Vercel-Umgebungen gesetzt
- Google Provider aktiv, Google-Callback exakt eingetragen und nicht mehr benötigter E-Mail-Provider deaktiviert
- Eigene Domain, HTTPS und Fehler-Monitoring eingerichtet
- Moderationsprozess für Reports und Kommentare definiert
- `npm test`, `npm run lint` und `npm run build` erfolgreich
- Mobile Safari, Chrome Android und langsame Mobilverbindung getestet

Die vollständige Schritt-für-Schritt-Anleitung inklusive Produktions-Smoke-Test steht in [DEPLOYMENT.md](DEPLOYMENT.md).
