/**
 * Preprocesses the raw data from CSV files.
 * @param {Array} infoData - Data from the "info.csv" file.
 * @param {Array} nivoData - Data from the "nivo.csv" file.
 * @returns {Object} - Processed data mapped by year.
 */
function azerbaidjan(infoData, nivoData) {
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
        return kirghizistan(yearlyDataMAX);
    } else {
        return kirghizistan(yearlyDataAVERAGE);
    }
}

function kirghizistan(yearlyData) {
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
 * Updates the heightmap based on the selected year
 */
function updateHeightmap() {
    jordanie = azerbaidjan(infoData, nivoData);
    const neigeData = jordanie[sliderValue.toString()]

    // Prepare data for the stacked area heightmap
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

    createHeightmap(stackData);
}

/**
 * Creates or updates the heightmap
 * @param {array} data - Processed data for the heightmap.
 */
function createHeightmap(data) {
    // Clear any existing elements
    d3.select('#alpes').selectAll("*").remove();
    d3.select('#pyren').selectAll("*").remove();

    // Define chart margins, width and height
    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const width = Math.max(928, window.innerWidth - 40) - margin.left - margin.right; // Responsive width
    const height = 500 - margin.top - margin.bottom;

    // Define the color sequence from light green to gray
    const z_colors = [
        "#28fa14", // Light green
        "#909e8f", // Regular gray
    ];

    // Define the color sequence from light light gray to white
    const s_colors = [
        "#EEEEEE", // Light light gray
        "#FFFFFF", // White
        "#DDEEFF" // Light blue
    ];

    // Create data points
    const points = data.map(d => ({
        x: d.Longitude,
        y: d.Latitude,
        z: d.Altitude,
        s: d.ht_neige,
        n: d.Nom
    }));

    const alpes_points = points.filter(p => p.x > 5.0);
    const pyren_points = points.filter(p => p.x < 2.5);

    // Create border points to each area
    const x_e = 0.38;
    const y_e = 0.13;

    const alpes_border = [
        { x : d3.min(alpes_points, d => d.x) - x_e , y : d3.min(alpes_points, d => d.y) - y_e , z : 60.0 , s : 0.0 } , // sw
        { x : d3.max(alpes_points, d => d.x) + x_e , y : d3.min(alpes_points, d => d.y) - y_e , z : 60.0 , s : 0.0 } , // se
        { x : d3.min(alpes_points, d => d.x) - x_e , y : d3.max(alpes_points, d => d.y) + y_e , z : 60.0 , s : 0.0 } , // nw
        { x : d3.max(alpes_points, d => d.x) + x_e , y : d3.max(alpes_points, d => d.y) + y_e , z : 60.0 , s : 0.0 }   // ne
    ];

    const pyren_border = [
        { x : d3.min(pyren_points, d => d.x) - x_e , y : d3.min(pyren_points, d => d.y) - y_e , z : 60.0 , s : 0.0 } , // sw
        { x : d3.max(pyren_points, d => d.x) + x_e , y : d3.min(pyren_points, d => d.y) - y_e , z : 60.0 , s : 0.0 } , // se
        { x : d3.min(pyren_points, d => d.x) - x_e , y : d3.max(pyren_points, d => d.y) + y_e , z : 60.0 , s : 0.0 } , // nw
        { x : d3.max(pyren_points, d => d.x) + x_e , y : d3.max(pyren_points, d => d.y) + y_e , z : 60.0 , s : 0.0 }   // ne
    ];

    // Divide each border (not yet implemented)
    const x_d = 8;
    const y_d = 3;

    // Add those points
    alpes_border.forEach(p => alpes_points.push(p));
    pyren_border.forEach(p => pyren_points.push(p));

    // Define x and y scales and create scaled points
    const alpes_x = d3.scaleLinear()
        .domain([d3.min(alpes_points, d => d.x), d3.max(alpes_points, d => d.x)])
        .range([0, width]);

    const alpes_y = d3.scaleLinear()
        .domain([d3.min(alpes_points, d => d.y), d3.max(alpes_points, d => d.y)])
        .range([height, 0]);
    
    const pyren_x = d3.scaleLinear()
        .domain([d3.min(pyren_points, d => d.x), d3.max(pyren_points, d => d.x)])
        .range([0, width]);

    const pyren_y = d3.scaleLinear()
        .domain([d3.min(pyren_points, d => d.y), d3.max(pyren_points, d => d.y)])
        .range([height, 0]);
    
    const alpes_scaledpoints = alpes_points.map(d => ({
        x: alpes_x(d.x), y: alpes_y(d.y),
        z: d.z, s: d.s, n: d.n
    }));
    
    const pyren_scaledpoints = pyren_points.map(d => ({
        x: pyren_x(d.x), y: pyren_y(d.y),
        z: d.z, s: d.s, n: d.n
    }));

    // Create Voronoi Diagram
    const alpes_delaunay = d3.Delaunay.from(alpes_points, p => alpes_x(p.x), p => alpes_y(p.y));
    const alpes_voronoi  = alpes_delaunay.voronoi([0, 0, width, height]);
    
    const pyren_delaunay = d3.Delaunay.from(pyren_points, p => pyren_x(p.x), p => pyren_y(p.y));
    const pyren_voronoi  = pyren_delaunay.voronoi([0, 0, width, height]);

    // Create color scale for altitude (z) and snow height (s)
    const z_colorScale = d3.scaleSequential()
        .domain([d3.min(points, p => p.z), d3.max(points, p => p.z)])
        .range([0, z_colors.length - 1]);
    
    const s_colorScale = d3.scaleSequential()
        .domain([d3.min(points, p => p.s), d3.max(points, p => p.s)])
        .range([0, s_colors.length - 1]);
    
    // Function to find the interpolation color
    function interpolateColor(t, c) {
        const index = Math.floor(t);
        const fraction = t - index;
        let start = index < c.length ? c[index] : c[c.length - 1];
        let end = index + 1 < c.length ? c[index + 1] : c[c.length - 1];
        return d3.interpolateRgb(start, end)(fraction);
    }

    // Create the SVG containers
    const svgAlpes = d3.select("#alpes")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("style", "border: 2px solid black;")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const svgPyren = d3.select("#pyren")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("style", "border: 2px solid black;")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Draw Voronoi diagram for the Alpes
    svgAlpes.selectAll('path')
        .data(alpes_voronoi.cellPolygons())
        .join('path')
        .attr("d", (d, i) => !d ? null : `M${d.join("L")}Z`)
        .attr("fill", (d, i) => d ? interpolateColor(s_colorScale(alpes_points[i].s), s_colors) : null)
        .attr("class", "polygon");
    
    svgAlpes.selectAll('circle')
        .data(alpes_scaledpoints)
        .enter()
        .append('circle')
        .attr('cx', p => p.x)
        .attr('cy', p => p.y)
        .attr('r', 3)
        .attr('fill', 'black')
        .on("mouseover", function(event, d) {
            const tooltip = d3.select(".tooltip");
            tooltip.style("display", "block")
                .html(`<strong>${d.n}</strong><br>Hauteur de neige: ${d.s} cm`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(".tooltip").style("display", "none");
        })
        .attr("class", "point");
    
    svgAlpes.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', 1);

    const alpes_title_margin = 30;
    const alpes_title = svgAlpes.append('text')
        .attr('x', width / 2)
        .attr('y', height + alpes_title_margin)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text('Voronoi de la région des Alpes');
    
    svgAlpes.attr('height', height + alpes_title_margin * 2);
    
    // Draw Voronoi diagram for the Pyrénées
    svgPyren.selectAll('path')
        .data(pyren_voronoi.cellPolygons())
        .join('path')
        .attr("d", (d, i) => !d ? null : `M${d.join("L")}Z`)
        .attr("fill", (d, i) => d ? interpolateColor(s_colorScale(pyren_points[i].s), s_colors) : null)
        .attr("class", "polygon");
    
    svgPyren.selectAll('circle')
        .data(pyren_scaledpoints)
        .enter()
        .append('circle')
        .attr('cx', p => p.x)
        .attr('cy', p => p.y)
        .attr('r', 3)
        .attr('fill', 'black')
        .on("mouseover", function(event, d) {
            const tooltip = d3.select(".tooltip");
            tooltip.style("display", "block")
                .html(`<strong>${d.n}</strong><br>Hauteur de neige: ${d.s} cm`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(".tooltip").style("display", "none");
        })
        .attr("class", "point");
    
    svgPyren.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', 1);

    const pyren_title_margin = 30;
    const pyren_title = svgPyren.append('text')
        .attr('x', width / 2)
        .attr('y', height + pyren_title_margin)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text('Voronoi de la région des Pyrénées');
    
    svgPyren.attr('height', height + pyren_title_margin * 2);
}

// Load and process data from CSV files
let infoData, nivoData;
Promise.all([
    d3.csv("info.csv"),
    d3.csv("nivo.csv")
]).then(([infoDataCSV, nivoDataSCV]) => {
    infoData = infoDataCSV;
    nivoData = nivoDataSCV;
    jordanie = azerbaidjan(infoData, nivoData);
    updateHeightmap();
}).catch(error => {
    console.error("Error loading CSV files:", error);
});

// Make the chart responsive
window.addEventListener("resize", updateHeightmap);
