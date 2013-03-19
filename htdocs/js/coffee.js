function createTable (where, people) {
  var i, j;

  var table = $("<table>").attr("border", 1);

  var head = $("<tr>");
  head.append($("<th>").html('&nbsp;'));

  for (i = 0; i < people.length; i++) {
    head.append($("<th>").html(people[i]));
  }
  table.append(head);

  for (i = 0; i < people.length; i++) {
    var row = $("<tr>");
    var who = $("<strong>").html(people[i]);
    row.append($("<td>").append(who));

    for (j = 0; j < people.length; j++) {
      var coffee = $("<td>");
      if (i === j) {
        coffee.html("&nbsp;");
      } else {
        // <td><a href="#"><i class="icon-arrow-up"></i></a><span id="aaron-court">0</span><i class="icon-coffee"></i><a href="#"><i class="icon-arrow-down"></i></a></td>
        var up = $("<a>")
                 .attr("id", people[i].toLowerCase() + "_" + people[j].toLowerCase() + "_up")
                 .attr("href", "#");
        up.append($("<i>").attr("class", "icon-arrow-up"));

        var count = $("<span>")
                  .attr("id", people[i].toLowerCase() + "_" + people[j].toLowerCase() + "_count")
                  .html("0")
                  .append($("<i>").attr("class", "icon-coffee"));

        var down = $("<a>")
                 .attr("id", people[i].toLowerCase() + "_" + people[j].toLowerCase() + "_down")
                 .attr("href", "#");
        down.append($("<i>").attr("class", "icon-arrow-down"));


        coffee.append(down)
              .append(count)
              .append(up);

      }

      row.append(coffee);
    }

    table.append(row);
  }

  $(where).append(table);
}

function setScores (scores) {
  var x = Object.keys(scores);
  for (var i = 0; i < x.length; i++) {
    var y = Object.keys(scores[x[i]]);
    for (var j = 0; j < y.length; j++) {
      var attr = $("#" + x[i] + "_" + y[j] + "_count");
      if (attr) {
        attr.html(scores[x[i]][y[j]].toString());
        attr.append($("<i>").attr("class", "icon-coffee"));
      }
    }
  }
}

$(document).ready(function () {
  $.get("/people", function(people){
    createTable("#scoreboard", people);

    $.get("/score", function (data) {
      setScores(data);
    });

    for (var i = 0; i < people.length; i++) {
      for (var j = 0; j < people.length; j++) {
        var up = "#" + people[i].toLowerCase() + "_" + people[j].toLowerCase() + "_up";
        var down = "#" + people[i].toLowerCase() + "_" + people[j].toLowerCase() + "_down";

        $(up).on("click", function (e) {
          e.preventDefault();
          e.stopPropagation();

          var parts = $(this).attr("id").split("_");
          $.ajax({
            url: "/coffee?x=" + parts[0] + "&y=" + parts[1] + "&direction=up"
          }).done(function (data) {
            setScores(data);
          });
        });

        $(down).on("click", function (e) {
          e.preventDefault();
          e.stopPropagation();

          var parts = $(this).attr("id").split("_");
          $.ajax({
            url: "/coffee?x=" + parts[0] + "&y=" + parts[1] + "&direction=down"
          }).done(function (data) {
            setScores(data);
          });
        });

      }
    }

  })
});