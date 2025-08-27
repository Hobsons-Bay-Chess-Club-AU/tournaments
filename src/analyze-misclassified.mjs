import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function calculateAge(birthYear) {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
}

function isAdult(birthYear) {
  return calculateAge(birthYear) >= 18;
}

function analyzePlayers() {
  console.log('🔍 Analyzing player classifications based on age...\n');
  
  // Load the enriched data
  const juniorData = JSON.parse(readFileSync(join(__dirname, '../www/junior-ratings.json'), 'utf8'));
  const seniorData = JSON.parse(readFileSync(join(__dirname, '../www/open-ratings.json'), 'utf8'));
  
  const currentYear = new Date().getFullYear();
  
  // Analyze junior players
  console.log('📊 JUNIOR PLAYERS ANALYSIS:');
  console.log('=' .repeat(50));
  
  const juniorPlayers = juniorData.players;
  const juniorWithBirthYear = juniorPlayers.filter(p => p.birthYear);
  const juniorWithoutBirthYear = juniorPlayers.filter(p => !p.birthYear);
  
  console.log(`Total junior players: ${juniorPlayers.length}`);
  console.log(`Players with birth year: ${juniorWithBirthYear.length}`);
  console.log(`Players without birth year: ${juniorWithoutBirthYear.length}`);
  
  // Find adult players in junior category
  const adultPlayersInJunior = juniorWithBirthYear.filter(p => isAdult(p.birthYear));
  
  if (adultPlayersInJunior.length > 0) {
    console.log(`\n⚠️  ADULT PLAYERS IN JUNIOR CATEGORY (${adultPlayersInJunior.length}):`);
    adultPlayersInJunior.forEach(player => {
      const age = calculateAge(player.birthYear);
      console.log(`  • ${player.name} (Age: ${age}, Birth Year: ${player.birthYear})`);
      console.log(`    Tournaments: ${player.tournamentCount}, FIDE ID: ${player.fideId || 'N/A'}`);
    });
  } else {
    console.log('\n✅ No adult players found in junior category');
  }
  
  // Age distribution for junior players
  const ageGroups = {};
  juniorWithBirthYear.forEach(player => {
    const age = calculateAge(player.birthYear);
    const group = age < 8 ? 'U8' : age < 10 ? 'U10' : age < 12 ? 'U12' : age < 14 ? 'U14' : age < 16 ? 'U16' : age < 18 ? 'U18' : '18+';
    ageGroups[group] = (ageGroups[group] || 0) + 1;
  });
  
  console.log('\n📈 Age Distribution (Junior Players):');
  Object.entries(ageGroups).sort().forEach(([group, count]) => {
    console.log(`  ${group}: ${count} players`);
  });
  
  // Analyze senior players
  console.log('\n\n📊 SENIOR/OPEN PLAYERS ANALYSIS:');
  console.log('=' .repeat(50));
  
  const seniorPlayers = seniorData.players;
  const seniorWithBirthYear = seniorPlayers.filter(p => p.birthYear);
  const seniorWithoutBirthYear = seniorPlayers.filter(p => !p.birthYear);
  
  console.log(`Total senior players: ${seniorPlayers.length}`);
  console.log(`Players with birth year: ${seniorWithBirthYear.length}`);
  console.log(`Players without birth year: ${seniorWithoutBirthYear.length}`);
  
  // Find junior players in senior category
  const juniorPlayersInSenior = seniorWithBirthYear.filter(p => !isAdult(p.birthYear));
  
  if (juniorPlayersInSenior.length > 0) {
    console.log(`\n⚠️  JUNIOR PLAYERS IN SENIOR CATEGORY (${juniorPlayersInSenior.length}):`);
    juniorPlayersInSenior.forEach(player => {
      const age = calculateAge(player.birthYear);
      console.log(`  • ${player.name} (Age: ${age}, Birth Year: ${player.birthYear})`);
      console.log(`    Tournaments: ${player.tournamentCount}, FIDE ID: ${player.fideId || 'N/A'}`);
    });
  } else {
    console.log('\n✅ No junior players found in senior category');
  }
  
  // Age distribution for senior players
  const seniorAgeGroups = {};
  seniorWithBirthYear.forEach(player => {
    const age = calculateAge(player.birthYear);
    let group;
    if (age < 18) group = 'Under 18';
    else if (age < 25) group = '18-24';
    else if (age < 35) group = '25-34';
    else if (age < 50) group = '35-49';
    else group = '50+';
    seniorAgeGroups[group] = (seniorAgeGroups[group] || 0) + 1;
  });
  
  console.log('\n📈 Age Distribution (Senior Players):');
  Object.entries(seniorAgeGroups).forEach(([group, count]) => {
    console.log(`  ${group}: ${count} players`);
  });
  
  // Summary statistics
  console.log('\n\n📋 SUMMARY:');
  console.log('=' .repeat(50));
  console.log(`Total players analyzed: ${juniorPlayers.length + seniorPlayers.length}`);
  console.log(`Players with birth year data: ${juniorWithBirthYear.length + seniorWithBirthYear.length}`);
  console.log(`Players without birth year data: ${juniorWithoutBirthYear.length + seniorWithoutBirthYear.length}`);
  console.log(`Misclassified players: ${adultPlayersInJunior.length + juniorPlayersInSenior.length}`);
  
  if (adultPlayersInJunior.length > 0 || juniorPlayersInSenior.length > 0) {
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('• Review tournament classifications for misclassified players');
    console.log('• Consider age-based filtering for tournament eligibility');
    console.log('• Update player categories based on birth year data');
  }
}

analyzePlayers();
