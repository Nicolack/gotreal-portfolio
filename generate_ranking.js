const fs = require('fs');
const path = require('path');

// 1. Lire data/projects.json
const projectsJson = JSON.parse(fs.readFileSync('./data/projects.json', 'utf8'));

// 2. Extraire PROJECT_METADATA de js/main.js
const mainJsContent = fs.readFileSync('./js/main.js', 'utf8');
const metaMatch = mainJsContent.match(/const PROJECT_METADATA = (\{[\s\S]*?\});/);
if (!metaMatch) {
    console.error("Impossible de trouver PROJECT_METADATA dans main.js");
    process.exit(1);
}

// Nettoyage basique pour parser le JSON (attention aux virgules traînantes ou commentaires si presents)
// Ici on va utiliser une approche plus simple : eval() sur le bloc extrait pour avoir l'objet JS
let PROJECT_METADATA;
try {
    PROJECT_METADATA = eval('(' + metaMatch[1] + ')');
} catch (e) {
    console.error("Erreur lors du parsing de PROJECT_METADATA:", e);
    process.exit(1);
}

// 3. Simuler getProjects(data)
function getProjects(data) {
    const projectsMap = new Map();

    data.forEach(item => {
        let baseId = item.id.replace(/^\[.*?\]_/, '');
        baseId = baseId.replace(/_(\d+|main|NA|01|02|03|04|05|06|07|08|09|10|11)$/, '');

        if (!projectsMap.has(baseId)) {
            const meta = PROJECT_METADATA[baseId] || {};
            projectsMap.set(baseId, {
                id: baseId,
                category: item.category,
                rank: item.rank,
                displayTitle: meta.title || item.displayTitle || baseId.replace(/_/g, ' '),
                forcePosition: meta.forcePosition || null,
                visualScore: 0,
                files: []
            });
        }

        const proj = projectsMap.get(baseId);
        proj.files.push(item);

        if (!proj.mainFile || item.id.includes('_main')) {
            proj.mainFile = item;
            proj.visualScore = item.visualScore || 0;
        } else if (!proj.mainFile.id.includes('_main') && item.id.includes('_01')) {
            proj.mainFile = item;
            proj.visualScore = item.visualScore || 0;
        }

        if (item.rank && item.rank !== 'RAW') {
            if (!proj.rank || proj.rank === 'RAW') proj.rank = item.rank;
        }
    });

    return Array.from(projectsMap.values());
}

const allProjects = getProjects(projectsJson);

// 4. Filtrer Projets TOP et Trier
const topProjects = allProjects.filter(p => p.rank && p.rank.includes('TOP')).sort((a, b) => {
    const posA = a.forcePosition !== null ? a.forcePosition : 9999;
    const posB = b.forcePosition !== null ? b.forcePosition : 9999;
    
    if (posA !== posB) {
        return posA - posB;
    }
    
    const ra = parseInt((a.rank || "").match(/\d+/)) || 0;
    const rb = parseInt((b.rank || "").match(/\d+/)) || 0;
    
    const scoreA = (ra * 10) + (a.visualScore || 0);
    const scoreB = (rb * 10) + (b.visualScore || 0);
    
    return scoreB - scoreA;
});

// 5. Générer le Markdown
let md = `# 🏆 CLASSEMENT DES PROJETS (HOME)\n\n`;
md += `Ce fichier récapitule l'ordre d'apparition sur la page d'accueil basé sur le tri hybride.\n`;
md += `**Logique de tri** : \`ForcePosition\` (priorité) > \`Score Global\` (Rank * 10 + Qualité).\n\n`;
md += `| Position | Nom du Projet | ID | Score Global | Qualité | Rank | Force Pos |\n`;
md += `|----------|---------------|----|--------------|---------|------|-----------|\n`;

topProjects.forEach((p, index) => {
    const ra = parseInt((p.rank || "").match(/\d+/)) || 0;
    const globalScore = (ra * 10) + (p.visualScore || 0);
    const force = p.forcePosition !== null ? `**${p.forcePosition}**` : "-";
    md += `| ${index + 1} | ${p.displayTitle} | \`${p.id}\` | **${globalScore}** | ${p.visualScore} pts | ${p.rank} | ${force} |\n`;
});

md += `\n---\n\n### 📽️ TOUTES LES VIDÉOS SCANNEÉES (Par catégorie)\n\n`;

const categories = [...new Set(projectsJson.map(p => p.category))];
categories.forEach(cat => {
    md += `#### 📁 ${cat}\n`;
    const catFiles = projectsJson.filter(p => p.category === cat);
    catFiles.forEach(f => {
        md += `- [\`${f.rank}\`] ${f.id} (Qualité: ${f.visualScore} pts)\n`;
    });
    md += `\n`;
});

fs.writeFileSync('ranking.md', md);
console.log("✅ ranking.md généré avec succès !");
