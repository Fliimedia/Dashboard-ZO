import React from "react";
import { Card } from "../components/ui.jsx";

export default function Trends({ client }) {
  return (
    <div>
      <div className="grid g2">
        <Card title="Zoekvolumes">
          <div className="note">Nog niet gekoppeld. Deze sectie toont het zoekvolume rond de merk, en categorie-termen van {client.name}. Koppel hiervoor een bron zoals Google Trends of een SEO-tool via een extra endpoint.</div>
        </Card>
        <Card title="Reddit top posts">
          <div className="note">Nog niet gekoppeld. Hier komen de best scorende Reddit-posts rond relevante onderwerpen, via Apify (reddit-scraper). Lever je een Apify-token als env var, dan halen we ze live op net als in Waryte.</div>
        </Card>
      </div>
      <Card title="Waarom deze tab" style={{ marginTop: 14 }}>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "var(--mist)" }}>
          Trends kijkt naar buiten: waar praat de markt over en wat zoeken mensen, los van je eigen site. Zo zie je vraag ontstaan voordat die in je Analytics zichtbaar wordt.
        </p>
      </Card>
    </div>
  );
}
