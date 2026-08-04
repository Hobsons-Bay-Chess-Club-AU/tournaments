import TournamentCard, { type TournamentCardProps } from "./TournamentCard";

const sample: Omit<TournamentCardProps, "previewState"> = {
  title: "Hobsons Bay Winter Rapid",
  date: "12/08/2026",
  endDate: "12/08/2026",
  site: "Hobsons Bay Chess Club",
  category: "Senior",
  status: "Completed",
  href: "/HobsonsBayWinterRapid?page=standings.html",
  topPlayers: [
    { name: "Alex Chen", point: 5, elo: "1820", title: "CM" },
    { name: "Priya Nair", point: 4.5, elo: "1754", title: "" },
    { name: "Sam Taylor", point: 4, elo: "1689", title: "" },
  ],
};

const states: NonNullable<TournamentCardProps["previewState"]>[] = [
  "default", "hover", "focus", "active", "disabled", "loading", "error", "success",
];

export default function TournamentCardPreview() {
  return (
    <main className="grid gap-6 p-6">
      <h1 className="text-2xl font-black text-primary-900">Tournament card states</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {states.map((state) => (
          <section className="grid gap-2" key={state}>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">{state}</h2>
            <TournamentCard {...sample} previewState={state} />
          </section>
        ))}
      </div>
    </main>
  );
}
