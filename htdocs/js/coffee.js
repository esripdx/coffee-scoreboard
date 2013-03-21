function renderBoard(people, scores) {
  var stage = bonsai.run(document.getElementById('shadow'), {
    code: function() {
      x = stage.width/2;
      y = stage.height/2;
      r = stage.height/2.5;

      function deg2rad(deg){
        return deg * (Math.PI/180);
      }

      function rad2deg(rad){
        return rad * (180/Math.PI);
      }

      stage.sendMessage("ready", {});
      stage.on("message:data", function(data){

        var start = 0;
        var end = deg2rad(360/data.length);

        for (var i = 0; i < data.length; i++) {
          var arcPoint1 = new Arc(x, y, r, start, end).points()[0];

          stage.sendMessage("circle", {
            x: arcPoint1[0]+x,
            y: arcPoint1[1]+y,
            name: data[i].name,
            email: data[i].email
          });

          start = end;
          end = start+deg2rad(360/data.length);
        }
      })
    },
    width: window.innerWidth,
    height: window.innerHeight
  });

  stage.on('load', function() {
    stage.on("message:ready", function() {

      var html = '<div class="portrait"><h2 class="name"></h2><div class="coffee-token" draggable="true"></div></div>';

      var $template = $('<div/>').attr({
        'class': 'person',
      }).html(html);

      stage.sendMessage("data", people);

      stage.on('message:circle', function(data) {
        var $el = $template.clone();

        $el
          .attr({ 'data-name': data.name })
          .on('dragstart', function(e){
            e.originalEvent.dataTransfer.setData('text/plain', data.name);
            // var dragIcon = document.createElement('img');
            // dragIcon.src = '/img/token.png';
            // dragIcon.width = 100;
            // e.originalEvent.dataTransfer.setDragImage(dragIcon, -10, -10);
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
            var to   = data.name;

            $(this).removeClass('over');

            console.log(from + ' bought ' + to + ' 1 coffee.');

            $.ajax({
              url: "/coffee?from=" + from.toLowerCase() + "&to=" + to.toLowerCase()
            }).done(function(response){
              console.log(response);
            });
          })
          .find('.name')
            .text(data.name)
            .end()
          // .find('.coffee-token')
          //   .on('dragstart',function(e){
          //     console.log('dragging');
          //   })
          //   .on('dragend', function(e){
          //     console.log('dragend');
          //   })
          //   .end()
          .find('.portrait')
            .css({
              "background": "url('"+gravatar(data.email, 50)+"')",
              "top": data.y,
              "left": data.x
            })
            .end()
          .appendTo('#scoreboard');
      });
    });
  });

  console.log(scores);
}

$(document).ready(function() {
  $.get("/people", function(people) {
    $.get("/score", function(scores) {
      renderBoard(people, scores);
    });
  });
});