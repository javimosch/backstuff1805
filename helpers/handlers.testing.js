var mongoose= require('./db').mongoose;
var Cat = mongoose.model('Cat'); 


exports.newCat = function (req, res) {
    var kitty = new Cat({ name: 'Zildjian' });
    kitty.save(function (err) {
      if (err) // ...
      res.json({cat:kitty.name});
    });
};