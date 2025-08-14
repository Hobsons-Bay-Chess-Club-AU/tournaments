async function extractMetadataFromTourstat(tourstatPath) {
  const html = await fs.readFile(tourstatPath, 'utf-8');
  const $ = cheerio.load(html);
  const metadata = {};
  $('table.table-striped tbody tr').each((i, tr) => {
    const tds = $(tr).find('td');
    if (tds.length === 2) {
      const key = $(tds[0]).text().replace(/\s+/g, ' ').trim();
      const value = $(tds[1]).text().replace(/\s+/g, ' ').trim();
      metadata[key] = value;
    }
  });
  return metadata;
}
// Script to process HTML files in www2025HobsonsBayCup folder, extract Bootstrap tables, and write to data.json
import fs from 'fs/promises';
import path from 'path';
import cheerio from 'cheerio';

const WWW_FOLDER = path.join(process.cwd(), 'www');

async function getHtmlFiles(dir) {
  const files = await fs.readdir(dir);
  return files.filter(f => f.endsWith('.html'));
}

function parseTableToJson($table) {
  const headers = [];
  $table.find('thead tr th').each((i, el) => {
    headers.push(cheerio(el).text().trim());
  });
  const rows = [];
  $table.find('tbody tr').each((i, tr) => {
    const rowObj = {};
    cheerio(tr).find('td').each((j, td) => {
      rowObj[headers[j] || `col${j+1}`] = cheerio(td).text().trim();
    });
    rows.push(rowObj);
  });
  return { headers, rows };
}

async function processHtmlFile(filePath) {
  const html = await fs.readFile(filePath, 'utf-8');
  const $ = cheerio.load(html);
  const tablesJson = [];
  $('table').each((i, table) => {
    tablesJson.push(parseTableToJson($(table)));
  });
  // Extract h1 title
  const pageHeading = $('h3').first().text().trim();
  return { pageHeading, tables: tablesJson };
}

async function extractMenuStructure(indexHtmlPath) {
  const html = await fs.readFile(indexHtmlPath, 'utf-8');
  const $ = cheerio.load(html);
  const menu = [];
  $('ul.navbar-nav.me-auto.mb-2.mb-lg-0 > li').each((i, li) => {
    const $li = $(li);
    const link = $li.find('> a.nav-link, > a.nav-link.dropdown-toggle').first();
    const text = link.text().trim();
    const href = link.attr('href') || null;
    const isDropdown = $li.hasClass('dropdown') || link.hasClass('dropdown-toggle');
    let children = [];
    if (isDropdown) {
      $li.find('ul.dropdown-menu > li > a').each((j, a) => {
        children.push({
          text: $(a).text().trim(),
          href: $(a).attr('href') || null
        });
      });
    }
    menu.push({ text, href, isDropdown, children });
  });
  return menu;
}

async function extractMinimalMetadataFromIndex(indexHtmlPath) {
  const html = await fs.readFile(indexHtmlPath, 'utf-8');
  const $ = cheerio.load(html);
  const meta = {};
  const div = $('div.flex.flex-column.justify-content-center.text-center.text-white');
  if (div.length) {
    const h1 = div.find('h1').first().text().trim();
    const h5s = div.find('h5');
    meta['Tournament Name'] = h1;
    if (h5s.length >= 1) meta['Federation'] = h5s.eq(0).text().trim();
    if (h5s.length >= 2) meta['Date'] = h5s.eq(1).text().trim();
  } else {
    // fallback: try to get h1 and h5 anywhere
    const h1 = $('h1').first().text().trim();
    const h5s = $('h5');
    if (h1) meta['Tournament Name'] = h1;
    if (h5s.length >= 1) meta['Federation'] = h5s.eq(0).text().trim();
    if (h5s.length >= 2) meta['Date'] = h5s.eq(1).text().trim();
  }
  return meta;
}

async function processFolder(folderName) {
  const TARGET_PATH = path.join(WWW_FOLDER, folderName);
  const OUTPUT_FILE = path.join(TARGET_PATH, 'data.json');
  const htmlFiles = await getHtmlFiles(TARGET_PATH);
  const result = {};
  result.page = {};
  for (const file of htmlFiles) {
    const filePath = path.join(TARGET_PATH, file);
    try {
      const pageData = await processHtmlFile(filePath);
      result.page[file] = pageData;
      console.log(`[${folderName}] Processed: ${file}`);
    } catch (err) {
      console.error(`[${folderName}] Error processing ${file}:`, err);
    }
  }
  // Extract menu structure from index.html
  const indexHtmlPath = path.join(TARGET_PATH, 'index.html');
  try {
    const menu = await extractMenuStructure(indexHtmlPath);
    result['menu'] = menu;
    console.log(`[${folderName}] Menu structure extracted.`);
  } catch (err) {
    console.error(`[${folderName}] Error extracting menu:`, err);
  }
  // Extract metadata from tourstat.html, fallback to index.html if not exist
  const tourstatPath = path.join(TARGET_PATH, 'tourstat.html');
  let metadata = {};
  try {
    metadata = await extractMetadataFromTourstat(tourstatPath);
    result['metadata'] = metadata;
    console.log(`[${folderName}] Metadata extracted from tourstat.html.`);
  } catch (err) {
    console.warn(`[${folderName}] tourstat.html not found or error, extracting minimal metadata from index.html.`);
    try {
      metadata = await extractMinimalMetadataFromIndex(indexHtmlPath);
      result['metadata'] = metadata;
      console.log(`[${folderName}] Minimal metadata extracted from index.html.`);
    } catch (err2) {
      console.error(`[${folderName}] Error extracting minimal metadata from index.html:`, err2);
    }
  }
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`[${folderName}] Data written to ${OUTPUT_FILE}`);
}

async function main() {
  const allFolders = await fs.readdir(WWW_FOLDER, { withFileTypes: true });
  const wwwFolders = allFolders.filter(dirent => dirent.isDirectory() && dirent.name.startsWith('www')).map(dirent => dirent.name);
  const tournaments = [];
  for (const folderName of wwwFolders) {
    await processFolder(folderName);
    // Read metadata from just-written data.json
    const dataJsonPath = path.join(WWW_FOLDER, folderName, 'data.json');
    try {
      const data = JSON.parse(await fs.readFile(dataJsonPath, 'utf-8'));
      if (data.metadata) {
        tournaments.push({
          ...data.metadata,
          path: `${folderName}/data.json`
        });
      }
    } catch (err) {
      console.error(`[${folderName}] Error reading metadata for tournament.json:`, err);
    }
  }
  // Write tournament.json in www folder
  const tournamentJsonPath = path.join(WWW_FOLDER, 'tournament.json');
  await fs.writeFile(tournamentJsonPath, JSON.stringify(tournaments, null, 2), 'utf-8');
  console.log(`All tournaments metadata written to ${tournamentJsonPath}`);
}

main();
