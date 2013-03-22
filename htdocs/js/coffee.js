// coffees_arron_has_bought_jerry = arron.jerry;

function renderBoard(people, scores) {
  var stage = bonsai.run(document.getElementById('shadow'), {
    code: function() {
      new FontFamily('SourceCodePro', [
        '/font/SourceCodePro-Bold-webfont.woff',
        '/font/SourceCodePro-Bold-webfont.eot',
        '/font/SourceCodePro-Bold-webfont.ttf',
        '/font/SourceCodePro-Bold-webfont.svg'
      ]);

      var x = stage.width/2,
          y = stage.height/2,
          r = stage.height/2.5,
          tension = 2.5,
          bg = new Group().addTo(stage),
          lines = new Group().addTo(stage),
          circles = new Group().addTo(stage),
          scores;

      function People(){
        this.names = [];

        this.__defineGetter__('length', function () {
          return this.names.length;
        });

        this.__defineGetter__('relations', function () {
          var relations = [];
          var names = this.names.slice(0).sort();
          while (p = names.shift()){
            for (var i = 0; i < names.length; i++) {
              relations.push(p+"-"+names[i]);
            }
          }
          return relations;
        });
      }

      People.prototype.buildLayout = function() {
        var start = 0;
        var end = deg2rad(360/this.length);
        for (var i = 0; i < this.length; i++) {
          var arc = new Arc(x, y, r, start, end).points()[0];
          var person = people.get(i);
          person.x = arc[0]+x;
          person.y = arc[1]+y;
          start = end;
          end = start+deg2rad(360/people.length);
          stage.sendMessage("person", person);
        }
      };

      People.prototype.add = function(data) {
        this.names.push(data.name);
        this[data.name] = new Person(data);
      };

      People.prototype.get = function(getBy) {
        if(typeof getBy === "string"){
          return this[capitalize(getBy)];
        }
        if(typeof getBy === "number"){
          return this[capitalize(this.names[getBy])];
        }
      };

      function Person(options){
        this.name = options.name;
        this.email = options.email;
      }

      function Relationships(){

      }

      Relationships.prototype.add = function(relation) {
        this[relation.id] = relation;
      };

      Relationships.prototype.get = function(id) {
        return this[id];
      };

      Relationships.prototype.forEach = function(func) {
        for(var key in this){
          func(this[key]);
        }
      };

      function Relation(person1, person2){
        this[person1.name] = person1;
        this[person2.name] = person2;
        this.names = [person1.name, person2.name];
        this.id = person1.name+"-"+person2.name;

        // Aaron has bought Amber n coffees
        // coffees aaron has bought amber - coffees amber and bought aaron
        this.amount = scores[person1.name.toLowerCase()][person2.name.toLowerCase()] - scores[person2.name.toLowerCase()][person1.name.toLowerCase()];

        // THE CONTROL POINTS

        var person1x = this.get(0).x;
        var person1y = this.get(0).y;

        var person1index = people.names.indexOf(this.get(0).name);
        var person2index = people.names.indexOf(this.get(1).name);

        var c1x = x + ( (person1x - x) / tension );
        var c1y = y + ( (person1y - y) / tension );

        var person2x = this.get(1).x;
        var person2y = this.get(1).y;

        var c2x = x + ( (person2x - x) / tension );
        var c2y = y + ( (person2y - y) / tension );

        if(Math.abs(person1index - person2index) === people.length/2){
          this.randomFactor = (r/4)*([-1,1][Math.round(Math.random())]);
          c1y = c1y+this.randomFactor;
          c2y = c2y+this.randomFactor;
        }

        this.path = new Path().moveTo(this.get(0).x,this.get(0).y).curveTo(c1x, c1y, c2x, c2y, this.get(1).x, this.get(1).y).attr("strokeWidth", 1).attr("strokeColor", "#ccc").attr("strokeOpacity", 0.25),

        this.path.on("addedToStage", function(){
          stage.sendMessage("relation",{
            relationId: this.id,
            pathId: this.path.id
          });
        }.bind(this));

        this.path.addTo(bg);
      }

      Relation.prototype.get = function(getBy) {
        if(typeof getBy === "string"){
          return this[capitalize(name)];
        }
        if(typeof getBy === "number"){
          return this[capitalize(this.names[getBy])];
        }
      };

      Relation.prototype.addMidpoint = function(midX,midY){
        var path = this.path;
        this.paths = [];
        var s = {x:path.points()[0][0], y:path.points()[0][1]};
        var e = {x:path.points()[1][0], y:path.points()[1][1]};
        var m = {x:midX, y:midY};

        // start point
        var p0x = s.x;
        var p0y = s.y;

        //first control point
        var p1x = x + ( (p0x - x) / tension );
        var p1y = y + ( (p0y - y) / tension );

        // end point
        var p3x = e.x;
        var p3y = e.y;

        // second control point
        var p2x = x + ( (p3x - x) / tension );
        var p2y = y + ( (p3y - y) / tension );

        var person1index = people.names.indexOf(this.get(0).name);
        var person2index = people.names.indexOf(this.get(1).name);

        if(Math.abs(person1index - person2index) === people.length/2){
          p1y = p1y+this.randomFactor;
          p2y = p2y+this.randomFactor;
        }

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
        this.paths.push(new Path().moveTo(p0x, p0y).curveTo(q0x, q0y, r0x, r0y, sx, sy)
          .attr("strokeColor", "#3ea349")
          .attr("strokeWidth", 3));

        //s, r1, q2, p3
        this.paths.push(new Path().moveTo(sx, sy).curveTo(r1x, r1y, q2x, q2y, p3x, p3y)
          .attr("strokeColor", "#c84d03")
          .attr("strokeWidth", 3));

        //sx, sy
        this.circle = new Circle(sx, sy, 13)
          .fill("#ffffff")
          .attr("strokeWidth", 1)
          .attr("strokeColor", "#e1e1e1")
          .addTo(circles);

        this.text = new Text(this.amount).attr({
          fontFamily: 'SourceCodePro',
          fontSize: '14',
          textFillColor: '#434946',
          selectable: false,
          x:sx-4,
          y:sy-4
        });

        this.draw();
      };

      Relation.prototype.draw = function(){

        this.text.attr("text", Math.abs(this.amount));

        //Aaron has bought Amber coffees
        if(this.amount > 0){
          this.paths[0].attr("strokeColor", "#3ea349");
          this.paths[1].attr("strokeColor", "#c84d03");
        }

        //Amber has bought aaron coffees
        if(this.amount < 0){
          this.paths[0].attr("strokeColor", "#c84d03");
          this.paths[1].attr("strokeColor", "#3ea349");
        }

        if(this.amount === 0){
          this.text.remove();
          this.circle.remove();
          this.paths[0].remove();
          this.paths[1].remove();
        } else {
          this.paths[0].addTo(lines);
          this.paths[1].addTo(lines);
          this.circle.addTo(circles);
          this.text.addTo(circles);
        }
      };

      capitalize = function(name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      };

      var people = new People();
      var relationships = new Relationships();

      function deg2rad(deg){
        return deg * (Math.PI/180);
      }

      function rad2deg(rad){
        return rad * (180/Math.PI);
      }

      stage.sendMessage("ready", {});

      stage.on("message:data", function(data){
        scores = data["scores"];

        for (var i = 0; i < data["people"].length; i++) {
          people.add(data["people"][i]);
        }

        people.buildLayout();

        var relations = people.relations;
        for (var i = 0; i < relations.length; i++) {
          var keys = relations[i].split("-");
          var relation = new Relation(people.get(keys[0]), people.get(keys[1]));
          relationships.add(relation);
        }

        stage.on("message:relationCenter", function(data) {
          var relation = relationships.get(data.id);
          relation.addMidpoint(data.x, data.y);
        });

        stage.on("message:portraitEnter", function(data){
          relationships.forEach(function(relation){
            if(!relation.id.match(data.name)){
              relation.paths[0].animate(".25s", {
                opacity:0.25,
                strokeWidth:1
              });
              relation.paths[1].animate(".25s", {
                opacity:0.25,
                strokeWidth:1
              });
              relation.circle.animate(".25s", {
                opacity:0.5,
                radius: 7
              });
              relation.text.animate(".25s", {
                opacity:0
              });
            }
          });
        });

        stage.on("message:portraitLeave", function(data){
          relationships.forEach(function(relation){
            relation.text.animate(".25s", {opacity:1});
              relation.paths[0].animate(".25s", {
                opacity:1,
                strokeWidth:3
              });
              relation.paths[1].animate(".25s", {
                opacity:1,
                strokeWidth:3
              });
              relation.circle.animate(".25s", {
                opacity:1,
                radius: 13
              });
              relation.text.animate(".25s", {
                opacity:1
              });
          });
        });

        stage.on("message:updateRelation", function(data){
          var id = [data.from, data.to].sort().join("-");
          var relation = relationships.get(id);
          if(relation.get(0).name === data.from){
            relation.amount++;
          } else {
            relation.amount--;
          }
          relation.draw();
        });
      });
    },
    width: window.innerWidth,
    height: window.innerHeight
  });

  function notify(msg) {
    console.log('notify msg', msg);
    var $el = $('<div class="notification animated flipInX"></div>');

    $el
      .text(msg)
      .appendTo('#scoreboard');

    setTimeout(function(){
      $el.removeClass('flipInX').addClass('fadeOut');
      setTimeout(function(){
        $el.remove();
      }, 1000);
    }, 2000);
  }

  stage.on('load', function() {
    stage.on("message:ready", function() {

      var html = '<div class="portrait"><h2 class="name"></h2><div class="coffee-token" draggable="true"></div></div>';

      var $template = $('<div/>').attr({
        'class': 'person'
      }).html(html);

      stage.sendMessage("data", {
        people: people,
        scores: scores
      });

      stage.on('message:person', function(data) {
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

            $.ajax({
              url: "/coffee?from=" + from.toLowerCase() + "&to=" + to.toLowerCase()
            }).done(function(response){
              stage.sendMessage("updateRelation", {
                from: from,
                to: to
              });

              if (response.error) {
                notify(response.error);
              }
              else {
                notify(from + ' gave ' + to + ' 1 coffee');
              }
            });
          });
      });
    });
  });

  stage.on('message:relation', function(data) {
    setTimeout(function(){
      var path = document.querySelector("[data-bs-id='"+data.pathId+"']");
      var length = path.getTotalLength();
      var mid = path.getPointAtLength(length/2);
      stage.sendMessage("relationCenter", {
        id: data.relationId,
        x: mid.x,
        y: mid.y
      });
    }, 250);
  });

  $(document).on('mouseenter mouseleave', '.person', function(event) {
    if(event.type === 'mouseenter'){
      stage.sendMessage("portraitEnter", {
        name: $(this).data("name")
      });
    }

    if(event.type === 'mouseleave'){
      stage.sendMessage("portraitLeave", {
        name: $(this).data("name")
      });
    }
  });
}

$(document).ready(function() {
  $.get("/people", function(people) {
    $.get("/score", function(scores) {
      renderBoard(people, scores);
    });
  });

});