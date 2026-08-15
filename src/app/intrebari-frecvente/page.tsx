import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSiteConfig, describeTiers } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Intrebari frecvente (FAQ) — Olivox",
  description:
    "Raspunsuri la intrebari frecvente despre comenzi, plata, livrare, retur, produse Snep, ingrediente, alergeni si certificari.",
  alternates: { canonical: "https://olivox.ro/intrebari-frecvente" },
};

function buildFaqs(shippingText: string): { q: string; a: string }[] { return [
  {
    q: "In cat timp primesc coletul?",
    a: "Livrarea se face in 3-5 zile lucratoare de la confirmarea telefonica a comenzii, prin curier, in toata Romania.",
  },
  {
    q: "Cum platesc comanda?",
    a: "Plata se efectueaza online, direct catre Snep. Dupa verificarea comenzii primesti pe WhatsApp sau pe email linkul securizat de plata cu cardul, iar coletul pleaca imediat ce plata este confirmata. Olivox nu incaseaza contravaloarea produselor si nu se plateste nimic la curier.",
  },
  {
    q: "Cat costa transportul?",
    a: `Transportul costa ${shippingText}, oriunde in Romania. Suma apare separat in formularul de comanda, inainte sa o trimiti, si este inclusa in totalul de plata.`,
  },
  {
    q: "Cine incaseaza banii pe comanda?",
    a: "Snep. Plata se face online, cu cardul, prin linkul securizat pe care il primesti pe WhatsApp sau pe email dupa verificarea comenzii. Olivox este distribuitor si nu incaseaza contravaloarea produselor.",
  },
  {
    q: "Cand primesc linkul de plata?",
    a: "Imediat dupa ce verificam comanda si confirmam produsele, adresa si costul total (produse + transport). Linkul ajunge pe WhatsApp sau pe email, iar coletul pleaca dupa confirmarea platii.",
  },
  {
    q: "Pot returna produsele?",
    a: "Da. Ai 14 zile calendaristice de la primire pentru retragere, conform OUG 34/2014 si conditiilor Snep. Cererea se transmite in scris catre Snep, la info@mysnep.com — te ajutam noi sa o intocmesti. Produsele se trimit inapoi in ambalajul original, pe cheltuiala clientului, iar Snep ramburseaza suma in maximum 14 zile, pe cardul folosit la plata. Produsele sigilate (suplimente) pot fi returnate doar daca sigiliul nu a fost rupt. Detalii in pagina Livrare si retur.",
  },
  {
    q: "Gasesc produsele Snep in farmacii sau pe eMAG?",
    a: "Nu. Snep lucreaza pe distributie directa, prin distribuitori autorizati, deci nu exista raft de farmacie cu produse Snep — nici la Catena, Dr. Max, Tei sau Plafar — iar farmacistul nu le poate comanda nici la cerere. Distribuitorii nu au voie prin contract sa vanda pe eMAG, OLX sau alte marketplace-uri. Preturile sunt cele de catalog ale producatorului, aceleasi in toata tara.",
  },
  {
    q: "Produsele Olivox sunt originale?",
    a: "Da. Olivox este distribuitor al catalogului Snep. Toate produsele sunt importate direct, in ambalajul original al producatorului, cu eticheta in limba romana conforma cu Regulamentul UE 1169/2011.",
  },
  {
    q: "Ce ingrediente contin suplimentele?",
    a: "Ingredientele complete sunt listate pe pagina fiecarui produs, in sectiunea Ce este inauntru. Recomandam sa citesti eticheta inainte de achizitie, mai ales daca ai alergii cunoscute.",
  },
  {
    q: "Produsele sunt potrivite pentru vegani?",
    a: "O parte din catalogul Snep este vegana (suplimente pe baza de plante, extracte, cosmetice). Verifica mentiunea pe pagina fiecarui produs. Daca ai nelamuriri, scrie-ne si iti confirmam in scris.",
  },
  {
    q: "Contin alergeni?",
    a: "Pentru alergeni majori (gluten, lactoza, soia, nuci, sulfiti) consulta sectiunea Avertismente de pe pagina produsului. In caz de alergie severa, cere-ne fisa tehnica completa pe email.",
  },
  {
    q: "Pot lua mai multe suplimente simultan?",
    a: "In general da, dar combinatiile depind de formula si de tratamentele existente. Daca urmezi o medicatie cronica sau ai o afectiune, consulta medicul curant inainte de administrare.",
  },
  {
    q: "Sunt produse pentru copii?",
    a: "Nu toate. Varsta minima recomandata este specificata pe eticheta si in sectiunea Mod de utilizare. Produsele pentru adulti nu se administreaza copiilor fara aviz medical.",
  },
  {
    q: "Ce certificari au produsele Snep?",
    a: "Productia este realizata in Italia conform reglementarilor UE pentru suplimente alimentare, cu proceduri GMP (Good Manufacturing Practice), materii prime trasabile si extracte standardizate.",
  },
  {
    q: "Cum pastrez produsele?",
    a: "Majoritatea suplimentelor se pastreaza la loc uscat, racoros, ferit de lumina directa, la temperaturi sub 25 grade Celsius. Verifica mentiunile specifice de pe eticheta.",
  },
  {
    q: "Pot plasa comanda fara cont?",
    a: "Da. Comanda se plaseaza direct prin formularul de pe pagina produsului, fara inregistrare. Primesti confirmare pe email si telefonic.",
  },
  {
    q: "Livrati si in strainatate?",
    a: "Momentan livram doar in Romania. Pentru cereri internationale, contacteaza-ne pe email si revenim cu o oferta personalizata.",
  },
  {
    q: "Pot primi factura pe firma?",
    a: "Da. Mentioneaza CUI-ul si datele firmei la sectiunea Observatii din formularul de comanda si le transmitem odata cu comanda, ca factura sa fie emisa corect pe firma.",
  },
  {
    q: "Cum va contactez rapid?",
    a: "Pe email la comenzi@olivox.ro, prin formularul din pagina Contact sau pe WhatsApp folosind butonul flotant afisat pe fiecare pagina. Raspundem in maxim 24 de ore lucratoare.",
  },
];
}

// Costul de transport / datele firmei vin din site_config — reimprospatam periodic.
export const revalidate = 300;

export default async function FaqPage() {
  const { shippingCost, shippingTiers } = await getSiteConfig();
  const faqs = buildFaqs(describeTiers(shippingTiers, shippingCost));
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="page-wrapper">
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <article className="static-page">
        <header className="static-page__hero">
          <div className="eyebrow">Ajutor</div>
          <h1>Intrebari frecvente</h1>
          <p className="lead">
            Raspunsuri scurte la cele mai dese intrebari despre comenzi, livrare, retur si produsele din catalogul Snep.
          </p>
        </header>

        <section className="faq-list">
          {faqs.map((f, i) => (
            <details key={i} className="faq-item">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <section>
          <h2>Nu ai gasit raspunsul?</h2>
          <p>
            Scrie-ne prin <a href="/contact">formularul de contact</a> sau direct la{" "}
            <a href="mailto:comenzi@olivox.ro">comenzi@olivox.ro</a>. Raspundem in maxim 24 de ore lucratoare.
          </p>
        </section>
      </article>
      <Footer />
    </div>
  );
}
