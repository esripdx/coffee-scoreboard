function createPeople(where, people) {
  var $container = $(where);

  var html = '<div class="portrait"><h2 class="name"></h2><div class="coffee-token" draggable="true"></div></div>';

  var $template = $('<div/>').attr({
    'class': 'person',
  }).html(html);

  for (i = 0; i < people.length; i++) {
    var $el = $template.clone();

    $el
      .attr({ 'data-name': people[i] })
      .find('.name')
        .text(people[i])
        .end()
      .find('.coffee-token')
        .on('dragstart',function(e){
          console.log('dragging');
        })
        .on('dragend', function(e){
          console.log('dragend');
        })
        .end()
      .on('drop', function(e){
        if (e.preventDefault) e.preventDefault();
        console.log('drop');
      });

    $container.append($el);
  }

  var $people = $('.person');

  numItems = $people.length;
  start    = 0.25;
  step     = ( 2 * Math.PI ) / numItems;

  $people.each(function(index) {
    radius  = ($container.width() - $(this).width())/2;
    tmpTop  = (($container.height()/2) + radius * Math.sin(start)) - ($(this).height()/2);
    tmpLeft = (($container.width()/2) + radius * Math.cos(start)) - ($(this).width()/2);

    start += step;

    $(this).css("top", tmpTop);
    $(this).css("left", tmpLeft);
  });

}

$(document).ready(function() {
  $.get("/people", function(people) {
    createPeople("#scoreboard", people);

    $.get("/score", function(scores) {
      console.log(scores);
    });

  })
});