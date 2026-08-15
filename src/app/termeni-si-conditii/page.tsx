import { Metadata } from "next";
import Footer from "@/components/Footer";
import { getSiteConfig, describeTiers } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Termeni si conditii",
  description: "Termeni si conditii de utilizare a site-ului olivox.ro. Informatii despre comenzi, livrare, returnare si garantie.",
  alternates: { canonical: "https://olivox.ro/termeni-si-conditii" },
  robots: { index: true, follow: true },
};

// Costul de transport / datele firmei vin din site_config — reimprospatam periodic.
export const revalidate = 300;

export default async function TermeniPage() {
  const { shippingCost, shippingTiers, companyCIF, companyLocality, companyCounty, emailOrders } = await getSiteConfig();
  const shippingText = describeTiers(shippingTiers, shippingCost);

  return (
    <div className="page-wrapper">
      <header className="header">
        <div className="header__logo"><a href="/" style={{ textDecoration: "none", color: "inherit" }}>oli<span>vox</span>.ro</a></div>
      </header>
      <div className="legal-page">
        <h1>Termeni si Conditii</h1>
        <p><strong>Ultima actualizare:</strong> 31 martie 2026</p>

        <h2>1. Informatii generale</h2>
        <p>Site-ul olivox.ro este un site personal, operat de <strong>Mirela Parjolea</strong>, persoana fizica, distribuitor autorizat Snep ({companyCIF}), din {companyLocality}, judetul {companyCounty}, Romania. Contact: <a href={`mailto:${emailOrders}`}>{emailOrders}</a>.</p>
        <p>Site-ul nu este un magazin online operat de o societate comerciala: are rol informativ si de intermediere a comenzilor catre Snep.</p>
        <p>Prin accesarea si utilizarea acestui site, acceptati in totalitate prezentii termeni si conditii.</p>
        <p>Olivox este <strong>distribuitor autorizat Snep</strong> si <strong>intermediaza vanzarea</strong> produselor din catalogul Snep: ofera consiliere si indrumare, preia si verifica comenzile si asigura suportul pe toata durata acestora. <strong>Vanzatorul produselor este Snep SpA</strong>, Viale Italia nr. 1, 56038 Ponsacco (Pisa), Italia. Contractul de vanzare, incasarea platii si rambursarea in caz de retragere se realizeaza cu Snep.</p>

        <h2>2. Produse si servicii</h2>
        <p>Intermediem produsele din catalogul Snep — suplimente alimentare, alimente functionale, cosmetice naturale si produse de ingrijire. Pretul afisat pe site include TVA.</p>

        <h2>3. Procesul de comanda</h2>
        <p>Pentru a plasa o comanda, clientul trebuie sa:</p>
        <ul>
          <li>Selecteze produsul dorit</li>
          <li>Completeze datele de livrare (nume, adresa, telefon)</li>
          <li>Confirme comanda prin apasarea butonului &quot;Comanda acum&quot;</li>
        </ul>
        <p>Dupa plasarea comenzii, clientul va primi o confirmare pe email (daca a furnizat adresa de email).</p>

        <h2>4. Preturi si plata</h2>
        <p>Pretul produselor este cel afisat pe site la momentul plasarii comenzii.</p>
        <p>Plata se efectueaza <strong>online, direct catre Snep</strong>, cu cardul. Olivox nu incaseaza contravaloarea produselor. Nu acceptam plata ramburs (la livrare).</p>
        <p>Dupa verificarea comenzii, clientul primeste pe WhatsApp sau pe email linkul securizat de plata cu cardul, emis de Snep, pentru suma totala a comenzii (produse + transport). Comanda este expediata numai dupa confirmarea platii. Daca plata nu este efectuata in termen de 5 zile lucratoare de la primirea linkului, comanda poate fi anulata, fara alte obligatii pentru niciuna dintre parti.</p>

        <h2>5. Livrare</h2>
        <p>Comenzile sunt procesate in 1-2 zile lucratoare de la confirmarea platii. Livrarea se face prin curier, in 3-5 zile lucratoare, pe teritoriul Romaniei.</p>
        <p>Costul transportului este <strong>{shippingText}</strong>, oriunde in Romania. Costul este afisat separat in formularul de comanda, inainte de trimiterea acesteia, si este inclus in totalul de plata.</p>

        <h2>6. Dreptul de retragere</h2>
        <p>Conform OUG 34/2014 si conditiilor generale de vanzare Snep, consumatorul beneficiaza de dreptul de retragere in termen de <strong>14 zile calendaristice</strong> de la primirea produsului, fara a fi nevoit sa isi motiveze decizia.</p>
        <p>Cererea de retragere se comunica in scris catre Snep, la adresa <a href="mailto:info@mysnep.com">info@mysnep.com</a>, in interiorul celor 14 zile. Olivox ofera asistenta la intocmirea si transmiterea cererii. Produsele se returneaza in maximum 14 zile de la comunicarea cererii, la adresa indicata de Snep, in ambalajul original si complete. <strong>Costurile directe ale returului sunt suportate de client</strong>, conform art. 14 din OUG 34/2014.</p>
        <p>Rambursarea se face de catre Snep, in maximum 14 zile de la primirea produselor returnate, <strong>prin aceeasi metoda de plata</strong> folosita de client la achizitie.</p>
        <p>Retragerea nu se aplica in situatiile prevazute la art. 16 din OUG 34/2014 — produse sigilate care nu pot fi returnate din motive de igiena sau protectie a sanatatii si al caror sigiliu a fost desfacut, produse personalizate, produse care se pot deteriora sau expira rapid. Retragerea nu se accepta nici daca lipseste ambalajul original, daca produsul este incomplet sau daca a fost deteriorat de client.</p>

        <h2>7. Garantie si conformitate</h2>
        <p>Produsele sunt garantate de producator, Snep SpA. Daca produsul prezinta defecte sau neconformitati constatate la primire, ne anunti in cel mai scurt timp si preluam reclamatia catre Snep, in vederea inlocuirii produsului sau a rambursarii contravalorii.</p>

        <h2>9. Protectia datelor</h2>
        <p>Datele personale sunt prelucrate conform <a href="/politica-confidentialitate">Politicii de confidentialitate</a> si legislatiei GDPR.</p>

        <h2>10. Litigii</h2>
        <p>Eventualele litigii se vor solutiona pe cale amiabila. In caz contrar, competenta revine instantelor judecatoresti romane.</p>
        <p>Consumatorii pot depune reclamatii pe platforma europeana SOL: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a></p>
        <p>ANPC: <a href="https://anpc.ro/" target="_blank" rel="noopener noreferrer">anpc.ro</a></p>

        <h2>11. Contact</h2>
        <p>Pentru orice intrebari: <a href="mailto:comenzi@olivox.ro">comenzi@olivox.ro</a> | Tel: <a href="tel:0737965125">0737 965 125</a></p>
      </div>
      <Footer />
    </div>
  );
}
