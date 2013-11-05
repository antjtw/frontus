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

            var width = 300,
                height = 200,
                radius = Math.min(width, height) / 2;

            var labelr = radius-25;

            var color = d3.scale.ordinal()
                .range(["#1ABC96", "#F78D1E", "#3498DB", "#FFBB00"]);

            var arc = d3.svg.arc()
                .outerRadius(radius- 10)
                .innerRadius(radius - 40);

            var pie = d3.layout.pie()
                .sort(null)
                .value(function(d) { return d.percent; });


            // Exploding displacement
            var displace = function(d, axis) {
                // Calculate angle bisector
                var ang = d.startAngle + (d.endAngle - d.startAngle)/2;
                // Transformate to SVG space
                ang = (ang - (Math.PI / 2) ) * -1;

                if (ang > 3.14) {
                     return 1;
                }
                else {
                    return -1;
                }
            };

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


                    g.append("path")
                        .attr("d", arc)
                        .attr("transform", function(d) { return "translate(0,0)"; })
                        .style("fill", function(d) { return color(d.data.percent); })
                        .on("mouseenter", function(d) {
                            label = g.append("text")
                                .attr("transform", function(d) {
                                    return "translate(0,15)";
                                })
                                .attr("dy", ".5em")
                                .style("text-anchor", "middle")
                                .style("fill", "blue")
                                .attr("class", "on")
                                .text(d.data.name);

                            text = g.append("text")
                                .attr("transform", arc.centroid(d))
                                .attr("dy", ".5em")
                                .style("text-anchor", "middle")
                                .style("fill", "blue")
                                .attr("class", "on")
                                .text(d.data.percent.toFixed(2) + "%");
                        })

                        .on("mouseout", function(d) {
                            label.remove();
                            text.remove();
                        });
                }

            };
        }
    };
}]);