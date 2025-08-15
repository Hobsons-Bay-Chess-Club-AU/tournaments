
"use client";
import React, { useEffect, useState, use, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TournamentMeta from "@/components/TournamentMeta";
import TournamentMenu from "@/components/TournamentMenu";
import PlayerRenderer from "@/components/PlayerRenderer";

type TournamentData = {
    metadata: Record<string, any>;
    menu: MenuItem[];
    page: Record<string, any>;
};

type MenuItem = {
    text: string;
    href: string;
    isDropdown?: boolean;
    children?: MenuItem[];
};

export default function TournamentPage({ params }: { params: Promise<{ tournament: string }> }) {
    // Unwrap params Promise using React.use()
    const resolvedParams = use(params);
    const [data, setData] = useState<TournamentData | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const page = searchParams.get("page") || "index.html";
    const playerId = searchParams.get("id"); // Get player ID for auto-scroll

    useEffect(() => {
        fetch(process.env.NEXT_PUBLIC_APP_URL + `/www${resolvedParams.tournament}/data.json?ts=${new Date().getTime()}`)
            .then((res) => res.json())
            .then((json) => setData(json));
    }, [resolvedParams.tournament]);

    // Auto-scroll effect for player cards
    useEffect(() => {
        if (data && page === "playercard.html" && playerId) {
            console.log(`Auto-scroll: Looking for player ID ${playerId}`);
            // Small delay to ensure DOM is rendered
            const timer = setTimeout(() => {
                const targetElement = document.getElementById(`table-anchor-${playerId}`);
                console.log(`Auto-scroll: Found element for table-anchor-${playerId}:`, targetElement);
                if (targetElement) {
                    console.log(`Auto-scroll: Scrolling to player ${playerId}`);
                    targetElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                } else {
                    console.log(`Auto-scroll: No table found with anchor ${playerId}`);
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [data, page, playerId]);

    // Sorting state
    const [sortConfig, setSortConfig] = useState<{ tableIdx: number; key: string; direction: "asc" | "desc" } | null>(null);

    // Pairing selector logic
    const isPairingPage = page.startsWith("pair");
    const pairingPages = data?.page ? Object.keys(data.page).filter((k) => k.startsWith("pair")) : [];
    const currentPairingIdx = pairingPages.indexOf(page);

    // Handlers
    const handleSelectPage = (href: string) => {
        router.replace(`?page=${encodeURIComponent(href)}`);
    };
    const handlePairingSelect = (idx: number) => {
        if (pairingPages[idx]) {
            router.replace(`?page=${encodeURIComponent(pairingPages[idx])}`);
        }
    };
    const handleHeaderClick = (tableIdx: number, header: string) => {
        setSortConfig((prev) => {
            if (prev && prev.tableIdx === tableIdx && prev.key === header) {
                return { tableIdx, key: header, direction: prev.direction === "asc" ? "desc" : "asc" };
            }
            return { tableIdx, key: header, direction: "asc" };
        });
    };
    const getSortedRows = (table: any, idx: number) => {
        if (!sortConfig || sortConfig.tableIdx !== idx) return table.rows;
        const { key, direction } = sortConfig;
        return [...table.rows].sort((a, b) => {
            if (a[key] === undefined || b[key] === undefined) return 0;
            if (!isNaN(Number(a[key])) && !isNaN(Number(b[key]))) {
                return direction === "asc"
                    ? Number(a[key]) - Number(b[key])
                    : Number(b[key]) - Number(a[key]);
            }
            return direction === "asc"
                ? String(a[key]).localeCompare(String(b[key]))
                : String(b[key]).localeCompare(String(a[key]));
        });
    };

    // Menu data already has the correct structure

    // Get current page data
    const pageData = data?.page?.[page] || data?.page?.["index.html"];
    
    // Handle player click navigation
    const handlePlayerClick = (playerId: string | number) => {
        // Stay within the current tournament context using Next.js router
        const params = new URLSearchParams();
        params.set('page', 'playercard.html');
        params.set('id', String(playerId));
        router.replace(`?${params.toString()}`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero panel at very top - full width */}
            <TournamentMeta metadata={data?.metadata ?? {}} />
            
            {/* Menu bar below hero - full width */}
            <TournamentMenu menu={data?.menu ?? []} activePage={page} onSelectPage={handleSelectPage} />
            {/* Main content: page heading and tables */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-6">
                {!data && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <div className="text-center text-gray-500">Loading tournament data...</div>
                    </div>
                )}
                {data && pageData && (
                    <div>
                        {pageData.pageHeading && (
                            <h2 className="text-xl font-semibold mb-4 text-blue-600 py-2">{pageData.pageHeading}</h2>
                        )}
                        {/* Pairing selector for pairing pages */}
                        {isPairingPage && pairingPages.length > 1 && (
                            <div className="flex flex-wrap gap-2 mb-6 justify-center">
                                {pairingPages.map((p, idx) => (
                                    <button
                                        key={p}
                                        className={`px-3 py-2 rounded border font-semibold text-sm transition-all duration-150 ${idx === currentPairingIdx ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"}`}
                                        onClick={() => handlePairingSelect(idx)}
                                    >
                                        {`Round ${idx + 1}`}
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Special rendering for tourstat.html */}
                        {page === "tourstat.html" && data?.metadata && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {Object.entries(data.metadata ?? {}).map(([key, value]) => (
                                    <div key={key} className="bg-blue-50 rounded-lg shadow p-4 flex flex-col">
                                        <span className="font-semibold text-blue-800 mb-1">{key}</span>
                                        <span className="text-gray-700">{String(value)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Normal table rendering for other pages */}
                        {page !== "tourstat.html" && pageData.tables && pageData.tables.length > 0 && (
                            pageData.tables.map((table: any, idx: number) => {
                                // Get anchor ID for auto-scroll
                                const anchorId = table.caption?.moreInfo?.anchor;
                                const tableId = anchorId ? `table-anchor-${anchorId}` : undefined;
                                
                                return (
                                <div 
                                    key={idx} 
                                    id={tableId}
                                    className="mb-8 animate-in fade-in-50 duration-500"
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    {/* Render caption if available */}
                                    {table.caption ? (
                                        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-r-lg shadow-sm">
                                            {typeof table.caption === 'string' ? (
                                                // Text-only caption
                                                <p className="text-gray-700 font-medium">{table.caption}</p>
                                            ) : (
                                                // Structured player caption
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-4">
                                                        <h3 className="text-lg font-bold text-blue-800">
                                                            {table.caption.playerName}
                                                        </h3>
                                                        {table.caption.id && (
                                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                                                                ID: {table.caption.id}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {table.caption.moreInfo && Object.keys(table.caption.moreInfo).length > 0 && (
                                                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                                            {Object.entries(table.caption.moreInfo)
                                                                .filter(([key]) => key !== 'anchor') // Hide anchor from display
                                                                .map(([key, value]) => (
                                                                    <span key={key} className="bg-white px-2 py-1 rounded border">
                                                                        <span className="font-medium">{key}:</span> {String(value)}
                                                                    </span>
                                                                ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                    <div className="overflow-hidden rounded-xl shadow-lg border border-gray-200/50 bg-white">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-slate-50 to-gray-100/80">
                                                    {table.headers && table.headers.map((header: string, hidx: number) => (
                                                        <th
                                                            key={hidx}
                                                            className={`px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer select-none transition-all duration-200 hover:bg-gray-200/50 ${hidx === 0 ? 'rounded-tl-xl' : ''} ${hidx === table.headers.length - 1 ? 'rounded-tr-xl' : ''}`}
                                                            onClick={() => handleHeaderClick(idx, header)}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span>{header}</span>
                                                                {sortConfig && sortConfig.tableIdx === idx && sortConfig.key === header && (
                                                                    <span className="text-blue-600 font-bold text-sm">
                                                                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                                {table.rows && table.rows.length > 0 ? (
                                                    getSortedRows(table, idx).map((row: any, ridx: number) => (
                                                        <tr key={ridx} className={`transition-all duration-150 hover:bg-blue-50/50 hover:shadow-sm ${ridx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                                                            {table.headers.map((header: string, hidx: number) => (
                                                                <td key={hidx} className="px-6 py-4 text-sm text-gray-900 font-medium">
                                                                    <PlayerRenderer 
                                                                        data={row[header]} 
                                                                        onPlayerClick={handlePlayerClick}
                                                                        tournamentPath={`/${resolvedParams.tournament}`}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={table.headers?.length || 1} className="px-6 py-8 text-center text-gray-500 italic">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                                <span>No data available</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                );
                            })
                        )}
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}
