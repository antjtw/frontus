app.directive('d3Discount', ['d3', function(d3) {
    return {
        restrict: 'EA',
        scope: {
            data: "=",
            label: "@",
            onClick: "&"
        },
        link: function(scope, iElement, iAttrs) {

            var margin = {top: 20, right: 50, bottom: 50, left: 100},
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

                var color = d3.scale.category10();
                var maxy = 0;
                angular.forEach(data[0], function(value, key) {
                    maxy = d3.max(value) > maxy ? d3.max(value) : maxy;
                });
                var maxx = data[1][4];
                var minx = data[1][0];
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

                angular.forEach(data[0], function(value, key) {
                    //create the lines
                    var points = [];
                    var i = 0;
                    angular.forEach(value, function(y) {
                        points.push([y, data[1][i]]);
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
                            .attr("r", 3)
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
                    })

                });

                svg.append("text")
                    .attr("class", "x label")
                    .attr("text-anchor", "middle")
                    .attr("x", width/2)
                    .attr("y", height + 40)
                    .text("Exit Price");

                svg.append("text")
                    .attr("class", "y label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", -margin.left)
                    .attr("x",0 - (height / 2))
                    .attr("dy", "1em")
                    .style("text-anchor", "middle")
                    .text("Returns for Party");

            };
        }
    };
}]);