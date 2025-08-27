import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function debugFideKeys() {
  console.log('🔍 Debugging FIDE keys...\n');

  try {
    // Read the FIDE rating list
    const fidePath = join(__dirname, '../www/fide-ratings.json');
    const fideData = JSON.parse(readFileSync(fidePath, 'utf8'));
    
    console.log(`📊 FIDE data loaded: ${fideData.players?.length || 0} players`);
    
    // Extract all keys from the FIDE map
    const fideKeys = {
      totalPlayers: fideData.players?.length || 0,
      lastUpdated: fideData.lastUpdated || 'unknown',
      keys: []
    };

    if (fideData.players) {
      fideData.players.forEach((player, index) => {
        fideKeys.keys.push({
          index: index,
          fideId: player.fideId,
          name: player.name,
          title: player.title,
          rating: player.rating,
          rapid_rating: player.rapid_rating,
          blitz_rating: player.blitz_rating
        });
      });
    }

    // Write to debug file
    const debugPath = join(__dirname, '../www/fide-keys-debug.json');
    writeFileSync(debugPath, JSON.stringify(fideKeys, null, 2), 'utf8');
    
    console.log(`✅ FIDE keys written to: ${debugPath}`);
    console.log(`📝 Total keys: ${fideKeys.keys.length}`);
    
    // Show some sample keys
    console.log('\n📋 Sample FIDE keys:');
    fideKeys.keys.slice(0, 10).forEach(key => {
      console.log(`  - FIDE ID: ${key.fideId}, Name: ${key.name}, Rating: ${key.rating}`);
    });
    
    if (fideKeys.keys.length > 10) {
      console.log(`  ... and ${fideKeys.keys.length - 10} more keys`);
    }

  } catch (error) {
    console.error('❌ Error debugging FIDE keys:', error);
  }
}

debugFideKeys();
