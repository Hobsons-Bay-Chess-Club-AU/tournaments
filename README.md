## INTRODUCTION

This repo using to host the static published html (php) from Vega software for all tournaments run by Hobsons Bay Chess Club

## How it works

### Legacy System (Static HTML)
- Tournament manager using VEGA software to run tournament
- Vega publish to FTP server
- Github action run every x minutes to pull the changes from FTP server
- Github action running php web service to render all php files to html
- The github.io will host the output html on live website at https://tournament.hobsonsbaychess.com/

### Modern System (v2 Next.js Application)
- **Data Processing**: `prepare-data.mjs` extracts unique players from tournament HTML files
- **Player Categorization**: Separates players into junior and senior categories based on tournament participation
- **Rating Enrichment**: Daily automated process downloads latest FIDE and ACF ratings
- **Modern UI**: Next.js application with interactive leaderboards, tournament pages, and timeline view
- **Real-time Updates**: FIDE ID links, age filtering, and dynamic rating displays
- **Deployment**: Vercel deployment for modern web application features

```mermaid
graph TD;
    %% Tournament Data Flow
    TournamentManager[Tournament Manager]-->Vega[VEGA Software];
    Vega-->FTP[FTP Server];
    FTP-->Github_Action[GitHub Actions Sync];
    
    %% Data Processing Pipeline
    Github_Action-->Php_to_Html[PHP to HTML Conversion];
    Github_Action-->Populate_Html_With_NodeJS[Node.js Data Processing];
    Github_Action-->BuildTimeLine[Timeline Generation];
    
    %% Static Site Generation
    Php_to_Html-->www[www Directory];
    Populate_Html_With_NodeJS-->www;
    BuildTimeLine-->Copy_To_WWW_Timeline[Timeline Files];
    www-->Deploy_to_GH_Pages[GitHub Pages Deployment];
    
    %% New v2 Next.js Application
    Github_Action-->Prepare_Data[prepare-data.mjs];
    Prepare_Data-->Extract_Players[Extract Unique Players];
    Extract_Players-->Senior_Players[senior-players.json];
    Extract_Players-->Junior_Players[junior-players.json];
    
    %% Rating Enrichment System
    Daily_Enrichment[Daily Rating Enrichment]-->Download_FIDE[Download FIDE Ratings];
    Daily_Enrichment-->Download_ACF[Download ACF Ratings];
    Download_FIDE-->Enrich_Data[Enrich Player Data];
    Download_ACF-->Enrich_Data;
    Enrich_Data-->Junior_Ratings[junior-ratings.json];
    Enrich_Data-->Open_Ratings[open-ratings.json];
    
    %% v2 Next.js Application
    Junior_Ratings-->v2_Public[v2/public Directory];
    Open_Ratings-->v2_Public;
    v2_Public-->NextJS_App[Next.js Application];
    NextJS_App-->Leaderboards[Interactive Leaderboards];
    NextJS_App-->Tournament_Pages[Tournament Pages];
    NextJS_App-->Timeline_View[Timeline View];
    
    %% Deployment
    NextJS_App-->Vercel_Deploy[Vercel Deployment];
    Deploy_to_GH_Pages-->Live_Site[Live Tournament Site];
    Vercel_Deploy-->Modern_App[Modern Web Application];
    
    %% Styling
    classDef legacy fill:#f9f,stroke:#333,stroke-width:2px;
    classDef modern fill:#bbf,stroke:#333,stroke-width:2px;
    classDef data fill:#bfb,stroke:#333,stroke-width:2px;
    classDef automation fill:#fbb,stroke:#333,stroke-width:2px;
    
    class TournamentManager,Vega,FTP,Php_to_Html,www,Deploy_to_GH_Pages,Live_Site legacy;
    class Prepare_Data,Extract_Players,NextJS_App,Leaderboards,Tournament_Pages,Timeline_View,Vercel_Deploy,Modern_App modern;
    class Senior_Players,Junior_Players,Junior_Ratings,Open_Ratings,v2_Public data;
    class Github_Action,Daily_Enrichment,Download_FIDE,Download_ACF,Enrich_Data automation;
```

## Automated Workflows

### Daily Rating Enrichment
The system automatically updates player ratings daily at 2:00 AM UTC (10:00 AM AEST) through a GitHub Actions workflow.

**What it does:**
- Downloads latest FIDE and ACF rating lists
- Enriches player data with current ratings, titles, and birth years
- Updates both junior and senior player files
- Commits changes back to the repository
- Copies updated files to the Next.js public directory

**Files updated:**
- `www/junior-ratings.json` - Junior player ratings
- `www/open-ratings.json` - Senior player ratings
- `v2/public/junior-ratings.json` - For Next.js app
- `v2/public/open-ratings.json` - For Next.js app

**Manual trigger:**
You can manually trigger the rating enrichment from the GitHub Actions tab in the repository.

**Testing locally:**
```bash
./scripts/test-rating-enrichment.sh
```
