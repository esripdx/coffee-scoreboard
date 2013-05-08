(function(window,$,undefined){

  // the players

  var people, scores;

  window.HBT = {};

  loadTemplates([
    'list-item',
    'request-item',
    'person',
    'user'
  ]);

  var cookie = $.fn.cookie('coffee-scoreboard');
  var allPeople = new People();
  var user;
  var everyoneElse = new People();

  // the acts

  function bindNav() {
    var $logout = $('#logout');
    var $nav = $('.bottom-nav');
    var $scoreboard = $nav.find('.scoreboard');
    var $wants = $nav.find('.wants');

    $scoreboard.on('click', function(e){
      e.preventDefault();

      $nav.find('.active').removeClass('active');
      $('#requests').hide();
      $('#list').show();
      $(this).addClass('active');
    });

    $wants.on('click', function(e){
      e.preventDefault();

      $nav.find('.active').removeClass('active');
      $('#list').hide();
      $('#requests').show();
      $(this).addClass('active');
    });

    $logout.on('click', function(e){
      e.preventDefault();
      logout();
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
  }

  People.prototype.get = function(getBy) {
    if(typeof getBy === "string"){
      return this[capitalize(getBy)];
    }
    if(typeof getBy === "number"){
      return this[capitalize(this.names[getBy])];
    }
  }

  People.prototype.buildScoreboard = function() {
    $('#list').empty();

    var creditors = [];
    var debtors = [];
    var neutrals = [];

    for (var i = 0; i < this.length; i++) {
      var person = this.get(i);
      person.html = HBT['list-item'](person);
      if (person.balance > 0) { creditors.push(person) }
      else if (person.balance < 0) { debtors.push(person) }
      else { neutrals.push(person) }
    }

    creditors = creditors.sort(function(a,b){ return b.balance - a.balance })
    debtors = debtors.sort(function(a,b){ return a.balance - b.balance })

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
      $more.on('click', function(e){
        e.preventDefault();
        $card.toggleClass('active');
      })
    });
  }

  People.prototype.buildWants = function() {
    $('#requests').empty();
    var self = this;
    $.get('/wants', function(wants){
      for (var i = 0; i < wants.length; i++) {
        var person = self.get(wants[i].sender);
        console.log(wants[i].date);
        console.log(person);
        var context = {
          name: person.name,
          icon: person.icon,
          item: wants[i].message,
          time: moment.unix(wants[i].date/1000).fromNow()
        }
        console.log(context);
        var html = HBT['request-item'](context);
        console.log(html);
        $('#requests').append(html);
      }
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

    $auth.find('.person').on('click', function(e){
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
  }

  function User(options) {
    this.name = options.name;
    this.email = options.email;
    this.icon = gravatar(options.email, 100);
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
