let definedDate = 2020;
let selectedVariable = 'var_year';
let processedData = {};
let currentMode = 'max'; // Default mode is "Max"

// DOM elements for interaction
const variableSelect = document.getElementById('variableSelect');
const slider = document.getElementById('valueSlider');
const output = document.getElementById('selectedValue');
const modeButton = document.getElementById('modeButton');

// Initialize the displayed year
output.innerHTML = slider.value;

// Event listener for the slider
slider.oninput = function() {
    definedDate = this.value;
    output.innerHTML = definedDate;
    updateChart();
}

function updateSliderRange() {
    if (selectedVariable === 'var_year') {
        // For "Year", set the range to 1996 to 2024
        slider.min = 1996;
        slider.max = 2024;
        slider.value = definedDate; // Keep the current value
    } else if (selectedVariable === 'var_altitude') {
        // For "Altitude", set the range to the minimum and maximum altitude in the data
        const altitudes = infoData.map(d => +d.Altitude);
        const minAltitude = Math.min(...altitudes);
        const maxAltitude = Math.max(...altitudes);
        slider.min = minAltitude;
        slider.max = maxAltitude;
        slider.value = minAltitude;
    }
    output.innerHTML = slider.value; // Update the displayed value
}

// Event listener for the variable dropdown
variableSelect.onchange = function() {
    selectedVariable = this.value;
    updateChart();
    updateSliderRange();
}

// Event listener for the mode button
modeButton.onclick = function() {
    // Toggle between "Max" and "Average" modes
    currentMode = currentMode === 'max' ? 'average' : 'max';
    modeButton.textContent = currentMode.charAt(0).toUpperCase() + currentMode.slice(1); // Update button text
    updateChart(); // Update the chart based on the new mode
}

/**
 * Preprocesses the raw data from CSV files.
 * @param {Array} infoData - Data from the "info.csv" file.
 * @param {Array} nivoData - Data from the "nivo.csv" file.
 * @returns {Object} - Processed data mapped by year.
 */
function preprocessData(infoData, nivoData) {
    const yearlyDataMAX = {};
    const yearlyDataAVERAGE = {};

    // Aggregate data by year and station MAX and AVERAGE
    nivoData.forEach(d => {
        const year = d.date.slice(0, 4);
        // MAX
        if (!yearlyDataMAX[year]) {
            yearlyDataMAX[year] = {};
        }
        if (!yearlyDataMAX[year][d.numer_sta]) {
            yearlyDataMAX[year][d.numer_sta] = 0; 
        }
        if (+d.ht_neige > yearlyDataMAX[year][d.numer_sta]) {
            yearlyDataMAX[year][d.numer_sta] = +d.ht_neige;
        }
        // AVERAGE
        if (!yearlyDataAVERAGE[year]) {
            yearlyDataAVERAGE[year] = {};
        }
        if (!yearlyDataAVERAGE[year][d.numer_sta]) {
            yearlyDataAVERAGE[year][d.numer_sta] = { sum: 0, count: 0 };
        }
        yearlyDataAVERAGE[year][d.numer_sta].sum += +d.ht_neige;
        yearlyDataAVERAGE[year][d.numer_sta].count += 1;
    });

    // Calculate the average snow height for each station and year
    Object.keys(yearlyDataAVERAGE).forEach(year => {
        Object.keys(yearlyDataAVERAGE[year]).forEach(key => {
            yearlyDataAVERAGE[year][key] = yearlyDataAVERAGE[year][key].sum / yearlyDataAVERAGE[year][key].count;
        });
    });

    // Return the processed data based on the current mode
    if (currentMode === 'max') {
        return mapPreprocessData(yearlyDataMAX);
    } else {
        return mapPreprocessData(yearlyDataAVERAGE);
    }
}

function mapPreprocessData(yearlyData) {
    // Map the processed data to a format suitable for the chart
    const neigeDataMap = {};
    for (const year in yearlyData) {
        neigeDataMap[year] = infoData.map(d => ({
            Latitude: +d.Latitude,
            Longitude: +d.Longitude,
            Altitude: +d.Altitude,
            ht_neige: (yearlyData[year][d.ID] || 0) * scaleNeige,
            ID: d.ID,
            Nom: d.Nom
        })).filter(d => d.ht_neige !== 0);

        // Sort data by altitude for better visualization
        neigeDataMap[year].sort((a, b) => a.Altitude - b.Altitude);
    }

    return neigeDataMap;
}

/**
 * Updates the chart based on the selected year and variable.
 */
function updateChart() {
    processedData = preprocessData(infoData, nivoData); // Re-process data based on the current mode
    const neigeData = processedData[definedDate.toString()];

    // Prepare data for the stacked area chart
    const stackData = neigeData.map((d, i) => ({
        index: i,
        Altitude: d.Altitude,
        ht_neige: d.ht_neige,
        Latitude: d.Latitude,
        Longitude: d.Longitude,
        ID: d.ID,
        Nom: d.Nom
    }));

    createStackedAreaChart(stackData);
}

/**
 * Creates or updates the stacked area chart.
 * @param {Array} data - Processed data for the chart.
 */
function createStackedAreaChart(data) {
    // Clear any existing chart elements
    d3.select("#chart").selectAll("*").remove();

    // Define chart margins, width, and height
    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const width = Math.max(928, window.innerWidth - 40) - margin.left - margin.right; // Responsive width
    const height = 500 - margin.top - margin.bottom;

    // Create the SVG container
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add a tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Define x and y scales
    const x = d3.scaleLinear()
        .domain([0, data.length - 1])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Altitude + d.ht_neige)])
        .range([height, 0]);

    // Define color scale for the stacked layers
    const color = d3.scaleOrdinal()
        .domain(["Altitude", "ht_neige"])
        .range(["brown", "blue"]);

    // Create a stack generator
    const stack = d3.stack()
        .keys(["Altitude", "ht_neige"]);

    // Generate stacked data
    const series = stack(data);

    // Define the area generator
    const area = d3.area()
        .x((d, i) => x(i))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));

    // Draw the stacked area layers
    svg.selectAll(".layer")
        .data(series)
        .enter().append("path")
        .attr("class", "layer")
        .attr("fill", d => color(d.key))
        .attr("d", area)
        .on("mouseover", function(event, d) {
            const [mouseX, mouseY] = d3.pointer(event);
            const x0 = x.invert(mouseX);
            const i = Math.round(x0);
            const dataPoint = data[i];
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltip.html(`ID: ${dataPoint.ID}<br>Nom: ${dataPoint.Nom}<br>Altitude: ${dataPoint.Altitude}<br>ht_neige: ${dataPoint.ht_neige / scaleNeige}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(data.length));

    // Add y-axis
    svg.append("g")
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(d => d))
        .selectAll(".tick line").attr("stroke-opacity", 0.1);

    // Add a horizontal line at y=0
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("stroke", "black");
}

// Load and process data from CSV files
let infoData, nivoData;
Promise.all([
    d3.csv("info.csv"),
    d3.csv("nivo.csv")
]).then(([infoDataCSV, nivoDataSCV]) => {
    infoData = infoDataCSV;
    nivoData = nivoDataSCV;
    processedData = preprocessData(infoData, nivoData);
    updateChart(); // Initial chart display
    updateHeightmap();
}).catch(error => {
    console.error("Error loading CSV files:", error);
});

// Make the chart responsive
window.addEventListener("resize", updateChart);
window.addEventListener("resize", updateHeightmap);
