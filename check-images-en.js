const titles = [
  'Joaquín (footballer, born 1981)',
  'Rubén Castro',
  'Rafael Gordillo',
  'Denílson (footballer, born 1977)',
  'Alfonso Pérez',
  'Finidi George',
  'Nabil Fekir',
  'Sergio Canales',
  'Marc Bartra',
  'Héctor Bellerín',
  'Borja Iglesias',
  'Juanito (footballer, born 1976)',
  'Capi (footballer, born 1977)',
  'Edu (footballer, born 1979)',
  'Ricardo Oliveira',
  'Marcos Assunção',
  'Aïssa Mandi',
  'Fabián Ruiz',
  'Dani Ceballos',
  'Isco'
];

async function checkImages() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const valid = [];
  for (const title of titles) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      const pages = data.query.pages;
      const pageId = Object.keys(pages)[0];
      if (pages[pageId].thumbnail) {
        console.log(`[OK] ${title}`);
        valid.push({ title, image: pages[pageId].thumbnail.source });
      } else {
        console.log(`[MISSING] ${title}`);
      }
    } catch (e) {
      console.log(`[ERROR] ${title}`);
    }
    await sleep(200);
  }
  
  const fs = require('fs');
  fs.writeFileSync('betis-players.json', JSON.stringify(valid, null, 2));
}

checkImages();
