function main() {

  var lines = 0;

  var lineReader = require('readline').createInterface({
    input: require('fs').createReadStream('source_faq.txt')
  });

  lineReader.on('line', function (line) {
    if (lines++ < 13) {
      // First 13 lines are header/meta info
      return;
    }
    var parts = line.split("\t");
    var q = parts[1].replace(/:/g, ";");
    var a = parts[3].replace(/:/g, ";");
    console.log(q + ":" + a);
  });


}

if (require.main === module) {
    main();
}
