import path from "path";
import fs from "fs";
import * as cheerio from "cheerio";
import * as glob from "glob";

export function updateNavigation(folderPath) {
  const pattern = path.join(folderPath, "*.html");
  const files = glob.sync(pattern);

  files.forEach((filePath) => {
    let content = fs.readFileSync(filePath, "utf8");
    const $ = cheerio.load(content);
    $("#rewards").remove();

    const navLink = $(
      `
        <li class="nav-item dropdown" id="rewards">
        <a href="rewards.html" class="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Rewards<span class="caret"></span></a>
              <ul class="dropdown-menu" role="menu">
                <li><a class="dropdown-item" href="rewards.html">Open</a></li>
                <li><a class="dropdown-item" href="rewards.html#U12">U12</a></li>
                <li><a class="dropdown-item" href="rewards.html#U10">U10</a></li>
                <li><a class="dropdown-item" href="rewards.html#U8">U8</a></li>
                <li> <a class="dropdown-item" href="rewards.html#Girl">Girls</a></li>
              </ul>
            </li>`
    );
    $('[type="image/x-icon"]').remove();
    $('[rel="manifest"]').remove();
    $("head").append('<link rel="manifest" href="/manifest.json" />');

    $("head").append(
      $(' <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico?">')
    );
    // Replace the specified text
    $(".navbar-nav").append(navLink);
    // Write the modified content back to the file
    fs.writeFileSync(filePath, $.html(), "utf8");
  });
}

export function readStanding(rootPath) {
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
      if (h === "NAME") {
        item[h] = $("a", $(td[i])).text().trim().replace(" (W)", "");
        item.N = $("span", $(td[i])).text().trim();
      }
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

export function readPlayerList() {
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
export function accumulatePoint(current, tournament) {
  const { standings } = readStanding(tournament.path);
  current.tournaments = current.tournaments || [];
  current.players = current.players || {};

  current.tournaments.push(tournament.name);
  console.log(standings);
  const p = current.players;
  standings.forEach((stand) => {
    p[stand.NAME] = p[stand.NAME] || {
      total: 0,
      data: [],
    };
    p[stand.NAME].data.push(+stand.Pts);
    p[stand.NAME].total += +stand.Pts;
  });
  return current;
}
