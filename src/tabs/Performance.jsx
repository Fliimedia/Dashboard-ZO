import React, { useState } from "react";
import Chart from "../components/Chart.jsx";
import DataTable from "../components/DataTable.jsx";
import { Card, Scorecard } from "../components/ui.jsx";
import { int, pct, dur } from "../data";
import { areaLine, pie, barh, heatmap } from "../charts";

const SUBS = [["overzicht", "Overzicht"], ["business", "Business"], ["marketing", "Marketing"], ["web", "Web"]];

export default function Performance({ d }) {
  const [sub, setSub] = useState("overzicht");
  return (
    <div>
      <div className="subtabs">
        {SUBS.map(([id, l]) => (
          <button key={id} className={"subtab" + (sub === id ? " on" : "")} onClick={() => setSub(id)}>{l}</button>
        ))}
      </div>
      {sub === "overzicht" && <Overzicht d={d} />}
      {sub === "business" && <Business d={d} />}
      {sub === "marketing" && <Marketing d={d} />}
      {sub === "web" && <Web d={d} />}
    </div>
  );
}

function Overzicht({ d }) {
  return (
    <div>
      <div className="grid g4">
        <Scorecard label="Sessies" value={int(d.cur.sessions)} cur={d.cur.sessions} prev={d.prev.sessions} />
        <Scorecard label="Gebruikers" value={int(d.cur.users)} cur={d.cur.users} prev={d.prev.users} />
        <Scorecard label="Weergaven" value={int(d.cur.views)} cur={d.cur.views} prev={d.prev.views} />
        <Scorecard label="Betrokkenheid" value={pct(d.cur.engRate)} cur={d.cur.engRate} prev={d.prev.engRate} />
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <Card title="Sessies en gebruikers"><Chart option={areaLine(d.trend)} height={230} /></Card>
        <Card title="Kanalen"><Chart option={barh(d.channels.slice(0, 6))} height={230} /></Card>
      </div>
    </div>
  );
}

function Business({ d }) {
  const returning = Math.max(0, d.cur.users - d.cur.newUsers);
  const cols = [
    { accessorKey: "name", header: "Land", cell: (c) => c.getValue() },
    { accessorKey: "sessions", header: "Sessies", meta: { num: true }, cell: (c) => int(c.getValue()) },
  ];
  return (
    <div>
      <div className="grid g4">
        <Scorecard label="Gebruikers" value={int(d.cur.users)} cur={d.cur.users} prev={d.prev.users} />
        <Scorecard label="Nieuwe gebruikers" value={int(d.cur.newUsers)} cur={d.cur.newUsers} prev={d.prev.newUsers} />
        <Scorecard label="Gem. sessieduur" value={dur(d.cur.avgDur)} cur={d.cur.avgDur} prev={d.prev.avgDur} />
        <Scorecard label="Bounce rate" value={pct(d.cur.bounceRate)} cur={d.cur.bounceRate} prev={d.prev.bounceRate} />
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <Card title="Nieuw tegen terugkerend">
          <Chart option={pie([{ label: "Nieuw", value: d.cur.newUsers }, { label: "Terugkerend", value: returning }])} height={220} />
        </Card>
        <Card title="Landen"><DataTable columns={cols} data={d.countries} initialSort={[{ id: "sessions", desc: true }]} /></Card>
      </div>
    </div>
  );
}

function Marketing({ d }) {
  const chanCols = [
    { accessorKey: "name", header: "Kanaal", cell: (c) => c.getValue() },
    { accessorKey: "sessions", header: "Sessies", meta: { num: true }, cell: (c) => int(c.getValue()) },
    { accessorKey: "users", header: "Gebr.", meta: { num: true }, cell: (c) => int(c.getValue()) },
    { accessorKey: "eng", header: "Betr.", meta: { num: true }, cell: (c) => pct(c.getValue()) },
  ];
  const campCols = [
    { accessorKey: "name", header: "Campagne", cell: (c) => c.getValue() },
    { accessorKey: "sessions", header: "Sessies", meta: { num: true }, cell: (c) => int(c.getValue()) },
    { accessorKey: "users", header: "Gebruikers", meta: { num: true }, cell: (c) => int(c.getValue()) },
  ];
  const camps = d.campaigns.filter((c) => c.name && c.name !== "(not set)");
  return (
    <div>
      <div className="grid g2">
        <Card title="Kanalen"><DataTable columns={chanCols} data={d.channels} initialSort={[{ id: "sessions", desc: true }]} /></Card>
        <Card title="Verdeling verkeer"><Chart option={pie(d.channels.slice(0, 5).map((c) => ({ label: c.name, value: c.sessions })))} height={230} /></Card>
      </div>
      <Card title="Campagnes" style={{ marginTop: 14 }}>
        {camps.length
          ? <DataTable columns={campCols} data={d.campaigns} initialSort={[{ id: "sessions", desc: true }]} />
          : <div className="note">Geen campagnedata in deze periode. Campagnes verschijnen zodra er verkeer met utm-tags of gekoppelde advertenties binnenkomt.</div>}
      </Card>
    </div>
  );
}

function Web({ d }) {
  const tot = d.devices.reduce((a, x) => a + x.sessions, 0) || 1;
  const mob = (d.devices.find((x) => x.name === "mobile") || { sessions: 0 }).sessions;
  const pageCols = [
    { accessorKey: "path", header: "Pagina", cell: (c) => <span style={{ display: "inline-block", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>{c.getValue()}</span> },
    { accessorKey: "views", header: "Weergaven", meta: { num: true }, cell: (c) => int(c.getValue()) },
  ];
  return (
    <div>
      <div className="grid g4">
        <Scorecard label="Weergaven" value={int(d.cur.views)} cur={d.cur.views} prev={d.prev.views} />
        <Scorecard label="Weerg. per sessie" value={(d.cur.views / (d.cur.sessions || 1)).toFixed(1).replace(".", ",")} cur={d.cur.views / (d.cur.sessions || 1)} prev={d.prev.views / (d.prev.sessions || 1)} />
        <Scorecard label="Gem. sessieduur" value={dur(d.cur.avgDur)} cur={d.cur.avgDur} prev={d.prev.avgDur} />
        <Scorecard label="Mobiel aandeel" value={pct(mob / tot)} cur={0} prev={0} />
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <Card title="Top pagina's"><DataTable columns={pageCols} data={d.pages} initialSort={[{ id: "views", desc: true }]} /></Card>
        <Card title="Apparaten"><Chart option={pie(d.devices.map((x) => ({ label: x.name, value: x.sessions })))} height={230} /></Card>
      </div>
      <Card title="Wanneer is je publiek actief" style={{ marginTop: 14 }}>
        <Chart option={heatmap(d.heat)} height={240} />
      </Card>
    </div>
  );
}
