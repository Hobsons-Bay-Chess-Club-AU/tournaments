"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

export function formatMelbourneTime(isoOrDateString?: string): string | undefined {
  if (!isoOrDateString) return undefined;
  const date = new Date(isoOrDateString);
  if (isNaN(date.getTime())) return undefined;
  return date.toLocaleString("en-AU", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface FooterContextType {
  generatedAt: string | undefined;
  setGeneratedAt: (time: string | undefined) => void;
}

const FooterContext = createContext<FooterContextType>({
  generatedAt: undefined,
  setGeneratedAt: () => {},
});

export const FooterProvider = ({
  children,
  initialBuildTime,
}: {
  children: React.ReactNode;
  initialBuildTime?: string;
}) => {
  const [customGeneratedAt, setCustomGeneratedAt] = useState<string | undefined>();

  useEffect(() => {
    const el = document.getElementById("site-footer-generated-at");
    const displayTime = customGeneratedAt || initialBuildTime;
    if (el && displayTime) {
      el.textContent = `Generated at : ${displayTime}`;
    }
  }, [customGeneratedAt, initialBuildTime]);

  return (
    <FooterContext.Provider
      value={{
        generatedAt: customGeneratedAt || initialBuildTime,
        setGeneratedAt: setCustomGeneratedAt,
      }}
    >
      {children}
    </FooterContext.Provider>
  );
};

export const useFooter = () => useContext(FooterContext);
