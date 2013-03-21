// coffees_arron_has_bought_jerry = arron.jerry;

function renderBoard(people, scores) {
  var stage = bonsai.run(document.getElementById('shadow'), {
    code: function() {

      var x = stage.width/2,
          y = stage.height/2,
          r = stage.height/2.5,
          people;

      function deg2rad(deg){
        return deg * (Math.PI/180);
      }

      function rad2deg(rad){
        return rad * (180/Math.PI);
      }

      stage.sendMessage("ready", {});
      stage.on("message:data", function(data){
        // assign data to people so we can access `people` anywhere
        people = data;
        var start = 0;
        var end = deg2rad(360/people.length);

        for (var i = 0; i < people.length; i++) {
          var person = people[i];
          var arcPoint1 = new Arc(x, y, r, start, end).points()[0];

          person.x = arcPoint1[0]+x;
          person.y = arcPoint1[1]+y;

          stage.sendMessage("circle", person);

          start = end;
          end = start+deg2rad(360/data.length);
        }

        // random path generator
        for (var n = 0; n < people.length; n++) {
          var giver = people[n];
          var receiver = people[Math.floor(Math.random()*people.length)];
          var c1x = giver.x;
          var c1y = giver.y;
          var c2x = x;
          var c2y = y;
          giver.path = new Path().moveTo(giver.x,giver.y).curveTo(c1x, c1y, c2x, c2y, receiver.x, receiver.y).attr("strokeColor", "blue").attr("strokeWidth", 0);
          giver.path.on("addedToStage", function(){
            stage.sendMessage("path",{
              id: giver.path.id,
              email: giver.email,
              index: n
            });
          });
          giver.path.addTo(stage);
        }

        stage.on("message:center", function(data) {
          var person = people[data.index];
          var path = person.path;
          var s = {x:path.points()[0][0], y:path.points()[0][1]};
          var e = {x:path.points()[1][0], y:path.points()[1][1]};
          var m = {x:data.x, y:data.y};

          // start point
          var p0x = s.x;
          var p0y = s.y;

          //first control point
          var p1x = s.x;
          var p1y = s.y;

          // second control point
          var p2x = x;
          var p2y = y;

          // end point
          var p3x = e.x;
          var p3y = e.y;

          //q0 = (p0 + p1) / 2
          var q0x = (p0x + p1x) / 2;
          var q0y = (p0y + p1y) / 2;

          //q1 = (p1 + p2) / 2
          var q1x = (p1x + p2x) / 2;
          var q1y = (p1y + p2y) / 2;

          //q3 = (p2 + p3) / 2
          var q2x = (p2x + p3x) / 2;
          var q2y = (p2y + p3y) / 2;

          //r0 = (q0 + q1) / 2
          var r0x = (q0x + q1x) / 2;
          var r0y = (q0y + q1y) / 2;

          //r1 = (q1 + q2) / 2
          var r1x = (q1x + q2x) / 2;
          var r1y = (q1y + q2y) / 2;

          //center point
          var sx = m.x;
          var sy = m.y;

          //p0, q0, r0, s
          person.giverPath = new Path().moveTo(p0x, p0y).curveTo(q0x, q0y, r0x, r0y, sx, sy).attr("strokeColor", "green").attr("strokeWidth", 3).addTo(stage);
          //s, r1, q2, p3
          person.reciverPath = new Path().moveTo(sx, sy).curveTo(r1x, r1y, q2x, q2y, p3x, p3y).attr("strokeColor", "red").attr("strokeWidth", 3).addTo(stage);
          //sx, sy
          person.circle = new Circle(sx, sy, 10).fill("black").addTo(stage);

          //destroy old path
          people[data.index].path.destroy();
          delete people[data.index].path;
        });

      });
    },
    width: window.innerWidth,
    height: window.innerHeight
  });

  stage.on('load', function() {
    stage.on("message:ready", function() {

      var html = '<div class="portrait"><h2 class="name"></h2><div class="coffee-token" draggable="true"></div></div>';

      var $template = $('<div/>').attr({
        'class': 'person'
      }).html(html);

      stage.sendMessage("data", people);

      stage.on('message:circle', function(data) {
        var $el = $template.clone();
        var name = data.name;
        var dragIcon = document.createElement('img');
        dragIcon.src = '/img/plus1.png';

        $el
          .attr('data-name', name)
          .find('.name')
            .text(name)
            .end()
          .find('.portrait')
            .css({
              "background": "url('"+gravatar(data.email, 50)+"')",
              "top": data.y,
              "left": data.x
            })
            .end()
          .appendTo('#scoreboard');

        $el
          .on('dragstart', function(e){
            e.originalEvent.dataTransfer.setData('text/plain', name);
            e.originalEvent.dataTransfer.setDragImage(dragIcon, 30, 30);
          })
          .on('dragover', function(e){
            e.preventDefault();
            $(this).addClass('over');
          })
          .on('dragleave', function(e){
            $(this).removeClass('over');
          })
          .on('drop', function(e){
            e.preventDefault();

            var from = e.originalEvent.dataTransfer.getData('text/plain');
            var to   = name;

            $(this).removeClass('over');

            console.log(from + ' bought ' + to + ' 1 coffee.');

            $.ajax({
              url: "/coffee?from=" + from.toLowerCase() + "&to=" + to.toLowerCase()
            }).done(function(response){
              console.log(response);
            });
          });
      });
    });
  });

  stage.on('message:path', function(data) {
    console.log("message:path",data);
    setTimeout(function(){
      var path = document.querySelector("[data-bs-id='"+data.id+"']");
      var length = path.getTotalLength();
      var mid = path.getPointAtLength(length/2);
      stage.sendMessage("center", {
        id: data.id,
        email: data.email,
        index: data.index,
        x: mid.x,
        y: mid.y
      });
    }, 25);
  });

  console.log(people, scores);
}

$(document).ready(function() {
  $.get("/people", function(people) {
    $.get("/score", function(scores) {
      renderBoard(people, scores);
    });
  });
});