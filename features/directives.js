app.directive('d3Discount', ['d3', function(d3) {
    return {
        restrict: 'EA',
        scope: {
            data: "=",
            label: "@",
            onClick: "&"
        },
        link: function(scope, iElement, iAttrs) {

            var margin = {top: 20, right: 150, bottom: 50, left: 50},
                width = 700 - margin.left - margin.right,
                height = 350 - margin.top - margin.bottom;

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

            var bisectX = d3.bisector(function(d) { return d.x; }).left


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

                var points = [];
                var i = 0;
                angular.forEach(data, function(point) {
                    if (!isNaN(parseFloat(point.y)) && !isNaN(parseFloat(point.x))) {
                        points.push([point.y, point.x]);
                    }
                    i++;
                });
                var linecolour = color(points);

                svg.append("path")
                    .attr("d", line(points))
                    .style("stroke", linecolour)
                    .style("stroke-width", 1)
                    .style("fill", "transparent");

                angular.forEach(points, function(point) {
                    svg.append("circle")
                        .data(point)
                        .attr("cx", function(d) {
                            return x(point[1]);
                        })
                        .attr("cy", function(d) {
                            return y(point[0]);
                        })
                        .attr("r", 0.1)
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
                    .attr("class", "focus")
                    .style("display", "none");

                focus.append("circle")
                    .attr("r", 4.5);

                focus.append("text")
                    .attr("x", 9)
                    .attr("dy", ".35em");

                var headline = svg.append("g")
                    .attr("class", "headline")
                    .style("display", "none");

                headline.append("text")
                    .attr("x", 9)
                    .attr("dy", ".35em");

                var percentage = svg.append("g")
                    .attr("class", "headline")
                    .style("display", "none");

                percentage.append("text")
                    .attr("x", 9)
                    .attr("dy", ".35em");


                svg.append("rect")
                    .attr("class", "overlay")
                    .attr("width", width)
                    .attr("height", height)
                    .on("mouseover", function() {
                        focus.style("display", null);
                        headline.style("display", null);
                        percentage.style("display", null);
                    })
                    .on("mouseout", function() {
                        focus.style("display", "none");
                        headline.style("display", "none");
                        percentage.style("display", "none");
                    })
                    .on("mousemove", mousemove);

                function mousemove() {
                    var x0 = x.invert(d3.mouse(this)[0]),
                        i = bisectX(data, x0, 1),
                        d0 = data[i - 1],
                        d1 = data[i],
                        d = x0 - d0.date > d1.date - x0 ? d1 : d0;
                    focus.attr("transform", "translate(" + x(d.x) + "," + y(d.y) + ")");
                    focus.select("text").text(d.y);

                    headline.attr("transform", "translate(" + String(parseFloat(width) + 20) + "," + String(parseFloat(height)/2) + ")");
                    headline.select("text").text(d.headline);

                    percentage.attr("transform", "translate(" + String(parseFloat(width) + 20) + "," + String((parseFloat(height)/2) + 50) + ")");
                    percentage.select("text").text(d.percentage);
                }


                svg.append("text")
                    .attr("class", "x label")
                    .attr("text-anchor", "middle")
                    .attr("x", width/2)
                    .attr("y", height + 40)
                    .text("Investment amount");

                svg.append("text")
                    .attr("class", "y label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", -margin.left)
                    .attr("x",0 - (height / 2))
                    .attr("dy", "1em")
                    .style("text-anchor", "middle")
                    .text("Percentage Discount");

            };
        }
    };
}]);