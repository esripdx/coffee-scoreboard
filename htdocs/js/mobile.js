(function(window,$,undefined){

  window.HBT = {};

  loadTemplates([
    'list-item',
    'request-item',
    'user'
  ]);

  var cookie = $.fn.cookie('coffee-scoreboard');
  console.log(cookie);

  var people = new People();

  $.get("/people", function(ppl) {
    $.get("/score", function(scores) {
      for (var i = 0; i < ppl.length; i++) {
        people.add(ppl[i]);
      }

      if (cookie) {
        $('body').removeClass('who');
        people.buildList();
        people.buildRequests();
      } else {
        people.buildAuth();
      }

      bindNav();
    });
  });

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
      reset();
      window.location = '/m/';
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

  People.prototype.buildList = function() {
    $('#list').empty();
    for (var i = 0; i < this.length; i++) {
      var person = this.get(i);
      var html = HBT['list-item'](person);
      $('#list').append(html);
    }

    $('#list').find('.card').each(function(){
      var $card = $(this);
      var $more = $card.find('.more');
      $more.on('click', function(){
        $card.toggleClass('active');
      })
    });
  }

  People.prototype.buildRequests = function() {
    $('#requests').empty();
    for (var i = 0; i < this.length; i++) {
      var person = this.get(i);
      var html = HBT['request-item'](person);
      $('#requests').append(html);
    }
  }

  People.prototype.buildAuth = function() {
    var $auth = $('#auth');
    $auth.empty();

    for (var i = 0; i < this.length; i++) {
      var person = this.get(i);
      var html = HBT['user'](person);
      $auth.append(html);
    }

    $auth.find('.user').on('click', function(e){
      e.preventDefault();

      var $el = $(this);
      var login = $el.data('login');
      console.log(login);

      $.fn.cookie('coffee-scoreboard', login);
      $('body').removeClass('who');
      people.buildList();
      people.buildRequests();
    });
  }

  function Person(options) {
    this.name = options.name;
    this.email = options.email;
    this.icon = gravatar(options.email, 100);
  }

  function Relationships() {}

  Relationships.prototype.add = function(relation) {
    this[relation.id] = relation;
  }

  Relationships.prototype.get = function(id) {
    return this[id];
  }

  Relationships.prototype.forEach = function(func) {
    for(var key in this){
      func(this[key]);
    }
  }

  function capitalize(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  window.reset = function(options) {
    $.fn.cookie('coffee-scoreboard', '', $.extend({}, options, { expires: -1 }));
  }


})(window,$);
