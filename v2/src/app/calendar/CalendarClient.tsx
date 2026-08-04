"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [displayMonth, setDisplayMonth] = useState<Date>(startOfMonth(new Date()));
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const detailsDialogRef = useRef<HTMLDialogElement>(null);
    const lastDayButtonRef = useRef<HTMLButtonElement | null>(null);
    const filterDialogRef = useRef<HTMLDialogElement>(null);
    const lastFilterButtonRef = useRef<HTMLButtonElement | null>(null);

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
            const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(entry.eventType || "Other");

            if (!monthMatch || !typeMatch) {
                return false;
            }

            if (!query) {
                return true;
            }

            return getEntrySearchText(entry).includes(query);
        });
    }, [entries, search, selectedMonth, selectedTypes]);

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
        setSelectedTypes([]);
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
        setSelectedTypes([]);
        setSelectedDateKey(null);
    };

    function toggleEventType(type: string) {
        setSelectedTypes((current) => current.includes(type)
            ? current.filter((value) => value !== type)
            : [...current, type]);
    }

    const selectedTypeSummary = selectedTypes.length === 0
        ? "All event types"
        : `${selectedTypes.length} type${selectedTypes.length === 1 ? "" : "s"} selected`;

    function openTypeFilters(button: HTMLButtonElement) {
        lastFilterButtonRef.current = button;
        requestAnimationFrame(() => filterDialogRef.current?.showModal());
    }

    const restoreFilterFocus = () => {
        lastFilterButtonRef.current?.focus({ preventScroll: true });
    };

    function openDayDetails(dateKey: string, button: HTMLButtonElement) {
        setSelectedDateKey(dateKey);
        lastDayButtonRef.current = button;

        if (window.matchMedia("(max-width: 59.99rem)").matches) {
            requestAnimationFrame(() => detailsDialogRef.current?.showModal());
        }
    }

    const restoreDayFocus = () => {
        lastDayButtonRef.current?.focus({ preventScroll: true });
    };

    const renderEventCard = (entry: CalendarEntry, context: string) => {
        const hasSeniorLink = entry.seniorLink.length > 0;
        const hasJuniorLink = entry.juniorLink.length > 0;

        return (
            <article key={`${entry.id}-${context}`} className="calendar-event">
                <div className="calendar-event__head">
                    <div>
                        <div className="calendar-event__type">{entry.eventType || "Calendar"}</div>
                        <h4>{getEntryTitle(entry)}</h4>
                    </div>
                    <div className="calendar-event__date">{formatRangeLabel(entry.startDate, entry.endDate)}</div>
                </div>
                <div className="calendar-event__chips">
                    <span>{entry.dayLabel || "Schedule"}</span>
                    <span>{entry.schoolSchedule || "No school note"}</span>
                    {entry.coaching && <span>{entry.coaching}</span>}
                </div>
                {getEntryNames(entry).length > 0 && (
                    <div className="calendar-event__facts">
                        {getEntryNames(entry).map((item) => <div key={`${entry.id}-${item.label}`}><strong>{item.label}:</strong> {item.value}</div>)}
                    </div>
                )}
                <div className="calendar-event__facts">
                    <div><strong>Arbiter:</strong> {entry.arbiter || "Not applicable"}</div>
                    <div><strong>Coaching:</strong> {entry.coaching || "-"}</div>
                </div>
                <div className="calendar-event__links">
                    {hasSeniorLink && <a href={entry.seniorLink} target="_blank" rel="noreferrer noopener" className="calendar-event__link calendar-event__link--primary">Senior link</a>}
                    {hasJuniorLink && <a href={entry.juniorLink} target="_blank" rel="noreferrer noopener" className="calendar-event__link">Junior link</a>}
                </div>
            </article>
        );
    };

    if (loading) {
        return <div className="calendar-empty" role="status">Loading calendar...</div>;
    }

    if (error) {
        return <div className="calendar-empty" role="alert">{error}</div>;
    }

    return (
        <div className="calendar-client">
            <div className="calendar-utility">
                <a
                    href="https://portal.hobsonsbaychess.com/"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="calendar-utility__registration"
                >
                    <span className="calendar-utility__label">Ready to play?</span>
                    <strong>Register with the club</strong>
                    <span>Open the HBCC portal to register and manage your details.</span>
                </a>
                <div className="calendar-utility__count">
                    <span className="calendar-utility__label">Events shown</span>
                    <strong aria-live="polite">{summary.total}</strong>
                </div>
                <button
                    type="button"
                    onClick={() => nextUpcomingEvent && jumpToEntry(nextUpcomingEvent)}
                    disabled={!nextUpcomingEvent}
                    className="calendar-utility__next"
                >
                    <span className="calendar-utility__label">Up next</span>
                    <strong>
                        {nextUpcomingEvent ? formatRangeLabel(nextUpcomingEvent.startDate, nextUpcomingEvent.endDate) : "No events"}
                    </strong>
                    <span>
                        {nextUpcomingEvent ? getEntryTitle(nextUpcomingEvent) : "Nothing scheduled"}
                    </span>
                </button>
                <div className="calendar-utility__hint">
                    <span className="calendar-utility__label">How it works</span>
                    Search by tournament, browse by month, or choose a day to see every event and link in one place.
                </div>
            </div>

            <section className="calendar-filters" aria-label="Calendar filters">
                <div className="calendar-filters__fields">
                    <label className="calendar-filters__field">
                        <span className="calendar-filters__label">Search</span>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tournament, coaching, arbiter, or date"
                        />
                    </label>
                    <label className="calendar-filters__field">
                        <span className="calendar-filters__label">Month</span>
                        <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                            {monthOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="calendar-filters__footer">
                    <button
                        type="button"
                        className="calendar-control calendar-filter-trigger"
                        onClick={(event) => openTypeFilters(event.currentTarget)}
                        aria-haspopup="dialog"
                    >
                        <span>Event type</span>
                        <strong>{selectedTypeSummary}</strong>
                    </button>
                    <div className="calendar-filter-chips-wrap">
                        <div className="calendar-filters__label">Event type</div>
                        <div className="calendar-filter-chips">
                            {typeOptions.map((option) => {
                                const isAllTypes = option.value === "all";
                                const isActive = isAllTypes ? selectedTypes.length === 0 : selectedTypes.includes(option.value);
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => isAllTypes ? setSelectedTypes([]) : toggleEventType(option.value)}
                                        aria-pressed={isActive}
                                        className="calendar-filter-chip"
                                    >
                                        {option.label} ({option.count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <button type="button" onClick={clearFilters} className="calendar-control">
                        Reset filters
                    </button>
                </div>
            </section>

            <dialog
                ref={filterDialogRef}
                className="calendar-filter-dialog"
                onClose={restoreFilterFocus}
                aria-labelledby="calendar-filter-dialog-title"
            >
                <div className="calendar-details-dialog__head">
                    <div>
                        <div className="calendar-details__label">Calendar filters</div>
                        <h3 id="calendar-filter-dialog-title">Choose event types</h3>
                    </div>
                    <button type="button" className="calendar-control" onClick={() => filterDialogRef.current?.close()}>
                        Done
                    </button>
                </div>
                <p className="calendar-filter-dialog__intro">Select one or more event types to narrow the calendar.</p>
                <div className="calendar-filter-options">
                    <button
                        type="button"
                        className="calendar-filter-option calendar-filter-option--all"
                        onClick={() => setSelectedTypes([])}
                        aria-pressed={selectedTypes.length === 0}
                    >
                        <span>All event types</span>
                        <span>{typeOptions[0]?.count ?? 0} events</span>
                    </button>
                    {typeOptions.slice(1).map((option) => {
                        const isSelected = selectedTypes.includes(option.value);
                        return (
                            <label key={option.value} className="calendar-filter-option">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleEventType(option.value)}
                                />
                                <span>{option.label}</span>
                                <span>{option.count} events</span>
                            </label>
                        );
                    })}
                </div>
            </dialog>

            {filteredEntries.length === 0 ? (
                <div className="calendar-empty">No calendar entries match the current filters.</div>
            ) : (
                <div className="calendar-workspace">
                    <section className="calendar-month" aria-labelledby="calendar-month-title">
                        <div className="calendar-month__toolbar">
                            <div className="calendar-month__heading">
                                <div className="calendar-month__label">Calendar view</div>
                                <h2 id="calendar-month-title">{formatMonthLabel(visibleMonth)}</h2>
                            </div>
                            <div className="calendar-month__controls" aria-label="Month navigation">
                                <button type="button" onClick={() => shiftMonth(-1)} className="calendar-control" aria-label="Previous month">
                                    Previous
                                </button>
                                <button type="button" onClick={goToToday} className="calendar-control calendar-control--primary">
                                    Today
                                </button>
                                <button type="button" onClick={() => shiftMonth(1)} className="calendar-control" aria-label="Next month">
                                    Next
                                </button>
                            </div>
                        </div>
                        <div className="calendar-month__weekdays" aria-hidden="true">
                            {weekDays.map((day) => <div key={day}>{day}</div>)}
                        </div>
                        <div className="calendar-month__grid">
                            {calendarDays.map((day) => {
                                const hasEvents = day.entries.length > 0;
                                const isSelected = selectedDateKey === day.dateKey;
                                const dayClasses = [
                                    "calendar-day",
                                    !day.isCurrentMonth && "calendar-day--outside",
                                    day.isToday && "calendar-day--today",
                                    isSelected && "calendar-day--selected",
                                ].filter(Boolean).join(" ");

                                return (
                                    <button
                                        key={day.dateKey}
                                        type="button"
                                        onClick={(event) => openDayDetails(day.dateKey, event.currentTarget)}
                                        className={dayClasses}
                                        aria-label={`View events for ${formatDateLabel(day.date)}`}
                                        aria-pressed={isSelected}
                                    >
                                        <span className="calendar-day__top">
                                            <span className="calendar-day__number" aria-current={day.isToday ? "date" : undefined}>{day.date.getDate()}</span>
                                            {hasEvents && <span className="calendar-day__count">{day.entries.length}</span>}
                                        </span>
                                        <span className="calendar-day__events">
                                            {day.entries.slice(0, 3).map((entry) => (
                                                <span key={`${entry.id}-${day.dateKey}`} className="calendar-day__event">{getEntryTitle(entry)}</span>
                                            ))}
                                            {day.entries.length > 3 && <span className="calendar-day__more">+{day.entries.length - 3} more</span>}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <aside className="calendar-details" aria-live="polite">
                        <section className="calendar-details__summary">
                            <div className="calendar-details__label">Selected day</div>
                            <h3>{selectedDateKey && selectedDay ? formatDateLabel(getDateFromKey(selectedDateKey)) : formatMonthLabel(visibleMonth)}</h3>
                            <p>{selectedDateKey ? "Every event and link for the chosen day." : "Choose a day to see its event cards and links."}</p>
                        </section>
                        <section className="calendar-details__list">
                            <div className="calendar-details__list-head">
                                <div>
                                    <div className="calendar-details__label">Events on day</div>
                                    <h3>{selectedDayEntries.length} event{selectedDayEntries.length === 1 ? "" : "s"}</h3>
                                </div>
                                {selectedDateKey && (
                                    <button type="button" onClick={() => setSelectedDateKey(null)} className="calendar-control">
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className="calendar-details__events">
                                {selectedDayEntries.length === 0 ? (
                                    <div className="calendar-empty">No events on this day.</div>
                                ) : selectedDayEntries.map((entry) => renderEventCard(entry, `rail-${selectedDateKey ?? "month"}`))}
                            </div>
                        </section>
                    </aside>
                    <dialog ref={detailsDialogRef} className="calendar-details-dialog" onClose={restoreDayFocus} aria-labelledby="calendar-dialog-title">
                        <div className="calendar-details-dialog__head">
                            <div>
                                <div className="calendar-details__label">Selected day</div>
                                <h3 id="calendar-dialog-title">{selectedDateKey ? formatDateLabel(getDateFromKey(selectedDateKey)) : formatMonthLabel(visibleMonth)}</h3>
                            </div>
                            <button type="button" className="calendar-control" onClick={() => detailsDialogRef.current?.close()}>
                                Close details
                            </button>
                        </div>
                        <div className="calendar-details__events">
                            {selectedDayEntries.length === 0 ? <div className="calendar-empty">No events on this day.</div> : selectedDayEntries.map((entry) => renderEventCard(entry, `dialog-${selectedDateKey ?? "month"}`))}
                        </div>
                    </dialog>
                </div>
            )}
        </div>
    );
}
