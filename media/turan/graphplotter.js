/**
 * Class for handeling graph plotting of pulse data.
 * Still needs loads of work and is only a cut/paste from template for now
 */
var plot;
var GraphPlotter = {
    choiceContainer: null,
    datasets: null,
    backendUrl: null,
    max_hr: 200,
    markings: [],
    formatters: {
            speed: function(val, axis) {
                return (val).toFixed(axis.tickDecimals) + ' km/h';
            },
            altitude: function(val, axis) {
                return (val).toFixed(axis.tickDecimals) + ' m';
            },
            length: function(val, axis) {
                return (val).toFixed(axis.tickDecimals) + ' km';
            },
            power: function(val, axis) {
                return (val).toFixed(axis.tickDecimals) + ' W';
            },
            hr: function(val, axis) {
                return (val).toFixed(axis.tickDecimals) + ' BPM';
            },
            temp: function(val, axis) {
                return (val).toFixed(axis.tickDecimals) + ' ℃';
            },
            time: function(val, axis) {
                var hours = Math.floor(val / 60);
                var minutes = val;

                if (hours)
                        return hours + 'h&nbsp;' + minutes + 'm';
                return minutes + 'm';
            }

    },

    plotAccordingToChoices: function(ranges) {
        data = [];
        var that = this;
        var minIndex = null;
        var maxIndex = null;
        var min = null;
        var max = null;
        var xaxisattrs = { 
            tickDecimals: 0,
            tickFormatter: this.xaxisformatter
        };
        if (ranges.xaxis != undefined) {
            var xaxe = plot.getXAxes()[0];
            min = ranges.xaxis.from;
            max = ranges.xaxis.to;
            xaxisattrs.min = min;
            xaxisattrs.max = max;

            for (dataset in this.datasets) { 

                series = this.datasets[dataset]['data']

                for (k in series) {
                    if (min >= series[k][0])
                        minIndex = k;
                    if (max <= series[k][0]) {
                        maxIndex = k;
                        break;
                    }
                }
                break;
            }
        }
        $("#choices").find("input:checked").each(function () {
            var key = $(this).attr("name");
            if (key && that.datasets[key]) {
                if (key == 'hr')
                    that.datasets[key]['constraints'] = [that.constraint0, that.constraint1, that.constraint2, that.constraint3, that.constraint4, that.constraint5];
                data.push(that.datasets[key]);
            }
        });

        if (data.length > 0) {
            plot = $.plot($("#tripdiv"), data, {
                yaxes: [
                    { tickFormatter: this.formatters['speed'], max: 100},
                    { position: "right", min: 80, max: this.max_hr, tickFormatter: this.formatters['hr'] }, 
                    { position: "right", tickFormatter: this.formatters['power']},
                    { tickFormatter: this.formatters['altitude']} ,
                    { tickFormatter: this.formatters['temp']},
                    
                    ],
                xaxis: xaxisattrs,
                legend: { 
                    container: $("#tripdiv_legend"),
                    noColumns: 15
                },
                grid: { 
                    hoverable: true, 
                    clickable: true,
                    markings: this.markings,
                },
                crosshair: { mode: "x" },
                selection: { mode: "x" }
            });
        }

        if (minIndex != null && maxIndex != null) {
            if (typeof(Mapper) != "undefined")
                Mapper.loadGeoJSON(minIndex, maxIndex);
            $.getJSON(this.backendUrl, { start: minIndex, stop: maxIndex }, function (avgs) {
                var items = $("#averages ul .data");
                $("#averages h4").removeClass("hidden");

                $.each(items, function (i, elem) {
                    var classlist = elem.className.split(" ");
                    for (k in classlist) {
                        if (classlist[k] in avgs) {
                            var key = classlist[k];
                            var e = $(elem);
                            var val = Math.round(avgs[key] * 10) / 10;
                            e.text(val);
                            e.parents(".hidden").removeClass("hidden");
                            e.attr('title', key.replace(/_/g, ' '))
                        }
                    }
                });
            });
        }
        else {
            if (typeof(Mapper) != "undefined")
                Mapper.loadGeoJSON(0, 0);
            $("#averages ul li").addClass("hidden");
            $("#averages h4").addClass("hidden");
        }

    },
    updateLegend: function(pos) {
        this.updateLegendTimeout = null;
       // var pos = this.latestPosition; 
        var axes = plot.getAxes(); 
        if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max || 
            pos.y < axes.yaxis.min || pos.y > axes.yaxis.max) 
            return; 

        var i, j, dataset = plot.getData(); 
        for (i = 0; i < dataset.length; ++i) { 
            var series = dataset[i]; 

            // find the nearest points, x-wise 
            for (j = 0; j < series.data.length; ++j) 
                if (series.data[j][0] > pos.x) 
                    break; 

            // now interpolate 
            var y, p1 = series.data[j - 1], p2 = series.data[j];


            if (p1 == null) 
                y = p2[1]; 
            else if (p2 == null) 
                y = p1[1]; 
            else 
                y = p1[1] + (p2[1] - p1[1]) * (pos.x - p1[0]) / (p2[0] - p1[0]); 

            this.legends.eq(i).text(series.label.replace(/=.*/, "= " + y.toFixed(2))); 
        } 
    },
    showTooltip: function (x, y, contents) {
        $('<div class="tooltip" id="gtooltip">' + contents + '</div>').css( {
            position: 'absolute',
            display: 'none',
            top: y + 5,
            left: x + 5,
            padding: '2px',
            opacity: 0.80
        }).appendTo("body").fadeIn(100);
    },
    init: function(args) {
        this.datasets = args.datasets;
        var backendUrl = args.backendUrl;
        this.max_hr = args.max_hr;
        this.markings = args.markings;
        this.xaxisformatter = this.formatters[args.xaxisformatter];
        function evaluate(y,threshold) { 
            return y < threshold;
        }
        this.constraint0 = {
            threshold: this.max_hr*0.6,
            color: "rgb(240,240,240)",
            evaluate : evaluate
        }
        this.constraint1 = {
            threshold: this.max_hr*0.72,
            color: "rgb(204,204,204)",
            evaluate : evaluate
        }
        this.constraint2 = {
            threshold: this.max_hr*0.82,
            color: "rgb(51,102,255)",
            evaluate : evaluate
        }
        this.constraint3 = {
            threshold: this.max_hr*0.87,
            color: "rgb(102,204,0)",
            evaluate : evaluate
        }
        this.constraint4 = {
            threshold: this.max_hr*0.92,
            color: "rgb(255,153,0)",
            evaluate : evaluate
        }
        this.constraint5 = {
            threshold: this.max_hr*0.97,
            color: "rgb(255,0,0)",
            evaluate : evaluate
        }

        var that = this;
        this.backendUrl = backendUrl;
        this.choiceContainer = $("#choices");

        $.each(this.datasets, function(key, val) {
            var checked = "checked = checked";
            if (key == 'cadence') 
                checked = ''
            if (key == 'temp') 
                checked = ''
            if (key == 'power') 
                checked = ''

            that.choiceContainer.append('<input type="checkbox" name="' + key +
                '" ' + checked + ' id="chk_' + key + '"><label for="chk_' + key + 
                '">' + val.label + '</label></input>');
        });
        $("#reset_zoom").bind("click", function(evt) {
            evt.preventDefault();
            $("#scrollhacks").css("overflow", "hidden");
            $("#tripdiv").width( $("#tripdiv").width(980));
            that.plotAccordingToChoices({}); 
        });
        $("#enlarge").bind("click", function(evt) {
            evt.preventDefault();
            $("#scrollhacks").css("overflow", "scroll");
            $("#tripdiv").width( $("#tripdiv").width()*4);
        });
        this.choiceContainer.find("input").bind("click", function(evt) {
                that.plotAccordingToChoices({}); 
        });
        this.plotAccordingToChoices({});
        this.legends = $("#tripdiv .legendLabel"); 
        this.legends.each(function () { 
        // fix the widths so they don't jump around
            $(this).css('width', $(this).width());
        });

        var previousPoint = null;
        this.updateLegendTimeout = null;
        this.latestPosition = null;
        $("#tripdiv").bind("plothover", function (event, pos, item) {
//            that.latestPosition = pos; 
  //          if (!that.updateLegendTimeout) that.updateLegendTimeout = setTimeout(that.updateLegend, 50); 
//            that.updateLegend(pos);
            if (item) {
                // Move marker to current pos
                if (typeof(Mapper) != "undefined") {
                    if (route_points.length >= item.dataIndex) {

                        var x = route_points[item.dataIndex].x;
                        var y = route_points[item.dataIndex].y;
                        Mapper.updatePosMarker(x, y);
                    }
                }

                if (previousPoint != item.datapoint) {
                    previousPoint = item.datapoint;
                    
                    $("#gtooltip").remove();
                    var x = item.datapoint[0].toFixed(2),
                        y = item.datapoint[1].toFixed(2);
                    
                    that.showTooltip(item.pageX, item.pageY,
                    item.series.label + " at " + x + " is " + y);

                }
            }
            else {
                $("#gtooltip").remove();
                previousPoint = null;            
            }
        });


        $("#tripdiv").bind("plotclick", function (event, pos, item) {
            if (item) {
                $("#clickdata").text("You clicked point " + item.dataIndex + " in " + item.series.label + ".");
                plot.highlight(item.series, item.datapoint);
            }
        });


        $("#tripdiv").bind("plotselected", function (event, ranges) {
            that.plotAccordingToChoices(ranges);
        });
    }
};

