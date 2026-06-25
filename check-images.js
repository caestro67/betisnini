const titles = [
  'Joaquín Sánchez',
  'Rubén Castro',
  'Rafael Gordillo',
  'Denílson de Oliveira',
  'Alfonso Pérez',
  'Finidi George',
  'Nabil Fekir',
  'Sergio Canales',
  'Marc Bartra',
  'Héctor Bellerín',
  'Borja Iglesias',
  'Juan Gutiérrez Moreno',
  'Jesús Capitán',
  'Luís Eduardo Schmidt',
  'Ricardo Oliveira',
  'Marcos Assunção',
  'Aïssa Mandi',
  'Fabián Ruiz',
  'Dani Ceballos',
  'Isco'
];

async function checkImages() {
  for (const title of titles) {
    const url = `https://es.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    if (pages[pageId].thumbnail) {
      console.log(`[OK] ${title}: ${pages[pageId].thumbnail.source}`);
    } else {
      console.log(`[MISSING] ${title}`);
    }
  }
}

checkImages();
