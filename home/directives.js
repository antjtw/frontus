var app = angular.module('homeDirectives', []);

app.directive('d3expdonut', ['d3', function(d3) {
    return {
        restrict: 'EA',
        scope: {
            data: "=",
            label: "@",
            onClick: "&"
        },
        link: function(scope, iElement, iAttrs) {

            var width = 180,
                height = 180,
                radius = Math.min(width, height) / 2;

            var labelr = radius-25;

            var color = d3.scale.ordinal()
                .range(["#1ABC96", "#F78D1E", "#3498DB", "#FFBB00"]);

            var arc = d3.svg.arc()
                .outerRadius(radius- 10)
                .innerRadius(radius - 30);

            var pie = d3.layout.pie()
                .sort(function(a, b) { return b.percent - a.percent; })
                .value(function(d) { return d.percent; });


            // Exploding displacement
            var arcOver = d3.svg.arc()
                .outerRadius(radius - 5)
                .innerRadius(radius- 25);

            var svg = d3.select(iElement[0])
                .append('svg')
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

            scope.$watch('data', function(newVals, oldVals) {
                return scope.render(newVals);
            }, true);

            scope.render = function(data){

                if (data) {
                    console.log(data);

                    var g = svg.selectAll(".arc")
                        .data(pie(data))
                        .enter().append("g")
                        .attr("class", "arc");

                    g.append("text")
                        .attr("transform", function(d) {
                            return "translate(0,10)";
                        })
                        .attr("dy", ".5em")
                        .style("text-anchor", "middle")
                        .attr("class", "mainlabel");

                    g.append("text")
                        .attr("transform", function(d) {
                            return "translate(0,-15)";
                        })
                        .attr("dy", ".5em")
                        .style("text-anchor", "middle")
                        .attr("class", "percentlabel");

                    d3.select(".mainlabel")
                        .text('Ownership');
                    d3.select(".percentlabel")
                        .text('100%');

                    g.append("path")
                        .attr("d", arc)
                        .attr("transform", function(d) { return "translate(0,0)"; })
                        .style("fill", function(d , i) {
                            return color(d.data.percent); })
                        .attr("class", "pie-slices")
                        .on("mouseover", function(d) {
                            var colour = color(d.data.percent);
                            var current = this;
                            d3.selectAll(".pie-slices").transition()
                                .duration(250)
                                .style("fill", function() {
                                    return (this === current) ? colour : "gray";
                                })
                                .style("opacity", function() {
                                return (this === current) ? 1 : 0.5;
                                });

                            d3.select(".mainlabel")
                                .text(d.data.name);

                            d3.select('.percentlabel')
                                .text(d.data.percent.toFixed(2) + "%");
                        })

                        .on("mouseout", function(d) {
                            d3.selectAll(".pie-slices").transition()
                                .duration(250)
                                .style("fill", function(d , i) {
                                    return color(d.data.percent); })
                                .style("opacity", function() {
                                    return 1;
                                });

                            d3.select(".mainlabel")
                                .text('Ownership');

                            d3.select(".percentlabel")
                                .text('100%');
                        });
                }

            };
        }
    };
}]);

app.directive('d3myownership', ['d3', function(d3) {
    return {
        restrict: 'EA',
        scope: {
            data: "=",
            label: "@",
            onClick: "&"
        },
        link: function(scope, iElement, iAttrs) {

            var width = 130,
                height = 130,
                radius = Math.min(width, height) / 2;

            var color = d3.scale.ordinal()
                .range(["#1ABC96", "#F78D1E", "#3498DB", "#FFBB00"]);

            var arc = d3.svg.arc()
                .outerRadius(radius)
                .innerRadius(radius - 15);

            var pie = d3.layout.pie()
                .sort(function(a, b) { return b.percent - a.percent; })
                .startAngle(-1.57079633)
                .endAngle(4.71238898)
                .value(function(d) { return d.percent; });


            var svg = d3.select(iElement[0])
                .append('svg')
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

            scope.$watch('data', function(newVals, oldVals) {
                return scope.render(newVals);
            }, true);

            scope.render = function(data){

                if (data) {

                    var g = svg.selectAll(".arc")
                        .data(pie(data))
                        .enter().append("g")
                        .attr("class", "arc");

                    g.append("text")
                        .attr("transform", function(d) {
                            return "translate(0,10)";
                        })
                        .attr("dy", ".5em")
                        .style("text-anchor", "middle")
                        .attr("class", "mainlabel")
                        .text('Ownership');

                    g.append("text")
                        .attr("transform", function(d) {
                            return "translate(0,-15)";
                        })
                        .attr("dy", ".5em")
                        .style("text-anchor", "middle")
                        .attr("class", "percentlabel")
                        .text(data[0].percent.toFixed(2) + "%");

                    g.append("path")
                        .attr("d", arc)
                        .attr("transform", function(d) { return "translate(0,0)"; })
                        .style("fill", function(d , i) {
                            return i == 0 ? "#1abc96" : "#E2E2E2"})
                        .attr("class", "pie-slices");

                }

            };
        }
    };
}]);

app.directive('d3myvested', ['d3', function(d3) {
    return {
        restrict: 'EA',
        scope: {
            data: "=",
            label: "@",
            onClick: "&"
        },
        link: function(scope, iElement, iAttrs) {

            var width = 130,
                height = 130,
                radius = Math.min(width, height) / 2;

            var arc = d3.svg.arc()
                .outerRadius(radius)
                .innerRadius(radius - 15);

            var pie = d3.layout.pie()
                .sort(null)
                .startAngle(-1.57079633)
                .endAngle(4.71238898)
                .value(function(d) { return d.units; });


            var svg = d3.select(iElement[0])
                .append('svg')
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

            scope.$watch('data', function(newVals, oldVals) {
                return scope.render(newVals);
            }, true);

            scope.render = function(data){

                if (data) {

                    var g = svg.selectAll(".arc")
                        .data(pie(data))
                        .enter().append("g")
                        .attr("class", "arc");

                    g.append("text")
                        .attr("transform", function(d) {
                            return "translate(0,10)";
                        })
                        .attr("dy", ".5em")
                        .style("text-anchor", "middle")
                        .attr("class", "mainlabel")
                        .text('Vested');

                    g.append("text")
                        .attr("transform", function(d) {
                            return "translate(0,-15)";
                        })
                        .attr("dy", ".5em")
                        .style("text-anchor", "middle")
                        .attr("class", "percentlabel")
                        .text(data[0].units);

                    g.append("path")
                        .attr("d", arc)
                        .attr("transform", function(d) { return "translate(0,0)"; })
                        .style("fill", function(d , i) {
                            return i == 0 ? "#1abc96" : "#E2E2E2"})
                        .attr("class", "pie-slices");

                }

            };
        }
    };
}]);

app.directive('d3vestedbar', ['d3', function(d3) {
    return {
        restrict: 'EA',
        scope: {
            data: "=",
            label: "@",
            onClick: "&"
        },
        link: function(scope, iElement, iAttrs) {

            var margin = {top: 20, right: 20, bottom: 30, left: 60},
                width = 440 - margin.left - margin.right,
                height = 260 - margin.top - margin.bottom;

            var x = d3.scale.ordinal()
                .rangeRoundBands([0, width], .1);

            var y = d3.scale.linear()
                .range([height, 0]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .tickValues(x.month)
                .orient("bottom");

            var yAxis = d3.svg.axis()
                .scale(y)
                .ticks(4)
                .orient("left");

            var yTicks = d3.svg.axis()
                .scale(y)
                .tickSize(width)
                .ticks(4)
                .orient("right");

            var svg = d3.select(iElement[0])
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var gy = svg.append("g")
                .attr("class", "yticks")
                .call(yTicks)
                .style("fill", "transparent");

            gy.selectAll("text")
                .attr("display", "none");

            var div = d3.select(iElement[0])
                .append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

            scope.$watch('data', function(newVals, oldVals) {
                return scope.render(newVals);
            }, true);

            scope.render = function(data){

                if (data) {

                    x.domain(data.map(function(d) { return d.date; }));
                    y.domain([0, d3.max(data, function(d) { return d.units; })]);

                    svg.append("g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(0," + height + ")")
                        .call(xAxis);

                    svg.append("g")
                        .attr("class", "y axis")
                        .call(yAxis)
                        .append("text")
                        .attr("transform", "rotate(-90)")
                        .attr("y", 6)
                        .attr("dy", ".71em")
                        .style("text-anchor", "end")

                    svg.selectAll(".bar")
                        .data(data)
                        .enter().append("rect")
                        .attr("class", "bar")
                        .attr("x", function(d) { return x(d.date); })
                        .attr("width", x.rangeBand())
                        .attr("y", function(d) { return y(d.units); })
                        .attr("height", function(d) { return height - y(d.units); })
                        .style("fill", function(d) {
                            return d.vested == 0 ? "#1abc96" : "#E2E2E2"})
                        .on("mouseover", function(d) {
                            div.transition()
                                .duration(200)
                                .style("opacity", .9);
                            div.html(String(d))
                                .style("left", (d3.event.pageX) + "px")
                                .style("top", (d3.event.pageY - 28) + "px");
                        })
                        .on("mouseout", function(d) {
                            div.transition()
                                .duration(200)
                                .style("opacity", 0);
                        });

                    svg.append("text")
                        .attr("class", "y label")
                        .attr("transform", "rotate(-90)")
                        .attr("y", -margin.left)
                        .attr("x",0 - (height / 2))
                        .attr("dy", "1em")
                        .style("text-anchor", "middle")
                        .text("Shares");

                }

            };
        }
    };
}]);