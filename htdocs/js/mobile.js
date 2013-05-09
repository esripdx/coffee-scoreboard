(function(window,$,undefined){

  // makes click trigger tap on non-touch device
  if (!('ontouchend' in window)) {
    $(document).on('click', 'body', function(e) {
      $(e.target).trigger('tap');
    });
  }

  // the players

  var people, scores;

  window.HBT = {};

  loadTemplates([
    'list-item',
    'request-item',
    'person',
    'user',
    'wants-empty'
  ]);

  var cookie = $.fn.cookie('coffee-scoreboard');
  var allPeople = new People();
  var user;
  var everyoneElse = new People();

  // the acts

  function bindNav() {
    var $broadcast = $('#broadcast');
    var $logout = $('#logout');
    var $nav = $('.bottom-nav');
    var $scoreboard = $nav.find('.scoreboard');
    var $wants = $nav.find('.wants');

    $scoreboard.on('tap', function(e){
      e.preventDefault();

      $nav.find('.active').removeClass('active');
      $('#requests').hide();
      $('#list').show();
      $(this).addClass('active');
    });

    $wants.on('tap', function(e){
      e.preventDefault();

      $nav.find('.active').removeClass('active');
      $('#list').hide();
      $('#requests').show();
      $(this).addClass('active');
    });

    $logout.on('tap', function(e){
      e.preventDefault();
      logout();
    });

    $broadcast.on('tap', function(e){
      e.preventDefault();
      broadcast();
    });
  }

  function loadTemplates(files) {
    Handlebars.getTemplate = function(name) {
      if (HBT === undefined || HBT[name] === undefined) {
        if (HBT === undefined) {
          window.HBT = {};
        }
        $.ajax({
          url : '/m/templates/' + name + '.html',
          datatype: 'text',
          success : function(response, status, jqXHR) {
            // HBT[name] = Handlebars.compile(jqXHR.responseText);
            HBT[name] = Handlebars.compile(response);
          },
          async : false
        });
      }
      return HBT[name];
    };

    for (var x=0; x < files.length; x++) {
      HBT[files[x]] = Handlebars.getTemplate(files[x]);
    }
  }

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

  People.prototype.buildScoreboard = function() {
    $('#list').empty();

    var creditors = [];
    var debtors = [];
    var neutrals = [];

    for (var i = 0; i < this.length; i++) {
      var person = this.get(i);
      person.currentUser = {
        name: user.name,
        icon: user.icon
      };
      person.html = HBT['list-item'](person);
      if (person.balance > 0) { creditors.push(person); }
      else if (person.balance < 0) { debtors.push(person); }
      else { neutrals.push(person); }
    }

    creditors = creditors.sort(function(a,b){ return b.balance - a.balance; });
    debtors = debtors.sort(function(a,b){ return a.balance - b.balance; });

    for (var i = 0; i < debtors.length; i++) {
      $('#list').append(debtors[i].html);
    }

    for (var i = 0; i < creditors.length; i++) {
      $('#list').append(creditors[i].html);
    }

    for (var i = 0; i < neutrals.length; i++) {
      $('#list').append(neutrals[i].html);
    }

    $('#list').find('.card').each(function(){
      var $card = $(this);
      var $more = $card.find('.more');
      $more.on('tap', function(e){
        e.preventDefault();
        $card.toggleClass('active');
      });
    });

    var list = $('#list');

    bindSwipe();
    bindRefresh(this, list, 'scores');

  };

  People.prototype.buildWants = function() {
    var requests = $('#requests');
    requests.empty();
    var self = this;
    $.get('/wants', function(wants){
      if (wants.length) {
        for (var i = 0; i < wants.length; i++) {
          var context;

          if (user.name.toLowerCase() == wants[i].sender) {
            context = {
              name: user.name,
              icon: user.icon,
              item: wants[i].message,
              time: moment.unix(wants[i].date/1000).fromNow()
            }
          } else {
            var person = self.get(wants[i].sender);
            context = {
              name: person.name,
              icon: person.icon,
              item: wants[i].message,
              time: moment.unix(wants[i].date/1000).fromNow()
            }
          }

          var html = HBT['request-item'](context);
          requests.append(html);
        }
        $('.wants').html('Wants<span class="badge">' + wants.length + '</span>');
      } else {
        // no wants
        requests.append(HBT['wants-empty']());
        $('.wants').html('Wants');
      }

      bindRefresh(self, requests, 'wants');
    });
  }

  People.prototype.buildAuth = function() {
    var $auth = $('#auth');
    $auth.empty();

    for (var i = 0; i < this.length; i++) {
      var person = this.get(i);
      var html = HBT['person'](person);
      $auth.append(html);
    }

    $auth.find('.person').on('tap', function(e){
      e.preventDefault();

      var $el = $(this);
      var name = $el.data('login');

      $.fn.cookie('coffee-scoreboard', name);
      cookie = $.fn.cookie('coffee-scoreboard');
      $('body').removeClass('who');
      login();
      everyoneElse.buildScoreboard();
      everyoneElse.buildWants();
    });
  }

  People.prototype.getRelations = function(user) {
    var relations = {};

    for (var i=0; i < this.length; i++) {
      var p = this.get(i);
      var amount = scores[user.name.toLowerCase()][p.name.toLowerCase()] - scores[p.name.toLowerCase()][user.name.toLowerCase()];
      p.balance = amount;
      if (amount > 0) {
        p.credits = amount;
      } else if (amount < 0) {
        p.debts = -amount;
      }
      relations[p.name] = amount;
    }

    return relations;
  }

  function Person(options) {
    this.name = options.name;
    this.email = options.email;
    this.icon = gravatar(options.email, 100);
    this.nick = options.nicks[0];
  }

  function User(options) {
    this.name = options.name;
    this.email = options.email;
    this.icon = gravatar(options.email, 100);
    this.nick = options.nicks[0];
  }

  User.prototype.auth = function() {
    var html = HBT['user'](this);
    $('.top-nav').prepend(html);
  }

  User.prototype.relations = {};

  function login() {
    for (var i = 0; i < people.length; i++) {
      if (cookie == people[i].name) {
        user = new User(people[i]);
      }
    }
    for (var i = 0; i < people.length; i++) {
      if (cookie != people[i].name) {
        everyoneElse.add(people[i]);
      }
    }
    var relations = everyoneElse.getRelations(user);
    user.auth();
  }

  function logout(options) {
    $.fn.cookie('coffee-scoreboard', '', $.extend({}, options, { expires: -1 }));
    window.location = '/m/';
  }

  function broadcast() {
    if (confirm("Want to let everyone know you're going to Barista?")) {
      $.ajax({
        type: 'GET',
        url: "/broadcast?user=" + user.nick,
        dataType: 'json',
        timeout: 300,
        success: function(data){
          alert('Broadcast successful!');
        },
        error: function(xhr, type){
          alert('Ajax error!');
        }
      });
    }
  }

  // the helpers

  function capitalize(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  Handlebars.registerHelper('coffeeWord', function(num) {
    if(num == 1) {
      return "one coffee";
    } else {
      return num + " coffees";
    }
  });

  function coffeeWord(num, includeNum) {
    if(includeNum) {
      if(num == 1) {
        return "one coffee";
      } else {
        return num + " coffees";
      }
    } else {
      if(num == 1) {
        return "coffee";
      } else {
        return "coffees";
      }
    }
  }

  // pull to refresh

  function bindRefresh(people, page, target) {

    var hammertime = Hammer(page);

    hammertime.off('dragdown release');

    hammertime.on('dragdown release', function(ev) {
      manageRefreshEvents(ev, page, people, target);
    });
  }

  function manageRefreshEvents(ev, page, people, target){

    var touchY   = ev.gesture.center.pageY;
    var deltaY   = ev.gesture.deltaY;
    var pullDiv  = $('#pullrefresh');
    var topTouch = false;
    var windowY  = $(window).height();

    switch(ev.type) {

        case 'dragdown':
          page.removeClass("transition");
          if (touchY < windowY) {
            page.css('margin-top', deltaY + 50);
            if (deltaY > 61) {
              pullDiv.addClass("breakpoint");
            }
            else {
              pullDiv.removeClass("breakpoint");
            }
          }

            break;

        case 'release':
          page.addClass("transition");
          page.css('margin-top', 50);
          if (deltaY > 50) {
            if (target == 'scores') {
              everyoneElse.buildScoreboard();
            } else {
              everyoneElse.buildWants();
            }
          }
          page.on("webKitTransitionEnd transitionend oTransitionEnd", function() {
            page.removeClass("transition");
          });
            break;
    }

  }

  // swipe to transfer tokens

  function bindSwipe() {
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
      dataType: 'json',
      timeout: 300,
      success: function(data){

        var their_name = them;
        me = me.toLowerCase().toString();
        them = them.toLowerCase().toString();

        var my_credit = data[me][them];
        var my_debt = data[them][me];
        var coffee_word = " coffees";

        // update badge and message with new values
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

      },
      error: function(xhr, type){
        alert('Ajax error!');
      }
    });
  }

  // the play

  $.get("/people", function(p) {
    people = p;
    $.get("/score", function(s) {
      scores = s;

      for (var i = 0; i < people.length; i++) {
        allPeople.add(people[i]);
      }

      if (cookie) {
        login();
        $('body').removeClass('who');
        everyoneElse.buildScoreboard();
        everyoneElse.buildWants();
      } else {
        allPeople.buildAuth();
      }

      bindNav();
    });
  });


})(window,$);
