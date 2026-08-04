/* Hallmark · pre-emit critique: P4 H5 E4 S5 R4 V4 */
/* Hallmark · component: tournament card · genre: playful · theme: HBCC teal
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (46–50)
 */
import Link from "next/link";

export type TopPlayer = {
  name: string;
  point: number;
  elo: string;
  title: string;
};

export type TournamentStatus = "Completed" | "Planned" | "In Progress";

export type TournamentCardProps = {
  title: string;
  date: string;
  endDate: string;
  site: string;
  category: string;
  status: TournamentStatus;
  href: string;
  topPlayers?: TopPlayer[];
  previewState?: "default" | "hover" | "focus" | "active" | "disabled" | "loading" | "error" | "success";
};

const statusStyles: Record<TournamentStatus, string> = {
  Completed: "bg-slate-100 text-slate-700 ring-slate-200",
  Planned: "bg-primary-50 text-primary-800 ring-primary-100",
  "In Progress": "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

const podiumRankStyles = [
  "bg-primary-800 text-white",
  "bg-primary-200 text-primary-900",
  "bg-primary-50 text-primary-800",
];

function pointsLabel(point: number) {
  return `${point} ${point === 1 ? "pt" : "pts"}`;
}

function getDateChip(date: string) {
  const match = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const monthLabel = new Intl.DateTimeFormat("en-AU", { month: "short" })
    .format(new Date(Number(year), Number(month) - 1, Number(day)))
    .toUpperCase();

  return { day, month: monthLabel, year };
}

function DateChip({
  value,
  size = "compact",
  className = "",
}: {
  value: string;
  size?: "compact" | "range";
  className?: string;
}) {
  const chip = getDateChip(value);
  const isRangeChip = size === "range";

  return (
    <time className={`flex shrink-0 flex-col items-center rounded-2xl bg-primary-50 text-center text-primary-800 ${
      isRangeChip ? "min-h-28 w-24 justify-center px-3 py-3" : "w-16 px-2 py-2"
    } ${className}`}>
      {chip ? (
        <>
          <span className={`${isRangeChip ? "text-3xl" : "text-2xl"} font-black leading-none`}>{chip.day}</span>
          <span className="mt-1 text-[10px] font-black leading-none tracking-wide">{chip.month}</span>
          <span className="mt-1 text-[10px] font-bold leading-none text-primary-700">{chip.year}</span>
        </>
      ) : (
        <span className="max-w-full break-words text-xs font-bold leading-tight">{value || "Date TBC"}</span>
      )}
    </time>
  );
}

export default function TournamentCard({
  title,
  date,
  endDate,
  site,
  category,
  status,
  href,
  topPlayers,
  previewState = "default",
}: TournamentCardProps) {
  const isDisabled = previewState === "disabled";
  const isLoading = previewState === "loading";
  const isError = previewState === "error";
  const isSuccess = previewState === "success";
  const destination = status === "Completed" ? "View standings" : "Open tournament";
  const isMultiDay = Boolean(date && endDate && endDate !== date);
  const stateClasses = [
    previewState === "hover" ? "-translate-y-1 border-primary-300 shadow-xl" : "",
    previewState === "focus" ? "outline outline-2 outline-offset-4 outline-primary-700" : "",
    previewState === "active" ? "translate-y-0 scale-[0.99]" : "",
    isDisabled ? "cursor-not-allowed opacity-50" : "",
    isError ? "border-red-500" : "",
    isSuccess ? "border-emerald-500" : "",
  ].join(" ");
  const cardClasses = `group relative flex min-h-full min-w-0 flex-col overflow-hidden rounded-3xl border bg-white p-5 text-left shadow-sm transition-[transform,box-shadow,border-color] duration-200 motion-reduce:transition-none sm:p-6 ${
    status === "In Progress" ? "border-emerald-200" : "border-primary-100"
  } ${stateClasses} ${
    isDisabled ? "" : "hover:-translate-y-1 motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-700 active:translate-y-0 active:scale-[0.99] motion-reduce:active:scale-100"
  }`;
  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusStyles[status]}`}>{status}</span>
        <span className="rounded-full bg-primary-800 px-2.5 py-1 text-xs font-bold text-white">{category}</span>
      </div>

      <div className="mt-6 min-w-0">
        <h2 className="break-words text-xl font-black leading-tight tracking-tight text-primary-900 group-hover:text-primary-700">{title}</h2>
        {site && <p className="mt-2 break-words text-sm font-medium text-slate-600">{site}</p>}
      </div>

      {topPlayers?.length ? (
        <div className="mt-6 grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-stretch gap-4">
          <div className={`flex flex-col items-center gap-2 ${isMultiDay ? "justify-between" : "justify-center"}`}>
            <DateChip value={date} />
            {isMultiDay && (
              <>
                <span aria-hidden="true" className="h-3 w-px bg-primary-200"></span>
                <span aria-hidden="true" className="-my-1 text-sm font-black leading-none text-primary-700">↓</span>
                <span aria-hidden="true" className="h-3 w-px bg-primary-200"></span>
                <DateChip value={endDate} />
              </>
            )}
          </div>
          <ol className={`min-w-0 divide-y divide-primary-100 border-y border-primary-100 ${isMultiDay ? "grid h-full grid-rows-3" : ""}`} aria-label="Top standings">
            {topPlayers.slice(0, 3).map((player, index) => (
              <li className="flex min-w-0 items-center gap-3 py-2.5" key={`${player.name}-${index}`}>
                <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-black ${podiumRankStyles[index] ?? podiumRankStyles[2]}`}>{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
                  {player.title ? `${player.title} ${player.name}` : player.name}
                </span>
                <span className="shrink-0 text-xs font-bold text-primary-800">{pointsLabel(player.point)}</span>
                {player.elo && <span className="hidden shrink-0 text-xs font-medium text-slate-500 sm:inline">{player.elo}</span>}
              </li>
            ))}
          </ol>
        </div>
      ) : isMultiDay ? (
        <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <DateChip className="justify-self-start" size="range" value={date} />
          <span aria-hidden="true" className="text-lg font-black text-primary-700">→</span>
          <DateChip className="justify-self-end" size="range" value={endDate} />
        </div>
      ) : (
        <div className="mt-6"><DateChip value={date} /></div>
      )}

      <div className="mt-auto flex min-h-11 items-end justify-between gap-3 pt-6 text-sm font-black text-primary-800">
        <span className="whitespace-nowrap">{destination}</span>
        <span aria-hidden="true" className="text-xl leading-none transition-transform duration-200 motion-reduce:transition-none group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0">→</span>
      </div>

      {isLoading && <span className="mt-3 text-xs font-bold text-primary-700">Loading tournament…</span>}
      {isError && <span className="mt-3 text-xs font-bold text-red-700" role="alert">Tournament details are unavailable.</span>}
      {isSuccess && <span className="mt-3 text-xs font-bold text-emerald-700">✓ Standings are up to date.</span>}
    </>
  );

  if (isDisabled) {
    return <div aria-disabled="true" className={cardClasses}>{cardContent}</div>;
  }

  return (
    <Link aria-busy={isLoading || undefined} className={cardClasses} href={href}>
      {cardContent}
    </Link>
  );
}
