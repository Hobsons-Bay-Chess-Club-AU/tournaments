import papa from "papaparse";
import path from "path";
import fs from "fs";
import * as cheerio from "cheerio";
import Handlebars from "handlebars";
import * as glob from "glob";

const rootPath =
  "/Users/truongnguyen/truong/Hobsons-Bay-Chess-Club-AU/tournaments/www/wwwjunior chess championship";

function calculateAgeFromDate(dateString) {
  // Parse the input date string
  const parts = dateString.split("/");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Months are zero-indexed
  const day = parseInt(parts[2], 10);

  // Create Date objects for the input date and the beginning of the year
  const inputDate = new Date(year, month, day);
  const beginningOfYear = new Date(new Date().getFullYear(), 0, 1);

  // Calculate the age in milliseconds
  const ageInMillis = beginningOfYear - inputDate;

  // Convert age from milliseconds to years
  const ageInYears = ageInMillis / (365.25 * 24 * 60 * 60 * 1000);

  // Round down to get the whole years
  const roundedAge = Math.floor(ageInYears);

  return roundedAge;
}

function readPlayerList() {
  const playerFile = path.join(rootPath, "Players.csv");
  const raw = fs
    .readFileSync(playerFile, "utf8")
    .split("\n")
    .slice(2)
    .join("\n");
  console.log(raw);
  const x = papa.parse(raw, {
    header: true,
    transform: (x) => x && x.trim(),
    delimiter: ";",
    skipFirstNLines: 0,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  x.data.forEach((player) => {
    player.AGE = calculateAgeFromDate(player.BIRTHDAY);
    if (player.AGE > 12) {
      player.U = "Open";
    } else if (player.AGE > 10) {
      player.U = "U12";
    } else if (player.AGE > 8) {
      player.U = "U10";
    } else {
      player.U = "U8";
    }
  });

  // console.log(x);

  return x.data;
}

function readStanding() {
  const standingFile = path.join(rootPath, "standings.html");
  const raw = fs.readFileSync(standingFile, "utf8");
  const $ = cheerio.load(raw);
  const tr = $("table tr").toArray();
  const headers = $("th", tr[0])
    .toArray()
    .map((x) => $(x).text().trim());

  const list = tr.slice(1).map((t) => {
    const td = $("td", t).toArray();
    const item = {};
    headers.forEach((h, i) => {
      item[h] = $(td[i]).text().trim();
    });
    if (!item["NAME"]) return null;
    return item;
  });
  //  console.log(list);
  return {
    standings: list.filter(Boolean),
    title: $("h2").text(),
    subTitle: $("h4").text(),
  };
}

function updateNavigation(folderPath) {
  // Construct the glob pattern to match files with specified extensions
  const pattern = path.join(folderPath, "*.html");
  // Use glob to find files based on the pattern
  const files = glob.sync(pattern);

  // Iterate through matched files
  files.forEach((filePath) => {
    // Read the file content
    let content = fs.readFileSync(filePath, "utf8");
    const $ = cheerio.load(content);
    $("#rewards").remove();
    const navLink = $(
      `
      <li class="dropdown" id="rewards"><a href="rewards.html" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Rewards<span class="caret"></span></a>
            <ul class="dropdown-menu" role="menu">
              <li><a href="rewards.html">Open</a></li>
              <li><a href="rewards.html#U12">U12</a></li>
              <li><a href="rewards.html#U10">U10</a></li>
              <li><a href="rewards.html#U8">U8</a></li>
              <li> <a href="rewards.html#Girl">Girls</a></li>
            </ul>
          </li>`
    );
    $("head").append(
      $(
        ' <link rel="shortcut icon" type="image/x-icon" href="/tournaments/favicon.ico?">'
      )
    );
    // Replace the specified text
    $(".navbar-nav").append(navLink);
    // Write the modified content back to the file
    fs.writeFileSync(filePath, $.html(), "utf8");
  });
}

function ranking() {
  const standingFile = "standings-template.html";
  const raw = fs.readFileSync(standingFile, "utf8");

  const players = readPlayerList();
  const { title, subTitle, standings: standingList } = readStanding();
  for (const standing of standingList) {
    const p = players.find((x) => x.N === standing.N);
    standing.U = p.U;
    standing.GROUP = p.U;

    if (p.GENDER === "f") {
      standing.GROUP = "Girl";
    }
    standing.BHC1 = standing["BH-C1"];
  }
  standingList[0].GROUP = "Open";
  const rewardList = ["Open", "Girl", "U12", "U10", "U8"];
  // console.log(standingList);
  const reward = ["🏆 Winner", "🥈 1st runner up", "🥉 2nd runner up"];
  const rewards = rewardList.map(
    (category) => ({
      category,
      data: standingList
        .filter((t) => t.GROUP === category)
        .map((x, index) => ({ ...x, Pos: index + 1, Reward: reward[index] })),
    }),
    {}
  );

  console.log(rewards);
  const template = Handlebars.compile(raw);

  const html = template({
    data: rewards,
    title,
    subTitle: subTitle.replace("Standings", "Rewards"),
  });
  fs.writeFileSync(path.join(rootPath, "rewards.html"), html);

  updateNavigation(rootPath);
}
(async () => {
  // readPlayerList();
  // readStanding();
  ranking();
})();
