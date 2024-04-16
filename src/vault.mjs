import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';
import assert from 'assert';

// Encryption and decryption functions
function encrypt(text, password) {
  const salt = randomBytes(16);
  const iv = randomBytes(16);
  const key = createHash('sha256').update(password).digest();
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}\n${salt.toString('hex')}\n${encrypted}`;
}

function decrypt(encrypted, password) {
  const textParts = encrypted.split('\n');
  const iv = Buffer.from(textParts[0], 'hex');
  const salt = Buffer.from(textParts[1], 'hex');
  const key = createHash('sha256').update(password).digest();
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = decipher.update(textParts[2], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Function to process files recursively
async function processFiles(folder, mode, password) {
  try {
    const files = await readdir(folder);

    for (const file of files) {
      const filePath = join(folder, file);
      const fileStat = await stat(filePath);
      
      if (fileStat.isDirectory()) {
        await processFiles(filePath, mode, password); // Recursive call for sub-folder
      } else {
        const fileExt = extname(filePath);
        const fileName = basename(filePath);

        if (mode === 'encrypt' && fileExt === '.csv') {
          const fileContent = await readFile(filePath, 'utf8');
          const encryptedContent = encrypt(fileContent, password);
          await writeFile(filePath +".vault", encryptedContent, 'utf8');
          console.log(`Encrypted ${fileName}`);
        } else if (mode === 'decrypt' && fileExt === '.vault') {
          const fileContent = await readFile(filePath, 'utf8');
          const decryptedContent = decrypt(fileContent, password);
          await writeFile(filePath.replace(".vault", ""), decryptedContent, 'utf8');
          console.log(`Decrypted ${fileName}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing folder ${folder}: ${error.message}`);
  }
}

// Main function
async function main() {
  const mode = process.argv[2]; // Get mode from command line arguments
  const password = process.env.VAULT_SECRET; // Replace with your encryption password
  assert(password, "No VAULT_SECRET found, please set VAULT_SECRET")
  const rootFolder = 'www'; // Replace with your root folder path
  
  if (['encrypt', 'decrypt'].includes(mode)) {
    await processFiles(rootFolder, mode, password);
  } else {
    console.error('Invalid mode. Please specify either "encrypt" or "decrypt".');
  }
}

// Start the main function
main().catch((error) => {
  console.error(`Error in main function: ${error.message}`);
});
