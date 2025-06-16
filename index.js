import {createSimpleChart, createHistogramChart, createAVGChart, bloodPressureCategories, preprocessMeasurements} from './modules/helpers.mjs';


/*
document.getElementById("legend").innerHTML = '<ul class="list-group">' +
    Object.keys(bloodPressureCategories).map(k => 
        `<li class="list-group-item" style="background-color:${bloodPressureCategories[k].color};">${bloodPressureCategories[k].displayName}</li>
    `).join('') + '</ul>';
*/

document.getElementById("btn_parse").addEventListener("click", function() {
    const fileInput = document.getElementById("in_file");
    const file = fileInput.files[0];

    if (file) {
        Papa.parse(file, {
            header: true,
            complete: function(results) {
                document.getElementById("div_stat").classList.remove("d-none");
                document.getElementById("div_charts").classList.remove("d-none");

                const processed_data = preprocessMeasurements(results.data); 

                document.getElementById("stat_total").innerHTML = processed_data.meas_all.length;
                document.getElementById("stat_morning").innerHTML = processed_data.meas_morning.length;
                document.getElementById("stat_daytime").innerHTML = processed_data.meas_daytime.length;
                document.getElementById("stat_evening").innerHTML = processed_data.meas_evening.length;
                document.getElementById("stat_time").innerHTML = processed_data.first_date + ' - ' + processed_data.last_date;

                createSimpleChart('chart_all', processed_data.meas_all, 'All');
                createHistogramChart('chart_all_hist', processed_data.meas_all,);

                createSimpleChart('chart_morning', processed_data.meas_morning, 'Morning');
                createHistogramChart('chart_morning_hist', processed_data.meas_morning,);
                createAVGChart('chart_morning_avg', processed_data.meas_morning_avg, 'Daily Stat');
                createSimpleChart('chart_morning_last', processed_data.meas_morning_last, 'Morning (best measurement)', true);
                createHistogramChart('chart_morning_last_hist', processed_data.meas_morning_last,);

                createSimpleChart('chart_daytime', processed_data.meas_daytime, 'Daytime');
                createHistogramChart('chart_daytime_hist', processed_data.meas_daytime,);

                createSimpleChart('chart_evening', processed_data.meas_evening, 'Evening');
                createHistogramChart('chart_evening_hist', processed_data.meas_evening,);
                createAVGChart('chart_evening_avg', processed_data.meas_evening_avg, 'Daily Stat');
                createSimpleChart('chart_evening_last', processed_data.meas_evening_last, 'Evening (best measurement)', true);
                createHistogramChart('chart_evening_last_hist', processed_data.meas_evening_last,);

                new Tabulator("#table", {
                    data: processed_data.meas_all,
                    layout: "fitData",
                    height: 500,
                    initialSort:[
                        {column:"DT", dir:"desc"}, 
                    ],
                    columns: [
                        {title: "Date", field: "DT", headerFilter: true,},  
                        {title: "Systolic (hgmm)", field: "SYS", sorter: "number"},
                        {title: "Diastolic (hgmm)", field: "DIA", sorter: "number"},
                        {title: "Pulse", field: "Pulse", sorter: "number"},
                        {title: "Category", field: "eval", headerFilter: true, formatter: (cell) => {
                            cell.getElement().style.backgroundColor = bloodPressureCategories[cell.getValue()].color;
                            return cell.getValue();
                        }},
                        {title: "Daypart", field: "daypart", headerFilter: true,},
                        {title: "Weekday", field: "day", headerFilter: true,},
                        {title: "Best of Period", field: "isBest", headerFilter: true,},
                    ]
                });

                const max_category_count = Math.max(...Object.values(processed_data.meas_per_category));
                
                Object.keys(processed_data.meas_per_category).forEach(k => {
                    Plotly.newPlot('count_' + k, [{
                        x: [processed_data.meas_per_category[k]],
                        y: [k],
                        type: 'bar',
                        orientation: 'h',
                        marker: {
                            color: bloodPressureCategories[k].color
                        },
                        text: [processed_data.meas_per_category[k] + ' (' + Math.round(processed_data.meas_per_category[k] / processed_data.meas_all.length * 100) + '%)'],
                        textposition: 'auto',
                        hoverinfo: 'none',
                    }], {
                        xaxis: {
                            range: [0, max_category_count+1,],
                            visible: false
                        },
                        yaxis: {
                            visible: false
                        },
                        width: 150,
                        margin: {l: 0,r: 0,t: 0,b: 0
                        }
                    }, {
                        displayModeBar: false
                    });
                });
                
            },
            error: function(error) {
                console.error("Error parsing CSV: ", error);
            }
        });
    } else {
        console.error("No file selected");
    }
})

