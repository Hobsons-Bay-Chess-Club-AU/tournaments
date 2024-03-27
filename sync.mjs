import fs, { promises as fsPromises, createReadStream } from "fs";
import path from "path";
import Handlebars from "handlebars";
import cheerio from "cheerio";
import {
  updateNavigation,
  accumulatePoint,
  readPlayerList,
  readStanding,
} from "./shared.mjs";

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
function updatePoint(data) {
  var raw = fs.readFileSync("www/point.html.hbs", "utf8");

  data.data = Object.entries(data.players).map(([key, value], index) => ({
    rank: index + 1,
    name: key,
    ...value,
  }));
  //sort
  data.data.sort((a, b) => b.total - a.total);
  data.data.map((t, index) => {
    t.rank = index + 1;
  });
  const t = Handlebars.compile(raw);

  fs.writeFileSync("www/2024.html", t(data));
}
function generateIndexFile(list) {
  const data = list.map((x) => {
    const html = fs.readFileSync(x, "utf8");

    var stats = fs.statSync(x);

    const $ = cheerio.load(html);
    var roundLink = $(".nav-link")
      .toArray()
      .map((l) => $(l).attr("href"))
      .find((t) => t.includes("pair"));
    const td = $("td").toArray();

    const standings = readStanding(path.dirname(x));

    //console.log(x, standings);
    // if (x.includes("wwwPurdyCup2024")) throw new Error("aaa");
    return {
      path: path.dirname(x),
      url: x.split("/")[1],
      arbiter: $(td[11]).text().trim(),
      name: $(td[1]).text().trim(),
      site: $(td[3]).text().trim(),
      start: $(td[7]).text().trim(),
      end: $(td[9]).text().trim(),
      year: $(td[9]).text().trim().split("/").pop(),
      round: roundLink ? +roundLink.match(/\d+/)[0] : 1,
      category: standings.standings.find((x) => x.NAME.includes("Hogan"))
        ? "senior"
        : "junior",
    };
  });

  const uniqueEntries = new Map();

  data.forEach((item) => {
    const key = `${item.name}-${item.start}`;
    if (!uniqueEntries.has(key) || item.round > uniqueEntries.get(key).round) {
      uniqueEntries.set(key, item);
    }
  });

  // Convert map values back to an array
  const uniqueList = Array.from(uniqueEntries.values());

  var raw = fs.readFileSync("www/index.html.hbs", "utf8");
  const t = Handlebars.compile(raw);
  console.log(uniqueList);

  fs.writeFileSync(
    "www/index.html",
    t({
      juniors: uniqueList.filter((x) => x.category == "junior"),
      seniors: uniqueList.filter((x) => x.category === "senior"),
    })
  );
  const accData = {};
  for (const item of uniqueList) {
    var reward = `${item.path}/rewards.html`;
    console.log(reward);
    if (fs.existsSync(reward)) {
      console.log("Update navigation", reward);
      updateNavigation("www/" + item.url);
    }
    if (item.year === "2024") {
      accumulatePoint(accData, item);
    }
    updatePoint(accData);
    console.log(accData);
  }
}
// Call the function to extract all zip files in the folder
// extractAllZipFiles("unzip", "www");
var files = findFiles("www", "tourstat.html");
console.log(files);
generateIndexFile(files);
