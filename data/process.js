var fs = require("fs");
var xlsx = require("node-xlsx");
var striptags = require("striptags");
var htmlencode = require("htmlencode");

function main(argv) {

  var lines = 0;
  var questions = {};

  worksheets = xlsx.parse(fs.readFileSync(argv[2]));
  for (var worksheet of worksheets) {
    for (var row of worksheet.data) {
      if (lines > 0) {

        var q = row[2];
        q = striptags(q).trim();

        var meta = {};

        meta.action = row[3]; // video, identity, location, carousel, richContext
        meta.cardType = row[4]; // hero, thumbnail
        meta.mainImage = row[5]; // url
        meta.introText = row[6]; // markdown
        meta.button1Text = row[7]; // text
        meta.button2Text = row[8]; // text
        meta.button1Action = row[9]; // text
        meta.button2Action = row[10]; // text, hero
        meta.carouselImages = row[11]; // carousel images
        meta.carouselText = row[12]; // carousel text per image

        if (row[13]) {
          var a = row[13];
          if (q.indexOf('?') == q.length - 1) {
            if (q in questions) {
              if (questions[q].length > a.length) {
                a = questions[q];
              }
            }
            else {
              if (meta.introText) {
                // These are characters that can really ruin our day
                meta.introText = meta.introText.replace(/“/g, "");
                meta.introText = meta.introText.replace(/”/g, "");
                meta.introText = meta.introText.replace(/\r/g, "");
                meta.introText = meta.introText.replace(/\n/g, "");
                //console.warn(meta.introText);
                //console.warn("=====");
              }

              a = a.replace(/\n/g, "<br/>").trim();
              a = a.replace(/\r/g, "").trim();
              a += "[metadata]" + JSON.stringify(meta) + "[!metadata]";
              questions[q] = a;
            }
          }
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
    main(process.argv);
}
