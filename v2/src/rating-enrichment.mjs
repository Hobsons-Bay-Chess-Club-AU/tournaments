import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function randomRating() {
  return Math.floor(Math.random() * (2200 - 1500 + 1)) + 1500;
}

function enrichRatings(inputPath, outputPath) {
  const data = JSON.parse(readFileSync(inputPath, 'utf8'));
  const enriched = {
    ...data,
    players: data.players.map(player => ({
      ...player,
      rating: randomRating()
    }))
  };
  writeFileSync(outputPath, JSON.stringify(enriched, null, 2));
}

const juniorPath = join(__dirname, '../public/junior-players.json');
const seniorPath = join(__dirname, '../public/senior-players.json');
const juniorOut = join(__dirname, '../public/junior-ratings.json');
const seniorOut = join(__dirname, '../public/open-ratings.json');

enrichRatings(juniorPath, juniorOut);
enrichRatings(seniorPath, seniorOut);

console.log('Ratings enrichment complete.');
