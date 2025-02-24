import fs, { promises as fsPromises, createReadStream } from "fs";
import path from "path";
import Handlebars from "handlebars";
import cheerio from "cheerio";
import {
  updateNavigation,
  accumulatePoint,
  generateRewardPage,
  readStanding,
} from "./shared.mjs";
import { IsSeniorPlayer } from "./ref.mjs";

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
  if (!data || !data.players) return;
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
    if (!fs.existsSync(x)) {
      return null;
    }
    const tournamentStats = path.dirname(x) + "/tourstat.html"
    if (fs.existsSync(tournamentStats)) {
      const html = fs.readFileSync(tournamentStats, "utf8");

      const files = fs.readdirSync(path.dirname(x)).filter(x => x.includes("pairs"))

      console.log(files)

      const $ = cheerio.load(html);
      var roundLink = files.pop()
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
        ts: +$(td[7]).text().trim().split('/').reverse().join(''),
        end: $(td[9]).text().trim(),
        year: $(td[9]).text().trim().split("/").pop(),
        round: roundLink != null ? +roundLink.match(/\d+/)?.[0] : 1,
        category: standings?.standings.find((x) => IsSeniorPlayer(x.NAME))
          ? "senior"
          : "junior",
      };
    }
    else {
      const html = fs.readFileSync(x, "utf8");


      console.log(files)
      const $ = cheerio.load(html);

      return {
        path: path.dirname(x),
        url: x.split("/")[1],
        arbiter: '',
        name: $('title').text(),
        site: '',
        start: '',
        ts: 0,
        end: '',
        year: '',
        round: 0,
        category: html.includes("Hogan")
          ? "senior"
          : "junior",
      };
    }
  }).filter(Boolean);

  const uniqueEntries = new Map();
  // console.log("data", data)
  data.forEach((item) => {
    const key = `${item.name}-${item.start}`;
    if (!uniqueEntries.has(key) || item.round > uniqueEntries.get(key).round) {
      uniqueEntries.set(key, item);
    }
  });

  // Convert map values back to an array
  const uniqueList = Array.from(uniqueEntries.values()).sort((x, y) => x.start);

  var raw = fs.readFileSync("www/index.html.hbs", "utf8");
  const t = Handlebars.compile(raw);
  // console.log(uniqueList);

  // uniqueList.push({
  //     path: "wwwWesternAutumnJuniorChampionship2024",
  //     url: "wwwWesternAutumnJuniorChampionship2024",
  //     arbiter: "",
  //     name: "Western Autumn Junior Championship 2024",
  //     site: "Hobsons Bay Chess Club",
  //     start: "",
  //     end: "",
  //     year: "2024",
  //     round: 1,
  //     category: 'junior'
  // })
  uniqueList.sort((a, b) => b.ts - a.ts)

  const juniors = uniqueList.filter((x) => x.category == "junior");
  const seniors = uniqueList.filter((x) => x.category === "senior");

  const currentyear = new Date().getFullYear();
  const currentYearJuniors = juniors.filter(x => x.year == currentyear);
  const currentYearSenior = seniors.filter(x => x.year == currentyear);

  const passTournaments = {}

  for (const t of juniors) {
    const item = passTournaments[t.year] || { year: t.year, seniors: [], juniors: [] }
    item.juniors.push(t)
    passTournaments[t.year] = item;
  }

  for (const t of seniors) {
    const item = passTournaments[t.year] || { year: t.year, seniors: [], juniors: [] }
    item.seniors.push(t)
    passTournaments[t.year] = item;
  }

  fs.writeFileSync(
    "www/index.html",
    t({
      year: currentyear,
      juniors: currentYearJuniors,
      seniors: currentYearSenior,
      archive: Object.values(passTournaments).reverse(),
    })
  );

  for (const data of Object.values(passTournaments)) {
    fs.writeFileSync(
      `www/${data.year || "na"}.html`,
      t({
        ...data,
        archive: Object.values(passTournaments).reverse(),
      })
    );
  }


  const accData = {};
  for (const item of uniqueList) {

    updateNavigation("www/" + item.url);

    // if (item.year === "2024") {
    //   accumulatePoint(accData, item);
    // }
    // updatePoint(accData);
    // //console.log(accData);

    generateRewardPage(item.path)
  }
}
// Call the function to extract all zip files in the folder
// extractAllZipFiles("unzip", "www");
var files = findFiles("www", "playersname.html");
console.log(files);


generateIndexFile(files);
