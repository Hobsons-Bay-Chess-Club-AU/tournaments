"use client";

import { useEffect, useMemo, useState } from "react";

const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRIr-eFPQCMvn-TbOfLNzHheAVduNUKX2wOTsYjJOM8zf_uhqe3B3H8Z01bofnCPg/pub?output=csv";

type CalendarRow = Record<string, string>;

type CalendarEntry = {
    id: string;
    dateLabel: string;
    startDate: Date;
    endDate: Date;
    dayLabel: string;
    eventType: string;
    schoolSchedule: string;
    seniorTournament: string;
    seniorLink: string;
    juniorTournament: string;
    juniorLink: string;
    arbiter: string;
    coaching: string;
};

type EventTypeOption = {
    value: string;
    label: string;
    count: number;
};

type DayCell = {
    date: Date;
    dateKey: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    entries: CalendarEntry[];
};

const MONTH_LOOKUP: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
};

function parseCsv(csvText: string): CalendarRow[] {
    const records: string[][] = [];
    const normalizedText = csvText.replace(/^\uFEFF/, "");
    let currentCell = "";
    let currentRow: string[] = [];
    let insideQuotes = false;

    for (let index = 0; index < normalizedText.length; index += 1) {
        const character = normalizedText[index];
        const nextCharacter = normalizedText[index + 1];

        if (character === '"') {
            if (insideQuotes && nextCharacter === '"') {
                currentCell += '"';
                index += 1;
            } else {
                insideQuotes = !insideQuotes;
            }
            continue;
        }

        if (character === "," && !insideQuotes) {
            currentRow.push(currentCell);
            currentCell = "";
            continue;
        }

        if ((character === "\n" || character === "\r") && !insideQuotes) {
            if (character === "\r" && nextCharacter === "\n") {
                index += 1;
            }

            currentRow.push(currentCell);
            if (currentRow.some((value) => value.trim().length > 0)) {
                records.push(currentRow);
            }

            currentRow = [];
            currentCell = "";
            continue;
        }

        currentCell += character;
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell);
        if (currentRow.some((value) => value.trim().length > 0)) {
            records.push(currentRow);
        }
    }

    if (records.length === 0) return [];

    const headers = records[0].map((header) => header.trim());

    return records.slice(1).map((cells) =>
        headers.reduce<CalendarRow>((row, header, index) => {
            row[header] = (cells[index] ?? "").trim();
            return row;
        }, {})
    );
}

function isEmptyRow(row: CalendarRow) {
    return Object.values(row).every((value) => value.trim().length === 0);
}

function normalizeColumnName(column: string) {
    return column.trim().toLowerCase().replace(/\s+/g, " ");
}

function getCell(row: CalendarRow, possibleColumns: string[]) {
    const lookup = new Map(Object.entries(row).map(([key, value]) => [normalizeColumnName(key), value]));
    for (const possibleColumn of possibleColumns) {
        const value = lookup.get(normalizeColumnName(possibleColumn));
        if (value !== undefined) {
            return value.trim();
        }
    }
    return "";
}

function parseSingleDate(value: string) {
    const cleanedValue = value.replace(/\s+/g, " ").trim();

    const numericMatch = cleanedValue.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
    if (numericMatch) {
        const [, dayText, monthText, yearText] = numericMatch;
        if (yearText) {
            const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
            return new Date(year, Number(monthText) - 1, Number(dayText));
        }
    }

    const namedMonthMatch = cleanedValue.match(/(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{4})/);
    if (namedMonthMatch) {
        const [, dayText, monthName, yearText] = namedMonthMatch;
        const month = MONTH_LOOKUP[monthName.slice(0, 3).toLowerCase()];
        if (month !== undefined) {
            return new Date(Number(yearText), month, Number(dayText));
        }
    }

    return null;
}

function parseDateRange(value: string) {
    const normalizedValue = value.replace(/\s+/g, " ").trim();
    const singleDate = parseSingleDate(normalizedValue);

    if (singleDate) {
        return { startDate: singleDate, endDate: singleDate };
    }

    const matches = Array.from(
        normalizedValue.matchAll(/(\d{1,2}(?:[/-][A-Za-z]{3,}|[/-]\d{1,2})(?:[/-]\d{2,4})?)/g),
        (match) => match[0]
    );

    const startSource = matches[0] ?? normalizedValue;
    let endSource = matches[1] ?? matches[0] ?? normalizedValue;

    if (matches.length >= 2 && !/\d{2,4}$/.test(matches[0]) && /\d{2,4}$/.test(matches[1])) {
        const startPrefix = matches[0].match(/^(\d{1,2}[/-]\d{1,2})/);
        const endYear = matches[1].match(/(\d{2,4})$/);
        if (startPrefix && endYear) {
            endSource = `${startPrefix[1]}/${endYear[1]}`;
        }
    }

    const startDate = parseSingleDate(startSource) ?? new Date(0);
    const endDate = parseSingleDate(endSource) ?? startDate;

    return { startDate, endDate };
}

function formatDateLabel(date: Date) {
    return new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
}

function formatShortDayLabel(date: Date) {
    return new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
    }).format(date);
}

function formatRangeLabel(startDate: Date, endDate: Date) {
    if (isSameDay(startDate, endDate)) {
        return formatDateLabel(startDate);
    }

    return `${formatShortDayLabel(startDate)} - ${formatDateLabel(endDate)}`;
}

function formatMonthLabel(date: Date) {
    return new Intl.DateTimeFormat("en-AU", {
        month: "long",
        year: "numeric",
    }).format(date);
}

function toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
    return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getMondayStart(date: Date) {
    const result = new Date(date);
    const day = result.getDay();
    const shift = day === 0 ? -6 : 1 - day;
    result.setDate(result.getDate() + shift);
    return result;
}

function isSameDay(left: Date, right: Date) {
    return (
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate()
    );
}

function isSameMonth(left: Date, right: Date) {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function parseMonthKey(monthKey: string) {
    const [yearText, monthText] = monthKey.split("-");
    const year = Number(yearText);
    const month = Number(monthText);

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
        return null;
    }

    return new Date(year, month, 1);
}

function getMonthKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth()}`;
}

function stripLineBreaks(value: string) {
    return value.replace(/\s*\n+\s*/g, " / ").replace(/\s{2,}/g, " ").trim();
}

function getEntryTitle(entry: CalendarEntry) {
    return entry.seniorTournament || entry.juniorTournament || entry.schoolSchedule || entry.eventType || "Event";
}

function getEntryNames(entry: CalendarEntry) {
    return [
        entry.seniorTournament ? { label: "Event", value: entry.seniorTournament } : null,
        entry.juniorTournament ? { label: "Event", value: entry.juniorTournament } : null,
    ].filter((item): item is { label: string; value: string } => item !== null);
}

function getEntrySearchText(entry: CalendarEntry) {
    return [
        entry.dateLabel,
        entry.dayLabel,
        entry.eventType,
        entry.schoolSchedule,
        entry.seniorTournament,
        entry.juniorTournament,
        entry.arbiter,
        entry.coaching,
    ]
        .join(" ")
        .toLowerCase();
}

function isDateWithinRange(date: Date, startDate: Date, endDate: Date) {
    return date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime();
}

function getDateFromKey(dateKey: string) {
    const [yearText, monthText, dayText] = dateKey.split("-");
    return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

export default function CalendarClient() {
    const [rows, setRows] = useState<CalendarRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("all");
    const [selectedType, setSelectedType] = useState("all");
    const [displayMonth, setDisplayMonth] = useState<Date>(startOfMonth(new Date()));
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        async function loadCalendar() {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(CSV_URL, { signal: controller.signal });
                if (!response.ok) {
                    throw new Error(`Failed to load calendar data (${response.status})`);
                }

                const csvText = await response.text();
                const parsedRows = parseCsv(csvText).filter((row) => !isEmptyRow(row));
                setRows(parsedRows);
            } catch (fetchError) {
                if ((fetchError as Error).name !== "AbortError") {
                    setError(fetchError instanceof Error ? fetchError.message : "Unable to load calendar data.");
                }
            } finally {
                setLoading(false);
            }
        }

        loadCalendar();

        return () => controller.abort();
    }, []);

    const entries = useMemo<CalendarEntry[]>(() => {
        return rows
            .map((row, index) => {
                const dateLabel = getCell(row, ["DATE"]);
                const { startDate, endDate } = parseDateRange(dateLabel);

                return {
                    id: `${dateLabel}-${index}`,
                    dateLabel,
                    startDate,
                    endDate,
                    dayLabel: getCell(row, ["DAY"]),
                    eventType: getCell(row, ["EVENT TYPE"]),
                    schoolSchedule: getCell(row, ["SCHOOL SCHEDULE"]),
                    seniorTournament: getCell(row, ["SENIORS TOURNAMENTS", "SENIORS  TOURNAMENTS"]),
                    seniorLink: getCell(row, ["SENIORS TOUNAMENT LINKS", "SENIORS TOURNAMENT LINKS"]),
                    juniorTournament: getCell(row, ["ROOKIES & JUNIORS TOURNAMENTS"]),
                    juniorLink: getCell(row, ["JUNIORS TOUNAMENT LINKS", "JUNIORS TOURNAMENT LINKS"]),
                    arbiter: stripLineBreaks(getCell(row, ["Arbiter"])),
                    coaching: stripLineBreaks(getCell(row, ["COACHING"])),
                };
            })
            .filter((entry) => entry.dateLabel.length > 0 && entry.startDate.getTime() > 0)
            .sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
    }, [rows]);

    useEffect(() => {
        if (selectedMonth !== "all") {
            const parsedMonth = parseMonthKey(selectedMonth);
            if (parsedMonth) {
                setDisplayMonth(parsedMonth);
            }
        }
    }, [selectedMonth]);

    const monthOptions = useMemo(() => {
        const months = Array.from(
            new Map(
                entries.map((entry) => [
                    getMonthKey(entry.startDate),
                    {
                        value: getMonthKey(entry.startDate),
                        label: formatMonthLabel(entry.startDate),
                        sort: entry.startDate.getTime(),
                    },
                ])
            ).values()
        ).sort((left, right) => left.sort - right.sort);

        return [{ value: "all", label: "All months" }, ...months.map(({ value, label }) => ({ value, label }))];
    }, [entries]);

    const typeOptions = useMemo<EventTypeOption[]>(() => {
        const counts = new Map<string, number>();
        for (const entry of entries) {
            const value = entry.eventType || "Other";
            counts.set(value, (counts.get(value) ?? 0) + 1);
        }

        return [
            { value: "all", label: "All event types", count: entries.length },
            ...Array.from(counts.entries())
                .sort((left, right) => left[0].localeCompare(right[0]))
                .map(([value, count]) => ({ value, label: value, count })),
        ];
    }, [entries]);

    const filteredEntries = useMemo(() => {
        const query = search.trim().toLowerCase();

        return entries.filter((entry) => {
            const monthKey = getMonthKey(entry.startDate);
            const monthMatch = selectedMonth === "all" || selectedMonth === monthKey;
            const typeMatch = selectedType === "all" || (entry.eventType || "Other") === selectedType;

            if (!monthMatch || !typeMatch) {
                return false;
            }

            if (!query) {
                return true;
            }

            return getEntrySearchText(entry).includes(query);
        });
    }, [entries, search, selectedMonth, selectedType]);

    const summary = useMemo(() => {
        const total = filteredEntries.length;
        return {
            total,
        };
    }, [filteredEntries]);

    const nextUpcomingEvent = useMemo(() => {
        const now = new Date();
        return entries.find((entry) => entry.endDate >= now) ?? entries[0] ?? null;
    }, [entries]);

    const visibleMonth = selectedMonth === "all" ? displayMonth : parseMonthKey(selectedMonth) ?? displayMonth;

    const monthEntries = useMemo(() => {
        return filteredEntries.filter(
            (entry) => isSameMonth(entry.startDate, visibleMonth) || isSameMonth(entry.endDate, visibleMonth)
        );
    }, [filteredEntries, visibleMonth]);

    const entriesByDate = useMemo(() => {
        const map = new Map<string, CalendarEntry[]>();

        for (const entry of monthEntries) {
            const currentDate = new Date(entry.startDate);
            while (currentDate.getTime() <= entry.endDate.getTime()) {
                if (isSameMonth(currentDate, visibleMonth)) {
                    const key = toDateKey(currentDate);
                    const existing = map.get(key) ?? [];
                    existing.push(entry);
                    map.set(key, existing);
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        return map;
    }, [monthEntries, visibleMonth]);

    const calendarDays = useMemo<DayCell[]>(() => {
        const start = getMondayStart(startOfMonth(visibleMonth));
        return Array.from({ length: 42 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            const dateKey = toDateKey(date);
            return {
                date,
                dateKey,
                isCurrentMonth: isSameMonth(date, visibleMonth),
                isToday: isSameDay(date, new Date()),
                entries: entriesByDate.get(dateKey) ?? [],
            };
        });
    }, [entriesByDate, visibleMonth]);

    const selectedDay = useMemo(() => {
        if (!selectedDateKey) {
            return null;
        }

        const selectedDate = getDateFromKey(selectedDateKey);
        return monthEntries.find((entry) => isDateWithinRange(selectedDate, entry.startDate, entry.endDate)) ?? null;
    }, [monthEntries, selectedDateKey]);

    const selectedDayEntries = useMemo(() => {
        if (!selectedDateKey) {
            return monthEntries.slice(0, 6);
        }

        const selectedDate = getDateFromKey(selectedDateKey);
        return monthEntries.filter((entry) => isDateWithinRange(selectedDate, entry.startDate, entry.endDate));
    }, [monthEntries, selectedDateKey]);

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const goToToday = () => {
        const today = new Date();
        setSelectedMonth("all");
        setSelectedType("all");
        setDisplayMonth(startOfMonth(today));
        setSelectedDateKey(toDateKey(today));
    };

    const shiftMonth = (offset: number) => {
        setSelectedMonth("all");
        setDisplayMonth((current) => addMonths(current, offset));
    };

    const jumpToEntry = (entry: CalendarEntry) => {
        const monthKey = getMonthKey(entry.startDate);
        setSelectedMonth(monthKey);
        setDisplayMonth(startOfMonth(entry.startDate));
        setSelectedDateKey(toDateKey(entry.startDate));
    };

    const clearFilters = () => {
        setSearch("");
        setSelectedMonth("all");
        setSelectedType("all");
        setSelectedDateKey(null);
    };

    if (loading) {
        return <div className="px-6 py-10 text-center text-gray-500">Loading calendar...</div>;
    }

    if (error) {
        return <div className="px-6 py-10 text-center text-red-600">{error}</div>;
    }

    return (
        <div className="space-y-6 px-4 py-4 md:px-6 md:py-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <a
                    href="https://portal.hobsonsbaychess.com/"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-2xl border border-primary-200 bg-primary-700 p-4 shadow-sm transition hover:bg-primary-800 hover:shadow-md"
                >
                    <div className="text-xs uppercase tracking-wide text-primary-100">Register</div>
                    <div className="mt-2 text-lg font-bold text-white">Portal registration</div>
                    <div className="mt-2 text-sm text-primary-50">Open the HBCC portal to register and manage your details.</div>
                </a>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Events shown</div>
                    <div className="mt-2 text-3xl font-bold text-primary-700">{summary.total}</div>
                </div>
                <button
                    type="button"
                    onClick={() => nextUpcomingEvent && jumpToEntry(nextUpcomingEvent)}
                    disabled={!nextUpcomingEvent}
                    className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-primary-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <div className="text-xs uppercase tracking-wide text-gray-500">Next event</div>
                    <div className="mt-2 text-lg font-semibold text-gray-900">
                        {nextUpcomingEvent ? formatRangeLabel(nextUpcomingEvent.startDate, nextUpcomingEvent.endDate) : "No events"}
                    </div>
                    <div className="mt-2 text-sm font-medium text-primary-700">
                        {nextUpcomingEvent ? getEntryTitle(nextUpcomingEvent) : "Nothing scheduled"}
                    </div>
                </button>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-gray-500">How to use</div>
                    <div className="mt-2 text-sm text-gray-700">Search by tournament, browse by month, or tap a day to see every event and link in one place.</div>
                </div>
            </div>

            <section className="rounded-3xl border border-slate-300 bg-slate-50 p-4 shadow-sm md:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1.3fr)_220px] xl:grid-cols-[minmax(0,1.5fr)_220px]">
                        <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Search</span>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Tournament, coaching, arbiter, or date"
                                className="w-full rounded-2xl border border-slate-400 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-500 transition focus:border-primary-700 focus:ring-2 focus:ring-primary-200"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Month</span>
                            <select
                                value={selectedMonth}
                                onChange={(event) => setSelectedMonth(event.target.value)}
                                className="w-full rounded-2xl border border-slate-400 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-primary-700 focus:ring-2 focus:ring-primary-200"
                            >
                                {monthOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="rounded-full border border-slate-400 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                    >
                        Reset filters
                    </button>
                </div>

                <div className="mt-4">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Event type</div>
                    <div className="flex flex-wrap gap-2">
                        {typeOptions.map((option) => {
                            const isActive = selectedType === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSelectedType(option.value)}
                                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                        isActive
                                            ? "border-primary-700 bg-primary-700 text-white shadow-sm"
                                            : "border-slate-400 bg-white text-slate-800 hover:border-primary-400 hover:bg-primary-50"
                                    }`}
                                >
                                    {option.label} ({option.count})
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {filteredEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-gray-500">
                    No calendar entries match the current filters.
                </div>
            ) : (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
                    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Calendar view</div>
                                <h2 className="mt-1 text-2xl font-bold text-gray-900">{formatMonthLabel(visibleMonth)}</h2>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => shiftMonth(-1)}
                                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={goToToday}
                                    className="rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-800"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() => shiftMonth(1)}
                                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {weekDays.map((day) => (
                                <div key={day} className="px-2 py-3">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 divide-x divide-y divide-gray-200 bg-white">
                            {calendarDays.map((day) => {
                                const hasEvents = day.entries.length > 0;
                                const isSelected = selectedDateKey === day.dateKey;

                                return (
                                    <button
                                        key={day.dateKey}
                                        type="button"
                                        onClick={() => setSelectedDateKey(day.dateKey)}
                                        className={`min-h-[150px] p-3 text-left transition hover:bg-primary-50/50 ${day.isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-400"} ${day.isToday ? "ring-2 ring-inset ring-primary-400" : ""} ${isSelected ? "bg-primary-50" : ""}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${day.isToday ? "bg-primary-700 text-white" : "text-gray-700"}`}>
                                                {day.date.getDate()}
                                            </div>
                                            {hasEvents && (
                                                <span className="rounded-full bg-primary-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-800">
                                                    {day.entries.length}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-3 space-y-2">
                                            {day.entries.slice(0, 3).map((entry) => (
                                                <div key={`${entry.id}-${day.dateKey}`} className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-primary-700">{entry.eventType || "Calendar"}</div>
                                                    <div className="mt-1 text-sm font-medium leading-5 text-gray-900 line-clamp-2">{getEntryTitle(entry)}</div>
                                                </div>
                                            ))}
                                            {day.entries.length > 3 && <div className="text-xs font-semibold text-gray-500">+ {day.entries.length - 3} more</div>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <aside className="space-y-6">
                        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Selected day</div>
                            <h3 className="mt-1 text-xl font-bold text-gray-900">
                                {selectedDateKey && selectedDay ? formatDateLabel(getDateFromKey(selectedDateKey)) : formatMonthLabel(visibleMonth)}
                            </h3>
                            <p className="mt-2 text-sm text-gray-600">
                                {selectedDateKey
                                    ? "View the event details and links for the chosen day."
                                    : "Select a day on the calendar to see the event cards for that date."}
                            </p>
                        </section>

                        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Events on day</div>
                                    <h3 className="mt-1 text-lg font-bold text-gray-900">
                                        {selectedDayEntries.length} event{selectedDayEntries.length === 1 ? "" : "s"}
                                    </h3>
                                </div>
                                {selectedDateKey && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDateKey(null)}
                                        className="rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="mt-4 space-y-3">
                                {selectedDayEntries.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                                        No events on this day.
                                    </div>
                                ) : (
                                    selectedDayEntries.map((entry) => {
                                        const hasSeniorLink = entry.seniorLink.length > 0;
                                        const hasJuniorLink = entry.juniorLink.length > 0;

                                        return (
                                            <article key={`${entry.id}-${selectedDateKey ?? "month"}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-xs font-semibold uppercase tracking-wide text-primary-700">{entry.eventType || "Calendar"}</div>
                                                        <h4 className="mt-1 text-base font-bold text-gray-900">{getEntryTitle(entry)}</h4>
                                                    </div>
                                                    <div className="text-right text-xs text-gray-500">{formatRangeLabel(entry.startDate, entry.endDate)}</div>
                                                </div>

                                                <div className="mt-3 space-y-2 text-sm text-gray-700">
                                                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                                                        <span className="rounded-full bg-white px-3 py-1 text-gray-600">{entry.dayLabel || "Schedule"}</span>
                                                        <span className="rounded-full bg-white px-3 py-1 text-gray-600">{entry.schoolSchedule || "No school note"}</span>
                                                        {entry.coaching && <span className="rounded-full bg-white px-3 py-1 text-gray-600">{entry.coaching}</span>}
                                                    </div>
                                                    {getEntryNames(entry).length > 0 && (
                                                        <div className="rounded-xl bg-white px-3 py-3 text-sm text-gray-700">
                                                            {getEntryNames(entry).map((item) => (
                                                                <div key={`${entry.id}-${item.label}`}>
                                                                    <span className="font-semibold text-gray-900">{item.label}:</span> {item.value}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="rounded-xl bg-white px-3 py-2 text-xs text-gray-600">
                                                        <div>
                                                            <span className="font-semibold text-gray-800">Arbiter:</span> {entry.arbiter || "Not applicable"}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-gray-800">Coaching:</span> {entry.coaching || "-"}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {hasSeniorLink && (
                                                        <a
                                                            href={entry.seniorLink}
                                                            target="_blank"
                                                            rel="noreferrer noopener"
                                                            className="inline-flex items-center rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-800"
                                                        >
                                                            Senior link
                                                        </a>
                                                    )}
                                                    {hasJuniorLink && (
                                                        <a
                                                            href={entry.juniorLink}
                                                            target="_blank"
                                                            rel="noreferrer noopener"
                                                            className="inline-flex items-center rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
                                                        >
                                                            Junior link
                                                        </a>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })
                                )}
                            </div>
                        </section>
                    </aside>
                </div>
            )}
        </div>
    );
}
