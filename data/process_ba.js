var fs = require("fs");
var xlsx = require("node-xlsx");
var striptags = require("striptags");

function main() {

  var lines = 0;
  var questions = {};

  worksheets = xlsx.parse(fs.readFileSync('ba_faq.xlsx'));
  for (var worksheet of worksheets) {
    for (var row of worksheet.data) {
      if (lines > 0) {
        q = row[2];
        q = striptags(q).trim();
        a = row[3];
        if (q.indexOf('?') == q.length - 1) {
          if (q in questions) {
            if (questions[q].length > a.length) {
              a = questions[q];
            }
          }
          var a = a.replace(/\n/g, "<br/>").trim();
          var a = a.replace(/\r/g, "").trim();
          questions[q] = a;
        }
      }
      lines++;
    }
  }

  for (var q in questions) {
    console.log(q + "\t" + questions[q]);
  }
}

if (require.main === module) {
    main();
}
