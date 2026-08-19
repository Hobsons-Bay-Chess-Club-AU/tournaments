import React from "react";

interface FilterTabsProps {
  options: string[];
  activeOption: string;
  onOptionChange: (option: string) => void;
}

const FilterTabs: React.FC<FilterTabsProps> = ({ options, activeOption, onOptionChange }) => {
  return (
    <nav
      aria-label="Tournament category"
      className="border-y border-[var(--color-calendar-rule)] bg-[var(--color-calendar-surface)]"
    >
      <div className="py-3">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Tournament category filters"
        >
          {options.map((option) => {
            const isActive = activeOption === option;
            return (
              <button
                key={option}
                aria-pressed={isActive}
                className={[
                  "min-h-[44px] shrink-0 rounded-full px-4 text-sm font-bold",
                  "transition-colors duration-200",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700",
                  "motion-reduce:transition-none",
                  "active:scale-[0.97] active:transition-transform",
                  isActive
                    ? "bg-primary-700 text-white shadow-sm"
                    : "border border-primary-100 bg-white text-primary-800 hover:bg-primary-50",
                ].join(" ")}
                onClick={() => onOptionChange(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default FilterTabs;
