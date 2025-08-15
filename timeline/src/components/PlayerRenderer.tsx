import React from "react";

interface PlayerObject {
    id?: string | number;
    playerName?: string;
    gender?: string;
    href?: string;
    rating?: string | number;
    title?: string;
    [key: string]: unknown; // Allow for additional properties
}

interface PlayerRendererProps {
    data: string | PlayerObject | unknown;
    className?: string;
    onPlayerClick?: (playerId: string | number) => void;
    tournamentPath?: string; // Add tournament path to generate correct URLs
}

// Helper function to get gender-based styling
const getGenderStyles = (gender: string) => {
    const normalizedGender = gender?.toLowerCase().trim();
    
    if (normalizedGender === 'f' || normalizedGender === 'female') {
        return {
            nameColor: 'text-pink-600',
            linkColor: 'text-pink-600 hover:text-pink-800',
            linkHoverColor: 'hover:text-pink-800'
        };
    }
    
    // Default styling for male/other
    return {
        nameColor: 'text-gray-900',
        linkColor: 'text-blue-600 hover:text-blue-800',
        linkHoverColor: 'hover:text-blue-800'
    };
};

const PlayerRenderer: React.FC<PlayerRendererProps> = ({ data, className = "", onPlayerClick, tournamentPath }) => {
    // If data is a string, render it directly
    if (typeof data === 'string') {
        return <span className={className}>{data}</span>;
    }

    // If data is null, undefined, or a number, render it as string
    if (data === null || data === undefined || typeof data === 'number') {
        return <span className={className}>{String(data || '')}</span>;
    }

    // If data is an object, try to extract player information
    if (typeof data === 'object') {
        const playerObj = data as PlayerObject;
        
        // Check for common player object properties
        const playerName = String(playerObj.playerName || playerObj.name || playerObj.player || '');
        const playerId = playerObj.id;
        const gender = playerObj.gender;
        const rating = playerObj.rating;
        const title = playerObj.title;
        const href = playerObj.href;

        // If we have a player name and it's not empty, render detailed player info
        if (playerName && playerName.trim() !== '') {
            const handlePlayerClick = () => {
                if (onPlayerClick && playerId && String(playerId).trim() !== '') {
                    onPlayerClick(playerId);
                }
            };

            // Get gender-based styling
            const genderStyles = getGenderStyles(gender || '');

            // Generate correct tournament URL if href exists
            let tournamentUrl = href;
            if (href && tournamentPath && playerId && String(playerId).trim() !== '') {
                // Convert href like "playercard.html#16" to tournament-scoped URL
                const params = new URLSearchParams();
                params.set('page', 'playercard.html');
                params.set('id', String(playerId));
                tournamentUrl = `${tournamentPath}?${params.toString()}`;
            }

            return (
                <div className={`player-info ${className}`}>
                    {href ? (
                        <a 
                            href={tournamentUrl} 
                            className={`${genderStyles.linkColor} hover:underline font-medium`}
                            onClick={(e) => {
                                // Prevent default and use our navigation instead
                                e.preventDefault();
                                if (onPlayerClick && playerId && String(playerId).trim() !== '') {
                                    onPlayerClick(playerId);
                                }
                            }}
                        >
                            {playerName}
                        </a>
                    ) : playerId && String(playerId).trim() !== '' && onPlayerClick ? (
                        <button
                            onClick={handlePlayerClick}
                            className={`${genderStyles.linkColor} hover:underline font-medium cursor-pointer bg-transparent border-none p-0 text-left`}
                        >
                            {playerName}
                        </button>
                    ) : (
                        <span className={`font-medium ${genderStyles.nameColor}`}>{playerName}</span>
                    )}
                    
                    {/* Display additional info in a subtle way */}
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                        {playerId && String(playerId).trim() !== '' && <span className="bg-gray-100 px-2 py-0.5 rounded-full">ID: {playerId}</span>}
                        {title && <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{title}</span>}
                        {rating && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full">({rating})</span>}
                    </div>
                </div>
            );
        }

        // If it's an object but no player name, try to render key-value pairs
        // For debugging, let's be more explicit about what we show
        const entries = Object.entries(playerObj);
        if (entries.length > 0) {
            // Special handling for common player object patterns
            if ('playerName' in playerObj && 'id' in playerObj) {
                // This looks like a player object, show the name prominently
                const genderStyles = getGenderStyles(String(playerObj.gender || ''));
                
                return (
                    <div className={`player-fallback ${className}`}>
                        <span className={`font-medium ${genderStyles.nameColor}`}>
                            {String(playerObj.playerName || 'Unknown Player')}
                        </span>
                        {playerObj.id && String(playerObj.id).trim() !== '' && (
                            <span className="text-xs text-gray-500 ml-2">
                                (ID: {String(playerObj.id)})
                            </span>
                        )}
                    </div>
                );
            }
            
            // Generic object display
            return (
                <div className={`object-data ${className}`}>
                    {entries.map(([key, value], index) => (
                        <div key={key} className="text-xs">
                            {index === 0 ? (
                                <span className="font-medium">{String(value)}</span>
                            ) : (
                                <span className="text-gray-500">{key}: {String(value)}</span>
                            )}
                        </div>
                    ))}
                </div>
            );
        }
    }

    // Fallback: convert to string
    try {
        return <span className={className}>{JSON.stringify(data)}</span>;
    } catch {
        return <span className={className}>{String(data)}</span>;
    }
};

export default PlayerRenderer;
