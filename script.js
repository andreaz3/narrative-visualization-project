let currentYear = 2013;

function loadData(year) {
    currentYear = year;
    d3.csv("CleanedCombinedSummaryUndergrad.csv").then(data => {
        const filteredData = data.filter(d => +d.Term === year);
        const colleges = [...new Set(filteredData.map(d => d["College Name"]))];
        const comparisonDropdown = d3.select("#comparison-college");
        if (comparisonDropdown.selectAll("option").empty()) {
            colleges.forEach(college => {
                if (college !== "Engineering") {
                    comparisonDropdown.append("option").text(college).attr("value", college);
                }
            });
        }
        const selectedCollege = comparisonDropdown.node().value;
        updateCharts(filteredData, selectedCollege);
    });
}

function updateCharts(data, comparisonCollege) {
    d3.select("#chart-container").selectAll("*").remove();

    const collegesToDisplay = ["Engineering", comparisonCollege];
    console.log(`Gender Data for ${comparisonCollege}:`, comparisonCollege);

    collegesToDisplay.forEach(college => {
        const collegeData = data.filter(d => d["College Name"] === college);

        const genderData = prepareGenderData(collegeData);
        const racialData = prepareRacialData(collegeData);

        // ID Format
        const formattedCollege = college.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');

        const collegeSection = d3.select("#chart-container").append("div").attr("class", "college-section");
        collegeSection.append("h2").text(college);
        collegeSection.append("div").attr("id", `gender-chart-${formattedCollege}`).attr("class", "chart");
        collegeSection.append("div").attr("id", `racial-chart-${formattedCollege}`).attr("class", "chart");

        updateChart(`#gender-chart-${formattedCollege}`, genderData, `Gender Breakdown - ${college}`);
        updateChart(`#racial-chart-${formattedCollege}`, racialData, `Racial Breakdown - ${college}`);
    });

    updateAnnotations(currentYear);
}

function prepareGenderData(data) {
    const men = d3.sum(data, d => +d.Men || 0);
    const women = d3.sum(data, d => +d.Women || 0);
    const unknown = d3.sum(data, d => +d.Unknown || 0);
    return [
        { label: "Men", value: men },
        { label: "Women", value: women },
        { label: "Unknown", value: unknown }
    ];
}

function prepareRacialData(data) {
    const categories = [
        "Caucasian", "Asian American", "African American", "Hispanic",
        "Hawaiian/Pacific Islander", "Am Indian/Alaskan Nat", "Two or More", "International", "Unknown.1"
    ];
    return categories.map(category => {
        return {
            label: category,
            value: d3.sum(data, d => +d[category] || 0)
        };
    });
}

function updateChart(containerId, data, title) {
    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 3;
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    d3.select(containerId).selectAll("*").remove();

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

    // Labels
    svg.selectAll("text.label")
        .data(pie(data))
        .enter().append("text")
        .attr("class", "label")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("dy", "0.35em")
        .style("text-anchor", "middle")
        .style("fill", "#000")
        .style("font-size", "12px")
        .text(d => d.data.label);
}

function updateAnnotations(year) {
    const annotations = {
        2013: "Annotations for 2013...",
        2018: "Annotations for 2018...",
        2023: "Annotations for 2023..."
    };
    d3.select("#annotations").text(annotations[year]);
}

loadData(2013);
