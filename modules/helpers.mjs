
export const bloodPressureRules = {
    "normal": {
        "normal": 	{"connector": "or",  	"filter":[{"value":"SYS", "lower": 120, "higher": 129, "comparator": "bt"}, {"value":"DIA", "lower": 80, "higher": 84, "comparator": "bt"}]},
        "optimal": 	{"connector": "and", 	"filter":[{"value":"SYS", "lower": undefined, "higher": 120, "comparator": "lt"}, {"value":"DIA", "lower": undefined, "higher": 80, "comparator": "lt"}]},
        "preHT": 	{"connector": "or",   	"filter":[{"value":"SYS", "lower": 130, "higher": 139, "comparator": "bt"}, {"value":"DIA", "lower": 85, "higher": 90, "comparator": "bt"}]},
        "stageI": 	{"connector": "or",   	"filter":[{"value":"SYS", "lower": 140, "higher": 159, "comparator": "bt"}, {"value":"DIA", "lower": 90, "higher": 99, "comparator": "bt"}]},
        "stageII": 	{"connector": "or",   	"filter":[{"value":"SYS", "lower": 160, "higher": 179, "comparator": "bt"}, {"value":"DIA", "lower": 100, "higher": 109, "comparator": "bt"}]},
        "stageIII": {"connector": "or",   	"filter":[{"value":"SYS", "lower": 180, "higher": undefined, "comparator": "hteq"}, {"value":"DIA", "lower": 110, "higher": undefined, "comparator": "hteq"}]},
        "DIAHT": 	{"connector": "and",  	"filter":[{"value":"SYS", "lower": undefined, "higher": 140, "comparator": "lt"}, {"value":"DIA", "lower": 89, "higher": undefined, "comparator": "ht"}]},
        "SYSHT": 	{"connector": "and",  	"filter":[{"value":"SYS", "lower": 140, "higher": undefined, "comparator": "hteq"}, {"value":"DIA", "lower": undefined, "higher": 90, "comparator": "lt"}]}
    }
}

export const bloodPressureCategories = {
	"optimal": 	{color: "#1a9850", displayName: "Optimal"},
	"normal": 	{color: "#a6d96a", displayName: "Normal"},
	"preHT": 	{color: "#fee08b", displayName: "Pre Hypertension"},
	"stageI": 	{color: "#f46d43", displayName: "Hypertension Stage I."},
	"stageII": 	{color: "#d73027", displayName: "Hypertension Stage II."},
	"stageIII": {color: "#a50026", displayName: "Hypertension Stage III."},
	"DIAHT": 	{color: "#92c5de", displayName: "Diastolic Hypertension"},
	"SYSHT": 	{color: "#d1e5f0", displayName: "Systolic Hypertension"}
};

export function measEvaluator(meas, rules) {
    var result = "";
    for (var key in rules) {
        if (rules.hasOwnProperty(key)) {
            var isIt = rules[key].connector == "and" ? true : false;
            rules[key].filter.forEach(function(v,i,a) {
                switch (v.comparator) {
                    case "lt":
                        isIt = rules[key].connector == "and" ? (isIt && meas[v.value] < v.higher) : (isIt || meas[v.value] < v.higher);
                        break;
                    case "lteq":
                        isIt = rules[key].connector == "and" ? (isIt && meas[v.value] <= v.higher) : (isIt || meas[v.value] <= v.higher);
                        break;
                    case "ht":
                        isIt = rules[key].connector == "and" ? (isIt && meas[v.value] > v.lower) : (isIt || meas[v.value] > v.lower);
                        break;
                    case "hteq":
                        isIt = rules[key].connector == "and" ? (isIt && meas[v.value] >= v.lower) : (isIt || meas[v.value] >= v.lower);
                        break;
                    case "bt":
                        isIt = rules[key].connector == "and" ? (isIt && (meas[v.value] >= v.lower && meas[v.value] <= v.higher)) : (isIt || (meas[v.value] >= v.lower && meas[v.value] <= v.higher));
                        break;
                    default:
                        isIt: false;
                };
            });
            if (isIt) {
                result = key;
            }
        }
    }
    return result;
}

export function preprocessMeasurements(data) {
    const processed_data = {
        num_meas: 0,
        first_date: "",
        last_date: "",
        meas_per_category: Object.keys(bloodPressureCategories).reduce((acc, key) => {
            acc[key] = 0;
            return acc;
        }, {}),
        meas_all: [],
        meas_morning: [],
        meas_morning_last: [],
        meas_morning_avg : [],
        meas_evening: [],
        meas_evening_last: [],
        meas_evening_avg : [],
        meas_daytime: [],
    }
    const meas_raw = data.filter(r => r.Date.length > 0).reverse();
    processed_data.num_meas = meas_raw.length;
    processed_data.last_date = meas_raw[meas_raw.length-1].Date + " " + meas_raw[meas_raw.length-1].Time;
    processed_data.first_date = meas_raw[0].Date + " " + meas_raw[0].Time;
    meas_raw.forEach((element,i) => {
        element.index = i;
        element.daypart = element.Time < "09:00" ? "morning" : element.Time > "18:00" ? "evening" : "daytime";
        element.day = dateFns.format(new Date(element.Date), 'EEEE');
        element.weekday = dateFns.getDay(new Date(element.Date));
        element.SYS = parseInt(element["Systolic (mmHg)"])
        element.DIA = parseInt(element["Diastolic (mmHg)"])
        element.Pulse = parseInt(element["Pulse (bpm)"])
        element.SYS_p_DIA = element.SYS + element.DIA;
    });
    /*
    meas_raw.forEach((element,i) => {
        if(i<meas_raw.length-1) {
            //console.log(i,element.daypart,meas_raw[i+1].daypart, !(element.daypart == meas_raw[i+1].daypart && element.Date == meas_raw[i+1].Date) , element, meas_raw[i+1]);
            element.isLast = !(element.daypart == meas_raw[i+1].daypart && element.Date == meas_raw[i+1].Date) 
        } else {
            element.isLast = true;
        }
    });
    */

    // determine best measurement of period of a day
    new Set(meas_raw.map(e => [e.Date, e.daypart].join("_"))).forEach(e => {
        const data = meas_raw.filter(r => [r.Date, r.daypart].join("_") == e).sort((a,b) => a.SYS_p_DIA - b.SYS_p_DIA)[0];
        meas_raw.filter(r => r.index == data.index)[0].isBest = true;
    })

    // create final data structure
    processed_data["meas_all"] = meas_raw.map(e => ({
        DT : dateFns.format(new Date(e.Date + " " + e.Time), 'yyyy-MM-dd HH:mm'),
        Date: e.Date,
        SYS : e.SYS,
        DIA : e.DIA,
        Pulse : e.Pulse,
        daypart : e.daypart,
        weekday : e.weekday,
        day : e.day,
        isLast: e.isLast,
        isBest: e.isBest,
        eval: measEvaluator(e, bloodPressureRules["normal"])
    }))

    // create filtered datasets
    processed_data["meas_morning"] =        processed_data["meas_all"].filter(e => e.daypart == "morning" );
    processed_data["meas_morning_last"] =   processed_data["meas_all"].filter(e => e.daypart == "morning" && e.isBest);
    processed_data["meas_evening"] =        processed_data["meas_all"].filter(e => e.daypart == "evening" );
    processed_data["meas_evening_last"] =   processed_data["meas_all"].filter(e => e.daypart == "evening" && e.isBest); 
    processed_data["meas_daytime"] =        processed_data["meas_all"].filter(e => e.daypart == "daytime" );

    // calculate 7 days rolling AVG 
    ["meas_morning_last","meas_evening_last"].forEach(cat => {
        processed_data[cat].forEach((e,i,a) => {
            e.SYS_AVG = a.slice(i-7 < 0 ? 0 : i-7,i).map(e => e.SYS).reduce((a,b) => a+b,0) / (i > 6 ? 7 : i );
            e.DIA_AVG = a.slice(i-7 < 0 ? 0 : i-7,i).map(e => e.DIA).reduce((a,b) => a+b,0) / (i > 6 ? 7 : i );
            e.Pulse_AVG = a.slice(i-7 < 0 ? 0 : i-7,i).map(e => e.Pulse).reduce((a,b) => a+b,0) / (i > 6 ? 7 : i );
        })
    })
    processed_data["meas_all"].forEach(e => {
        processed_data["meas_per_category"][e.eval]++
    });

    // calculate periodic averages
    ["meas_morning","meas_evening"].forEach(cat => {
        processed_data[cat + "_avg"] = Array.from(new Set(processed_data[cat].map(e => e.Date))).map(d => ({ 
            DT: dateFns.format(new Date(d), 'yyyy-MM-dd'), 
            SYS_AVG: processed_data[cat].filter(e => e.Date == d).map(e => e.SYS).reduce((a,b) => a+b,0) / processed_data[cat].filter(e => e.Date == d).length, 
            SYS_MIN: Math.min(...processed_data[cat].filter(e => e.Date == d).map(e => e.SYS)),
            SYS_MAX: Math.max(...processed_data[cat].filter(e => e.Date == d).map(e => e.SYS)),
            DIA_AVG: processed_data[cat].filter(e => e.Date == d).map(e => e.DIA).reduce((a,b) => a+b,0) / processed_data[cat].filter(e => e.Date == d).length,
            DIA_MIN: Math.min(...processed_data[cat].filter(e => e.Date == d).map(e => e.DIA)),
            DIA_MAX: Math.max(...processed_data[cat].filter(e => e.Date == d).map(e => e.DIA)), 
            Pulse_AVG: processed_data[cat].filter(e => e.Date == d).map(e => e.Pulse).reduce((a,b) => a+b,0) / processed_data[cat].filter(e => e.Date == d).length,
            Pulse_MIN: Math.min(...processed_data[cat].filter(e => e.Date == d).map(e => e.Pulse)),
            Pulse_MAX: Math.max(...processed_data[cat].filter(e => e.Date == d).map(e => e.Pulse)) 
        }))
        
        processed_data[cat + "_avg"].forEach(e => {
            e.eval = measEvaluator({ SYS: parseInt(e.SYS_AVG), DIA: parseInt(e.DIA_AVG)}, bloodPressureRules["normal"])
        })     
    });

    // calculate best of period
    ["meas_morning","meas_evening"].forEach(cat => {
        processed_data[cat + "_best"] = Array.from(new Set(processed_data[cat].map(e => e.Date))).map(d => ({ 
            DT: dateFns.format(new Date(d), 'yyyy-MM-dd'), 
            SYS: processed_data[cat].filter(e => e.Date == d).sort((a,b) => (a.SYS+a.DIA) - (b.SYS+b.DIA))[0].SYS, 
            DIA: processed_data[cat].filter(e => e.Date == d).sort((a,b) => (a.SYS+a.DIA) - (b.SYS+b.DIA))[0].DIA,
            Pulse: processed_data[cat].filter(e => e.Date == d).sort((a,b) => (a.SYS+a.DIA) - (b.SYS+b.DIA))[0].Pulse,
            eval: processed_data[cat].filter(e => e.Date == d).sort((a,b) => (a.SYS+a.DIA) - (b.SYS+b.DIA))[0].eval,
        }))
        
        processed_data[cat + "_avg"].forEach(e => {
            e.eval = measEvaluator({ SYS: parseInt(e.SYS_AVG), DIA: parseInt(e.DIA_AVG)}, bloodPressureRules["normal"])
        })     
    })

    return processed_data
}


export function createHistogramChart(container, data) {
    var statdata = []
    var totalMeas = 0
    Object.keys(bloodPressureCategories).forEach(e => {
        statdata.push({eval: e, count: 0, cdf: 0});
    })
    data.forEach(e => {
        statdata.filter(r => r.eval == e.eval)[0].count++;
        totalMeas++;
    })
    statdata.forEach((e,i) => {
        e.cdf = statdata.slice(0, i+1).map(d => d.count).reduce((partialSum, a) => partialSum + a, 0)  / totalMeas;
    })
    let cdf_text = statdata.map(e => e.cdf)
    cdf_text.forEach((e,i,a) => {
        if (i == 0) {
            cdf_text[i] = e;
        } else if (cdf_text[i-1] == 1 || cdf_text[i-1] == -1) {
            cdf_text[i]  = -1;
        } else {
            cdf_text[i]  = e;
        }
    })
    cdf_text = cdf_text.map(e => e == -1 ? "" : (e*100).toFixed(1) + "%").filter(e => e.length > 0);
    Plotly.newPlot(container, [
        {
            x: statdata.map(e => bloodPressureCategories[e.eval].displayName),
            y: statdata.map(e => e.count),
            type: 'bar',
            marker: {
                color: statdata.map(e => bloodPressureCategories[e.eval].color)
            }
        },
        {
            x: statdata.map((e,i) => i < cdf_text.length ? bloodPressureCategories[e.eval].displayName : null),
            y: statdata.map((e,i) => i < cdf_text.length ? e.cdf : null),
            mode: 'lines+markers+text',
            text: cdf_text, //  statdata.map(e => (e.cdf*100).toFixed(1) + "%"),
            marker: {
                color: '#999', //statdata.map(e => bloodPressureCategories[e.eval].color)
                size: 4
            },
            line: {
                color: '#999',
                width: 1
            },
            yaxis: 'y2'
        }], {
            title: { text: "Category Distribution"},
            yaxis: {
                title: {text: 'Number of measurements'},
            },
            yaxis2: {
                title: {text: '% of measurements (CDF)'},
                overlaying: 'y',
                side: 'right',
                showgrid: false,
                tickformat: ',.0%',
                hoverformat: ',.2%',
                range: [0, 1.05]
            },
            showlegend: false
        })
}


const BP_chart_lower = 55;
const BP_chart_upper = 145;

export function createSimpleChart(container, data, title, hasAVG) {
    const plots = [{
        x: data.map(e => e.DT),
        y: data.map(e => e.SYS),
        mode: 'lines+markers',
        name: 'SYS',
        line: {
            color: '#a1d76a',
        },
        marker: {   
            color: data.map(e => bloodPressureCategories[e.eval].color),
            size: 15
        },
        text: data.map(e => e.SYS + '/' + e.DIA + ' (' + e.Pulse + ' bpm)')
    },{
        x: data.map(e => e.DT),
        y: data.map(e => e.DIA),
        mode: 'lines+markers',
        name: 'DIA',
        line: {
            color: '#67a9cf',
        },
        marker: {   
            color: data.map(e => bloodPressureCategories[e.eval].color),
            size: 15
        },
        text: data.map(e => e.SYS + '/' + e.DIA + ' (' + e.Pulse + ' bpm)')
    },{
        x: data.map(e => e.DT),
        y: data.map(e => e.Pulse),
        mode: 'lines',
        name: 'Pulse',
        yaxis: 'y2',
        line: {
            width: 1,
            dash: 'dot',
            color: '#555'
        },
        text: data.map(e => e.SYS + '/' + e.DIA + ' (' + e.Pulse + ' bpm)')
    }]
    if (hasAVG) {
        plots.push(...[{
            x: data.map(e => e.DT),
            y: data.map(e => e.SYS_AVG),
            mode: 'lines',
            name: 'SYS 7day AVG',
            line: {
                color: '#a1d76a',
                dash: 'dot'
            }
        },{
            x: data.map(e => e.DT),
            y: data.map(e => e.DIA_AVG),
            mode: 'lines',
            name: 'DIA 7day AVG',
            line: {
                color: '#67a9cf',
                dash: 'dot'
            }
        }])
    }
    Plotly.newPlot(container, plots, {
        title: { text: title},
        xaxis: {
            title: 'Date'
        },
        yaxis: {
            title: { text: 'mmHg' },
            tickvals: [60,70,80,90,100,110,120,130,140,150],
            range: [BP_chart_lower, BP_chart_upper]
        },
        yaxis2: {
            title: {text: 'bpm' },
            overlaying: 'y',
            side: 'right',
            showgrid: false,
            range: [40, 100]
        },
        legend: {
            orientation: 'h',
            y: 1.2,
            x: 0
        },
        shapes: [
            {
                type: 'line',
                xref: 'paper',
                x0: 0,
                y0: 80,
                x1: 1,
                y1: 80,
                line: {
                  color: 'rgb(255, 78, 78)',
                  width: 1,
                  dash: 'dot'
                }
            },
            {
                type: 'line',
                xref: 'paper',
                x0: 0,
                y0: 120,
                x1: 1,
                y1: 120,
                line: {
                  color: 'rgb(255, 78, 78)',
                  width: 1,
                  dash: 'dot'
                }
            },
        ]
    });
}

export function createAVGChart(container, data, title,) {
    const plots = [
    {
            x: data.map(e => e.DT),
            y: data.map(e => e.SYS_MIN),
            stackgroup: 'sys',
            showlegend: false,
            line: { width: 0 },
            fillcolor: 'rgba(0,0,0,0)'
    } ,
    {
        x: data.map(e => e.DT),
        y: data.map(e => e.SYS_MAX - e.SYS_MIN),
        stackgroup: 'sys',
        showlegend: false,
        line: { width: 0 },
        fillcolor: 'rgba(161, 215, 106, 0.2)'
    } ,
    {
        x: data.map(e => e.DT),
        y: data.map(e => e.DIA_MIN),
        stackgroup: 'dia',
        showlegend: false,
        line: { width: 0 },
        fillcolor: 'rgba(0,0,0,0)'
    } ,
    {
        x: data.map(e => e.DT),
        y: data.map(e => e.DIA_MAX - e.DIA_MIN),
        stackgroup: 'dia',
        showlegend: false,
        line: { width: 0 },
        fillcolor: 'rgba(103, 169, 207, 0.2)'
    } ,
    {
        x: data.map(e => e.DT),
        y: data.map(e => e.SYS_AVG),
        mode: 'lines+markers',
        name: 'SYS',
        line: {
            color: '#a1d76a',
        },
        marker: {   
            color: data.map(e => bloodPressureCategories[e.eval].color),
            size: 10
        },
        text: data.map(e => e.SYS_AVG + '/' + e.DIA_AVG + ' (' + e.Pulse_AVG + ' bpm)')
    },{
        x: data.map(e => e.DT),
        y: data.map(e => e.DIA_AVG),
        mode: 'lines+markers',
        name: 'DIA',
        line: {
            color: '#67a9cf',
        },
        marker: {   
            color: data.map(e => bloodPressureCategories[e.eval].color),
            size: 10
        },
        text: data.map(e => e.SYS + '/' + e.DIA + ' (' + e.Pulse + ' bpm)')
    },{
        x: data.map(e => e.DT),
        y: data.map(e => e.Pulse_AVG),
        mode: 'lines',
        name: 'Pulse',
        yaxis: 'y2',
        line: {
            width: 1,
            dash: 'dot',
            color: '#555'
        },
        text: data.map(e => e.SYS_AVG + '/' + e.DIA_AVG + ' (' + e.Pulse_AVG + ' bpm)')
    }]
    Plotly.newPlot(container, plots, {
        title: { text: title},
        xaxis: {
            title: 'Date'
        },
        yaxis: {
            title: { text: 'mmHg' },
            tickvals: [60,70,80,90,100,110,120,130,140,150],
            range: [BP_chart_lower, BP_chart_upper]
        },
        yaxis2: {
            title: {text: 'bpm' },
            overlaying: 'y',
            side: 'right',
            showgrid: false,
            range: [40, 100]
        },
        legend: {
            orientation: 'h',
            y: 1.2,
            x: 0
        },
        shapes: [
            {
                type: 'line',
                xref: 'paper',
                x0: 0,
                y0: 80,
                x1: 1,
                y1: 80,
                line: {
                  color: 'rgb(255, 78, 78)',
                  width: 1,
                  dash: 'dot'
                }
            },
            {
                type: 'line',
                xref: 'paper',
                x0: 0,
                y0: 120,
                x1: 1,
                y1: 120,
                line: {
                  color: 'rgb(255, 78, 78)',
                  width: 1,
                  dash: 'dot'
                }
            },
        ]
    });
}