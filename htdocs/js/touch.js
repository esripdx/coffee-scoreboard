$(function(){


  var i = setInterval(function ()
  {
      if ($('#list').length)
      {
          clearInterval(i);

          console.log("safe-now");

          $(".drag")
          .hammer({
            drag_max_touches:0
          })
          .on("touch drag", function(ev) {
              var touches = ev.gesture.touches;

              ev.gesture.preventDefault();

              console.log(this);

              for(var t=0,len=touches.length; t<len; t++) {
                  var target = $(touches[t].target);
                  target.css({
                      left: touches[t].pageX-50
                  });
              }
          });
      }
  }, 100);

});