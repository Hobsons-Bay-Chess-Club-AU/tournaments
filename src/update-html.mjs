import fs from 'fs';
import path from 'path';
import axios from 'axios';
//import puppeteer from 'puppeteer';
import {getCookie} from "./bytehost.mjs"

const rootDir = './www';

// async function getCookieFromUrl(url) {
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();

//     await page.goto(url, { waitUntil: 'networkidle2' });

//     await page.waitForFunction(() => {
//         return document.cookie.includes('test');
//     });

//     const cookies = await page.cookies();
//     let targetCookie = null;

//     for (const cookie of cookies) {
//         if (cookie.name === 'test') { // Replace 'yourCookieName' with the actual name of the cookie you want to check
//             targetCookie = cookie;
//             break;
//         }
//     }

//     await browser.close();

//     return targetCookie;
// }


const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Cookie': '__test=1670aca879a4d45aedc2e780e9ca765d'
};

async function fetchAndWriteHtml(filePath , retry=1) {
    console.log("URL: ", filePath)

    var pathUrl = filePath.replace("www/", "")

    try {
        console.log("url", `http://www.hbcc.byethost10.com/${pathUrl}`)
        const response = await axios.get(`http://www.hbcc.byethost10.com/${pathUrl}`, {headers});
        const htmlContent = response.data;
        
        const htmlFilePath = filePath.replace('.php', '.html');
        if(htmlContent.includes("This site requires Javascript to work")) 
        {
            if(retry < 3) {
                headers.Cookie = await getCookie(htmlContent);
                console.log("New Cookie: ", headers.Cookie)
                await fetchAndWriteHtml(filePath, retry++)
                }
            else
            console.warn("Invalid coookies, stop overwritten file")

        }
        fs.writeFileSync(htmlFilePath, htmlContent);
        console.log(`Successful mirror ${pathUrl} => ${htmlFilePath}`);
    } catch (error) {
        console.error(`Error fetching or writing ${filePath}:`, error);
        if(error.response.status === 508 && retry<100) {
            await fetchAndWriteHtml(filePath, retry++)
        }
    }
}


async function traverseDirectory(currentDir) {
    const files = fs.readdirSync(currentDir);
    const promises = [];
    let concurrentCount = 0;
    
    for (const file of files) {
        const filePath = path.join(currentDir, file);
        
        if (fs.statSync(filePath).isDirectory()) {
            promises.push(traverseDirectory(filePath));
        } else if (path.extname(filePath) === '.php') {
            promises.push(fetchAndWriteHtml(filePath));
        }
        
        concurrentCount++;
        
        if (concurrentCount >= 2) {
            await Promise.all(promises);
            promises.length = 0; // Clear the promises array
            concurrentCount = 0;
        }
    }
    
    await Promise.all(promises); // Handle remaining promises
}


(async () => {
await traverseDirectory(rootDir);

})();