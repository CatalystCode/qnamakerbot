function main() {

  var lines = 0;
  var questions = {};

  var lineReader = require('readline').createInterface({
    input: require('fs').createReadStream('av_faq.txt')
  });

  lineReader.on('line', function (line) {
    if (lines++ < 13) {
      // First 13 lines are header/meta info
      return;
    }
    var parts = line.split("\t");
    var q = parts[1].replace(/:/g, ";").replace(/"/g, "").trim();
    var a = parts[3].replace(/:/g, ";").replace(/"/g, "").trim();
    if (q in questions) {
      if (questions[q].length > a.length) {
        a = questions[q];
      }
    }

    questions[q] = a;
  });

  lineReader.on('close', function(result) {
    for (var q in questions) {
      console.log(q + "\t" + questions[q]);
    }
  });
}

if (require.main === module) {
    main();
}
