"use client";
import React, { useEffect, useState, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TournamentMeta from "@/components/TournamentMeta";
import TournamentMenu from "@/components/TournamentMenu";
import PlayerRenderer from "@/components/PlayerRenderer";

type TableCaption = string | {
    playerName?: string;
    id?: string | number;
    moreInfo?: {
        anchor?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
};

type PageData = {
    pageHeading?: string;
    tables?: {
        headers?: string[];
        rows?: Record<string, unknown>[];
        caption?: TableCaption;
    }[];
};

type TournamentData = {
    metadata: Record<string, unknown>;
    menu: MenuItem[];
    page: Record<string, PageData>;
};

type MenuItem = {
    text: string;
    href: string;
    isDropdown?: boolean;
    children?: MenuItem[];
};

export default function TournamentClient({ params }: { params: Promise<{ tournament: string }> }) {
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
    // const currentPairingIdx = pairingPages.indexOf(page); // Unused variable

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

    const handlePlayerClick = (playerId: string | number) => {
        router.push(`?page=playercard.html&id=${playerId}`);
    };

    // Sorting function
    const getSortedRows = (table: { rows?: Record<string, unknown>[] }, idx: number) => {
        const rows = table.rows || [];
        if (!sortConfig || sortConfig.tableIdx !== idx) return rows;

        return [...rows].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            // Convert to strings for comparison
            const aStr = String(aVal || '');
            const bStr = String(bVal || '');

            // Check if both values are numeric (including decimal numbers)
            const aNum = parseFloat(aStr);
            const bNum = parseFloat(bStr);
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                // Both are valid numbers, sort numerically
                return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
            }

            // At least one is not a number, sort as strings
            if (sortConfig.direction === 'asc') {
                return aStr.localeCompare(bStr);
            } else {
                return bStr.localeCompare(aStr);
            }
        });
    };

    if (!data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading tournament data...</p>
                    </div>
                </div>
            </div>
        );
    }

    const currentPageData = data.page[page];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <div className="container mx-auto px-4 py-8">
                <TournamentMeta metadata={data.metadata} />
                
                <div className="mt-0">
                    <TournamentMenu menu={data.menu} activePage={page} onSelectPage={handleSelectPage} />
                </div>

                {currentPageData && (
                    <div className="my-8">
                        {currentPageData.pageHeading && (
                            <h2 className="text-3xl font-bold text-gray-900 mb-6 w-full text-center ">{currentPageData.pageHeading}</h2>
                        )}

                        {/* Pairing page selector */}
                        {isPairingPage && pairingPages.length > 1 && (
                            <div className="mb-6">
                                <div className="flex flex-wrap gap-2">
                                    {pairingPages.map((pairPage, idx) => (
                                        <button
                                            key={pairPage}
                                            onClick={() => handlePairingSelect(idx)}
                                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                                page === pairPage
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                            }`}
                                        >
                                            Round {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentPageData.tables && currentPageData.tables.length > 0 ? (
                            <div className="space-y-8">
                                {currentPageData.tables.map((table, idx) => (
                                    <div key={idx} className="space-y-4">
                                        {table.caption && (
                                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                                {typeof table.caption === 'string' ? (
                                                    <h3 className="text-lg font-semibold text-gray-900">{table.caption}</h3>
                                                ) : (
                                                    // Structured player caption
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-4">
                                                            <h3 className="text-lg font-bold text-blue-800">
                                                                {typeof table.caption === 'object' && table.caption.playerName ? String(table.caption.playerName) : ''}
                                                            </h3>
                                                            {typeof table.caption === 'object' && table.caption.id && (
                                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                                                                    ID: {String(table.caption.id)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {typeof table.caption === 'object' && table.caption.moreInfo && Object.keys(table.caption.moreInfo).length > 0 && (
                                                            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                                                {Object.entries(table.caption.moreInfo)
                                                                    .filter(([key]) => key !== 'anchor') // Hide anchor from display
                                                                    .map(([key, value]) => {
                                                                        // Special handling for FIDE_ID to make it clickable
                                                                        if (key === 'FIDE_ID' && value && String(value) !== '0') {
                                                                            return (
                                                                                <a
                                                                                    key={key}
                                                                                    href={`https://ratings.fide.com/profile/${value}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="bg-purple-50 text-purple-700 px-2 py-1 rounded border hover:bg-purple-100 hover:text-purple-800 transition-colors"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <span className="font-medium">{key}:</span> {String(value)}
                                                                                </a>
                                                                            );
                                                                        }
                                                                        
                                                                        return (
                                                                            <span key={key} className="bg-white px-2 py-1 rounded border">
                                                                                <span className="font-medium">{key}:</span> {String(value)}
                                                                            </span>
                                                                        );
                                                                    })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="overflow-hidden rounded-xl shadow-lg border border-gray-200/50 bg-white">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full">
                                                <thead>
                                                    <tr className="bg-gradient-to-r from-slate-50 to-gray-100/80 ">
                                                        {table.headers?.map((header: string, hidx: number) => (
                                                            <th
                                                                key={hidx}
                                                                className={`px-6 py-4 text-left text-sm font-bold  text-gray-700 uppercase tracking-wider cursor-pointer select-none transition-all duration-200 hover:bg-gray-200/50 ${hidx === 0 ? 'rounded-tl-xl' : ''} ${hidx === (table.headers?.length || 0) - 1 ? 'rounded-tr-xl' : ''}`}
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
                                                        getSortedRows(table, idx).map((row: Record<string, unknown>, ridx: number) => (
                                                            <tr key={ridx} className={`transition-all duration-150 hover:bg-blue-50/50 hover:shadow-sm ${ridx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                                                                {table.headers?.map((header: string, hidx: number) => (
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
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-gray-500">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No tables found</h3>
                                    <p className="mt-1 text-sm text-gray-500">This page doesn&apos;t contain any table data.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
