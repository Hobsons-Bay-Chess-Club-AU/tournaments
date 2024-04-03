import fs, { promises as fsPromises, createReadStream } from "fs";
import path from "path";
import unzipper from "unzipper";
import Handlebars from "handlebars";
import cheerio from "cheerio";

// Define the folder where you want to search for zip files

// Function to extract a zip file
async function extractZip(zipFilePath, extractionFolderPath) {
  try {
    await createReadStream(zipFilePath)
      .pipe(unzipper.Extract({ path: extractionFolderPath }))
      .promise();

    console.log(`Extracted ${zipFilePath}`);
  } catch (err) {
    console.error(`Error extracting ${zipFilePath}:`, err);
  }
}

// Function to find and extract all zip files in a folder
async function extractAllZipFiles(folderPath, outdir) {
  try {
    const files = await fsPromises.readdir(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await fsPromises.stat(filePath);

      if (stats.isFile() && file.endsWith(".zip")) {
        console.log(`Found zip file: ${file}`);
        await extractZip(filePath, outdir);
      }
    }
  } catch (err) {
    console.error("Error reading folder:", err);
  }
}

function findFiles(directoryPath, fileName, fileList = []) {
  const files = fs.readdirSync(directoryPath);

  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);
    const fileStat = fs.statSync(filePath);

    if (fileStat.isDirectory()) {
      // If it's a directory, recursively search within it
      findFiles(filePath, fileName, fileList);
    } else if (file === fileName) {
      // If it's the desired file, add its path to the list
      fileList.push(filePath);
    }
  });

  return fileList;
}

function generateIndexFile(list) {
  const data = list.map((x) => {
    const html = fs.readFileSync(x, "utf8");
    const $ = cheerio.load(html);
    const td = $("td").toArray();
    return {
      url: x.split("/")[1],
      name: $(td[1]).text().trim(),
      site: $(td[3]).text().trim(),
      start: $(td[7]).text().trim(),
      end: $(td[9]).text().trim(),
    };
  });
  var raw = fs.readFileSync("www/index.html.hbs", "utf8");
  const t = Handlebars.compile(raw);
  console.log(data);
  fs.writeFileSync("www/index.html", t({ data }));
}
// Call the function to extract all zip files in the folder
// extractAllZipFiles("unzip", "www");
var files = findFiles("www", "tourstat.html");
console.log(files);
generateIndexFile(files);
