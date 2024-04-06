import path from "path";
import fs from "fs";
import * as cheerio from "cheerio";
import Handlebars from "handlebars";
import * as glob from "glob";
import { updateNavigation, readStanding, readPlayerList } from "./shared.mjs";

const rootPath = "www/wwwHonourableBobJuniors2024";

function ranking() {
  const standingFile = "standings-template.html";
  const raw = fs.readFileSync(standingFile, "utf8");

  const players = readPlayerList(rootPath);
  const { title, subTitle, standings: standingList } = readStanding(rootPath);
  // console.log(players);
  for (const standing of standingList) {
    const p = players.find((x) => x.N === standing.N);
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

  // Adjustment the reward outside category
  // find the player in the category that not have prize but hight point than other player
  const adjustment = ["U8", "U10", "U12", "Open"];

  let catIndex = 1;

  for (const category of adjustment) {
    var currentCat = rewards.find((x) => x.category === category);
    const list = currentCat.data;
    
    let upperCategories = adjustment.slice(catIndex);

   

    console.log("category ", category, upperCategories);

    for (var index = 3; index <= list.length; index++) {
      const playerStanding = list[index];

      if(currentCat === 'Girl') {
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
              +playerStanding.Pts > +upperCatList[rIndex].Pts ||
              (playerStanding.Pts == upperCatList[rIndex].Pts &&
                +playerStanding.BH > +upperCatList[rIndex].BH)
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

  // re-order the list
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
