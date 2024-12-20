// Script pour afficher deux visualisations : hauteur de neige et température moyennes

// Chargement des données
let nivoData, infoData;
Promise.all([
    d3.csv("info.csv"),
    d3.csv("nivo.csv")
]).then(([infoDataCSV, nivoDataCSV]) => {
    infoData = infoDataCSV;
    nivoData = nivoDataCSV;
    const processedData = preprocessData(nivoData, infoData);
    console.log("Processed Data:", processedData); // Vérification des données traitées
    createSnowChart(processedData);
    createTemperatureChart(processedData);
    createMiniSnowChart(processedData);
    createMiniTemperatureChart(processedData);


}).catch(error => {
    console.error("Error loading CSV files:", error);
});

/**
 * Prépare les données pour les visualisations.
 */
function preprocessData(nivoData, infoData) {
    // Filtrer les données pour février et mars
    const filteredData = nivoData.filter(d => {
        const date = new Date(d.date.slice(0, 4), d.date.slice(4, 6) - 1); // Conversion correcte
        return [1, 2].includes(date.getMonth());
    });

    console.log("Filtered Data:", filteredData); // Vérifier les données après filtrage

    // Mapper les noms des stations
    const stationNames = Object.fromEntries(infoData.sort((a, b) => b.Altitude - a.Altitude).map(d => [d.ID, d.Nom]));

    console.log("Station Names:", stationNames); // Vérification du mapping des stations

    // Initialiser les données
    const processed = {};

    filteredData.forEach(d => {
        const year = +d.date.slice(0, 4);
        const station = String(d.numer_sta).trim();
        const snowHeight = parseFloat(d.ht_neige);
        const temperature = parseFloat(d.t);

        // Ignorer les valeurs "mq" ou non valides
        if (isNaN(snowHeight) || isNaN(temperature)) {
            return;
        }

        if (!processed[year]) processed[year] = {};
        if (!processed[year][station]) processed[year][station] = { snow: [], temp: [] };

        processed[year][station].snow.push(snowHeight);
        processed[year][station].temp.push(temperature);
    });

    // Calculer les moyennes
    Object.keys(processed).forEach(year => {
        Object.keys(processed[year]).forEach(station => {
            const data = processed[year][station];
            data.snow = d3.mean(data.snow);
            data.temp = d3.mean(data.temp);
        });
    });

    return { processed, stationNames };
}

/**
 * Crée le graphique pour les hauteurs de neige moyennes.
 */
function createSnowChart({ processed, stationNames }) {
    const margin = { top: 60, right: 30, bottom: 40, left: 100 };
    const width = 800 - margin.left - margin.right;
    const height = 1200 - margin.top - margin.bottom;

    const svg = d3.select("#snow-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const years = Object.keys(processed).map(d => +d);
    const stations = Object.keys(stationNames);

    const data = stations.map(station =>
        years.map(year => processed[year]?.[station]?.snow || -1)
    );

    const x = d3.scaleBand()
        .domain(years)
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleBand()
        .domain(stations.map(id => stationNames[id]))
        .range([0, height])
        .padding(0.1);

    // Trouver les valeurs min et max
    const flatData = data.flat();
    const nonNegativeData = flatData.filter(d => d >= 0); // Exclure les -1 pour le calcul du min
    const minSnow = d3.min(nonNegativeData);
    const maxSnow = d3.max(flatData);

    const color = d3.scaleLinear()
        .domain([minSnow, maxSnow])
        .range(["#ADD8E6", "#00008B"]);

    // Ajouter une légende sous forme de dégradé et case séparée pour "No Data"
    const legendWidth = 300;
    const legendHeight = 20;

    const legendGroup = svg.append("g")
        .attr("transform", `translate(${(width - legendWidth) / 2}, -50)`); // Centré au-dessus du graphique

    // Gradient pour les valeurs valides
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#ADD8E6");
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#00008B");

    legendGroup.append("rect")
        .attr("x", 50)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    // Ajouter une case pour "No Data"
    legendGroup.append("rect")
        .attr("x", 0)
        .attr("width", 40)
        .attr("height", legendHeight)
        .style("fill", "#A9A9A9");

    legendGroup.append("text")
        .attr("x", 20)
        .attr("y", legendHeight + 15)
        .attr("text-anchor", "middle")
        .text("No Data")
        .style("font-size", "10px");

    // Ajouter des annotations pour les valeurs min et max avec précision accrue
    const legendScale = d3.scaleLinear()
        .domain([minSnow, maxSnow])
        .range([50, legendWidth + 50]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5) // Augmenter le nombre de ticks
        .tickFormat(d => d.toFixed(2)); // Afficher deux décimales pour plus de précision

    legendGroup.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);

    // Dessiner les rectangles
    svg.selectAll("rect.snow")
        .data(data.flatMap((d, i) => d.map((value, j) => ({ year: years[j], station: stations[i], value }))))
        .enter()
        .append("rect")
        .attr("class", "snow")
        .attr("x", d => x(d.year))
        .attr("y", d => y(stationNames[d.station]))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => (d.value === -1 ? "#A9A9A9" : color(d.value)));

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
        .call(d3.axisLeft(y));
}





/**
 * Crée le graphique pour les températures moyennes.
 */
function createTemperatureChart({ processed, stationNames }) {
    const margin = { top: 60, right: 30, bottom: 40, left: 100 };
    const width = 800 - margin.left - margin.right;
    const height = 1200 - margin.top - margin.bottom;

    const svg = d3.select("#temperature-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const years = Object.keys(processed).map(d => +d);
    const stations = Object.keys(stationNames);

    const data = stations.map(station =>
        years.map(year => processed[year]?.[station]?.temp - 273.15 || -273) // Convertir K -> °C
    );

    const x = d3.scaleBand()
        .domain(years)
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleBand()
        .domain(stations.map(id => stationNames[id]))
        .range([0, height])
        .padding(0.1);

    // Trouver les valeurs min et max
    const flatData = data.flat();
    const validData = flatData.filter(d => d > -270); // Exclure les températures invalides
    const minTemp = d3.min(validData);
    const maxTemp = d3.max(validData);

    // Palette de couleurs : bleu pour les températures froides, blanc pour 0°C, rouge pour les températures chaudes
    const color = d3.scaleLinear()
        .domain([minTemp, 0, maxTemp]) // De min -> 0 -> max
        .range(["#0000FF", "#FFFFFF", "#FF0000"]);

    // Ajout de la légende
    const legendWidth = 300;
    const legendHeight = 20;

    const legendGroup = svg.append("g")
        .attr("transform", `translate(${(width - legendWidth) / 2}, -50)`); // Centré au-dessus du graphique

    // Dégradé pour la légende
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "legend-temp-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    // Définir les couleurs du dégradé (Bleu -> Blanc -> Rouge)
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#0000FF"); // Froid (bleu)
    gradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "#FFFFFF"); // Neutre (blanc)
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#FF0000"); // Chaud (rouge)

    // Case séparée pour "No Data"
    legendGroup.append("rect")
        .attr("x", 0)
        .attr("width", 40)
        .attr("height", legendHeight)
        .style("fill", "#A9A9A9");

    legendGroup.append("text")
        .attr("x", 20)
        .attr("y", legendHeight + 15)
        .attr("text-anchor", "middle")
        .text("No Data")
        .style("font-size", "10px");

    // Rectangle pour le dégradé
    legendGroup.append("rect")
        .attr("x", 50)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-temp-gradient)");

    // Étiquettes de la légende
    const legendScale = d3.scaleLinear()
        .domain([minTemp, maxTemp])
        .range([50, legendWidth + 50]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickValues([minTemp, 0, maxTemp]) // Étiquettes aux points clés
        .tickFormat(d3.format(".1f")); // Une décimale pour plus de précision

    legendGroup.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);

    // Dessiner les rectangles
    svg.selectAll("rect")
        .data(data.flatMap((d, i) => d.map((value, j) => ({ year: years[j], station: stations[i], value }))))
        .enter()
        .append("rect")
        .attr("x", d => x(d.year))
        .attr("y", d => y(stationNames[d.station]))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => (d.value <= -270 ? "#A9A9A9" : color(d.value))); // Gris pour -270°C

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
        .call(d3.axisLeft(y));
}



/**
 * Crée un graphique plus aplati afin de pouvoir le comparer avec celui des température sans avoir à scroller pour les hauteurs de neige moyennes.
 */
function createMiniSnowChart({ processed, stationNames }) {
    const margin = { top: 20, right: 30, bottom: 0, left: 100 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    

    const svg = d3.select("#mini-snow-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const years = Object.keys(processed).map(d => +d);
    const stations = Object.keys(stationNames);

    const data = stations.map(station =>
        years.map(year => processed[year]?.[station]?.snow || -1)
    );

    const x = d3.scaleBand()
        .domain(years)
        .range([0, width])
        .padding(0);

    const y = d3.scaleBand()
        .domain(stations.map(id => stationNames[id]))
        .range([0, height])
        .padding(0.1);

    // Trouver les valeurs min et max
    const flatData = data.flat();
    const nonNegativeData = flatData.filter(d => d >= 0); // Exclure les 0 pour le calcul du min
    const minSnow = d3.min(nonNegativeData);
    const maxSnow = d3.max(flatData);

    const color = d3.scaleLinear()
    .domain([-1, minSnow, maxSnow])
    .range(["#A9A9A9", "#ADD8E6", "#00008B"]);

    const legend = d3.legendColor()
    .scale(color)
    .title("Hauteur de neige (cm)");


    
    svg.selectAll("rect")
    .data(data.flatMap((d, i) => d.map((value, j) => ({ year: years[j], station: stations[i], value }))))
    .enter()
    .append("rect")
    .attr("x", d => x(d.year))
    .attr("y", d => y(stationNames[d.station])) // Vous pouvez ajuster cette ligne si nécessaire
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.value));


}

/**
 * Crée le graphique pour les températures moyennes.
 */
function createMiniTemperatureChart({ processed, stationNames }) {
    const margin = { top: 0, right: 30, bottom: 40, left: 100 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select("#mini-temperature-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const years = Object.keys(processed).map(d => +d);
    const stations = Object.keys(stationNames);

    const data = stations.map(station =>
        years.map(year => processed[year]?.[station]?.temp - 273.15 || -273) // Convertir K -> °C
    );

    console.log("Temperature Data:", data); // Vérification des données de température

    const x = d3.scaleBand()
        .domain(years)
        .range([0, width])
        .padding(0);

    const y = d3.scaleBand()
        .domain(stations.map(id => stationNames[id]))
        .range([0, height])
        .padding(0.1);

    // Trouver les valeurs min et max
    const flatData = data.flat();
    const validData = flatData.filter(d => d > -270); // Exclure les températures invalides
    const minTemp = d3.min(validData);
    const maxTemp = d3.max(validData);

    // Palette de couleurs : Bleu pour les températures basses, rouge pour les hautes
    const color = d3.scaleLinear()
        .domain([minTemp, 0, maxTemp]) // De min -> 0 -> max
        .range(["#0000FF", "#FFFFFF", "#FF0000"]);

    // Dessiner les rectangles
    svg.selectAll("rect")
        .data(data.flatMap((d, i) => d.map((value, j) => ({ year: years[j], station: stations[i], value }))))
        .enter()
        .append("rect")
        .attr("x", d => x(d.year))
        .attr("y", d => y(stationNames[d.station]))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => (d.value <= -270 ? "#A9A9A9" : color(d.value))); // Gris pour -270°C

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));
}
