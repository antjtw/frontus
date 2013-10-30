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
                .outerRadius(radius- 40)
                .innerRadius(radius - 60);

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

            console.log(iElement[0]);
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
                        .style("fill", function(d) { return color(d.data.percent); });


                    g.append("svg:text")
                        .attr("transform", function(d) {
                            var c = arc.centroid(d),
                                x = c[0],
                                y = c[1],
                            // pythagorean theorem for hypotenuse
                                h = Math.sqrt(x*x + y*y);
                            return "translate(" + (x/h * labelr) +  ',' +
                                (y/h * labelr) +  ")";
                        })
                        .attr("dy", ".35em")
                        .attr("text-anchor", function(d) {
                            // are we past the center?
                            return (d.endAngle + d.startAngle)/2 > Math.PI ?
                                "end" : "start";
                        })
                        .text(function(d, i) { return d.data.name});

                    g.append("svg:text")
                        .attr("transform", function(d) {
                            var c = arc.centroid(d),
                                x = c[0],
                                y = c[1],
                            // pythagorean theorem for hypotenuse
                                h = Math.sqrt(x*x + y*y);
                            return "translate(" + (x/h * labelr) +  ',' +
                                ((y/h * labelr) + 12) +  ")";
                        })
                        .attr("dy", ".35em")
                        .attr("text-anchor", function(d) {
                            // are we past the center?
                            return (d.endAngle + d.startAngle)/2 > Math.PI ?
                                "end" : "start";
                        })
                        .text(function(d, i) { return d.data.percent.toFixed(2) + "%"});
                }

            };
        }
    };
}]);