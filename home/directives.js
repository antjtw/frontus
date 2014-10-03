'use strict';

var app = angular.module('homeDirectives', []);

app.directive('d3expdonut', ['d3', function(d3) {
    return {
        restrict: 'EA',
        scope: {
            data: "=",
            label: "@",
            onClick: "&",
            nosort: "@"
        },
        link: function(scope, iElement, iAttrs) {

            var width = 180,
                height = 180,
                radius = Math.min(width, height) / 2;

            scope.$watch('data', function(newVals, oldVals) {
                return scope.render(newVals);
            }, true);

            scope.render = function(data){


            if (data && data[0] && !isNaN(data[0].percent)) {

                var vis = d3.select(iElement[0])
                    .append('svg')
                    .attr("width", width)
                    .attr("height", height)
                    .append("g")
                    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

                var myScale = d3.scale.linear().domain([0, 100]).range([0, 2 * Math.PI]);



                var arc = d3.svg.arc()
                    .innerRadius(radius-10)
                    .outerRadius(radius-30)
                    .startAngle(myScale(data[1].percent))
                    .endAngle(myScale(data[0].percent+data[1].percent));

                var arc2 = d3.svg.arc()
                    .innerRadius(radius-10)
                    .outerRadius(radius-30)
                    .startAngle(0)
                    .endAngle(360);

                vis.append("path")
                    .attr("d", arc2)
                    .attr("transform", "translate(0,0)")
                    .style("fill", "#C7C7C7");

                vis.append("path")
                    .attr("d", arc)
                    .attr("transform", "translate(0,0)")
                    .style("fill", "#1ABC96");

                vis.append("text")
                    .attr("transform", function() {
                        return "translate(0,10)";
                    })
                    .attr("dy", ".5em")
                    .style("text-anchor", "middle")
                    .attr("class", "mainlabel");

                vis.append("text")
                    .attr("transform", function() {
                        return "translate(0,-15)";
                    })
                    .attr("dy", ".5em")
                    .style("text-anchor", "middle")
                    .style("font-size", "30px")
                    .attr("class", "percentlabel");

                vis.select(".mainlabel")
                    .text('Ownership');
                vis.select(".percentlabel")
                    .text(data[0].percent.toFixed(1)+'%');
                }
            };
        }
	}
}]);

app.directive('d3multidonut', ['d3', function(d3) {
    return {
        restrict: 'EA',
        scope: {
            data: "=",
            label: "@",
            onClick: "&",
            nosort: "@"
        },
        link: function(scope, iElement, iAttrs) {

            var width = 180,
                height = 180,
                radius = Math.min(width, height) / 2;

            var colors = ["#1ABC96", "#3498DB", "F78D1E", "#34495E", "#FFBB00", "#2676AB"];
            var corecolor = function(i) {
                if (i > 5) {
                    return i % 5 == 0 ? colors[5] : colors[i % 5];
                }
                else {
                    return colors[i];
                }
            };

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

                svg.selectAll('path').remove();
                svg.selectAll('g').remove();
                svg.selectAll('circle').remove();
                svg.selectAll('text').remove();
                svg.selectAll('rect').remove();

                if (data && data[0] && !isNaN(data[0].percent)) {

                    data.sort(function(a, b) { return b.percent - a.percent; });

                    var g = svg.selectAll(".arc")
                        .data(pie(data))
                        .enter().append("g")
                        .attr("class", "arc");

                    g.append("text")
                        .attr("transform", function() {
                            return "translate(0,10)";
                        })
                        .attr("dy", ".5em")
                        .style("text-anchor", "middle")
                        .attr("class", "mainlabel");

                    g.append("text")
                        .attr("transform", function() {
                            return "translate(0,-15)";
                        })
                        .attr("dy", ".5em")
                        .style("text-anchor", "middle")
                        .attr("class", "percentlabel");

                    svg.select(".mainlabel")
                        .text('Ownership');
                    svg.select(".percentlabel")
                        .text('100%');

                    g.append("path")
                        .attr("d", arc)
                        .attr("transform", function() { return "translate(0,0)"; })
                        .style("fill", function(d , i) {
                            return corecolor(i); })
                        .attr("class", "pie-slices")
                        .on("mouseover", function(d, i) {
                            var colour = corecolor(i);
                            var current = this;
                            svg.selectAll(".pie-slices").transition()
                                .duration(250)
                                .style("fill", function() {
                                    return (this === current) ? colour : "gray";
                                })
                                .style("opacity", function() {
                                    return (this === current) ? 1 : 0.5;
                                });

                            svg.select(".mainlabel")
                                .text(d.data.name);

                            svg.select('.percentlabel')
                                .text(d.data.percent.toFixed(2) + "%");
                        })

                        .on("mouseout", function(d) {
                            svg.selectAll(".pie-slices").transition()
                                .duration(250)
                                .style("fill", function(d , i) {
                                    return corecolor(i); })
                                .style("opacity", function() {
                                    return 1;
                                });

                            svg.select(".mainlabel")
                                .text('Ownership');

                            svg.select(".percentlabel")
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
                //.sort(null)
/*                .startAngle(-1.57079633)
                .endAngle(4.71238898)*/
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

                if (data && data.length > 1) {
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
                        .text(data[0].percent + "%");

                    g.append("path")
                        .attr("d", arc)
                        .attr("transform", function(d) { return "translate(0,0)"; })
                        .style("fill", function(d , i) {
                            return i == 0 ? "#1abc96" : "#E2E2E2";})
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
/*                .startAngle(-1.57079633)
                .endAngle(4.71238898)*/
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

                if (data && (data[0].units > 0 || data[1].units > 1)) {

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
                        .attr("class", "unitslabel")
                        .text(data[0].roundedunits);

                    g.append("path")
                        .attr("d", arc)
                        .attr("transform", function(d) { return "translate(0,0)"; })
                        .style("fill", function(d , i) {
                            return i == 0 ? "#1abc96" : "#E2E2E2";})
                        .attr("class", "pie-slices");

                }

            };
        }
    };
}]);



app.directive('companyOwnershipTile', [function() {
    return {
        scope: {
        },
        templateUrl: '/home/companyOwnershipTile.html',
        controller: ['navState', 'captable', '$scope', '$location',
            function(navState, captable, $scope, $location) {
                $scope.totalIssued = 0;

                $scope.ct = captable.getCapTable();

                $scope.graphdata = [];
                $scope.loaded = false;
                captable.captableLoaded().then(function() {
                    $scope.loaded = true;
                });


                $scope.$watch('ct.securities', function(newval, oldval) {
                    if (newval.length > 0) {
                        $scope.generateSecurityGraph();
                        $scope.totalIssued = captable.totalOwnershipUnits();
                        $scope.currentRole = navState.role;
                    }
                }, true);

                $scope.gotopage = function (link){
                    $location.url(link);
                };

                $scope.fullScreen = function() {
                    document.getElementById("vid-pic").style.visibility="hidden";
                };

                $scope.generateSecurityGraph = function() {
                    $scope.graphdata = [];
                    var maxPercent = 0;
                    var percent;

                    angular.forEach($scope.ct.securities, function(security) {
                        percent = (((captable.securityTotalUnits(security) + captable.numUnissued(security)) /  captable.totalOwnershipUnits()) * 100);
                        // TODO: only push if percent > 0 and graphdata.length < 3 (the max we show anyway)
                        $scope.graphdata.push([{'name': security.name, 'issued': captable.securityTotalUnits(security), 'amount': captable.securityTotalAmount(security)}, [{'name':security.name, 'percent':percent}, {'name':'whatever', 'percent':maxPercent}, {'name':'zero', 'percent': 0}]]);
                        maxPercent += percent;
                    });
                };
            }
        ],
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

            var margin = {top: 20, right: 20, bottom: 50, left: 60},
                width = 480 - margin.left - margin.right,
                height = 260 - margin.top - margin.bottom;

            var x = d3.scale.ordinal()
                .rangeRoundBands([0, width], 0.1);

            var y = d3.scale.linear()
                .range([height, 0]);

            var xAxis = d3.svg.axis()
                .scale(x)
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
                if (data && data.length > 0) {

                    svg.selectAll('path').remove();
                    svg.selectAll('g').remove();
                    svg.selectAll('circle').remove();
                    svg.selectAll('text').remove();
                    svg.selectAll('rect').remove();

                    data.sort(function(a, b){
                        if(a.date < b.date) return -1;
                        if(a.date > b.date) return 1;
                        return 0;
                    });
                    x.domain(data.map(function(d) { return d.month; }));
                    var max = d3.max(data, function(d) { return parseFloat(d.units); });
                    y.domain([0, max]);

                    svg.append("g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(0," + height + ")")
                        .call(xAxis)
                            .selectAll("text")
                            .style("text-anchor", "end")
                            .attr("dx", "-.8em")
                            .attr("dy", ".15em")
                            .attr("transform", function(d) {
                                return "rotate(-65)";
                            });

                    svg.append("g")
                        .attr("class", "y axis")
                        .call(yAxis)
                        .append("text")
                        .attr("transform", "rotate(-90)")
                        .attr("y", 6)
                        .attr("dy", ".71em")
                        .style("text-anchor", "end");

                    svg.selectAll(".bar")
                        .data(data)
                        .enter().append("rect")
                        .attr("class", "bar")
                        .attr("x", function(d) { return x(d.date); })
                        .attr("width", x.rangeBand())
                        .attr("y", function(d) { return y(d.units); })
                        .attr("height", function(d) { return height - y(d.units); })
                        .style("fill", function(d) {
                            return d.vested >= 0 ? "#1abc96" : "#E2E2E2";})
                        .on("mouseover", function(d) {
                            var xPosition = parseFloat(d3.select(this).attr("x")) + (x.rangeBand() / 2) + 15;
                            var yPosition = parseFloat(d3.select(this).attr("y")) - 30;

                            d3.select("#tooltip")
                                .style("left", xPosition + "px")
                                .style("top", yPosition + "px")
                                .select("#date")
                                .text(d.date.toString('MMM yy'));

                            d3.select("#tooltip")
                                .select("#value")
                                .text(d.units);

                            d3.select("#tooltip").classed("hidden", false);
                        })
                        .on("mouseout", function() {
                            d3.select("#tooltip").classed("hidden", true);

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
