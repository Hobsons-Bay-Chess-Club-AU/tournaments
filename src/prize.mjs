import {readPlayerList, readStanding} from './shared.mjs'
import fs from 'fs'

(async () => {

    const settings = {
        "Unrated": 1
    }
    
    const folderPath = "www/wwwC.J.SPurdyCupJuniors2024";

    const players = readPlayerList(folderPath);
    const { title, subTitle, standings } = readStanding(folderPath);
    
    console.log(standings)
    const combined = standings.map((el) => ({
        ...el,
        ...players.find(x =>x.N = el.N)
    }))
    fs.writeFileSync('player.json', JSON.stringify(players, null, 2))

    fs.writeFileSync('standings.json', JSON.stringify(standings, null, 2))

    fs.writeFileSync('combined.json', JSON.stringify(combined, null, 2))

    const rewards = ['Open', 'U12', 'U10', 'U8']

    for(const cat of rewards) {
        let catPlayers = combined.filter(x =>x.U === cat);
        if(cat === 'Unrated') {
            // find all unrated player
            const catPlayer = combined.filter(x =>x.Rtg === '0');
        }
        // allocate 1st prizes
        if(cat === 'Open') {
            combined[0].prizeCat = 'Open'
        }
        else {
            // find the top prize of that category and make it 
        }

        
    }


})();