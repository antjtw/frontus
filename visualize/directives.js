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