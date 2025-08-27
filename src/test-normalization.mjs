function normaliseName(name) {
  return name.toLowerCase().replace(/\s+/g, '');
}

// Test the normalization
const localName = "Venkat,Nyra";
const fideName = "Venkat, Nyra";

console.log('Local name:', localName);
console.log('Normalized local name:', normaliseName(localName));

console.log('FIDE name:', fideName);
console.log('Normalized FIDE name:', normaliseName(fideName));

console.log('Match?', normaliseName(localName) === normaliseName(fideName));

// Test with different variations
const variations = [
  "Venkat,Nyra",
  "Venkat, Nyra", 
  "Venkat,  Nyra",
  "Venkat,Nyra ",
  " Venkat,Nyra",
  "Venkat,  Nyra "
];

console.log('\nTesting variations:');
variations.forEach(name => {
  console.log(`"${name}" -> "${normaliseName(name)}"`);
});
