import fs, { promises as fsPromises, createReadStream } from "fs";
import path from "path";
import unzipper from "unzipper";
import Handlebars from "handlebars";
import cheerio from "cheerio";
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
