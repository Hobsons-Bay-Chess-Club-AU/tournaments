import React from "react";

interface FilterTabsProps {
    categories: string[];
    activeCategory: string;
    onCategoryChange: (category: string) => void;
}

const FilterTabs: React.FC<FilterTabsProps> = ({ categories, activeCategory, onCategoryChange }) => {
    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="container mx-auto px-4">
                {/* Desktop tabs */}
                <div className="hidden lg:block">
                    <div className="flex justify-center border-b border-gray-200">
                        {categories.map((category) => (
                            <button
                                key={category}
                                className={`relative px-8 py-4 font-medium text-sm transition-all duration-200 border-b-2 -mb-px ${
                                    activeCategory === category 
                                        ? "text-blue-600 border-blue-600 bg-blue-50" 
                                        : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                                }`}
                                onClick={() => onCategoryChange(category)}
                            >
                                {category}
                                {activeCategory === category && (
                                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile tabs */}
                <div className="lg:hidden">
                    <div className="flex justify-center border-b border-gray-200">
                        {categories.map((category) => (
                            <button
                                key={category}
                                className={`flex-1 px-4 py-4 font-medium text-sm transition-all duration-200 border-b-2 -mb-px ${
                                    activeCategory === category 
                                        ? "text-blue-600 border-blue-600 bg-blue-50" 
                                        : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                                }`}
                                onClick={() => onCategoryChange(category)}
                            >
                                {category}
                                {activeCategory === category && (
                                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default FilterTabs;
