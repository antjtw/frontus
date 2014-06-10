app.directive('d3Discount', ['d3', 'calculate', function(d3, calculate) {
    return {
        restrict: 'EA',
        scope: {
            data: "=",
            label: "@",
            onClick: "&"
        },
        link: function(scope, iElement, iAttrs) {

            var margin = {top: 60, right: 200, bottom: 90, left: 80},
                width = 763 - margin.left - margin.right,
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
                return calculate.funcformatAmount(amount);
            };

            var formatShortAmount = function (amount) {
                var decimal = calculate.funcformatAmount(amount);
                var nodecimal = decimal.split(".")[0];
                return nodecimal
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


                var xAxis = d3.svg.axis()
                    .scale(x)
                    .ticks(5)
                    .orient("bottom");

                var xTicks = d3.svg.axis()
                    .scale(x)
                    .ticks(5)
                    .tickSize(height)
                    .orient("bottom");

                var yTicks = d3.svg.axis()
                    .scale(y)
                    .tickSize(width)
                    .orient("right");

                var yAxis = d3.svg.axis()
                    .scale(y)
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
                var i = 0;
                angular.forEach(data, function(point) {
                    if (!isNaN(parseFloat(point.y)) && !isNaN(parseFloat(point.x))) {
                        points.push([point.y, point.x]);
                    }
                    i++;
                });
                var linecolour = "#00c399";

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

                angular.forEach(points, function(point) {
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

                var focus = svg.append("g")
                    .attr("class", "focus");

                focus.append("circle")
                    .attr("r", 5);

                focus.append("text")
                    .attr("x", 9)
                    .attr("dy", ".35em");

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
                    .attr("transform", "translate(" + String(parseFloat(width) + 80) + "," + String(parseFloat(height)/2 - 25) + ")");

                var totalvalue = svg.append("g")
                    .attr("class", "subheading");

                totalvalue.append("text")
                    .attr("text-anchor", "middle")
                    .attr("x", 9)
                    .attr("dy", ".35em")
                    .text("Ownership")
                    .attr("transform", "translate(" + String(parseFloat(width) + 80) + "," + String(parseFloat(height)/2 + 75) + ")");


                svg.append("rect")
                    .attr("class", "overlay")
                    .attr("width", width)
                    .attr("height", height)
                    .on("mousemove", mousemove);

                var middlepoint = data[100];
                if (!isNaN(middlepoint.x) && !isNaN(middlepoint.y)) {
                    focus.attr("transform", "translate(" + x(middlepoint.x) + "," + y(middlepoint.y) + ")");
                    focus.select("text").text(formatAmount(middlepoint.y) + "%");

                    headline.attr("transform", "translate(" + String(parseFloat(width) + 80) + "," + String(parseFloat(height)/2 - 50) + ")");
                    headline.select("text").text(formatShortAmount(middlepoint.headline));

                    percentage.attr("transform", "translate(" + String(parseFloat(width) + 80) + "," + String((parseFloat(height)/2) + 50) + ")");
                    percentage.select("text").text(formatAmount(middlepoint.percentage) + "%");
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
                    focus.select("text").text(formatAmount(d.y) + "%");

                    headline.attr("transform", "translate(" + String(parseFloat(width) + 80) + "," + String(parseFloat(height)/2 - 50) + ")");
                    headline.select("text").text(formatShortAmount(d.headline));

                    percentage.attr("transform", "translate(" + String(parseFloat(width) + 80) + "," + String((parseFloat(height)/2) + 50) + ")");
                    percentage.select("text").text(formatAmount(d.percentage) + "%");
                }


                svg.append("text")
                    .attr("class", "x label")
                    .attr("text-anchor", "middle")
                    .attr("x", width/2)
                    .attr("y", height + 60)
                    .text("Investment amount");

                svg.append("text")
                    .attr("class", "y label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", (20-margin.left))
                    .attr("x",0 - (height / 2))
                    .attr("dy", "1em")
                    .style("text-anchor", "middle")
                    .text("Percentage Discount");

            };
        }
    };
}]);