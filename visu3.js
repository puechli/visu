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
    const margin = { top: 20, right: 30, bottom: 40, left: 100 };
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

    console.log("Snow Data:", data); // Vérification des données de neige

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
        .attr("y", d => y(stationNames[d.station]))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.value));

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("g")
    .attr("transform", "translate(20,20)") // Position de la légende
    .call(legend);
}

/**
 * Crée le graphique pour les températures moyennes.
 */
function createTemperatureChart({ processed, stationNames }) {
    const margin = { top: 20, right: 30, bottom: 40, left: 100 };
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
        years.map(year => processed[year]?.[station]?.temp-273.15 || -273)
    );

    console.log("Temperature Data:", data); // Vérification des données de température

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
    const nonNegativeData = flatData.filter(d => d >= -270); // Exclure les 0 pour le calcul du min
    const minTemp = d3.min(nonNegativeData);
    const maxTemp = d3.max(flatData);

    const color = d3.scaleLinear()
        .domain([-273, minTemp, maxTemp])
        .range(["#A9A9A9", "#FFFF00", "#FF0000"]);

    svg.selectAll("rect")
        .data(data.flatMap((d, i) => d.map((value, j) => ({ year: years[j], station: stations[i], value }))))
        .enter()
        .append("rect")
        .attr("x", d => x(d.year))
        .attr("y", d => y(stationNames[d.station]))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.value));

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
        .call(d3.axisLeft(y));
}
