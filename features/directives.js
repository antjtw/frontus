app.directive('d3Discount', ['d3', 'calculate', function(d3, calculate) {
    return {
        restrict: 'EA',
        scope: {
            data: "=",
            label: "@",
            type: "@",
            onClick: "&",
            width: "="
        },
        link: function(scope, iElement, iAttrs) {

            var margin = {top: 60, right: 200, bottom: 90, left: 80},
                width = scope.width - margin.left - margin.right,
                height = 425 - margin.top - margin.bottom;

            var svg = d3.select(iElement[0])
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var div = d3.select(iElement[0])
                .append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

            var bisectX = d3.bisector(function(d) { return d.x; }).left;

            var formatAmount = function (amount) {
                var x = calculate.funcformatAmount(amount);
                return x != null ? x : 0;
            };

            var formatShortAmount = function (amount) {
                var decimal = calculate.funcformatAmount(amount);
                if (decimal) {
                    var nodecimal = decimal.split(".")[0];
                    return nodecimal
                }
                return decimal
            };


            scope.$watch('data', function(newVals, oldVals) {
                if (newVals) {
                    return scope.render(newVals);
                }
            }, true);

            scope.render = function(data){

                svg.selectAll('path').remove();
                svg.selectAll('g').remove();
                svg.selectAll('circle').remove();
                svg.selectAll('text').remove();
                svg.selectAll('rect').remove();

                var color = d3.scale.category10();
                var maxy = 0;
                var maxx = 0;
                var minx = Infinity;
                angular.forEach(data, function(value) {
                    maxy = value.y > maxy ? value.y : maxy;
                    maxx = value.x > maxx ? value.x : maxx;
                    minx = value.x < minx ? value.x : minx;
                });
                var y = d3.scale.linear().domain([0, maxy]).range([height, 0]);
                var x = d3.scale.linear().domain([minx, maxx]).range([0, width]);

                var line = d3.svg.line()
                    .x(function(d) { return x(d[1]);})
                    .y(function(d) { return y(d[0]); });

                if (scope.width < 480) {
                    var xAxis = d3.svg.axis()
                        .scale(x)
                        .ticks(1)
                        .orient("bottom");

                    var xTicks = d3.svg.axis()
                        .scale(x)
                        .ticks(1)
                        .tickSize(height)
                        .orient("bottom");
                } else {
                    var xAxis = d3.svg.axis()
                        .scale(x)
                        .ticks(5)
                        .orient("bottom");

                    var xTicks = d3.svg.axis()
                        .scale(x)
                        .ticks(5)
                        .tickSize(height)
                        .orient("bottom");
                }

                var yTicks = d3.svg.axis()
                    .scale(y)
                    .ticks(5)
                    .tickSize(width)
                    .orient("right");

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .ticks(5)
                    .orient("left");

                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);

                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis);

                var gy = svg.append("g")
                    .attr("class", "y ticks")
                    .call(yTicks)
                    .style("fill", "transparent");

                gy.selectAll("text")
                    .attr("display", "none");

                var gx = svg.append("g")
                    .attr("class", "x ticks")
                    .call(xTicks)
                    .style("fill", "transparent");

                gx.selectAll("text")
                    .attr("display", "none");

                var points = [];
                var altpoints = []
                var i = 0;
                angular.forEach(data, function(point) {
                    if (!isNaN(parseFloat(point.y)) && !isNaN(parseFloat(point.x))) {
                        points.push([point.y, point.x, point.hit, point.num]);
                        altpoints.push([point.altownership, point.x, point.hit, point.num]);
                    }
                    i++;
                });
                var linecolour = "#00c399";

                if (scope.type == "equity") {
                    var altpath = svg.append("path")
                        .attr("d", line(altpoints))
                        .attr("stroke", "#C6C6C6")
                        .style("stroke-width", 3)
                        .attr("stroke-dasharray","5,3")
                        .style("fill", "transparent");
                }

                angular.forEach(points, function(point) {
                    if (point[2] && point[3] != 0) {
                        svg.append("path")
                            .attr("d", "M " + x(point[1]) + " 0 L " + x(point[1]) + " " + height)
                            .attr("stroke", "red")
                            .attr("stroke-dasharray","3,3");
                        svg.append("text")
                            .attr("text-anchor", "middle")
                            .attr("class", "graph-flag")
                            .attr("x", 9)
                            .attr("dy", ".35em")
                            .attr("fill", "#C6C6C6")
                            .attr("shape-rendering", "crispEdges")
                            .text("Valuation Cap Activated")
                            .attr("transform", "translate(" + x(point[1]) + ",-15)");

                    }
                    svg.append("circle")
                        .data(point)
                        .attr("cx", function(d) {
                            return x(point[1]);
                        })
                        .attr("cy", function(d) {
                            return y(point[0]);
                        })
                        .attr("r", 0)
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
                        })
                        .style("stroke", linecolour)
                        .style("fill", "white");
                });

                var path = svg.append("path")
                    .attr("d", line(points))
                    .style("stroke", linecolour)
                    .style("stroke-width", 3)
                    .style("fill", "transparent");

                var totalLength = path.node().getTotalLength();

                path
                    .attr("stroke-dasharray", totalLength + " " + totalLength)
                    .attr("stroke-dashoffset", totalLength)
                    .transition()
                    .duration(300)
                    .ease("linear")
                    .attr("stroke-dashoffset", 0);

                var focus = svg.append("g")
                    .attr("class", "focus text-bubble");

                focus.append("circle")
                    .attr("r", 5);

                focus.append("rect")
                    .attr("width", 80)
                    .attr("height", 30)
                    .attr("rx", 3)
                    .attr("ry", 3)
                    .attr("transform", "translate(-40,-45)");

                focus.append("polygon")
                    .attr("points", "-8,-16 0,-8 8,-16");

                focus.append("text")
                    .attr("text-anchor", "middle")
                    .attr("x", 9)
                    .attr("dy", ".35em")
                    .attr("transform", "translate(-9,-30)");


                var headline = svg.append("g")
                    .attr("class", "headline");

                headline.append("text")
                    .attr("text-anchor", "middle")
                    .attr("x", 9)
                    .attr("dy", ".35em");

                var percentage = svg.append("g")
                    .attr("class", "headline");

                percentage.append("text")
                    .attr("text-anchor", "middle")
                    .attr("x", 9)
                    .attr("dy", ".35em");

                var totalvalue = svg.append("g")
                    .attr("class", "subheading");

                totalvalue.append("text")
                    .attr("text-anchor", "middle")
                    .attr("x", 9)
                    .attr("dy", ".35em")
                    .text("Converted Value")
                    .attr("transform", "translate(" + String(parseFloat(width) + 80) + "," + String(parseFloat(height)/2 - 75) + ")");

                if (scope.type == "discount") {
                    totalvalue.append("text")
                        .attr("text-anchor", "middle")
                        .attr("x", 9)
                        .attr("dy", ".35em")
                        .text("Ownership")
                        .attr("transform", "translate(" + String(parseFloat(width) + 80) + "," + String(parseFloat(height)/2 + 50) + ")");
                } else {
                    totalvalue.append("text")
                        .attr("text-anchor", "middle")
                        .attr("x", 9)
                        .attr("dy", ".35em")
                        .text("Post-money Valuation")
                        .attr("transform", "translate(" + String(parseFloat(width) + 80) + "," + String(parseFloat(height)/2 + 50) + ")");
                }


                svg.append("rect")
                    .attr("class", "overlay")
                    .attr("width", width)
                    .attr("height", height)
                    .on("mousemove", mousemove);

                var middlepoint = data[100];
                if (!isNaN(middlepoint.x) && !isNaN(middlepoint.y)) {
                    focus.attr("transform", "translate(" + x(middlepoint.x) + "," + y(middlepoint.y) + ")");
                    focus.select("text").text(formatAmount(middlepoint.y) + "%");

                    headline.attr("transform", "translate(" + String(parseFloat(width) + 80) + "," + String(parseFloat(height)/2 - 100) + ")");
                    headline.select("text").text(formatShortAmount(middlepoint.headline));

                    percentage.attr("transform", "translate(" + String(parseFloat(width) + 80) + "," + String((parseFloat(height)/2) + 25) + ")");

                    if (scope.type == "discount") {
                        percentage.select("text").text(formatAmount(middlepoint.percentage) + "%");
                    } else {
                        percentage.select("text").text(formatAmount(middlepoint.postmoney));
                    }
                } else {
                    focus.attr("display", "none");
                }



                function mousemove() {
                    var x0 = x.invert(d3.mouse(this)[0]),
                        i = bisectX(data, x0, 1),
                        d0 = data[i - 1],
                        d1 = data[i],
                        d = x0 - d0.date > d1.date - x0 ? d1 : d0;
                    focus.attr("transform", "translate(" + x(d.x) + "," + y(d.y) + ")");
                    focus.select("text")
                        .text(formatAmount(d.y) + "%");

                    headline.select("text").text(formatShortAmount(d.headline));

                    if (scope.type == "discount") {
                        percentage.select("text").text(formatAmount(d.percentage) + "%");
                    } else {
                        percentage.select("text").text(formatAmount(d.postmoney));
                    }
                }

                if (scope.type == "discount") {
                    svg.append("text")
                        .attr("class", "y label")
                        .attr("transform", "rotate(-90)")
                        .attr("y", (20-margin.left))
                        .attr("x",0 - (height / 2))
                        .attr("dy", "1em")
                        .style("text-anchor", "middle")
                        .text("Percentage Discount");

                    svg.append("text")
                        .attr("class", "x label")
                        .attr("text-anchor", "middle")
                        .attr("x", width/2)
                        .attr("y", height + 60)
                        .text("Qualified Financing Investment Amount");
                } else {
                    svg.append("text")
                        .attr("class", "y label")
                        .attr("transform", "rotate(-90)")
                        .attr("y", (20-margin.left))
                        .attr("x",0 - (height / 2))
                        .attr("dy", "1em")
                        .style("text-anchor", "middle")
                        .text("Ownership (%)");

                    svg.append("text")
                        .attr("class", "x label")
                        .attr("text-anchor", "middle")
                        .attr("x", width/2)
                        .attr("y", height + 60)
                        .text("Pre-money Valuation");
                }


            };
        }
    };
}]);