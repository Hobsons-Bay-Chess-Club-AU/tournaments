import fs from 'fs';
import path from 'path';
import axios from 'axios';
//import puppeteer from 'puppeteer';
const rootDir = './www';




async function fetchAndWriteHtml(filePath , retry=1) {
    console.log("URL: ", filePath)

    var pathUrl = filePath.replace("www/", "")
    const pageUrl = `http://localhost:8080/${pathUrl}`
    try {
        console.log("url",pageUrl )
        const response = await axios.get(pageUrl);
        const htmlContent = response.data;
        
        const htmlFilePath = filePath.replace('.php', '.html');
        if(htmlContent.includes("This site requires Javascript to work")) 
        {
            if(retry < 3) {
                headers.Cookie = await getCookieFromUrl(pageUrl);
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
        
        if (concurrentCount >= 10) {
            await Promise.all(promises);
            promises.length = 0; // Clear the promises array
            concurrentCount = 0;
        }
    }
    
    await Promise.all(promises); // Handle remaining promises
}


(async () => {
    // headers.Cookie = await getCookieFromUrl("http://hbcc.byethost10.com")
    await traverseDirectory(rootDir);

})();