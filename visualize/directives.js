var visualize = angular.module('vizDirectives', []);

visualize.directive('d3Bars', ['d3', function(d3) {
        return {
            restrict: 'EA',
            scope: {
                data: "=",
                label: "@",
                onClick: "&"
            },
            link: function(scope, iElement, iAttrs) {
                var svg = d3.select(iElement[0])
                    .append("svg")
                    .style("background-color", "f1f1f1")
                    .attr("width", 200)
                    .attr('height', 20);

                scope.$watch('data', function(newVals, oldVals) {
                    return scope.render(newVals);
                }, true);

                scope.render = function(data){

                    //create the rectangles for the bar chart
                    svg.append("rect")
                        .style("stroke", "gray")
                        .style("fill", "black")
                        .attr("height", 20) // height of each bar
                        .attr("width", data.percent*2)
                };
            }
        };
    }]);

visualize.directive('d3Linechart', ['d3', function(d3) {
    return {
        restrict: 'EA',
        scope: {
            data: "=",
            label: "@",
            onClick: "&"
        },
        link: function(scope, iElement, iAttrs) {
            var svg = d3.select(iElement[0])
                .append("svg")
                .attr("width", 660)
                .attr('height', 300);

            var g = svg.append("svg:g")
                .attr("transform", "translate(60, 300)");


            scope.$watch('data', function(newVals, oldVals) {
                if (newVals) {
                    return scope.render(newVals);
                }
            }, true);

            scope.render = function(data){

                svg.selectAll('path').remove();
                svg.selectAll('text.yLabel').remove();
                svg.selectAll('text.xLabel').remove();

                var color = d3.scale.category10();
                var margin = 20;
                var maxy = 0;
                angular.forEach(data[0], function(value, key) {
                     maxy = d3.max(value) > maxy ? d3.max(value) : maxy;
                });
                var maxx = data[1][4];
                var minx = data[1][0]
                var y = d3.scale.linear().domain([0, maxy]).range([0 + margin, 300 - margin]);
                var x = d3.scale.linear().domain([minx, maxx]).range([0 + margin, 600 - margin]);

                var line = d3.svg.line()
                    .x(function(d) { return x(d[1]);})
                    .y(function(d) { return -1 * y(d[0]); });

                angular.forEach(data[0], function(value, key) {
                    //create the lines
                    var points = []
                    var i = 0;
                    angular.forEach(value, function(y) {
                        points.push([y, data[1][i]]);
                        i++;
                    });
                    g.append("svg:path")
                        .attr("d", line(points))
                        .style("stroke", color(points))
                        .style("stroke-width", 2)
                        .style("fill", "transparent");
                });

                g.append("svg:line")
                    .attr("x1", x(minx))
                    .attr("y1", -1 * y(0))
                    .attr("x2", x(maxx))
                    .attr("y2", -1 * y(0))
                    .style("stroke", "black")
                    .style("stroke-width", 1);

                g.append("svg:line")
                    .attr("x1", x(minx))
                    .attr("y1", -1 * y(0))
                    .attr("x2", x(minx))
                    .attr("y2", -1 * y(maxy))
                    .style("stroke", "black")
                    .style("stroke-width", 1);

                g.selectAll(".xLabel")
                    .data(x.ticks(5))
                    .enter().append("svg:text")
                    .attr("class", "xLabel")
                    .text(String)
                    .attr("x", function(d) { return x(d) })
                    .attr("y", 0)
                    .attr("text-anchor", "middle")

                g.selectAll(".yLabel")
                    .data(y.ticks(4))
                    .enter().append("svg:text")
                    .attr("class", "yLabel")
                    .text(String)
                    .attr("x", 0)
                    .attr("y", function(d) { return -1 * y(d) })
                    .attr("text-anchor", "end")
                    .attr("dy", 4)
                    .attr("dx", 15)
            };
        }
    };
}]);