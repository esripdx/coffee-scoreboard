// no longer used

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
      their_name = them[0].getAttribute("data-user"),
      card       = token.parent().parent().parent(),
      badge      = $('.badges', card),
      message    = $('.message', card);

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
        if (x > me_pos.left + 18 && x < them_pos.left + them_pos.width - 20){
          token.css('left', x - 50);
        }

        // determine if token is over me
        if (token_pos.left < me_pos.left + me_pos.width && active_me === false) {
          me.addClass("active");
          window.active_me = true;
        } else {
          me.removeClass("active");
          window.active_me = false;
        }

        // determine if token is over them
        if (token_pos.left + token_pos.width > them_pos.left && active_them === false) {
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
          updateScore(my_name, their_name, their_name, my_name, badge, message);
          me.removeClass("active");
        } else if (window.active_them === true){
          updateScore(my_name, their_name, my_name, their_name, badge, message);
          them.removeClass("active");
        }
          break;
  }

}

function updateScore(me, them, from, to, b, m){
  $.ajax({
    type: 'GET',
    url: "/coffee?from=" + from.toLowerCase() + "&to=" + to.toLowerCase(),
    // data to be added to query string:
    dataType: 'json',
    timeout: 300,
    success: function(data){

      var their_name = them;
      me = me.toLowerCase().toString();
      them = them.toLowerCase().toString();

      var my_credit = data[me][them];
      var my_debt = data[them][me];
      var coffee_word = " coffees";

      if (my_credit > my_debt) {
        if (my_credit == 1) { coffee_word = " coffee";}
        b.removeClass("debts credits even updated").addClass("credits updated");
        b[0].innerHTML = my_credit;
        m[0].innerHTML = '<span class="name">' + their_name + ' </span>' + ' owes you ' + my_credit + coffee_word + ".";
      } else if (my_debt > my_credit) {
        if (my_debt == 1) { coffee_word = " coffee";}
        b.removeClass("debts credits even updated").addClass("debts updated");
        b[0].innerHTML = my_debt;
        m[0].innerHTML = 'You owe <span class="name">' + their_name + '</span> ' + my_debt + ' ' + coffee_word + '.';
      } else {
        b.removeClass("debts credits even updated").addClass("even updated");
        b[0].innerHTML = '=';
        m[0].innerHTML = 'You and <span class="name">' + their_name + '</span> are even.';
      }

      // update the credit or debit score
      // update the text in the card
    },
    error: function(xhr, type){
      alert('Ajax error!');
    }
  });
}
