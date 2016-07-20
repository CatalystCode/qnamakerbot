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
        var q = row[2];
        q = striptags(q).trim();

        var meta = {};

        meta.action = row[3];
        meta.cardtype = row[4];
        meta.image = row[5];
        meta.introText = row[6];
        meta.button1 = row[7];
        meta.button2 = row[8];
        meta.button1Action = row[9];
        meta.button2Action = row[10];

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
