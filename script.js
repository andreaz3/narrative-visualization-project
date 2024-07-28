let currentSlide = 0;
const slides = [
    "slide-introduction",
    "slide-2013",
    "slide-2018",
    "slide-2023",
    "slide-conclusion"
];
const yearSlides = {
    1: 2013,
    2: 2018,
    3: 2023
};

function showSlide(index) {
    slides.forEach((slide, i) => {
        d3.select(`#${slide}`).classed("active-slide", i === index);
    });
    d3.select("#back-button").style("visibility", index === 0 ? "hidden" : "visible");
    d3.select("#next-button").style("visibility", index === slides.length - 1 ? "hidden" : "visible");

    if (index in yearSlides) {
        loadData(yearSlides[index], `chart-container-${yearSlides[index]}`, `comparison-college-${yearSlides[index]}`, `annotations-${yearSlides[index]}`);
    } else if (index === slides.length - 1) {
        loadSummaryData();
    }
}


function previousSlide() {
    if (currentSlide > 0) {
        currentSlide--;
        showSlide(currentSlide);
    }
}

function nextSlide() {
    if (currentSlide < slides.length - 1) {
        currentSlide++;
        showSlide(currentSlide);
    }
}

function loadData(year, chartContainerId, comparisonDropdownId, annotationsId) {
    d3.csv("CleanedCombinedSummaryUndergrad.csv").then(data => {
        const filteredData = data.filter(d => +d.Term === year);

        const colleges = [...new Set(filteredData.map(d => d["College Name"]))];

        const comparisonDropdown = d3.select(`#${comparisonDropdownId}`);
        if (comparisonDropdown.selectAll("option").empty()) {
            colleges.forEach(college => {
                if (college !== "Engineering") {
                    comparisonDropdown.append("option").text(college).attr("value", college);
                }
            });

            comparisonDropdown.on("change", function() {
                updateCharts(filteredData, this.value, chartContainerId, annotationsId, year);
            });
        }

        const selectedCollege = comparisonDropdown.node().value;
        updateCharts(filteredData, selectedCollege, chartContainerId, annotationsId, year);
    });
}

function updateCharts(data, comparisonCollege, chartContainerId, annotationsId, year) {
    d3.select(`#${chartContainerId}`).selectAll("*").remove();

    const collegesToDisplay = ["Engineering", comparisonCollege];

    collegesToDisplay.forEach(college => {
        const collegeData = data.filter(d => d["College Name"] === college);

        const genderData = prepareGenderData(collegeData);
        const racialData = prepareRacialData(collegeData);

        const formattedCollege = college.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');

        const collegeSection = d3.select(`#${chartContainerId}`).append("div").attr("class", "college-section");

        collegeSection.append("h2").text(college);

        collegeSection.append("div").attr("id", `gender-chart-${formattedCollege}-${year}`).attr("class", "chart");
        collegeSection.append("div").attr("id", `racial-chart-${formattedCollege}-${year}`).attr("class", "chart");
        updateChart(`#gender-chart-${formattedCollege}-${year}`, genderData, `Gender Breakdown - ${college}`);
        updateChart(`#racial-chart-${formattedCollege}-${year}`, racialData, `Racial Breakdown - ${college}`);
    });

    updateAnnotations(year, annotationsId);
}

function prepareGenderData(data) {
    const genders = [
        "Men","Women","Unknown"
    ];
    return genders.map(gender => {
        return {
            label: gender,
            value: d3.sum(data, d => +d[gender] || 0)
        };
    });
}

function prepareRacialData(data) {
    const races = [
        "Caucasian","Asian American","African American","Hispanic","Native American",
        "Hawaiian/Pacific Isl","Multiracial","International","Unknown.1"
    ];
    return races.map(race => {
        return {
            label: race,
            value: d3.sum(data, d => +d[race] || 0)
        };
    });
}

function updateChart(containerId, data, title) {
    
    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 3;
    const color = d3.scaleOrdinal(d3.schemePastel1);

    const svg = d3.select(containerId)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    svg.append("text")
        .attr("x", 0)
        .attr("y", -height / 2 + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(title);

    const pie = d3.pie()
        .value(d => d.value)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    const path = svg.selectAll("path")
        .data(pie(data))
        .enter().append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.label))
        .on("mouseover", function(event, d) {
            d3.select("#tooltip")
                .style("visibility", "visible")
                .html(`${d.data.label}: ${d.data.value} (${Math.round(d.data.value / d3.sum(data, d => d.value) * 100)}%)`)
                .style("left", `${event.pageX + 5}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mousemove", function(event) {
            d3.select("#tooltip")
                .style("left", `${event.pageX + 5}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", function() {
            d3.select("#tooltip").style("visibility", "hidden");
        });

    svg.append("g")
        .attr("text-anchor", "middle")
        .selectAll()
        .data(pie(data))
        .join("text")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .call(text => text.append("tspan")
            .attr("y", "-0.4em")
            .attr("font-weight", "bold")
            .text(d => d.data.name))
        .call(text => text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
            .attr("x", 0)
            .attr("y", "0.7em")
            .attr("fill-opacity", 0.7)
            .text(d => d.data.label));
}

function updateAnnotations(year, annotationsId) {
    d3.csv("CleanedCombinedSummaryUndergrad.csv").then(data => {
        const filteredData = data.filter(d => +d.Term === year);

        const selectedCollege = d3.select(`#comparison-college-${year}`).node().value;
        const collegesToDisplay = ["Engineering", selectedCollege];

        const genderData = {};
        const racialData = {};

        collegesToDisplay.forEach(college => {
            const collegeData = filteredData.filter(d => d["College Name"] === college);
            genderData[college] = prepareGenderData(collegeData);
            racialData[college] = prepareRacialData(collegeData);
        });

        const engineeringGenderData = genderData["Engineering"];
        const selectedGenderData = genderData[selectedCollege];
        const engineeringRacialData = racialData["Engineering"];
        const selectedRacialData = racialData[selectedCollege];

        const genderDiffs = calculateDifferences(engineeringGenderData, selectedGenderData);
        const racialDiffs = calculateDifferences(engineeringRacialData, selectedRacialData);

        d3.select(`#${annotationsId}`).html(`
            <h3>Differences between Engineering and ${selectedCollege}</h3>
            <h4>Gender Differences:</h4>
            <ul>
                ${Object.keys(genderDiffs).map(gender => `<li>${gender}: ${genderDiffs[gender]}%</li>`).join('')}
            </ul>
            <h4>Racial Differences:</h4>
            <ul>
                ${Object.keys(racialDiffs).map(race => `<li>${race}: ${racialDiffs[race]}%</li>`).join('')}
            </ul>
        `);
    });
}

function calculateDifferences(engData, selData) {
    const diff = {};
    const totalEng = d3.sum(engData, d => d.value);
    const totalSel = d3.sum(selData, d => d.value);

    engData.forEach(d => {
        const label = d.label;
        const engValue = d.value;
        const selValue = selData.find(sd => sd.label === label)?.value || 0;
        const diffPercentage = (engValue/totalEng - selValue/totalSel) * 100;
        diff[label] = diffPercentage.toFixed(2);
    });

    return diff;
}


function loadSummaryData() {
    d3.csv("CleanedCombinedSummaryUndergrad.csv").then(data => {
        const filteredData = data.filter(d => d["College Name"] === "Engineering" && [2013, 2018, 2023].includes(+d.Term));
        const summaryData = prepareSummaryData(filteredData);
        const racialData = prepareRacialSummaryData(filteredData);
        createSummaryLineGraph(summaryData, "summary-chart-container");
        createRacialSummaryLineGraph(racialData, "racial-summary-chart-container");
    });
}

function prepareSummaryData(data) {
    const genders = [
        "Men","Women","Unknown"
    ]

    const summaryData = {
        years: [2013, 2018, 2023]
    };

    genders.forEach(gender => {
        summaryData[gender] = [];
    });

    summaryData.years.forEach(year => {
        const yearData = data.filter(d => +d.Term === year);
        genders.forEach(gender => {
            summaryData[gender].push(d3.sum(yearData, d => +d[gender] || 0));
        });
    });

    return summaryData;
}

function prepareRacialSummaryData(data) {
    const races = [
        "Caucasian","Asian American","African American","Hispanic","Native American",
        "Hawaiian/Pacific Isl","Multiracial","International","Unknown.1"
    ];

    const summaryData = {
        years: [2013, 2018, 2023]
    };

    races.forEach(race => {
        summaryData[race] = [];
    });

    summaryData.years.forEach(year => {
        const yearData = data.filter(d => +d.Term === year);
        races.forEach(race => {
            summaryData[race].push(d3.sum(yearData, d => +d[race] || 0));
        });
    });

    return summaryData;
}

function createSummaryLineGraph(data, containerId) {
    d3.select(`#${containerId}`).selectAll("*").remove();

    const margin = 75;
    const width = 700 - margin - margin;
    const height = 400 - margin - margin;

    const svg = d3.select(`#${containerId}`).append("svg")
        .attr("width", width + 4 * margin)
        .attr("height", height + margin + margin)
        .append("g")
        .attr("transform", `translate(${margin},${margin})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(data.years))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(Object.values(data).flat().filter(d => typeof d === 'number'))])
        .nice()
        .range([height, 0]);

    const line = d3.line()
        .x((d, i) => x(data.years[i]))
        .y(d => y(d));

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
        .call(d3.axisLeft(y));


    const color = d3.scaleOrdinal(d3.schemePastel1);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "#fff")
        .style("padding", "5px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px");

        Object.keys(data).forEach((gender, index) => {
            if (gender !== 'years') {
                svg.append("path")
                    .datum(data[gender])
                    .attr("fill", "none")
                    .attr("stroke", color(index))
                    .attr("stroke-width", 1.5)
                    .attr("d", line)
                    .attr("class", gender.replace(/[^a-zA-Z0-9]/g, '-'));
    
                svg.selectAll(`circle.${gender.replace(/[^a-zA-Z0-9]/g, '-')}`)
                    .data(data[gender])
                    .enter()
                    .append("circle")
                    .attr("class", gender.replace(/[^a-zA-Z0-9]/g, '-'))
                    .attr("cx", (d, i) => x(data.years[i]))
                    .attr("cy", d => y(d))
                    .attr("r", 5)
                    .attr("fill", color(index))
                    .on("mouseover", (event, d) => {
                        tooltip.style("visibility", "visible")
                            .html(`Year: ${data.years[data[gender].indexOf(d)]}<br>${gender}: ${d}`)
                            .style("left", `${event.pageX + 5}px`)
                            .style("top", `${event.pageY - 28}px`);
                    })
                    .on("mousemove", event => {
                        tooltip.style("left", `${event.pageX + 5}px`)
                            .style("top", `${event.pageY - 28}px`);
                    })
                    .on("mouseout", () => {
                        tooltip.style("visibility", "hidden");
                    });
            }
        }
    );

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 0 - margin / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Engineering Enrollment by Gender");

    svg.append("text")
        .attr("transform", `translate(${width},${height + margin-20})`)
        .style("text-anchor", "end")
        .text("Year");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Number of Students");

    const legend = svg.append("g")
        .attr("transform", `translate(${width+25}, ${margin-50})`);

    Object.keys(data).forEach((gender, index) => {
        if (gender !== 'years') {
            legend.append("rect")
                .attr("y", index * 20)
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", color(index));

            legend.append("text")
                .attr("x", 15)
                .attr("y", index * 20 + 10)
                .text(gender);
        }
    });
}

function createRacialSummaryLineGraph(data, containerId) {
    d3.select(`#${containerId}`).selectAll("*").remove();

    const margin = 75;
    const width = 700 - margin - margin;
    const height = 400 - margin - margin;

    const svg = d3.select(`#${containerId}`).append("svg")
        .attr("width", width + 4 * margin)
        .attr("height", height + margin + margin)
        .append("g")
        .attr("transform", `translate(${margin},${margin})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(data.years))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(Object.values(data).flat().filter(d => typeof d === 'number'))])
        .nice()
        .range([height, 0]);

    const line = d3.line()
        .x((d, i) => x(data.years[i]))
        .y(d => y(d));

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
        .call(d3.axisLeft(y));

    const color = d3.scaleOrdinal(d3.schemePastel1);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "#fff")
        .style("padding", "5px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px");

        Object.keys(data).forEach((race, index) => {
            if (race !== 'years') {
                svg.append("path")
                    .datum(data[race])
                    .attr("fill", "none")
                    .attr("stroke", color(index))
                    .attr("stroke-width", 1.5)
                    .attr("d", line)
                    .attr("class", race.replace(/[^a-zA-Z0-9]/g, '-'));
    
                svg.selectAll(`circle.${race.replace(/[^a-zA-Z0-9]/g, '-')}`)
                    .data(data[race])
                    .enter()
                    .append("circle")
                    .attr("class", race.replace(/[^a-zA-Z0-9]/g, '-'))
                    .attr("cx", (d, i) => x(data.years[i]))
                    .attr("cy", d => y(d))
                    .attr("r", 5)
                    .attr("fill", color(index))
                    .on("mouseover", (event, d) => {
                        tooltip.style("visibility", "visible")
                            .html(`Year: ${data.years[data[race].indexOf(d)]}<br>${race}: ${d}`)
                            .style("left", `${event.pageX + 5}px`)
                            .style("top", `${event.pageY - 28}px`);
                    })
                    .on("mousemove", event => {
                        tooltip.style("left", `${event.pageX + 5}px`)
                            .style("top", `${event.pageY - 28}px`);
                    })
                    .on("mouseout", () => {
                        tooltip.style("visibility", "hidden");
                    });
            }
        });

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 0 - margin / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Engineering Enrollment by Race");

    svg.append("text")
        .attr("transform", `translate(${width},${height + margin - 20})`)
        .style("text-anchor", "end")
        .text("Year");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Number of Students");

    const legend = svg.append("g")
        .attr("transform", `translate(${width+25}, ${margin-50})`);

    Object.keys(data).forEach((race, index) => {
        if (race !== 'years') {
            legend.append("rect")
                .attr("y", index * 20)
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", color(index));

            legend.append("text")
                .attr("x", 15)
                .attr("y", index * 20 + 10)
                .text(race);
        }
    });
}

showSlide(currentSlide);
