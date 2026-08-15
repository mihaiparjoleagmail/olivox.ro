import { Metadata } from "next";
import Footer from "@/components/Footer";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Politica de confidentialitate",
  description: "Politica de confidentialitate GDPR a site-ului olivox.ro. Cum colectam, utilizam si protejam datele dumneavoastra personale.",
  alternates: { canonical: "https://olivox.ro/politica-confidentialitate" },
  robots: { index: true, follow: true },
};

// Datele operatorului vin din site_config — reimprospatam periodic.
export const revalidate = 300;

export default async function PoliticaPage() {
  const { companyCIF, companyLocality, companyCounty, emailOrders } = await getSiteConfig();

  return (
    <div className="page-wrapper">
      <header className="header">
        <div className="header__logo"><a href="/" style={{ textDecoration: "none", color: "inherit" }}>oli<span>vox</span>.ro</a></div>
      </header>
      <div className="legal-page">
        <h1>Politica de Confidentialitate</h1>
        <p><strong>Ultima actualizare:</strong> 31 martie 2026</p>

        <h2>1. Operator de date</h2>
        <p><strong>Mirela Parjolea</strong>, persoana fizica, distribuitor autorizat Snep ({companyCIF}), din {companyLocality}, judetul {companyCounty}, Romania.</p>
        <p>olivox.ro este un site personal, nu este operat de o societate comerciala.</p>
        <p>Email: <a href={`mailto:${emailOrders}`}>{emailOrders}</a></p>

        <h2>2. Ce date colectam</h2>
        <p>Colectam urmatoarele date personale necesare procesarii comenzilor:</p>
        <ul>
          <li>Nume si prenume</li>
          <li>Adresa de livrare (judet, localitate, strada)</li>
          <li>Numar de telefon</li>
          <li>Adresa de email (optional)</li>
        </ul>

        <h2>3. Scopul prelucrarii</h2>
        <ul>
          <li>Verificarea comenzii si transmiterea ei catre Snep SpA, in vederea procesarii, facturarii si livrarii</li>
          <li>Comunicarea cu clientul privind statusul comenzii si trimiterea linkului de plata</li>
          <li>Trimiterea confirmarii de comanda pe email</li>
          <li>Indeplinirea obligatiilor legale aplicabile</li>
        </ul>

        <h2>4. Temeiul legal</h2>
        <p>Prelucrarea se bazeaza pe executarea contractului (plasarea comenzii) conform Art. 6(1)(b) GDPR si pe obligatiile legale conform Art. 6(1)(c) GDPR.</p>

        <h2>5. Durata stocarii</h2>
        <p>Datele personale sunt stocate pe durata necesara indeplinirii scopurilor mentionate, dar nu mai mult de 3 ani de la ultima comanda, cu exceptia datelor pastrate in temeiul unei obligatii legale. Documentele fiscale aferente comenzii sunt pastrate de Snep SpA, in calitate de vanzator, conform propriilor termene legale.</p>

        <h2>6. Destinatari</h2>
        <p>Datele pot fi transmise catre:</p>
        <ul>
          <li><strong>Snep SpA</strong> (Viale Italia nr. 1, 56038 Ponsacco, Pisa, Italia) — vanzatorul produselor, care proceseaza comanda, emite factura, incaseaza plata si expediaza coletul</li>
          <li>Servicii de curierat — pentru livrarea comenzilor</li>
          <li>Servicii de hosting si stocare (Vercel, Supabase, Cloudflare) — pentru functionarea site-ului</li>
          <li>Servicii de email (Resend) — pentru notificari</li>
        </ul>
        <p>Transferul catre Snep SpA are loc in interiorul Uniunii Europene (Italia), deci nu implica un transfer catre o tara terta.</p>

        <h2>7. Drepturile dumneavoastra</h2>
        <p>Conform GDPR, aveti dreptul la:</p>
        <ul>
          <li>Acces la datele personale</li>
          <li>Rectificarea datelor inexacte</li>
          <li>Stergerea datelor (&quot;dreptul de a fi uitat&quot;)</li>
          <li>Restrictionarea prelucrarii</li>
          <li>Portabilitatea datelor</li>
          <li>Opozitia la prelucrare</li>
        </ul>
        <p>Pentru exercitarea acestor drepturi, contactati-ne la <a href="mailto:comenzi@olivox.ro">comenzi@olivox.ro</a>.</p>

        <h2>8. Plangeri</h2>
        <p>Aveti dreptul de a depune o plangere la Autoritatea Nationala de Supraveghere a Prelucrarii Datelor cu Caracter Personal (ANSPDCP) — <a href="https://www.dataprotection.ro/" target="_blank" rel="noopener noreferrer">dataprotection.ro</a>.</p>

        <h2>9. Securitate</h2>
        <p>Implementam masuri tehnice si organizatorice adecvate pentru protectia datelor personale, inclusiv criptare SSL/TLS, acces restrictionat si stocare securizata.</p>
      </div>
      <Footer />
    </div>
  );
}
