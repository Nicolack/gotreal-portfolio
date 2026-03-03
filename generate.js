const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Les chemins vers tes dossiers
const videosDir = path.join(__dirname, 'assets', 'videos');
const outputFile = path.join(__dirname, 'data', 'projects.json');

let projects = [];

// Vérifie si le dossier des vidéos existe
if (!fs.existsSync(videosDir)) {
    console.error("❌ ERREUR : Le dossier", videosDir, "n'existe pas !");
    process.exit(1);
}

console.log("🔍 Scan des vidéos en cours...\n");

// On lit les dossiers (catégories)
const categories = fs.readdirSync(videosDir);

categories.forEach(category => {
    const categoryPath = path.join(videosDir, category);
    
    // On vérifie que c'est bien un dossier (et pas un fichier caché .DS_Store par ex)
    if (fs.statSync(categoryPath).isDirectory()) {
        const files = fs.readdirSync(categoryPath);
        
        files.forEach(file => {
            // On ne prend que les MP4
            if (file.endsWith('.mp4')) {
                const id = file.replace('.mp4', ''); // Le nom sans l'extension
                const fullPath = path.join(categoryPath, file);
                
                // On cherche le rank (ex: [TOP1], [RAW]) dans le nom du fichier
                let rank = "RAW";
                const rankMatch = file.match(/\[(.*?)\]/);
                if (rankMatch) {
                    rank = rankMatch[1];
                }

                // 🎬 --- CALCUL DU VISUAL SCORE ---
                let visualScore = 0;
                try {
                    const probe = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=s=x:p=0 "${fullPath}"`).toString().trim();
                    const height = parseInt(probe);
                    
                    if (height >= 2160) visualScore = 4;      // 4K
                    else if (height >= 1440) visualScore = 3; // 2K
                    else if (height >= 1080) visualScore = 2; // 1080p
                    else if (height >= 720) visualScore = 1;  // 720p
                } catch (e) {
                    console.warn(`⚠️ ffprobe a échoué pour ${file}`);
                }

                projects.push({
                    id: id,
                    category: category,
                    rank: rank,
                    visualScore: visualScore
                });
                
                console.log(`📁 Trouvé : [${category}] -> ${file} (Score: ${visualScore})`);
            }
        });
    }
});

// On crée le dossier /data/ s'il n'existe pas encore
const dataDir = path.dirname(outputFile);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// On écrit le fichier JSON
fs.writeFileSync(outputFile, JSON.stringify(projects, null, 4));

console.log(`\n✅ SUCCÈS ! ${projects.length} vidéos ont été enregistrées dans ${outputFile}`);