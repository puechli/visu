// Global variables to store state and processed data
let scaleNeige = 100;
let sliderValue = 2020;
let selectedVariable = 'var_year';
let processedData = {};
let processedNeigeDataMax = {};
let processedNeigeDataAverage = {};
let currentMode = 'max'; // Default mode is "Max"
let currentPrecision = 'month'; // Default precision is "month"

// DOM elements for interaction
const variableSelect = document.getElementById('variableSelect');
const slider = document.getElementById('valueSlider');
const output = document.getElementById('selectedValue');
const modeButton = document.getElementById('modeButton');
const precisionButton = document.getElementById('precisionButton');

// Initialize the displayed year
output.innerHTML = slider.value;

// Event listener for the slider
slider.oninput = function() {
    sliderValue = this.value;

    if (selectedVariable === 'var_year') {
        output.innerHTML = sliderValue;
    } else {
        const lowerBound = parseInt(sliderValue, 10) - 50;
        const upperBound = parseInt(sliderValue, 10) + 50;
        output.innerHTML = `${lowerBound} - ${upperBound}`;   
    }
    updateChart();
    updateHeightmap();
}

function updateSliderRange() {
    if (selectedVariable === 'var_year') {
        // For "Year", set the range to 1996 to 2024
        slider.min = 1996;
        slider.max = 2024;
        slider.setAttribute('step', 1); // Set the step attribute
        slider.value = sliderValue; // Keep the current value
        output.innerHTML = sliderValue;
    } else if (selectedVariable === 'var_altitude') {
        // For "Altitude", set the range to the minimum and maximum altitude in the data
        const altitudes = infoData.map(d => +d.Altitude);
        const minAltitude = Math.min(...altitudes);
        const maxAltitude = Math.max(...altitudes);
        slider.min = minAltitude;
        slider.max = maxAltitude;                
        slider.value = slider.min;
        sliderValue = slider.value;
        console.log('sliderValue: ', sliderValue);
        slider.setAttribute('step', 50); // Set the step attribute
        const lowerBound = parseInt(sliderValue, 10) - 50;
        const upperBound = parseInt(sliderValue, 10) + 50;
        output.innerHTML = `${lowerBound} - ${upperBound}`;   
    }
}

// Event listener for the variable dropdown
variableSelect.onchange = function() {
    selectedVariable = this.value;
    sliderValue = 1996; // Reset the defined date
    console.log('variable change: ', selectedVariable)
    // Show or hide the precision button based on the selected variable
    if (selectedVariable === 'var_altitude') {
        console.log("inside if")
        precisionButton.style.display = 'inline-block';
    } else {
        precisionButton.style.display = 'none';
    }
    updateSliderRange();
    updateChart();
    updateHeightmap();
}

// Event listener for the mode button
modeButton.onclick = function() {
    // Toggle between "Max" and "Average" modes
    currentMode = currentMode === 'max' ? 'average' : 'max';
    modeButton.textContent = currentMode.charAt(0).toUpperCase() + currentMode.slice(1); // Update button text
    updateChart(); // Update the chart based on the new mode
    updateHeightmap();
}

// Event listener for the precision button
precisionButton.onclick = function() {
    // Cycle through precision options: day, week, month, year
    const precisionOptions = ['day', 'week', 'month', 'year'];
    const currentIndex = precisionOptions.indexOf(currentPrecision);
    currentPrecision = precisionOptions[(currentIndex + 1) % precisionOptions.length];
    precisionButton.textContent = `Precision: ${currentPrecision.charAt(0).toUpperCase() + currentPrecision.slice(1)}`;
    updateChart(); // Update the chart based on the new precision
}

/**
 * Preprocesses the raw data from CSV files.
 * @param {Array} infoData - Data from the "info.csv" file.
 * @param {Array} nivoData - Data from the "nivo.csv" file.
 * @returns {Object} - Processed data mapped by year.
 */
function preprocessData(infoData, nivoData) {
    const infoMap = {};
    infoData.forEach(d => {
        infoMap[d.ID] = {
            Latitude: +d.Latitude,
            Longitude: +d.Longitude,
            Altitude: +d.Altitude,
            Nom: d.Nom
        };
    });

    processedAltitudeData = nivoData.filter(d => d.ht_neige !== 'mq').map(d => ({
        numer_sta: d.numer_sta,
        date: new Date(+d.date.slice(0, 4), +d.date.slice(4, 6) - 1, +d.date.slice(6, 8)),
        ht_neige: +d.ht_neige,
        Altitude: infoMap[d.numer_sta]?.Altitude || null
    })).filter(d => d.Altitude !== null);

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

    processedNeigeDataMax = mapPreprocessData(yearlyDataMAX);
    processedNeigeDataAverage = mapPreprocessData(yearlyDataAVERAGE);
    // Return the processed data based on the current mode
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
    console.log('selectedVariable: ', selectedVariable, 'bool: ', selectedVariable === 'var_year');

    if(selectedVariable === 'var_year'){
        if (currentMode === 'max') {
            processedData = processedNeigeDataMax;
        } else {
            processedData = processedNeigeDataAverage;
        }
        const neigeData = processedData[sliderValue.toString()];
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

        createStackedAreaChartYear(stackData);
    } else{
        console.log('sliderValue: ', sliderValue);
        const mappedData = mapPreprocessedData(processedAltitudeData, sliderValue);
        createStackedAreaChartAltitude(mappedData);
    }

}
function mapPreprocessedData(processedData, altitude) {
    const filteredData = processedData.filter(d => Math.abs(d.Altitude - altitude) <= 50);

    let timeInterval;
    switch (currentPrecision) {
        case 'day':
            timeInterval = d3.timeDay;
            break;
        case 'week':
            timeInterval = d3.timeWeek;
            break;
        case 'month':
            timeInterval = d3.timeMonth;
            break;
        case 'year':
            timeInterval = d3.timeYear;
            break;
        default:
            timeInterval = d3.timeMonth;
    }

    const monthlyData = d3.rollups(
    filteredData,
    v => currentMode === 'average' ? d3.mean(v, d => d.ht_neige) : d3.max(v, d => d.ht_neige),
    d => timeInterval(d.date)
    ).map(([month, ht_neige]) => ({ month, ht_neige }));

    return monthlyData;
}
/**
 * Creates or updates the stacked area chart.
 * @param {Array} data - Processed data for the chart.
 */
function createStackedAreaChartYear(data) {
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

    // Add y-axis label
    svg.append("text")
        .attr("x", -height / 2) // Center the label vertically
        .attr("y", -margin.left + 20) // Position it to the left of the y-axis
        .attr("transform", "rotate(-90)") // Rotate the label 90 degrees
        .attr("text-anchor", "middle") // Center-align the text
        .style("font-size", "12px") // Set font size
        .style("font-weight", "bold") // Make it bold
        .text("Altitude (m)"); // Label text
}

function calculateLinearRegression(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    data.forEach(d => {
        const x = d.month.getTime(); // Convert date to timestamp
        const y = d.ht_neige;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}
function generateTrendLine(data, xScale, yScale) {
    const { slope, intercept } = calculateLinearRegression(data);

    // Define the line generator
    const trendLine = d3.line()
        .x(d => xScale(d.month))
        .y(d => yScale(slope * d.month.getTime() + intercept));

    // Return the trend line path
    return trendLine(data);
}

function createStackedAreaChartAltitude(monthlyData) {
    console.log('createStackedAreaChart Altitude');
    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const width = Math.max(928, window.innerWidth - 40) - margin.left - margin.right; // Responsive width
    const height = 500 - margin.top - margin.bottom;

    d3.select("#chart").selectAll("*").remove(); // Clear existing chart

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
        .domain(d3.extent(monthlyData, d => d.month))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(monthlyData, d => d.ht_neige)]) // Fixed y-axis range
        .nice()
        .range([height, 0]);

    const area = d3.area()
        .x(d => x(d.month))
        .y0(height)
        .y1(d => y(d.ht_neige));

    // Add a tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Draw the stacked area layers
    svg.append("path")
        .datum(monthlyData)
        .attr("fill", "steelblue")
        .attr("d", area)
        .on("mouseover", function(event, d) {
            const [mouseX, mouseY] = d3.pointer(event);
            const x0 = x.invert(mouseX);
            const bisect = d3.bisector(d => d.month).left;
            const index = bisect(monthlyData, x0, 1);
            const dataPoint = monthlyData[index];
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltip.html(`Month: ${d3.timeFormat("%Y-%m")(dataPoint.month)}<br>ht_neige: ${dataPoint.ht_neige}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Add x-axis with years only
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .ticks(d3.timeYear.every(1)) // Show only years
            .tickFormat(d3.timeFormat("%Y")) // Format as years
        );

    // Add y-axis
    svg.append("g")
        .call(d3.axisLeft(y));

    // Add the trend line
    const trendLinePath = generateTrendLine(monthlyData, x, y);
    svg.append("path")
        .attr("d", trendLinePath)
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("class", "trend-line");

    
    // Add x-axis label
    svg.append("text")
        .attr("x", width / 2) // Center the label horizontally
        .attr("y", height + margin.bottom - 5) // Position it below the x-axis
        .attr("text-anchor", "middle") // Center-align the text
        .style("font-size", "12px") // Set font size
        .style("font-weight", "bold") // Make it bold
        .text("Year"); // Label text

    // Add y-axis label
    svg.append("text")
        .attr("x", -height / 2) // Center the label vertically
        .attr("y", -margin.left + 20) // Position it to the left of the y-axis
        .attr("transform", "rotate(-90)") // Rotate the label 90 degrees
        .attr("text-anchor", "middle") // Center-align the text
        .style("font-size", "12px") // Set font size
        .style("font-weight", "bold") // Make it bold
        .text("Snow Height (m)"); // Label text
}

// Load and process data from CSV files
let processedAltitudeData = {};
variableSelect.value = 'var_year';

Promise.all([
    d3.csv("info.csv"),
    d3.csv("nivo.csv")
]).then(([infoDataCSV, nivoDataSCV]) => {
    infoData = infoDataCSV;
    nivoData = nivoDataSCV;
    preprocessData(infoData, nivoData);
    updateChart(); // Initial chart display
    populateStationDropdown(infoData);
}).catch(error => {
    console.error("Error loading CSV files:", error);
});

// Make the chart responsive
window.addEventListener("resize", updateChart);

// Global variables to store state and processed data for the time series chart
let infoDataTimeSeries, nivoDataTimeSeries;

// Populate the station dropdown with available stations
function populateStationDropdown(infoData) {
    const stationSelect = document.getElementById('stationSelect');
    stationSelect.innerHTML = ''; // Clear existing options

    // Add a default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a Station';
    stationSelect.appendChild(defaultOption);

    // Add station options
    infoData.forEach(d => {
        const option = document.createElement('option');
        option.value = d.ID;
        option.textContent = `${d.Nom} (ID: ${d.ID})`;
        stationSelect.appendChild(option);
    });
}

// Event listener for the station dropdown
document.getElementById('stationSelect').onchange = function() {
    const selectedStation = this.value;
    if (selectedStation) {
        const stationData = nivoData
            .filter(d => d.numer_sta === selectedStation && d.ht_neige !== 'mq') // Filter out missing data
            .map(d => ({
                ...d,
                date: new Date(d.date.slice(0, 4), d.date.slice(4, 6) - 1, d.date.slice(6, 8), d.date.slice(8, 10), d.date.slice(10, 12)) // Convert date to Date object
            }));

        createTimeSeriesChart(stationData);
    }
};

// Function to calculate linear regression (trend line)
function calculateLinearRegression(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    data.forEach(d => {
        const x = d.date.getTime(); // Convert date to timestamp
        const y = +d.ht_neige;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}

// Function to generate the trend line
function generateTrendLine(data, xScale, yScale) {
    const { slope, intercept } = calculateLinearRegression(data);

    // Define the line generator
    const trendLine = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(slope * d.date.getTime() + intercept));

    // Return the trend line path
    return trendLine(data);
}

function createTimeSeriesChart(stationData) {
    // Clear any existing chart elements
    d3.select("#timeSeriesChart").selectAll("*").remove();

    // Define chart margins, width, and height
    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const width = Math.max(928, window.innerWidth - 40) - margin.left - margin.right; // Responsive width
    const height = 400 - margin.top - margin.bottom;

    // Create the SVG container
    const svg = d3.select("#timeSeriesChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + 2*margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add a tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Define x and y scales
    const x = d3.scaleTime()
        .domain(d3.extent(stationData, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(stationData, d => +d.ht_neige)])
        .nice()
        .range([height, 0]);

    // Define the line generator
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(+d.ht_neige));

    // Draw the line
    svg.append("path")
        .datum(stationData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line)
        .on("mouseover", function(event, d) {
            const [mouseX, mouseY] = d3.pointer(event);
            const x0 = x.invert(mouseX);
            const bisect = d3.bisector(d => d.date).left;
            const index = bisect(stationData, x0, 1);
            const dataPoint = stationData[index];
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltip.html(`Date: ${d3.timeFormat("%Y-%m-%d %H:%M")(dataPoint.date)}<br>ht_neige: ${dataPoint.ht_neige}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Add the trend line
    const trendLinePath = generateTrendLine(stationData, x, y);
    svg.append("path")
        .attr("d", trendLinePath)
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("class", "trend-line");

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y-%m-%d")))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    // Add y-axis
    svg.append("g")
        .call(d3.axisLeft(y));

    // Add a title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")

    svg.append("text")
        .attr("x", width / 2) // Center the label horizontally
        .attr("y", height + 1.8*margin.bottom - 5) // Position it below the x-axis
        .attr("text-anchor", "middle") // Center-align the text
        .style("font-size", "12px") // Set font size
        .style("font-weight", "bold") // Make it bold
        .text("Date"); // Label text

    // Add y-axis label
    svg.append("text")
        .attr("x", -height / 2) // Center the label vertically
        .attr("y", -margin.left + 20) // Position it to the left of the y-axis
        .attr("transform", "rotate(-90)") // Rotate the label 90 degrees
        .attr("text-anchor", "middle") // Center-align the text
        .style("font-size", "12px") // Set font size
        .style("font-weight", "bold") // Make it bold
        .text("Snow Height (m)"); // Label text
}
