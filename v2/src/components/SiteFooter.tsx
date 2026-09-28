"use client";
import React from "react";
import { useFooter } from "@/context/FooterContext";

export default function SiteFooter() {
  const { generatedAt } = useFooter();

  return (
    <footer className="bg-white border-t mt-12 py-6 text-gray-500 text-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            &copy; {new Date().getFullYear()} Hobsons Bay Chess Club. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-center sm:text-right">
            <a href="https://hobsonsbaychess.com/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 font-medium">Website</a>
            <span className="text-gray-300">|</span>
            <a href="https://games.hobsonsbaychess.com/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 font-medium">Games database</a>
            <span className="text-gray-300">|</span>
            <a href="https://live.hobsonsbaychess.com/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 font-medium">Live Broadcast</a>
          </div>
        </div>
        {generatedAt && (
          <div id="site-footer-generated-at" className="text-center text-gray-400 text-xs pt-3">
            Generated at : {generatedAt}
          </div>
        )}
      </div>
    </footer>
  );
}
