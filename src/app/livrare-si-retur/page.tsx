import type { Metadata } from "next";
import Header from "@/components/Header";
import { getSiteConfig, describeTiers, normalizeTiers } from "@/lib/site-config";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Livrare si retur — 3-5 zile lucratoare | Olivox",
  description:
    "Livrare in 3-5 zile lucratoare prin curier in toata Romania. Plata se face online, direct catre Snep, prin link securizat de plata cu cardul. Drept de retur 14 zile conform OUG 34/2014.",
  alternates: { canonical: "https://olivox.ro/livrare-si-retur" },
  openGraph: {
    title: "Livrare si retur — 3-5 zile lucratoare",
    description: "Livrare rapida prin curier. Retur in 14 zile conform OUG 34/2014.",
    url: "https://olivox.ro/livrare-si-retur",
    type: "website",
    siteName: "olivox.ro",
    locale: "ro_RO",
    // openGraph declarat aici inlocuieste complet blocul din layout, deci
    // imaginea implicita trebuie repetata sau pagina ramane fara og:image.
    images: [{ url: "https://olivox.ro/og-default.jpg", alt: "Livrare si retur — olivox.ro", width: 1200, height: 630 }],
  },
};

// Costul de transport / datele firmei vin din site_config — reimprospatam periodic.
export const revalidate = 300;

export default async function LivrareReturPage() {
  const { shippingCost, shippingTiers, shippingLabel } = await getSiteConfig();
  const tiers = normalizeTiers(shippingTiers);

  return (
    <div className="page-wrapper">
      <Header />
      <article className="static-page">
        <header className="static-page__hero">
          <div className="eyebrow">Logistica</div>
          <h1>Livrare si retur</h1>
          <p className="lead">
            Livram in toata Romania in 3-5 zile lucratoare. Plata se efectueaza online, direct catre Snep:
            dupa verificarea comenzii primesti pe WhatsApp sau e-mail linkul securizat de plata cu cardul.
            Ai drept de retragere de 14 zile calendaristice, conform OUG 34/2014.
          </p>
        </header>

        <section>
          <h2>Livrare</h2>
          <ul className="bullets">
            <li><strong>Termen:</strong> 3-5 zile lucratoare de la confirmarea telefonica a comenzii.</li>
            <li><strong>Acoperire:</strong> toata Romania, prin curier (FanCourier sau Sameday).</li>
            <li><strong>Cost transport ({shippingLabel.toLowerCase()}):</strong>{" "}
              {describeTiers(tiers, shippingCost)}, oriunde in Romania — se adauga automat la totalul din formular.</li>
            <li><strong>Plata:</strong> online, direct catre Snep, prin link securizat de plata cu cardul. Nu se plateste nimic la curier.</li>
            <li><strong>Tracking:</strong> primesti codul AWB pe email sau SMS cand coletul pleaca.</li>
          </ul>
        </section>

        {tiers.length > 1 && (
          <section>
            <h2>Cat costa transportul</h2>
            <p>
              Costul curierului depinde de valoarea produselor din comanda (fara transport). Suma exacta o vezi
              in formular, inainte sa trimiti comanda.
            </p>
            <ul className="bullets">
              {tiers.map((tier, i) => {
                const next = tiers[i + 1];
                const price = tier.cost > 0 ? `${tier.cost} lei` : "gratuit";
                const range = next
                  ? tier.minValue > 0
                    ? `comenzi intre ${tier.minValue} si ${next.minValue} lei`
                    : `comenzi sub ${next.minValue} lei`
                  : `comenzi de la ${tier.minValue} lei in sus`;
                return <li key={tier.minValue}><strong>{price}</strong> — {range}</li>;
              })}
            </ul>
          </section>
        )}

        <section>
          <h2>Confirmare comanda</h2>
          <p>
            Dupa plasarea comenzii prin formular, un operator te va contacta telefonic in cateva ore lucratoare
            pentru confirmare. Acolo verificam adresa, produsele si eventuale intrebari.
          </p>
        </section>

        <section>
          <h2>Plata — online, direct catre Snep</h2>
          <p>
            Plata se efectueaza online, <strong>direct catre Snep</strong>, cu cardul. Olivox nu incaseaza
            contravaloarea produselor si nu se plateste nimic la curier.
          </p>
          <ol className="bullets">
            <li>Plasezi comanda prin formularul de pe pagina produsului.</li>
            <li>Verificam comanda si te contactam pentru a confirma produsele, adresa si costul total (produse + transport).</li>
            <li>Primesti pe WhatsApp sau pe e-mail linkul securizat de plata cu cardul, emis de Snep.</li>
            <li>Dupa confirmarea platii, pregatim coletul si il predam curierului. Primesti codul AWB pe email sau SMS.</li>
          </ol>
          <p>
            Daca ai intrebari despre acest proces, suna-ne inainte de a plasa comanda si discutam.
          </p>
        </section>

        <section>
          <h2>Retur — 14 zile, direct cu Snep</h2>
          <p>
            Vanzatorul produselor este <strong>Snep SpA</strong> (Viale Italia nr. 1, 56038 Ponsacco, Pisa,
            Italia). Olivox intermediaza vanzarea — te consiliem, plasam comanda si te ajutam cu procedura —
            dar contractul de vanzare si rambursarea se fac cu Snep.
          </p>
          <p>
            Conform <strong>OUG 34/2014</strong> si conditiilor generale Snep, ai dreptul sa te retragi din
            contract fara motivare, in termen de <strong>14 zile calendaristice</strong> de la primirea
            coletului.
          </p>
          <h3>Cum procedezi</h3>
          <ol className="bullets">
            <li>Anunta-ne la <a href="mailto:comenzi@olivox.ro">comenzi@olivox.ro</a> sau pe WhatsApp, cu numarul comenzii si produsele pe care vrei sa le returnezi. Te ajutam sa completezi cererea de retragere.</li>
            <li>Cererea se transmite in scris catre Snep, la <a href="mailto:info@mysnep.com">info@mysnep.com</a>, in cele 14 zile. Poti trimite si singur, direct.</li>
            <li>Trimiti produsele inapoi in maximum 14 zile de la comunicarea cererii, la adresa indicata de Snep, in ambalajul original si complete. <strong>Costul transportului de retur este suportat de client</strong>, conform legii.</li>
            <li>Snep ramburseaza suma in maximum 14 zile de la primirea produselor, <strong>prin aceeasi metoda de plata</strong> folosita la comanda (cardul cu care ai platit).</li>
          </ol>
          <h3>Cand nu se poate returna</h3>
          <p>
            Conform OUG 34/2014, articolul 16, si conditiilor Snep, nu pot fi returnate: produsele sigilate care,
            odata desfacute, nu mai pot fi returnate din motive de protectie a sanatatii sau de igiena (de exemplu
            suplimentele al caror sigiliu a fost rupt), produsele personalizate si cele care se pot deteriora sau
            expira rapid. De asemenea, retragerea nu se accepta daca lipseste ambalajul original, daca produsul e
            incomplet sau daca a fost deteriorat de client.
          </p>
        </section>

        <section>
          <h2>Produs deteriorat la primire</h2>
          <p>
            Daca la primire observi ca ambalajul exterior este deteriorat, refuza coletul sau accepta-l cu
            mentiuni scrise pe AWB. Trimite-ne imediat o fotografie la <a href="mailto:comenzi@olivox.ro">comenzi@olivox.ro</a>{" "}
            si ne ocupam noi de reclamatie catre Snep, pentru inlocuirea produsului.
          </p>
        </section>

        <section>
          <h2>Contact pentru logistica</h2>
          <p>
            Pentru orice intrebare legata de livrare sau retur, contacteaza-ne prin <a href="/contact">pagina de contact</a> sau
            la email. Raspundem in maxim 24 de ore lucratoare.
          </p>
        </section>
      </article>
      <Footer />
    </div>
  );
}
