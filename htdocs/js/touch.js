$(function(){


  var i = setInterval(function ()
  {
      if ($('#list').length)
      {
          clearInterval(i);

          var hammertime = Hammer($('.slider'), {
            transform_always_block: true,
            transform_min_scale: 1,
            drag_block_horizontal: true,
            drag_block_vertical: true,
            drag_min_distance: 0
          });

          hammertime.on('dragstart drag dragend', function(ev) {
            var slider = this;
            manageMultitouch(ev, slider);
          });
      }
  }, 100);

});

function manageMultitouch(ev, slider){

  var token      = $('.coffee-token', slider),
      me         = $('.me', slider),
      them       = $('.them', slider),
      verb       = $('.verb', slider),
      my_name    = me[0].getAttribute("data-user"),
      their_name = them[0].getAttribute("data-user");

  var active_me = false;
  var active_them = false;

  switch(ev.type) {
      case 'dragstart':
        token.addClass('active');
          break;

      case 'drag':

        var me_pos    = me.offset(),
            them_pos  = them.offset(),
            token_pos = token.offset(),
            x         = ev.gesture.center.pageX;

        // determine if token is inside the slider
        if (x > me_pos.left + 20 && x < them_pos.left + them_pos.width - 30){
          token.css('left', x - 50);
        }

        // determine if token is over me
        if (token_pos.left > me_pos.left && token_pos.left < me_pos.left + me_pos.width && active_me === false) {
          me.addClass("active");
          window.active_me = true;
        } else {
          me.removeClass("active");
          window.active_me = false;
        }

        // determine if token is over them
        if (token_pos.left + token_pos.width > them_pos.left && token_pos.left + token_pos.width < them_pos.left + them_pos.width && active_them === false) {
          them.addClass("active");
          window.active_them = true;
        } else {
          them.removeClass("active");
          window.active_them = false;
        }

        //change swipe to release when hovering
        if (window.active_me === true || window.active_them === true) {
          verb[0].innerHTML = 'release';
        } else {
          verb[0].innerHTML = 'swipe';
        }

          break;

      case 'dragend':

        token.removeClass('active');

        //if hovering, execute appropriate coffee transfer
        if (window.active_me === true){
          updateScore(their_name, my_name);
          me.removeClass("active");
        } else if (window.active_them === true){
          updateScore(my_name, their_name);
          them.removeClass("active");
        } else {
          console.log("nobody was given a coffee");
        }
          break;
  }

}

function updateScore(from, to){
  $.ajax({
    url: "/coffee?from=" + from.toLowerCase() + "&to=" + to.toLowerCase()
  }).done(function(response){
      console.log(from + " gave " + to + " a coffee");
      // send done message
    });

    if (response.error) {
     // error code
     console.log('error');
    }

    else {
      // success code
      console.log('success');
    }
}
