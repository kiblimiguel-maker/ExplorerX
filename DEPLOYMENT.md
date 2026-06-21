# ExplorerX auf Vercel deployen

Diese Checkliste gilt für die produktive Vite-App. Sie verändert weder Supabase-RLS noch Datenbanktabellen.

## 1. Repository vorbereiten

1. Prüfen, dass `.env.local`, `.env` und `.vercel/` nicht im Repository liegen.
2. Nur `package-lock.json` als Lockfile verwenden.
3. Lokal ausführen:

```bash
npm install
npm test
npm run lint
npm run build
```

4. Den geprüften Stand zu GitHub pushen.

## 2. Vercel-Projekt erstellen

1. In Vercel **Add New > Project** wählen und das GitHub-Repository importieren.
2. Ist ExplorerX ein Unterordner, **Root Directory** auf `outputs/ExplorerX` setzen. Ist ExplorerX das Repository, das Feld leer lassen.
3. Framework Preset: `Vite`.
4. Install Command: `npm ci`.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. Unter **Settings > Environment Variables** für Production und Preview setzen:

```text
VITE_SUPABASE_URL=https://kymusfeyvguicizoeqfa.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase Anon- oder Publishable-Key>
```

Der Anon-/Publishable-Key ist für Browser-Apps vorgesehen. Niemals einen `service_role`- oder Secret-Key als `VITE_*` Variable eintragen.

## 3. Supabase für Produktion konfigurieren

Vor dem Deployment prüfen, dass `supabase/place_rate_limit_update.sql` nach `supabase/admin_hardening.sql` ausgeführt wurde. Der folgende Read-only-Check zeigt die aktive Triggerfunktion und den Trigger:

```sql
select pg_get_functiondef('private.limit_place_spam()'::regprocedure);

select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.places'::regclass
  and tgname = 'limit_place_spam'
  and not tgisinternal;
```

Für einen funktionalen Test mit separaten Testkonten: Ein normaler Nutzer darf fünf Orte innerhalb einer Stunde veröffentlichen; der sechste muss mit `place hourly rate limit exceeded` scheitern. Ein in `public.admin_users` eingetragener Nutzer darf den sechsten Ort veröffentlichen. Das Tageslimit in einer Staging-Datenbank mit 20 beziehungsweise 100 Einträgen prüfen und Testdaten danach entfernen.

Unter **Authentication > URL Configuration** nach dem ersten Deploy setzen:

```text
Site URL:
https://DEINE-VERCEL-DOMAIN.vercel.app

Redirect URLs:
https://DEINE-VERCEL-DOMAIN.vercel.app/auth/callback
https://DEINE-VERCEL-DOMAIN.vercel.app/**
http://localhost:5173/auth/callback
http://localhost:5173/**
http://127.0.0.1:5173/auth/callback
http://127.0.0.1:5173/**
```

`DEINE-VERCEL-DOMAIN` durch die tatsächliche Domain ersetzen. Für eine eigene Domain auch deren `/auth/callback` und `/**` URLs ergänzen.

Unter **Authentication > Providers > Google** muss Google aktiviert sein. Der E-Mail-Provider kann deaktiviert bleiben, da ExplorerX ausschließlich Google OAuth verwendet.

## 4. Google Cloud konfigurieren

In der Google Cloud Console unter **APIs & Services > Credentials > OAuth 2.0 Client > Authorized redirect URIs** muss exakt stehen:

```text
https://kymusfeyvguicizoeqfa.supabase.co/auth/v1/callback
```

Nicht die Vercel-Callback-URL bei Google eintragen. Google kehrt zu Supabase zurück; Supabase prüft anschließend seine Redirect-Liste und leitet zu ExplorerX weiter.

## 5. Deploy und Routing prüfen

1. Deployment starten.
2. Nach Änderungen an ENV-Variablen oder Auth-URLs erneut deployen.
3. Diese URLs direkt in einem neuen Tab öffnen und neu laden:
   - `/map`
   - `/profile`
   - `/admin`
   - `/places/EINE-ECHTE-ORT-ID`
   - `/nicht-vorhanden`
4. Geschützte Seiten müssen ausgeloggt nach `/login` führen. Eine unbekannte Route muss den ExplorerX-404-State zeigen.

## 6. Produktions-Smoke-Test

Mit echten Testkonten und echten Supabase-Daten prüfen:

- Google Login, Callback, Session nach Reload und Logout
- Karte und Ortsdetailseite
- Ort erstellen und aktuellen/manuellen Standort verwenden
- Ortsfoto und Community-Foto hochladen sowie eigenes Foto löschen
- Like und Favorit setzen/entfernen
- Kommentar erstellen, bearbeiten und löschen
- Freundschaftsanfrage senden, annehmen, ablehnen und entfernen
- „Ich war hier“ setzen/entfernen
- Ort teilen und Route öffnen
- Profil bearbeiten und Avatar hochladen
- Normaler Nutzer wird bei `/admin` abgewiesen
- Admin kann Reports und Inhalte moderieren
- Direkter Reload aller wichtigen Routen
- Mobile Safari und Chrome Android ohne horizontalen Overflow

## 7. Vor öffentlichem Launch

- Eigene Domain in Vercel, Supabase und den Sharing-Metadaten eintragen
- Open-Graph-Vorschau mit einem Social-Debugger prüfen
- Supabase Security und Performance Advisors prüfen
- Moderations- und Datenschutzprozess veröffentlichen
- Fehler-Monitoring, Uptime-Monitoring und Backup-/Recovery-Prozess einrichten
- Upload- und Auth-Missbrauch mit Rate Limits beziehungsweise CAPTCHA beobachten
