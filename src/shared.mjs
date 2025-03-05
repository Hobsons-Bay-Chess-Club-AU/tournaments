import path from "path";
import fs from "fs";
import * as cheerio from "cheerio";
import * as glob from "glob";
import papa from "papaparse";
import Handlebars from "handlebars";


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
  const roundedAge = Math.ceil(ageInYears);

  return roundedAge;
}

export function updateNavigation(folderPath) {
  const pattern = path.join(folderPath, "*.html");
  const files = glob.sync(pattern);
  var reward = `${folderPath}/rewards.html`;
  var reward1 = `${folderPath}/rewards_locked.html`;

  const hasRewardPage = fs.existsSync(reward)
  const hasRewardPage1 = fs.existsSync(reward1)

  var rPage = hasRewardPage1 ? 'rewards_locked.html' : "rewards.html"

  files.forEach((filePath) => {
    let content = fs.readFileSync(filePath, "utf8");
    const $ = cheerio.load(content);
    $("#rewards").remove();

    const navLink = $(
      `
        <li class="nav-item dropdown" id="rewards">
        <a href="rewards.html" class="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Rewards<span class="caret"></span></a>
              <ul class="dropdown-menu" role="menu">
                <li><a class="dropdown-item" href="${rPage}">Open</a></li>
                <li><a class="dropdown-item" href="${rPage}#U12">U12</a></li>
                <li><a class="dropdown-item" href="${rPage}#U10">U10</a></li>
                <li><a class="dropdown-item" href="${rPage}#U8">U8</a></li>
                <li> <a class="dropdown-item" href="${rPage}#Girl">Girls</a></li>
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
    if (hasRewardPage) {
      $(".navbar-nav").append(navLink);
    }
    var navBrand = $('.navbar-brand');
    if (navBrand != null) {
      navBrand.attr('href', '/')
    }

    const home = $(
      `<div id="gohome" style='position:fixed;top:10px;left:20px;padding: 5px;color:white;z-index:1000'><a href='/' style='width:24px;height:24px;color:white;display:block'>
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20,8h0L14,2.74a3,3,0,0,0-4,0L4,8a3,3,0,0,0-1,2.26V19a3,3,0,0,0,3,3H18a3,3,0,0,0,3-3V10.25A3,3,0,0,0,20,8ZM14,20H10V15a1,1,0,0,1,1-1h2a1,1,0,0,1,1,1Zm5-1a1,1,0,0,1-1,1H16V15a3,3,0,0,0-3-3H11a3,3,0,0,0-3,3v5H6a1,1,0,0,1-1-1V10.25a1,1,0,0,1,.34-.75l6-5.25a1,1,0,0,1,1.32,0l6,5.25a1,1,0,0,1,.34.75Z" fill="#000"></path>
          </svg>
      </a></div>`

    );
    $("#gohome").remove();
    $('nav').append(home)

    // Write the modified content back to the file
    fs.writeFileSync(filePath, $.html().replace(".php", ".html"), "utf8");
  });
}

export function updateHomeNav(folderPath) {
  const pattern = path.join(folderPath, "*.html");
  const files = glob.sync(pattern);

  files.forEach((filePath) => {
    let content = fs.readFileSync(filePath, "utf8");
    const $ = cheerio.load(content);

    const navLink = $(
      `<div style='position:fixed;top:0;left:0;padding: 5px'>HOME</div>`

    );

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
  if (!fs.existsSync(standingFile)) {
    return {
      standings: []
    }
  }
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
      if (h === "NAME" || h === "Player") {
        item[h] = $("a", $(td[i])).text().trim().replace(" (W)", "");
        item.N = $("span", $(td[i])).text().trim();
      }
    });

    if ($('.player-container', td)) {
      item["NAME"] = $('.player-container span', td).text()
    }
    if (!item["NAME"] && !item["Player"]) return null;
    item["NAME"] = item["NAME"] || item["Player"];

    return item;
  });
  //  console.log(list);
  return {
    standings: list.filter(Boolean),
    title: $("h2").text() || $("h1").text(),
    subTitle: $("h4").text() || $("h3").text(),
  };
}

export function readPlayerList(rootPath) {
  const playerFile = path.join(rootPath, "Players.csv");
  if (!fs.existsSync(playerFile)) {
    return null
  }
  const raw = fs
    .readFileSync(playerFile, "utf8")
    .split("\n")
    .slice(2)
    .join("\n");
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
  // console.log(standings);
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


export function generateRewardPage(folderPath) {
  const standingFile = "./src/standings-template.html";
  const raw = fs.readFileSync(standingFile, "utf8");

  const players = readPlayerList(folderPath);
  if (!players) {
    return;
  }
  const { title, subTitle, standings: standingList } = readStanding(folderPath);
  // console.log(players);
  for (const standing of standingList) {
    const p = players.find((x) => x.N === standing.N);
    if (!p) continue;
    standing.U = p.U;
    standing.GROUP = p.U;
    standing.Rtg = p.ELONAT;

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
  console.log("standingList", standingList)
  rewards.push({
    category: 'Unrated',
    data: standingList.filter(x => +x.Rtg === 0)
  })

  // Adjustment the reward outside category
  // find the player in the category that not have prize but hight point than other player
  const adjustment = ["U8", "U10", "U12", "Open"];

  let catIndex = 1;

  for (const category of adjustment) {
    var currentCat = rewards.find((x) => x.category === category);
    const list = currentCat.data;

    let upperCategories = adjustment.slice(catIndex);

    //console.log("category ", category, upperCategories);

    for (var index = 3; index <= list.length; index++) {
      const playerStanding = list[index];

      if (currentCat === 'Girl') {
        var currentCat = rewards.find((x) => x.category === playerStanding.U);
        upperCategories = adjustment.slice(catIndex);
      }

      if (playerStanding && upperCategories.length > 0) {
        //  console.log(playerStanding);
        let swapped = false;
        for (const upercat of upperCategories) {
          var cat = rewards.find((x) => x.category === upercat);
          const upperCatList = cat.data;
          if (swapped) {
            break;
          }
          console.log(upperCatList);

          for (let rIndex = 0; rIndex < 3; rIndex++) {
            //  console.log("compare", playerStanding, upperCatList[rIndex]);
            if (
              +playerStanding.Pts > +upperCatList[rIndex]?.Pts ||
              (playerStanding.Pts == upperCatList[rIndex]?.Pts &&
                +playerStanding.BH > +upperCatList[rIndex]?.BH)
            ) {
              cat.data = [
                ...cat.data.slice(0, rIndex),
                playerStanding,
                ...cat.data.slice(rIndex),
              ];

              // remove player form his current category
              currentCat.data = currentCat.data.filter(
                (x) => x.NAME !== playerStanding.NAME
              );
              // update index & prizes
              cat.data = cat.data.map((x, index) => ({
                ...x,
                Pos: index + 1,
                Reward: reward[index],
              }));
              swapped = true;
              break;
            }
          }
        }
      }
    }
    catIndex++;
  }
  // check if unrated already win the trophies then remove from unrated
  // re-order the list
  const template = Handlebars.compile(raw);

  const html = template({
    data: rewards,
    title,
    subTitle: subTitle.replace("Standings", "Rewards"),
  });
  fs.writeFileSync(path.join(folderPath, "rewards.html"), html);

  updateNavigation(folderPath);
}
