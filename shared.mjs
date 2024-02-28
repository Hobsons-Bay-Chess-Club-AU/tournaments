import path from "path";
import fs from "fs";
import * as cheerio from "cheerio";
import * as glob from "glob";

export function updateNavigation(folderPath) {
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
