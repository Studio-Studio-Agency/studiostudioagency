import { Link } from "react-router-dom";
import goodgoodsLogo from "@/assets/goodgoods-logo.svg";
import AppFooter from "@/components/AppFooter";

const DatenschutzPage = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <header className="border-b bg-card">
      <div className="container flex items-center justify-between py-4">
        <Link to="/">
          <img src={goodgoodsLogo} alt="GoodGoods" className="h-6 w-auto" />
        </Link>
      </div>
    </header>

    <main className="container max-w-2xl py-12 space-y-8 flex-1">
      <h1 className="text-3xl font-bold">Datenschutzerklärung</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Verantwortlicher</h2>
        <p className="text-muted-foreground leading-relaxed">
          Studio Studio Agency<br />
          Alain Szerdahelyi<br />
          CH-4054 Basel, Schweiz<br />
          E-Mail:{" "}
          <a href="mailto:hello@studiostudio.ch" className="text-primary hover:underline">
            hello@studiostudio.ch
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Erhobene Daten</h2>
        <p className="text-muted-foreground leading-relaxed">
          Wir erheben und verarbeiten folgende personenbezogene Daten:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li><strong className="text-foreground">Registrierung:</strong> E-Mail-Adresse, Vorname, Passwort (verschlüsselt)</li>
          <li><strong className="text-foreground">Profilbild:</strong> Optionaler Avatar-Upload</li>
          <li><strong className="text-foreground">Nutzungsdaten:</strong> Einkaufslisten, Artikel, Haltbarkeitsdaten</li>
          <li><strong className="text-foreground">iOS-Warteliste:</strong> E-Mail-Adresse</li>
          <li><strong className="text-foreground">Feedback & Umfragen:</strong> Freitextantworten</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Zweck der Datenverarbeitung</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>Bereitstellung und Betrieb der GoodGoods-Anwendung</li>
          <li>Benutzerauthentifizierung und Kontoverwaltung</li>
          <li>KI-gestützte Analyse der Haltbarkeit von Lebensmitteln</li>
          <li>Kalender-Integration zur Erinnerung an Ablaufdaten</li>
          <li>Teilen von Einkaufslisten mit anderen Personen</li>
          <li>Verbesserung des Dienstes durch Feedback und Umfragen</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Rechtsgrundlage</h2>
        <p className="text-muted-foreground leading-relaxed">
          Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO (Einwilligung),
          Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an der Verbesserung unseres Dienstes).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Datenspeicherung & Hosting</h2>
        <p className="text-muted-foreground leading-relaxed">
          Die Daten werden auf Servern unseres Hosting-Partners in der EU gespeichert.
          Passwörter werden ausschliesslich verschlüsselt (gehasht) abgelegt.
          Wir setzen angemessene technische und organisatorische Massnahmen ein,
          um deine Daten zu schützen.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Weitergabe an Dritte</h2>
        <p className="text-muted-foreground leading-relaxed">
          Personenbezogene Daten werden nicht an Dritte verkauft. Eine Weitergabe erfolgt nur:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>An Hosting- und Infrastruktur-Dienstleister zur Bereitstellung des Dienstes</li>
          <li>An KI-Dienste zur Analyse der Haltbarkeit (anonymisierte Artikelnamen)</li>
          <li>Wenn du eine Einkaufsliste aktiv mit anderen Personen teilst</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Cookies & Tracking</h2>
        <p className="text-muted-foreground leading-relaxed">
          GoodGoods verwendet keine Tracking-Cookies und kein Analyse-Tracking von Drittanbietern.
          Es werden ausschliesslich technisch notwendige Cookies für die Authentifizierung verwendet.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. Deine Rechte</h2>
        <p className="text-muted-foreground leading-relaxed">
          Du hast jederzeit das Recht auf:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li><strong className="text-foreground">Auskunft</strong> über deine gespeicherten Daten (Art. 15 DSGVO)</li>
          <li><strong className="text-foreground">Berichtigung</strong> unrichtiger Daten (Art. 16 DSGVO)</li>
          <li><strong className="text-foreground">Löschung</strong> deiner Daten (Art. 17 DSGVO)</li>
          <li><strong className="text-foreground">Einschränkung</strong> der Verarbeitung (Art. 18 DSGVO)</li>
          <li><strong className="text-foreground">Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
          <li><strong className="text-foreground">Widerspruch</strong> gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </ul>
        <p className="text-muted-foreground leading-relaxed">
          Wende dich dazu an{" "}
          <a href="mailto:hello@studiostudio.ch" className="text-primary hover:underline">
            hello@studiostudio.ch
          </a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">9. Löschung des Kontos</h2>
        <p className="text-muted-foreground leading-relaxed">
          Du kannst dein Konto jederzeit in den Einstellungen löschen. Dabei werden alle
          personenbezogenen Daten, Einkaufslisten und Artikel unwiderruflich gelöscht.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">10. Änderungen</h2>
        <p className="text-muted-foreground leading-relaxed">
          Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte
          rechtliche Anforderungen oder Änderungen unseres Dienstes anzupassen.
          Die aktuelle Version ist stets unter dieser Seite abrufbar.
        </p>
        <p className="text-sm text-muted-foreground">Stand: März 2026</p>
      </section>

      <div className="pt-4 border-t">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Zurück zur Startseite
        </Link>
      </div>
    </main>

    <AppFooter />
  </div>
);

export default DatenschutzPage;
