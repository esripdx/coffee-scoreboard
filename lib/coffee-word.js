module.exports = function(num, includeNum) {
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
